# TASKS.md — Ordered Build Task List

> **Status**: DRAFT — Awaiting human review and approval  
> **Last updated**: 2026-03-28  
> **Convention**: Each task is self-contained and detailed enough for an AI agent to execute without ambiguity.

---

## Phase 1 — Project Setup

### Task 1: Scaffold Next.js Project
**Agent**: Claude  
**Depends on**: Nothing  
**Priority**: P0

**Do this:**
1. Run `npx -y create-next-app@latest ./` in the `nudge-1` directory with these options:
   - TypeScript: No (plain JavaScript for speed)
   - ESLint: Yes
   - Tailwind: No
   - `src/` directory: No
   - App Router: Yes
   - Import alias: `@/*`
2. Verify `npm run dev` starts without errors
3. Delete boilerplate content from `app/page.js` and `app/globals.css`

**Output**: Clean Next.js 14 project that runs on `localhost:3000`

---

### Task 2: Install Dependencies
**Agent**: Claude  
**Depends on**: Task 1  
**Priority**: P0

**Do this:**
1. Install production deps: `npm install twilio mongodb`
2. Verify `package.json` has exactly these production deps: `next`, `react`, `react-dom`, `twilio`, `mongodb`
3. Create `.env.local` with placeholder values:
   ```
   TWILIO_ACCOUNT_SID=placeholder
   TWILIO_AUTH_TOKEN=placeholder
   TWILIO_PHONE_NUMBER=placeholder
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=placeholder
   MONGODB_URI=placeholder
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
4. Add `.env.local` to `.gitignore` (Next.js does this by default, verify)

**Output**: All dependencies installed, env template ready

---

### Task 3: Create Folder Structure
**Agent**: Claude  
**Depends on**: Task 1  
**Priority**: P0

**Do this:**
Create all directories from STRUCTURE.md:
```
app/journey/setup/
app/journey/active/
app/alarm/warning/
app/alarm/shouting/
app/recovery/
app/contacts/
app/onboarding/
app/api/sms/send/
app/api/sms/resolve/
app/api/call/emergency/
app/api/directions/
app/api/places/
components/journey/
components/alarm/
components/recovery/
components/contacts/
components/common/
lib/
hooks/
models/
data/
styles/
public/
```
Create placeholder `page.js` in each app route directory with the screen name as a heading.

**Output**: Full folder structure with navigable placeholder pages

---

### Task 4: Install Stitch Skills
**Agent**: Claude (terminal commands)  
**Depends on**: Nothing (can run in parallel with Tasks 1-3)  
**Priority**: P0

**Do this:**
```bash
npx skills add google-labs-code/stitch-skills --skill stitch-design --global
npx skills add google-labs-code/stitch-skills --skill stitch-loop --global
npx skills add google-labs-code/stitch-skills --skill enhance-prompt --global
npx skills add google-labs-code/stitch-skills --skill react-components --global
npx skills add google-labs-code/stitch-skills --skill design-md --global
```
Verify each skill installed successfully.

**Output**: All 5 Stitch skills available globally

---

## Phase 2 — Design System & UI Generation

### Task 5: Create Design System in Stitch
**Agent**: Gemini → Stitch MCP  
**Depends on**: Task 4  
**Priority**: P0

**Do this:**
1. Use `create_design_system` MCP tool with these tokens:
   - **Colors**: Primary `#00d4aa` (green), Error `#ff2d2d` (red), Warning `#f59e0b` (yellow), Info `#3b82f6` (blue)
   - **Background**: Dark mode — `#0a0a1a` (dark navy)
   - **Font**: Inter
   - **Corner radius**: Medium (12px cards, 24px buttons)
   - **Design MD**: Include Nudge-specific guidance — mobile-first, safety-critical UI, high-contrast alarm states, large touch targets
2. Use `update_design_system` to apply it to the project

**Output**: Stitch design system configured and ready for screen generation

---

### Task 6: Create Stitch Project & Generate Landing Screen
**Agent**: Gemini → Stitch MCP  
**Depends on**: Task 5  
**Priority**: P0

**Do this:**
1. Create a Stitch project titled "Nudge"
2. Use `generate_screen_from_text` with enhanced prompt (use `enhance-prompt` skill pattern):

> "Mobile app landing screen, 375px width, dark navy background (#0a0a1a). Centered app logo/icon at top with a subtle green glow. Large heading 'Sleep on your commute.' in white 28px Inter bold. Subheading 'We'll make sure you get off at the right stop.' in 18px muted gray. Below, four feature bullets with green (#00d4aa) checkmark icons: 'Wake you before your stop', 'Get you home if you miss it', 'Alert someone who cares', 'Works offline'. At bottom, large rounded green (#00d4aa) button 'Get Started →' 56px tall full-width with subtle shadow. Below button, small muted text link 'Already set up? Start a journey'. Premium, minimalist, modern safety app aesthetic. No device frame."

3. Set device type to MOBILE

**Output**: Landing screen generated in Stitch

---

### Task 7: Generate All Remaining Screens in Stitch
**Agent**: Gemini → Stitch MCP  
**Depends on**: Task 6  
**Priority**: P0

**Do this:**
Generate each screen one by one using `generate_screen_from_text` with MOBILE device type. Use the detailed prompts from SCREENS.md. Screens to generate:

1. **Set Journey** — Form with transit toggle, stop search input, autocomplete dropdown, selected stop card, emergency contacts section, "Start Monitoring" button (disabled state). Dark background.

2. **Journey Active** — Monitoring dashboard. Green GPS dot indicator at top. "Going to: Baclaran Station". Large circular distance display "2.1 km" with "~8 min" below. Subtle green pulse animation bar. Small "Cancel Trip" text button at bottom. Dark background.

3. **Alarm Firing** — Full-screen solid red (#ff2d2d) takeover. Warning icon. "YOUR STOP" 36px bold white. "Baclaran Station" below. Giant countdown "47" in 72px white. Text "Your emergency contacts will be alerted when this reaches zero". Massive white button "I'M AWAKE — DISMISS" 72px tall at bottom.

4. **Shouting Phase** — Bright red (#ff0000) background. "PLEASE WAKE UP" 48px white bold with shake effect. White alert banner "Your emergency contacts have been notified". Even larger white "I'M AWAKE" button 80px tall. Maximum visual urgency.

5. **Recovery** — Dark background with notification banner at top "Emergency contact has been notified" (blue). Heading "Missed Your Stop 😔" with reassuring subtext. Cards: route summary with step-by-step transit instructions, safe spot card (McDonald's, 120m, open 24h), rideshare card with "Open Grab" button. Bottom buttons: "Set New Alarm" and "I'M OK" (green).

6. **Contact Setup** — Form: up to 3 contacts with name and phone inputs. SMS preview in chat-bubble style showing exact message text. "Send Test SMS" button. "Save Contacts" primary button.

7. **Onboarding** — Three-step swipeable flow with step indicators. Step 1: language selector. Step 2: location permission with explanation. Step 3: notification permission. Clean, minimal, dark background.

After each screen: review the output and use `edit_screens` to fix any issues.

**Output**: All 8 screens designed in Stitch

---

### Task 8: Export Stitch Screens to React Components
**Agent**: Gemini → Stitch (react-components skill)  
**Depends on**: Task 7  
**Priority**: P0

**Do this:**
1. Use the `react-components` Stitch skill to convert all generated screens into React components
2. Place outputs into the `components/` directory following the structure from STRUCTURE.md
3. Verify each component renders without errors

**Output**: React components for all 8 screens with CSS

---

### Task 9: Wire Screen Components into App Router Pages
**Agent**: Claude  
**Depends on**: Task 8, Task 3  
**Priority**: P0

**Do this:**
1. Import the Stitch-generated React components into each `page.js` file
2. Set up `app/layout.js` with:
   - Inter font from `next/font/google`
   - Global CSS with design tokens from Task 5
   - Viewport meta for mobile: `width=device-width, initial-scale=1, viewport-fit=cover`
   - Theme color: `#0a0a1a`
   - PWA manifest link
3. Add client-side navigation between pages using `next/navigation` (`useRouter`)
4. Verify: can navigate through all 8 screens on `localhost:3000` in a mobile viewport

**Output**: All 8 screens navigable in the browser at correct routes

---

## Phase 3 — Core Logic (Client-Side)

### Task 10: Implement GPS Tracking (`lib/gps.js`)
**Agent**: Claude  
**Depends on**: Task 1  
**Priority**: P0

**Do this:**
1. Create `lib/gps.js` with:
   ```javascript
   export function startTracking(onUpdate, onError) {
     // navigator.geolocation.watchPosition
     // enableHighAccuracy: true, timeout: 10000, maximumAge: 0
     // Returns watchId
   }
   export function stopTracking(watchId) {
     // navigator.geolocation.clearWatch
   }
   ```
2. `onUpdate` callback receives `{ lat, lng, accuracy, timestamp }`
3. Handle permission denied, timeout, and position unavailable errors
4. Create `hooks/useGPS.js` that wraps this with React state:
   ```javascript
   export function useGPS() {
     // Returns { position, isTracking, error, startTracking, stopTracking }
   }
   ```

**Verify**: Open the app on a phone, grant location permission, see position logged to console every 1-3 seconds.

---

### Task 11: Implement Haversine Distance (`lib/haversine.js`)
**Agent**: Claude  
**Depends on**: Nothing  
**Priority**: P0

**Do this:**
1. Create `lib/haversine.js`:
   ```javascript
   export function haversine(lat1, lng1, lat2, lng2) {
     // Returns distance in meters between two coordinates
     // Earth radius: 6371000 meters
   }
   ```
2. Create `lib/formatters.js`:
   ```javascript
   export function formatDistance(meters) {
     // < 1000m → "340 m"
     // >= 1000m → "2.1 km"
   }
   export function formatETA(meters, speedMps = 8.33) {
     // speedMps = ~30 km/h (bus speed)
     // Returns "~3 min"
   }
   ```
3. Write unit tests or at least verify with known coordinates:
   - Manila Baclaran Station (14.5341, 120.9987) to EDSA Station (14.5549, 121.0475) ≈ 5.6 km

**Verify**: Function returns correct distances for known coordinate pairs.

---

### Task 12: Implement Constants (`lib/constants.js`)
**Agent**: Claude  
**Depends on**: Nothing  
**Priority**: P0

**Do this:**
Create `lib/constants.js`:
```javascript
export const PHASE_1_DISTANCE = 1000;    // meters — gentle vibration
export const PHASE_2_DISTANCE = 200;     // meters — loud alarm
export const MISSED_STOP_DISTANCE = 500; // meters past stop
export const COUNTDOWN_SECONDS = 60;     // seconds before family alert
export const SHOUT_INTERVAL = 4500;      // ms between voice shouts
export const VOICE_CALL_DELAY = 30000;   // ms after SMS before calling
export const GPS_UPDATE_INTERVAL = 3000; // ms minimum between UI updates
export const PHASE_1_VIBRATE = [200, 100, 200]; // vibration pattern
export const PHASE_2_VIBRATE = [500, 200, 500, 200]; // longer vibration
```

**Output**: Single source of truth for all thresholds

---

### Task 13: Implement Alarm System (`lib/alarm.js`)
**Agent**: Claude  
**Depends on**: Task 12  
**Priority**: P0

**Do this:**
1. Create `lib/alarm.js` with three phases:

**Phase 1 — Gentle vibration:**
```javascript
export function playPhaseOne() {
  // navigator.vibrate([200, 100, 200])
  // Repeat every 30 seconds
  // Returns cleanup function
}
```

**Phase 2 — Loud alarm:**
```javascript
export function playPhaseTwo() {
  // Create AudioContext if not exists
  // OscillatorNode: square wave, 880Hz
  // GainNode: volume 0.3
  // Pulse: on 500ms, off 500ms, repeat
  // Plus continuous vibration
  // Returns cleanup function
}
```

**Phase 3 — Voice shouting:**
```javascript
export function playPhaseThree() {
  // SpeechSynthesis.speak("PLEASE WAKE UP. YOU ARE PASSING YOUR STOP.")
  // Repeat every 4500ms
  // Plus alarm sound continues
  // Plus continuous vibration
  // Returns cleanup function
}
```

**Stop all:**
```javascript
export function stopAll() {
  // Stop oscillator
  // Cancel speechSynthesis
  // Cancel vibration
  // Clear all intervals
}
```

2. Create `hooks/useAlarm.js`:
   ```javascript
   export function useAlarm() {
     // Returns { phase, countdown, startPhaseOne, startPhaseTwo, startPhaseThree, dismiss }
     // Manages countdown timer (60s)
     // Calls appropriate lib/alarm.js functions
   }
   ```

3. **Critical**: AudioContext must be created/resumed inside a user gesture handler. The "Start Monitoring" button tap must call `new AudioContext()` or `audioCtx.resume()`.

**Verify**: On a real phone — tap a test button, hear alarm sound, feel vibration, hear voice shout. Each phase distinct.

---

### Task 14: Implement Screen Wake Lock (`lib/wakeLock.js`)
**Agent**: Claude  
**Depends on**: Nothing  
**Priority**: P1

**Do this:**
```javascript
let wakeLock = null;

export async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  }
}

export async function releaseWakeLock() {
  if (wakeLock) { await wakeLock.release(); wakeLock = null; }
}

// Re-acquire on visibility change
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && wakeLock === null) {
    await requestWakeLock();
  }
});
```

**Verify**: Start monitoring, phone screen stays on indefinitely.

---

### Task 15: Implement Journey State Machine (`hooks/useJourney.js`)
**Agent**: Claude  
**Depends on**: Tasks 10, 11, 12, 13  
**Priority**: P0

**Do this:**
This is the **master hook** that orchestrates everything:

```javascript
export function useJourney() {
  // State: 'idle' | 'monitoring' | 'phase1' | 'phase2' | 'phase3' | 'missed' | 'resolved'
  
  // startJourney(destinationStop, contacts):
  //   1. Start GPS tracking
  //   2. Request wake lock
  //   3. Unlock AudioContext
  //   4. Set state to 'monitoring'
  
  // On every GPS update:
  //   1. Calculate distance via haversine
  //   2. If distance < PHASE_1_DISTANCE && state === 'monitoring' → startPhaseOne, set 'phase1'
  //   3. If distance < PHASE_2_DISTANCE && state === 'phase1' → startPhaseTwo, set 'phase2'
  //   4. Countdown reaches 0 && state === 'phase2' → startPhaseThree, set 'phase3', trigger SMS
  //   5. Distance > MISSED_STOP_DISTANCE past stop → set 'missed'
  
  // dismiss():
  //   1. stopAll() alarms
  //   2. If state was 'phase3' or 'missed' → send resolution SMS
  //   3. Set state to 'resolved' or back to 'monitoring'
  
  // cancelJourney():
  //   1. stopAll()
  //   2. Stop GPS
  //   3. Release wake lock
  //   4. Set 'idle'
  
  // Returns { state, distance, countdown, destination, dismiss, cancelJourney, startJourney }
}
```

**Verify**: Walk toward a set coordinate on a real phone. See state transitions happen correctly.

---

## Phase 4 — Backend & API Routes

### Task 16: Implement Twilio SMS Send (`app/api/sms/send/route.js`)
**Agent**: Claude  
**Depends on**: Task 2  
**Priority**: P0

**Do this:**
```javascript
// POST /api/sms/send
// Body: { to, userName, stopName, timestamp, mapLink }
// Sends: "NUDGE ALERT: {userName} missed their stop ({stopName}) at {timestamp}. 
//         Live location: {mapLink}. Please call them."

import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request) {
  const { to, userName, stopName, timestamp, mapLink } = await request.json();
  
  const message = await client.messages.create({
    body: `NUDGE ALERT: ${userName} missed their stop (${stopName}) at ${timestamp}. Live location: ${mapLink}. Please call them.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to
  });
  
  return Response.json({ sid: message.sid, status: 'sent' });
}
```

**Verify**: Call this API from Postman or curl. Real SMS arrives on a verified phone.

---

### Task 17: Implement Twilio SMS Resolve (`app/api/sms/resolve/route.js`)
**Agent**: Claude  
**Depends on**: Task 2  
**Priority**: P0

**Do this:**
```javascript
// POST /api/sms/resolve
// Body: { to, userName }
// Sends: "✅ NUDGE UPDATE: {userName} has confirmed they are safe. No action needed."
```

**Verify**: SMS arrives with resolution message.

---

### Task 18: Implement Twilio Voice Call (`app/api/call/emergency/route.js`)
**Agent**: Claude  
**Depends on**: Task 2  
**Priority**: P1

**Do this:**
```javascript
// POST /api/call/emergency
// Body: { to, userName, stopName }
// TwiML: <Response><Say voice="alice">This is an emergency alert from Nudge. 
//        {userName} missed their transit stop at {stopName} and has not responded.
//        Please call them immediately.</Say></Response>
```

**Verify**: Phone rings, automated voice message plays clearly.

---

### Task 19: Implement Google Maps Proxy Routes
**Agent**: Claude  
**Depends on**: Task 2  
**Priority**: P0

**Do this:**

**`app/api/directions/route.js`** (GET):
```javascript
// Query: ?originLat=x&originLng=y&destLat=x&destLng=y
// Calls Google Directions API with mode=transit
// Returns: { steps: [...], duration: "18 min", summary: "LRT-1 Southbound" }
// Parse the response into a simple step-by-step format for the recovery screen
```

**`app/api/places/route.js`** (GET):
```javascript
// Query: ?lat=x&lng=y
// Calls Google Places Nearby Search
// Types: restaurant, gas_station, hospital, convenience_store
// Filter: openNow = true
// Returns: { venues: [{ name, distance, type, isOpen24h }] }
// Sort by distance, return top 3
```

**Verify**: Hit both endpoints with real coordinates, get valid transit directions and nearby venues.

---

## Phase 5 — Integration

### Task 20: Wire Journey Active Screen to GPS + State Machine
**Agent**: Claude  
**Depends on**: Tasks 9, 15  
**Priority**: P0

**Do this:**
1. In `app/journey/active/page.js`:
   - Import and use `useJourney` hook
   - Display live distance from `useGPS` via the journey hook
   - Show GPS status indicator (green dot / yellow dot / red dot)
   - Show formatted distance and ETA
   - Phase 1 state: change background to amber, show "Wake Up Soon", show dismiss button
2. Navigation:
   - When state changes to `phase2` → `router.push('/alarm/warning')`
   - "Cancel" → `cancelJourney()` then `router.push('/journey/setup')`

**Verify**: Start monitoring on phone, walk toward a coordinate, see distance update live.

---

### Task 21: Wire Alarm Screens to Alarm System
**Agent**: Claude  
**Depends on**: Tasks 9, 13, 15  
**Priority**: P0

**Do this:**
1. **`app/alarm/warning/page.js`** (Phase 2):
   - Full red background
   - Countdown timer from `useAlarm` hook (60 → 0)
   - "I'M AWAKE" button with press-and-hold (1s) to dismiss
   - When countdown = 0 → `router.push('/alarm/shouting')`, trigger Phase 3
2. **`app/alarm/shouting/page.js`** (Phase 3):
   - Pulsing red/white background (CSS animation)
   - "PLEASE WAKE UP" with shake animation
   - Banner: "Your emergency contacts have been notified"
   - "I'M AWAKE" button → dismiss all, send resolution SMS, navigate to recovery or active

**Verify**: Full alarm sequence plays through on phone — vibration, sound, voice, countdown, SMS.

---

### Task 22: Wire SMS Flow End-to-End
**Agent**: Claude  
**Depends on**: Tasks 16, 17, 21  
**Priority**: P0

**Do this:**
1. When countdown hits 0 in Phase 2:
   - Call `fetch('/api/sms/send', { method: 'POST', body: JSON.stringify({ to, userName, stopName, timestamp, mapLink }) })`
   - For each emergency contact
   - Generate `mapLink` as `https://www.google.com/maps?q=LAT,LNG` (simple version)
2. When "I'M OK" is tapped:
   - Call `fetch('/api/sms/resolve', { method: 'POST', body: ... })` for each contact
   - Stop all alarms
3. Handle API errors gracefully — if SMS fails, still dismiss alarms (don't trap the user)

**Verify**: Full flow on real phone. SMS arrives. Resolution SMS arrives on "I'm OK".

---

### Task 23: Wire Recovery Screen to APIs
**Agent**: Claude  
**Depends on**: Tasks 9, 19  
**Priority**: P0

**Do this:**
1. In `app/recovery/page.js`:
   - On mount, fetch directions from `/api/directions?originLat=...&destLat=...`
   - Fetch safe spots from `/api/places?lat=...&lng=...`
   - Show loading spinner while fetching
   - Display route card with step-by-step transit instructions
   - Display safe spot card with nearest 24h venue
   - "Open in Maps" button → `window.open('https://www.google.com/maps/dir/...')`
   - "I'M OK" button → calls resolve SMS, navigates to setup
2. **Fallback**: If API calls fail, show hardcoded recovery message:
   - "Walk back the way you came to the previous stop"
   - "Find a well-lit area such as a convenience store and wait"
   - Never show an error screen to a disoriented user

**Verify**: Recovery screen loads with real transit directions and a real nearby venue.

---

## Phase 6 — Data & Storage

### Task 24: Seed MongoDB with Demo Data
**Agent**: Claude (via MongoDB MCP)  
**Depends on**: Task 2  
**Priority**: P0

**Do this:**
1. Create `nudge` database with collections: `stops`, `venues`, `contacts`, `journeys`
2. Seed `stops` with 10-15 transit stops (Manila LRT-1 line or your chosen demo route):
   ```json
   { "name": "Baclaran Station", "lat": 14.5341, "lng": 120.9987, "line": "LRT-1", "type": "train" }
   ```
3. Seed `venues` with 5-10 24h venues near the demo route:
   ```json
   { "name": "McDonald's Taft Avenue", "lat": 14.5340, "lng": 120.9990, "type": "restaurant", "open24h": true, "distance": 120 }
   ```
4. Create `data/stops.json` and `data/venues.json` as local fallback copies

**Verify**: Query MongoDB via MCP — all seed data present.

---

### Task 25: Implement Contact CRUD
**Agent**: Claude  
**Depends on**: Task 24  
**Priority**: P0

**Do this:**
1. Create `models/contact.js` with MongoDB CRUD helpers:
   - `getContacts()` → returns all contacts
   - `addContact({ name, phone })` → inserts contact
   - `removeContact(id)` → deletes contact
2. Create API routes or use MongoDB MCP directly from hooks
3. Wire `app/contacts/page.js` to save/load contacts
4. Wire `app/journey/setup/page.js` to display saved contacts

**Verify**: Add a contact, see it on the setup screen, delete it, verify it's gone.

---

## Phase 7 — Testing & Demo Prep

### Task 26: Mobile Device Testing
**Agent**: Claude + Human  
**Depends on**: All Phase 5 tasks  
**Priority**: P0

**Do this:**
1. Deploy to Vercel (or run `ngrok` for local HTTPS)
2. Open on target Android phone in Chrome
3. Test the full demo sequence:
   - [ ] Landing screen loads correctly on mobile viewport
   - [ ] Set a destination stop
   - [ ] Add an emergency contact
   - [ ] Start monitoring — GPS activates
   - [ ] Walk toward the stop — distance updates
   - [ ] Phase 1 triggers — vibration, yellow state
   - [ ] Phase 2 triggers — alarm sound, red screen, countdown
   - [ ] Countdown reaches 0 — Phase 3, voice shout
   - [ ] SMS arrives on second phone
   - [ ] Tap "I'M OK" — alarms stop, resolution SMS arrives
   - [ ] Recovery screen shows route and safe spot
4. Note all bugs and fix them

**Output**: Bug list → fix each one → re-test

---

### Task 27: PWA Setup
**Agent**: Claude  
**Depends on**: Task 9  
**Priority**: P1

**Do this:**
1. Create `public/manifest.json`:
   ```json
   {
     "name": "Nudge",
     "short_name": "Nudge",
     "description": "Personal safety companion for transit commuters",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#0a0a1a",
     "theme_color": "#0a0a1a",
     "icons": [
       { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
     ]
   }
   ```
2. Create minimal `public/sw.js` (cache static assets only)
3. Generate app icons (192px and 512px) using generate_image tool
4. Register service worker in `app/layout.js`

**Verify**: "Add to Home Screen" prompt works on Android Chrome. App opens full-screen without browser chrome.

---

### Task 28: Record Demo Video
**Agent**: Human (with Claude assistance for any last fixes)  
**Depends on**: Tasks 26, 27  
**Priority**: P0

**Do this:**
1. Set up screen recording (Scrcpy for Android mirroring, or phone's built-in screen recorder)
2. Have two phones ready:
   - Phone 1: Running Nudge
   - Phone 2: Receiving SMS
3. Pre-set the demo route (choose a stop you can actually approach)
4. Run through the full 90-second demo script from PLAN.md
5. Record multiple takes
6. Edit the best take (trim, add captions if needed)

**Output**: Final demo video file ready for presentation

---

## Task Summary Table

| # | Task | Agent | Priority | Depends On | Est. Time |
|---|------|-------|----------|-----------|-----------|
| 1 | Scaffold Next.js | Claude | P0 | — | 5 min |
| 2 | Install deps + env | Claude | P0 | 1 | 5 min |
| 3 | Create folder structure | Claude | P0 | 1 | 10 min |
| 4 | Install Stitch skills | Claude | P0 | — | 5 min |
| 5 | Design system in Stitch | Gemini→Stitch | P0 | 4 | 15 min |
| 6 | Generate landing screen | Gemini→Stitch | P0 | 5 | 10 min |
| 7 | Generate all screens | Gemini→Stitch | P0 | 6 | 45 min |
| 8 | Export to React | Gemini→Stitch | P0 | 7 | 20 min |
| 9 | Wire into App Router | Claude | P0 | 8, 3 | 30 min |
| 10 | GPS tracking | Claude | P0 | 1 | 20 min |
| 11 | Haversine distance | Claude | P0 | — | 10 min |
| 12 | Constants | Claude | P0 | — | 5 min |
| 13 | Alarm system | Claude | P0 | 12 | 45 min |
| 14 | Screen wake lock | Claude | P1 | — | 10 min |
| 15 | Journey state machine | Claude | P0 | 10-13 | 45 min |
| 16 | Twilio SMS send | Claude | P0 | 2 | 15 min |
| 17 | Twilio SMS resolve | Claude | P0 | 2 | 10 min |
| 18 | Twilio Voice call | Claude | P1 | 2 | 15 min |
| 19 | Google Maps proxies | Claude | P0 | 2 | 30 min |
| 20 | Wire journey screen | Claude | P0 | 9, 15 | 30 min |
| 21 | Wire alarm screens | Claude | P0 | 9, 13, 15 | 45 min |
| 22 | Wire SMS flow | Claude | P0 | 16, 17, 21 | 20 min |
| 23 | Wire recovery screen | Claude | P0 | 9, 19 | 30 min |
| 24 | Seed MongoDB | Claude | P0 | 2 | 15 min |
| 25 | Contact CRUD | Claude | P0 | 24 | 20 min |
| 26 | Device testing | Claude+Human | P0 | All Phase 5 | 60 min |
| 27 | PWA setup | Claude | P1 | 9 | 20 min |
| 28 | Record demo video | Human | P0 | 26, 27 | 60 min |

**Total estimated time: ~10-12 hours of agent work**  
**Critical path: Tasks 1→3→9→15→20→21→22→26**

---

## Parallel Execution Opportunities

These task groups can run simultaneously:

| Group A (Stitch/UI) | Group B (Logic) | Group C (Backend) |
|---------------------|-----------------|-------------------|
| Task 5: Design system | Task 10: GPS | Task 16: SMS send |
| Task 6: Landing screen | Task 11: Haversine | Task 17: SMS resolve |
| Task 7: All screens | Task 12: Constants | Task 18: Voice call |
| Task 8: Export React | Task 13: Alarm | Task 19: Maps proxy |
| | Task 14: Wake lock | Task 24: Seed MongoDB |

**All three groups merge at Task 9 (Wire into App Router) and Task 20-23 (Integration).**
