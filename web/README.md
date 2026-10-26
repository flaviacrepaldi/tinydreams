# Tiny Dreams

A private, literary world for tracking habits, practice days, and personal rewards. October's edition is **A biblioteca dos pequenos feitiços**.

## Local app with remote D1

Requires Node.js 24. The default `npm run dev` now uses the real Cloudflare D1 database **tiny-dreams** through its official HTTP query API. The page stays on http://localhost:4173 and has not been published.

```sh
cd web
npm ci
npm exec wrangler login
npm run dev
```

The existing Wrangler OAuth session is read only by the Node server and renewed through Wrangler when necessary. `CLOUDFLARE_API_TOKEN` may be supplied through the server environment instead. Tokens never enter HTML, frontend scripts, compiled Worker assets, or configuration files in the project. Account/database identifiers in `wrangler.jsonc` are not credentials.

The server supplies the stable `local-preview` identity and binds to loopback only. It is a personal local app and must not be used as a public production server. Internet access is required; connection errors never silently fall back to SQLite.

`npm run dev:offline` explicitly opens the original separate SQLite database at `.local/garden.sqlite`. It does not sync to D1. Existing local data was empty when D1 was connected; there was nothing to migrate. Export from preferences to keep a portable copy of the active database's habits and history.

Apply future D1 migrations with `npm run db:migrate`. The initial migration has already been applied to the remote database. Keep applied migrations immutable and add new files for future schema changes.

## Optional future hosting

The project is registered as an owner-private Site. `.openai/hosting.json` retains its exact project ID and `DB` binding. Sites can handle private account access and provision its own D1, but that would be a separate database from the user-account D1 now configured in `wrangler.jsonc`. Do not assume a future Sites deployment shares these records; plan access and data migration explicitly before publishing. There is no shared access key in the browser or source. Private Sites authentication replaces the originally suggested secret URL; this choice should be explained at handoff.

Build: `npm run build`, then `npm run validate`. The compiled Worker embeds the authored HTML, CSS, JS, artwork, fonts, and manifest. The build copies migrations into `dist/.openai/drizzle` for deployment. Do not edit the compiled Worker by hand.

The user chose local-only use for now. Do not create a repository, commit, synchronize source, or publish unless requested later. A private Site was registered during preparation, but no source commit or deployment has been made. Normal local use now stores records in the remote D1 database. Offline mode alone uses `.local/garden.sqlite`.

## Habits and data

- The target measures completed practice days, not an elapsed date countdown.
- Check-ins are unique per habit and date in America/Sao_Paulo. Historical entries can be corrected in the calendar by selecting a habit.
- Check-in writes set an explicit desired state, so retries cannot double-count or unexpectedly undo progress.
- Streaks are computed separately from total progress. Missing a day preserves past practice.
- Rewards unlock when the practice target is reached. Undoing practice below the target revokes eligibility.
- The demonstration is in memory and never writes to D1. User records can be exported from preferences.
- Deletion removes the habit and its check-ins after confirmation.

## Prepared monthly editions

Twelve editions cover October 2026 through September 2027. `ui/editions.json` holds each world's tokens, composition, text, object names, artwork route, and measured source geometry. `ui/theme-clock.mjs` chooses the date in America/Sao_Paulo. `ui/themes.js` applies presentation only, checks for date changes every 30 seconds while visible, and refreshes on return to the tab. January 12, 2027 has a birthday heading/subtitle. Beyond the prepared range, retain the last edition rather than silently cycling old themes.

Future artwork is not preloaded. Preferences contain a closed optional edition-preview disclosure; previews reset on reload, show an explicit banner, and never modify habit records or practice dates. Do not send surprise art in chat. Literary cozy warmth remains the shared identity; composition and illustrated objects vary by month. Decorative quotes outside headings/subtitles have been removed.

The generated image kits contain a landscape and a row of objects. Their measured geometry in the catalog preserves natural proportions and crops at the actual alpha gap rather than relying on a fixed generation boundary. Exact prompts remain beside the PNGs and are embedded as provenance metadata.

The local Node server provides the future-art `ASSETS` binding through an exact catalog allowlist. The build packages these files in `dist/assets/editions/` separately from the Worker, keeping the Worker small and loading only active artwork. A future hosted deployment must configure a static `ASSETS` binding for that directory; the existing standalone Sites manifest does not automatically provide it. Local operation is complete and does not require publishing.

## Checks

`npm test` covers SQLite-backed API behavior, authorization, the HTTP adapter with mocked responses, edition schedule boundaries, birthday timing, and token contrast. `npm run test:d1` is an explicit live integration check requiring the local D1 server; it verifies writes through the app using independent D1 reads, check-in idempotence, rewards, undo, atomic batch rollback, and cleanup. `scripts/browser-check.mjs` uses a running local server and Chrome DevTools on port 9222 for desktop/iPhone captures and interaction checks; it creates and removes only its own test records in the active database. Screenshots are in the project root `.impeccable/review/`.

## Assets

The talisman strip is scaled uniformly with `background-size: auto 100%`; keep its natural aspect ratio rather than stretching width and height independently. The two original illustrations were generated for this project. Their exact prompts are in `assets/PROVENANCE.md`. Fraunces and DM Sans are self-hosted Google Fonts distributed under the included SIL Open Font License files. No third-party script, font service, or analytics is requested by the published page.

## Small October animations

`ui/magic.js` owns the decorative night canvas, visibility observers, and persistent device-local motion preference. CSS animates the potion, bubbles, ghost, and check-in reward feedback without altering artwork proportions. Disable motion in preferences; OS reduced-motion takes precedence. No dependencies, sound, or D1 calls are added by the animation controller.

`node scripts/check-editions-browser.mjs` runs against a separate offline QA server on port4174 (override `TINY_DREAMS_QA_URL`). It checks all editions at320/390/768/1440px, forms/tabs/data preservation, no future-image preloading, preview reset, date-based birthday selection, and reduced motion. Captures stay under `.impeccable/review/editions/` and must not be forwarded to chat.

## Custom habit tracker

The default overview retains habits, accumulated practice, schedule-aware streaks, progress, and rewards. Each goal now has optional start/deadline dates and notes. Habit schedules select weekdays and may define different tasks per weekday (for example, daily skincare plus Sunday exfoliation). All scheduled tasks must be done before a day counts. Editing tasks preserves completed days; individual tasks and entire completed days can be undone in history.

Lists contain individually named and optionally dated steps, with actual completion dates: use twelve slots for monthly books or a list of annual appointments. Amount goals record positive decimal contributions with a unit, date, and optional note; each entry can be removed. Rewards are optional for every type. Tracking type is fixed once a goal has records. Eight editable form templates cover the supplied examples without inserting personal data automatically.

`0001_personal_planner.sql` adds nullable plan configuration and the `goal_entries` table, preserving the original goal IDs and check-ins. The local dev server checks and applies this additive migration on startup, for both remote D1 and SQLite. The planner migration was applied to the dedicated D1 database on October 26, 2026. Future hosted installations should apply the packaged migrations normally.

`npm test` includes planner API validation, weekday/date constraints, per-task daily completion, list-item identity, decimal contributions, idempotency, isolation, and undo. `node scripts/check-planner-browser.mjs` expects an offline QA server on port 4175 and Chrome DevTools on 9223; it checks all eight templates, routine/list/amount interactions, responsive layouts, persistence, and cleanup. It uses in-memory demonstration data and removes its own offline persistence fixture.
