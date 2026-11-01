# Railway deployment

## Deploy the app and API

1. Push this project to a GitHub repository and create a Railway project from that repository. Deploy from the repository root; the included Dockerfile uses Node 22, installs the native build tools required by SQLite, builds the frontend, and starts the API.
2. Attach a Railway volume to the service and set its mount path to `/data`.
3. Set these service variables in Railway. Enter secret values only in Railway's Variables page:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_PATH` | `/data/app-data.sqlite` |
   | `JWT_SECRET` | A newly generated, long random secret |
   | `GOOGLE_CLIENT_ID` | The existing Google **Web application** client ID |
   | `GOOGLE_CLIENT_SECRET` | The client secret for that same Web OAuth client |
   | `GOOGLE_MOBILE_REDIRECT_URI` | `https://<railway-domain>/api/auth/google/mobile/callback` |
   | `REACT_APP_GOOGLE_CLIENT_ID` | The same Google Web application client ID |
   | `ADMIN_PASSWORD` | A private admin password of at least 12 characters, entered only in Railway |
   | `RESEND_API_KEY` | Resend API key (preferred email provider) |
   | `RESEND_FROM_EMAIL` | Sender address verified in Resend, e.g. `Nilgiris Tourism <noreply@your-domain.com>` |

   Resend is used for OTPs and order bills when both Resend variables are set. Verify the sender/domain in Resend before testing delivery. Gmail SMTP remains an optional fallback using `SMTP_USER` (sender Gmail account) and `SMTP_PASS` (its app password); SMTP requests now time out rather than remaining pending indefinitely.

   Leave `API_PORT` and `REACT_APP_API_URL` unset. Railway supplies `PORT`, and the deployed website calls its API on the same HTTPS origin.

4. Deploy the service and generate a Railway domain. Wait for `/api/health` to report `{"status":"ok"}`.
5. In Google Cloud Console, add `https://<railway-domain>` to the Web OAuth client's authorized JavaScript origins and add `https://<railway-domain>/api/auth/google/mobile/callback` to its authorized redirect URIs.

## Email OTP sign-in and shared updates

Regular users sign in with a six-digit email code that expires after five minutes. The code and per-email resend history are stored in the Railway SQLite database, so verification is not tied to the phone's browser session or a single server process. The email provider must be configured using `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, or Gmail `SMTP_USER` and `SMTP_PASS`. Keep provider secrets in Railway Variables. The administrator signs in using the private `ADMIN_PASSWORD`; administrator email is not eligible for user OTP sign-in.

The app and API should use the same Railway service/domain so mobile browsers can send and verify OTPs without a separate API setting. The Android APK must be built with `REACT_APP_API_URL` set to the public Railway HTTPS origin, so it never tries to contact its own WebView as the API. Open the Railway URL in a phone browser to use the responsive web app; email codes work in both the phone browser and the APK.

Administrator changes are stored on the shared Railway database. Active users refresh immediately when the backend emits an update, on returning to the app, and at least every 30 seconds as a cross-instance fallback. Railway must keep the database volume mounted at `/data` as described above; do not run the service with local ephemeral storage if updates must survive deploys.

The admin account `adithya01022007@gmail.com` signs in with the `ADMIN_PASSWORD` service variable. Choose a unique password of at least 12 characters and enter it only in Railway's Variables page; never commit it or send it in chat. Admin sign-in is rate-limited. The admin dashboard's **User View** button returns to the regular app interface.

## Host the mobile-friendly frontend on GitHub Pages

The frontend can be deployed as a GitHub Pages project site while the Express API runs on Railway. The app uses hash-based routes so direct navigation and refreshes work on GitHub Pages.

1. Deploy the backend on Railway using the steps above and confirm `https://<railway-domain>/api/health` reports `{"status":"ok"}`.
2. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and add:

   | Variable | Value |
   | --- | --- |
   | `REACT_APP_API_URL` | `https://<railway-domain>` (no trailing slash) |
   | `REACT_APP_GOOGLE_CLIENT_ID` | The Google Web application client ID |
   | `REACT_APP_GOOGLE_MAPS_API_KEY` | Optional Maps Embed API key |

   These values are embedded in the browser build; do not put server secrets such as `JWT_SECRET`, `RESEND_API_KEY`, or `SMTP_PASS` here.
3. In **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
4. Push the project to the `master` branch or run **Deploy frontend to GitHub Pages** from the **Actions** tab. The workflow builds and publishes the site at `https://<github-owner>.github.io/<repository-name>/`.
5. In Google Cloud Console, add the GitHub Pages origin (for example, `https://<github-owner>.github.io`) to the Web OAuth client's authorized JavaScript origins, alongside the Railway origin.

The Pages workflow fails with an explicit message until `REACT_APP_API_URL` is configured. The full-stack Railway deployment above remains an alternative that serves the frontend and API from one origin.

## Climate and travel-safety information

The Climate dashboard and tourism destination details request current conditions from Open-Meteo's forecast API and monthly historical averages from its archive API. No API key is required; the server caches forecasts for 10 minutes and historical averages for 24 hours. Historical charts use daily mean observations from 2015–2024 and are labeled separately from live weather.

The app does not automatically ingest IMD or district warning feeds. **Not Recommended** requires an active administrator-published restriction. **Caution** can result from an active admin advisory or model indicators (at least 20 mm forecast rain in six hours, visibility below 1 km, wind gusts at least 50 km/h, or a WMO thunderstorm code). These are precaution thresholds, not official warning criteria. **Safe to Visit** requires current weather, a source-linked admin assessment checked within the last 12 hours, and no active concern. Otherwise the result is **Unable to Verify Safety**; temperature alone never determines safety.

Administrators can publish, edit, and remove temporary advisories in **Admin Dashboard → Climate Safety**. The server requires an HTTPS `.gov.in` or `.nic.in` source, explicit source confirmation, and an expiry within seven days; safe assessments expire within 12 hours. Review official sources and road conditions before publishing: the dashboard does not verify the truth of an administrator's report. Expired advisories are excluded from tourist-facing safety results.

## Google sign-in from the Android app

The Android app opens Google's OAuth consent page in the system browser. After Google verifies the account, a short-lived, one-time ticket is sent back to the app's registered `com.nilgiri.smarttourism://auth` deep link. Configure the Web OAuth client ID, client secret, and Railway callback URI above; do not place the client secret in the Android app.

If the OAuth consent screen is in Testing mode, add the signing-in accounts as test users.

## Build a phone-installable debug APK

After the Railway domain is live, from PowerShell in the project directory:

```powershell
$env:REACT_APP_API_URL = 'https://<railway-domain>'
npm run build
npx cap sync android
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
Push-Location android
.\gradlew.bat assembleDebug
Pop-Location
```

The APK is created at `android\app\build\outputs\apk\debug\app-debug.apk`. Keep the backend running on Railway for OTP, sign-in, and order/payment services.
