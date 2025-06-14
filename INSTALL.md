## Installation

1. Install Module
    
    Run the following command. For example, the Magic Mirror directory is `~/MagicMirror`.
    ```sh
    cd ~/MagicMirror/modules
    git clone https://github.com/yourusername/MMM-FolderPhotos.git
    cd MMM-FolderPhotos
    npm run install-prod
    ```

    If you are using Docker

    ```sh
    cd ~/MagicMirror/modules
    git clone https://github.com/yourusername/MMM-FolderPhotos.git
    docker exec -it -w /opt/magic_mirror/modules/MMM-FolderPhotos magic_mirror npm run install-prod
    ```

1. Add MMM-FolderPhotos module config in ~/MagicMirror/config/config.js


## Upgrade

  Run the following command. For example, the Magic Mirror directory is `~/MagicMirror`.
  ```sh
  cd ~/MagicMirror/modules/MMM-FolderPhotos
  git pull
  npm run install-prod
  ```

## Folder Setup

### Organize Your Photos

1. Create a root directory for your photos (e.g., `~/Pictures/MagicMirror`)
2. Create subdirectories for each album:
   ```
   ~/Pictures/MagicMirror/
   ├── Family/
   │   ├── photo1.jpg
   │   └── photo2.jpg
   ├── Vacation/
   │   ├── beach1.jpg
   │   └── beach2.jpg
   └── Pets/
       ├── dog1.jpg
       └── cat1.jpg
   ```
3. Supported image formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`
4. The module will scan recursively through subdirectories if `recursiveSubFolders` is enabled

### Configuration

Add the module configuration to your `config/config.js`:

```javascript
{
  module: "MMM-FolderPhotos",
  position: "top_right", // or your preferred position
  config: {
    rootPath: "~/Pictures/MagicMirror", // Path to your photo root directory
    albums: [], // Optional: specify album folder names. If empty, all subfolders will be used
    updateInterval: 1000 * 60, // Update interval in milliseconds
    sort: "new", // "old", "random"
    recursiveSubFolders: true, // Scan subdirectories within album folders
    // ... other configuration options
  }
}
```
