import type {
  AdminLoginInput,
  HostRegisterInput,
  KycStatus,
  RegisterInput,
  User,
  UserRole,
  UserStatus,
} from '../types/auth';


export type HostProperty = {
  _id?: string;
  id: string;
  title: string;
  tagline?: string;
  propertyType: string;
  location: { city: string; province?: string; district?: string; wardNumber?: string; streetAddress?: string };
  pricePerNight: number;
  description?: string;
  images?: string[];
  amenities?: string[];
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  status: 'draft' | 'active' | 'pending_approval' | 'paused' | 'unlisted';
};

export type HostPropertyInput = Omit<HostProperty, 'id' | '_id' | 'status'> & { status?: string };

const TOKEN_KEY = 'ns_jwt_token';

// In production (Vercel), VITE_API_URL points to the deployed backend.
// In dev, it's empty so the Vite proxy handles /api → localhost:5000
const API_BASE = (import.meta.env.VITE_API_URL as string) || '';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network request failed';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export const api = {
  // Public Configuration & Health
  async getHealth() {
    return request<{ status: string; service: string; time: string }>('/api/health');
  },

  async getConfig() {
    return request<{ adminGmailConfigured: boolean; googleClientId: string }>('/api/auth/config');
  },

  // Auth Operations
  async login(identifier: string, password: string, role?: UserRole) {
    const res = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, role }),
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },

  async googleAuth(profile: { name: string; email: string; avatarUrl?: string; googleId?: string }, token?: string) {
    const res = await request<{ user: User; token: string }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ profile, token }),
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },

  async registerGuest(input: RegisterInput) {
    const res = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },

  async registerHost(input: HostRegisterInput) {
    const payload = {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      password: input.password,
      role: 'owner',
      propertyName: input.propertyName,
      propertyType: input.propertyType,
      city: input.city,
      propertyCity: input.city,
      province: input.province,
      district: input.district,
      wardNumber: input.wardNumber,
      streetAddress: input.streetAddress,
      emailVerificationToken: input.emailVerificationToken,
    };

    const res = await request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },

  async adminLogin(input: AdminLoginInput) {
    const res = await request<{ user: User; token: string }>('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },

  async getMe() {
    return request<{ user: User }>('/api/auth/me');
  },

  async updateProfile(updates: Partial<User>) {
    return request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async forgotPassword(identifier: string) {
    return request<{ message: string; devCode?: string; emailSent?: boolean }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },


  async verifyEmailCode(email: string, code: string) {
    return request<{ verificationToken: string }>('/api/auth/verify-email-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  async sendVerificationCode(data: { email?: string; phone?: string; fullName?: string }) {
    return request<{ code: string; emailSent: boolean; message: string }>('/api/auth/send-verification-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async resetPassword(identifier: string, code: string, newPassword: string) {
    return request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, code, newPassword }),
    });
  },

  async logout() {
    clearStoredToken();
    return request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  },


  // Host property management
  async getHostProperties() {
    return request<{ properties: HostProperty[]; count: number }>('/api/properties/mine');
  },

  async createHostProperty(input: HostPropertyInput) {
    return request<{ property: HostProperty }>('/api/properties', { method: 'POST', body: JSON.stringify(input) });
  },

  async updateHostProperty(id: string, input: HostPropertyInput) {
    return request<{ property: HostProperty }>(`/api/properties/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  },

  async updateHostPropertyStatus(id: string, status: string) {
    return request<{ property: HostProperty }>(`/api/properties/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },

  async removeHostProperty(id: string) {
    return request<{ message: string }>(`/api/properties/${id}`, { method: 'DELETE' });
  },

  // Admin User Management
  async getAllUsers() {
    return request<{ users: User[]; stats: Record<string, number> }>('/api/users');
  },

  async updateUserStatus(userId: string, status: UserStatus) {
    return request<{ user: User }>(`/api/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async updateUserKyc(userId: string, kycStatus: KycStatus) {
    return request<{ user: User }>(`/api/users/${userId}/kyc`, {
      method: 'PATCH',
      body: JSON.stringify({ kycStatus }),
    });
  },
};

