# STACK.md — Technology Stack Recommendation

> **Status**: DRAFT — Awaiting human review and approval  
> **Last updated**: 2026-03-28  
> **Depends on**: PLAN.md (approved)

---

## 1. Recommended Stack (Quick View)

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Next.js 14 (App Router) | Full-stack: React frontend + API routes for Twilio in one repo. Deploys to Vercel in one click. |
| **UI Library** | React 18 | Component model fits 8-screen app. Stitch MCP generates React components directly via `react-components` skill. |
| **Styling** | Vanilla CSS + CSS Variables | Maximum control, no dependencies. Design tokens via CSS custom properties. |
| **Backend** | Next.js API Routes | Server-side Twilio calls. No separate backend server to manage. Secrets stay server-side. |
| **Database** | MongoDB Atlas (free tier) | Emergency contacts, journey logs, transit stop cache. MongoDB MCP already connected. |
| **SMS/Voice** | Twilio | Industry standard. SMS + Voice + programmable TTS. Trial account works for demo. |
| **Maps/Routing** | Google Maps Platform | Directions API (transit routing), Places API (safe spots), Maps JavaScript API (live map link) |
| **Deployment** | Vercel | Zero-config Next.js hosting. Free tier. HTTPS by default (required for Geolocation + Wake Lock). |
| **UI Design** | Google Stitch (MCP) | AI-generated screens, design system, export to React components |

---

## 2. Detailed Breakdown

### Frontend — Next.js 14 + React 18

**Why Next.js over alternatives:**

| Consideration | Next.js | Vite + React | Plain HTML/JS |
|---------------|---------|--------------|---------------|
| API routes (Twilio secrets) | ✅ Built-in server routes | ❌ Need separate Express server | ❌ Need separate server |
| Deployment | ✅ One-click Vercel | ⚠️ Need to configure hosting | ⚠️ Manual hosting |
| React component support | ✅ Native | ✅ Native | ❌ No components |
| Stitch → React pipeline | ✅ Direct via `react-components` skill | ✅ Same | ❌ Would need plain HTML from Stitch |
| SSR/SEO | ✅ Built-in | ❌ Client-only | ❌ Client-only |
| Complexity | ⚠️ More conventions to learn | ✅ Simpler | ✅ Simplest |
| Hackathon speed | ✅ Fast with templates | ✅ Very fast | ⚠️ More manual wiring |

> [!NOTE]
> **Alternative if you prefer simplicity**: We could use **Vite + React** for the frontend and deploy a tiny **Express server** on Railway/Render for the Twilio API calls. This adds one more deployment target but is simpler mentally.

### Browser APIs (No Libraries Needed)

These are all native browser APIs — zero npm packages required:

| API | Purpose | Browser Support | Notes |
|-----|---------|----------------|-------|
| **Geolocation** (`watchPosition`) | Continuous GPS tracking | All modern browsers | Requires HTTPS. Must be in foreground. |
| **Web Audio API** (`OscillatorNode`) | Alarm sound generation | All modern browsers | Must unlock AudioContext on user gesture |
| **SpeechSynthesis** | Voice shouting in Phase 3 | All modern browsers | Voice availability varies by device |
| **Vibration API** | Phone vibration patterns | Android Chrome ✅, iOS Safari ❌ | iOS has no Vibration API — audio-only fallback |
| **Screen Wake Lock** | Keep screen on during monitoring | Chrome, Edge, Firefox, Safari | Must re-acquire on visibility change |
| **DeviceMotion** (accelerometer) | Dead reckoning underground | All modern mobile browsers | P1 feature. Drift acceptable for <5 min tunnels |
| **Notifications API** | Backup notification if app backgrounded | All modern browsers | Permission required. Secondary to on-screen alarm |

### Backend — Next.js API Routes

Three server-side API routes handle all external service calls:

```
/api/sms/send       → Twilio SMS (emergency alert)
/api/sms/resolve     → Twilio SMS (I'm OK resolution)
/api/call/emergency  → Twilio Voice (automated call)
```

**Why server-side?**
- Twilio Account SID and Auth Token are **secrets** — cannot be exposed in client-side JavaScript
- API routes run on Vercel's serverless functions — no server to manage
- Each route is a simple ~20-line function

### Database — MongoDB Atlas

**Collections:**

| Collection | Purpose | Example Document |
|------------|---------|-----------------|
| `contacts` | Emergency contacts | `{ name: "Ate Rosa", phone: "+639171234567", userId: "maria_1" }` |
| `journeys` | Journey logs | `{ userId: "maria_1", destination: "Baclaran", startTime: ISODate, status: "missed" }` |
| `stops` | Transit stop coordinates | `{ name: "Baclaran Station", lat: 14.5341, lng: 120.9987, line: "LRT-1" }` |
| `venues` | Cached safe venues | `{ name: "McDonald's Taft", lat: 14.5340, lng: 120.9990, type: "restaurant", open24h: true }` |

> [!NOTE]
> For P0, MongoDB is used for **pre-seeded stop data and contact storage only**. All real-time state (GPS position, alarm phase, countdown) lives in React client state. No database latency in the critical demo path.

### External APIs

#### Twilio (SMS + Voice)

| Feature | API | Cost (Trial) | Cost (Paid) |
|---------|-----|-------------|-------------|
| Emergency SMS | `client.messages.create()` | Free (verified numbers only) | $0.0079/SMS |
| Resolution SMS | `client.messages.create()` | Free (verified numbers only) | $0.0079/SMS |
| Emergency Voice Call | `client.calls.create()` with TwiML `<Say>` | Free (verified numbers only) | $0.014/min |
| Phone Number | — | 1 free trial number | $1.15/month |

**Trial limitation**: Can only send to numbers you manually verify in the Twilio Console. For a demo video with 1-2 phones, this is fine. For a live demo to arbitrary numbers, upgrade to paid ($10 credit covers hundreds of messages).

#### Google Maps Platform

| API | Purpose | Free Tier |
|-----|---------|-----------|
| **Directions API** | Transit rerouting instructions | $5/1000 requests (starts with $200 free credit) |
| **Places API (Nearby Search)** | Find 24h safe venues | $5/1000 requests |
| **Maps JavaScript API** | Embed map in live location link | $7/1000 loads |
| **Geocoding API** | Convert stop names to coordinates | $5/1000 requests |

> [!TIP]
> Google gives **$200 free credit per month** on new Cloud projects. A hackathon demo will use maybe 50 API calls total — well within free tier.

---

## 3. Development Tooling

| Tool | Purpose |
|------|---------|
| **Node.js 20 LTS** | Runtime |
| **npm** | Package manager |
| **VS Code / Cursor** | Editor (Claude Code extension) |
| **Antigravity (Gemini)** | Orchestrator — feeds prompts to Stitch and Claude |
| **Stitch MCP** | UI screen generation and design system |
| **MongoDB MCP** | Database operations |
| **ngrok** | Tunnel for Twilio webhook testing (if needed for voice calls) |
| **Scrcpy** | Android screen mirroring for demo video recording |

---

## 4. Package Dependencies

Minimal dependency list — only what we truly need:

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "twilio": "^5.0.0",
    "mongodb": "^6.5.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

**Total production dependencies: 4** (Next.js, React, Twilio SDK, MongoDB driver)

That's it. Every other capability comes from native browser APIs.

---

## 5. Deployment Architecture

```mermaid
graph TB
    subgraph "Vercel (Free Tier)"
        A["Next.js Frontend<br/>React + CSS"] 
        B["API Route: /api/sms/send"]
        C["API Route: /api/sms/resolve"]
        D["API Route: /api/call/emergency"]
    end
    
    subgraph "External Services"
        E["Twilio<br/>SMS + Voice"]
        F["Google Maps Platform<br/>Directions + Places"]
        G["MongoDB Atlas<br/>Free Tier (512MB)"]
    end
    
    A -->|"fetch()"| B
    A -->|"fetch()"| C
    A -->|"fetch()"| D
    B --> E
    C --> E
    D --> E
    A -->|"client-side"| F
    B --> G
    
    H["User's Phone<br/>Chrome Android"] -->|"HTTPS"| A
    
    style A fill:#0070f3,color:#fff
    style E fill:#F22F46,color:#fff
    style F fill:#4285F4,color:#fff
    style G fill:#00ED64,color:#000
```

---

## 6. Environment Variables Needed

```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nudge

# App
NEXT_PUBLIC_APP_URL=https://nudge-app.vercel.app
```

---

## 7. Cost Summary

| Service | Free Tier | Demo Cost | Notes |
|---------|-----------|-----------|-------|
| Vercel | ✅ Free (hobby) | $0 | Free HTTPS, custom domain optional |
| MongoDB Atlas | ✅ Free (M0, 512MB) | $0 | More than enough for demo data |
| Google Maps | ✅ $200 free credit/month | $0 | ~50 requests max |
| Twilio (Trial) | ✅ Free trial credit | $0 | Verified numbers only |
| Twilio (Paid upgrade) | — | ~$10 | Recommended for reliability |
| **Total** | | **$0–$10** | |

---

## 8. Alternative Approaches (For Your Decision)

### Option A: Next.js Full-Stack (Recommended)
- **Pros**: One codebase, one deployment, API routes hide secrets, Vercel deploys instantly
- **Cons**: Slightly more complex than plain HTML, Next.js conventions to follow
- **Best for**: Demo that needs to actually send SMS from server-side

### Option B: Vite + React (Frontend) + Express (Backend)
- **Pros**: Simpler mental model, Vite is blazing fast in dev, more flexible
- **Cons**: Two deployments to manage, need CORS setup, more configuration
- **Best for**: If you prefer lightweight tooling and don't mind managing two services

### Option C: Plain HTML/CSS/JS + Express Backend
- **Pros**: Absolute simplest. No build step. No framework to learn.
- **Cons**: No component model (harder to manage 8 screens), no Stitch → React pipeline, more repetitive code
- **Best for**: If you want zero framework overhead and are comfortable with vanilla DOM manipulation

---

## 9. Credentials Checklist

Before we start building, you need these accounts and keys:

- [ ] **Twilio Account** → [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
  - Get Account SID and Auth Token from Console Dashboard
  - Get a Twilio phone number (free with trial)
  - Verify the demo recipient phone numbers
- [ ] **Google Cloud Project** → [console.cloud.google.com](https://console.cloud.google.com)
  - Enable: Maps JavaScript API, Directions API, Places API, Geocoding API
  - Create an API key (restrict to your domain for security)
- [ ] **MongoDB Atlas** → Already connected via MCP (confirm cluster details)
- [ ] **Vercel Account** → [vercel.com](https://vercel.com) (sign up with GitHub)
- [ ] **GitHub Repo** → For deployment pipeline (Vercel auto-deploys from GitHub)

---

## 10. Decisions Needing Your Sign-Off

> [!IMPORTANT]
> **Please confirm or change these choices before we proceed to STRUCTURE.md:**

| # | Decision | Recommendation | Your Call |
|---|----------|---------------|-----------|
| 1 | **Framework** | Next.js 14 (App Router) | Option A / B / C? |
| 2 | **Styling** | Vanilla CSS with CSS variables | OK or prefer Tailwind? |
| 3 | **Deployment** | Vercel (free tier) | OK or prefer another host? |
| 4 | **Database** | MongoDB Atlas (already connected via MCP) | OK or prefer something else? |
| 5 | **Twilio upgrade** | Recommend paid ($10) for reliability | OK with trial for now, or upgrade? |
