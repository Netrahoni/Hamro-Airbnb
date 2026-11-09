import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Map, List, MapPin, Sparkles, ChevronDown } from 'lucide-react';
import ListingCard from '../components/ListingCard';
import Badge from '../components/Badge';
import { api, toListing } from '../services/api';
import type { Listing } from '../data/listings';

export default function ExplorePage() {
  const { city = 'pokhara' } = useParams();
  const [params] = useSearchParams();
  const cityName = city.toLowerCase().includes('kath') ? 'Kathmandu' : 'Pokhara';
  const [budget, setBudget] = useState(10000);
  const [stayType, setStayType] = useState('All stays');
  const [mapMode, setMapMode] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    api.getPublicProperties(cityName).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) setListings(result.data.properties.map(toListing));
      else setError(result.error || 'Unable to load available stays.');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [cityName]);
  const stayTypes = Array.from(new Set(listings.map((item) => item.type))).sort();
  const filtered = useMemo(() => listings.filter((item) => item.price <= budget && (stayType === 'All stays' || item.type === stayType)), [listings, budget, stayType]);
  return (
    <div className="container explore-page">
      <div className="explore-top"><div><div className="eyebrow">EXPLORE NEPAL</div><h1>Stays in {cityName}</h1><p className="muted">Find a place that feels right for your journey.</p></div><button className={`button ${mapMode ? 'button-dark' : 'button-outline'}`} onClick={() => setMapMode(!mapMode)}>{mapMode ? <List size={16}/> : <Map size={16}/>} {mapMode ? 'Show list' : 'Map view'}</button></div>
      <div className="search-summary"><div><MapPin size={16}/><strong>{cityName}</strong><span>·</span><span>{params.get('guests') || '2 guests'}</span>{params.get('checkIn') && <><span>·</span><span>{params.get('checkIn')} – {params.get('checkOut') || 'Flexible'}</span></>}</div><button className="filter-toggle"><SlidersHorizontal size={15}/> Filters</button></div>
      <div className="explore-layout">
        <aside className="filter-panel"><div className="filter-heading"><strong>Filters</strong><button onClick={() => {setBudget(10000);setStayType('All stays');}}>Reset</button></div><div className="filter-group"><strong>Stay type</strong>{['All stays', ...stayTypes].map((type) => <label className="check-row" key={type}><input type="radio" name="type" checked={stayType === type} onChange={() => setStayType(type)}/><span>{type}</span></label>)}</div><div className="filter-group"><div className="filter-range-head"><strong>Nightly budget</strong><b>रु {budget.toLocaleString('en-IN')}</b></div><input type="range" min="2500" max="10000" step="500" value={budget} onChange={(e) => setBudget(Number(e.target.value))}/><div className="range-labels"><span>रु 2,500</span><span>रु 10,000+</span></div></div><div className="filter-group"><strong>Popular amenities</strong>{['Wi-Fi','Power backup','Breakfast','Mountain or lake view'].map((item) => <label className="check-row" key={item}><input type="checkbox"/><span>{item}</span></label>)}</div></aside>
        <div className="results-panel"><div className="results-heading"><div><span className="muted">{filtered.length} stays found</span><div className="ai-sort"><Sparkles size={14}/> <strong>Smart picks</strong> <Badge tone="green">AI Ranked</Badge></div></div><button className="sort-button">Recommended <ChevronDown size={15}/></button></div>
          {loading ? <div className="empty-state">Loading published stays…</div> : error ? <div className="empty-state" role="alert">{error}</div> : mapMode ? <div className="map-placeholder"><Map size={34}/><h3>Interactive map view</h3><p>Displaying verified property coordinates across {cityName}.</p><span>Showing {filtered.length} matching properties</span></div> : filtered.length ? <div className="listing-grid explore-listing-grid">{filtered.map((item, index) => <ListingCard key={item.id} listing={item} recommended={index === 0}/>)}</div> : <div className="empty-state"><h3>No stays match those filters</h3><p>Try widening your budget or choosing another stay type.</p><button className="button button-dark" onClick={() => {setBudget(10000);setStayType('All stays');}}>Clear filters</button></div>}
        </div>
      </div>
    </div>
  );
}
