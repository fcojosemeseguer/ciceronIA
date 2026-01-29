# CiceronAI Quick Reference Guide

## One-Command Setup (Everything)

```bash
# Terminal 1: Frontend
cd frontend && npm install && npm start

# Terminal 2: Backend
cd backend && npm install && npm run dev

# Terminal 3: Database (Docker)
docker run -d --name ciceron-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ciceron_ai \
  -p 5432:5432 \
  postgres:15-alpine
```

**Then visit:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api/docs

---

## Frontend Only (No Backend)

```bash
cd frontend
npm install
npm start
```

**Expected Behavior:**
- SetupScreen loads
- Enter team names and topic
- Click "INICIAR DEBATE"
- ✅ Timer starts automatically
- ✅ All buttons responsive
- ✅ Audio records per round

**Known Limitations:**
- Audio data not saved (no backend)
- No data persistence (page refresh = reset)

---

## Backend Only (No Frontend)

```bash
# Start PostgreSQL first (Docker)
docker run -d --name ciceron-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ciceron_ai \
  -p 5432:5432 \
  postgres:15-alpine

# Start backend
cd backend
npm install
npm run dev
```

**Test via Swagger UI:**
1. Open http://localhost:5000/api/docs
2. Click "Try it out" on any endpoint
3. Execute requests directly in browser

**Available Endpoints:**
- `POST /api/debates` - Create debate
- `GET /api/debates/{id}` - Get debate
- `GET /api/debates` - List all debates
- `POST /api/debates/{id}/recordings` - Upload recording
- `GET /api/debates/{id}/recordings` - Get recordings
- `POST /api/debates/{id}/evaluations` - Create evaluation
- `GET /api/debates/{id}/evaluations` - Get evaluations

---

## Full System (Frontend + Backend + Database)

### Prerequisites
- Node.js 18+ installed
- Docker installed (for PostgreSQL)

### Step-by-Step

**1. Start Database (Terminal 1)**
```bash
docker run -d --name ciceron-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ciceron_ai \
  -p 5432:5432 \
  postgres:15-alpine

# Wait 5 seconds for startup...
```

**2. Start Backend (Terminal 2)**
```bash
cd backend
npm install
npm run dev
```

**Console should show:**
```
🚀 Server running on http://localhost:5000
✅ Connected to PostgreSQL
📚 Swagger UI: http://localhost:5000/api/docs
```

**3. Start Frontend (Terminal 3)**
```bash
cd frontend
npm install
npm start
```

**Browser should open:**
```
http://localhost:3000
SetupScreen displayed and ready
```

### Test the Full System

1. **Setup Screen**
   - Team A: "Red Squad"
   - Team B: "Blue Team"
   - Topic: "Climate Change"
   - Click "INICIAR DEBATE"

2. **Competition Screen**
   - ✅ Timer starts automatically
   - ✅ Audio records per round
   - ✅ Buttons respond to clicks

3. **Backend Integration** (Check Swagger UI)
   - Open http://localhost:5000/api/docs
   - GET `/api/debates` 
   - Should see the debate you created
   - Data is now persistent in PostgreSQL

---

## Stopping Services

```bash
# Stop frontend (Terminal 3)
Ctrl+C

# Stop backend (Terminal 2)
Ctrl+C

# Stop PostgreSQL (Terminal 1)
docker stop ciceron-postgres
docker rm ciceron-postgres
```

---

## Common Issues & Fixes

### Issue: "Cannot find module" error
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Backend says "Cannot connect to PostgreSQL"
**Solution:**
```bash
# Check if Docker is running
docker ps

# If not, start PostgreSQL:
docker run -d --name ciceron-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ciceron_ai \
  -p 5432:5432 \
  postgres:15-alpine
```

### Issue: Port 3000 already in use
**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Then restart frontend
npm start
```

### Issue: Port 5000 already in use
**Solution:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Then restart backend
npm run dev
```

### Issue: Timer doesn't start automatically
**Solution:**
1. Open DevTools (F12)
2. Check Console tab
3. Should see: "🎬 Auto-starting debate from setup..."
4. If missing, restart frontend: `npm start`

### Issue: Buttons don't respond
**Solution:**
1. Verify timer is running (count
down visible)
2. Check debate state (should be "running")
3. Refresh page (Ctrl+R)
4. Restart frontend if still stuck

### Issue: App doesn't fit in window
**Solution:**
1. Check App.tsx has `w-full h-screen` (not `w-screen`)
2. Clear browser cache: Ctrl+Shift+Delete
3. Restart frontend

---

## Environment Setup

### Backend `.env` File
```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ciceron_ai
NODE_ENV=development

# Server
PORT=5000
CORS_ORIGIN=http://localhost:3000

# (Optional) For Phase 2 - AI Integration
# OPENAI_API_KEY=sk-proj-...
# OPENAI_ORG_ID=org-...
```

### Frontend `.env` File
```
# API
REACT_APP_API_URL=http://localhost:5000

# Debug logging
REACT_APP_DEBUG=true
```

---

## Project Structure Quick Lookup

| Location | Purpose |
|----------|---------|
| `frontend/src/App.tsx` | Root component (fixed layout) |
| `frontend/src/components/screens/SetupScreen.tsx` | Team setup form |
| `frontend/src/components/screens/CompetitionScreen.tsx` | Main debate interface (has auto-start) |
| `frontend/src/store/debateStore.ts` | Zustand state machine |
| `frontend/src/hooks/` | Timer, audio, recording logic |
| `backend/src/server.ts` | Express server entry point |
| `backend/src/routes/api.ts` | All API endpoints |
| `backend/src/controllers/` | Request handlers |
| `backend/src/services/` | Database & business logic |

---

## Development Workflow

### Adding a Feature
1. Create branch: `git checkout -b feature/my-feature`
2. Make changes (frontend or backend)
3. Test locally
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request on GitHub

### Making a Bug Fix
1. Create branch: `git checkout -b fix/bug-name`
2. Find and fix the bug
3. Test the fix
4. Commit: `git commit -m "fix: describe the fix"`
5. Push and create Pull Request

### Running Tests
```bash
# Frontend
cd frontend
npm test

# Backend
cd backend
npm test
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `TESTING_AND_INTEGRATION.md` | Testing guide (✨ new) |
| `PHASE_2_AI_INTEGRATION.md` | Phase 2 plan (✨ new) |
| `IMPLEMENTATION_SUMMARY.md` | How everything works |
| `FRONTEND_FIXES.md` | Technical details of frontend fixes |
| `FRONTEND_FIXES_SUMMARY.md` | Visual before/after diagrams |
| `backend/API.md` | All 15 API endpoints with examples |
| `backend/DATABASE.md` | Database schema and setup |
| `backend/BACKEND_OVERVIEW.md` | Backend architecture |
| `frontend/README.md` | Frontend-specific details |
| `backend/README.md` | Backend-specific details |

---

## Key Code Locations

### Frontend Fixes (Phase 1)
- **Layout fix**: `frontend/src/App.tsx` line 34
- **Auto-start**: `frontend/src/components/screens/CompetitionScreen.tsx` lines 85-90
- **Button fix**: `frontend/src/components/common/Controls.tsx` line 58

### Backend Services
- **Database**: `backend/src/services/database.ts`
- **Debate logic**: `backend/src/services/postgresDebateStore.ts`
- **API routes**: `backend/src/routes/api.ts`
- **Error handling**: `backend/src/middleware/errorHandler.ts`

### Frontend State Management
- **State machine**: `frontend/src/store/debateStore.ts`
- **Timer logic**: `frontend/src/hooks/useDebateTimer.ts`
- **Audio recording**: `frontend/src/hooks/useAutoAudioRecording.ts`
- **Round sequence**: `frontend/src/utils/roundsSequence.ts`

---

## Git Workflow

### View Recent Changes
```bash
git log --oneline -10
```

### See Uncommitted Changes
```bash
git status
git diff
```

### Commit Changes
```bash
git add .
git commit -m "Your message"
git push
```

### View Branches
```bash
git branch -a
```

### Create New Branch
```bash
git checkout -b feature/name
```

---

## Performance Optimization Tips

### Frontend
- Use DevTools Lighthouse (F12 → Lighthouse tab)
- Check FPS (DevTools → Performance tab)
- Monitor memory leaks (DevTools → Memory tab)

### Backend
- Monitor request times
- Check database query performance
- Use PostgreSQL EXPLAIN ANALYZE
- Look for N+1 query problems

### Both
- Monitor bundle size
- Use production builds for testing
- Check network waterfall (DevTools → Network)

---

## Useful Terminal Commands

```bash
# Navigate to directories
cd frontend     # React app
cd backend      # Express server

# Install dependencies
npm install
npm ci           # Cleaner install

# Run development servers
npm start        # Frontend
npm run dev      # Backend

# Build for production
npm run build    # Frontend
npm run build    # Backend

# Run tests
npm test

# View git history
git log --oneline
git log --graph --all

# See changes
git status
git diff
git diff HEAD~1

# Stash changes temporarily
git stash
git stash pop

# Reset changes
git restore .           # Discard all local changes
git restore filename    # Discard changes to one file
```

---

## Deployment Preview

When ready for production:

```bash
# Frontend build
cd frontend
npm run build
# Produces: build/ directory (ready for hosting)

# Backend build
cd backend
npm run build
npm start
# Starts from compiled JavaScript
```

**Deployment Targets:**
- Frontend: Vercel, Netlify, AWS S3
- Backend: Heroku, Railway, AWS EC2, DigitalOcean
- Database: AWS RDS, Heroku Postgres, ElephantSQL

---

## Support & Resources

### Documentation
- OpenAI Whisper API: https://platform.openai.com/docs/guides/speech-to-text
- GPT-4 API: https://platform.openai.com/docs/guides/gpt-4
- React Docs: https://react.dev
- Express Docs: https://expressjs.com
- PostgreSQL Docs: https://www.postgresql.org/docs
- Zustand Docs: https://github.com/pmndrs/zustand

### Getting Help
- Check the documentation files first
- Look at similar code in the repository
- Search GitHub issues
- Ask in comments with clear problem description

### Reporting Issues
- GitHub Issues: https://github.com/anomalyco/opencode/issues
- Include error message and steps to reproduce
- Mention which terminal/file you're in

---

## Session Summary

### What We Just Completed
✅ Fixed 3 critical frontend issues (layout, timer, buttons)  
✅ Created comprehensive testing guide  
✅ Documented Phase 2 AI integration plan  
✅ Committed all changes to git  
✅ This quick reference guide  

### Current Status
✅ Frontend ready for testing on localhost:3000  
✅ Backend ready for testing on localhost:5000  
✅ Database ready (Docker)  
✅ All documentation complete  

### Next Steps
1. Test frontend ↔ backend integration
2. Verify data persists in PostgreSQL
3. Plan Phase 2 implementation
4. Start AI integration work

---

## Quick Links

| Resource | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000 |
| API Docs | http://localhost:5000/api/docs |
| GitHub | https://github.com/anomalyco/ciceronAI |
| Issues | https://github.com/anomalyco/ciceronAI/issues |

---

**Status: READY FOR TESTING** 🚀

Last Updated: January 29, 2026
