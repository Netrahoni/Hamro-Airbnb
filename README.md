# NepalStay AI — Frontend Starter

A React + TypeScript frontend prototype for the NepalStay AI accommodation discovery and booking platform.

## Included in this first frontend build

- Public Guest experience: landing page, city search, property details, demo checkout, trips/profile/wishlist placeholders, login and signup.
- Owner portal: dashboard, reservations, calendar/rates, listings, finances and a five-step onboarding wizard.
- Admin portal: dashboard, owner KYC, property moderation, COD booking-risk desk, commissions, users and city rollout.
- Five ML capability touchpoints: recommendations, price insights, booking-risk monitoring, demand forecasting and review sentiment. They are labelled as demo/prototype because no trained model or API is connected yet.
- Responsive layouts for desktop, tablet and mobile.

## Requirements

- Node.js 20.19+ or 22.12+ (Vite 8 requirement)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

## Main routes

### Guest

- `/` — Home
- `/s/:city` — City search results
- `/rooms/:listingId` — Property detail
- `/book/:listingId` — Demo checkout
- `/trips` and `/trips/:bookingId` — Guest reservations placeholders
- `/account` — Guest account placeholder
- `/wishlists` — Saved stays placeholder
- `/login`, `/signup` — Authentication UI placeholders

### Owner

- `/owner/dashboard`
- `/owner/reservations`
- `/owner/calendar`
- `/owner/listings`
- `/owner/finances`
- `/owner/register/account`
- `/owner/register/location`
- `/owner/register/kyc`
- `/owner/register/inventory`
- `/owner/register/policies`

### Admin

- `/admin/dashboard`
- `/admin/owners/kyc`
- `/admin/listings`
- `/admin/bookings/cod`
- `/admin/commissions`
- `/admin/users`
- `/admin/locations`

## Important prototype limitations

- All listings, booking records, KPIs, risk scores and price examples are demonstration data.
- Search is filtered against local demo data only. The map panel is a placeholder.
- Checkout OTP is simulated in the browser. No SMS, WhatsApp message, real booking or payment is sent or created.
- Authentication forms are not connected to an identity provider or backend.
- No ML model is trained or called. ML cards intentionally show prototype/offline states.
- No KYC document is uploaded or stored.

## Suggested next integrations

1. Connect the React application to FastAPI authentication and role-based permissions.
2. Replace local listing data with property/search APIs backed by PostgreSQL + PostGIS.
3. Add real booking, inventory locking, notifications and booking history.
4. Add ML inference endpoints only after data contracts, trained models and evaluation are ready.

## Project structure

```text
src/
  components/   Reusable brand, badges, listing cards, search bar and headings
  data/         Local demonstration listings
  layouts/      Public and role-specific portal layouts
  pages/        Guest, owner, admin and onboarding screens
  App.tsx       Application routes
  main.tsx      React entry point
  styles.css    Design system and responsive styles
```


## Brand direction — Thulo Bazaar reference

The visual system has been refined using the public Thulo Bazaar marketplace as a brand reference, while retaining a distinct hospitality identity for NepalStay AI. The reference emphasizes search-led discovery, category/listing browsing, clear listing imagery and visible trust/verification cues.

### Proposed palette (not official Thulo Bazaar HEX values)
- Primary navy: `#173B67`
- Action blue: `#2876C7`
- Trust gold: `#D5A343`
- Soft blue: `#EAF2FC`
- Page background: `#F7F9FC`
- Main text: `#202B3C`

### Typography
- Headings: Manrope (600–800)
- Body, labels and controls: DM Sans (400–700)

The blue/gold direction is inspired by Thulo Bazaar's blue individual-verification and gold business-verification cues. It is not a claim that these are the company's exact CSS tokens.


## Guest homepage refinement

The guest homepage has been refined around the Kathmandu and Pokhara pilot: clearer hero messaging, more accurate trust statements, destination-first discovery, sample-data disclosure, improved blue/gold styling, and check-in/check-out validation. Listing prices, ratings and inventory shown in the prototype are demonstration content, not live marketplace data.

## Property details page — current prototype scope

The property detail route (`/rooms/:listingId`) now includes an interactive photo lightbox, save/share actions, date and guest selectors, an illustrative nightly price calculation, property/host information, amenity examples, a map placeholder, and an AI price insight preview. Unknown listing IDs show a not-found state. Sample listings, photos, ratings, host details, amenities and fee assumptions are explicitly labelled as prototype content; no live inventory, verified host status, booking availability, payment or trained ML model is connected.

## Booking and checkout flow prototype

The booking route now carries check-in, check-out and guest values from the property page, allows guests to review or change those details, collects lead-guest contact information, shows an illustrative price breakdown, and presents payment preferences (cash at property or online) before a demo confirmation. The sample service fee is shown as 5% for interface demonstration only. The generated `NS-DEMO-...` reference is local UI state, not a server-side booking ID.

No live inventory check, host approval, SMS/OTP verification, payment gateway, COD settlement, email notification, or persistent booking record is connected. Cash-at-property and online payment are display preferences only; actual payment methods and booking rules must be implemented and confirmed by the platform backend before launch.
