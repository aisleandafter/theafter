# aisle & after - Wedding Guest Dating App

## Original Problem Statement
Build a dating experience that matches the single guests of the bride and groom. The app allows hosts (bride/groom) to pay via Stripe, create events with unique codes, and guests use those codes to join, create profiles, swipe/match, and chat — with AI-powered conversation starters.

## User Personas
1. **Wedding Hosts (Bride/Groom)** - Create events, share codes, view match statistics
2. **Single Guests** - Join events, create profiles, swipe/match, chat with matches

## Core Requirements
- Host: Register, pay via Stripe, create event, share unique code, view dashboard
- Guest: Join via event code, create profile (photo, bio, interests, fun fact), discover/swipe, match, chat
- AI: Conversation starters and compatibility analysis via Anthropic Claude
- Design: Tech-forward, minimalist, black-and-white aesthetic

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- [x] JWT authentication (register/login)
- [x] Stripe payment integration for event creation
- [x] Event creation with unique collision-checked codes
- [x] Profile management (multi-field)
- [x] Swipe/match system with mutual like detection
- [x] Chat messaging (send/receive)
- [x] AI conversation starters (Anthropic Claude SDK)
- [x] AI compatibility analysis (Anthropic Claude SDK)
- [x] Payment webhook handling
- [x] Wedding Day Mode detection (auto-activates on wedding date)
- [x] Live activity stats (guests, matches, today's matches, recent match names)
- [x] Bouquet Toss random matching (one-time per guest per event)
- [x] Public countdown endpoint (no auth required)
- [x] WebSocket real-time chat (broadcast on message send)

### Frontend (React + Tailwind + Shadcn UI)
- [x] Landing page with event code entry
- [x] Auth pages (login/register for host/guest)
- [x] Profile setup wizard (3 steps)
- [x] Discover/swipe page with card animations
- [x] Matches list (rounded cards, floating nav)
- [x] Chat interface with AI suggestion button + WebSocket live updates
- [x] Admin dashboard (payment, event creation, stats, live activity)
- [x] Consistent "tech-forward" design across all pages
- [x] Live stats bar on Discover page
- [x] Bouquet Toss with one-time use
- [x] Confetti animation on wedding day matches
- [x] Wedding Day banner
- [x] Countdown page (/countdown/:eventCode) - shareable, public
- [x] Share countdown link from admin dashboard

### Key Routes
- / - Landing page
- /countdown/:eventCode - Public wedding countdown (shareable)
- /auth - Login/register
- /profile-setup - Guest profile wizard
- /discover - Swipe/match
- /matches - Match list
- /chat/:matchId - Chat with WebSocket
- /admin - Host dashboard

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, Motor (MongoDB async)
- Database: MongoDB
- AI: Anthropic Claude Sonnet 4.5 (official SDK)
- Payments: Stripe (via emergentintegrations)
- Auth: JWT
- Real-time: WebSocket (native FastAPI)

## Key API Endpoints
- POST /api/auth/register, /api/auth/login, GET /api/auth/me
- POST /api/payments/checkout, GET /api/payments/status/{session_id}, GET /api/payments/check
- POST /api/events/create, /api/events/join, GET /api/events/current, GET /api/events/{id}/stats
- GET /api/events/wedding-day-mode, GET /api/events/live-stats
- GET /api/countdown/{event_code} (PUBLIC)
- PUT /api/profile, GET /api/profile/{user_id}
- GET /api/discover, POST /api/swipe
- POST /api/bouquet-toss
- GET /api/matches
- GET /api/chat/{match_id}, POST /api/chat/send
- WS /ws/chat/{match_id}?token={jwt}
- POST /api/ai/conversation-starters, POST /api/ai/compatibility

## Prioritized Backlog

### P1 (High)
- [ ] Image upload to cloud storage (profile photos)
- [ ] Push notifications for new matches

### P2 (Medium)
- [ ] Promo codes for Stripe payment
- [ ] Update all text copy for consistent branding
- [ ] Profile photo gallery (multiple images)
- [ ] Block/report functionality
- [ ] Event expiration dates

### P3 (Low)
- [ ] Guest check-in at event
- [ ] Shareable match stories

## Test Credentials
- Event Code: EULF18
- Guest: alice@demo.com / demo123
- Guest: marcus@demo.com / demo123
- Guest: sophie@demo.com / demo123
- Host: testhost@demo.com / demo123

## Notes
- Anthropic API key integrated, requires account credits for AI generation (graceful fallback to pre-written starters)
- Stripe checkout opens in new tab to avoid preview environment issues
- Wedding Day Mode auto-activates when today matches event's wedding_date
- Bouquet Toss enforced one-time per guest per event
- WebSocket reconnects automatically on disconnect (3s delay)
- Countdown page is fully public/shareable, no auth needed
