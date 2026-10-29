# Halloween garden animation

The original `garden.png` remains the static fallback. The October-only scene in
`ui/magic.js` composites `garden-wind-base-v1.png` and the transparent
`garden-leaves-v1.png` at the original 1536 × 1024 coordinates. Both assets were
created with the built-in imagegen edit tool using `garden.png` as the edit target.

The hanging upper-right foliage sways over 8.5 seconds. Five localized light
layers align with the painted lanterns; the lantern structures remain stationary.
The stage follows the existing CSS cover size and background position, including
mobile crops. Existing canvas stars and shooting stars are unchanged.

The original scene stays visible until both layers decode successfully. Motion
respects the existing preference, reduced motion, open dialogs, hidden pages and
offscreen visibility. Other monthly editions do not mount or request these layers.
No changes to amulet motion or personal records.

## Final prompts (built-in imagegen)

### `garden-leaves-v1.png`

Use case: background-extraction. Edit target: supplied magical Halloween garden illustration, 1536x1024. Produce a transparent PNG layer for website animation. Extract ONLY the hanging red/orange maple foliage along the TOP RIGHT edge (approximately x=975..1536, y=0..238) retaining precise original shapes, painterly colors, fine twigs, and original placement. Everything else must be genuinely transparent. Keep original canvas aspect ratio 3:2 and all extracted leaves at their original coordinates, with empty transparent space over the entire rest of canvas. Do not include moon, sky, buildings, lower garden, text or any other objects. Exact registration to original image matters: this overlay will sit on the same-size background and sway gently. Do not crop to content. Do not add leaves. No checkerboard painted into the image.

### `garden-wind-base-v1.png`

Use case: precise-object-edit. Edit target: supplied 1536x1024 Halloween garden painting. Create a clean background plate for an animation. Remove ONLY the hanging red/orange maple leaves and twigs touching the TOP RIGHT border, approximately x=975..1536 y=0..238, replacing them with seamlessly matching purple starry sky behind them. Preserve EVERYTHING ELSE as precisely as possible: crescent moon at same position and size, distant landscape, arch, garden foliage lower down, all lanterns, pumpkins, pathway, painterly texture, palette, composition and 3:2 aspect ratio. Do not move any object, change lighting, add details, or remove ivy on the stone arch. This is a tiny localized removal, not a reinterpretation. No text.


## Perceptibility refinement and other editions

After the user found the first motion too subtle, the foliage excursion and flame
size/light modulation were increased. Other editions now use artwork-registered
native effect layers; their original PNGs are unchanged. Those effects are defined
in `sceneDetails` in `ui/magic.js` and use the same motion controls. No additional
image generation was needed for lights, steam, reflections or weather overlays.
