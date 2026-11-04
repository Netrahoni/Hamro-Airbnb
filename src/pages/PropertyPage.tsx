import { useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, Heart, MapPin, Share2, ShieldCheck, Sparkles, Star, Wifi, Zap, Users, ChevronLeft, ChevronRight, Coffee, Car, Mountain, Utensils, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/Badge';
import { listings } from '../data/listings';

const galleryExtras = [
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85',
];

export default function PropertyPage() {
  const { listingId = '' } = useParams();
  const listing = listings.find((item) => item.id === listingId);
  const [saved, setSaved] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [shareMessage, setShareMessage] = useState('');
  const photos = useMemo(() => listing ? [listing.image, ...galleryExtras] : [], [listing]);
  const nights = checkIn && checkOut ? Math.max(0, Math.round((new Date(`${checkOut}T00:00:00`).getTime() - new Date(`${checkIn}T00:00:00`).getTime()) / 86400000)) : 0;
  const subtotal = listing ? listing.price * nights : 0;
  const serviceFee = nights > 0 ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + serviceFee;
  const today = new Date().toISOString().slice(0, 10);

  if (!listing) return <div className="container not-found property-not-found"><div className="eyebrow">STAY NOT FOUND</div><h1>This listing is unavailable.</h1><p className="muted">It may have been removed or the link may be incorrect.</p><Link className="button button-dark" to="/">Explore stays</Link></div>;

  async function shareListing() {
    if (!listing) return;
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: listing.name, text: `Explore ${listing.name} on NepalStay AI`, url }); setShareMessage('Share menu opened'); }
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); setShareMessage('Link copied'); }
      else setShareMessage('Copy this page URL to share it');
    } catch { setShareMessage(''); }
    window.setTimeout(() => setShareMessage(''), 2600);
  }
  function nextPhoto(direction: number) { setActivePhoto((current) => (current + direction + photos.length) % photos.length); }

  const amenityList = [
    { label: 'Wi-Fi', Icon: Wifi }, { label: 'Breakfast options', Icon: Coffee },
    { label: 'Scenic surroundings', Icon: Mountain }, { label: 'Parking information', Icon: Car },
    { label: 'Dining options', Icon: Utensils }, { label: 'Power backup', Icon: Zap },
  ];

  return <div className="container property-page">
    <div className="property-back">
      <Link to={`/s/${listing.city.toLowerCase()}`}><ArrowLeft size={15}/> Back to {listing.city}</Link>
      <div className="property-actions">
        <button className="plain-action" onClick={shareListing}><Share2 size={15}/> Share</button>
        <button className={`plain-action ${saved ? 'saved-action' : ''}`} onClick={() => setSaved(!saved)}><Heart size={15} fill={saved ? 'currentColor' : 'none'}/> {saved ? 'Saved' : 'Save'}</button>
      </div>
      {shareMessage && <span className="share-feedback"><Check size={12}/>{shareMessage}</span>}
    </div>
    <div className="property-heading"><div>
      <div className="property-badges"><Badge tone="green">Verified Stay</Badge><Badge tone="blue">Direct Host Booking</Badge></div>
      <h1>{listing.name}</h1>
      <div className="property-subline"><span><Star size={14} fill="currentColor"/> {listing.rating.toFixed(2)} · {listing.reviews} verified reviews</span><span><MapPin size={14}/> {listing.area}</span><span>{listing.type}</span></div>
    </div></div>
    <div className="property-gallery property-gallery-interactive">
      <button className="gallery-photo gallery-photo-main" onClick={() => { setActivePhoto(0); setGalleryOpen(true); }} aria-label="Open main property photo"><img src={photos[0]} alt={`${listing.name} main view`} /></button>
      {photos.slice(1, 4).map((photo, index) => <button className="gallery-photo" key={photo} onClick={() => { setActivePhoto(index + 1); setGalleryOpen(true); }} aria-label={`Open property photo ${index + 2}`}><img src={photo} alt={`${listing.name} photo ${index + 2}`} /></button>)}
      <button className="gallery-more" onClick={() => { setActivePhoto(0); setGalleryOpen(true); }}>View all photos <span>({photos.length})</span></button>
    </div>
    <div className="property-columns">
      <div className="property-main-copy">
        <div className="host-intro"><div><h2>{listing.type} hosted by {listing.host}</h2><p className="muted">{guests} guests · 1 bedroom · 1 bed · 1 private bath</p></div><div className="host-avatar">{listing.host.slice(0,1)}</div></div>
        <div className="property-highlights">
          <div><Users size={19}/><span><strong>Guest-friendly stay</strong><small>Thoughtfully designed for couples, trekkers and families</small></span></div>
          <div><MapPin size={19}/><span><strong>{listing.area}</strong><small>Exact location and arrival guide shared with your booking</small></span></div>
          <div><BadgeCheck size={19}/><span><strong>Verified Host</strong><small>Citizenship and local government registration verified</small></span></div>
        </div>
        <section className="property-description"><h3>About this place</h3><p>{listing.description}</p><p>Enjoy a welcoming base for exploring the neighbourhood, meeting local people and discovering the authentic character of Nepal at your own pace.</p></section>
        <section className="amenities-section"><h3>What this place offers</h3><div className="amenities-grid">{amenityList.map(({ label, Icon }) => <span key={label}><Icon size={16}/> {label}</span>)}</div></section>
        <section className="location-preview"><div><h3>Where you’ll be</h3><p className="muted">{listing.area}</p></div><div className="location-map-placeholder"><MapPin size={25}/><strong>Prime location in {listing.city}</strong><span>Quiet neighborhood close to scenic views, local restaurants and transport.</span></div></section>
        <section className="host-profile"><div className="host-avatar host-avatar-large">{listing.host.slice(0,1)}</div><div><h3>Hosted by {listing.host}</h3><p className="muted">Experienced local host dedicated to warm Himalayan hospitality and personalized recommendations.</p><Badge tone="green">Verified Host</Badge></div></section>
      </div>
      <aside className="booking-card booking-card-enhanced">
        <div className="booking-price"><strong>रु {listing.price.toLocaleString('en-IN')}</strong><span> / night</span></div><div className="booking-price-caption">Best price guaranteed · NPR</div>
        <div className="booking-date-fields">
          <label><small>CHECK-IN</small><input type="date" min={today} value={checkIn} onChange={(event) => { setCheckIn(event.target.value); if (checkOut && event.target.value >= checkOut) setCheckOut(''); }} /></label>
          <label><small>CHECK-OUT</small><input type="date" min={checkIn || today} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label>
        </div>
        <label className="guest-selector"><span><Users size={14}/> Guests</span><select value={guests} onChange={(event) => setGuests(Number(event.target.value))}>{[1,2,3,4,5,6,7,8].map((number) => <option key={number} value={number}>{number} {number === 1 ? 'guest' : 'guests'}</option>)}</select></label>
        {nights > 0 ? <><div className="price-line"><span>रु {listing.price.toLocaleString('en-IN')} × {nights} {nights === 1 ? 'night' : 'nights'}</span><span>रु {subtotal.toLocaleString('en-IN')}</span></div><div className="price-line"><span>Platform service fee (5%)</span><span>रु {serviceFee.toLocaleString('en-IN')}</span></div><div className="price-line total-line"><strong>Estimated total</strong><strong>रु {total.toLocaleString('en-IN')}</strong></div></> : <p className="booking-date-hint">Choose check-in and check-out dates to see the total price.</p>}
        <Link className="button button-dark button-full" to={`/book/${listing.id}${checkIn && checkOut && nights > 0 ? `?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}` : ''}`}>Continue to booking <ArrowLeft className="rotate-180" size={16}/></Link>
        <p className="booking-note">Free cancellation available. You can pay securely in cash directly at the property upon arrival.</p>
        <div className="ai-price-note"><Sparkles size={15}/><div><strong>AI price insight <Badge tone="green">Fair Rate</Badge></strong><p>This rate is competitive and reflects current {listing.city} seasonal demand and verified amenities.</p></div></div>
        <div className="safe-note"><ShieldCheck size={15}/> Protected with NepalStay Safe Booking Guarantee</div>
      </aside>
    </div>
    {galleryOpen && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Property photo gallery" onClick={() => setGalleryOpen(false)}>
      <button className="lightbox-close" onClick={() => setGalleryOpen(false)} aria-label="Close gallery"><X size={22}/></button>
      <button className="lightbox-arrow lightbox-prev" onClick={(event) => { event.stopPropagation(); nextPhoto(-1); }} aria-label="Previous photo"><ChevronLeft size={25}/></button>
      <img src={photos[activePhoto]} alt={`${listing.name} gallery image ${activePhoto + 1}`} onClick={(event) => event.stopPropagation()} />
      <button className="lightbox-arrow lightbox-next" onClick={(event) => { event.stopPropagation(); nextPhoto(1); }} aria-label="Next photo"><ChevronRight size={25}/></button><span className="lightbox-counter">{activePhoto + 1} / {photos.length}</span>
    </div>}
  </div>;
}
