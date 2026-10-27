# Tiny Dreams

A private, literary world for tracking habits, practice days, and personal rewards. October's edition is **A biblioteca dos pequenos feitiços**.

## Local app with remote D1

Requires Node.js 24. The default `npm run dev` now uses the real Cloudflare D1 database **tiny-dreams** through its official HTTP query API. The page stays on http://localhost:4175 and has not been published.

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

For the now-requested owner-only Cloudflare Pages deployment, follow [PAGES.md](PAGES.md). `npm run build:pages` generates `dist-pages` with a private password login and the existing D1 owner mapping. This supersedes the earlier local-only hosting preference below; no deployment is performed by building.

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

Lists contain individually named and optionally dated steps, with actual completion dates: use twelve slots for monthly books or a list of annual appointments. Amount goals record positive decimal contributions with a unit, date, and optional note; each entry can be removed. Rewards are optional for every type. Tracking type is fixed once a goal has records. Creation opens directly in a custom form without personal example templates.

`0001_personal_planner.sql` adds nullable plan configuration and the `goal_entries` table, preserving the original goal IDs and check-ins. The local dev server checks and applies this additive migration on startup, for both remote D1 and SQLite. The planner migration was applied to the dedicated D1 database on October 26, 2026. Future hosted installations should apply the packaged migrations normally.

`npm test` includes planner API validation, weekday/date constraints, per-task daily completion, list-item identity, decimal contributions, idempotency, isolation, and undo. `node scripts/check-planner-browser.mjs` expects an offline QA server on port 4175 and Chrome DevTools on 9223; it checks custom habit/list/amount forms and interactions, responsive layouts, persistence, and cleanup. It uses in-memory demonstration data and removes its own offline persistence fixture.

### Daily quantity habits
A habit can use a positive `plan.dailyTarget` and `plan.unit` instead of a manual check or routine tasks. Dated contributions share the existing entries table. The API updates the contribution and uses the database sum to add/remove the daily check-in in one transaction. Quantities accept two decimal places; retries with the same entry key are idempotent, units cannot change after quantities have been recorded, and contributions do not carry over between dates. Overall habit targets and streaks continue to count completed days. No new database migration is required.

`node scripts/check-quantity-browser.mjs` expects an offline server on 4177 and Chrome DevTools on 9223. It verifies partial daily progress, threshold completion, undo, independent dates, Today progress, and the mobile form using demonstration data only.

The user-facing preview uses port **4175** consistently. Run `PORT=4175 npm run dev`, and restart that same process after rebuilding embedded assets. Other ports are reserved for internal offline QA. `node scripts/check-task-editor-browser.mjs` checks the compact task editor against the offline QA server on 4177, including completion modes, task accordion, saving/reopening, removal, and mobile layout.

### Card symbols and automatic amulets
A four-column picker selects among sixteen thin-stroke SVG symbols matching the original card style. The same symbol appears on cards and Today. Native emoji are no longer displayed or entered; existing `plan.emoji` values remain internal compatibility keys. New dreams receive an automatically assigned amulet, preserved on editing. Monthly editions affect illustrated amulets independently of selected symbols. `scripts/check-emoji-browser.mjs` verifies selection, card/Today rendering, editing, amulet preservation, and mobile sizing.

A habit with both start/end dates always derives its target from the scheduled weekdays across the inclusive period. This applies to old records with stale targets on API reads and in the frontend, saving, and reward eligibility. The field is read-only with a complete period; without one, the user enters a target explicitly, with no 21-day default. UTC calendar arithmetic handles leap days without device timezone/DST drift. Invalid, empty-schedule, and overly long periods show validation guidance. Daily quantity thresholds, amount targets, and lists are unaffected. `scripts/check-duration-browser.mjs` checks these form interactions against the offline QA server.

Dated habit cards use a calendar countdown until the deadline and label the separate progress denominator as all scheduled days of the period. This avoids displaying missed past practices as days still available. Past-deadline cards show an ended deadline without falsely completing the habit; undated habits still count remaining practice days.

### Impulse habits and explicit daily results
`plan.impulse` selects the “Resistir a um impulso” mode, with an optional `plan.support` agreement. Resisted urges are dated `goal_entries` with `urge:` keys and optional notes. They do not create daily check-ins automatically. A separate `POST /api/goals/:id/outcome` sets `success`, `failure`, or `null` (unrecorded). Successes reuse check-ins; failures use the additive `0002_daily_outcomes.sql` table. Mutations atomically maintain mutual exclusion, date/owner constraints, and reward eligibility. Reads take one database snapshot. Existing check-ins remain successes; absent days remain unrecorded.

Past-start habits automatically open their pending date history after creation. The same history is available from the card and calendar, with pending/all filters and 14-day pages. Outcomes can be corrected; an explicit current-day failure breaks the streak without deleting other successes. Task/quantity habits require their underlying records before success, and clear-day actions reset the corresponding records. Clearing an impulse's daily result preserves moment victories. An existing simple habit can be edited into impulse mode without losing its dates and successes.

The dev server applies the additive outcomes migration on startup to the selected database; SQLite test initialization also applies it. `npm test` covers outcome transitions, migration preservation/idempotence, pending-history bounds, independent urge records, ownership, measured/task constraints, rewards, and deletion cleanup. `scripts/check-outcomes-browser.mjs` uses the offline QA server on 4177 and checks creation/backfill, daily corrections, urge independence, streaks, calendar, mobile/desktop sizing, persistence, and its own fixture cleanup. User-facing updates remain on port 4175.

Success/failure buttons are directly available on habit cards and Today. They reuse the explicit outcomes endpoint without opening the history modal, support correction/undo, and preserve task/quantity completion rules. `scripts/check-front-outcomes-browser.mjs` verifies these quick actions and responsive layouts with demonstration records on the offline QA server.

## Layered ghost animation

October's sage amulet uses a stationary transparent jar and an independent transparent spirit. CSS animates the spirit behind the illustrated foreground, preserving the source proportions and the progress color filter. The original talisman sheet is unchanged. The new image URLs are scoped to October; other editions keep their own art. See `assets/ghost-animation.md` for saved assets and exact built-in image-generation prompts.

`dreamprogress` events connect the current success buttons, check-ins, and entry mutations to a brief talisman/progress celebration. Modal updates wait for close; failure, undo and progress regressions do not celebrate. Cleanup uses a timer, including cards without rewards. Existing motion preferences, reduced motion, visibility, and offscreen pauses are honored. `node scripts/check-ghost-motion-browser.mjs` verifies the dive/scene geometry, success effects and cleanup, pause modes, modal deferral, mobile/desktop layouts, and edition isolation against offline QA on 4177 and Chrome DevTools on 9223. It uses only in-memory demonstration goals and stores review captures in `/tmp/tiny-dreams-ghost-review`.

## Navigation and calendar presentation

`ui/navigation.js` adds labelled mobile bottom navigation and lowercases authored DOM copy while preserving explicitly protected user text. Keep those exclusions when adding user-generated content. `ui/navigation.css` uses current edition tokens and keeps scenic art on the overview rather than behind task controls. `shared/calendar.js` derives planned/done/failed/partial sticker states without mutating records; it respects habit schedules, one-time list dates and amount-goal deadlines separately. `scripts/test-calendar.mjs` covers these semantics. `node scripts/check-navigation-browser.mjs` uses offline QA on port 4181 and CDP on 9223, creating only in-memory demonstration fixtures; it checks four-view navigation, mobile/desktop/320px layouts, custom-text case, calendar/day details, future read-only states, form disclosures, shelf/album, preferences and a light edition. User preview remains on port 4175. Rebuild Pages with `npm run build:pages` before publishing updates.

## Release freshness

Publish prepared updates directly with `npm run deploy` from the workspace root or `web`; it builds, checks and deploys to `tinydreams` / `main` through Wrangler. Authenticate with `npm run deploy:login` at the workspace root when requested. This command publishes; ordinary builds do not. No commits are created.

Builds fingerprint deployed content and version HTML/CSS/manifest resource URLs. `ui/updates.js` checks the uncached release metadata on resume/online and once a minute while visible; it defers reloading during dialogs, focused fields and writes. It never clears cookies, localStorage or D1. See PAGES.md for rollout constraints. `scripts/test-updates.mjs` and `scripts/check-updates-browser.mjs` verify the update lifecycle.
