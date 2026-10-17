# Safepay + JazzCash sandbox setup

Use test accounts only. Sandbox payments do not move real money.

## Safepay

1. Open https://safepay.pk/signup and choose **Sandbox account**. Complete your own signup/email verification.
2. In the sandbox dashboard, open **Developers → API keys**. Copy the public key and server secret into `backend/.env` as `SAFEPAY_PUBLIC_KEY` and `SAFEPAY_SECRET_KEY`.
3. Under **Developers → Endpoints**, create an endpoint pointing to `YOUR_PUBLIC_HTTPS_BACKEND/api/payments/safepay/webhook`.
4. Select version 2 payment events, including `payment.succeeded` and `payment.refunded`. Copy its shared signing secret into `SAFEPAY_WEBHOOK_SECRET`.

### Current temporary callback endpoint

`https://tickets-denied-confidence-garmin.trycloudflare.com/api/payments/safepay/webhook`

This approved Cloudflare tunnel reaches only the payment callback proxy, not the full API. It is temporary: keep both the callback proxy and Cloudflare process running during sandbox tests. A newly started quick tunnel gets a different URL; update `PAYMENTS_PUBLIC_URL` and the Safepay endpoint together. The current URL has been saved in `backend/.env`.

## JazzCash

1. Open https://sandbox.jazzcash.com.pk/ and create a free sandbox merchant account.
2. Generate sandbox credentials, then select **API Testing → Mobile Account → REST**. Use only the test merchant details supplied by JazzCash.
3. Add the merchant ID, password and integrity salt/shared secret to `backend/.env`: `JAZZCASH_MERCHANT_ID`, `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT`.
4. Copy the displayed REST Mobile Account API URL into `JAZZCASH_WALLET_URL`. It must use the sandbox.jazzcash.com.pk host. Maidaan sends wallet requests server-side and never collects MPIN.
5. Register the return URL `YOUR_PUBLIC_HTTPS_BACKEND/api/payments/jazzcash/return`. Configure the same handler for signed payment notifications if your sandbox portal offers that setting.

## Shared URLs

- `PAYMENTS_PUBLIC_URL`: a public HTTPS URL for this backend. A phone's LAN address or `localhost` cannot receive gateway notifications from the internet. We will configure the deployment/tunnel URL when credentials are ready.
- `PAYMENTS_APP_URL`: the web app address reachable from the user's browser/phone. The current local default is `http://192.168.18.11:8081`; update it if the computer's address changes.

All payment secrets stay in `backend/.env`; do not paste them into chat or the mobile configuration. The gateway options will remain unavailable until their configuration is complete. Do not enter real card or wallet credentials into test checkouts.

Official references: [Safepay checkout](https://safepay-docs.netlify.app/build-your-integration/express-checkout/), [Safepay webhooks](https://safepay-docs.netlify.app/developers/webhooks/overview/), [JazzCash sandbox](https://sandbox.jazzcash.com.pk/SandboxDocumentation/v4.2/index.html).
