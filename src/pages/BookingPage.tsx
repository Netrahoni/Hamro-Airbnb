import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, ShieldCheck, Users, UserCheck } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, toListing } from '../services/api';
import type { MarketplaceBooking, MarketplaceProperty } from '../services/api';
import { useAuth } from '../context/AuthContext';

const today = new Date().toISOString().slice(0, 10);
const formatDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Choose date';

export default function BookingPage() {
  const { listingId = '' } = useParams();
  const [params] = useSearchParams();
  const { currentUser, isAuthenticated } = useAuth();
  const [property, setProperty] = useState<MarketplaceProperty | null>(null);
  const [propertyError, setPropertyError] = useState('');
  const [loadingProperty, setLoadingProperty] = useState(true);
  const initialCheckIn = params.get('checkIn') || '';
  const initialCheckOut = params.get('checkOut') || '';
  const [checkIn, setCheckIn] = useState(initialCheckIn >= today ? initialCheckIn : '');
  const [checkOut, setCheckOut] = useState(initialCheckOut > (initialCheckIn || today) ? initialCheckOut : '');
  const [guests, setGuests] = useState(Math.max(1, Number(params.get('guests')) || 2));
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState<'details' | 'review' | 'done'>('details');
  const [booking, setBooking] = useState<MarketplaceBooking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingProperty(true);
    api.getPublicProperty(listingId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) setProperty(result.data.property);
      else setPropertyError(result.error || 'This published stay could not be found.');
      setLoadingProperty(false);
    });
    return () => { cancelled = true; };
  }, [listingId]);

  useEffect(() => {
    if (currentUser?.phone && !phone) setPhone(currentUser.phone);
  }, [currentUser, phone]);

  const listing = property ? toListing(property) : null;
  const nights = useMemo(() => checkIn && checkOut
    ? Math.max(0, Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000))
    : 0, [checkIn, checkOut]);
  const subtotal = property ? property.pricePerNight * nights : 0;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee;
  const validPhone = phone.replace(/\D/g, '').length >= 10;
  const canBook = isAuthenticated && currentUser?.role === 'guest';
  const returnTo = `/book/${listingId}${window.location.search}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(returnTo)}`;
  const canContinue = canBook && checkIn >= today && checkOut > checkIn && nights > 0 && guests <= (property?.maxGuests || 1) && validPhone && accepted;

  const confirmBooking = async () => {
    if (!property || !canContinue) return;
    setSubmitting(true);
    setSubmitError('');
    const result = await api.createBooking({
      propertyId: property.id || property._id || '',
      checkIn,
      checkOut,
      guests,
      guestPhone: phone.trim(),
    });
    setSubmitting(false);
    if (result.success && result.data) {
      setBooking(result.data.booking);
      setStep('done');
    } else {
      setSubmitError(result.error || 'Unable to confirm the reservation. Check availability and try again.');
    }
  };

  if (loadingProperty) return <main className="container property-not-found"><p className="muted">Loading stay details…</p></main>;
  if (!property || !listing) return <main className="container property-not-found"><div className="eyebrow">STAY NOT FOUND</div><h1>We couldn't find this stay.</h1><p className="muted">{propertyError || 'Choose a published property from the explore page to continue.'}</p><Link className="button button-dark" to="/s/pokhara">Explore stays</Link></main>;

  return <main className="container booking-page booking-flow-page">
    <Link className="back-text" to={`/rooms/${listing.id}`}><ArrowLeft size={15}/> Return to property</Link>
    <div className="booking-page-heading"><div className="eyebrow">YOUR NEPAL STAY</div><h1>{step === 'done' ? 'Your reservation is confirmed' : 'Review and reserve your stay'}</h1><p className="muted">{step === 'done' ? 'Your reservation is saved to your account.' : 'Choose dates and confirm a pay-at-property reservation.'}</p></div>

    {step === 'done' && booking ? <section className="confirmation-card booking-confirmation">
      <div className="confirmation-icon"><CheckCircle2 size={32}/></div><h2>Reservation confirmed</h2><p>Your reservation at <strong>{booking.propertyTitle}</strong> has been saved. The host can see it in their reservation list.</p>
      <div className="confirmation-code">{booking.bookingReference}</div>
      <div className="confirmation-details"><span>Property</span><strong>{booking.propertyTitle}</strong><span>Stay dates</span><strong>{formatDate(booking.checkIn)} – {formatDate(booking.checkOut)} · {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}</strong><span>Lead guest</span><strong>{booking.guestName}</strong><span>Payment method</span><strong>Pay the host at the property</strong><span>Total amount</span><strong>रु {booking.totalAmount.toLocaleString('en-IN')}</strong></div>
      <Link className="button button-dark" to="/trips">View my trips</Link><Link className="booking-home-link" to="/s/pokhara">Explore more stays</Link>
    </section> : <div className="checkout-grid booking-flow-grid">
      <section className="checkout-form-card booking-main-card">
        <div className="booking-progress"><div className={`booking-progress-step ${step === 'details' ? 'current' : 'complete'}`}><span>{step === 'details' ? '1' : '✓'}</span><div><strong>Guest details</strong><small>Your trip information</small></div></div><div className="booking-progress-line"/><div className={`booking-progress-step ${step === 'review' ? 'current' : ''}`}><span>2</span><div><strong>Review & reserve</strong><small>Confirm your request</small></div></div></div>

        {step === 'details' ? <>
          <div className="booking-section-heading"><div><h2>Your stay dates</h2><p className="muted">Select the dates you want to book.</p></div><CalendarDays size={20}/></div>
          <div className="booking-date-fields booking-date-fields-large"><label><small>CHECK-IN</small><input type="date" min={today} value={checkIn} onChange={(event) => { setCheckIn(event.target.value); if (checkOut && event.target.value >= checkOut) setCheckOut(''); }}/></label><label><small>CHECK-OUT</small><input type="date" min={checkIn || today} value={checkOut} onChange={(event) => setCheckOut(event.target.value)}/></label></div>
          <label className="form-label booking-guests-label"><span><Users size={15}/> Number of guests (max {property.maxGuests || 1})</span><select value={Math.min(guests, property.maxGuests || 1)} onChange={(event) => setGuests(Number(event.target.value))}>{Array.from({ length: property.maxGuests || 1 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? 'guest' : 'guests'}</option>)}</select></label>
          {checkIn && checkOut && nights > 0 && <p className="booking-date-confirm"><CheckCircle2 size={14}/>{nights} {nights === 1 ? 'night' : 'nights'} · {formatDate(checkIn)} to {formatDate(checkOut)}</p>}
          <div className="booking-form-divider"/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}><h2>Lead guest details</h2>{isAuthenticated && currentUser ? <span style={{ fontSize: '11px', color: '#2b6e4f', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><UserCheck size={14}/> Signed in as {currentUser.fullName}</span> : <Link to={loginUrl} style={{ fontSize: '11px', color: '#17372f', fontWeight: 600 }}>Sign in to book</Link>}</div>
          {!canBook && <p className="muted">Sign in with a guest account to reserve this stay.</p>}
          <label className="form-label">Mobile number <input autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+977 98XXXXXXXX"/></label>
          <p className="muted">We’ll share your booking contact details with the property host.</p>
          <label className="booking-terms"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)}/><span>I confirm the travel dates and guest count are correct. I understand payment is due directly to the property.</span></label>
          <button className="button button-dark button-full booking-continue" disabled={!canContinue} onClick={() => setStep('review')}>Review booking <ChevronRight size={17}/></button>
          {!canContinue && <p className="booking-validation-hint">Choose valid dates, enter a valid mobile number, sign in as a guest and accept the reservation terms.</p>}
        </> : <>
          <h2>Review your reservation</h2><p className="muted">The host will receive this confirmed reservation. Payment is due at the property.</p>
          {submitError && <div className="host-alert host-alert-error" role="alert">{submitError}</div>}
          <div className="review-block"><div><strong>Stay details</strong><button className="text-button" onClick={() => setStep('details')}>Edit</button></div><p>{formatDate(checkIn)} – {formatDate(checkOut)} · {nights} {nights === 1 ? 'night' : 'nights'}</p><p>{guests} {guests === 1 ? 'guest' : 'guests'}</p></div>
          <div className="review-block"><div><strong>Lead guest</strong><button className="text-button" onClick={() => setStep('details')}>Edit</button></div><p>{currentUser?.fullName}</p><p>{phone} · {currentUser?.email}</p></div>
          <div className="payment-option selected"><span className="payment-option-icon"><ShieldCheck size={18}/></span><span><strong>Pay at the property</strong><small>Pay the host directly at check-in. Online payments are not enabled yet.</small></span></div>
          <button className="button button-dark button-full booking-continue" disabled={submitting} onClick={confirmBooking}>{submitting ? 'Confirming…' : 'Confirm reservation'} <ChevronRight size={17}/></button><button className="text-button booking-back-button" disabled={submitting} onClick={() => setStep('details')}>Back to details</button>
        </>}
      </section>

      <aside className="checkout-summary booking-summary-card"><img src={listing.image} alt={listing.name}/><div className="checkout-summary-copy"><strong>{listing.name}</strong><span>{listing.area}</span><span>{guests} {guests === 1 ? 'guest' : 'guests'} · {nights ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : 'Dates not selected'}</span></div>
        <div className="summary-divider"/><div className="booking-summary-dates"><span>Check-in</span><strong>{formatDate(checkIn)}</strong><span>Check-out</span><strong>{formatDate(checkOut)}</strong></div>
        <div className="summary-divider"/><div className="price-line"><span>रु {property.pricePerNight.toLocaleString('en-IN')} × {nights} {nights === 1 ? 'night' : 'nights'}</span><strong>रु {subtotal.toLocaleString('en-IN')}</strong></div><div className="price-line"><span>Service fee (5%)</span><strong>रु {serviceFee.toLocaleString('en-IN')}</strong></div><div className="summary-divider"/><div className="summary-total"><span>Total (NPR)</span><strong>रु {total.toLocaleString('en-IN')}</strong></div><p className="muted">Final price is calculated and checked by the server when you confirm.</p><div className="safe-note"><ShieldCheck size={15}/> Reservation saved to your NepalStay account</div>
      </aside>
    </div>}
  </main>;
}
