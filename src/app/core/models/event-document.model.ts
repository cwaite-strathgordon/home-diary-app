export interface EventDocument {
  eventDocumentId: number;
  eventId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  createdDate: string;
  createdById?: number;
  searchSnippet?: string;
  eventTitle?: string;
  projectId?: number;
  projectTitle?: string;
}
