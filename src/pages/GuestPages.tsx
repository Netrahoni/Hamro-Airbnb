import { useMemo, useState, useEffect } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  Settings,
  ShieldCheck,
  UserRound,
  XCircle,
  LogOut,
  Building2,
} from 'lucide-react';
import { listings } from '../data/listings';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { MarketplaceBooking } from '../services/api';
import Badge from '../components/Badge';

type Booking = {
  id: string;
  reference: string;
  property: string;
  city: string;
  image: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  room: string;
};

const money = (n: number) => `रु ${n.toLocaleString('en-IN')}`;
const date = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function mapBooking(record: MarketplaceBooking): Booking {
  const status = record.bookingStatus === 'confirmed' ? 'Confirmed' : record.bookingStatus === 'completed' ? 'Completed' : 'Cancelled';
  return {
    id: record.id,
    reference: record.bookingReference,
    property: record.propertyTitle,
    city: record.propertyCity,
    image: record.propertyImage,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    guests: record.guests,
    total: record.totalAmount,
    status,
    room: 'Pay at property',
  };
}

function getInitials(name?: string) {
  if (!name) return 'NM';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function GuestShell({ children, active }: { children: ReactNode; active: string }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const nav = [
    ['/trips', 'My trips', CalendarDays],
    ['/wishlists', 'Saved stays', Heart],
    ['/account', 'Profile', UserRound],
    ['/settings', 'Settings', Settings],
  ] as const;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="guest-area container">
      <aside className="guest-sidebar">
        <div className="guest-welcome">
          <div className="guest-avatar">{getInitials(currentUser?.fullName)}</div>
          <div>
            <strong>Namaste, {currentUser?.fullName?.split(' ')[0] || 'Guest'}</strong>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Badge tone={currentUser?.role === 'admin' ? 'blue' : currentUser?.role === 'owner' ? 'green' : 'neutral'}>
                {currentUser?.role || 'Guest'}
              </Badge>
              <small>Verified Account</small>
            </span>
          </div>
        </div>

        <nav>
          {nav.map(([to, label, Icon]) => (
            <Link key={to} to={to} className={active === to ? 'active' : ''}>
              <Icon size={17} />
              {label}
              <ChevronRight size={15} />
            </Link>
          ))}
          {currentUser?.role === 'owner' && (
            <Link to="/owner/dashboard" style={{ color: '#17372f', fontWeight: 600 }}>
              <Building2 size={17} />
              Owner Portal
              <ChevronRight size={15} />
            </Link>
          )}
        </nav>

        <div className="guest-side-note">
          <ShieldCheck size={17} />
          <span>Authenticated session · Verified in NepalStay</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="plain-action"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#c53030',
            fontSize: '11px',
            fontWeight: 600,
            padding: '12px 14px',
            marginTop: '8px',
          }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </aside>
      <main className="guest-main">{children}</main>
    </div>
  );
}

function Heading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="guest-heading">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel?: (id: string) => void }) {
  return (
    <article className="guest-booking-card">
      <img src={booking.image} alt={booking.property} />
      <div className="guest-booking-info">
        <div className="guest-booking-top">
          <span className={`guest-status ${booking.status.toLowerCase()}`}>{booking.status}</span>
          <span className="guest-booking-id">{booking.reference}</span>
        </div>
        <h3>{booking.property}</h3>
        <p className="guest-location">
          <MapPin size={14} />
          {booking.city}
        </p>
        <div className="guest-booking-dates">
          <div>
            <small>CHECK-IN</small>
            <strong>{date(booking.checkIn)}</strong>
          </div>
          <div>
            <small>CHECK-OUT</small>
            <strong>{date(booking.checkOut)}</strong>
          </div>
          <div>
            <small>GUESTS</small>
            <strong>
              {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
            </strong>
          </div>
        </div>
        <div className="guest-booking-bottom">
          <strong>
            {money(booking.total)} <small>total</small>
          </strong>
          <div>
            <Link className="button button-outline" to={`/trips/${booking.id}`}>
              View details <ChevronRight size={14} />
            </Link>
            {booking.status === 'Confirmed' && onCancel && (
              <button className="guest-cancel-link" onClick={() => onCancel(booking.id)}>
                Cancel booking
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function GuestTripsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'Upcoming' | 'Past' | 'Cancelled'>('Upcoming');

  const loadBookings = async () => {
    setLoading(true);
    const result = await api.getBookings();
    if (result.success && result.data) {
      setBookings(result.data.bookings.map(mapBooking));
      setError('');
    } else {
      setError(result.error || 'Unable to load your reservations.');
    }
    setLoading(false);
  };

  useEffect(() => { void loadBookings(); }, []);

  const filtered = useMemo(
    () => bookings.filter((booking) =>
      tab === 'Upcoming' ? booking.status === 'Confirmed' : tab === 'Past' ? booking.status === 'Completed' : booking.status === 'Cancelled'
    ),
    [bookings, tab]
  );

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this reservation? The host will be notified.')) return;
    const result = await api.cancelBooking(id);
    if (result.success && result.data) {
      const updated = mapBooking(result.data.booking);
      setBookings((current) => current.map((booking) => booking.id === id ? updated : booking));
      setError('');
    } else {
      setError(result.error || 'Unable to cancel this reservation.');
    }
  };

  return (
    <GuestShell active="/trips">
      <Heading eyebrow="YOUR NEPALSTAY" title="Your trips" copy="Every journey, from the next check-in to the memories you brought home." />
      <div className="guest-tabs">
        {(['Upcoming', 'Past', 'Cancelled'] as const).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}<span>{bookings.filter((booking) => t === 'Upcoming' ? booking.status === 'Confirmed' : t === 'Past' ? booking.status === 'Completed' : booking.status === 'Cancelled').length}</span>
          </button>
        ))}
      </div>
      {error && <div className="host-alert host-alert-error" role="alert">{error}</div>}
      {loading ? <div className="guest-empty"><p>Loading your reservations…</p></div> : filtered.length ? (
        <div className="guest-booking-list">
          {filtered.map((booking) => <BookingCard key={booking.id} booking={booking} onCancel={cancel} />)}
        </div>
      ) : (
        <div className="guest-empty">
          <CalendarDays size={26} /><h3>No {tab.toLowerCase()} trips yet</h3>
          <p>Your confirmed reservations will appear here.</p>
          <Link to="/s/pokhara" className="button button-dark">Explore stays</Link>
        </div>
      )}
    </GuestShell>
  );
}

export function GuestBookingDetailPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!bookingId) { setLoading(false); return; }
    api.getBooking(bookingId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) setBooking(mapBooking(result.data.booking));
      else setError(result.error || 'Booking not found.');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [bookingId]);

  const cancel = async () => {
    if (!booking || !window.confirm('Cancel this reservation? The host will be notified.')) return;
    setCancelling(true);
    const result = await api.cancelBooking(booking.id);
    setCancelling(false);
    if (result.success && result.data) {
      setBooking(mapBooking(result.data.booking));
      setError('');
    } else {
      setError(result.error || 'Unable to cancel this reservation.');
    }
  };

  if (loading) return <GuestShell active="/trips"><div className="guest-empty"><p>Loading reservation…</p></div></GuestShell>;
  if (!booking) {
    return <GuestShell active="/trips"><div className="guest-empty"><h3>Booking not found</h3><p>{error}</p><Link to="/trips">Back to my trips</Link></div></GuestShell>;
  }

  const cancelled = booking.status === 'Cancelled';
  return (
    <GuestShell active="/trips">
      <Link to="/trips" className="guest-back">← Back to my trips</Link>
      <Heading eyebrow="BOOKING DETAILS" title="Your stay, at a glance." copy={`Reservation ${booking.reference}`} />
      {error && <div className="host-alert host-alert-error" role="alert">{error}</div>}
      <div className="guest-detail-card">
        <img className="guest-detail-image" src={booking.image} alt={booking.property} />
        <div className="guest-detail-content">
          <span className={`guest-status ${booking.status.toLowerCase()}`}>{booking.status}</span>
          <h2>{booking.property}</h2>
          <p><MapPin size={15}/>{booking.city}</p>
          <div className="guest-detail-grid">
            <div><small>CHECK-IN</small><strong>{date(booking.checkIn)}</strong><span>After 2:00 PM</span></div>
            <div><small>CHECK-OUT</small><strong>{date(booking.checkOut)}</strong><span>Before 11:00 AM</span></div>
            <div><small>GUESTS</small><strong>{booking.guests}</strong><span>Registered guests</span></div>
            <div><small>PAYMENT</small><strong>At property</strong><span>Pay the host directly</span></div>
          </div>
        </div>
      </div>
      <div className="guest-detail-lower">
        <section className="guest-summary-card">
          <h3>Price summary</h3>
          <div><span>Total (NPR)</span><strong>{money(booking.total)}</strong></div>
          <p>Payment is due directly to the property host at check-in.</p>
        </section>
        <section className="guest-summary-card">
          <h3>Need to make a change?</h3>
          <p>You can cancel before check-in. The host will be notified when the reservation is cancelled.</p>
          <button className="button button-outline" disabled={cancelled || booking.status !== 'Confirmed' || cancelling} onClick={() => void cancel()}>
            <XCircle size={15}/> {cancelling ? 'Cancelling…' : cancelled ? 'Booking cancelled' : 'Cancel booking'}
          </button>
        </section>
      </div>
    </GuestShell>
  );
}

export function GuestAccountPage() {
  const { currentUser, updateProfile } = useAuth();
  const [name, setName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.fullName);
      setPhone(currentUser.phone);
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <GuestShell active="/account">
      <Heading eyebrow="PERSONAL INFORMATION" title="Your profile" copy="Keep your contact details up to date for a smoother stay." />
      <form className="guest-form-card" onSubmit={save}>
        <div className="guest-profile-head">
          <div className="guest-avatar large">{getInitials(name)}</div>
          <div>
            <strong>{name}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <Badge tone={currentUser?.role === 'admin' ? 'blue' : currentUser?.role === 'owner' ? 'green' : 'neutral'}>
                {currentUser?.role || 'Guest'}
              </Badge>
              <span style={{ fontSize: '11px', color: '#65748a' }}>User ID: {currentUser?.id}</span>
            </div>
          </div>
        </div>
        <div className="guest-form-grid">
          <label className="form-label">
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="form-label">
            Mobile number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label className="form-label">
            Email address
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="form-label">
            Country / region
            <select defaultValue="Nepal">
              <option>Nepal</option>
              <option>India</option>
              <option>Other</option>
            </select>
          </label>
        </div>
        <div className="guest-form-actions">
          {saved && (
            <span className="guest-saved">
              <CheckCircle2 size={15} /> Profile saved and synced across portals
            </span>
          )}
          <button type="submit" className="button button-dark">Save changes</button>
        </div>
      </form>
      <div className="guest-security-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Account Security</strong>
          <p>
            Your account is verified with Nepali mobile credentials. Profile changes automatically synchronize across portals and checkout.
          </p>
        </div>
      </div>
    </GuestShell>
  );
}

export function GuestWishlistsPage() {
  const initial = () => {
    try {
      return JSON.parse(localStorage.getItem('ns-wishlist') || '[]') as string[];
    } catch {
      return [];
    }
  };
  const [saved, setSaved] = useState<string[]>(initial);
  const items = listings.filter((x) => saved.includes(x.id));
  const toggle = (id: string) => {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    localStorage.setItem('ns-wishlist', JSON.stringify(next));
  };
  return (
    <GuestShell active="/wishlists">
      <Heading eyebrow="YOUR COLLECTION" title="Saved stays" copy="A shortlist of places you would love to come back to." />
      <div className="guest-empty">
        <Heart size={27} />
        <h3>Your wishlist is ready</h3>
        <p>Save properties from Explore to collect your favourite stays here. Saved items are stored in your active session.</p>
        <Link to="/s/pokhara" className="button button-dark">
          Discover places to stay
        </Link>
      </div>
      {items.length > 0 && (
        <div className="guest-wishlist-grid">
          {items.map((item: any) => (
            <article key={item.id}>
              <img src={item.image} alt={item.name} />
              <div>
                <strong>{item.name}</strong>
                <span>{item.area}</span>
                <button onClick={() => toggle(item.id)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </GuestShell>
  );
}

export function GuestSettingsPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [emailUpdates, setEmailUpdates] = useState(() => localStorage.getItem('ns-email-updates') !== 'false');
  const [smsUpdates, setSmsUpdates] = useState(() => localStorage.getItem('ns-sms-updates') !== 'false');
  const [language, setLanguage] = useState(() => localStorage.getItem('ns-language') || 'English');
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem('ns-email-updates', String(emailUpdates));
    localStorage.setItem('ns-sms-updates', String(smsUpdates));
    localStorage.setItem('ns-language', language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <GuestShell active="/settings">
      <Heading eyebrow="PREFERENCES" title="Account settings" copy="Choose how NepalStay keeps in touch and how you prefer to browse." />
      <section className="guest-form-card">
        <h3>Notifications</h3>
        <label className="guest-toggle">
          <span>
            <strong>Email updates</strong>
            <small>Trip reminders and important booking updates</small>
          </span>
          <input type="checkbox" checked={emailUpdates} onChange={(e) => setEmailUpdates(e.target.checked)} />
        </label>
        <label className="guest-toggle">
          <span>
            <strong>SMS updates</strong>
            <small>Important updates to your registered mobile number</small>
          </span>
          <input type="checkbox" checked={smsUpdates} onChange={(e) => setSmsUpdates(e.target.checked)} />
        </label>
        <div className="guest-settings-divider" />
        <label className="form-label guest-language">
          Language preference
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option>English</option>
            <option>नेपाली</option>
            <option>हिन्दी</option>
          </select>
        </label>
        <div className="guest-form-actions">
          {saved && (
            <span className="guest-saved">
              <CheckCircle2 size={15} /> Preferences saved locally
            </span>
          )}
          <button className="button button-dark" onClick={save}>
            Save preferences
          </button>
        </div>
      </section>

      {/* Active Session & Account Control Card */}
      <section className="guest-form-card" style={{ marginTop: '16px' }}>
        <h3>Account & session security</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', margin: '14px 0' }}>
          <div>
            <small style={{ color: '#8995a5', fontSize: '10px' }}>USER ID</small>
            <div style={{ fontWeight: 700, fontSize: '12px', color: '#17372f' }}>{currentUser?.id}</div>
          </div>
          <div>
            <small style={{ color: '#8995a5', fontSize: '10px' }}>ACCOUNT ROLE</small>
            <div style={{ textTransform: 'capitalize', fontWeight: 700, fontSize: '12px', color: '#17372f' }}>{currentUser?.role}</div>
          </div>
          <div>
            <small style={{ color: '#8995a5', fontSize: '10px' }}>STATUS</small>
            <div style={{ color: '#2b6e4f', fontWeight: 700, fontSize: '12px' }}>Active & Verified</div>
          </div>
          <div>
            <small style={{ color: '#8995a5', fontSize: '10px' }}>MEMBER SINCE</small>
            <div style={{ fontWeight: 700, fontSize: '12px', color: '#17372f' }}>{currentUser?.createdAt || '2026'}</div>
          </div>
        </div>
        <div className="guest-settings-divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#65748a' }}>
            Ready to end your session on this browser?
          </span>
          <button
            type="button"
            className="button button-outline"
            style={{ color: '#c53030', borderColor: '#fca5a5' }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </section>
    </GuestShell>
  );
}
