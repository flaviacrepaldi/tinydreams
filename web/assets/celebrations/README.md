# Watercolor celebrations for all twelve editions

Asset: ../potion-celebration-v1.png. Generated with the built-in OpenAI image tool from the approved three-pose watercolor concept, preserving transparency. Original remains in Codex generated_images; the app uses this workspace copy.

Prompt: transparent square 4 × 4 animation atlas, 16 equal cells; same anchored watercolor lilac potion bottle with copper crescent, bubbles in row one, curling lilac smoke and emerging ivory ghost in row two, upright smiling ghost in row three, ghost raising a golden star in row four. Preserve painted glass, pigment texture and botanical base; no text, grid lines, backdrop, rotation or 3D rendering.

Playback: item frames 0–3, day frames 4–11, full dream frames 4–15. Finite CSS stepped playback; reduced motion and paused animations show the appropriate final pose. All twelve editions use distinct transparent 4 × 4 atlases. Eleven additional files live alongside this README, named YYYY-MM-v1.png. Full prompts for those files are saved in prompts.json; they were generated with the built-in OpenAI image tool using the October atlas as style and grid reference. Artwork loads only for the active edition and is served as static assets rather than embedded into the Worker bundle.


## Scenes

- November: seashell opening and revealing a luminous pearl.
- December: a gift opening and releasing a golden star.
- January: a celestial globe rising out of an atlas.
- February: a mask with unfurling ribbon and feather.
- March: coffee steam taking the shape of a crescent moon.
- April: a terrarium flower opening with golden pollen and butterflies.
- May: a letter emerging from its envelope with a pressed rose.
- June: a bookshop opening with warm light and a floating book.
- July: a lit vintage train with curling steam and a floating ticket.
- August: an archive journal unlocked by a golden key.
- September: a paper bird unfolding its wings above a handmade notebook.

The June atlas uses `celebrationFinalRow: 96` to align its slightly raised final row and preserve the full bookshop roof in the viewport. Other atlases use the standard 100% final-row offset.
