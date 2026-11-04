import { useState, useRef, useEffect } from 'react';
import {
  Heart,
  Menu,
  UserRound,
  LogOut,
  CalendarDays,
  Settings,
  ChevronDown,
  Building2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { currentUser, isAuthenticated, logout } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="container header-inner">
          <Brand />
          <nav className={`main-nav ${mobileOpen ? 'nav-open' : ''}`}>
            <NavLink to="/s/pokhara" onClick={() => setMobileOpen(false)}>Explore stays</NavLink>
            <a href="/#how-it-works" onClick={() => setMobileOpen(false)}>For hosts</a>
            <Link to="/owner/register/account" onClick={() => setMobileOpen(false)}>List your property</Link>
            {isAuthenticated && (
              <button
                type="button"
                className="mobile-signout-btn"
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '8px 0',
                }}
              >
                Sign out ({currentUser?.fullName?.split(' ')[0]})
              </button>
            )}
          </nav>
          <div className="header-actions">
            {currentUser?.role === 'owner' ? (
              <Link className="host-link" to="/owner/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={15} /> Host portal
              </Link>
            ) : currentUser?.role === 'admin' ? (
              <Link className="host-link" to="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={15} /> Admin control
              </Link>
            ) : (
              <Link className="host-link" to="/owner/register/account">List your property</Link>
            )}

            <Link className="icon-link" to="/wishlists" aria-label="Wishlists">
              <Heart size={18} />
            </Link>

            {isAuthenticated && currentUser ? (
              <div className="account-menu-wrap" ref={dropdownRef}>
                <button
                  type="button"
                  className="account-pill-button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                >
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.fullName} className="account-avatar-sm" style={{ objectFit: 'cover' }} />
                  ) : (
                    <span className="account-avatar-sm">{getInitials(currentUser.fullName)}</span>
                  )}
                  <span>{currentUser.fullName.split(' ')[0]}</span>
                  <Badge tone={currentUser.role === 'admin' ? 'blue' : currentUser.role === 'owner' ? 'green' : 'neutral'}>
                    {currentUser.role}
                  </Badge>
                  <ChevronDown size={14} style={{ color: '#8995a5' }} />
                </button>

                {dropdownOpen && (
                  <div className="account-dropdown">
                    <div className="account-dropdown-header">
                      <div className="account-dropdown-user">{currentUser.fullName}</div>
                      <div className="account-dropdown-meta">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                          {currentUser.email || currentUser.phone}
                        </span>
                        <Badge tone={currentUser.role === 'admin' ? 'blue' : currentUser.role === 'owner' ? 'green' : 'neutral'}>
                          {currentUser.role}
                        </Badge>
                      </div>
                    </div>

                    <div className="account-dropdown-section">
                      {currentUser.role === 'guest' && (
                        <>
                          <Link to="/trips" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <CalendarDays size={15} />
                            <span>My trips</span>
                          </Link>
                          <Link to="/wishlists" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <Heart size={15} />
                            <span>Saved stays</span>
                          </Link>
                          <Link to="/account" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <UserRound size={15} />
                            <span>Profile & account</span>
                          </Link>
                          <Link to="/settings" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <Settings size={15} />
                            <span>Settings</span>
                          </Link>
                        </>
                      )}

                      {currentUser.role === 'owner' && (
                        <>
                          <Link to="/owner/dashboard" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <Building2 size={15} />
                            <span>Host dashboard</span>
                          </Link>
                          <Link to="/owner/reservations" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <CalendarDays size={15} />
                            <span>Reservations</span>
                          </Link>
                          <Link to="/owner/listings" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <Building2 size={15} />
                            <span>My listings</span>
                          </Link>
                          <Link to="/account" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <UserRound size={15} />
                            <span>Account profile</span>
                          </Link>
                        </>
                      )}

                      {currentUser.role === 'admin' && (
                        <>
                          <Link to="/admin/dashboard" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <ShieldCheck size={15} />
                            <span>Admin overview</span>
                          </Link>
                          <Link to="/admin/users" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <UserRound size={15} />
                            <span>User management</span>
                          </Link>
                          <Link to="/admin/owners/kyc" className="account-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <ShieldCheck size={15} />
                            <span>Owner KYC queue</span>
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="account-dropdown-divider" />

                    <div className="account-dropdown-title">PORTAL NAVIGATION</div>
                    <Link
                      to="/trips"
                      className="account-dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <RefreshCw size={14} />
                      <span>Traveler Portal</span>
                    </Link>
                    {(currentUser.role === 'owner' || currentUser.role === 'admin') && (
                      <Link
                        to="/owner/dashboard"
                        className="account-dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Building2 size={14} />
                        <span>Host Management Portal</span>
                      </Link>
                    )}
                    {currentUser.role === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        className="account-dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <ShieldCheck size={14} />
                        <span>Platform Admin Control</span>
                      </Link>
                    )}

                    <div className="account-dropdown-divider" />

                    <button type="button" className="account-dropdown-item danger" onClick={handleLogout}>
                      <LogOut size={15} />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link className="account-pill" to="/login">
                <UserRound size={16} /> <span>Log in</span>
              </Link>
            )}
          </div>
          <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            <Menu size={22} />
          </button>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="public-footer">
        <div className="container footer-grid">
          <div><Brand /><p>Thoughtful stays. Local stories.<br />A better way to experience Nepal.</p></div>
          <div><strong>Explore</strong><Link to="/s/kathmandu">Kathmandu</Link><Link to="/s/pokhara">Pokhara</Link><Link to="/wishlists">Saved stays</Link></div>
          <div><strong>For hosts</strong><Link to="/owner/register/account">List your property</Link><Link to="/owner/dashboard">Owner portal</Link><Link to="/owner/finances">Host resources</Link></div>
          <div><strong>Platform</strong><Link to="/login">Sign in</Link><Link to="/admin/dashboard">Platform administration</Link><span>Help & support</span></div>
        </div>
        <div className="container footer-bottom"><span>© 2026 NepalStay AI. All rights reserved.</span><span>Made with care for Nepal.</span></div>
      </footer>
    </div>
  );
}
