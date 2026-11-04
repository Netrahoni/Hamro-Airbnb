import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';
import { ShieldAlert, ArrowLeft, RefreshCw, UserCheck } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { currentUser, isAuthenticated, switchRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    const redirectUrl = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectUrl} replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    const targetRole = allowedRoles[0];
    const roleLabels: Record<UserRole, string> = {
      guest: 'Guest Traveler',
      owner: 'Property Host / Owner',
      admin: 'Platform Administrator',
    };

    return (
      <div className="container utility-page" style={{ maxWidth: '640px', margin: '60px auto' }}>
        <div className="panel" style={{ padding: '36px', textAlign: 'center', background: '#fff', borderRadius: '14px', border: '1px solid #e3e7df', boxShadow: '0 12px 35px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
            <ShieldAlert size={28} />
          </div>
          <div className="eyebrow" style={{ color: '#b45309', fontWeight: 700, fontSize: '11px', letterSpacing: '1.2px' }}>
            ACCESS RESTRICTED
          </div>
          <h2 style={{ fontSize: '24px', margin: '8px 0 12px', color: '#17372f' }}>
            {roleLabels[targetRole]} Portal Access Required
          </h2>
          <p className="muted" style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            You are currently signed in as <strong>{currentUser.fullName}</strong> with a{' '}
            <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#17372f' }}>{currentUser.role}</span> account. This section requires{' '}
            <strong>{allowedRoles.map((r) => roleLabels[r]).join(' or ')}</strong> privileges.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px', margin: '0 auto' }}>
            <button
              className="button button-dark"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
              onClick={() => switchRole(targetRole)}
            >
              <RefreshCw size={16} /> Switch to {roleLabels[targetRole]} Workspace
            </button>
            {currentUser.role === 'owner' && (
              <Link to="/owner/dashboard" className="button button-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
                <UserCheck size={16} /> Go to Owner Workspace
              </Link>
            )}
            {currentUser.role === 'admin' && (
              <Link to="/admin/dashboard" className="button button-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
                <UserCheck size={16} /> Go to Admin Control
              </Link>
            )}
            {currentUser.role === 'guest' && (
              <Link to="/trips" className="button button-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
                <UserCheck size={16} /> Go to My Trips
              </Link>
            )}
            <Link to="/" className="plain-action" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <ArrowLeft size={14} /> Back to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
