# Firebase Setup & Local Testing

## 1. Create Web App & Get Config
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project (**birdwatcher-ac749**).
3. **Register App**:
   - Click the **Web** icon (</>) (or "Add app").
   - Nickname: "Birdwatcher Web".
   - Uncheck "Firebase Hosting" (we handle this later).
   - Click **Register app**.
4. **Copy Config**:
   - You will see a `firebaseConfig` object using `SDK setup and configuration`.
   - Keep this visible for step 3.

## 2. Enable Google Authentication

1. In Firebase Console, go to **Authentication** (Build > Authentication).
2. Click **Get started** (if first time).
3. Select the **Sign-in method** tab.
4. Click **Google**.
5. Toggle **Enable** to **ON**.
6. **Support email**: Select your email address from the dropdown.
7. Click **Save**.

[Official Google Docs: Enable Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin#before_you_begin)

## 3. Enable Cloud Firestore
1. Go to **Build** > **Firestore Database**.
2. Click **Create database**.
3. **Location**: Select a region close to your users (e.g., `europe-west3` or `us-central1`).
4. **Security Rules**: Start in **App Check** or **Production Mode**.
   - Note: We have specific `firestore.rules` in this repo that will be deployed later.
5. Click **Enable**.

## 4. Configure Local Environment
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file and fill in the values from the console (from Step 1):

```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="birdwatcher-ac749.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="birdwatcher-ac749"
VITE_FIREBASE_STORAGE_BUCKET="birdwatcher-ac749.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="1:..."
```

## 5. Run the App
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

## 6. Testing Authentication

### Real Google Login
- Ensure you have the `.env` values set.
- Click **"Sign in with Google"**.
- NOTE: If running on `localhost`, ensure `localhost` is in **Authorized Domains** (Authentication > Settings > Authorized domains).

### Testing with Firebase Emulator
For E2E tests and local development without real Google Auth.

> [!IMPORTANT]
> **Java 21 Requirement**: The Firebase Emulator Suite requires **Java 21** to be installed and configured as the default on your system.

#### One-Command testing
```bash
npm run test:e2e:emulator
```
This automatically starts the emulators (Port 9099 for Auth, 8080 for Firestore), runs the tests, and shuts them down when finished.

#### Manual Control (for Development)
If you want the emulator to stay running while you work:
1. **Start Emulator**: `npm run emulator:start`
2. **Access UI**: http://localhost:4000
3. **Run App**: Ensure `VITE_USE_EMULATOR=true` is in your `.env`.

## 7. Setup CI/CD Service Account
To enable GitHub Actions to deploy to Firebase (Hosting & Rules):

1.  **Generate Private Key**:
    - Go to **Project Settings** > **Service accounts**.
    - Click **Generate new private key**.
    - Save the JSON file (do not commit this!).

2.  **Configure GitHub Secret**:
    - Go to your GitHub Repo > **Settings** > **Secrets and variables** > **Actions**.
    - Create a **New repository secret**.
    - Name: `FIREBASE_SERVICE_ACCOUNT_BIRD_WATCHER`.
    - Value: Paste the entire content of the JSON file.

3.  **Grant Permissions (Crucial)**:
    - The service account needs permissions to enable/use Firebase services via the CLI.
    - Go to [Google Cloud IAM Admin](https://console.cloud.google.com/iam-admin/iam).
    - Find the service account (matches the email in your JSON key).
    - Edit permissions and ensure it has:
        - **Firebase Hosting Admin** (To deploy the site)
        - **Firebase Rules Admin** (To deploy security rules)
        - **Cloud Datastore Index Admin** (To manage composite indexes)
        - **Service Usage Consumer** (Required for enabling APIs via CLI).
            - *Note: Without this, you may get `HTTP 403` errors on `firestore.googleapis.com`.*
