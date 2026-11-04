import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, CreditCard, ShieldCheck, Users, UserCheck } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { listings } from '../data/listings';
import { useAuth } from '../context/AuthContext';

type PaymentMethod = 'property' | 'online';

const today = new Date().toISOString().slice(0, 10);
const formatDate = (date: string) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Choose date';

export default function BookingPage() {
  const { listingId = '' } = useParams();
  const [params] = useSearchParams();
  const listing = listings.find((item) => item.id === listingId);
  const { currentUser, isAuthenticated } = useAuth();
  const initialCheckIn = params.get('checkIn') || '';
  const initialCheckOut = params.get('checkOut') || '';
  const [checkIn, setCheckIn] = useState(initialCheckIn >= today ? initialCheckIn : '');
  const [checkOut, setCheckOut] = useState(initialCheckOut > (initialCheckIn || today) ? initialCheckOut : '');
  const [guests, setGuests] = useState(Math.min(8, Math.max(1, Number(params.get('guests')) || 2)));
  const [name, setName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '+977 ');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [arrival, setArrival] = useState('Afternoon (12 PM – 5 PM)');
  const [payment, setPayment] = useState<PaymentMethod>('property');
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState<'details' | 'review' | 'done'>('details');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.fullName);
      if (phone === '+977 ') setPhone(currentUser.phone);
      if (!email) setEmail(currentUser.email);
    }
  }, [currentUser]);

  const nights = useMemo(() => checkIn && checkOut ? Math.max(0, Math.round((new Date(`${checkOut}T00:00:00`).getTime() - new Date(`${checkIn}T00:00:00`).getTime()) / 86400000)) : 0, [checkIn, checkOut]);
  const subtotal = listing ? listing.price * nights : 0;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee;
  const validPhone = phone.replace(/\D/g, '').length >= 10;

  if (!listing) return <div className="container property-not-found"><div className="eyebrow">STAY NOT FOUND</div><h1>We couldn't find this stay.</h1><p className="muted">Choose a property from the explore page to continue.</p><Link className="button button-dark" to="/s/kathmandu">Explore stays</Link></div>;

  const canContinue = checkIn >= today && checkOut > checkIn && name.trim().length >= 2 && validPhone && accepted;
  const confirmBooking = () => {
    const bookingId = `NS-26-${listing.city.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking = {
      id: bookingId,
      property: listing.name,
      city: `${listing.city}, ${listing.area}`,
      image: listing.image,
      checkIn,
      checkOut,
      guests,
      total,
      status: 'Confirmed' as const,
      room: listing.type || 'Deluxe Room',
    };
    try {
      const existing = JSON.parse(localStorage.getItem('ns-demo-bookings') || 'null');
      const list = Array.isArray(existing) ? existing : [];
      localStorage.setItem('ns-demo-bookings', JSON.stringify([newBooking, ...list]));
    } catch (e) {
      console.warn(e);
    }
    setReference(bookingId);
    setStep('done');
  };

  return <main className="container booking-page booking-flow-page">
    <Link className="back-text" to={`/rooms/${listing.id}`}><ArrowLeft size={15}/> Return to property</Link>
    <div className="booking-page-heading"><div className="eyebrow">YOUR NEPAL STAY</div><h1>{step === 'done' ? 'Your booking is confirmed!' : 'Review and reserve your stay'}</h1><p className="muted">{step === 'done' ? 'Here is your reservation confirmation and check-in details.' : 'Confirm your travel dates and guest details.'}</p></div>

    {step === 'done' ? <section className="confirmation-card booking-confirmation">
      <div className="confirmation-icon"><CheckCircle2 size={32}/></div><h2>Reservation confirmed!</h2><p>Your booking request has been confirmed with <strong>{listing.name}</strong>. The host has been notified of your arrival.</p>
      <div className="confirmation-code">{reference}</div>
      <div className="confirmation-details"><span>Property</span><strong>{listing.name}</strong><span>Stay dates</span><strong>{formatDate(checkIn)} – {formatDate(checkOut)} · {nights} {nights === 1 ? 'night' : 'nights'}</strong><span>Lead guest</span><strong>{name}</strong><span>Payment method</span><strong>{payment === 'property' ? 'Cash on arrival at property (COD)' : 'Digital Wallet / Card'}</strong><span>Total amount</span><strong>रु {total.toLocaleString('en-IN')}</strong></div>
      <Link className="button button-dark" to="/trips">View my trips</Link><Link className="booking-home-link" to="/s/pokhara">Explore more stays</Link>
    </section> : <div className="checkout-grid booking-flow-grid">
      <section className="checkout-form-card booking-main-card">
        <div className="booking-progress"><div className={`booking-progress-step ${step === 'details' ? 'current' : 'complete'}`}><span>{step === 'details' ? '1' : '✓'}</span><div><strong>Guest details</strong><small>Your trip information</small></div></div><div className="booking-progress-line"/><div className={`booking-progress-step ${step === 'review' ? 'current' : ''}`}><span>2</span><div><strong>Review & reserve</strong><small>Confirm your request</small></div></div></div>

        {step === 'details' ? <>
          <div className="booking-section-heading"><div><h2>Your stay dates</h2><p className="muted">Select the dates you want to book.</p></div><CalendarDays size={20}/></div>
          <div className="booking-date-fields booking-date-fields-large"><label><small>CHECK-IN</small><input type="date" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }}/></label><label><small>CHECK-OUT</small><input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)}/></label></div>
          <label className="form-label booking-guests-label"><span><Users size={15}/> Number of guests</span><select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>{Array.from({length: 8}, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}</select></label>
          {checkIn && checkOut && nights > 0 && <p className="booking-date-confirm"><CheckCircle2 size={14}/>{nights} {nights === 1 ? 'night' : 'nights'} · {formatDate(checkIn)} to {formatDate(checkOut)}</p>}
          <div className="booking-form-divider"/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2>Lead guest details</h2>
            {isAuthenticated && currentUser ? (
              <span style={{ fontSize: '11px', color: '#2b6e4f', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <UserCheck size={14} /> Auto-filled from your {currentUser.role} account
              </span>
            ) : (
              <Link to="/login" style={{ fontSize: '11px', color: '#17372f', fontWeight: 600 }}>
                Sign in to auto-fill
              </Link>
            )}
          </div>
          <p className="muted">Who should the host contact about this booking?</p>
          <label className="form-label">Full name <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name"/></label>
          <label className="form-label">Mobile number <input autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+977 98XXXXXXXX"/></label>
          <label className="form-label">Email address <span className="optional-label">Optional</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
          <label className="form-label">Estimated arrival time<select value={arrival} onChange={(e) => setArrival(e.target.value)}><option>Morning (6 AM – 12 PM)</option><option>Afternoon (12 PM – 5 PM)</option><option>Evening (5 PM – 9 PM)</option><option>Late evening (after 9 PM)</option><option>Not sure yet</option></select></label>
          <label className="booking-terms"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}/><span>I have reviewed the dates, property cancellation terms and guest details. I confirm my contact details are correct.</span></label>
          <button className="button button-dark button-full booking-continue" disabled={!canContinue} onClick={() => setStep('review')}>Review booking <ChevronRight size={17}/></button>
          {!canContinue && <p className="booking-validation-hint">Please enter valid check-in/out dates, guest name, mobile number and accept policies to continue.</p>}
        </> : <>
          <h2>Review your reservation</h2><p className="muted">Check everything carefully before confirming your stay.</p>
          <div className="review-block"><div><strong>Stay details</strong><button className="text-button" onClick={() => setStep('details')}>Edit</button></div><p>{formatDate(checkIn)} – {formatDate(checkOut)} · {nights} {nights === 1 ? 'night' : 'nights'}</p><p>{guests} {guests === 1 ? 'guest' : 'guests'} · Arrival: {arrival}</p></div>
          <div className="review-block"><div><strong>Lead guest</strong><button className="text-button" onClick={() => setStep('details')}>Edit</button></div><p>{name}</p><p>{phone}{email ? ` · ${email}` : ''}</p></div>
          <h3 className="payment-heading">Payment preference</h3>
          <label className={`payment-option ${payment === 'property' ? 'selected' : ''}`}><input type="radio" name="payment" checked={payment === 'property'} onChange={() => setPayment('property')}/><span className="payment-option-icon"><CreditCard size={18}/></span><span><strong>Cash at property (COD)</strong><small>Pay directly to the host in Nepalese Rupees (NPR) upon check-in.</small></span></label>
          <label className={`payment-option ${payment === 'online' ? 'selected' : ''}`}><input type="radio" name="payment" checked={payment === 'online'} onChange={() => setPayment('online')}/><span className="payment-option-icon"><ShieldCheck size={18}/></span><span><strong>Digital payment (eSewa / Khalti / Card)</strong><small>Instant secure settlement with 100% refund guarantee on qualifying cancellations.</small></span></label>
          <button className="button button-dark button-full booking-continue" onClick={confirmBooking}>Confirm reservation <ChevronRight size={17}/></button><button className="text-button booking-back-button" onClick={() => setStep('details')}>Back to details</button>
        </>}
      </section>

      <aside className="checkout-summary booking-summary-card"><img src={listing.image} alt={listing.name}/><div className="checkout-summary-copy"><strong>{listing.name}</strong><span>{listing.area}</span><span>{guests} {guests === 1 ? 'guest' : 'guests'} · {nights ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : 'Dates not selected'}</span></div>
        <div className="summary-divider"/><div className="booking-summary-dates"><span>Check-in</span><strong>{formatDate(checkIn)}</strong><span>Check-out</span><strong>{formatDate(checkOut)}</strong></div>
        <div className="summary-divider"/><div className="price-line"><span>रु {listing.price.toLocaleString('en-IN')} × {nights} {nights === 1 ? 'night' : 'nights'}</span><strong>रु {subtotal.toLocaleString('en-IN')}</strong></div><div className="price-line"><span>Platform service fee (5%)</span><strong>रु {serviceFee.toLocaleString('en-IN')}</strong></div><div className="summary-divider"/><div className="summary-total"><span>Total to pay</span><strong>रु {total.toLocaleString('en-IN')}</strong></div><p className="muted">Transparent pricing including all local taxes. Free cancellation up to 48 hours prior to check-in.</p><div className="safe-note"><ShieldCheck size={15}/> Protected by NepalStay Host & Guest Guarantee</div>
      </aside>
    </div>}
  </main>;
}
