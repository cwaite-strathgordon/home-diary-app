export interface Note {
  noteId: number;
  linkObjectTypeId: number;
  linkObjectId: number;
  subject: string;
  noteText: string;
  createdDate?: string;
  createdById?: number;
  createdByFirstName?: string;
  createdByLastName?: string;
  createdByEmail?: string;
  updatedDate?: string;
  updatedById?: number;
}
