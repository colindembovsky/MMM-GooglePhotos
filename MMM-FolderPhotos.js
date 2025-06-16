//
//
// MMM-FolderPhotos
//
Module.register("MMM-FolderPhotos", {
  defaults: {
    rootPath: "~/Pictures/MagicMirror", // Root folder containing album subfolders
    albums: [], // Album folder names to display. If empty, all subfolders will be used
    updateInterval: 1000 * 30, // minimum 10 seconds.
    sort: "new", // "old", "random" 
    recursiveSubFolders: true, // Whether to scan subfolders within album folders
    validExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'], // Valid image file extensions
    condition: {
      fromDate: null, // Or "2018-03", RFC ... format available (based on file modification time)
      toDate: null, // Or "2019-12-25"
      minWidth: null, // Or 400
      maxWidth: null, // Or 8000
      minHeight: null, // Or 400
      maxHeight: null, // Or 8000
      minWHRatio: null,
      maxWHRatio: null,
      // WHRatio = Width/Height ratio ( ==1 : Squared Photo,   < 1 : Portraited Photo, > 1 : Landscaped Photo)
    },
    showWidth: 1080, // Display width for images
    showHeight: 1920, // Display height for images
    timeFormat: "YYYY/MM/DD HH:mm", // Or `relative` can be used
    autoInfoPosition: false,
  },
  requiresVersion: "2.16.0",

  suspended: false,

  getStyles: function () {
    return ["MMM-FolderPhotos.css"];
  },

  start: function () {
    this.albums = null;
    this.scanned = [];
    this.updateTimer = null;
    this.index = 0;
    this.needMorePicsFlag = true;
    this.firstScan = true;
    if (this.config.updateInterval < 1000 * 10) this.config.updateInterval = 1000 * 10;
    this.config.condition = Object.assign({}, this.defaults.condition, this.config.condition);

    const config = { ...this.config };
    
    this.sendSocketNotification("INIT", config);
    this.dynamicPosition = 0;
  },

  socketNotificationReceived: function (noti, payload) {
    if (noti === "INITIALIZED") {
      this.albums = payload;
      //set up timer once initialized, more robust against faults
      if (!this.updateTimer || this.updateTimer === null) {
        Log.info("Start timer for updating photos.");
        this.updateTimer = setInterval(() => {
          this.updatePhotos();
        }, this.config.updateInterval);
      }
    }
    if (noti === "UPDATE_ALBUMS") {
      this.albums = payload;
    }
    if (noti === "MORE_PICS") {
      if (payload && Array.isArray(payload) && payload.length > 0) this.needMorePicsFlag = false;
      this.scanned = payload;
      this.index = 0;
      if (this.firstScan) {
        this.updatePhotos(); //little faster starting
      }
    }
    if (noti === "ERROR") {
      const current = document.getElementById("FPHOTO_CURRENT");
      const errMsgDiv = document.createElement("div");
      errMsgDiv.style.textAlign = "center";
      errMsgDiv.style.lineHeight = "80vh";
      errMsgDiv.style.fontSize = "1.5em";
      errMsgDiv.style.verticalAlign = "middle";
      errMsgDiv.textContent = payload;
      current.appendChild(errMsgDiv);
    }
    if (noti === "CLEAR_ERROR") {
      const current = document.getElementById("FPHOTO_CURRENT");
      current.textContent = "";
    }
    if (noti === "UPDATE_STATUS") {
      let info = document.getElementById("FPHOTO_INFO");
      info.innerHTML = String(payload);
    }
  },

  notificationReceived: function (noti) {
    if (noti === "FPHOTO_NEXT") {
      this.updatePhotos();
    }
    if (noti === "FPHOTO_PREVIOUS") {
      this.updatePhotos(-2);
    }
  },

  updatePhotos: function (dir = 0) {
    Log.info("Updating photos..");
    this.firstScan = false;

    if (this.scanned.length === 0) {
      this.sendSocketNotification("NEED_MORE_PICS", []);
      return;
    }
    if (this.suspended) {
      this.sendSocketNotification("MODULE_SUSPENDED_SKIP_UPDATE");
      let info = document.getElementById("FPHOTO_INFO");
      info.innerHTML = "";
      return;
    }
    this.index = this.index + dir; //only used for reversing
    if (this.index < 0) this.index = this.scanned.length + this.index;
    if (this.index >= this.scanned.length) {
      this.index -= this.scanned.length;
    }
    let target = this.scanned[this.index];
    let url = `/MMM-FolderPhotos/image/${target.id}`;
    this.ready(url, target);
    this.index++;
    if (this.index >= this.scanned.length) {
      this.index = 0;
      this.needMorePicsFlag = true;
    }
    if (this.needMorePicsFlag) {
      setTimeout(() => {
        this.sendSocketNotification("NEED_MORE_PICS", []);
      }, 2000);
    }
  },

  ready: function (url, target) {
    let hidden = document.createElement("img");
    const _this = this;
    
    // Add timeout to prevent hanging requests
    const timeoutId = setTimeout(() => {
      hidden.src = '';
      hidden.onload = null;
      hidden.onerror = null;
      hidden = null; // Help GC
    }, 10000); // 10 second timeout
    
    hidden.onerror = (event, source, lineno, colno, error) => {
      clearTimeout(timeoutId);
      const errObj = { url, event, source, lineno, colno, error };
      this.sendSocketNotification("IMAGE_LOAD_FAIL", errObj);
      // Clean up
      hidden.onload = null;
      hidden.onerror = null;
      hidden = null;
    };
    hidden.onload = () => {
      clearTimeout(timeoutId);
      _this.render(url, target);
      // Clean up
      hidden.onload = null;
      hidden.onerror = null;
      hidden = null;
    };
    hidden.src = url;
  },

  render: function (url, target) {
    let back = document.getElementById("FPHOTO_BACK");
    let current = document.getElementById("FPHOTO_CURRENT");
    current.textContent = "";
    //current.classList.remove("animated")
    // let dom = document.getElementById("FPHOTO");
    back.style.backgroundImage = `url(${url})`;
    current.style.backgroundImage = `url(${url})`;
    current.classList.add("animated");
    const info = document.getElementById("FPHOTO_INFO");
    const album = Array.isArray(this.albums) ? this.albums.find((a) => a.id === target._albumId) : { id: -1, title: '' };
    if (this.config.autoInfoPosition) {
      // eslint-disable-next-line no-unused-vars
      let op = (album, target) => {
        let now = new Date();
        let q = Math.floor(now.getMinutes() / 15);
        let r = [
          [0, "none", "none", 0],
          ["none", "none", 0, 0],
          ["none", 0, 0, "none"],
          [0, 0, "none", "none"],
        ];
        return r[q];
      };
      if (typeof this.config.autoInfoPosition === "function") {
        op = this.config.autoInfoPosition;
      }
      const [top, left, bottom, right] = op(album, target);
      info.style.setProperty("--top", top);
      info.style.setProperty("--left", left);
      info.style.setProperty("--bottom", bottom);
      info.style.setProperty("--right", right);
    }
    info.innerHTML = "";
    let albumTitle = document.createElement("div");
    albumTitle.classList.add("albumTitle");
    albumTitle.innerHTML = album.title;
    let photoTime = document.createElement("div");
    photoTime.classList.add("photoTime");
    photoTime.innerHTML = this.config.timeFormat === "relative" ? moment(target.creationTime).fromNow() : moment(target.creationTime).format(this.config.timeFormat);
    let infoText = document.createElement("div");
    infoText.classList.add("infoText");

    infoText.appendChild(albumTitle);
    infoText.appendChild(photoTime);
    info.appendChild(infoText);
    this.sendSocketNotification("IMAGE_LOADED", { id: target.id, index: this.index });
  },

  getDom: function () {
    let wrapper = document.createElement("div");
    wrapper.id = "FPHOTO";
    let back = document.createElement("div");
    back.id = "FPHOTO_BACK";
    let current = document.createElement("div");
    current.id = "FPHOTO_CURRENT";
    if (this.data.position.search("fullscreen") === -1) {
      if (this.config.showWidth) wrapper.style.width = this.config.showWidth + "px";
      if (this.config.showHeight) wrapper.style.height = this.config.showHeight + "px";
    }
    
    // Use named function for event listener to enable proper cleanup
    const animationEndHandler = () => {
      current.classList.remove("animated");
    };
    current.addEventListener("animationend", animationEndHandler);
    
    // Store reference for cleanup
    current._animationEndHandler = animationEndHandler;
    
    let info = document.createElement("div");
    info.id = "FPHOTO_INFO";
    info.innerHTML = "Loading...";
    wrapper.appendChild(back);
    wrapper.appendChild(current);
    wrapper.appendChild(info);
    Log.info("updated!");
    return wrapper;
  },

  suspend() {
    this.suspended = true;
  },

  resume() {
    this.suspended = false;
  },

  // Add proper cleanup method
  stop: function() {
    Log.info("Stopping MMM-FolderPhotos module");
    
    // Clear the update timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    // Clear arrays to free memory
    this.scanned = [];
    this.albums = null;
    
    // Remove event listeners properly
    const current = document.getElementById("FPHOTO_CURRENT");
    if (current && current._animationEndHandler) {
      current.removeEventListener("animationend", current._animationEndHandler);
      current._animationEndHandler = null;
    }
    
    this.suspended = true;
  },
});
