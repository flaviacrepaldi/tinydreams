# Project instructions

## Git commit messages

After making code changes, always suggest a short, clear Conventional Commits message in English. Append this trailer, separated by a blank line:

Co-authored-by: Codex <codex@openai.com>

Do not create commits automatically unless explicitly requested.

## Required visual checks

For every UI change, before publication:

- Run `npm --prefix web run check:ui`. This uses a temporary database and browser; never change personal records for QA.
- Inspect the generated screenshots, not only the passing assertions. Check the entire card from title to last action, all affected variants, mixed groups, wrapped titles/notes, and the active theme.
- Check 320px, 390px and 430px mobile widths and desktop. Reproduce user screenshots with a read-only snapshot of current records when needed. Check the installed-app viewport and bottom safe area for navigation changes.
- Verify compact total card height, no unintended internal vertical scrolling, no large empty gaps, no clipped actions or horizontal page overflow, and stable streak positions. Alignment alone is not a sufficient result.
- Do not equalize cards by adding the largest independent height of every section. Do not publish a layout that adds large empty spaces merely to satisfy alignment.
- Strengthen the regression checks for any reported issue, then run them against the final build. If a required check fails or cannot run, fix it before publishing; never describe an unperformed check as passed.

`npm run deploy` runs browser layout checks and must stop before upload on failure. Keep this gate in local and CI deployments. Passing automation does not replace inspecting screenshots.
