import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { HostRegisterInput, UserRole } from '../types/auth';
import {
  UserRound,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Lock,
  Landmark,
  FileCheck,
  Clock,
  Key,
} from 'lucide-react';
import Badge from '../components/Badge';

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
  );
}

interface AuthPageProps {
  initialSignup?: boolean;
}

export default function AuthPage({ initialSignup = false }: AuthPageProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectPath = params.get('redirect');
  const roleParam = params.get('role') as UserRole | null;

  const {
    login,
    loginWithGoogle,
    register,
    registerHost,
    adminLogin,
    forgotPassword,
    resetPassword,
  } = useAuth();

  const [activeRole, setActiveRole] = useState<UserRole>(roleParam || 'guest');
  const [isSignup, setIsSignup] = useState(initialSignup);

  // Common Form States - Starts completely empty for real user entry
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Guest Registration States
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('+977 98');
  const [guestPassword, setGuestPassword] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingSignupRole, setPendingSignupRole] = useState<'guest' | 'owner'>('guest');
  const [otpCode, setOtpCode] = useState('');
  const [signupOtpMsg, setSignupOtpMsg] = useState('');

  // Host Registration Multi-Step Wizard States
  const [hostStep, setHostStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [hostData, setHostData] = useState<HostRegisterInput>({
    fullName: '',
    email: '',
    phone: '+977 98',
    password: '',
    citizenshipNumber: '',
    propertyName: '',
    propertyType: 'Homestay',
    province: 'Gandaki Province',
    district: 'Kaski',
    city: 'Pokhara',
    wardNumber: '6',
    streetAddress: 'Lakeside Baidam',
    panNumber: '',
    bankName: 'Nabil Bank Ltd',
    accountName: '',
    accountNumber: '',
    branch: 'Pokhara Branch',
    roomCount: 4,
    baseRate: 4500,
  });

  // Admin 2FA States
  const [adminStep, setAdminStep] = useState<'credentials' | '2fa'>('credentials');
  const [adminStaffId, setAdminStaffId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpCountdown, setTotpCountdown] = useState(30);

  // Forgot Password States
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);


  // Countdown timer for 2FA TOTP code
  useEffect(() => {
    if (activeRole === 'admin' && adminStep === '2fa') {
      const interval = setInterval(() => {
        setTotpCountdown((prev) => (prev > 1 ? prev - 1 : 30));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeRole, adminStep]);

  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [activeRole, isSignup]);

  const handleRedirect = (role: UserRole) => {
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
      return;
    }
    if (role === 'admin') navigate('/admin/dashboard', { replace: true });
    else if (role === 'owner') navigate('/owner/dashboard', { replace: true });
    else navigate('/trips', { replace: true });
  };

  const [googleClientId, setGoogleClientId] = useState('');
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  // Fetch Google Client ID from backend
  useEffect(() => {
    api.getConfig().then((res) => {
      if (res.success && res.data?.googleClientId) {
        setGoogleClientId(res.data.googleClientId);
      }
    });
  }, []);

  // Real Google OAuth: Process ID Token (One-Tap / Credential JWT)
  const processGoogleIdToken = async (idToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = decodeJwt(idToken);
      const email = (payload?.email as string) || '';
      const name = (payload?.name as string) || (payload?.given_name as string) || email.split('@')[0] || 'Traveler';
      const avatarUrl = (payload?.picture as string) || undefined;
      const googleId = (payload?.sub as string) || undefined;

      if (!email) {
        throw new Error('Google did not provide an email address.');
      }

      const res = await loginWithGoogle(
        { name, email, avatarUrl, googleId },
        idToken
      );

      if (res.success) {
        handleRedirect(res.user?.role || 'guest');
      } else {
        setError(res.error || 'Google sign-in failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google verification failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Render official Google Identity Services button (No redirect, No redirect_uri_mismatch!)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const renderGoogleBtn = () => {
      const google = (window as unknown as { google?: { accounts?: { id?: { initialize: (config: unknown) => void; renderButton: (el: HTMLElement, opts: unknown) => void } } } }).google;
      const container = document.getElementById('google-native-btn-container');

      if (googleClientId && google?.accounts?.id && container && activeRole === 'guest') {
        try {
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response: { credential?: string }) => {
              if (response?.credential) {
                processGoogleIdToken(response.credential);
              }
            },
            auto_select: false,
          });

          // Container is always empty from React's side — safe to let GIS render into it
          google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: Math.min(container.offsetWidth || 380, 420),
          });

          setIsGoogleReady(true);
          return true;
        } catch (err) {
          console.warn('Google Identity initialization notice:', err);
        }
      }
      return false;
    };

    if (!renderGoogleBtn()) {
      interval = setInterval(() => {
        if (renderGoogleBtn()) {
          clearInterval(interval);
        }
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [googleClientId, activeRole, isSignup]);

  // The fallback is informational only. Authentication is accepted exclusively through Google's signed ID credential.
  const handleGoogleAuthClick = () => {
    setError('Secure Google Sign-In is still loading. Please wait for the official Google button to appear.');
  };

  // Standard Login Submit
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please provide your registered email/phone and password.');
      return;
    }

    setIsLoading(true);
    const res = await login(identifier, password, activeRole);
    setIsLoading(false);

    if (res.success) {
      handleRedirect(activeRole);
    } else {
      setError(res.error || 'Login failed. Please check your credentials.');
    }
  };

  // Guest registration starts with a server-issued email verification code.
  const handleGuestSignupStart = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim() || !guestPassword) {
      setError('Please fill in all required registration fields.');
      return;
    }
    setIsLoading(true);
    const res = await api.sendVerificationCode({ email: guestEmail.trim(), fullName: guestName.trim() });
    setIsLoading(false);
    if (!res.success) {
      setError(res.error || 'Unable to send the verification code.');
      return;
    }
    setPendingSignupRole('guest');
    setOtpCode('');
    setSignupOtpMsg(`A six-digit verification code was sent to ${guestEmail}. It expires in 10 minutes.`);
    setShowOtpModal(true);
  };

  const handleGuestSignupComplete = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setError('Please enter the six-digit verification code.');
      return;
    }
    setIsLoading(true);
    setError(null);
    const email = pendingSignupRole === 'guest' ? guestEmail.trim() : hostData.email.trim();
    const verification = await api.verifyEmailCode(email, otpCode);
    if (!verification.success || !verification.data?.verificationToken) {
      setIsLoading(false);
      setError(verification.error || 'Email verification failed. Request a new code.');
      return;
    }
    const result = pendingSignupRole === 'guest'
      ? await register({
          fullName: guestName,
          email: guestEmail,
          phone: guestPhone,
          password: guestPassword,
          role: 'guest',
          emailVerificationToken: verification.data.verificationToken,
        })
      : await registerHost({ ...hostData, emailVerificationToken: verification.data.verificationToken });
    setIsLoading(false);
    if (result.success) {
      setShowOtpModal(false);
      setSuccessMsg(pendingSignupRole === 'guest' ? 'Account registered successfully! Redirecting...' : 'Host partner application submitted! Welcome to your host dashboard.');
      setTimeout(() => handleRedirect(pendingSignupRole), 700);
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  // Host registration also requires verified email before the account is created.
  const handleHostRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!hostData.fullName.trim() || !hostData.email.trim() || !hostData.password) {
      setError('Please fill in your primary contact and host security credentials.');
      return;
    }
    if (!hostData.propertyName.trim() || !hostData.city.trim()) {
      setError('Please provide your property name and city.');
      return;
    }
    setIsLoading(true);
    const res = await api.sendVerificationCode({ email: hostData.email.trim(), fullName: hostData.fullName.trim() });
    setIsLoading(false);
    if (!res.success) {
      setError(res.error || 'Unable to send the verification code.');
      return;
    }
    setPendingSignupRole('owner');
    setOtpCode('');
    setSignupOtpMsg(`A six-digit verification code was sent to ${hostData.email}. It expires in 10 minutes.`);
    setShowOtpModal(true);
  };

  // Forgot Password Handlers
  const handleForgotPasswordRequest = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccessMsg(null);

    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your registered email address or mobile phone.');
      return;
    }

    setIsLoading(true);
    const res = await forgotPassword(forgotIdentifier.trim());
    setIsLoading(false);

    if (res.success) {
      setForgotSuccessMsg(res.message || 'Verification code sent to your email/mobile.');
      setForgotStep('reset');
    } else {
      setForgotError(res.error || 'Failed to request password reset code.');
    }
  };

  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccessMsg(null);

    if (!forgotCode.trim() || forgotCode.trim().length !== 6) {
      setForgotError('Please enter a valid 6-digit verification code.');
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 10) {
      setForgotError('New password must be at least 10 characters.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setIsLoading(true);
    const res = await resetPassword(forgotIdentifier.trim(), forgotCode.trim(), forgotNewPassword);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg('Password updated successfully! Please sign in with your new password.');
      setPassword(forgotNewPassword);
      setIdentifier(forgotIdentifier);
      setShowForgotPasswordModal(false);
    } else {
      setForgotError(res.error || 'Failed to reset password.');
    }
  };

  // Admin 2FA Gateway Handlers
  const handleAdminStep1 = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!adminStaffId.trim() || !adminPassword) {
      setError('Admin email or Staff ID and Master Password are required.');
      return;
    }
    // Proceed to Step 2 (TOTP verification)
    setAdminStep('2fa');
  };

  const handleAdminStep2 = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!totpCode.trim() || totpCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit TOTP code.');
      return;
    }

    setIsLoading(true);
    const res = await adminLogin({
      staffIdOrEmail: adminStaffId,
      password: adminPassword,
      totpCode: totpCode,
    });
    setIsLoading(false);

    if (res.success) {
      handleRedirect('admin');
    } else {
      setError(res.error || 'Admin verification failed.');
    }
  };

  return (
    <div className="auth-page container">
      {/* Backend & Admin Configuration Notice Banner */}

      <div
        className="auth-card"
        style={{
          width: 'min(100%, 540px)',
          borderColor: activeRole === 'admin' ? '#17372f' : '#e3e7df',
          boxShadow: activeRole === 'admin' ? '0 20px 50px rgba(23, 55, 47, 0.12)' : '0 16px 50px rgba(33,50,39,.05)',
        }}
      >
        {/* Role Selector Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #eaede7', marginBottom: '22px' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeRole === 'guest' ? '2.5px solid #17372f' : '2.5px solid transparent',
              fontWeight: activeRole === 'guest' ? 700 : 500,
              color: activeRole === 'guest' ? '#17372f' : '#65748a',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={() => {
              setActiveRole('guest');
              setError(null);
            }}
          >
            <UserRound size={15} />
            <span>Traveler</span>
          </button>

          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeRole === 'owner' ? '2.5px solid #17372f' : '2.5px solid transparent',
              fontWeight: activeRole === 'owner' ? 700 : 500,
              color: activeRole === 'owner' ? '#17372f' : '#65748a',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={() => {
              setActiveRole('owner');
              setError(null);
            }}
          >
            <Building2 size={15} />
            <span>Host Partner</span>
          </button>

          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeRole === 'admin' ? '2.5px solid #17372f' : '2.5px solid transparent',
              fontWeight: activeRole === 'admin' ? 700 : 500,
              color: activeRole === 'admin' ? '#17372f' : '#65748a',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={() => {
              setActiveRole('admin');
              setError(null);
              setAdminStep('credentials');
            }}
          >
            <ShieldCheck size={15} />
            <span>Administrator</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            style={{
              padding: '12px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div
            style={{
              padding: '12px 14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              color: '#166534',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. GUEST AUTHENTICATION PORTAL (WITH GOOGLE & CREDENTIALS)     */}
        {/* ============================================================== */}
        {activeRole === 'guest' && (
          <div>
            <div className="eyebrow" style={{ color: '#17372f' }}>
              TRAVELER ACCESS
            </div>
            <h1 style={{ fontSize: '26px' }}>{isSignup ? 'Create your traveler account' : 'Sign in to NepalStay'}</h1>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
              {isSignup
                ? 'Join NepalStay to book boutique homestays, retreat lodges and mountain escapes.'
                : 'Welcome back. Access your upcoming stays, saved wishlists and bookings.'}
            </p>

            {/* Google Authentication — official GIS button is injected here by Google's SDK.
                IMPORTANT: React must NEVER render children inside this div.
                Google's renderButton() calls innerHTML='' which breaks React's vdom if there are children. */}
            <div
              id="google-native-btn-container"
              style={{
                display: isGoogleReady ? 'flex' : 'none',
                justifyContent: 'center',
                width: '100%',
                marginBottom: '16px',
              }}
            />

            {/* Fallback button shown BEFORE Google SDK finishes loading — it is a sibling, NOT inside the GIS container */}
            {!isGoogleReady && (
              <button
                type="button"
                className="google-auth-btn"
                onClick={handleGoogleAuthClick}
                disabled={isLoading}
                style={{ marginBottom: '16px' }}
              >
                <GoogleIcon />
                <span>{isLoading ? 'Connecting with Google...' : 'Continue with Google'}</span>
              </button>
            )}

            <div className="auth-or-divider">
              <span>OR USE PERSONAL GMAIL / EMAIL / PHONE</span>
            </div>

            {!isSignup ? (
              /* GUEST SIGN IN FORM */
              <form onSubmit={handleLoginSubmit}>
                <label className="form-label">
                  <span>Email address or mobile (+977)</span>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="yourname@gmail.com or +977 98XXXXXXXX"
                    required
                  />
                </label>

                <label className="form-label" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Password</span>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotIdentifier(identifier);
                        setForgotError(null);
                        setForgotSuccessMsg(null);
                        setForgotStep('request');
                        setShowForgotPasswordModal(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: '11px',
                        color: '#17372f',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#8995a5',
                      }}
                      aria-label="Toggle password"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <button type="submit" className="button button-dark button-full" disabled={isLoading} style={{ padding: '13px', marginTop: '10px' }}>
                  {isLoading ? 'Signing in...' : 'Sign In to Your Account'}
                </button>

                <div className="auth-switch" style={{ marginTop: '18px' }}>
                  New traveler to NepalStay?{' '}
                  <a
                    href="#signup"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSignup(true);
                      setError(null);
                    }}
                    style={{ fontWeight: 700, color: '#17372f' }}
                  >
                    Create a free account
                  </a>
                </div>
              </form>
            ) : (
              /* GUEST SIGN UP FORM */
              <form onSubmit={handleGuestSignupStart}>
                <label className="form-label">
                  <span>Full Legal Name</span>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Aayush Shrestha"
                    required
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label className="form-label">
                    <span>Personal Gmail / Email</span>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      required
                    />
                  </label>
                  <label className="form-label">
                    <span>Mobile Phone Number</span>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+977 98XXXXXXXX"
                      required
                    />
                  </label>
                </div>

                <label className="form-label" style={{ position: 'relative' }}>
                  <span>Create Password</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={guestPassword}
                      onChange={(e) => setGuestPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#8995a5',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <button type="submit" className="button button-dark button-full" style={{ padding: '13px', marginTop: '10px' }}>
                  Verify Mobile & Register Account <ArrowRight size={16} />
                </button>

                <div className="auth-switch" style={{ marginTop: '18px' }}>
                  Already registered?{' '}
                  <a
                    href="#login"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSignup(false);
                      setError(null);
                    }}
                    style={{ fontWeight: 700, color: '#17372f' }}
                  >
                    Sign In instead
                  </a>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. HOST / PROPERTY OWNER REGISTRATION WIZARD & SIGN-IN         */}
        {/* ============================================================== */}
        {activeRole === 'owner' && (
          <div>
            <div className="eyebrow" style={{ color: '#17372f' }}>
              HOST & PARTNER NETWORK
            </div>
            <h1 style={{ fontSize: '26px' }}>{isSignup ? 'Partner with NepalStay' : 'Host Portal Sign In'}</h1>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
              {isSignup
                ? 'Register your property, homestay, or boutique hotel in Nepal and connect with travelers worldwide.'
                : 'Access your reservations, guest communications, pricing, and payout dashboard.'}
            </p>

            {!isSignup ? (
              /* HOST SIGN IN */
              <form onSubmit={handleLoginSubmit}>
                <label className="form-label">
                  <span>Host Business Email or Mobile (+977)</span>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="host.stay@gmail.com or +977 98XXXXXXXX"
                    required
                  />
                </label>

                <label className="form-label" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Host Password</span>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotIdentifier(identifier);
                        setForgotError(null);
                        setForgotSuccessMsg(null);
                        setForgotStep('request');
                        setShowForgotPasswordModal(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: '11px',
                        color: '#17372f',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter host password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#8995a5',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <button type="submit" className="button button-dark button-full" disabled={isLoading} style={{ padding: '13px', marginTop: '10px' }}>
                  {isLoading ? 'Signing in...' : 'Sign In to Host Dashboard'}
                </button>

                <div className="auth-switch" style={{ marginTop: '18px' }}>
                  Want to host your property on NepalStay?{' '}
                  <a
                    href="#register-host"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSignup(true);
                      setHostStep(1);
                      setError(null);
                    }}
                    style={{ fontWeight: 700, color: '#17372f' }}
                  >
                    Start Host Registration
                  </a>
                </div>
              </form>
            ) : (
              /* HOST REGISTRATION STEP-BY-STEP WIZARD */
              <div>
                {/* Wizard Step Progress */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        background: hostStep >= step ? '#17372f' : '#eaede7',
                        transition: 'background 0.2s ease',
                      }}
                    />
                  ))}
                </div>

                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '14px' }}>
                  STEP {hostStep} OF 5: {
                    hostStep === 1 ? 'Primary Contact' :
                    hostStep === 2 ? 'Property Profile' :
                    hostStep === 3 ? 'Nepali Legal & Tax Verification' :
                    hostStep === 4 ? 'Banking & Direct Payouts' :
                    'Capacity & Security'
                  }
                </div>

                <form onSubmit={hostStep === 5 ? handleHostRegisterSubmit : (e) => { e.preventDefault(); setHostStep((prev) => Math.min(5, prev + 1) as any); }}>
                  {/* Step 1: Host Personal Details */}
                  {hostStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label className="form-label">
                        <span>Host Full Legal Name</span>
                        <input
                          type="text"
                          value={hostData.fullName}
                          onChange={(e) => setHostData({ ...hostData, fullName: e.target.value })}
                          placeholder="Your Full Name"
                          required
                        />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label className="form-label">
                          <span>Personal or Business Gmail</span>
                          <input
                            type="email"
                            value={hostData.email}
                            onChange={(e) => setHostData({ ...hostData, email: e.target.value })}
                            placeholder="yourstay@gmail.com"
                            required
                          />
                        </label>
                        <label className="form-label">
                          <span>Mobile Phone (+977)</span>
                          <input
                            type="tel"
                            value={hostData.phone}
                            onChange={(e) => setHostData({ ...hostData, phone: e.target.value })}
                            placeholder="+977 98XXXXXXXX"
                            required
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="button button-dark"
                        style={{ marginTop: '10px' }}
                        onClick={() => {
                          if (!hostData.fullName.trim() || !hostData.email.trim() || !hostData.phone.trim()) {
                            setError('Please provide your name, Gmail/email, and mobile phone.');
                            return;
                          }
                          setError(null);
                          setHostStep(2);
                        }}
                      >
                        Continue to Property Details <ArrowRight size={16} />
                      </button>
                    </div>
                  )}

                  {/* Step 2: Property Identity */}
                  {hostStep === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label className="form-label">
                        <span>Property / Homestay Name</span>
                        <input
                          type="text"
                          value={hostData.propertyName}
                          onChange={(e) => setHostData({ ...hostData, propertyName: e.target.value })}
                          placeholder="e.g. Annapurna Panorama Homestay"
                          required
                        />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label className="form-label">
                          <span>Property Category</span>
                          <select
                            value={hostData.propertyType}
                            onChange={(e) => setHostData({ ...hostData, propertyType: e.target.value })}
                          >
                            <option value="Homestay">Community Homestay</option>
                            <option value="Boutique Hotel">Boutique Hotel</option>
                            <option value="Eco Lodge">Eco Lodge</option>
                            <option value="Resort">Resort & Retreat</option>
                            <option value="Traditional House">Heritage House</option>
                          </select>
                        </label>
                        <label className="form-label">
                          <span>City / Municipality</span>
                          <input
                            type="text"
                            value={hostData.city}
                            onChange={(e) => setHostData({ ...hostData, city: e.target.value })}
                            placeholder="e.g. Pokhara"
                            required
                          />
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label className="form-label">
                          <span>District</span>
                          <input
                            type="text"
                            value={hostData.district}
                            onChange={(e) => setHostData({ ...hostData, district: e.target.value })}
                            placeholder="e.g. Kaski"
                            required
                          />
                        </label>
                        <label className="form-label">
                          <span>Ward & Street</span>
                          <input
                            type="text"
                            value={hostData.streetAddress}
                            onChange={(e) => setHostData({ ...hostData, streetAddress: e.target.value })}
                            placeholder="e.g. Ward 6, Lakeside"
                            required
                          />
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="button" className="button button-outline" onClick={() => setHostStep(1)}>
                          Back
                        </button>
                        <button
                          type="button"
                          className="button button-dark"
                          style={{ flex: 1 }}
                          onClick={() => {
                            if (!hostData.propertyName.trim() || !hostData.city.trim()) {
                              setError('Please provide your property name and city.');
                              return;
                            }
                            setError(null);
                            setHostStep(3);
                          }}
                        >
                          Continue to Legal Compliance <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: KYC is deferred until secure document handling is available. */}
                  {hostStep === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#17372f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCheck size={16} /> Identity & Tax Verification
                      </div>
                      <div className="demo-callout">
                        <ShieldCheck size={17}/>
                        <span>We will request citizenship, PAN and supporting documents through a secure verification workflow after your account is created. Do not enter or upload identity numbers on this registration screen.</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="button" className="button button-outline" onClick={() => setHostStep(2)}>Back</button>
                        <button type="button" className="button button-dark" style={{ flex: 1 }} onClick={() => setHostStep(4)}>Continue to Payout Setup <ArrowRight size={16}/></button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Payout information is collected only after secure onboarding is available. */}
                  {hostStep === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#17372f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Landmark size={16}/> Payout Settlement
                      </div>
                      <div className="demo-callout">
                        <ShieldCheck size={17}/>
                        <span>Bank account and payout details are not collected during signup. You can add them later when the secure host payout workflow is enabled.</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="button" className="button button-outline" onClick={() => setHostStep(3)}>Back</button>
                        <button type="button" className="button button-dark" style={{ flex: 1 }} onClick={() => setHostStep(5)}>Continue to Final Step <ArrowRight size={16}/></button>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Account security */}
                  {hostStep === 5 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#17372f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={16} /> Secure Your Host Account
                      </div>
                      <p className="muted" style={{ fontSize: '11px', lineHeight: 1.6 }}>Your host account will be created after email verification. You will add room inventory, nightly rates, photos, legal documents and payout information from the Host Dashboard.</p>

