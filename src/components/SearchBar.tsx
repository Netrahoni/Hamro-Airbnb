import { CalendarDays, MapPin, Search, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [city, setCity] = useState('Pokhara');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2 guests');

  const today = new Date().toISOString().slice(0, 10);
  const invalidDates = Boolean(checkIn && checkOut && checkOut <= checkIn);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidDates) return;
    const params = new URLSearchParams();
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    params.set('guests', guests);
    navigate(`/s/${city.toLowerCase()}?${params.toString()}`);
  }

  return (
    <form className={`search-bar ${compact ? 'search-bar-compact' : ''}`} onSubmit={submit}>
      <label className="search-field search-location">
        <span><MapPin size={16} /> Destination</span>
        <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Destination">
          <option>Pokhara</option><option>Kathmandu</option>
        </select>
      </label>
      <label className="search-field">
        <span><CalendarDays size={16} /> Check in</span>
        <input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} aria-label="Check in date" />
      </label>
      <label className="search-field">
        <span><CalendarDays size={16} /> Check out</span>
        <input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} aria-label="Check out date" />
      </label>
      <label className="search-field search-guests">
        <span><Users size={16} /> Guests</span>
        <select value={guests} onChange={(e) => setGuests(e.target.value)} aria-label="Guests">
          <option>1 guest</option><option>2 guests</option><option>3 guests</option><option>4 guests</option><option>5+ guests</option>
        </select>
      </label>
      <button className="search-submit" type="submit" disabled={invalidDates}><Search size={18} /><span>Search stays</span></button>
      {invalidDates && <p className="search-date-error" role="alert">Check-out must be after check-in.</p>}
    </form>
  );
}
