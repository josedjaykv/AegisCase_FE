# Phase 1 — Manual Testing Guide

Step-by-step verification of Phase 1 from a clean checkout, including the realistic backend dependency.

**Estimated time:** ~10 minutes (assuming the backend is already running).

---

## 0. Prerequisites

- **Node 20+** (`node -v`). Use `nvm use` if you have nvm.
- **The backend running** — Phase 1 makes real HTTP calls. Bring up the backend's `docker compose up` from the backend repo and confirm:
  ```bash
  curl http://localhost:3000/health      # → {"status":"ok",...}
  curl http://localhost:3000/            # → {"name":"AegisCase Backend",...}
  ```
- **Three Keycloak users seeded** with the realm roles `ADMIN`, `DETECTIVE`, `ANALYST`. Whatever seeding script the backend ships with — typically `admin@aegiscase.com / Admin1234!`, `detective1@aegiscase.com / ...`, `analyst1@aegiscase.com / ...`. Adapt to your seed.
- **CORS allow-origin** set on the backend if you ever see CORS errors: `CORS_ORIGIN=http://localhost:5173` in the backend env, then restart its gateway.

> **Without the backend up**, you can still verify steps 1–4 (install + form rendering + Zod validation + offline error toast). Login itself will fail with a network error.

---

## 1. From-zero install

```bash
cd /home/josed/AegisCase_FE
nvm use                        # if applicable
npm install                    # installs new Phase 1 deps on top of Phase 0
cp .env.example .env.local     # only if you don't already have one
```

Confirm `.env.local` contains:

```
VITE_API_BASE_URL=http://localhost:3000
```

Adjust if your gateway is elsewhere.

---

## 2. Run the four CI checks locally

Same as in Phase 0; they must all be green before exercising the UI.

```bash
npm run lint        # → "0 errors, 0 warnings"
npm run typecheck   # → no output (success)
npm run test:run    # → 8 passed (2 from Phase 0 + 6 new auth tests)
npm run build       # → ~163 KB gzipped initial bundle
```

If any of these fails, **stop and fix before continuing** — the UI tests below assume a healthy build.

---

## 3. Start the dev server

```bash
npm run dev
```

Open `http://localhost:5173`.

**Expected immediately:** You are **redirected to `/login`** because there is no session. The previous "auto-show the dashboard with a mocked DETECTIVE" Phase-0 behavior is gone.

**You should see** the login page:

- Centered card on a muted background.
- AegisCase wordmark with a `ShieldCheck` icon at the top.
- "Sign in" heading + a short instruction.
- Email + Password inputs, a full-width "Sign in" button.
- "Access is logged. Unauthorized use is prohibited." footer line.

---

## 4. Form validation (no backend needed)

Click "Sign in" without filling anything. **Expect** inline errors under each field:

- Email: `Email is required`.
- Password: `Password must be at least 6 characters`.

Type `not-an-email` and click "Sign in" again. **Expect** `Enter a valid email address`.

Type a valid email and a 6+ char password. The error vanishes; the button is no longer the source of validation noise.

If the **backend is NOT running**, attempt to sign in with valid-looking credentials. **Expect** the form error:

> Cannot reach the API at `http://localhost:3000`.

This proves the `status === 0` path in `LoginForm.tsx` works.

---

## 5. Login with each role (backend required)

For each of the three roles, log out (or open an incognito window) and:

1. Enter the seeded email + password.
2. Click "Sign in".
3. **Expect**:
   - A success toast: `Welcome, <email>`.
   - Navigation to `/` (dashboard).
   - The dashboard "Current session" card shows the user's email and the right role badge.
   - The sidebar shows the right items per role:
     - **ADMIN** → Dashboard, Cases, Tasks, Evidence, Involved, Media, Audit, **Users**, *Styleguide (dev-only)*.
     - **DETECTIVE** → same minus **Users**.
     - **ANALYST** → same minus **Users**.
   - The top-bar avatar shows the user's email's first two letters; the dropdown shows `<email> · <ROLE>`.

If login fails with `401`, the form shows `Invalid email or password.` — try again with the right creds.

If login fails with `503`, the form shows `Authentication service is unavailable.` — check Keycloak with `docker compose ps` on the backend.

---

## 6. Session restore on tab refresh

While logged in, **hit `F5`** to reload the tab.

**Expect**:
- A brief "Restoring session…" placeholder.
- Then the dashboard reappears with the same user / role — you are NOT bounced to `/login`.

This proves the `sessionStorage` refresh-token mirror + the AuthProvider bootstrap path work. **Open DevTools → Application → Session Storage** and verify the `aegiscase:rt` key is present. Verify there is **no** `aegiscase:at` (access token) in either `localStorage` or `sessionStorage` (it must live in memory only).

Close the tab entirely (not the browser, just the tab) and reopen `http://localhost:5173`. **Expect** you are bounced back to `/login` — `sessionStorage` is scoped to the tab.

---

## 7. Sign out

Click the avatar in the top-bar → "Sign out".

**Expect**:
- Redirected to `/login`.
- `sessionStorage:aegiscase:rt` is removed (verify in DevTools).
- Trying to navigate to `http://localhost:5173/` lands back on `/login`.

---

## 8. ProtectedRoute redirects with return path

While logged out, paste `http://localhost:5173/styleguide` into the address bar.

**Expect**: redirect to `/login`. After signing in, you should be **deep-linked back to `/styleguide`**, not the dashboard. This proves the `state.from` propagation.

---

## 9. 401 auto-refresh (the spicy one)

This needs the backend up and the access token short-lived (Keycloak default 5 min). Either:

**Option A — wait:** stay idle on the dashboard for the configured access-token lifetime, then click anywhere that hits the backend (any future feature). The interceptor should silently refresh and the action should succeed.

**Option B — force it:** in DevTools console, overwrite the access token to garbage:

```js
window.useAuthStoreForDebug = (await import('/src/stores/auth.store.ts')).useAuthStore;
useAuthStoreForDebug.setState({ accessToken: 'broken-token' });
```

(That import path works in dev mode.) Then trigger any authenticated request (e.g., reload — the auth provider will fetch `/auth/me`). **Expect** in the Network tab: the first request 401s, an `/auth/refresh` fires, the original request is retried automatically and succeeds. The UI never shows an error toast.

If the refresh itself fails (refresh token expired), you are auto-logged-out and bounced to `/login`. This is intentional.

---

## 10. Logout from an expired session (graceful)

Force the refresh token to garbage:

```js
useAuthStoreForDebug.setState({ refreshToken: 'broken' });
sessionStorage.setItem('aegiscase:rt', 'broken');
```

Click "Sign out". **Expect**:
- The `/auth/logout` call fails silently (Keycloak rejects the bad refresh token).
- The local state is still cleared and you land on `/login`.

This proves "logout is best-effort and never blocks the user from leaving".

---

## 11. Mobile drawer (responsive)

Open DevTools responsive mode and switch to **375 × 812**.

**Expect**:
- Sidebar is gone.
- Top-bar shows a **hamburger menu icon** on the left, theme toggle + avatar on the right.
- Tap the hamburger → a Sheet slides in from the left with the same nav items (role-filtered).
- Tap any link → the sheet closes and the route changes.
- Tap the X (or backdrop) → sheet closes.

Resize to **768 × 1024** — sidebar reappears; hamburger disappears.

Resize to **1440 × 900** — full desktop layout.

---

## 12. Theme toggle still works

In the top bar, cycle through light → system → dark. The toast notifications (try logging out and back in to see one) inherit the theme. Reload — the theme persists.

---

## 13. Done

If steps 1–11 pass, Phase 1 success criteria from `docs/phases/phase-1/plan.md` are met:

- ✅ All three roles can log in.
- ✅ Access token refresh works transparently on 401.
- ✅ 403 from any backend route surfaces a clear toast (verified for every protected endpoint we touch in Phase 1, and the interceptor handles it uniformly going forward).

You're ready to commit and request Phase 2.

### Reset back to a clean state (rare)

```bash
rm -rf node_modules dist .vite
npm install
```

Clear any session-restore state with DevTools → Application → Storage → "Clear site data".
