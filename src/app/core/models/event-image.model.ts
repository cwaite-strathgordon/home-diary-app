export interface EventImage {
  eventImageId: number;
  eventId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdDate: string;
  createdById?: number;
}

export interface EventImageView extends EventImage {
  objectUrl: string;
}
