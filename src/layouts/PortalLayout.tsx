import { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Banknote,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Globe2,
  LayoutDashboard,
  MessageSquareWarning,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  Building2,
  ChevronDown,
  LogOut,
  RefreshCw,
  Home,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import Brand from '../components/Brand';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';

type Role = 'owner' | 'admin';
type NavItem = { label: string; path: string; icon: LucideIcon };

const ownerItems: NavItem[] = [
  { label: 'Overview', path: '/owner/dashboard', icon: LayoutDashboard },
  { label: 'Reservations', path: '/owner/reservations', icon: ClipboardCheck },
  { label: 'Calendar & rates', path: '/owner/calendar', icon: CalendarDays },
  { label: 'My listings', path: '/owner/listings', icon: Building2 },
  { label: 'Finances', path: '/owner/finances', icon: Wallet },
];

const adminItems: NavItem[] = [
  { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Owner verification', path: '/admin/owners/kyc', icon: ShieldCheck },
  { label: 'Property moderation', path: '/admin/listings', icon: Building2 },
  { label: 'Booking risk desk', path: '/admin/bookings/cod', icon: MessageSquareWarning },
  { label: 'Commission ledger', path: '/admin/commissions', icon: Banknote },
  { label: 'User management', path: '/admin/users', icon: Users },
  { label: 'City rollout', path: '/admin/locations', icon: Globe2 },
];

export default function PortalLayout({ role }: { role: Role }) {
  const isOwner = role === 'owner';
  const items = isOwner ? ownerItems : adminItems;
  const location = useLocation();
  const navigate = useNavigate();
  const current = items.find((item) => location.pathname === item.path) ?? items[0];

  const { currentUser, logout, switchRole } = useAuth();
  const [topbarMenuOpen, setTopbarMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setTopbarMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return isOwner ? 'HS' : 'AD';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  };

  const workspaceTitle = isOwner
    ? currentUser?.propertyName || 'Host Workspace'
    : 'NepalStay Platform';

  const workspaceSubtitle = isOwner
    ? `${currentUser?.fullName || 'Property Host'} · Host`
    : `${currentUser?.fullName || 'Platform Admin'} · Admin`;

  const workspaceAvatar = isOwner
    ? currentUser?.propertyName ? currentUser.propertyName.slice(0, 2).toUpperCase() : 'HS'
    : 'AD';

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="sidebar-brand"><Brand compact /></div>
        <div className="portal-label">{isOwner ? 'HOST WORKSPACE' : 'PLATFORM CONTROL'}</div>

        <div className="workspace-card" style={{ position: 'relative' }}>
          <span className="workspace-avatar">{workspaceAvatar}</span>
          <span>
            <strong>{workspaceTitle}</strong>
            <small>{workspaceSubtitle}</small>
          </span>
          <ChevronDown size={15} />
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">WORKSPACE</div>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.path.includes('risk') && <i className="nav-dot" />}
              </NavLink>
            );
          })}
          {isOwner && (
            <>
              <div className="sidebar-section-title sidebar-spaced">PROPERTY SETUP</div>
              <NavLink to="/owner/register/account" className="sidebar-link">
                <Settings size={17} />
                <span>Registration & KYC</span>
              </NavLink>
            </>
          )}
          {!isOwner && (
            <>
              <div className="sidebar-section-title sidebar-spaced">INTELLIGENCE</div>
              <div className="sidebar-link sidebar-static">
                <Activity size={17} />
                <span>ML model monitoring</span>
                <span className="coming-pill">Soon</span>
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><FileText size={17} /></div>
            <strong>{isOwner ? 'Host Help Desk' : 'Operations Desk'}</strong>
            <span>NepalStay 24/7 Operations</span>
            <button type="button" onClick={() => switchRole(isOwner ? 'admin' : 'owner')}>
              Switch to {isOwner ? 'Admin' : 'Host'} <span>↗</span>
            </button>
          </div>
          <NavLink to="/" className="back-to-site" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Home size={14} /> Back to website
          </NavLink>
          <button
            type="button"
            className="plain-action"
            onClick={handleLogout}
            style={{
              color: '#d48a80',
              fontSize: '11px',
              padding: '6px 11px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              marginTop: '4px',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
            }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <div className="breadcrumb">
            {isOwner ? 'Owner portal' : 'Admin portal'} <span>/</span> <strong>{current.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment-pill" style={{ color: '#2b6e4f', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
              <i style={{ background: '#2b6e4f' }} /> Operational Node
            </span>

            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                type="button"
                className="topbar-avatar"
                style={{ cursor: 'pointer' }}
                onClick={() => setTopbarMenuOpen(!topbarMenuOpen)}
                aria-label="User menu"
              >
                {getInitials(currentUser?.fullName)}
              </button>

              {topbarMenuOpen && (
                <div
                  className="account-dropdown"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '240px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                  }}
                >
                  <div className="account-dropdown-header">
                    <div className="account-dropdown-user">{currentUser?.fullName || 'User'}</div>
                    <div className="account-dropdown-meta">
                      <span style={{ fontSize: '11px', color: '#65748a' }}>{currentUser?.email}</span>
                      <Badge tone={currentUser?.role === 'admin' ? 'blue' : 'green'}>
                        {currentUser?.role || role}
                      </Badge>
                    </div>
                  </div>

                  <div className="account-dropdown-section">
                    <Link to="/" className="account-dropdown-item" onClick={() => setTopbarMenuOpen(false)}>
                      <Home size={15} />
                      <span>Back to website</span>
                    </Link>
                    {isOwner ? (
                      <button
                        type="button"
                        className="account-dropdown-item"
                        onClick={() => {
                          switchRole('admin');
                          setTopbarMenuOpen(false);
                          navigate('/admin/dashboard');
                        }}
                      >
                        <RefreshCw size={15} />
                        <span>Switch to Admin control</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="account-dropdown-item"
                        onClick={() => {
                          switchRole('owner');
                          setTopbarMenuOpen(false);
                          navigate('/owner/dashboard');
                        }}
                      >
                        <RefreshCw size={15} />
                        <span>Switch to Host portal</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="account-dropdown-item"
                      onClick={() => {
                        switchRole('guest');
                        setTopbarMenuOpen(false);
                        navigate('/trips');
                      }}
                    >
                      <RefreshCw size={15} />
                      <span>Switch to Guest view</span>
                    </button>
                  </div>

                  <div className="account-dropdown-divider" />

                  <button type="button" className="account-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="portal-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
