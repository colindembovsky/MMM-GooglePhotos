interface LocalPhoto {
  id: string;
  filename: string;
  baseUrl: string;
  mediaMetadata: {
    creationTime: string;
    width: number;
    height: number;
    photo?: any;
  };
  _albumId: string;
}

interface LocalAlbum {
  id: string;
  title: string;
  mediaItemsCount: number;
  coverPhotoBaseUrl?: string;
}
