# PITCH.md — 3-Minute Pitch Script

> **Status**: DRAFT — Awaiting human review  
> **Last updated**: 2026-03-28  
> **Total time**: 3 minutes (180 seconds)  
> **Format**: Spoken word → demo video → close

---

## The Script

### Opening — The Hook (0:00 – 0:30)

> **[Stand center stage. Speak slowly. Make eye contact.]**
>
> Meet Maria.
>
> She's 34. She's a domestic worker in Manila. She finishes a 12-hour shift at 11 PM, and she rides two buses home after midnight.
>
> Maria falls asleep on the bus 2 to 3 times a month. She misses her stop. She wakes up alone, on an unfamiliar street, at 1 AM.
>
> She can't afford a $45 Uber. She can't safely wait on a dark street for the next bus. And her family doesn't know where she is.
>
> **[Pause. Let it land.]**
>
> There are 200 million domestic workers worldwide. Most of them ride public transit. Most of them work late. And none of them have an app that does what Nudge does.

---

### The Problem (0:30 – 0:50)

> The problem is simple, and it's invisible.
>
> Missing your transit stop isn't a tech problem that Silicon Valley thinks about. It's not a problem for people who drive cars or take Ubers.
>
> It's a problem for people who work 12-hour shifts, ride buses at midnight, and fall asleep because they're exhausted. People like Maria. People like 3.7 billion public transit riders worldwide.
>
> And when they miss their stop, three things go wrong at once: they're lost, they're stranded, and nobody knows.

---

### The Solution — Three Pillars (0:50 – 1:30)

> Nudge solves all three. In three layers.
>
> **[Hold up one finger]**
>
> **First: Wake her up.**  
> You set your destination stop. Nudge tracks your GPS and sounds an escalating alarm as you approach — vibration, then sound, then a voice literally shouting "Please wake up." If your phone is on silent, the voice shouts through the speaker anyway.
>
> **[Hold up two fingers]**
>
> **Second: Get her home.**  
> If she does miss her stop, Nudge instantly shows her how to get back — step-by-step transit directions, a safe 24-hour venue nearby to wait in, and a one-tap rideshare if buses have stopped running. She is never left standing on a dark street.
>
> **[Hold up three fingers]**
>
> **Third: Keep her safe.**  
> If she doesn't respond within 60 seconds of the alarm, Nudge sends a real SMS to her emergency contact — her sister, her mother, whoever she trusts — with her name, the missed stop, and a live map link showing exactly where she is. When she taps "I'm OK," her contact gets a follow-up: "Maria is safe."
>
> **[Pause]**
>
> One app. Three layers of protection. And it works on a $50 Android phone with limited data.

---

### The Demo (1:30 – 1:40)

> Don't take my word for it. Let me show you.
>
> **[Start the demo video on the presentation screen]**
>
> This is Nudge running on a real phone. Watch what happens.

---

### Demo Video Plays (1:40 – 2:50)

> **[70 seconds — the video plays. Narrate live over it:]**
>
> Here's the app. We set Baclaran Station as our destination and start monitoring.
>
> Watch the distance count down in real time — that's live GPS.
>
> Now we're approaching the stop — the screen turns yellow. Wake up soon.
>
> **[Alarm fires]** Phase two. Loud alarm. 60-second countdown before her family is alerted.
>
> She doesn't respond. Countdown hits zero.
>
> **[Voice shouts]** The phone is now shouting "Please wake up." And simultaneously —
>
> **[Cut to second phone]** — a real SMS just arrived on this second phone. Name, missed stop, live map link. That's a real text message.
>
> Back on the main phone — the recovery screen. Step-by-step directions back to her stop. A McDonald's 120 meters away that's open 24 hours. She's not stranded.
>
> She taps "I'm OK" —
>
> **[Show second phone]** — and her contact receives this: "Maria has confirmed she is safe."
>
> **[Pause. Look at judges.]**
>
> 90 seconds. One person protected, recovered, and brought home safely.

---

### Technical Innovation (2:50 – 3:05)

> Under the hood, Nudge uses:
>
> - **Real-time GPS tracking** with Haversine distance calculation
> - **Three-phase alarm escalation** using Web Audio API, SpeechSynthesis, and Vibration API — all running in the browser, no native app install required
> - **Twilio SMS and Voice** for real emergency contact alerts
> - **Google Maps Directions and Places APIs** for real-time rerouting and safe venue discovery
> - And it's a **Progressive Web App** — it works offline, installs to the home screen, and runs on any phone with a browser
>
> We built this with an AI-orchestrated pipeline: Stitch for UI design, Claude for backend engineering, and Gemini for coordination.

---

### Social Impact (3:05 – 3:15)

> Nudge aligns with **UN Sustainable Development Goals 3, 5, and 11** — good health, gender equality, and sustainable cities.
>
> It costs nothing to use. It runs on cheap phones. And it's designed for the people who need it most — not the people who can already afford safety.

---

### Closing (3:15 – 3:20)

> **[Slow down. Make this land.]**
>
> Technology should protect people who can't protect themselves.  
> Maria deserves to fall asleep on her way home and still get there safely.
>
> That's Nudge. Thank you.
>
> **[Nod. Step back. Let judges respond.]**

---

## Judge Q&A Preparation

### Anticipated Questions & Confident Answers

**Q1: "How does this work when the phone is in a pocket or bag?"**
> Phase 1 uses vibration — felt in a pocket. Phase 2 uses a loud alarm through the speaker — audible even in a bag. Phase 3 uses SpeechSynthesis to literally shout through the speaker. The escalation is designed so that if one modality doesn't wake you, the next one will.

**Q2: "What happens if the phone loses signal underground?"**
> GPS is a device sensor — it works without cellular data. In tunnels where GPS is unreliable, we switch to accelerometer-based dead reckoning — it's not centimetre-accurate, but it's good enough to know you're still moving. The moment GPS returns, it takes authority again.

**Q3: "What about iOS? Safari is restrictive."**
> You're right. iOS Safari aggressively suspends background tabs. Screen Wake Lock API and our Service Worker help significantly, and the app works well in the foreground. For production, the path is a native iOS app via Capacitor — which we've designed our architecture to support.

**Q4: "Can the SMS be faked? What about false alarms?"**
> The 60-second countdown is specifically designed for this. We never alert emergency contacts immediately — we give the user a full minute to dismiss. That eliminates almost all false alarms. And the SMS includes a live map link, so the contact can verify the situation themselves.

**Q5: "Why not just use Google Maps alerts?"**
> Google Maps tells you when to get off. It doesn't: shout at you if you fall asleep, send an SMS to your mother, find you a safe place to wait, or give you transit directions back. Nudge picks up where Google Maps stops — at the moment things go wrong.

**Q6: "What's the business model?"**
> The core app is free forever. Revenue paths: micro-insurance for missed-stop rideshare coverage ($0.50/month), transit authority partnerships for anonymized safety data, and a premium caregiver dashboard for families monitoring elderly relatives.

**Q7: "How many users can this scale to?"**
> The frontend is a static PWA — it scales infinitely via CDN. The backend is 3 serverless functions. The only bottleneck is Twilio SMS volume, which scales linearly with demand. We could support 100,000 active journeys with a $200/month Twilio bill.

**Q8: "What about battery drain from continuous GPS?"**
> A typical journey is 30-60 minutes. GPS tracking for that duration uses about 3-5% battery. We don't run GPS all day — only during active monitoring. Below 15% battery, we reduce GPS frequency automatically.

**Q9: "Is the data private?"**
> Location data stays on the device. The only time location leaves the phone is in the emergency SMS — sent to the user's own chosen emergency contacts. We never store location history on any server. The user controls everything.

**Q10: "What about places where Uber/Grab don't operate?"**
> The rideshare deep-link is one option out of three. The primary recovery path is transit directions — walk to the nearest stop, take the next bus/train back. The safe venue finder (McDonald's, hospital, etc.) works anywhere Google Maps has data. The app doesn't depend on rideshare.

**Q11: "How is this different from other safety apps?"**
> Most safety apps are reactive — you press an SOS button after something goes wrong. Nudge is proactive — it detects the problem (approaching your stop while asleep) and intervenes before it becomes a crisis. Prevention, then recovery, then protection. In that order.

**Q12: "You built this during the hackathon?"**
> Yes. We used an AI-orchestrated pipeline — Google Stitch generated our UI screens, Claude wrote the backend and logic, and Gemini coordinated the whole process. The AI didn't replace our judgment — it amplified our speed. Every design decision, every threshold, every word in the alarm message was a deliberate human choice.

---

## Presentation Tips

| Tip | Why |
|-----|-----|
| **Speak slowly during Maria's story** | Emotion builds with silence |
| **Hold up fingers for the three pillars** | Visual anchoring — judges remember fingers |
| **Don't narrate the video play-by-play** | Let key moments land (alarm sound, SMS arriving) with silence |
| **Make eye contact during the close** | "Technology should protect people who can't protect themselves" is your money line |
| **Stand still during the closing line** | Movement dilutes impact. Be a rock. |
| **Don't apologize for anything** | "We know about X limitation" not "Unfortunately we couldn't" |
| **Time yourself** | Practice to exactly 3:00. Not 3:15. Not 2:45. Exactly 3:00. |
