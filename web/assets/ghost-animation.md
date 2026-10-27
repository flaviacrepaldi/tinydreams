# Ghost dive animation · October

Completed for Tiny Dreams on October 27, 2026. Generated with the built-in `image_gen` tool (the `imagegen` skill), using `talismans.png` as the local reference/edit target. The original sprite strip was not changed.

Saved project assets:

- `web/assets/ghost-jar-v2.png` — 1024×1536 RGBA; empty stationary cloche, including flowers, moss, brass and glass.
- `web/assets/ghost-spirit-v2.png` — 1254×1254 RGBA; isolated friendly spirit with real alpha.

The browser combines the complete jar, a clipped interior containing the spirit, and the jar's lower foreground. The character descends behind the plants, turns gently, then returns. All layer sizes preserve the generated canvas ratios. The original color/progress filter applies to the composite. Only the October edition uses these assets; other editions retain their own artwork.

## Exact built-in prompts

### Stationary cloche

> Use case: precise-object-edit. Asset type: transparent illustrated animation layer for an existing cozy literary habit-tracker UI. Input image is the edit target/reference. Isolate ONLY the rightmost antique green glass cloche/terrarium from the reference; omit the left potion and center pumpkin. Preserve the exact lovingly hand-painted storybook appearance, green antique glass, brass finial and base, botanical white flowers, small mushrooms, moss, glass highlights, and proportions. Remove the white ghost from inside the jar entirely and plausibly restore the empty green-tinted glass and foliage behind it. Keep the central upper inside of the glass relatively quiet and uncluttered, suitable for independently overlaying that same ghost later. No new characters. One centered complete empty glass cloche, upright front view, fully visible with tiny margins, on REAL TRANSPARENT background. Tall portrait canvas preferably 1024 by 1536. Object fills 95% of canvas height, leaves no large blank border. No text, labels, mockup, ground plane, other objects, or external colored glow. This is the stationary jar layer for a ghost gently diving inside; it must contain NO ghost and NO face.

### Spirit layer

> Use case: background-extraction. Asset type: transparent moving character layer for an existing illustrated UI. Isolate ONLY the little friendly warm-white ghost INSIDE THE RIGHTMOST GLASS JAR of the reference. Preserve its exact hand-painted paper texture, creamy luminous fabric, sweet two dark oval eyes and tiny smile, small raised arms, swooping wispy tail, original tilt and friendly character. Remove ALL glass, metal, plants, stars, mushrooms and background. A single complete tiny spirit, in the same pose as the source, with clean softly antialiased edges and genuine transparent background everywhere else; do not include its jar or rectangular source background or huge diffuse halo. Center it on a transparent square canvas, body occupying approximately 85% of height, preserve its original character proportions. No text, labels, shadow ground, or extra character. This sprite will independently bob and dive inside the matching stationary glass cloche in a website.

Both calls used `transparent_background: true`. Original generated files remain in the tool's generated-images directory; the application references only the copies above.
