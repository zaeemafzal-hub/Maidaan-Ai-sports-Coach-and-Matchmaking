# F0 installed Android acceptance

Date prepared: 2026-10-18. Updated: 2026-10-19. Status: PARTIAL, user-reported installed-device testing.

User-reported device: **RMX3890, Android 15**. User confirmed the orange welcome button is visible in Expo Go. On 2026-10-19 the user confirmed the installed app is working outside Admin verification/report desks, and supplied an installed-phone Admin dashboard screenshot with authenticated data. The two review desks initially opened blank; after the Admin fix and reload, the user confirmed **both desks display correctly**. This is a broad user acceptance report, not a recorded result for every individual checklist case below. Google OAuth and other unreported individual checks remain unverified. See ADMIN-DESK-FIX.md for the separately executed browser moderation actions.

Build: [EAS development APK](https://expo.dev/accounts/zaeeem17/projects/maidaan/builds/b8572844-05ee-49ff-96e4-5e3dc3deab9a), **FINISHED** 2026-10-18 18:14:02 UTC. [APK download](https://expo.dev/artifacts/eas/OoCSn1fjstcCXxoBDqobigyVYSyBDudcjmQX5b92kfI.apk). Profile: development, internal distribution, Android package `com.anonymous.maidaan`, version 1.0.0, Expo SDK 57.

Open the EAS build link on the Android phone when it has finished, download the APK and install it. Allow installation from that browser if Android requests it. Open the installed Maidaan application. On the computer, from `mobile`, run `npx expo start --dev-client`. Keep the computer and phone on the same Wi-Fi and select the detected development server in Maidaan, or scan the terminal QR code. The backend must also be running on port 5000 and reachable from the phone. Do not enter localhost as the phone's backend address.

This is the installed Maidaan development application. Earlier Expo Go results remain useful but do not satisfy this checklist. See [Expo's development-build instructions](https://docs.expo.dev/develop/development-builds/use-development-builds/).

Record phone model, Android version, test date and build ID. For each row record PASS, FAIL or NOT TESTED and the exact error when it fails.

| Check | Result |
| --- | --- |
| Launch; welcome artwork; orange Get Started button; Create Account navigation | NOT TESTED |
| Email/password login; kill/reopen; session restore | NOT TESTED |
| Player setup; profile; switch Player/Captain; Captain dashboard/team | NOT TESTED |
| Discover; future match; Match Details; request/accept/confirmation | NOT TESTED |
| Chat send/receive with a second actual client; reconnect; saved history | NOT TESTED |
| Live AI Coach; Concierge response and confirmation controls | NOT TESTED |
| Venues list; OpenStreetMap tiles and venue detail navigation | NOT TESTED |
| Hub workspace, spaces, future slots and verification state | NOT TESTED |
| Google sign-in returns to installed Maidaan and restores session | NOT TESTED |
| Keyboard does not obscure form actions; Android Back; image loading | NOT TESTED |
| Logout clears session; reopening stays signed out | NOT TESTED |

Do not enable payment collection for this checklist. Backend `PAYMENT_MODE=disabled` is the local F0 default. Administrative verification is not a claim of a physical inspection.
