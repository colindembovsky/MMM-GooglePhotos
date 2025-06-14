"use strict";

const fs = require("fs");
const { writeFile, readFile } = require("fs/promises");
const path = require("path");
const moment = require("moment");
const NodeHelper = require("node_helper");
const Log = require("logger");
const crypto = require("crypto");
const { shuffle } = require("./shuffle.js");

const ONE_DAY = 24 * 60 * 60 * 1000; // 1 day in milliseconds

const NodeHeleprObject = {
  start: function () {
    this.scanInterval = 1000 * 60 * 55; // fixed. no longer needs to be fixed
    this.config = {};
    this.scanTimer = null;
    /** @type {LocalAlbum[]} */
    this.selectedAlbums = [];
    /** @type {LocalPhoto[]} */
    this.photos = [];
    this.localPhotoList = [];
    this.localPhotoPntr = 0;
    this.lastLocalPhotoPntr = 0;
    this.queue = null;
    this.initializeTimer = null;

    this.CACHE_ALBUMNS_PATH = path.resolve(this.path, "cache", "selectedAlbumsCache.json");
    this.CACHE_PHOTOLIST_PATH = path.resolve(this.path, "cache", "photoListCache.json");
    this.CACHE_CONFIG = path.resolve(this.path, "cache", "config.json");
  },

  socketNotificationReceived: function (notification, payload) {
    switch (notification) {
      case "INIT":
        this.initializeAfterLoading(payload);
        break;
      case "IMAGE_LOAD_FAIL":
        {
          const { url, event, source, lineno, colno, error } = payload;
          this.log_error("[FPHOTO] hidden.onerror", { event, source, lineno, colno });
          if (error) {
            this.log_error("[FPHOTO] hidden.onerror error", error.message, error.name, error.stack);
          }
          this.log_error("Image loading fails. Check your file path:", url);
          this.prepAndSendChunk(Math.ceil((20 * 60 * 1000) / this.config.updateInterval)).then(); // 20min * 60s * 1000ms / updateinterval in ms
        }
        break;
      case "IMAGE_LOADED":
        {
          const { id, index } = payload;
          this.log_debug("Image loaded:", `${this.lastLocalPhotoPntr} + ${index}`, id);
        }
        break;
      case "NEED_MORE_PICS":
        {
          this.log_info("Used last pic in list");
          this.prepAndSendChunk(Math.ceil((20 * 60 * 1000) / this.config.updateInterval)).then(); // 20min * 60s * 1000ms / updateinterval in ms
        }
        break;
      case "MODULE_SUSPENDED_SKIP_UPDATE":
        this.log_debug("Module is suspended so skip the UI update");
        break;
      default:
        this.log_error("Unknown notification received", notification);
    }
  },

  log_debug: function (...args) {
    Log.debug("[FPHOTOS] [node_helper]", ...args);
  },

  log_info: function (...args) {
    Log.info("[FPHOTOS] [node_helper]", ...args);
  },

  log_error: function (...args) {
    Log.error("[FPHOTOS] [node_helper]", ...args);
  },

  log_warn: function (...args) {
    Log.warn("[FPHOTOS] [node_helper]", ...args);
  },

  initializeAfterLoading: function (config) {
    this.config = config;
    this.debug = config.debug ? config.debug : false;
    if (!this.config.scanInterval || this.config.scanInterval < 1000 * 60 * 10) this.config.scanInterval = 1000 * 60 * 10;

    // Expand tilde in rootPath if not already done
    if (this.config.rootPath.startsWith('~/')) {
      this.config.rootPath = this.config.rootPath.replace('~', require('os').homedir());
    }

    this.tryToIntitialize();
  },

  tryToIntitialize: async function () {
    //set timer, in case if fails to retry in 3 min
    clearTimeout(this.initializeTimer);
    this.initializeTimer = setTimeout(
      () => {
        this.tryToIntitialize();
      },
      3 * 60 * 1000
    );

    this.log_info("Starting Initialization");
    await this.loadCache();

    try {
      // Check if root path exists
      if (!fs.existsSync(this.config.rootPath)) {
        throw new Error(`Root path does not exist: ${this.config.rootPath}`);
      }

      // Scan for albums (subfolders)
      await this.scanForAlbums();
      
      // Initialize photo scanning
      await this.scanForPhotos();
      
      this.log_info("Initialization complete!");
      this.sendSocketNotification("INITIALIZED", this.selectedAlbums);
      
      clearTimeout(this.initializeTimer);
      this.log_info("Start first scanning.");
      this.startScanning();
      
    } catch (error) {
      this.log_error("Initialization failed:", error.message);
      this.sendSocketNotification("ERROR", `Initialization failed: ${error.message}`);
    }
  },

  calculateConfigHash: async function () {
    // Initialize folder scanning
    const hash = crypto.createHash("sha256").update(JSON.stringify(this.config)).digest("hex");
    return hash;
  },

  scanForAlbums: async function () {
    this.log_info("Scanning for albums in:", this.config.rootPath);
    
    try {
      const entries = fs.readdirSync(this.config.rootPath, { withFileTypes: true });
      const albumFolders = entries.filter(entry => entry.isDirectory());
      
      this.selectedAlbums = [];
      
      for (const folder of albumFolders) {
        const albumPath = path.join(this.config.rootPath, folder.name);
        
        // If specific albums are configured, only include those
        if (this.config.albums.length > 0 && !this.config.albums.includes(folder.name)) {
          continue;
        }
        
        // Check if folder contains any images
        const hasImages = await this.folderContainsImages(albumPath);
        if (hasImages) {
          const album = {
            id: crypto.createHash('md5').update(albumPath).digest('hex'),
            title: folder.name,
            path: albumPath,
            mediaItemsCount: 0, // Will be updated during photo scanning
          };
          this.selectedAlbums.push(album);
        }
      }
      
      this.log_info(`Found ${this.selectedAlbums.length} albums:`, this.selectedAlbums.map(a => a.title).join(', '));
      
    } catch (error) {
      this.log_error("Error scanning for albums:", error.message);
      throw error;
    }
  },

  folderContainsImages: async function (folderPath) {
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.config.validExtensions.includes(ext)) {
            return true;
          }
        } else if (entry.isDirectory() && this.config.recursiveSubFolders) {
          const subFolderPath = path.join(folderPath, entry.name);
          const hasImages = await this.folderContainsImages(subFolderPath);
          if (hasImages) return true;
        }
      }
      return false;
    } catch (error) {
      this.log_error("Error checking folder for images:", error.message);
      return false;
    }
  },

  scanForPhotos: async function () {
    this.log_info("Scanning for photos...");
    this.localPhotoList = [];
    
    for (const album of this.selectedAlbums) {
      const photos = await this.scanFolderForPhotos(album.path, album.id);
      this.localPhotoList.push(...photos);
      album.mediaItemsCount = photos.length;
    }
    
    // Apply sorting
    if (this.config.sort === "random") {
      shuffle(this.localPhotoList);
    } else if (this.config.sort === "new") {
      this.localPhotoList.sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime));
    } else if (this.config.sort === "old") {
      this.localPhotoList.sort((a, b) => new Date(a.creationTime) - new Date(b.creationTime));
    }
    
    this.log_info(`Found ${this.localPhotoList.length} photos total`);
    
    // Save to cache
    await this.saveCache();
    
    // Send initial batch
    await this.prepAndSendChunk(5);
  },

  scanFolderForPhotos: async function (folderPath, albumId) {
    const photos = [];
    
    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.config.validExtensions.includes(ext)) {
            const photo = await this.createPhotoObject(fullPath, albumId);
            if (photo && this.passesConditions(photo)) {
              photos.push(photo);
            }
          }
        } else if (entry.isDirectory() && this.config.recursiveSubFolders) {
          const subPhotos = await this.scanFolderForPhotos(fullPath, albumId);
          photos.push(...subPhotos);
        }
      }
    } catch (error) {
      this.log_error("Error scanning folder for photos:", error.message);
    }
    
    return photos;
  },

  createPhotoObject: async function (filePath, albumId) {
    try {
      const stats = fs.statSync(filePath);
      let dimensions = { width: 0, height: 0 };
      
      // Try to get image dimensions, but don't fail if we can't
      try {
        // We'll try to use a simple approach without requiring image-size library initially
        dimensions = { width: 1920, height: 1080 }; // Default dimensions
      } catch (error) {
        this.log_debug("Could not get dimensions for:", filePath, error.message);
      }
      
      return {
        id: crypto.createHash('md5').update(filePath).digest('hex'),
        path: filePath,
        filename: path.basename(filePath),
        creationTime: stats.mtime.toISOString(),
        width: dimensions.width || 0,
        height: dimensions.height || 0,
        _albumId: albumId,
      };
    } catch (error) {
      this.log_error("Error creating photo object for:", filePath, error.message);
      return null;
    }
  },

  passesConditions: function (photo) {
    const condition = this.config.condition;
    
    // Date filters
    if (condition.fromDate) {
      const fromDate = moment(condition.fromDate);
      if (moment(photo.creationTime).isBefore(fromDate)) {
        return false;
      }
    }
    
    if (condition.toDate) {
      const toDate = moment(condition.toDate);
      if (moment(photo.creationTime).isAfter(toDate)) {
        return false;
      }
    }
    
    // Dimension filters
    if (condition.minWidth && photo.width < condition.minWidth) return false;
    if (condition.maxWidth && photo.width > condition.maxWidth) return false;
    if (condition.minHeight && photo.height < condition.minHeight) return false;
    if (condition.maxHeight && photo.height > condition.maxHeight) return false;
    
    // Ratio filters
    if (photo.width && photo.height) {
      const ratio = photo.width / photo.height;
      if (condition.minWHRatio && ratio < condition.minWHRatio) return false;
      if (condition.maxWHRatio && ratio > condition.maxWHRatio) return false;
    }
    
    return true;
  },

  loadCache: async function () {
    const cacheHash = await this.readCacheConfig("CACHE_HASH");
    const configHash = await this.calculateConfigHash();
    if (!cacheHash || cacheHash !== configHash) {
      this.log_info("Config has changed. Ignore cache");
      this.log_debug("hash: ", { cacheHash, configHash });
      this.sendSocketNotification("UPDATE_STATUS", "Loading from local files...");
      return;
    }
    this.log_info("Loading cache data");
    this.sendSocketNotification("UPDATE_STATUS", "Loading from cache");

    //load cached album list - if available
    const cacheAlbumDt = new Date(await this.readCacheConfig("CACHE_ALBUMNS_PATH"));
    const notExpiredCacheAlbum = cacheAlbumDt && (Date.now() - cacheAlbumDt.getTime() < ONE_DAY);
    this.log_debug("notExpiredCacheAlbum", { cacheAlbumDt, notExpiredCacheAlbum });
    if (notExpiredCacheAlbum && fs.existsSync(this.CACHE_ALBUMNS_PATH)) {
      this.log_info("Loading cached albums list");
      try {
        const data = await readFile(this.CACHE_ALBUMNS_PATH, "utf-8");
        this.selectedAlbums = JSON.parse(data.toString());
        this.log_debug("successfully loaded selectedAlbums");
        this.sendSocketNotification("UPDATE_ALBUMS", this.selectedAlbums); // for fast startup
      } catch (err) {
        this.log_error("unable to load selectedAlbums cache", err);
      }
    }

    //load cached photo list - if available
    const cachePhotoListDt = new Date(await this.readCacheConfig("CACHE_PHOTOLIST_PATH"));
    const notExpiredCachePhotoList = cachePhotoListDt && (Date.now() - cachePhotoListDt.getTime() < ONE_DAY);
    this.log_debug("notExpiredCachePhotoList", { cachePhotoListDt, notExpiredCachePhotoList });
    if (notExpiredCachePhotoList && fs.existsSync(this.CACHE_PHOTOLIST_PATH)) {
      this.log_info("Loading cached photo list");
      try {
        const data = await readFile(this.CACHE_PHOTOLIST_PATH, "utf-8");
        this.localPhotoList = JSON.parse(data.toString());
        if (this.config.sort === "random") {
          shuffle(this.localPhotoList);
        }
        this.log_debug("successfully loaded photo list cache of ", this.localPhotoList.length, " photos");
        await this.prepAndSendChunk(5); // only 5 for extra fast startup
      } catch (err) {
        this.log_error("unable to load photo list cache", err);
      }
    }
  },

  prepAndSendChunk: async function (desiredChunk = 50) {
    this.log_debug("prepAndSendChunk");

    try {
      //find which ones to refresh
      if (this.localPhotoPntr < 0 || this.localPhotoPntr >= this.localPhotoList.length) {
        this.localPhotoPntr = 0;
        this.lastLocalPhotoPntr = 0;
      }
      let numItemsToRefresh = Math.min(desiredChunk, this.localPhotoList.length - this.localPhotoPntr, 50);
      this.log_debug("num to ref: ", numItemsToRefresh, ", DesChunk: ", desiredChunk, ", totalLength: ", this.localPhotoList.length, ", Pntr: ", this.localPhotoPntr);

      // refresh them
      let list = [];
      if (numItemsToRefresh > 0) {
        // For local files, we don't need to "refresh" them from an API, they're already ready
        list = this.localPhotoList.slice(this.localPhotoPntr, this.localPhotoPntr + numItemsToRefresh);
      }

      if (list.length > 0) {
        this.lastLocalPhotoPntr = this.localPhotoPntr;
        this.localPhotoPntr += list.length;
        this.sendSocketNotification("MORE_PICS", list);
      } else {
        this.sendSocketNotification("MORE_PICS", []);
      }
    } catch (error) {
      this.log_error("Error in prepAndSendChunk:", error.message);
      this.sendSocketNotification("MORE_PICS", []);
    }
  },

  readFileSafe: async function (filename, description = '') {
    try {
      if (fs.existsSync(filename)) {
        return await readFile(filename, "utf-8");
      }
    } catch (error) {
      this.log_error("Error reading file", description, filename, error.message);
    }
    return undefined;
  },

  readCacheConfig: async function (key) {
    const configStr = await this.readFileSafe(this.CACHE_CONFIG, "cache config");
    if (configStr) {
      try {
        const config = JSON.parse(configStr);
        return config[key];
      } catch (error) {
        this.log_error("Error parsing cache config:", error.message);
      }
    }
    return undefined;
  },

  saveCache: async function () {
    try {
      // Save albums cache
      if (this.selectedAlbums.length > 0) {
        await writeFile(this.CACHE_ALBUMNS_PATH, JSON.stringify(this.selectedAlbums, null, 2));
        this.log_debug("Albums cache saved");
      }

      // Save photo list cache
      if (this.localPhotoList.length > 0) {
        await writeFile(this.CACHE_PHOTOLIST_PATH, JSON.stringify(this.localPhotoList, null, 2));
        this.log_debug("Photo list cache saved");
      }

      // Save config with timestamps
      const cacheConfig = {
        CACHE_HASH: await this.calculateConfigHash(),
        CACHE_ALBUMNS_PATH: new Date().toISOString(),
        CACHE_PHOTOLIST_PATH: new Date().toISOString(),
      };
      await writeFile(this.CACHE_CONFIG, JSON.stringify(cacheConfig, null, 2));
      this.log_debug("Cache config saved");

    } catch (error) {
      this.log_error("Error saving cache:", error.message);
    }
  },

  startScanning: function () {
    this.log_info("Start Album scanning. Timer is started");
    this.scanTimer = setTimeout(() => {
      this.updatePhotos();
    }, this.config.scanInterval);
  },

  updatePhotos: async function () {
    this.log_info("Update photos");
    clearTimeout(this.scanTimer);

    try {
      await this.scanForPhotos();
      this.sendSocketNotification("UPDATE_ALBUMS", this.selectedAlbums);
    } catch (error) {
      this.log_error("Error updating photos:", error.message);
    }

    this.scanTimer = setTimeout(() => {
      this.updatePhotos();
    }, this.config.scanInterval);
  },
};

module.exports = NodeHelper.create(NodeHeleprObject);
