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

### Frontend (React + Tailwind + Shadcn UI)
- [x] Landing page with event code entry (circular logo, serif headlines)
- [x] Auth pages (login/register for host/guest)
- [x] Profile setup wizard (3 steps)
- [x] Discover/swipe page with card animations
- [x] Matches list (rounded cards, floating nav)
- [x] Chat interface with AI suggestion button
- [x] Admin dashboard (payment, event creation, stats)
- [x] Consistent "tech-forward" design across all pages

### Design
- Brand: "aisle & after"
- Aesthetic: White, minimalist, tech-forward
- Fonts: Times New Roman (serif) + Inter (sans)
- Pattern: glass-header, card-modern, noise-bg, btn-pill, floating pill nav

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, Motor (MongoDB async)
- Database: MongoDB
- AI: Anthropic Claude Sonnet 4.5 (official SDK)
- Payments: Stripe (via emergentintegrations)
- Auth: JWT

## Key API Endpoints
- POST /api/auth/register, /api/auth/login, GET /api/auth/me
- POST /api/payments/checkout, GET /api/payments/status/{session_id}, GET /api/payments/check
- POST /api/events/create, /api/events/join, GET /api/events/current, GET /api/events/{id}/stats
- PUT /api/profile, GET /api/profile/{user_id}
- GET /api/discover, POST /api/swipe
- GET /api/matches
- GET /api/chat/{match_id}, POST /api/chat/send
- POST /api/ai/conversation-starters, POST /api/ai/compatibility

## Prioritized Backlog

### P1 (High)
- [ ] Real-time chat updates (WebSocket)
- [ ] Image upload to cloud storage
- [ ] Push notifications for new matches

### P2 (Medium)
- [ ] Promo codes for Stripe payment
- [ ] Update all text copy for consistent branding
- [ ] Profile photo gallery (multiple images)
- [ ] Block/report functionality
- [ ] Event expiration dates

### P3 (Low)
- [ ] Match analytics for hosts
- [ ] Guest check-in at event
- [ ] Shareable match stories

## Test Credentials
- Event Code: EULF18
- Guest: alice@demo.com / demo123
- Guest: marcus@demo.com / demo123
- Guest: sophie@demo.com / demo123
- Host: testhost@demo.com / demo123
- Match ID: d0942c71-bfcd-427e-a285-42fafc2a099c

## Notes
- Anthropic API key is integrated but requires credits to generate AI responses (falls back gracefully to pre-written starters)
- Stripe checkout opens in new tab to avoid preview environment rendering issues
- "Made with Emergent" badge is a preview-only overlay, not in app source code
