import { Heart, MapPin, Star, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Listing } from '../data/listings';

export default function ListingCard({ listing, recommended = false }: { listing: Listing; recommended?: boolean }) {
  const [saved, setSaved] = useState(() => { try { return (JSON.parse(localStorage.getItem('ns-wishlist') || '[]') as string[]).includes(listing.id); } catch { return false; } });
  const toggleSaved = () => { const current = (() => { try { return JSON.parse(localStorage.getItem('ns-wishlist') || '[]') as string[]; } catch { return []; } })(); const next = current.includes(listing.id) ? current.filter((id) => id !== listing.id) : [...current, listing.id]; localStorage.setItem('ns-wishlist', JSON.stringify(next)); setSaved(!saved); };
  return (
    <article className="listing-card">
      <div className="listing-image-wrap">
        <Link to={`/rooms/${listing.id}`} aria-label={`View ${listing.name}`}>
          <img src={listing.image} alt={listing.name} className="listing-image" loading="lazy" />
        </Link>
        {recommended && <span className="image-tag"><Sparkles size={12} /> NepalStay Recommended</span>}
        <button className={`save-button ${saved ? 'is-saved' : ''}`} onClick={toggleSaved} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}>
          <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="listing-content">
        <div className="listing-title-row">
          <Link to={`/rooms/${listing.id}`} className="listing-title">{listing.name}</Link>
          <span className="listing-rating"><Star size={13} fill="currentColor" /> {listing.rating.toFixed(2)}</span>
        </div>
        <div className="muted listing-location"><MapPin size={13} /> {listing.area}</div>
        <div className="listing-meta">{listing.type} <span>·</span> {listing.reviews} reviews</div>
        <div className="listing-price"><strong>रु {listing.price.toLocaleString('en-IN')}</strong><span> / night</span></div>
      </div>
    </article>
  );
}
