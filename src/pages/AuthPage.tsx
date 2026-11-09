import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { HostRegisterInput, UserRole } from '../types/auth';
import {
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Clock,
  Key,
} from 'lucide-react';
import Badge from '../components/Badge';

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
  const [guestUsername, setGuestUsername] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  // Host Registration Multi-Step Wizard States
  const [hostData, setHostData] = useState<HostRegisterInput>({
    username: '',
    fullName: '',
    email: '',
    phone: '',
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

  // Standard Login Submit
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please provide your username and password.');
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

  // Guest registration uses the standard email and password flow.
  const handleGuestSignupStart = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!guestUsername.trim() || !guestPassword) {
      setError('Please enter a username and password.');
      return;
    }


    setIsLoading(true);
    const result = await register({
      username: guestUsername.trim().toLowerCase(),
      fullName: guestName.trim() || guestUsername.trim(),
      email: guestEmail.trim() || undefined,
      phone: guestPhone.trim() || undefined,
      password: guestPassword,
      role: 'guest',
    });
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg('Account registered successfully! Redirecting...');
      setTimeout(() => handleRedirect('guest'), 700);
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  // Host registration also uses the standard email and password flow.
  const handleHostRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!hostData.username.trim() || !hostData.password) {
      setError('Please choose a username and password.');
      return;
    }

    setIsLoading(true);
    const result = await registerHost(hostData);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg('Host partner application submitted! Welcome to your host dashboard.');
      setTimeout(() => handleRedirect('owner'), 700);
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  // Forgot Password Handlers
  const handleForgotPasswordRequest = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccessMsg(null);

    if (!forgotIdentifier.trim()) {
      setForgotError('Enter your username or the email address linked to your account.');
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
      setError('Administrator email/phone and password are required.');
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

            {!isSignup ? (
              /* GUEST SIGN IN FORM */
              <form onSubmit={handleLoginSubmit}>
                <label className="form-label">
                  <span>Username</span>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your username"
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
                  <span>Full Name (optional)</span>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Aayush Shrestha"
                  />
                </label>

                <label className="form-label">
                  <span>Username</span>
                  <input type="text" value={guestUsername} onChange={(e) => setGuestUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))} placeholder="Choose a username" minLength={3} maxLength={24} required />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label className="form-label">
                    <span>Email (optional)</span>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="name@gmail.com"
                    />
                  </label>
                  <label className="form-label">
                    <span>Mobile Phone (optional)</span>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+977 98XXXXXXXX"
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
                      placeholder="At least 8 characters"
                      minLength={8}
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
                  Create Account <ArrowRight size={16} />
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
            <div className="eyebrow" style={{ color: '#17372f' }}>HOST & PARTNER NETWORK</div>
            <h1 style={{ fontSize: '26px' }}>{isSignup ? 'Create your host account' : 'Host Portal Sign In'}</h1>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
              {isSignup
                ? 'Create an account with a username and password. You can add your property details later from the Host Dashboard.'
                : 'Sign in with your host username and password to manage your property and reservations.'}
            </p>
            {!isSignup ? (
              <form onSubmit={handleLoginSubmit}>
                <label className="form-label">
                  <span>Host Username</span>
                  <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value.toLowerCase())} placeholder="Enter your host username" autoComplete="username" required />
                </label>
                <label className="form-label">
                  <span>Host Password</span>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
                </label>
                <button type="submit" className="button button-dark button-full" disabled={isLoading} style={{ padding: '13px', marginTop: '10px' }}>
                  {isLoading ? 'Signing in...' : 'Sign In to Host Dashboard'}
                </button>
                <div className="auth-switch" style={{ marginTop: '18px' }}>
                  Want to host your property on NepalStay?{' '}
                  <a href="#register-host" onClick={(e) => { e.preventDefault(); setIsSignup(true); setError(null); }} style={{ fontWeight: 700, color: '#17372f' }}>
                    Create a host account
                  </a>
                </div>
              </form>
            ) : (
              <form onSubmit={handleHostRegisterSubmit}>
                <label className="form-label">
                  <span>Username</span>
                  <input type="text" value={hostData.username} onChange={(e) => setHostData({ ...hostData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) })} placeholder="Choose a host username" minLength={3} maxLength={24} autoComplete="username" required />
                </label>
                <label className="form-label">
                  <span>Password</span>
                  <input type={showPassword ? 'text' : 'password'} value={hostData.password} onChange={(e) => setHostData({ ...hostData, password: e.target.value })} placeholder="At least 8 characters" minLength={8} autoComplete="new-password" required />
                </label>
                <button type="submit" className="button button-dark button-full" disabled={isLoading} style={{ padding: '13px', marginTop: '10px' }}>
                  {isLoading ? 'Creating account...' : 'Create Host Account'} <ArrowRight size={16} />
                </button>
                <div className="auth-switch" style={{ marginTop: '18px' }}>
                  Already registered as a host?{' '}
                  <a href="#login" onClick={(e) => { e.preventDefault(); setIsSignup(false); setError(null); }} style={{ fontWeight: 700, color: '#17372f' }}>
                    Host Sign In
                  </a>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. PLATFORM ADMINISTRATOR (SECURE TWO-FACTOR AUTHENTICATION)  */}
        {/* ============================================================== */}
        {activeRole === 'admin' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div className="eyebrow" style={{ color: '#17372f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} color="#b45309" /> RESTRICTED PLATFORM GATEWAY
              </div>
              <Badge tone="blue">Enterprise 2FA</Badge>
            </div>

            <h1 style={{ fontSize: '25px', color: '#17372f' }}>
              {adminStep === 'credentials' ? 'Staff Authentication' : 'Two-Factor Verification'}
            </h1>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
              {adminStep === 'credentials'
                ? 'Sign in with a provisioned administrator email/phone, password and authenticator code.'
                : 'Enter your 6-digit TOTP token generated by your Authenticator app.'}
            </p>


            {adminStep === 'credentials' ? (
              /* ADMIN STEP 1: STAFF ID / GMAIL & MASTER PASSWORD */
              <form onSubmit={handleAdminStep1}>
                <label className="form-label">
                  <span>Administrator email or phone</span>
                  <input
                    type="text"
                    value={adminStaffId}
                    onChange={(e) => setAdminStaffId(e.target.value)}
                    placeholder="admin@example.com or +977 phone"
                    required
                  />
                </label>

                <label className="form-label" style={{ position: 'relative' }}>
                  <span>Master Password</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter administrator password"
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
                  Proceed to Two-Factor Security Gate <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              /* ADMIN STEP 2: 2FA TOTP TOKEN VERIFICATION */
              <form onSubmit={handleAdminStep2}>
                <div style={{ textAlign: 'center', padding: '16px', background: '#f8faf9', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e9f2ee', color: '#17372f', display: 'grid', placeItems: 'center', margin: '0 auto 10px' }}>
                    <Key size={22} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#17372f' }}>
                    Authenticator App Token
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Clock size={13} color="#2b6e4f" />
                    <span>Code refreshes in <strong>{totpCountdown}s</strong></span>
                  </div>

                  <div className="totp-input-wrap">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <input
                        key={idx}
                        className="totp-digit-box"
                        type="text"
                        maxLength={1}
                        value={totpCode[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val) {
                            const chars = totpCode.padEnd(6, ' ').split('');
                            chars[idx] = val;
                            setTotpCode(chars.join('').trim());
                          }
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ marginTop: '14px' }}>
                    <input
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Or enter 6 digits: e.g. 123456"
                      maxLength={6}
                      style={{ textAlign: 'center', letterSpacing: '4px', fontWeight: 700, fontSize: '16px', maxWidth: '240px', margin: '0 auto' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setAdminStep('credentials')}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="button button-dark"
                    style={{ flex: 1, padding: '12px' }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Verifying...' : 'Authorize Admin Session'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>


      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16, 35, 29, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              border: '1px solid #eaede7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#e9f2ee',
                  color: '#17372f',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Key size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#17372f' }}>
                  {forgotStep === 'request' ? 'Reset Your Password' : 'Create New Password'}
                </h3>
                <div style={{ fontSize: '11px', color: '#65748a' }}>
                  {forgotStep === 'request' ? 'Step 1 of 2: Identity Verification' : 'Step 2 of 2: Set New Password'}
                </div>
              </div>
            </div>

            <p className="muted" style={{ fontSize: '12px', margin: '0 0 16px' }}>
              {forgotStep === 'request'
                ? 'Enter your registered email address or Nepal mobile number. We will send you a 6-digit verification code.'
                : `Enter the 6-digit code sent to ${forgotIdentifier} and set your new password.`}
            </p>

            {forgotError && (
              <div
                style={{
                  padding: '10px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <AlertCircle size={15} />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccessMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  color: '#166534',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <CheckCircle2 size={15} />
                <span>{forgotSuccessMsg}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              /* STEP 1: Enter Identifier */
              <form onSubmit={handleForgotPasswordRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className="form-label">
                  <span>Registered Email or Mobile (+977)</span>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="yourname@gmail.com or +977 98XXXXXXXX"
                    required
                    autoFocus
                  />
                </label>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="button button-outline"
                    style={{ flex: 1 }}
                    onClick={() => setShowForgotPasswordModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-dark"
                    style={{ flex: 1.4 }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending Code...' : 'Send Reset Code'}
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: Enter Code and New Password */
              <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                <label className="form-label">
                  <span>6-Digit Verification Code</span>
                  <input
                    type="text"
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 700 }}
                    required
                    autoFocus
                  />
                </label>

                <label className="form-label">
                  <span>New Password</span>
                  <input
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="At least 10 characters"
                    minLength={10}
                    required
                  />
                </label>

                <label className="form-label">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    minLength={10}
                    required
                  />
                </label>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => {
                      setForgotStep('request');
                      setForgotError(null);
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="button button-dark"
                    style={{ flex: 1 }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating Password...' : 'Save New Password & Sign In'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
