# NepalStay AI — Production Application Screen Architecture

NepalStay AI is a full-scale, AI-powered accommodation booking and property management platform designed for the Nepalese hospitality market. The application consists of three interconnected portals: Guest, Hotel Owner, and Platform Administration.

The platform is designed around real-world booking operations, secure authentication, property management, reservation processing, financial transactions, AI-powered intelligence, and centralized administration.

The architecture contains **23 screen-level views** across three portals, with reusable components, dynamic routing, role-based access, and integrated application workflows.

## Guest Portal — 6 Screen Groups

| Screen | Route | Functional Implementation |
|---|---|---|
| Home and destination discovery | `/` | Dynamic destination discovery, personalized recommendations, featured properties, trending locations, search functionality and AI-powered recommendations. |
| City search and filters | `/s/:city` | Live property search, advanced filters, sorting, availability checking, interactive maps, location-based discovery and personalized ranking. |
| Property details | `/rooms/:listingId` | Complete property information, verified photographs, amenities, room availability, pricing, reviews, host information and booking options. |
| Checkout and booking verification | `/book/:listingId` | Real booking workflow, guest information, date validation, room selection, COD booking, OTP verification and booking confirmation. |
| Trips and booking details | `/trips`, `/trips/:bookingId` | Booking history, upcoming reservations, booking status, cancellation requests, reservation details and downloadable confirmations. |
| Account and wishlists | `/account`, `/wishlists` | User profile, account settings, saved properties, personal preferences, security settings and wishlist management. |

## Hotel Owner Portal — 10 Screen-Level Views

The owner portal provides a complete property management environment where accommodation providers can register, manage their properties, control inventory, handle reservations and monitor business performance.

| Screen | Route | Functional Implementation |
|---|---|---|
| Registration: Account | `/owner/register/account` | Owner registration, secure account creation, email/phone verification and business profile setup. |
| Registration: Location | `/owner/register/location` | Property address, geographical coordinates, location selection, map integration and address verification. |
| Registration: Legal KYC | `/owner/register/kyc` | Identity verification, legal document submission, document storage and administrative verification workflow. |
| Registration: Inventory | `/owner/register/inventory` | Property information, room categories, room capacity, amenities, photographs, facilities and inventory configuration. |
| Registration: COD Policies | `/owner/register/policies` | Booking conditions, COD eligibility, cancellation policies, check-in requirements and guest verification rules. |
| Owner Dashboard | `/owner/dashboard` | Live business overview, reservations, occupancy, revenue, booking performance, notifications and AI-powered business insights. |
| Reservations | `/owner/reservations` | Reservation management, booking confirmation, guest information, check-in/check-out tracking, cancellations and booking status updates. |
| Calendar and Rates | `/owner/calendar` | Real-time room availability, inventory control, seasonal pricing, rate adjustments, blocked dates and reservation synchronization. |
| Listings Management | `/owner/listings` | Create, edit, publish, unpublish and manage properties, room categories, photographs, descriptions and amenities. |
| Finances | `/owner/finances` | Revenue tracking, commission deductions, settlement records, COD reconciliation, transaction history and financial reports. |

## Admin Portal — 7 Screen-Level Views

The administration portal provides centralized operational control over the entire NepalStay AI ecosystem, including users, property owners, listings, reservations, commissions, geographical expansion and AI-powered monitoring.

| Screen | Route | Functional Implementation |
|---|---|---|
| Admin Dashboard | `/admin/dashboard` | Platform-wide KPIs, booking analytics, revenue, active users, registered properties, occupancy and operational monitoring. |
| Owner KYC Inspector | `/admin/owners/kyc` | Owner verification queue, document inspection, approval, rejection, verification history and compliance management. |
| Property Moderation | `/admin/listings` | Property review, listing approval, rejection, content moderation, quality control and publication management. |
| COD Booking-Risk Desk | `/admin/bookings/cod` | AI-powered booking-risk assessment, suspicious booking detection, risk scoring, verification recommendations and manual review. |
| Commission Management | `/admin/commissions` | Commission configuration, platform fees, owner settlements, transaction reconciliation and financial reporting. |
| User Management | `/admin/users` | Guest and owner account management, role permissions, account verification, suspension and activity monitoring. |
| Location Rollout | `/admin/locations` | City and destination management, geographical coverage, market expansion, property distribution and location performance analytics. |

## Shared AI and Machine Learning Architecture

Artificial intelligence is a core component of NepalStay AI. Machine learning capabilities should be integrated into actual platform workflows rather than displayed as isolated informational features.

| ML Capability | Integration Points | Functional Implementation |
|---|---|---|
| Personalized Recommendations | Guest homepage and city search | Recommendation engine using user preferences, browsing behaviour, booking history, property attributes and destination preferences. |
| Price Prediction | Property details and owner dashboard | Predictive pricing intelligence using location, seasonality, property characteristics, historical pricing and market demand. |
| Booking-Risk Prediction | Admin COD risk desk | Classification model estimating booking cancellation and no-show risk using historical reservation patterns and relevant booking features. |
| Demand Forecasting | Admin intelligence monitor and owner dashboard | Forecasting future booking demand, occupancy trends and seasonal market behaviour. |
| Review Sentiment Analysis | Admin intelligence monitor and property insights | Natural language processing to classify customer reviews, identify recurring complaints and extract satisfaction trends. |

### AI Integration Requirements

- Develop independent ML pipelines for recommendation, price prediction, booking-risk assessment, demand forecasting and sentiment analysis.
- Connect model inference through backend APIs.
- Store relevant historical data for training, validation and model improvement.
- Implement model evaluation, prediction logging and performance monitoring.
- Provide meaningful AI-generated insights through guest, owner and administrator interfaces.
- Maintain fallback mechanisms when model predictions are unavailable.
- Ensure appropriate privacy, security and responsible data handling.

## Production Engineering and Platform Integration

The application must operate as a connected production system rather than a collection of independent screens.

### 1. Backend and Database
- Implement a centralized backend architecture with RESTful APIs.
- Establish persistent database storage for users, owners, properties, rooms, reservations, transactions, reviews and platform configurations.
- Implement data validation, relational integrity, error handling and audit logging.

### 2. Authentication and Authorization
- Secure guest, owner and administrator authentication.
- Implement role-based access control.
- Support email and phone verification, OTP authentication and password recovery.
- Protect sensitive routes and administrative operations.

### 3. Booking and Reservation Management
- Implement real-time room availability validation.
- Prevent conflicting reservations and double bookings.
- Support COD booking workflows and booking verification.
- Implement cancellation, confirmation, reservation status updates and notification workflows.

### 4. Payment and Financial Management
- Integrate supported payment gateways for Nepal.
- Implement COD reconciliation and financial tracking.
- Calculate platform commissions and owner settlements.
- Maintain transaction records and payment status verification.

### 5. Maps and Location Services
- Integrate interactive maps and geographical coordinates.
- Support location-based property discovery.
- Display property locations and nearby destinations.
- Implement geographical search and distance-based filtering.

### 6. Notifications and Communication
- Integrate email and SMS notification providers.
- Provide booking confirmations, OTP messages, cancellation notifications and reservation updates.
- Implement owner and administrator notification systems.

### 7. Security and Reliability
- Implement secure API authentication and authorization.
- Protect sensitive user and business information.
- Validate uploaded files and documents.
- Apply rate limiting, input sanitization and secure session management.
- Implement error monitoring, logging, backups and recovery mechanisms.

## Overall Project Objective

Transform NepalStay AI into a fully operational, scalable and intelligent accommodation booking ecosystem for Nepal.

The final platform must connect all three portals through a unified backend, shared database, secure authentication, real reservation workflows, financial operations, location services and integrated machine learning capabilities.

Every screen must serve a functional purpose within the application ecosystem. All displayed information should originate from persistent application data or verified external services, and every user action should produce the appropriate application-level result.

The architecture should support future expansion across Nepalese cities, accommodation categories, hospitality businesses and additional AI-driven services.