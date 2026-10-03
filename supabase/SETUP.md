# SKF chat — Master login + push notifications: one-time setup

The app now opens only with the **shared company email + password** (no more WiFi check). It also
sends a **push notification for every new message**, even when the app is closed.

The password is never stored in the app. It is checked by Supabase, and the database itself refuses
to hand chat data to anyone who is not signed in as the Master account. Someone who is sent the app
but not the password only ever sees the login screen.

Do the steps **in this order** — running the SQL before the master user exists (or before everyone has the
new app) would lock people out.

---

## Part 1 — Master login (~10 minutes)

**1. Turn off public sign-ups** *(important — they are currently ON for your project)*
Supabase Dashboard → **Authentication → Sign In / Providers** → switch **"Allow new users to sign up"** off → Save.

**2. Create the shared login**
**Authentication → Users → Add user → Create new user**
- Email: the shared company email everyone will type, e.g. `team@skfironmining.com`
- Password: choose a strong one (this is the password everyone will type)
- Tick **Auto Confirm User** → Create

Everyone signs in on the app's login screen with **this email + password**. It can be any email address
format; it does not have to be a real inbox (nothing is ever emailed to it).

**3. Run the SQL** (Dashboard → **SQL Editor** → paste each file → Run), in this order:

| # | File | What it does |
|---|------|--------------|
| 1 | `skfl_schema.sql` | the messages table (`id`, `message_type`, one JSON `content`, `created_at`, `updated_at`) plus edit / delete / poll-vote support. Safe to re-run; converts an older table in place |
| 2 | `skfl_read_receipts.sql` | blue ticks (optional, skip if already run) |
| 3 | `skfl_master_access.sql` | **put the shared email from step 2 on line ~22 first.** Locks all chat data + media to the Master account |
| 3b | `skfl_password_change_signout.sql` | changing the Master password signs every phone out (they land on the login page at the next start) |
| 4 | `skfl_push_notifications.sql` | push notifications (needs step 1; works with or without step 3) |

`skfl_master_access.sql` stops with an error before changing anything if the Master user does not exist yet.

**4. Give everyone the new app.** Old copies of the app stop working the moment step 3 runs
(they have no Master login). Everyone signs in once and stays signed in.

### Everyday admin
- **Change the password:** Authentication → Users → the Master user → *Reset password*. With `skfl_password_change_signout.sql` installed this signs every phone out by itself: on the next start the app checks with the server while the loading screen plays and opens the login page instead of the chat. (Phones with no internet at that moment are let in until they are online again.)
- **Sign everyone out** (lost phone, leaked password): SQL Editor → `delete from auth.sessions;` then change the password.
  Phones return to the login screen within about a minute of being opened.
- **A friend was sent the app:** nothing to do — without the password they cannot open it or read any data.

---

## Part 2 — Push notifications

The database side is `skfl_push_notifications.sql` (step 4 above). The phone side needs a **real build of
the app** — notifications for a *closed* app cannot work inside **Expo Go** (Android removed that in SDK 53).

**One-time, from the project folder (the one that holds `app.json`):**

```bash
npm install -g eas-cli
eas login                       # your Expo account
eas init                        # writes the projectId the app needs for push tokens
```

**Android (Firebase Cloud Messaging):**
1. <https://console.firebase.google.com> → create a project → **Add app → Android**, package name **`com.skf.ironmining`**.
2. Download `google-services.json` into the project folder (next to `app.json`), then add this line inside `"android"` in `app.json`:
   `"googleServicesFile": "./google-services.json"`
3. Firebase → Project settings → **Service accounts → Generate new private key**. Then run `eas credentials`
   → Android → *Google Service Account Key for Push Notifications (FCM V1)* → upload that key.
4. Build the installable APK: `eas build -p android --profile preview` → download and install it on the phones.

**iPhone:** needs an Apple Developer account. `eas build -p ios --profile preview`, EAS sets up the push key for you.

**What people see** (WhatsApp-style): title **SKF Iron & Mining Pvt Ltd Team**, body `Anonymous: see you at the plant at 6`.
Photos / voice notes / files show as `📷 Photo`, `🎤 Voice message`, `📄 report.pdf`. The sender's own phone is not notified,
and nothing pops up while the chat is open on screen. Opening the app clears the notifications.

**Test:** install the build on two phones, sign in on both, fully close the app on phone B, send a message from phone A →
phone B lights up within a second or two.

**Until you have a build:** in Expo Go on Android notifications are simply switched off (Expo Go can't load the
notifications module at all) — the chat itself works normally. Notifications need the build above.

---

## Good to know
- Uploaded photos/videos/files live in a *public* storage bucket, so the file link itself opens for anyone who has the exact link.
  The links are only ever inside chat messages, which only the Master account can read.
- The shared email/password is one login for everyone, so it can't tell people apart — the chat stays anonymous (Anon-1234 badges) as before.
- After running `skfl_master_access.sql`, phones that were already signed in before that need to sign in once more.
