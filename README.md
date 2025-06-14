# MMM-FolderPhotos

Display your photos from local folders on [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror).

This module displays photos from local folders instead of cloud services. It organizes photos by treating each subfolder in your root directory as an album.

## Screenshot

![screenshot](images/screenshot.png)

![screenshot](images/screenshot2.png)

## Installation & Upgrade

[INSTALL.md](INSTALL.md)

## Configuration

```javascript
{
  module: "MMM-FolderPhotos",
  position: "top_right",
  config: {
    rootPath: "~/Pictures/MagicMirror", // Root folder containing album subfolders
    albums: [], // Optional: specify album folder names. If empty, all subfolders will be used
    updateInterval: 1000 * 60, // minimum 10 seconds
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
  }
},
```

## Usage

### Folder Structure

The module expects a folder structure like this:

```
~/Pictures/MagicMirror/           # Root folder (configurable)
├── Vacation 2023/                # Album 1
│   ├── beach.jpg
│   ├── sunset.png
│   └── subfolder/                # Optional subfolder (if recursiveSubFolders is true)
│       └── more_pics.jpg
├── Family Photos/                # Album 2
│   ├── birthday.jpg
│   └── celebration.png
└── Wedding/                      # Album 3
    ├── ceremony.jpg
    └── reception.jpg
```

### `rootPath`

- **Required**: The root directory containing your photo albums
- Can use `~` for home directory (e.g., `~/Pictures/MagicMirror`)
- Default: `~/Pictures/MagicMirror`
- Each subfolder in this directory will be treated as an album

### `albums`

You can specify which album folders to display:

```js
albums: ["Vacation 2023", "Family Photos", "Wedding"],
```

- If empty (`[]`), all subfolders in `rootPath` will be used as albums
- Only folders containing valid image files will be included

### `recursiveSubFolders`

- `true` (default): Scan subfolders within album folders for additional images
- `false`: Only scan the root level of each album folder

### `validExtensions`

Array of valid image file extensions to include:

```js
validExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
```

### `updateInterval`

- Minimum `updateInterval` is 10 seconds
- The module will periodically rescan folders for new or changed images

### `sort`

- `new`: Sort by file modification time (newest first)
- `old`: Sort by file modification time (oldest first) 
- `random`: Random order

### `condition`

- You can filter photos by various criteria
- `fromDate`/`toDate`: Filter by file date (see Date Handling section below)
- Image dimension and ratio filters work the same as before

```js
condition: {
  fromDate: "2018-01-01", // I don't want older photos than this.
  minWidth: 600, // I don't want to display some icons or meme-pictures from my garbage collecting albums.
  maxWHRatio: 1, // I want to display photos which are portrait.
}
```

### Date Handling

The module uses intelligent date extraction for photos:

1. **Filename Date Extraction**: If the filename contains a date in YYYYMMDD format, that date will be used
   - Examples: `IMG_20231225_143052.jpg`, `photo_20220101_120000.png`, `vacation_20230415_spring.jpg`
   - The date must be valid (e.g., `20230230` for Feb 30 would be rejected)
   - Only years between 1900 and 10 years in the future are accepted

2. **File Modification Time Fallback**: If no valid date is found in the filename, the file's modification time is used

This ensures that photos are displayed with the most accurate date possible, especially useful for photos transferred from cameras or phones that may have been modified after the original capture date.

### `showWidth`, `showHeight`

- Specify your real resolution to show.

### `timeFormat`

- Specify time format for photo info. You can also use `relative` to show more humanized.

### `debug`

- If set, more detailed info will be logged.

### `autoInfoPosition`

- For preventing LCD burning, Photo info can be relocated by condition.
  - `true` : automatically change position to each corner per 15 minutes.
  - `false` : not using.
  - callbackfunction (album, photo) : User can make his own position. It should return `[top, left, bottom, right]`

```js
autoInfoPosition: true, // or false

// User custom callback
autoInfoPosition: (album, photo)=> {
 return ['10px', '10px', 'none', 'none'] // This will show photo info top-left corner.
}

```

## Tip

- Not to show photo info : Add this into your `css/custom.css`.

```css
#FPHOTO_INFO {
  display: none;
}
```

- To move photo info to other position (e.g: top-left corner): Add this into your `css/custom.css`.

```css
#FPHOTO_INFO {
  top: 10px;
  left: 10px;
  bottom: inherit;
  right: inherit;
}
```

- Not to show blurred Background : Add this into your `css/custom.css`.

```css
#FPHOTO_BACK {
  display: none;
}
```

- To cover whole region with image : Add this into your `css/custom.css`.

```css
#FPHOTO_CURRENT {
  background-size: cover;
}
```

- To shrink image and be fully visible on smaller screens : Add this into your `css/custom.css`.

```css
#FPHOTO_CURRENT {
  background-size: contain;
}
```

- To display `clock` more clearly on showing in `fullscreen_below` : Add this into your `css/custom.css`.

```css
.clock {
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.5);
}
```

- To give opacity to photos:

```CSS
@keyframes trans {
  from {opacity: 0}
  to {opacity: 0.5}
}
#FPHOTO_CURRENT {
  background-size:cover;
  opacity:0.5;
}
```

## Node

- node.js : required over v18.
