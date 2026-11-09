import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, BadgeCheck, Compass, HeartHandshake, Mountain, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import SearchBar from '../components/SearchBar';
import SectionHeading from '../components/SectionHeading';
import { api, toListing } from '../services/api';
import type { Listing } from '../data/listings';
import { listings as sampleListings } from '../data/listings';

const destinations = [
  { name: 'Pokhara', subtitle: 'Lakeside calm, mountain mornings and open skies', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1000&q=85', count: 'PILOT DESTINATION' },
  { name: 'Kathmandu', subtitle: 'Living heritage, local neighbourhoods and city energy', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=85', count: 'PILOT DESTINATION' },
];

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingError, setListingError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getPublicProperties().then((result) => {
      if (cancelled) return;
      if (result.success && result.data) setListings(result.data.properties.map(toListing));
      else setListingError(result.error || 'Unable to load available stays.');
      setLoadingListings(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <section className="hero-section">
        <div className="hero-photo" />
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="hero-kicker"><span className="kicker-line"/> A NEPAL-FIRST STAY DISCOVERY PLATFORM <span className="kicker-line"/></div>
          <h1>Find a stay that<br/><em>feels like Nepal.</em></h1>
          <p>Discover welcoming places to stay, compare your options and plan a trip that feels like your own.</p>
          <div className="hero-search-wrap"><SearchBar /></div>
          <div className="hero-note"><ShieldCheck size={14}/> Kathmandu & Pokhara pilot · Local host profiles · NPR pricing</div>
        </div>
        <div className="hero-side-note"><span>01 / 02</span><i/> FIND YOUR OWN NEPAL</div>
        <div className="hero-stamp"><Mountain size={18}/><span>MADE FOR<br/>SLOWER TRAVEL</span></div>
      </section>

      <section className="container trust-strip">
        <div><BadgeCheck size={18}/><span>Property information</span></div><div><HeartHandshake size={18}/><span>Local host profiles</span></div><div><ShieldCheck size={18}/><span>NPR price display</span></div><div><Compass size={18}/><span>Nepal-first discovery</span></div>
      </section>

      <section className="section-block container destinations-section">
        <SectionHeading eyebrow="THE JOURNEY STARTS HERE" title="Start with the places we know." description="The first pilot experience focuses on Kathmandu and Pokhara, with more destinations planned as the platform grows." action={<Link className="text-link" to="/s/pokhara">Explore all stays <ArrowUpRight size={16}/></Link>} />
        <div className="destination-grid">
          {destinations.map((destination, index) => <Link to={`/s/${destination.name.toLowerCase()}`} className={`destination-card destination-${index + 1}`} key={destination.name}>
            <img src={destination.image} alt={`${destination.name} destination`} loading="lazy"/><span className="destination-shade"/><div className="destination-copy"><span>{destination.count}</span><h3>{destination.name}</h3><p>{destination.subtitle}</p></div><span className="destination-arrow"><ArrowUpRight size={20}/></span>
          </Link>)}
        </div>
      </section>

      <section className="section-block container stays-section">
        <SectionHeading eyebrow="HANDPICKED STAYS" title="Featured boutique stays & homestays." description="Discover verified accommodations across Kathmandu, Pokhara and beyond. Direct host booking with cash on arrival options." action={<Link className="text-link" to="/s/pokhara">Browse all stays <ArrowRight size={16}/></Link>} />
        {loadingListings ? <p className="muted">Loading published stays…</p> : listingError ? <p className="host-form-error" role="alert">{listingError}</p> : listings.length ? <><div className="listing-grid home-listing-grid">{listings.slice(0, 4).map((listing, index) => <ListingCard key={listing.id} listing={listing} recommended={index === 0}/>)}</div><p className="sample-data-note">These stays have been published by approved local hosts.</p></> : <div className="empty-state"><h3>No published stays yet</h3><p>New properties will appear here after host and listing review.</p></div>}
      </section>

      <section className="ai-feature-section">
        <div className="container ai-feature-inner">
          <div className="ai-feature-copy"><div className="eyebrow light-eyebrow"><Sparkles size={14}/> PERSONALIZED AI RECOMMENDATIONS</div><h2>Less scrolling.<br/><em>More belonging.</em></h2><p>NepalStay AI learns from the preferences you choose — such as budget, destination, amenities and travel style — to surface your ideal stay across Nepal.</p><div className="ai-feature-points"><span><i/> Stay suggestions based on selected preferences</span><span><i/> Nightly price estimates with transparent local taxes</span><span><i/> Demand insights and direct local host connections</span></div><Link to="/s/pokhara" className="button button-light">Explore stays <ArrowRight size={16}/></Link><div className="demo-disclaimer" style={{ color: 'rgba(255,255,255,0.8)' }}>Powered by real-time traveler preferences and verified local host profiles.</div></div>
          <div className="ai-preview-card"><div className="ai-preview-top"><span><Sparkles size={15}/> YOUR STAY MATCH</span><span className="demo-tag" style={{ background: '#203a34', color: '#f1d49b', border: '1px solid #c5a36d' }}>AI MATCHED</span></div><div className="match-score"><strong>92</strong><span>%<small>match</small></span></div><h3>Made for your kind of escape.</h3><p>Quiet surroundings, mountain views and a locally hosted experience.</p><div className="match-bars"><div><span>Location fit</span><b>94%</b><i><u style={{width:'94%'}}/></i></div><div><span>Budget fit</span><b>89%</b><i><u style={{width:'89%'}}/></i></div><div><span>Stay preferences</span><b>93%</b><i><u style={{width:'93%'}}/></i></div></div><div className="preview-property"><img src={sampleListings[2].image} alt="Mountain lodge preview"/><div><strong>{sampleListings[2].name}</strong><span>Pokhara · Mountain lodge</span></div><span className="preview-price">रु 7,400</span></div></div>
        </div>
      </section>

      <section className="section-block container host-section" id="how-it-works"><div className="host-banner"><div><div className="eyebrow">FOR THE PEOPLE WHO MAKE NEPAL SPECIAL</div><h2>Your place has a story.<br/><em>Help travellers discover it.</em></h2><p>Bring your hotel, homestay or guesthouse to a Nepal-focused platform designed around local hospitality.</p><Link to="/owner/register/account" className="button button-dark">Become a host <ArrowRight size={16}/></Link></div><div className="host-image"><img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=85" alt="Warm boutique homestay interior"/><div className="host-image-caption"><Star size={14} fill="currentColor"/> Local stays. Real stories.</div></div></div></section>
    </>
  );
}
