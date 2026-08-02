export interface Contact {
  contactId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  companyName?: string;
}

export interface EventContactLink {
  contactId: number;
  eventId: number;
}
