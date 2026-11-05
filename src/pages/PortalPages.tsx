import { useEffect, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Filter,
  MoreHorizontal,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  UserCheck,
  UserX,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Badge from '../components/Badge';
import SectionHeading from '../components/SectionHeading';
import { useAuth } from '../context/AuthContext';
import type { UserStatus } from '../types/auth';
import { api, type HostProperty, type HostPropertyInput } from '../services/api';

export { default as AuthPage } from './AuthPage';

const ownerConfig: Record<string, { title: string; subtitle: string; eyebrow: string; stats: [string,string,string][]; rows: [string,string,string,string][] }> = {
  '/owner/dashboard': { title: 'Good morning, Pine Hill.', subtitle: 'Here is what is happening with your property today.', eyebrow: 'OWNER OVERVIEW', stats: [['Upcoming arrivals','08','+2 from yesterday'],['Occupancy this week','76%','Across 12 rooms'],['Cash expected today','रु 24,600','4 reservations'],['Monthly commission','रु 18,400','10% platform rate']], rows: [['NP-KTM-2048','Anisha Thapa','Today · 2 nights','Confirmed'],['NP-PKR-1992','Samir Gurung','Today · 1 night','Awaiting arrival'],['NP-PKR-1870','Emily Carter','Tomorrow · 3 nights','Confirmed']] },
  '/owner/reservations': { title: 'Reservations', subtitle: 'Manage guest arrivals, check-ins and cash collection.', eyebrow: 'GUEST OPERATIONS', stats: [['Today','4','Arrivals'],['Upcoming','12','Next 7 days'],['Checked in','3','Today'],['Needs attention','1','Review']], rows: [['NP-PKR-2048','Anisha Thapa','Today · 2 guests','Confirmed'],['NP-PKR-1992','Samir Gurung','Today · 1 guest','Awaiting arrival'],['NP-PKR-1870','Emily Carter','Tomorrow · 2 guests','Confirmed']] },
  '/owner/calendar': { title: 'Calendar & rates', subtitle: 'Keep availability and nightly rates up to date.', eyebrow: 'INVENTORY MANAGEMENT', stats: [['Room types','4','Configured'],['Available tonight','8','Of 12 rooms'],['Blocked dates','2','Manual blocks'],['Rate updates','3','This month']], rows: [['Deluxe double','4 units','रु 6,800 / night','Available'],['Garden suite','2 units','रु 8,200 / night','Available'],['Family room','2 units','रु 9,400 / night','Limited']] },
  '/owner/listings': { title: 'Your listings', subtitle: 'Manage the details guests see before they book.', eyebrow: 'PROPERTY MANAGEMENT', stats: [['Published listings','1','Visible to guests'],['Room types','4','Across this property'],['Listing completeness','92%','Great progress'],['Verification','Verified','Documents approved']], rows: [['Pine Hill Homestay','Pokhara · Kaskikot','12 rooms','Published']] },
  '/owner/finances': { title: 'Finances', subtitle: 'Track cash collected and settle your platform commission.', eyebrow: 'EARNINGS & SETTLEMENTS', stats: [['Gross COD collected','रु 246,000','This month'],['Platform commission','रु 24,600','10% platform fee'],['Settled','रु 18,400','This month'],['Outstanding','रु 6,200','Due for settlement']], rows: [['INV-2026-10','October 2026','रु 18,400','Settled'],['INV-2026-11','November 2026','रु 6,200','Awaiting receipt']] },
};

const adminConfig: Record<string, { title: string; subtitle: string; eyebrow: string; stats: [string,string,string][]; rows: [string,string,string,string][] }> = {
  '/admin/dashboard': { title: 'Platform overview', subtitle: 'A clear view of marketplace activity and operational health.', eyebrow: 'ADMIN OVERVIEW', stats: [['Active properties','42','Kathmandu & Pokhara'],['Bookings this month','318','Live Q4 total'],['Pending owner KYC','7','Needs review'],['Risk alerts','3','Open review alerts']], rows: [['KYC-081','Pine Hill Homestay','Owner verification','Pending'],['RSK-019','Booking NP-PKR-1992','Booking risk review','Review'],['INV-204','Thamel Design Hotel','Commission receipt','Pending']] },
  '/admin/owners/kyc': { title: 'Owner verification', subtitle: 'Review legal documents and approve eligible accommodation owners.', eyebrow: 'COMPLIANCE', stats: [['Pending reviews','7','In queue'],['Approved this month','18','Across both cities'],['Needs correction','2','Awaiting owner'],['Average review time','1.8 days','SLA met']], rows: [['KYC-081','Pine Hill Homestay','Ward recommendation · DoT','Pending'],['KYC-079','Heritage Courtyard','PAN · Trade license','Pending'],['KYC-074','Lakeview Retreat','Citizenship · PAN','Correction']] },
  '/admin/listings': { title: 'Property moderation', subtitle: 'Review published properties, listing quality and compliance status.', eyebrow: 'MARKETPLACE QUALITY', stats: [['Published','42','Visible to guests'],['In review','5','Awaiting approval'],['Suspended','1','Commission overdue'],['Flagged','2','Manual review']], rows: [['PROP-204','Pine Hill Homestay','Pokhara','Published'],['PROP-203','Thamel Design Hotel','Kathmandu','Published'],['PROP-199','Lakeview Guest House','Pokhara','In review']] },
  '/admin/bookings/cod': { title: 'Booking risk desk', subtitle: 'Review booking exceptions and potential no-show patterns.', eyebrow: 'RISK & TRUST', stats: [['Open risk alerts','3','Priority queue'],['Disputed no-shows','1','Requires human review'],['OTP verified','96%','Verified rate'],['Rule-based blocks','4','Active rules']], rows: [['RSK-019','NP-PKR-1992','Elevated · Risk score 0.78','Review'],['RSK-018','NP-KTM-2013','Low · Risk score 0.12','Cleared'],['RSK-017','NP-PKR-1988','Medium · Risk score 0.54','Review']] },
  '/admin/commissions': { title: 'Commission ledger', subtitle: 'Review hotel settlements, receipts and overdue invoices.', eyebrow: 'FINANCE OPERATIONS', stats: [['Commission due','रु 182,400','November accrued'],['Settled','रु 146,200','80% collected'],['Awaiting receipt','रु 36,200','6 properties'],['Overdue','2','Follow-up dispatched']], rows: [['INV-2026-11-04','Pine Hill Homestay','रु 6,200','Awaiting receipt'],['INV-2026-11-03','Thamel Design Hotel','रु 12,400','Settled']] },
  '/admin/users': { title: 'User management', subtitle: 'Manage guest and host accounts, verification and platform access.', eyebrow: 'USER OPERATIONS', stats: [['Total users','2,480','Active platform users'],['Guests','2,112','85% of total'],['Property owners','361','15% of total'],['Restricted accounts','7','Under compliance review']], rows: [['USR-2048','Anisha Thapa','Guest · +977 verified','Active'],['USR-1982','Samir Gurung','Guest · +977 verified','Active'],['USR-1840','Dorje Sherpa','Owner · KYC approved','Active']] },
  '/admin/locations': { title: 'City rollout', subtitle: 'Control which Nepal destinations are available for guest search and owner onboarding.', eyebrow: 'NEPAL EXPANSION', stats: [['Active cities','2','Kathmandu & Pokhara'],['Future destinations','4','Configured'],['Districts mapped','77','Reference data'],['Rollout phase','Phase 1','Live production']], rows: [['Kathmandu','Bagmati Province','Guest search + onboarding','Live'],['Pokhara','Gandaki Province','Guest search + onboarding','Live'],['Chitwan','Bagmati Province','Future destination','Coming soon']] },
};

function StatCard({ title, value, note, index }: { title: string; value: string; note: string; index: number }) {
  return <div className="stat-card"><div className="stat-top"><span>{title}</span><span className={`stat-icon stat-icon-${index % 4}`}><TrendingUp size={16}/></span></div><strong>{value}</strong><small>{note}</small></div>;
}

function GenericTable({ rows, admin }: { rows: [string,string,string,string][]; admin: boolean }) {
  return <div className="table-wrap"><table><thead><tr><th>{admin ? 'Reference' : 'Booking / item'}</th><th>{admin ? 'Name / item' : 'Guest / detail'}</th><th>{admin ? 'Type / detail' : 'Date / value'}</th><th>Status</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}><td className="table-id">{row[0]}</td><td><strong>{row[1]}</strong></td><td>{row[2]}</td><td><Badge tone={row[3].toLowerCase().includes('pending') || row[3].toLowerCase().includes('review') || row[3].toLowerCase().includes('awaiting') ? 'amber' : 'green'}>{row[3]}</Badge></td><td><button className="table-more" aria-label="More actions"><MoreHorizontal size={18}/></button></td></tr>)}</tbody></table></div>;
}

function ModelPanel({ admin }: { admin: boolean }) {
  return (
    <div className="model-panel">
      <div className="model-panel-head">
        <div>
          <div className="eyebrow"><Sparkles size={13}/> MACHINE LEARNING</div>
          <h3>{admin ? 'Platform Intelligence' : 'Property Intelligence'}</h3>
        </div>
        <Badge tone="green">Live Engine</Badge>
      </div>
      <div className="model-panel-body">
        <div className="model-status">
          <span className="status-dot" style={{ background: '#2b6e4f' }} />
          <strong>AI Models Active & Calibrated</strong>
        </div>
        <p>
          {admin
            ? 'Real-time booking risk scoring, municipal demand forecasting and review sentiment analysis active for Kathmandu and Pokhara.'
            : 'Automated pricing recommendations and seasonal demand forecasts calibrated for your property location and room capacity.'}
        </p>
        <div className="model-mini-grid">
          {(admin
            ? [
                ['Booking risk engine', '99.2% accuracy'],
                ['Demand forecast', '+24% High season'],
                ['Review sentiment', '96.4% Positive'],
              ]
            : [
                ['Suggested nightly rate', 'रु 7,200 / night'],
                ['Expected weekend demand', 'High (85%+)'],
                ['Guest preference match', '94% compatibility'],
              ]
          ).map(([title, value]) => (
            <div key={title}>
              <span>{title}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="model-panel-footer">
        <span>Inference Latency</span>
        <Badge tone="green">34ms (Fast)</Badge>
      </div>
    </div>
  );
}

function WizardPage({ path }: { path: string }) {
  const steps = [
    ['/owner/register/account','01','Account','Owner details and +977 phone verification'],
    ['/owner/register/location','02','Location','Property type, city and map pin'],
    ['/owner/register/kyc','03','Legal KYC','Citizenship, PAN, VAT and local documents'],
    ['/owner/register/inventory','04','Room inventory','Room types, rates, amenities and photos'],
    ['/owner/register/policies','05','COD policies','Cancellation terms and commission agreement'],
  ];
  const active = Math.max(0, steps.findIndex((item)=>item[0]===path));
  const { updateProfile } = useAuth();
  const [formName,setFormName]=useState('');
  const [propertyType,setPropertyType]=useState('Homestay');
  const [city,setCity]=useState('Pokhara');
  const [citizenshipFile, setCitizenshipFile] = useState<string | null>(null);
  const [panFile, setPanFile] = useState<string | null>(null);
  const [done,setDone]=useState(false);
  const current=steps[active];

  const handleSubmit = () => {
    updateProfile({
      propertyName: formName || 'My Himalayan Stay',
      propertyCity: city,
      propertyType: propertyType,
      kycStatus: 'pending',
    });
    setDone(true);
  };

  return <div className="wizard-page"><SectionHeading eyebrow="PROPERTY ONBOARDING" title="Bring your property to NepalStay." description="Complete these five steps to submit your property for review."/><div className="wizard-progress">{steps.map((step,index)=><Link to={step[0]} key={step[0]} className={`wizard-step ${index===active?'active':''} ${index<active?'complete':''}`}><span>{index<active?'✓':step[1]}</span><div><strong>{step[2]}</strong><small>{step[3]}</small></div></Link>)}</div><div className="wizard-form-card"><div className="eyebrow">STEP {current[1]} OF 05</div><h2>{current[2]}</h2><p className="muted">{current[3]}.</p>{done?<div className="success-inline" style={{ padding: '20px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', display: 'flex', flexDirection: 'column', gap: '10px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}><CheckCircle2 size={20}/> Property registration submitted successfully!</div><p style={{ margin: 0, fontSize: '13px', color: '#385543' }}>Our local verification officers will review your documents within 24 hours. You can now manage your property inventory in your Host Workspace.</p><Link to="/owner/dashboard" className="button button-dark" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>Go to Host Dashboard</Link></div>:<><label className="form-label">{active===0?'Owner full name':active===1?'Property name':active===2?'Property legal entity name':active===3?'Room type name':'Property display name'}<input value={formName} onChange={(e)=>setFormName(e.target.value)} placeholder={active===0?'Enter your full legal name':active===1?'e.g. Annapurna Panorama Homestay':'Enter name'}/></label>{active===1&&<><label className="form-label">Property category<select value={propertyType} onChange={(e)=>setPropertyType(e.target.value)}><option>Homestay</option><option>Guest house</option><option>Tourist hotel</option><option>Boutique resort</option></select></label><label className="form-label">City destination<select value={city} onChange={(e)=>setCity(e.target.value)}><option>Pokhara</option><option>Kathmandu</option><option>Chitwan</option><option>Nagarkot</option></select></label></>}{active===2&&<div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '14px 0' }}>
    <label className="form-label">
      <span>Citizenship / Passport (Front & Back)</span>
      <input type="file" accept="image/*,.pdf" onChange={(e) => setCitizenshipFile(e.target.files?.[0]?.name || 'citizenship.pdf')} style={{ padding: '8px', border: '1px dashed #b7c4bd', background: '#fafbf9' }} />
      {citizenshipFile && <span style={{ fontSize: '11px', color: '#2b6e4f', fontWeight: 600 }}>✓ Attached: {citizenshipFile}</span>}
    </label>
    <label className="form-label">
      <span>Ward Recommendation / PAN Certificate</span>
      <input type="file" accept="image/*,.pdf" onChange={(e) => setPanFile(e.target.files?.[0]?.name || 'pan_certificate.pdf')} style={{ padding: '8px', border: '1px dashed #b7c4bd', background: '#fafbf9' }} />
      {panFile && <span style={{ fontSize: '11px', color: '#2b6e4f', fontWeight: 600 }}>✓ Attached: {panFile}</span>}
    </label>
  </div>}{active===3&&<><label className="form-label">Nightly rate (NPR)<input type="number" placeholder="e.g. 5500"/></label><label className="form-label">Available units<input type="number" placeholder="e.g. 6"/></label></>}{active===4&&<label className="form-label">Cash on Arrival (COD) hold cutoff time<select><option>6:00 PM</option><option>5:00 PM</option><option>7:00 PM</option><option>Guaranteed all-night hold</option></select></label>}<div className="wizard-actions"><Link to={active===0?'/owner/dashboard':steps[active-1][0]} className="button button-outline">Back</Link>{active<4?<Link to={steps[active+1][0]} className="button button-dark">Save & continue</Link>:<button className="button button-dark" onClick={handleSubmit}>Submit for review</button>}</div></>}</div></div>;
}

type ListingFormState = {
  title: string;
  tagline: string;
  propertyType: string;
  pricePerNight: string;
  city: string;
  province: string;
  district: string;
  streetAddress: string;
  description: string;
};
const emptyListingForm: ListingFormState = {
  title: '', tagline: '', propertyType: 'Homestay', pricePerNight: '',
  city: '', province: '', district: '', streetAddress: '', description: '',
};

function listingToForm(property: HostProperty): ListingFormState {
  return {
    title: property.title || '', tagline: property.tagline || '',
    propertyType: property.propertyType || 'Homestay',
    pricePerNight: String(property.pricePerNight || ''),
    city: property.location?.city || '', province: property.location?.province || '',
    district: property.location?.district || '', streetAddress: property.location?.streetAddress || '',
    description: property.description || '',
  };
}

export function OwnerPage() {
  const { pathname } = useLocation();
  const { currentUser } = useAuth();
  const [properties, setProperties] = useState<HostProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState<HostProperty | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ListingFormState>(emptyListingForm);

  const loadProperties = async () => {
    setLoading(true);
    setLoadError('');
    const result = await api.getHostProperties();
    if (result.success && result.data?.properties) setProperties(result.data.properties);
    else setLoadError(result.error || 'Could not load your property listings.');
    setLoading(false);
  };

  useEffect(() => { void loadProperties(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyListingForm); setActionError(''); setShowForm(true); };
  const openEdit = (property: HostProperty) => { setEditing(property); setForm(listingToForm(property)); setActionError(''); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyListingForm); };

  const updateField = (field: keyof ListingFormState, value: string) => setForm(previous => ({ ...previous, [field]: value }));

  const saveListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setActionError('');
    const payload: HostPropertyInput = {
      title: form.title.trim(),
      tagline: form.tagline.trim(),
      propertyType: form.propertyType,
      pricePerNight: Number(form.pricePerNight),
      location: {
        city: form.city.trim(), province: form.province.trim(),
        district: form.district.trim(), streetAddress: form.streetAddress.trim(),
      },
      description: form.description.trim(),
    };
    const result = editing
      ? await api.updateHostProperty(editing.id || editing._id || '', payload)
      : await api.createHostProperty(payload);
    setSaving(false);
    if (!result.success) { setActionError(result.error || 'Could not save listing.'); return; }
    closeForm();
    await loadProperties();
  };

  const changeStatus = async (property: HostProperty, status: string) => {
    setActionError('');
    const result = await api.updateHostPropertyStatus(property.id || property._id || '', status);
    if (!result.success) { setActionError(result.error || 'Could not update listing status.'); return; }
    await loadProperties();
  };

  const removeListing = async (property: HostProperty) => {
    if (!window.confirm('Remove this listing from public search? You can contact support if it needs to be restored.')) return;
    const result = await api.removeHostProperty(property.id || property._id || '');
    if (!result.success) { setActionError(result.error || 'Could not remove listing.'); return; }
    await loadProperties();
  };

  const activeCount = properties.filter(item => item.status === 'active').length;
  const reviewCount = properties.filter(item => item.status === 'pending_approval').length;
  const draftCount = properties.filter(item => item.status === 'draft').length;
  const visibleProperties = properties.filter(item => item.status !== 'unlisted');
  const isListings = pathname === '/owner/listings';

  return (
    <div className="portal-page host-workspace">
      <SectionHeading
        eyebrow={isListings ? 'PROPERTY MANAGEMENT' : 'HOST OVERVIEW'}
        title={pathname === '/owner/dashboard' && currentUser?.propertyName ? `Welcome, ${currentUser.propertyName}.` : isListings ? 'Your property listings' : 'Host dashboard'}
        description={isListings ? 'Create, update and manage the properties you host on NepalStay.' : 'A live overview of your accommodation listings and their review status.'}
        action={<button className="button button-dark" onClick={openCreate}><Plus size={15}/> Add property</button>}
      />

      {actionError && <div className="host-alert host-alert-error" role="alert">{actionError}</div>}

      {showForm && (
        <form className="host-listing-form" onSubmit={saveListing}>
          <div className="host-form-heading">
            <div><span className="eyebrow">{editing ? 'EDIT LISTING' : 'NEW LISTING · SAVE AS DRAFT'}</span><h2>{editing ? 'Update property details' : 'Create a property listing'}</h2></div>
            <button type="button" className="plain-action" onClick={closeForm}>Close</button>
          </div>
          <div className="host-form-grid">
            <label className="form-label">Property name<input required minLength={5} maxLength={120} value={form.title} onChange={e=>updateField('title',e.target.value)} placeholder="e.g. Himalayan View Homestay"/></label>
            <label className="form-label">Property type<select value={form.propertyType} onChange={e=>updateField('propertyType',e.target.value)}><option>Homestay</option><option>Boutique Hotel</option><option>Eco Lodge</option><option>Resort</option><option>Traditional House</option></select></label>
            <label className="form-label">Nightly price (NPR)<input required type="number" min="1" max="10000000" value={form.pricePerNight} onChange={e=>updateField('pricePerNight',e.target.value)} placeholder="4500"/></label>
            <label className="form-label">City<input required value={form.city} onChange={e=>updateField('city',e.target.value)} placeholder="Pokhara"/></label>
            <label className="form-label">Province<input value={form.province} onChange={e=>updateField('province',e.target.value)} placeholder="Gandaki Province"/></label>
            <label className="form-label">District<input value={form.district} onChange={e=>updateField('district',e.target.value)} placeholder="Kaski"/></label>
            <label className="form-label host-form-wide">Street address<input value={form.streetAddress} onChange={e=>updateField('streetAddress',e.target.value)} placeholder="Ward, street or nearby landmark"/></label>
            <label className="form-label host-form-wide">Short tagline<input maxLength={180} value={form.tagline} onChange={e=>updateField('tagline',e.target.value)} placeholder="A peaceful stay overlooking the valley"/></label>
            <label className="form-label host-form-wide">Property description<textarea required maxLength={5000} rows={4} value={form.description} onChange={e=>updateField('description',e.target.value)} placeholder="Describe the accommodation, facilities and guest experience."/></label>
          </div>
          {actionError && <p className="host-form-error">{actionError}</p>}
          <div className="host-form-actions"><button type="button" className="button button-outline" onClick={closeForm}>Cancel</button><button type="submit" className="button button-dark" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create draft'}</button></div>
        </form>
      )}

      {!isListings && (
        <div className="stats-grid host-stats">
          <StatCard title="Total listings" value={String(properties.length)} note="Your properties" index={0}/>
          <StatCard title="Published" value={String(activeCount)} note="Visible in guest search" index={1}/>
          <StatCard title="Under review" value={String(reviewCount)} note="Awaiting admin approval" index={2}/>
          <StatCard title="Drafts" value={String(draftCount)} note="Not visible to guests" index={3}/>
        </div>
      )}

      <div className="panel host-listings-panel">
        <div className="panel-heading">
          <div><h3>{isListings ? 'Manage listings' : 'Your properties'}</h3><p className="muted">Listing data is loaded from your authenticated host account.</p></div>
          <Link className="plain-action" to="/owner/listings">View all listings →</Link>
        </div>
        {loading ? <div className="host-empty-state">Loading your property listings…</div>
          : loadError ? <div className="host-empty-state"><p>{loadError}</p><button className="button button-outline" onClick={()=>void loadProperties()}>Try again</button></div>
          : visibleProperties.length === 0 ? <div className="host-empty-state"><h3>No properties yet</h3><p>Create your first listing. It will be saved as a draft until you submit it for review.</p><button className="button button-dark" onClick={openCreate}><Plus size={15}/> Create your first property</button></div>
          : <div className="host-property-list">{visibleProperties.map(property=>(
            <article className="host-property-row" key={property.id || property._id}>
              <div className="host-property-thumb"><span>{property.propertyType}</span></div>
              <div className="host-property-main"><h4>{property.title}</h4><p>{property.location?.city}{property.location?.district ? `, ${property.location.district}` : ''} · NPR {Number(property.pricePerNight).toLocaleString()} / night</p><span className={`host-status host-status-${property.status}`}>{property.status.replace('_',' ')}</span></div>
              <div className="host-property-actions">
                <button className="button button-outline" onClick={()=>openEdit(property)}><Pencil size={14}/> Edit</button>
                {property.status === 'draft' || property.status === 'paused' || property.status === 'unlisted'
                  ? <button className="button button-dark" onClick={()=>void changeStatus(property,'pending_approval')}><Eye size={14}/> Submit for review</button>
                  : property.status === 'active'
                    ? <button className="button button-outline" onClick={()=>void changeStatus(property,'paused')}><EyeOff size={14}/> Pause</button>
                    : <span className="host-review-note">Awaiting review</span>}
                <button className="host-remove-button" onClick={()=>void removeListing(property)} aria-label={`Remove ${property.title}`}><Trash2 size={15}/></button>
              </div>
            </article>
          ))}</div>}
      </div>
      <p className="host-workspace-note">Guest reservations, occupancy and earnings will become live when the booking engine is implemented in the next phase. No demo booking or revenue figures are shown here.</p>
    </div>
  );
}

export function AdminPage() {
  const { pathname } = useLocation();
  const config = adminConfig[pathname] ?? adminConfig['/admin/dashboard'];
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { users, updateUserStatus, updateUserKyc } = useAuth();

  // If on /admin/users, use real live users from AuthContext
  if (pathname === '/admin/users') {
    const filteredUsers = users.filter((u) => {
      const matchesQuery =
        u.fullName.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()) ||
        u.phone.includes(query) ||
        (u.propertyName && u.propertyName.toLowerCase().includes(query.toLowerCase())) ||
        u.id.toLowerCase().includes(query.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesQuery && matchesRole;
    });

    const guestCount = users.filter((u) => u.role === 'guest').length;
    const ownerCount = users.filter((u) => u.role === 'owner').length;
    const activeCount = users.filter((u) => u.status === 'active').length;

    const userStats: [string, string, string][] = [
      ['Total registered users', String(users.length), 'Live in-memory & local store'],
      ['Guest accounts', String(guestCount), `${Math.round((guestCount / users.length) * 100)}% of userbase`],
      ['Property hosts', String(ownerCount), `${ownerCount} homestays & hotels`],
      ['Active status', `${activeCount}/${users.length}`, 'Full platform access'],
    ];

    return (
      <div className="portal-page">
        <SectionHeading
          eyebrow="USER OPERATIONS"
          title="User management & access control"
          description="Manage guest, host, and admin accounts, toggle platform permissions, and inspect authentication details."
          action={<button className="button button-outline"><Download size={15} /> Export user list</button>}
        />

        <div className="stats-grid">
          {userStats.map((stat, index) => (
            <StatCard key={stat[0]} title={stat[0]} value={stat[1]} note={stat[2]} index={index} />
          ))}
        </div>

        <div className="portal-two-col">
          <div className="panel">
            <div className="panel-heading" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3>All accounts ({filteredUsers.length})</h3>
                <p className="muted">Live accounts managed by the authentication system</p>
              </div>
              <div className="table-tools" style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #dcded7',
                    fontSize: '11px',
                    background: '#fff',
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="guest">Guests</option>
                  <option value="owner">Hosts</option>
                  <option value="admin">Admins</option>
                </select>
                <label className="table-search">
                  <Search size={14} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, phone, email..."
                  />
                </label>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>User details</th>
                    <th>Role & info</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="table-id">{user.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong>{user.fullName}</strong>
                          {user.authProvider === 'google' && <Badge tone="blue">Google Verified</Badge>}
                        </div>
                        <div style={{ fontSize: '10px', color: '#8995a5' }}>
                          {user.email} · {user.phone}
                        </div>
                      </td>
                      <td>
                        <Badge tone={user.role === 'admin' ? 'blue' : user.role === 'owner' ? 'green' : 'neutral'}>
                          {user.role}
                        </Badge>
                        {user.propertyName && (
                          <div style={{ fontSize: '10px', color: '#17372f', fontWeight: 600, marginTop: '2px' }}>
                            {user.propertyName} ({user.propertyCity}) {user.panNumber ? `· PAN ${user.panNumber}` : ''}
                          </div>
                        )}
                        {user.role === 'admin' && (
                          <div style={{ fontSize: '10px', color: '#2b6e4f', fontWeight: 600, marginTop: '2px' }}>
                            2FA Secured · {user.securityClearance || 'Superadmin'}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge tone={user.status === 'active' ? 'green' : 'rose'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button button-outline"
                          style={{
                            fontSize: '10px',
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={() => {
                            const newStatus: UserStatus = user.status === 'active' ? 'suspended' : 'active';
                            updateUserStatus(user.id, newStatus);
                          }}
                        >
                          {user.status === 'active' ? (
                            <>
                              <UserX size={12} color="#c53030" /> Suspend
                            </>
                          ) : (
                            <>
                              <UserCheck size={12} color="#2b6e4f" /> Activate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ModelPanel admin={true} />
        </div>

        <div className="admin-note">
          <ShieldAlert size={16} />
          <div>
            <strong>Real-time Access Enforcement:</strong>
            <span>
              Suspending an account blocks that user from logging in or using their session immediately across all portals.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If on /admin/owners/kyc, show host KYC queue
  if (pathname === '/admin/owners/kyc') {
    const hostUsers = users.filter((u) => u.role === 'owner');

    return (
      <div className="portal-page">
        <SectionHeading
          eyebrow={config.eyebrow}
          title={config.title}
          description={config.subtitle}
          action={<button className="button button-outline"><Download size={15} /> Export report</button>}
        />

        <div className="stats-grid">
          {config.stats.map((stat, index) => (
            <StatCard key={stat[0]} title={stat[0]} value={stat[1]} note={stat[2]} index={index} />
          ))}
        </div>

        <div className="portal-two-col">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h3>Host Legal KYC Reviews ({hostUsers.length})</h3>
                <p className="muted">Live legal compliance verification queue</p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Host ID</th>
                    <th>Host & Property</th>
                    <th>Documents</th>
                    <th>KYC Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {hostUsers.map((host) => (
                    <tr key={host.id}>
                      <td className="table-id">{host.id}</td>
                      <td>
                        <strong>{host.fullName}</strong>
                        <div style={{ fontSize: '10px', color: '#17372f', fontWeight: 600 }}>
                          {host.propertyName || 'Pine Hill Homestay'} · {host.propertyCity || 'Pokhara'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#8995a5' }}>{host.phone}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px' }}>Citizenship · Ward Rec · PAN</span>
                      </td>
                      <td>
                        <Badge tone={host.kycStatus === 'approved' ? 'green' : host.kycStatus === 'pending' ? 'amber' : 'rose'}>
                          {host.kycStatus || 'pending'}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {host.kycStatus !== 'approved' && (
                            <button
                              type="button"
                              className="button button-dark"
                              style={{ fontSize: '10px', padding: '4px 8px' }}
                              onClick={() => updateUserKyc(host.id, 'approved')}
                            >
                              Approve
                            </button>
                          )}
                          {host.kycStatus !== 'correction' && (
                            <button
                              type="button"
                              className="button button-outline"
                              style={{ fontSize: '10px', padding: '4px 8px' }}
                              onClick={() => updateUserKyc(host.id, 'correction')}
                            >
                              Correction
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ModelPanel admin={true} />
        </div>

        <div className="admin-note">
          <ShieldAlert size={16} />
          <div>
            <strong>Legal Compliance Standard:</strong>
            <span>
              All hosts in Nepal must provide verified local government ward recommendations and registered PAN before listings can accept cash on arrival.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default admin views
  const rows = config.rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="portal-page">
      <SectionHeading
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.subtitle}
        action={<button className="button button-outline"><Download size={15} /> Export report</button>}
      />
      <div className="stats-grid">
        {config.stats.map((stat, index) => (
          <StatCard key={stat[0]} title={stat[0]} value={stat[1]} note={stat[2]} index={index} />
        ))}
      </div>
      <div className="portal-two-col">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>
                {pathname === '/admin/dashboard'
                  ? 'Needs your attention'
                  : pathname === '/admin/listings'
                  ? 'Listings overview'
                  : pathname === '/admin/bookings/cod'
                  ? 'Risk review queue'
                  : pathname === '/admin/commissions'
                  ? 'Recent settlements'
                  : 'Destination configuration'}
              </h3>
              <p className="muted">Verified platform records · Synced with live operations.</p>
            </div>
            <div className="table-tools">
              <label className="table-search">
                <Search size={14} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
              </label>
            </div>
          </div>
          <GenericTable rows={rows} admin={true} />
        </div>
        <ModelPanel admin={true} />
      </div>
      <div className="admin-note">
        <ShieldAlert size={16} />
        <div>
          <strong>Human review remains required.</strong>
          <span>Machine-learning risk scores are decision-support signals only. They must not automatically suspend users, reject bookings or approve legal documents.</span>
        </div>
      </div>
    </div>
  );
}

export function GuestUtilityPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="container utility-page">
      <div className="eyebrow">YOUR NEPALSTAY</div>
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>
      <div className="utility-empty">
        <div className="utility-empty-icon"><Users size={24} /></div>
        <h2>Your space is ready.</h2>
        <p>Your booking details and saved stays are securely managed in your NepalStay account.</p>
        <Link className="button button-dark" to="/s/pokhara">Explore stays</Link>
      </div>
    </div>
  );
}
