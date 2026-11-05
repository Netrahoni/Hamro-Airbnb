import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type {
  AdminLoginInput,
  HostRegisterInput,
  KycStatus,
  RegisterInput,
  User,
  UserRole,
  UserStatus,
} from '../types/auth';
import { api, clearStoredToken, getStoredToken } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendConnected: boolean;
  login: (identifier: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (profile: { name: string; email: string; avatarUrl?: string; googleId?: string }, token?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (input: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  registerHost: (input: HostRegisterInput) => Promise<{ success: boolean; error?: string }>;
  adminLogin: (input: AdminLoginInput) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (identifier: string) => Promise<{ success: boolean; message?: string; devCode?: string; error?: string }>;
  resetPassword: (identifier: string, code: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  updateUserKyc: (userId: string, kycStatus: KycStatus) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Authentication state is restored only from a server-validated JWT session.
  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const healthRes = await api.getHealth();
      setIsBackendConnected(Boolean(healthRes.success));
      const token = getStoredToken();
      if (!token) {
        setCurrentUser(null);
        localStorage.removeItem('ns_current_user');
        return;
      }
      const meRes = await api.getMe();
      if (meRes.success && meRes.data?.user) {
        setCurrentUser(meRes.data.user);
        localStorage.setItem('ns_current_user', JSON.stringify(meRes.data.user));
      } else {
        clearStoredToken();
        setCurrentUser(null);
        localStorage.removeItem('ns_current_user');
      }
    } catch (error) {
      console.warn('Backend initialization check failed:', error);
      setIsBackendConnected(false);
      clearStoredToken();
      setCurrentUser(null);
      localStorage.removeItem('ns_current_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Persist current user info for quick UI restoration
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ns_current_user', JSON.stringify(currentUser));
      localStorage.setItem('ns-guest-name', currentUser.fullName || '');
      localStorage.setItem('ns-guest-phone', currentUser.phone || '');
      localStorage.setItem('ns-guest-email', currentUser.email || '');
    } else {
      localStorage.removeItem('ns_current_user');
    }
  }, [currentUser]);

  // Fetch all users (for Admin dashboard)
  const refreshUsers = useCallback(async () => {
    if (currentUser?.role === 'admin') {
      const res = await api.getAllUsers();
      if (res.success && res.data?.users) {
        setUsers(res.data.users);
        localStorage.setItem('ns_users', JSON.stringify(res.data.users));
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      refreshUsers();
    }
  }, [currentUser, refreshUsers]);

  // All authentication decisions are made by the backend; no local/demo fallback grants sessions or roles.
  const login = async (identifier: string, pass: string, expectedRole?: UserRole): Promise<{ success: boolean; error?: string }> => {
    const res = await api.login(identifier, pass, expectedRole);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Unable to sign in. Please try again.' };
  };

  const loginWithGoogle = async (
    googleProfile: { name: string; email: string; avatarUrl?: string; googleId?: string },
    token?: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    const res = await api.googleAuth(googleProfile, token);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
      return { success: true, user: res.data.user };
    }
    return { success: false, error: res.error || 'Google sign-in could not be verified.' };
  };

  const register = async (input: RegisterInput): Promise<{ success: boolean; error?: string }> => {
    const res = await api.registerGuest(input);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Registration failed. Please try again.' };
  };

  const registerHost = async (input: HostRegisterInput): Promise<{ success: boolean; error?: string }> => {
    const res = await api.registerHost(input);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Host registration failed. Please try again.' };
  };

  const adminLogin = async (input: AdminLoginInput): Promise<{ success: boolean; error?: string }> => {
    const res = await api.adminLogin(input);
    if (res.success && res.data?.user?.role === 'admin') {
      setCurrentUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Administrator authentication failed.' };
  };

  const forgotPassword = async (identifier: string): Promise<{ success: boolean; message?: string; devCode?: string; error?: string }> => {
    const res = await api.forgotPassword(identifier);
    if (res.success && res.data) {
      return { success: true, message: res.data.message, devCode: res.data.devCode };
    }
    return { success: false, error: res.error || 'Failed to request password reset code.' };
  };

  const resetPassword = async (identifier: string, code: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const res = await api.resetPassword(identifier, code, newPassword);
    if (res.success && res.data) {
      return { success: true, message: res.data.message };
    }
    return { success: false, error: res.error || 'Failed to reset password.' };
  };

  const logout = () => {
    api.logout().catch(() => {});
    clearStoredToken();
    setCurrentUser(null);
    localStorage.removeItem('ns_current_user');
    localStorage.removeItem('ns-guest-name');
    localStorage.removeItem('ns-guest-phone');
    localStorage.removeItem('ns-guest-email');
  };

  const switchRole = (_role: UserRole) => {
    // A client-side role switch must never change the server-authorized identity.
  };

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    const res = await api.updateProfile(updates);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
      return { success: true };
    }

    return { success: false, error: res.error || 'Profile update failed.' };
  };

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    const result = await api.updateUserStatus(userId, status);
    if (!result.success) return;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const updateUserKyc = async (userId: string, kycStatus: KycStatus) => {
    const result = await api.updateUserKyc(userId, kycStatus);
    if (!result.success) return;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, kycStatus } : u)));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, kycStatus } : null));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated: !!currentUser,
        isLoading,
        isBackendConnected,
        login,
        loginWithGoogle,
        register,
        registerHost,
        adminLogin,
        forgotPassword,
        resetPassword,
        logout,
        switchRole,
        updateProfile,
        updateUserStatus,
        updateUserKyc,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
