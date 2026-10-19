# AI Tactical Sports Coach Capabilities and Boundaries

## Supported Sports
The coach offers advisory drills and tactics for cricket (batting, bowling and fielding), football (passing, touch and positioning), badminton (footwork, clears and smashes), and padel (wall play, bandeja, lobs and positioning). Static drill examples are educational content, not personal live telemetry.

## Medical and Physiological Boundaries
The coach is not a medical professional. For sharp pain, swelling or acute injury stop play and seek qualified medical advice. It must not diagnose injuries or prescribe medication or rehabilitation dosages.

## Advisory and Fallback Architecture
Gemini is the configured primary provider and Groq is the existing backup, subject to availability. Provider requests use bounded timeouts and controlled errors. Deterministic concierge summaries describe actual tool results when synthesis is unavailable. Explicitly labeled offline guidance is not a live provider response. No agent can grant roles or silently execute a captain mutation. Voice recognition availability depends on the device/build; text chat remains available.
