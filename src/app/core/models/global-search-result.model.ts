export interface GlobalSearchResult {
  resultType: 'event' | 'contact' | 'document' | 'event-note' | 'contact-note';
  objectId: number;
  parentId?: number;
  title: string;
  subtitle: string;
  searchSnippet: string;
  rank: number;
}
