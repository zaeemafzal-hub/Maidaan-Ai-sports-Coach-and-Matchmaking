# Google sign-in setup

Supabase reports Google enabled. The web button reaches Google's sign-in screen, and the user completed real Google sign-in and confirmed return to Discover. Native Google sign-in requires a Maidaan development build and still needs physical-device verification.

1. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client of type Web application. If the app is in Testing, add the Google accounts that will test it as test users.
2. Add this Authorized redirect URI to that Google client:

   https://usqojzkpvlkxwvbwwzov.supabase.co/auth/v1/callback

3. Open https://supabase.com/dashboard/project/usqojzkpvlkxwvbwwzov/auth/providers and enable Google. Paste the Google client ID and client secret there, then save. Keep the secret in Supabase; do not put it in mobile/.env.
4. Open https://supabase.com/dashboard/project/usqojzkpvlkxwvbwwzov/auth/url-configuration and add these Redirect URLs:

   - http://localhost:8081/auth/callback
   - http://192.168.18.11:8081/auth/callback
   - maidaan://auth/callback
   - http://localhost:8081/reset-password
   - http://192.168.18.11:8081/reset-password
   - maidaan://reset-password

5. Set the Site URL to your actual web origin (http://localhost:8081 for local testing). Add your deployed web callback and reset URLs when deploying. Update the LAN entry if your Wi-Fi IP changes.
6. Leave email confirmation enabled. Signup now sends a verification email instead of auto-confirming an unverified address. Configure SMTP for reliable delivery outside small local tests.

## Test

- Web: Continue with Google → choose account → callback → player setup for a new user, or discovery for an onboarded user.
- Phone Google OAuth requires a development build with the maidaan scheme. Expo Go does not support this OAuth callback flow; email/password remains available there.
- A closed/cancelled Google browser must leave the user signed out.
- Email: sign up → confirm email → sign in → setup → sign out → sign in again.

Docs: https://supabase.com/docs/guides/auth/social-login/auth-google and https://docs.expo.dev/guides/authentication/
