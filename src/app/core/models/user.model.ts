export interface User {
  userId: number;
  clientId?: number;
  clientName?: string;
  inboundEmailAddress?: string;
  onboardingComplete?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  admin?: boolean;
  disabled?: boolean;
  mobileNumber?: string;
  oAuthProvider?: string;
  oAuthId?: string;
  oAuthEmail?: string;
  lastLoginAt?: string;
}
