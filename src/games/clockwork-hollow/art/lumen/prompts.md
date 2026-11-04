# Lumen actor prompts

AI-generated source artwork. These prompts describe the retained drawings, not a runtime dependency. Keep the complete keeper and beetle sources beside the packed atlases. See the [artwork guide](../README.md) for layout, anchors and preparation.

## Keeper

Use case: stylized-concept. Asset type: production transparent full-character animation atlas for a side-view platform game, Clockwork Hollow. Generate an original premium pre-rendered 3D-looking character sprite sheet, square image, EXACTLY 4 columns and 3 rows of equal cells, 12 full-body figures, one per cell. No grid lines, labels, letters, numbers, scenery, ground, cast ground shadows, border or watermark. Genuine transparent background.

Character identity consistent across all 12 frames: a small charming clockwork keeper exploring a moonlit botanical cathedral. Oversized spherical ivory glazed ceramic helmet, inset curved dark teal glass face with two luminous mint eyes, little brass antenna, compact rounded ceramic torso with a glowing turquoise glass heart set in a brass bezel, short sturdy brass-and-ceramic arms and legs, rounded boots, a short coral fabric scarf trailing LEFT. Full cohesive complete character anatomy, not parts or mechanical stick limbs. Handcrafted animated film miniature with exceptional 3D volume, bevelled edges, subtle ceramic wear, brushed antique brass, soft top-left warm key light and subtle teal rim light, rich ambient occlusion. Elegant and lovable, a more dimensional reimagining of a simple porcelain robot, not a futuristic combat robot. No black cartoon outline. Readable at 60 pixels tall. Face shown in right-facing three-quarter side view, locomotion toward RIGHT. Orthographic game camera, no changes in camera, lighting, scale or character proportions between cels.

Layout strictly left-to-right row-major:
row1: idle standing, walk 1 left-foot-forward contact, walk 2 passing, walk 3 right-foot-forward contact.
row2: walk 4 passing, walk 5 left-foot-forward contact slightly different arm/scarf, walk 6 passing, walk 7 right-foot-forward contact.
row3: walk 8 passing, jump ascent tucked boots with arms out, falling with boots lowered and arms balancing, defeated crouched slumped pose with dim eyes.

Keep every figure entirely inside its own equal cell with generous transparent gutters. In every standing/walking cel the lowest boot sole is at the same relative baseline, helmet at the same relative height, figure centered at same x. Each figure fills about 80% of cell height and 65% of cell width. Only poses change; the artwork is a finished continuous complete figure in every frame. Scarf and moving extremities stay within the cell. Provide all twelve figures.

## Beetle

Use `keeper-source.png` as the material and rendering reference.

Use case: stylized-concept. Asset type: transparent production enemy animation atlas for Clockwork Hollow. The provided keeper sheet is a MATERIAL AND RENDERING STYLE REFERENCE ONLY, not an edit target; do not include any keeper. Create a matching clockwork beetle enemy as an original premium pre-rendered 3D miniature. EXACTLY 2 columns and 2 rows, four equal cells on a square transparent image. One complete beetle per cell, no text, no grid, no scenery, no ground plane or cast shadow. Genuine transparency, clean alpha edges without haze or glow.

Identity: squat, broad, rounded clockwork garden beetle. Large domed jade glazed ceramic shell with a coral/red enamel central panel, antique brass rim and rivets, subtle botanical engraving, compact brass head facing RIGHT with two small luminous amber eyes, six short connected sturdy bronze feet, a tiny wind-up key on the shell side. It should read as a beetle, not a robot head or turtle. Broad smooth dome clearly indicates safe stomp surface; no spikes, horns or tall antennae. Leaf and flower motifs match the keeper. Luxurious dimensional materials with soft highlights, deep rounded volume and ambient occlusion, warm top-left light and restrained teal rim light. No thick cartoon outlines. Orthographic side view with a small amount of three-quarter depth; travel toward RIGHT, no view from above. Fit entire complete creature in each cell, centered, 80% cell width, 55% cell height, generous gutters. Consistent body size, camera, orientation, lighting and ground baseline across frames.

Top left: walking pose A, near feet forward.
Top right: walking pose B, passing feet.
Bottom left: walking pose C, near feet back.
Bottom right: stomped spent beetle with a lowered cracked dome, retracted feet, dim eyes, still recognizable, resting on the SAME ground baseline, width similar but substantially lower height.

Every frame is a single complete connected creature, fully inside its own cell. Keep background fully transparent, no scattered particles, no glow cloud.
