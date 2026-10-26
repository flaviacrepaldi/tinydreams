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

Lists support individually named books, appointments, or milestones with optional planned dates and actual completion dates. Amount goals support dated decimal contributions, units, notes, and undo. Eight editable templates correspond to the user's supplied examples; choosing a template populates an unsaved form, never personal records. A monthly reading template creates twelve individually editable dated slots. The user supplies actual titles, appointments, and records. Existing habits and history remain intact through an additive D1/SQLite migration.
