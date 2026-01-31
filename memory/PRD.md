# aisle & after - Wedding Guest Dating App

## Original Problem Statement
Build a dating experience that matches the single guests of the bride and groom.

## User Personas
1. **Wedding Hosts (Bride/Groom)** - Create events, share codes, view match statistics
2. **Single Guests** - Join events, create profiles, swipe/match, chat with matches

## Core Requirements (Static)
- Guest matching based on preferences (gender, interests)
- Profile creation with photos, bio, interests
- Swipe/like functionality for discovery
- Real-time chat between matched users
- AI-powered conversation starters (Claude Sonnet 4.5)
- Admin dashboard for hosts

## What's Been Implemented (January 2026)
### Backend (FastAPI + MongoDB)
- [x] JWT authentication (register/login)
- [x] Event creation with unique codes
- [x] Profile management
- [x] Swipe/match system
- [x] Chat messaging
- [x] AI conversation starters (Claude via Emergent LLM key)
- [x] Compatibility analysis

### Frontend (React)
- [x] Landing page with event code entry
- [x] Auth pages (login/register)
- [x] Profile setup wizard (3 steps)
- [x] Discover/swipe page with card animations
- [x] Matches list
- [x] Chat interface with AI suggestions
- [x] Admin dashboard

### Design
- Brand: "aisle & after"
- Aesthetic: White, luxurious, minimal
- Font: Times New Roman
- Custom logo integrated

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✓

### P1 (High)
- [ ] Real-time chat updates (WebSocket)
- [ ] Push notifications for new matches
- [ ] Image upload to cloud storage

### P2 (Medium)
- [ ] Profile photo gallery (multiple images)
- [ ] Block/report functionality
- [ ] Event expiration dates

### P3 (Low)
- [ ] Match analytics for hosts
- [ ] Guest check-in at event
- [ ] Shareable match stories

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, Motor (MongoDB async)
- Database: MongoDB
- AI: Claude Sonnet 4.5 via Emergent integrations
- Auth: JWT

## Next Tasks
1. Add real-time WebSocket for chat
2. Cloud image storage (S3/Cloudinary)
3. Push notification system
