# aisle & after - Wedding Guest Dating App

## Original Problem Statement
Build a dating experience that matches the single guests of the bride and groom. The app allows hosts (bride/groom) to pay via Stripe, create events with unique codes, and guests use those codes to join, create profiles, swipe/match, and chat — with AI-powered conversation starters.

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- [x] JWT authentication (register/login)
- [x] Stripe payment with promo codes (LOVE2026=50%, WEDDING=25%, FREEAISLE=100%)
- [x] Event creation with unique collision-checked codes
- [x] Profile management with cloud photo upload (circular crop)
- [x] Swipe/match system with mutual like detection
- [x] Chat messaging with WebSocket real-time broadcast
- [x] AI conversation starters + compatibility (Anthropic Claude SDK)
- [x] Wedding Day Mode detection
- [x] Live activity stats
- [x] Bouquet Toss random matching (one-time per guest)
- [x] Public countdown endpoint + QR code generator
- [x] Photo upload/serve via Emergent object storage
- [x] In-app notification system (match notifications)

### Frontend (React + Tailwind + Shadcn UI)
- [x] Landing page with event code entry
- [x] Auth pages (login/register for host/guest)
- [x] Profile setup wizard with cloud photo upload
- [x] Discover/swipe page with live stats + notification bell
- [x] Matches list with real photos
- [x] Chat with WebSocket + AI suggestions
- [x] Admin dashboard with promo codes, live activity, QR download, countdown sharing
- [x] Countdown page with QR code (/countdown/:eventCode)
- [x] Confetti + Wedding Day banner + Bouquet Toss
- [x] Consistent branding copy across all pages

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, Motor (MongoDB async)
- Database: MongoDB
- AI: Anthropic Claude Sonnet 4.5 (official SDK)
- Payments: Stripe (via emergentintegrations) + promo codes
- Auth: JWT
- Real-time: WebSocket (native FastAPI)
- Storage: Emergent Object Storage (photos)
- QR: qrcode (Python)

## Key Routes
- / - Landing page
- /countdown/:eventCode - Public wedding countdown with QR
- /auth - Login/register
- /profile-setup - Guest profile wizard with photo upload
- /discover - Swipe/match with live stats + bell
- /matches - Match list
- /chat/:matchId - Chat with WebSocket
- /admin - Host dashboard

## Prioritized Backlog

### P2 (Medium)
- [ ] Multi-photo gallery on profiles
- [ ] Block/report functionality
- [ ] Event expiration dates
- [ ] Push notifications (service worker)

### P3 (Low)
- [ ] Guest check-in at event
- [ ] Shareable match stories
- [ ] Host analytics dashboard (charts)

## Test Credentials
- Event Code: EULF18 (Emma & James)
- Guest: alice@demo.com / demo123
- Guest: marcus@demo.com / demo123
- Guest: sophie@demo.com / demo123
- Host: testhost@demo.com / demo123
- Promo codes: LOVE2026 (50%), WEDDING (25%), FREEAISLE (free)
