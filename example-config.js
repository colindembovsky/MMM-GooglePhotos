// Example configuration for MMM-FolderPhotos
// Add this to your MagicMirror config/config.js file

module.exports = {
  module: "MMM-FolderPhotos",
  position: "top_right",
  config: {
    // Root folder containing your photo albums (subfolders)
    rootPath: "~/Pictures/MagicMirror",
    
    // Optional: specify which album folders to display
    // If empty, all subfolders in rootPath will be used
    albums: [], // e.g., ["Vacation 2023", "Family Photos", "Wedding"]
    
    // How often to update/rescan for new photos (minimum 10 seconds)
    updateInterval: 1000 * 60, // 1 minute
    
    // Sort order: "new", "old", or "random"
    sort: "new",
    
    // Whether to scan subfolders within album folders
    recursiveSubFolders: true,
    
    // Valid image file extensions
    validExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
    
    // Photo filtering conditions
    condition: {
      fromDate: null, // e.g., "2023-01-01" - filter by file modification date
      toDate: null,   // e.g., "2023-12-31"
      minWidth: null, // e.g., 400 - minimum image width in pixels
      maxWidth: null, // e.g., 8000 - maximum image width in pixels
      minHeight: null,
      maxHeight: null,
      minWHRatio: null, // e.g., 0.5 - minimum width/height ratio
      maxWHRatio: null, // e.g., 2.0 - maximum width/height ratio
    },
    
    // Display size (adjust to fit your mirror)
    showWidth: 1080,
    showHeight: 1920,
    
    // Time format for photo info
    timeFormat: "YYYY/MM/DD HH:mm", // or "relative"
    
    // Auto-position photo info
    autoInfoPosition: false,
  },
};
