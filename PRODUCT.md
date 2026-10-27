# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
delegated: Cloudflare Workers, plain HTML/CSS/JavaScript, and D1. Keep the personal tool inexpensive and usable from iPhone.

## Users
Flavia alone, visiting daily from her iPhone.

## Product Purpose
Build habits by recording completed days, counting remaining practice days, and attaching meaningful rewards to goals.

## Operating Context
The default view highlights countdowns toward goals and rewards. Today and calendar views provide daily recording and history. Native iOS widgets are outside current scope because of installation cost and maintenance.

## Capabilities and Constraints
Create and edit goals, record or undo days, show total progress separately from streaks, and redeem earned rewards. Persist across devices in D1. Personal access should be private. A long random access key was suggested; final hosting access mechanism remains open.

## Brand Commitments
An immersive layout that feels like entering another dimension. Halloween is the current seasonal theme. Future monthly worlds should surprise the user; theme selection and technology are delegated. The user authorized creating the full run of prepared editions and switching automatically by month, from October 2026 through September 2027. Newly authored themes after that range remain future work.

## Evidence on Hand
No real habits or reward data supplied. Examples must be explicitly labeled and separate from personal data.

## Product Principles
- Make rewards and remaining practice days immediately visible.
- Preserve total progress even after a missed day.
- Make daily recording quick on a phone.
- Change the surrounding world without changing habits or their history.

## Permanent Literary Direction
The user loves books. Every future monthly theme must connect to literature: reading, books, narrative worlds, libraries, or literary genres. Halloween should feel handmade and illustrated, using potions and friendly ghosts like the generated artwork. This applies to components and interactions as well as scenery. The user explicitly delegates future visual choices and asks for surprise rather than a theme selection process.

## Current Delivery Scope
The user chose local-only use for now. Do not create a Git repository, commit, synchronize source, or publish unless requested later. The user subsequently authorized connecting the local app to real Cloudflare D1 for testing. Default local use now stores records in the exclusive tiny-dreams D1 database through a server-only HTTP adapter; the site remains unpublished. Explicit offline mode retains the separate web/.local/garden.sqlite database.

## Cozy Library Anchor
The user loves the cozy library atmosphere and wants it as the enduring emotional anchor for every monthly world. Vary layout composition, illustrated objects, materials, lighting, and celebration substantially so each edition feels surprising, rather than recoloring a fixed template. Preserve readable task controls and all personal records. Seasonal direction follows Brazilian autumn, winter, and spring; ignore summer as a theme. October keeps Halloween and December keeps Christmas.

## Implemented Edition Schedule
Twelve prepared cozy literary editions cover 2026-10 through 2027-09, selected automatically in America/Sao_Paulo. Each has its own composition, artwork, object labels, palette, and ambient effect. Do not generate or send surprise images in the main chat. Future edition previews are closed by default and require an explicit user action; they never change practice dates or D1 records. Do not preload future artwork. Keep the last prepared edition after September 2027 until the user proposes and authorizes more themes. A title/subtitle variation celebrates January 12, 2027. Decorative scattered phrases were removed by user request; retain headings, subtitles, functional instructions, status, and data.

## Custom habit plans
The app remains a habit tracker, with the overview of dreams and progress as the default landing view (explicitly chosen by the user). Each habit supports optional start/deadline dates, chosen weekdays, notes, and an optional reward. Optional routine tasks vary by weekday; a day counts when all its scheduled tasks are done. Total practice survives missed days and remains distinct from a schedule-aware streak. Task edits preserve previously completed days; the history permits correcting individual tasks or undoing a whole day.

Lists support individually named books, appointments, or milestones with optional planned dates and actual completion dates. Amount goals support dated decimal contributions, units, notes, and undo. Creation starts directly from a blank custom form; the user requested removing their examples from the template selector. Monthly reading plans can use individually named and dated slots. The user supplies actual titles, appointments, and records. Existing habits and history remain intact through an additive D1/SQLite migration.

## Daily quantities
Habits may use a daily numeric threshold and a custom unit (such as liters or glasses). Contributions accumulate within their own practice date; reaching the daily threshold creates the day's check-in and contributes one practice day toward the habit target. Removing contributions below the threshold undoes that day. Totals do not carry into other dates. This mode is separate from cumulative amount goals and from task-based routines. Existing goal JSON and entry storage support it without another schema migration.

## Stable local preview
The user requests that updates always be available on the same preview port. Keep the user-facing local app at http://localhost:4175 and restart that instance when rebuilding embedded frontend assets. Separate offline QA servers may use other ports internally; do not direct the user to those servers.

## Symbols and amulet ownership
The user chooses each dream's small outline symbol, in the original thin-stroke SVG style. Do not render colorful native emoji or offer native-keyboard emoji entry. A labeled picker offers book, water, leaf, star, target, moon, fruit, strength, music, writing, savings, flower, sun, heart, coffee, and home. The app chooses the illustrated amulet automatically and preserves it on edits. Symbols appear consistently on cards and Today, independent of monthly artwork. Legacy `plan.emoji` values remain the internal persistence keys for compatibility.

## Dates and practice targets
Habit dates define the practice-day target whenever both start and end are set, using scheduled weekdays across the inclusive range. This rule applies to existing goals on read, display, saving, and reward eligibility, overriding stale defaults. The form shows the computed target read-only; without a complete period, require an explicit manual target with no prefilled 21-day default. Daily quantities and cumulative amount/list goals remain independent. For dated habits, the prominent card number counts calendar days until the deadline. The progress bar separately shows completed days out of all scheduled days in the original period. Missed past dates do not appear as remaining practice-day debt. Undated habits keep their remaining-practice countdown.

## Impulse habits and daily outcomes
The user wants a habit mode for resisting an impulse and an explicit way to backfill success or failure when a dream starts in the past. “Resistir a um impulso” is a habit completion mode; it supports a personal optional coping agreement, dated moment victories with optional notes, and a separate daily result. Recording a resisted urge never automatically completes the day. Daily results have three states: success, failure, and unrecorded. A failure breaks the current streak but leaves other successful days and their total intact. Missing records are never inferred as failures.

Creating a past-start habit opens its missing-day history. Cards expose a link to fill pending past days, with paginated pending/all views and reversible outcome changes. Calendar days open the same date editor and distinguish success, failure, and partial records. Simple and impulse habits can mark success/failure directly; task and quantity habits still require their tasks or quantity before success. Existing simple habits can switch to impulse mode while retaining their history. The user supplies actual outcomes; never auto-fill past successes or failures.

## Feature communication
When a user asks about a capability that already exists, point out where to find it before proposing or implementing an enhancement. Distinguish existing functionality from newly added behavior. The user explicitly requested this after discovering historical day entry in the existing calendar.

## Inclusive deadline countdown
The user explicitly wants today's date included in the card countdown. Count both today and the end date; a deadline today displays one day with “termina hoje”. An expired deadline remains expired. This is independent from the scheduled practice-day total and daily outcome records.

## Daily actions on the front
The user wants failure recording directly on the dream card, beside success, rather than behind the history link. Show both daily outcomes on the overview and Today. Impulse habits use “Resisti hoje” and “Cedi ao impulso”; ordinary habits use “Fiz hoje” and “Falha hoje”. Repeating the selected result clears it; switching results corrects the day. Quick actions must not open the history dialog. Quantity/task success still opens the required recording controls, and a failure cannot contradict already-complete measurements/tasks.

## Ghost dive and success motion
The user asked for more animation, specifically the small ghost diving inside its glass jar. October's sage amulet now composites a stationary illustrated jar, an independently animated spirit, and a foreground plant layer. The ghost dives behind the plants and resurfaces on a gentle loop; the glass stays still. New raster layers are non-destructive siblings documented in web/assets/ghost-animation.md. Other editions retain their artwork and behavior.

Successful progress from the current quick-outcome buttons, task/quantity/list entries, and historical corrections triggers a brief talisman/progress celebration. Feedback recorded inside a dialog waits until that dialog closes; undo or regression cancels it. Failure does not trigger a celebration. Manual motion pause, reduced motion, hidden-page pauses, and offscreen art pauses remain effective. No habit data, targets, or eligibility rules change.

## Tydream celebrations and library
Completed goals become books in the Prateleira view; the overview keeps active goals. The shelf derives completion and its practice date from D1-backed days/list entries/amount contributions, independently of optional rewards and redemption. Books retain history, editing and reward redemption. Correcting records below the target returns the dream to active progress; missing a later day does not erase earned practice.

Daily success has a brief, dismissible completion panel; completing today's scheduled habits has a daily summary. Reaching a dream target opens a larger nonmodal book-and-seal scene with a link to the shelf. Scenes wait for dialogs to close and cancel on regression. Daily panels dismiss automatically after six seconds. Device-local acknowledgments prevent replay after undo/recheck; demo acknowledgments stay in memory and separate from real data. The shelf itself is derived from saved records and works across devices.

This system applies to every prepared monthly edition and future editions: inherit active theme tokens and its existing amulet artwork, keep the book as a permanent literary link, and adapt object success motion to the edition's atmosphere. No future art preloading, sound, new dependencies, or remote schema changes. Respect motion pause and reduced motion while retaining visible completion status. New animated objects must preserve the shared completion hooks and pause behavior in every theme.

## Surprise-only themes and button actions
The user removed the edition preview/apply controls from Preferences. Monthly worlds now have no user-facing selector or preview banner: they reveal themselves automatically by the São Paulo calendar, without preloading future art. The internal presentation-only QA hook remains for checking all prepared editions. Secondary actions (history, editing, removal, pagination and demo return) must look like buttons with a visible boundary, themed background, and a minimum 44px touch target, rather than underlined links.

## Big Dreams and compact home
The user names dream groupings “Big Dreams” (also called bdreams): one named project/category can contain multiple tydreams; a tydream belongs to at most one Big Dream. The home shows named Big Dream sections and unassigned dreams separately. Create empty groups, rename them, select/move member dreams, choose membership in the dream form, and remove a group without deleting dreams or records. Persist owner-scoped groups and optional goals.group_id through additive migration 0003_dream_groups.sql in D1/SQLite; include groups in exports. Existing ungrouped goals stay intact; group-only edits preserve history and reward state. Demo groups stay separate from real records.

Home tydream cards are compact in every monthly edition while preserving animated amulets, progress, deadlines, daily outcomes and history. On mobile (up to 560px), each Big Dream displays its tydreams in a horizontal swipe gallery with snap alignment, no visible scrollbar, and a glimpse of the next card; a single tydream fills the row. Desktop uses a compact grid. Preserve vertical page scrolling and keyboard access. This supersedes earlier full-size seasonal home card arrangements, while retaining each edition's artwork, colors and motion.

## Larger amulets and a circling ghost
The user wants more prominent amulets on compact home cards across editions. October's ghost should continuously turn and circle inside the stationary glass, rather than disappear into the foliage and bob vertically. Use a visible nine-second circular tumble without opacity changes, retaining pause, offscreen and reduced-motion behavior. Preserve the compact cards and mobile galleries.

## Calendar dream symbols
Completed calendar dates show the chosen outline symbol of each tydream instead of a success dot, consistently across themes. Show all completed dreams for a date; filtered views retain only the selected dream. Habit successes stamp their practice date, list completions stamp their actual entry date, and cumulative amounts stamp the date the target was reached. Failure and partial-record markers remain distinct. Symbols wrap within the calendar cell on mobile, with completed titles available to assistive technology and on hover. No native colorful emoji or changes to stored outcomes.

## Big Dream book-cover presentation
Named Big Dreams have editorial book-cover headers: a binding edge, inset foil-like rule, book emblem, large name (including an optional emoji typed from the mobile keyboard), and a truthful total/completed tydream summary. Use a subtle crop of the current edition's already-loaded illustration for material and light; never load future artwork. The header connects directly to the mobile page gallery and compact desktop grid. Unassigned dreams retain a simpler heading. No data model change is needed for name emojis.

## Ghost motion stopped
The user explicitly requested stopping the ghost rotation. Keep the ghost in a fixed resting pose inside the glass, including during success feedback. Do not restore diving, orbiting or tumbling without a new request. Other amulets and existing progress/reward feedback remain.

## Edition-specific progress markers
The leading edge of a dream's progress bar uses the current monthly edition's own thin-stroke SVG symbol instead of a plain circle. Each of the 12 prepared editions declares a distinct progressSymbol. October uses a friendly ghost; later symbols remain surprises. Markers move with earned progress, also appear in daily quantity details, inherit theme colors, and preserve text/ARIA progress values and reduced-motion behavior. This is independent of each dream's personal symbol and its calendar stamps. No new image requests or data changes.

## Random amulet assignment
New tydreams randomly receive one of the three persistent amulet slots with equal probability, independently of their title. Save the selected slot with the dream; editing and reloading preserve it. Existing dreams retain their current amulets. Each monthly edition maps the same three slots to its own three illustrated objects.

## History button visibility
Home cards show history actions only when an explicit start date is earlier than today in São Paulo. Simple habits without such a date hide the history button. Task, quantity, impulse, amount and list controls remain available for daily use, but their labels do not advertise history until the dream has a past start. Pending-day backfill continues to show only for past scheduled dates with missing outcomes. Calendar corrections and the completed-dream shelf keep their existing history access.

## Mixed amulet distribution
The user wants variety and asks to avoid the previous amulet whenever possible. New dream assignment excludes the last dream's amulet and randomly chooses among the least-used remaining slots. Existing saved assignments stay stable unless the user requests a reshuffle. An explicitly requested reshuffle should prefer different assignments for each dream, adjacent variety, and balanced use of all three slots when feasible. This supersedes the earlier independent equal-probability draw.
