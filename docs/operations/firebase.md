# Firebase setup and troubleshooting

Read for authorized provider, rules, owner-access or live connection work. For browser behavior and fields, use [availability and presence](../features/availability.md). [Recorded status](../status.md)

## Configuration and scope

Project selection is in `.firebaserc`; `firebase.json` selects `database.rules.json`. Browser configuration lives in `assets/js/firebase-config.js`. Preserve SDK 13.0.0 and shared `firebase-database.js` transport initialization. Inspect actual live providers, rules and data before diagnosing; historical permission/authentication errors are not current checks.

The owner editor is `/login/` and uses Email/Password authentication in a separate app. Public presence uses anonymous authentication. Editor visibility is convenience; database rules enforce authorization.

## Owner editor setup

These actions change live configuration/access/data and require explicit authorization. Do not repeat setup if an owner already exists.

1. In the selected Firebase project, confirm Email/Password is enabled. Create or reuse the authorized owner account; no public sign-up flow belongs on the site.
2. Confirm that user's UID, then merge the single boolean child `owners/<uid>: true` into database **Data**. It is not a Rules JSON entry. Never import over the full database or copy a password into source/docs.
3. The existing [owner-access file](../owner-access.json) contains a scoped merge entry. Inspect it and confirm it matches the intended account before an authorized CLI update:

   ```powershell
   npx firebase-tools database:update /owners docs/owner-access.json --project sujeet-portfolio --confirm
   ```

4. Review `database.rules.json` against live rules and preserve unrelated branches/permissions. Deploy only the approved rules change:

   ```powershell
   npx firebase-tools deploy --only database --project sujeet-portfolio
   ```

5. Publish approved static files separately. Sign in at the www `/login/`, preview settings, then save once to `siteSettings/availability` if initialization is authorized. Confirm public badge/sidebar/contact updates and a visible failure for denied saves.

Only allowlisted, non-anonymous users write availability; browser clients cannot update the owner list or delete settings. Revocation removes the single `owners/<uid>` child; an existing signed-in session must still be denied. Owner sign-in uses session persistence with in-memory fallback; sign out on shared devices. Password-reset delivery depends on the project's configured email settings.

## Connection and permission troubleshooting

- Distinguish failed SDK loading, provider configuration, network/WebSocket failure, missing owner authorization and denied database rules. Do not turn a failed settings read into a successful empty record.
- Check CLI authentication before deployment; reauthenticate only if needed. Existing source configuration does not prove providers, allowlists, rules or secrets were activated.
- The database transport forces WebSockets before listeners/references. Networks blocking them cannot use long-polling fallback; static availability must remain readable.
- Presence writes belong to each anonymous user's own record; cleanup must not delete peers. Country counters and cursor field validation remain governed by the rules. Never resolve permission errors by allowing unauthenticated writes.
- Preserve live analytics and unrelated data while testing. Changing the analytics Worker does not fix Firebase database permissions.

## Verify and record

Run focused `admin`, `availability`, `presence`, `live-cursors` and `firebase-transport` tests before live changes. After an authorized update, check successful and denied owner saves, sign-out, two-window presence/cursors, disconnect/idle handling and reduced motion. Do not infer real sign-in or correct deployed rules from mocked tests. Record dated results in [status](../status.md).
