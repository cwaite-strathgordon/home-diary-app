export interface User {
  userId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  admin?: boolean;
  mobileNumber?: string;
  oAuthProvider?: string;
  oAuthId?: string;
  oAuthEmail?: string;
}
