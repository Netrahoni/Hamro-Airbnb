import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import PortalLayout from './layouts/PortalLayout';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import PropertyPage from './pages/PropertyPage';
import BookingPage from './pages/BookingPage';
import { AdminPage, OwnerPage } from './pages/PortalPages';
import AuthPage from './pages/AuthPage';
import {
  GuestAccountPage,
  GuestBookingDetailPage,
  GuestSettingsPage,
  GuestTripsPage,
  GuestWishlistsPage,
} from './pages/GuestPages';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function NotFound() {
  return (
    <div className="container not-found">
      <div className="eyebrow">404 · PAGE NOT FOUND</div>
      <h1>Looks like this trail ends here.</h1>
      <p className="muted">The page may have moved or is not part of this prototype yet.</p>
      <a className="button button-dark" href="/">Return home</a>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          {/* Public Visitor Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/s/:city" element={<ExplorePage />} />
          <Route path="/rooms/:listingId" element={<PropertyPage />} />
          <Route path="/book/:listingId" element={<BookingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage initialSignup />} />

          {/* Protected Guest / Authenticated User Routes */}
          <Route element={<ProtectedRoute allowedRoles={['guest', 'owner', 'admin']} />}>
            <Route path="/trips" element={<GuestTripsPage />} />
            <Route path="/trips/:bookingId" element={<GuestBookingDetailPage />} />
            <Route path="/account" element={<GuestAccountPage />} />
            <Route path="/wishlists" element={<GuestWishlistsPage />} />
            <Route path="/settings" element={<GuestSettingsPage />} />
          </Route>
        </Route>

        {/* Protected Owner / Host Workspace */}
        <Route element={<ProtectedRoute allowedRoles={['owner', 'admin']} />}>
          <Route path="/owner" element={<PortalLayout role="owner" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OwnerPage />} />
            <Route path="reservations" element={<OwnerPage />} />
            <Route path="calendar" element={<OwnerPage />} />
            <Route path="listings" element={<OwnerPage />} />
            <Route path="finances" element={<OwnerPage />} />
            <Route path="register/account" element={<OwnerPage />} />
            <Route path="register/location" element={<OwnerPage />} />
            <Route path="register/kyc" element={<OwnerPage />} />
            <Route path="register/inventory" element={<OwnerPage />} />
            <Route path="register/policies" element={<OwnerPage />} />
          </Route>
        </Route>

        {/* Protected Admin Platform Control */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<PortalLayout role="admin" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminPage />} />
            <Route path="owners/kyc" element={<AdminPage />} />
            <Route path="listings" element={<AdminPage />} />
            <Route path="bookings/cod" element={<AdminPage />} />
            <Route path="commissions" element={<AdminPage />} />
            <Route path="users" element={<AdminPage />} />
            <Route path="locations" element={<AdminPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
