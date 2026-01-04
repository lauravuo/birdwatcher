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

## 3. Configure Local Environment
1. Open the `.env` file in the project root.
2. Fill in the values from the console (from Step 1):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=birdwatcher-ac749.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=birdwatcher-ac749
VITE_FIREBASE_STORAGE_BUCKET=birdwatcher-ac749.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=1:...
```

## 4. Run the App
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

## 5. Testing Authentication

### Real Google Login
- Ensure you have the `.env` values set.
- Click **"Sign in with Google"**.
- NOTE: If running on `localhost`, ensure `localhost` is in **Authorized Domains** (Authentication > Settings > Authorized domains).

### Debug Bypass (Dev Mode Only)
To test the "Logged In" state (Dashboard) without real keys or Google Auth:
1. Open your browser's **Developer Tools** (F12) > **Console**.
2. Run this command:
   ```js
   localStorage.setItem("birdwatcher_debug_user", "true");
   ```
3. Refresh the page. You should see the Dashboard.
