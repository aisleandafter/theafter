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
- [x] Live activity stats (guests, matches, today, recent names)
- [x] Bouquet Toss random matching (one-time per guest)
- [x] Public countdown endpoint
- [x] Photo upload/serve via Emergent object storage
- [x] In-app notification system (match notifications)
- [x] Promo code validation + 100% discount bypass

### Frontend (React + Tailwind + Shadcn UI)
- [x] Landing page with event code entry
- [x] Auth pages (login/register for host/guest)
- [x] Profile setup wizard with cloud photo upload
- [x] Discover/swipe page with live stats + bell notifications
- [x] Matches list with photo support
- [x] Chat with WebSocket + AI suggestions
- [x] Admin dashboard with promo codes, live activity, countdown sharing
- [x] Countdown page (/countdown/:eventCode) - shareable, public
- [x] Confetti + Wedding Day banner
- [x] Bouquet Toss

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, Motor (MongoDB async)
- Database: MongoDB
- AI: Anthropic Claude Sonnet 4.5 (official SDK)
- Payments: Stripe (via emergentintegrations) + promo codes
- Auth: JWT
- Real-time: WebSocket (native FastAPI)
- Storage: Emergent Object Storage (photos)

## Key API Endpoints
- Auth: POST /api/auth/register, /api/auth/login, GET /api/auth/me
- Payments: POST /api/payments/checkout (supports promo_code), GET /api/payments/status/{id}, GET /api/payments/check
- Promo: POST /api/promo/validate
- Events: POST /api/events/create, /api/events/join, GET /api/events/current, /api/events/{id}/stats
- Wedding: GET /api/events/wedding-day-mode, /api/events/live-stats
- Countdown: GET /api/countdown/{event_code} (PUBLIC)
- Profile: PUT /api/profile, GET /api/profile/{user_id}
- Photos: POST /api/photos/upload, GET /api/photos/{file_id} (PUBLIC)
- Discovery: GET /api/discover, POST /api/swipe, POST /api/bouquet-toss
- Matches: GET /api/matches
- Chat: GET /api/chat/{match_id}, POST /api/chat/send, WS /ws/chat/{match_id}
- AI: POST /api/ai/conversation-starters, /api/ai/compatibility
- Notifications: GET /api/notifications, POST /api/notifications/read-all

## Prioritized Backlog

### P1 (High)
- [ ] QR code generator for countdown page (shareable on invitations)
- [ ] Text copy branding pass across all pages

### P2 (Medium)
- [ ] Multi-photo gallery on profiles
- [ ] Block/report functionality
- [ ] Event expiration dates
- [ ] Push notifications (service worker)

### P3 (Low)
- [ ] Guest check-in at event
- [ ] Shareable match stories
- [ ] Host analytics dashboard

## Test Credentials
- Event Code: EULF18
- Guest: alice@demo.com / demo123
- Guest: marcus@demo.com / demo123
- Guest: sophie@demo.com / demo123
- Host: testhost@demo.com / demo123
- Promo codes: LOVE2026 (50%), WEDDING (25%), FREEAISLE (free)

## Notes
- Anthropic API key integrated, requires account credits for AI generation
- Photos are circle-cropped server-side and served publicly at /api/photos/{id}
- Promo code FREEAISLE bypasses Stripe entirely (instant paid_free=true)
- WebSocket reconnects automatically on disconnect (3s delay)
