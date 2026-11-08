The owner page is `/login/` (GitHub Pages redirects `/login` to this directory).
It uses Firebase email/password authentication. There is no password in the site
source, and no custom server is required.

One-time setup in the Firebase Console, project **sujeet-portfolio**:

1. Under Authentication > Sign-in method, enable Email/Password.
2. Under Authentication > Users, add your owner account with your email and a
   password. Do not add a public sign-up flow to the portfolio.
3. Copy that user's Firebase UID. It is an account identifier, not the password.
   The owner account identified in this session is
   `HD0dcT2RNSgAAAFNsNHkYRkPvKr2`.
4. Under Realtime Database > Data, add `owners`, then a child whose key is the
   exact UID and whose value is the boolean `true` (not the string `"true"`).
   The resulting shape is:

   ```json
   {
     "owners": {
       "HD0dcT2RNSgAAAFNsNHkYRkPvKr2": true
     }
   }
   ```

   Add this child under `owners`; do not replace or import over the entire
   database. `docs/owner-access.json` contains just the child entry for a merge
   into `/owners`. With an authenticated project-owner CLI session, the
   equivalent update is:

   ```powershell
   npx firebase-tools database:update /owners docs/owner-access.json --project sujeet-portfolio --confirm
   ```

   This entry lives in the database's **Data** tab, not inside the Rules JSON.
   Saving the local JSON file alone does not grant access on the live database.

5. Publish the updated `database.rules.json`. Merge the rules into any unrelated
   existing branches instead of removing other application data or permissions.
6. Publish the site files and open `https://www.sujeetkhadka.com.np/login/` over
   HTTPS. Enter the email and password for the account you created.
7. Choose availability, the work types, an optional badge label and an optional
   public note. Save once to initialize `siteSettings/availability`.

Only non-anonymous users whose UID is explicitly allowed under `owners` can
write availability. Browser clients cannot modify the owner allowlist or delete
the settings. Availability itself is public so visitors can receive updates
without signing in. The editor UI is also gated, but Firebase rules enforce the
actual access control even if someone modifies the page in their own browser.

The badge, its hover details, the visitor sidebar summary and the contact text
update from the saved settings. The editor's preview is local until Save changes
succeeds. Changes to presence, cursors and Cloudflare analytics are not part of
this editor. Add new editor fields explicitly if needed later.

Owner sign-in uses session persistence with an in-memory fallback. It is isolated
from the public site's anonymous presence authentication. Use Sign out when
finished, especially on a shared computer. Forgot password requests go through
Firebase Authentication; email delivery follows the project's email settings.

To revoke editor access, remove `owners/YOUR_FIREBASE_AUTH_UID` in the console.
Database writes are denied even if the account still has an active sign-in.

The site keeps its published fallback status if availability cannot be loaded.
Publishing code does not enable authentication providers or grant editor access;
complete the setup above before expecting the login to save successfully.

Validation checks cover availability content and the existing presence/analytics
features. End-to-end owner sign-in and rules deployment require authorized access
to this Firebase project; they have not been verified against a live owner account.

Firebase references:
https://firebase.google.com/docs/auth/web/password-auth
https://firebase.google.com/docs/database/security/rules-conditions
