# Ember Coast artwork prompts

Original artwork generated with the built-in imagegen tool. The retained final sheets are editable illustration sources; the packer only crops and resamples complete drawings.


## Operator atlas

Use case: stylized-concept. Asset type: production sprite atlas for Blastline, an original side-view arcade run-and-gun. Create one transparent PNG sprite sheet, exactly 5 columns by 8 rows, equal square cells, canvas aspect ratio 5:8 (ideally 1280x2048). NO text, no labels, no scenery, no floor, no shadows outside sprites. Detailed hand-drawn 16-bit pixel art with crisp pixel clusters, dark navy outlines, warm metal highlights, restrained dithering. Orthographic side view, all complete characters facing RIGHT. Stable sole pivot at 42% across, 94% down every cell; feet at same baseline, full character inside cell with safe padding. Each character fills about 65% cell height. Weapons must stay inside cell.
Rows 1-4: Nova, athletic female commando, teal jacket, dark navy trousers, red scarf, copper skin, short dark hair and teal headband, compact automatic rifle.
Rows 5-8: Bolt, broad male commando, ochre jacket, dark trousers, copper skin, stubble, ochre helmet, chunky shoulder rocket launcher.
For EACH character four rows: idle planted stance; run stride A with separated forward/back boots; run stride B with opposite boots; airborne knees tucked.
For EVERY row the five columns show coherent complete poses with weapon held and hands connected: column1 aiming straight UP; column2 aiming diagonally UP-RIGHT; column3 aiming RIGHT; column4 aiming diagonally DOWN-RIGHT; column5 aiming straight DOWN. Keep head, body and sole anchors stable across all columns. No detached limbs, no rig pieces, no floating guns. This is a usable atlas, not a showcase poster. Each whole cel has expressive connected anatomy, gear, readable highlights and substantial arcade illustration detail. Preserve consistent sizes and clothing throughout. Transparent background.


## Enemy atlas

Use case: stylized-concept. Asset type: transparent production enemy sprite atlas for Blastline Ember Coast, original side-view 16-bit run-and-gun. Exact regular grid THREE columns by THREE rows, equal square cells, square canvas. No text, labels, background, shadows, dividers or decorations. Crisp richly shaded pixel art, dark navy contour, rust and copper highlights, muted olive armor and red-orange optics. Orthographic side view, RIGHT facing, complete connected silhouettes inside their own cells, stable bottom-center pivots and generous transparent padding.
Row 1: armored security guard in olive-grey uniform and helmet with orange visor, compact rifle aimed right. Three whole-body poses: idle, run stride A, opposite run stride B. All same size.
Row 2: bulky heavy security trooper in rust-grey powered armor with ochre shoulders and orange visor, oversized launcher held right. Three complete poses: planted idle, weighted step A, opposite step B. Slightly larger than guard.
Row 3: BASTION, squat broad tracked military machine with thick rust and olive hull, a red-orange slit optic in armored turret, large right-pointing cannon, continuous tank tracks. Three whole-machine cels with small changes in track treads, orange vent glow and cannon recoil; same silhouette size and stable bottom-center anchor.
Each sprite occupies approximately 80% width and 80% height of its cell, feet or tracks at 94% down. Pixel-art handcrafted arcade finish, readable at small gameplay sizes. No floating components, no separate limb assets. Transparent background.


## Object atlas

Use case: stylized-concept. Asset type: production transparent object atlas for an original 16-bit side-view run-and-gun, Blastline Ember Coast. Square sheet in a precise 4 columns by 4 rows regular grid, equal square cells, with generous transparent padding in each cell. No text, no labels, no ground or background. Richly detailed crisp pixel clusters, dark navy outlines, weathered rusted steel, brass highlights, teal and ochre, classic arcade industrial coast identity.
Row1: col1 tall live power relay in steel cabinet with bright amber lightning core; col2 SAME cabinet broken and powered off, open panel and dark cracked core; col3 red explosive fuel barrel with dark steel hoops and small hazard diamond; col4 green supply crate with upright short pole and furled dull green flag.
Row2: col1 SAME green supply crate with bright mint flag unfurled and lit medical cross; col2 empty reinforced barred rescue cage (transparent between bars, NO captive); col3 complete horizontal military extraction helicopter facing right with teal windows and grey-olive armored hull, rotor and landing skids entirely in cell; col4 small olive hand grenade with bright fuse.
Row3: col1 intact square dark blue steel structural block with corner rivets and diagonal brace; col2 intact square ochre brick masonry block with clear mortar joints; col3 intact square rust-brown armored cover plate with large embossed X brace and corner bolts; col4 cracked damaged masonry block matching col2.
Row4: col1 cracked damaged rust armored cover matching row3col3; col2 orange-white muzzle flash; col3 fiery explosion burst; col4 grey smoke cloud.
Orthographic side view. Every object individually centered in its own grid cell, no overlaps. Consistent pixel-art finish and warm directional light. Transparent background.


## Backdrop atlas

Use case: stylized-concept. Asset type: wide pixel-art BACKGROUND PLATE for original side-scrolling run-and-gun Blastline Ember Coast. Canvas wide landscape 3:2. Exactly two horizontal panoramic scenes stacked vertically, each taking half image height, no gutter. Upper half: industrial coastal border station at sunset, muted warm salmon sky, pale amber sun, distant cargo cranes, oil tanks, dock warehouses, layered smoky teal silhouettes, reflective harbor at bottom. Lower half: the same coast's heavy iron foundry after sunset, muted burnt-orange haze behind huge dark blue foundry halls, exhaust stacks and pipe galleries, small furnace windows glowing amber, harbor wall at bottom. Use complete panoramic backgrounds, no characters, no foreground platforms or interactive objects, no text or labels. Distinct clean silhouettes, detailed hand-placed 16-bit pixel clusters, weathered industrial geometry. Atmospheric depth with quiet dark teal foreground and low contrast in play space to keep bright actors readable. Upper third of each panorama is mostly calm sky. Horizontal panorama edges should meet seamlessly in repeating scenery, keep major landmarks away from extreme sides. A cohesive sophisticated 1990s arcade art direction. No blur, no gradients without pixel steps, no photorealism, no UI.


## Transparency cleanup

Edit target: the attached Blastline operator atlas. Change ONLY the background: remove the pale grey/white background, cell boundary lines and ground shadows completely and make all spaces outside the characters truly alpha=0 transparent. Preserve the exact 5-column by 8-row sprite grid, canvas aspect ratio, every character, pose, weapon, color, pixel detail and position. Do not redraw, reorder or resize any sprite. No added elements. This needs clean cutout transparency for a game sprite sheet, with no misty pale background or grid visible behind characters.

Edit target: the attached Blastline industrial object atlas. Remove ALL background haze, grey checker residue, stray colored pixels, shadows, glows and halos surrounding every object, leaving perfectly clean transparent alpha=0 outside the actual illustrated object contours. Preserve exactly all sixteen objects, colors, details and their existing positions in the 4x4 grid. Keep transparent spaces between cage bars and around helicopter. Only the illustrated objects should remain visible. Keep each illustration whole, no additions, no text. The fire burst and smoke cloud in final row should keep their illustrated silhouettes but no surrounding colored haze.

