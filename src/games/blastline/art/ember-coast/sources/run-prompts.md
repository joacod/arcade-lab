# Running-cycle artwork

Original complete-character running cels generated with the built-in imagegen tool, using `../operators.png` as the cast/style reference. Final source sheets are `nova-run.png` and `bolt-run.png` in this folder. `../pack.mjs` aligns and resamples whole cels for runtime.

## Nova running cycle

Use case: stylized-concept. Asset type: production RUN CYCLE sprite atlas, new artwork matching the reference image's NOVA character only (teal female commando in top four rows). Reference is for character identity, costume, pixel style, scale and aim variants; do not copy its bad two-frame gait.
Create a clean transparent atlas with EXACTLY SIX COLUMNS and FIVE ROWS of equal square cells, canvas aspect ratio 6:5. No gridlines, text, ground, shadows, glow or backdrop; true alpha=0 outside sprites. Detailed 16-bit pixel clusters and navy contours matching reference. Complete whole-character drawings, all facing RIGHT, teal jacket, navy trousers, red scarf, dark short hair, copper skin and compact rifle. Preserve face, outfit, volume and weapon throughout. Draw each character roughly 65% of cell height, sole baseline at 92% cell height, pelvis centered at 45% cell width. Keep head, chest and rifle anchors stable between frames, minimal vertical bob. Leave generous padding so gun and boots never leave cells.
Each row is a COMPLETE six-frame looping running cycle read left to right with genuinely opposite leg contacts and intermediate passing poses:
1 LEFT boot contacts forward, RIGHT leg extended back;
2 LEFT support foot moves under hips, RIGHT knee starts forward swing;
3 RIGHT knee passes forward, LEFT support foot pushes back;
4 RIGHT boot contacts forward, LEFT leg extended back;
5 RIGHT support foot moves under hips, LEFT knee starts forward swing;
6 LEFT knee passes forward, RIGHT support foot pushes back, looping naturally into frame1.
The legs must NOT repeat the same extended pose across frames. Distinguish near/far legs consistently using darker far-leg shading. No idle or jumping cels, no dramatic lunges, no crouch. Arms stay connected to rifle, torso stays consistent; full hand-drawn cels, no cut-up limbs.
ROW1 aims rifle straight UP. ROW2 diagonal UP-RIGHT. ROW3 straight RIGHT. ROW4 diagonal DOWN-RIGHT. ROW5 straight DOWN. Same six running phases in each row. Exact 6x5 layout. Transparent background.

## Bolt running cycle

Use case: stylized-concept. Asset type: production RUN CYCLE sprite atlas, new artwork matching the reference image's BOLT character only (ochre male commando in bottom four rows). Reference is for identity, costume, pixel style, scale and aim variants; do not copy its bad two-frame gait.
Create a clean transparent atlas with EXACTLY SIX COLUMNS and FIVE ROWS of equal square cells, canvas aspect ratio 6:5. No gridlines, text, ground, shadows, glow or backdrop; true alpha=0 outside sprites. Detailed 16-bit pixel clusters and navy contours matching reference. Complete whole-character drawings, all facing RIGHT: broad male commando, ochre jacket, dark trousers, ochre helmet and goggles, copper skin and stubble, chunky shoulder rocket launcher with red-tipped rocket. Preserve face, outfit, volume and launcher throughout. Draw each character roughly 65% of cell height, sole baseline at 92% cell height, pelvis centered at 45% cell width. Keep head, chest and launcher anchors stable between frames, minimal vertical bob. Leave generous padding.
Each row is a COMPLETE six-frame looping running cycle read left to right with genuinely opposite leg contacts and intermediate passing poses:
1 LEFT boot contacts forward, RIGHT leg extended back;
2 LEFT support foot moves under hips, RIGHT knee starts forward swing;
3 RIGHT knee passes forward, LEFT support foot pushes back;
4 RIGHT boot contacts forward, LEFT leg extended back;
5 RIGHT support foot moves under hips, LEFT knee starts forward swing;
6 LEFT knee passes forward, RIGHT support foot pushes back, looping naturally into frame1.
Legs must NOT repeat the same extended pose across frames. Distinguish near/far legs consistently using darker far-leg shading. No idle or jumping cels, no dramatic lunges, no crouch. Arms stay connected to launcher, torso stays consistent; full hand-drawn cels, no cut-up limbs.
ROW1 aims launcher straight UP. ROW2 diagonal UP-RIGHT. ROW3 straight RIGHT. ROW4 diagonal DOWN-RIGHT. ROW5 straight DOWN. Same six running phases in each row. Exact 6x5 layout. Transparent background.

