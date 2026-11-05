export type UserRole = 'guest' | 'owner' | 'admin';

export type KycStatus = 'approved' | 'pending' | 'correction' | 'none';

export type UserStatus = 'active' | 'restricted' | 'suspended';

export type AuthProviderType = 'email' | 'google' | 'phone';

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  authProvider?: AuthProviderType;
  avatar?: string;
  propertyName?: string;
  propertyCity?: string;
  propertyType?: string;
  province?: string;
  district?: string;
  wardNumber?: string;
  citizenshipNumber?: string;
  panNumber?: string;
  bankDetails?: BankDetails;
  kycStatus?: KycStatus;
  status: UserStatus;
  twoFactorEnabled?: boolean;
  securityClearance?: string;
  createdAt: string;
  lastLogin?: string;
  lastIp?: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  propertyName?: string;
  propertyCity?: string;
  propertyType?: string;
  emailVerificationToken?: string;
}

export interface HostRegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  citizenshipNumber: string;
  propertyName: string;
  propertyType: string;
  province: string;
  district: string;
  city: string;
  wardNumber: string;
  streetAddress: string;
  panNumber: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  roomCount: number;
  baseRate: number;
  emailVerificationToken?: string;
}

export interface AdminLoginInput {
  staffIdOrEmail: string;
  password: string;
  totpCode: string;
}
