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

## Temporary email-only app access

The `/api/auth/guest` endpoint lets a visitor enter an email address without proving ownership. It always issues a regular-user token (never an administrator token) and is rate-limited. Do not treat this as identity verification; replace it with verified sign-in before relying on account identity or private account data.

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
