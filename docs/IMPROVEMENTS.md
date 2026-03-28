# IMPROVEMENTS.md — Features Beyond MVP

> **Status**: DRAFT — Awaiting human review  
> **Last updated**: 2026-03-28  
> **Note**: These are all post-MVP. None of these should be built until P0 and P1 are solid and the demo video works flawlessly.

---

## Rating Scale

- **Impact**: How much this helps Maria and users like her (1 = nice-to-have, 5 = life-changing)
- **Complexity**: How hard this is to build (1 = afternoon project, 5 = multi-week engineering effort)
- **Demo Value**: How impressive this is to hackathon judges (1 = meh, 5 = jaw-drop)

---

## The Features

### 1. 🧠 ML Sleep Detection via Accelerometer
**Impact: 5 | Complexity: 4 | Demo Value: 5**

Instead of only using distance thresholds, use the phone's accelerometer to detect when the user has actually **fallen asleep** (no movement for 3+ minutes while on a moving vehicle). Start the alarm escalation earlier for sleeping users.

**Why it matters**: Maria doesn't just need to be near her stop — she needs the alarm to know she's *asleep*. A person who is awake and browsing their phone doesn't need Phase 2.

**Build time**: 2-3 days (TensorFlow.js on-device model or heuristic-based)

---

### 2. 🗺️ Community Safety Map
**Impact: 4 | Complexity: 3 | Demo Value: 4**

Crowdsourced reports of unsafe stops, poorly lit areas, and incidents. Users can flag stops as "unsafe at night" or "well-lit, good area." Data aggregates into a heat map visible in the app.

**Why it matters**: Not all stops are equal. If Maria misses her stop and lands at a stop flagged by 47 other women as "do not wait here alone at night," the app should route her to the nearest safe spot immediately — not give her walking directions through that area.

**Build time**: 1-2 days (MongoDB geospatial queries + map overlay)

---

### 3. 👵 Caregiver Dashboard
**Impact: 5 | Complexity: 3 | Demo Value: 5**

A web dashboard for family members to passively monitor a relative's journey. See their active trip, current location, and estimated arrival. Get notified if something goes wrong. Built for elderly care and family peace-of-mind.

**Why it matters**: Maria's mother worries every night. With the caregiver dashboard, she can see "Maria is on the bus, 15 minutes from home" without Maria having to text.

**Build time**: 2 days (separate web page, WebSocket or polling, MongoDB queries)

---

### 4. 📴 Full Offline Mode
**Impact: 4 | Complexity: 4 | Demo Value: 3**

Pre-download all stop data, rerouting options, and safe venue info for the user's regular route. App works completely offline after initial setup. GPS still works offline — it's a device sensor.

**Why it matters**: Maria has limited data. Some nights she has zero data. The app should never fail because of a network issue.

**Build time**: 2-3 days (Service Worker cache strategies, IndexedDB for data, offline-first architecture)

---

### 5. ⌚ Wearable Haptic Alerts
**Impact: 4 | Complexity: 4 | Demo Value: 4**

Send vibration alerts to Apple Watch, Fitbit, or Galaxy Watch. When the phone is in a bag, wrist vibration is more likely to wake someone than phone vibration in a pocket.

**Why it matters**: Maria's phone is often in her bag. She feels her wrist more than her pocket. A wrist buzz at Phase 1 could prevent Phase 2 entirely.

**Build time**: 3-4 days (Web Bluetooth API or companion app)

---

### 6. 🚨 Panic Button
**Impact: 5 | Complexity: 2 | Demo Value: 3**

A manual SOS button — separate from the missed stop flow. Tap it anytime to immediately:
1. Send emergency SMS to all contacts with live location
2. Start recording audio (evidence)
3. Flash the screen as a strobe (attention-getting)
4. Call emergency services

**Why it matters**: Missed stop isn't the only danger. If Maria feels unsafe for any reason, she needs a one-tap escape button.

**Build time**: 1 day (reuses existing SMS infrastructure, add audio recording via MediaStream API)

---

### 7. 🔄 Repeated Miss Pattern Detection
**Impact: 3 | Complexity: 2 | Demo Value: 3**

Track when the user misses the same stop repeatedly. After 3 misses on the same route, suggest:
- Setting the alarm earlier (larger distance threshold)
- Taking a different route
- Asking if the commute time is the real problem

**Why it matters**: If Maria misses Baclaran every Thursday, the app should learn this and adapt — not just react to it every time.

**Build time**: 0.5 days (MongoDB aggregation on journey logs)

---

### 8. 🚌 Driver Alert System
**Impact: 5 | Complexity: 5 | Demo Value: 5**

Notify the bus/train driver that a vulnerable passenger needs to exit at the next stop. Could work via a partnership with transit operators or through a simple in-app system where the driver has a tablet showing alerts.

**Why it matters**: The most reliable way to get Maria off at her stop is for the driver to announce it or physically check. Technology-assisted human kindness.

**Build time**: Multi-week (requires transit operator partnership, separate driver app)

---

### 9. 🤝 Buddy System
**Impact: 3 | Complexity: 3 | Demo Value: 3**

Match users on the same route so they can watch out for each other. If another Nudge user is on the same bus, they get a gentle alert: "A fellow commuter needs to exit at the next stop."

**Why it matters**: Community care. Sometimes a tap on the shoulder from a fellow passenger is more effective than any alarm.

**Build time**: 2 days (real-time matching via WebSocket, proximity detection)

---

### 10. 📱 Native Mobile App (Capacitor)
**Impact: 5 | Complexity: 3 | Demo Value: 2**

Wrap the web app in Capacitor to create a real Android/iOS app. Gains:
- True background location tracking
- Push notifications that survive app kill
- Foreground service (Android) for always-on monitoring
- App store presence

**Why it matters**: The web app works for the demo. But for real users, a native app is the path to reliable background operation, especially on iOS.

**Build time**: 2-3 days (Capacitor wrapping, native plugin configuration)

---

### 11. 🔋 Smart Battery Management
**Impact: 3 | Complexity: 2 | Demo Value: 2**

Monitor battery level via Battery Status API. When below 15%:
- Reduce GPS polling frequency
- Disable audio alarm (keep vibration only)
- Show "Low battery — Nudge is in power-saving mode"
- Suggest plugging in

**Why it matters**: Maria's phone might be at 8% after a 12-hour shift. The app shouldn't kill her remaining battery.

**Build time**: 0.5 days (Battery API + conditional GPS frequency)

---

### 12. 🏥 Integration with Local Emergency Services
**Impact: 5 | Complexity: 5 | Demo Value: 4**

Direct integration with local emergency services (911, 112, 117 in Philippines). After 5 minutes of no response from user AND no response from emergency contacts, automatically alert local authorities.

**Why it matters**: Last resort. If Maria hasn't responded and her family can't reach her, someone needs to know.

**Build time**: Multi-week (requires emergency service partnerships, regulatory compliance)

---

### 13. 📊 Journey Analytics Dashboard
**Impact: 2 | Complexity: 2 | Demo Value: 3**

Personal analytics: how many trips, how many near-misses, average commute time, safest times to travel, fatigue risk score. Visualized with charts.

**Why it matters**: Data-driven self-awareness. Maria can see that she misses her stop more on Fridays (exhaustion) and adjust her schedule.

**Build time**: 1 day (Chart.js + MongoDB aggregation)

---

### 14. 💰 Freemium Transit Insurance
**Impact: 4 | Complexity: 5 | Demo Value: 4**

Partnership with micro-insurance providers. For $0.50/month, if you miss your stop and need a rideshare home, Nudge covers it. The app already has all the data to verify the claim (GPS logs, missed stop event, timestamp).

**Why it matters**: Maria can't afford a $45 Uber. But she could afford $0.50/month for peace of mind. And we have the data to make this actuarially viable.

**Build time**: Ongoing (business development, not engineering)

---

### 15. 🌍 Transit Authority Data Integration
**Impact: 4 | Complexity: 4 | Demo Value: 3**

Partner with transit authorities to access real-time bus/train positions and schedules. Instead of relying solely on user GPS, cross-reference with actual vehicle location. Know exactly which bus Maria is on and when it will reach her stop.

**Why it matters**: GPS accuracy + vehicle tracking = much more reliable stop prediction. Especially valuable when GPS drifts.

**Build time**: 2-3 weeks (depends on transit API availability, GTFS feed integration)

---

## Summary Table

| # | Feature | Impact | Complexity | Demo Value | Quick Win? |
|---|---------|--------|-----------|------------|------------|
| 1 | ML sleep detection | 5 | 4 | 5 | ❌ |
| 2 | Community safety map | 4 | 3 | 4 | ✅ |
| 3 | Caregiver dashboard | 5 | 3 | 5 | ✅ |
| 4 | Full offline mode | 4 | 4 | 3 | ❌ |
| 5 | Wearable haptics | 4 | 4 | 4 | ❌ |
| 6 | Panic button | 5 | 2 | 3 | ✅ |
| 7 | Repeated miss patterns | 3 | 2 | 3 | ✅ |
| 8 | Driver alert | 5 | 5 | 5 | ❌ |
| 9 | Buddy system | 3 | 3 | 3 | ❌ |
| 10 | Native app (Capacitor) | 5 | 3 | 2 | ✅ |
| 11 | Smart battery mgmt | 3 | 2 | 2 | ✅ |
| 12 | Emergency services | 5 | 5 | 4 | ❌ |
| 13 | Journey analytics | 2 | 2 | 3 | ✅ |
| 14 | Transit insurance | 4 | 5 | 4 | ❌ |
| 15 | Transit data integration | 4 | 4 | 3 | ❌ |

### Recommended order if you have time after MVP:
1. **Panic button** (Impact 5, Complexity 2) — easiest high-impact win
2. **Caregiver dashboard** (Impact 5, Complexity 3) — judges love this
3. **Community safety map** (Impact 4, Complexity 3) — strong social story
4. **Smart battery mgmt** (Impact 3, Complexity 2) — shows real-world thinking
5. **Repeated miss patterns** (Impact 3, Complexity 2) — shows learning capability
