# Artwork generation prompts

## Room cleanup edit
Edit this six-room background atlas for a Gothic point-and-click adventure. Preserve EXACTLY the 2-column 3-row grid, tile boundaries, overall size, architecture, floor edge, perspective, colors, painting style and every unchanged region. Make only these small scenery corrections:
1. In the top-right Portrait Gallery tile, remove ALL three hard-edged plain dark rectangular placeholders from the wallpaper. Continue the plum damask wallpaper seamlessly through them. Leave the picture rail and sconces.
2. In the middle-right Kitchen tile, remove the hard-edged dark rectangular placeholder on the right wall. Continue the soot-dark stone masonry naturally. Remove the low wooden bench in front of the fireplace, replacing it with the stone floor and fireplace behind.
3. In the middle-left Library tile, remove the long wooden desk/table entirely, replacing it with matching lower green wall paneling and stone floor. Preserve bookshelves.
Do not insert any replacement props, portraits, people, doors, writing or labels. Keep the whole atlas unchanged elsewhere. These rooms receive separately composited dynamic props.

## Inventory and furniture
Use case illustration-story. Production game sprite atlas for Victorian Gothic point-and-click adventure. A STRICT 3 columns x 3 rows of 9 complete isolated object illustrations on TRUE TRANSPARENT alpha background. Equal size square cells with 12% clear padding, no grid, text, numbers or labels. Original painterly gouache and fine ink, elegant dark oak, tarnished brass, worn leather, candle amber, matching an English Gothic castle adventure. Front/3-quarter view whole objects, no ground or scenery.
Row1 col1: antique brass magnifying glass, leather handle.
Row1 col2: three short pieces of worn white chalk, paper wrapper.
Row1 col3: extended cleaning brush, pale bristle head fitted to long dark iron fireplace poker by visible threaded coupling, diagonal from bottom left to upper right, complete object.
Row2 col1: large ornate Victorian household brass key.
Row2 col2: little brass square-socket butterfly winding key for a music box.
Row2 col3: closed leather detective casebook with embossed Gothic corner filigree, no words.
Row3 col1: low wide antique dark oak console table, front view, thin broad horizontal top, elegant carved apron and four short legs, width three times height, entire table isolated. No objects on tabletop.
Row3 col2: short-handled brush, pale bristles, diagonal from lower left to upper right.
Row3 col3: battered overstuffed brown leather detective satchel with buckles and brass fittings, whole.
Keep all 9 illustrations wholly within their even cells, do not overlap neighboring cels.

## Equipment transparency edit
Background extraction edit of this exact 3x3 Victorian prop atlas. Remove ONLY the white backdrop and all background shadows between objects to create a TRUE transparent PNG cutout sprite atlas. Alpha must be zero everywhere outside each object silhouette, including gaps beneath the table and between chalk sticks. Preserve every object's original color, scale, placement, shape and painted detail, and preserve the EXACT 1254x1254 canvas and equal 3x3 cell locations. Retain all nine whole objects. Do not add a white or grey backdrop, checkerboard, labels, scene or new items. The white chalk is an object and must stay opaque. Real transparent alpha, not a translucent white square.


Generated with the built-in imagegen tool. These are original illustrations created for this repository. The source PNGs retain the complete drawings and alpha; `pack.mjs` only crops and exports them.

## Room plates
Use case: illustration-story. Production background atlas for an original Victorian Gothic point-and-click game "The Thirteenth Guest". One image, a STRICT 2-column by 3-row grid of SIX edge-to-edge rectangular room paintings, each identical size and landscape 16:9. Absolutely no gutters, borders, text or UI. Overall atlas 1920x1620 if possible. Each tile is a fixed frontal theatrical cutaway of a castle interior, viewpoint level with human chest, horizontal wall/floor boundary at 68% of tile height. Bottom 32% is EMPTY walkable stone floor in subtle perspective. Hand-painted 1990s adventure storybook aesthetic, elegant ink contours, rich textured gouache, midnight blue and bottle green shadows, tarnished brass, candle amber, atmospheric but readable. Detailed architecture at top, quiet middle and floor to receive separately composited people and clues. No characters, no ghosts, no interactive props or doors baked in. All tiles have clear dark wall areas at far left/right around 6-12% and 89-96% width for separately placed doorways.
Tile row1 col1 Great Hall: towering vaulted rain-dark stone, leaded moonlit windows, faded heraldic banners high up, a small chandelier at upper center, narrow wine-red carpet on floor center, grand but eccentric English castle.
Tile row1 col2 Portrait Gallery: crooked oak wall panels, faded dusty plum wallpaper, picture rail, sconces high up. Leave EMPTY dark rectangular wall space at x20-35% y23-55% and x43-55% y30-57% for portraits, x60-74% y40-73% for knight, clear far right for doorways.
Tile row2 col1 Library: tall bookshelves at x16-39% and x74-87%, warm amber desk surface at x24-55% y64-71%, quiet wall at x65-79% y33-58% for photo, deep green damask and richly worn books. Empty floor.
Tile row2 col2 Servants kitchen: copper-and-soot stone walls, tall dark unlit fireplace at x20-43% y20-60%, copper pipe descending at x56% from top to y30%, plain dark wall reserved at x70-85% y40-72% for cabinet, low preparation bench x24-36% y68%. No utensils on the bench. Empty floor.
Tile row3 col1 Bell chamber: moonlit open Gothic stone belfry, huge lancet window behind center, stars and rain outside, desaturated indigo stone, wall mostly dark at x45-65% y15-65% for separately placed hanging bell; empty wall at x70-82% y32-65% for mirror; an iron suspension beam high overhead. Empty stone floor for ward.
Tile row3 col2 Great Hall variant: same grand castle hall, moonlight and warm sconces, no carpet, no actors, decorative high arches.
Keep all six paintings complete, consistent style and perspective, no dividing lines, NO WORDS, no inset illustrations, no actor silhouettes.

## Character cels
Use case: illustration-story. Transparent PNG production sprite atlas for original Gothic storybook adventure game. STRICT 4 columns x 3 rows of 12 whole character cels. Each cell same size, no labels, no separators. Output landscape 1536x1024 if possible, background truly TRANSPARENT. Every figure is fully inside its own cell with 15% margin on all sides, feet aligned at 90% cell height, tall silhouette 75% cell height. Painterly gouache, fine ink outlines, 1990s illustrated point-and-click adventure, elegant slightly caricatured anatomy, midnight blue, bottle green, tarnished brass, candle amber, spectral turquoise. ALL FIGURES FULL BODY, connected complete drawings, no detached body parts except the knight's carried head. 3/4 view facing screen RIGHT. The first seven cells are THE SAME detective Percival Wren: lean middle-aged Victorian man, prominent nose, brown moustache, short dark hair, midnight teal long travelling coat, waistcoat, charcoal trousers, brown boots, battered overstuffed leather satchel at hip, brass lantern.
Row1 col1: Wren idle relaxed standing, lantern in right hand.
Row1 col2: Wren walking right, NEAR leg extended forward and far leg back, planted boots.
Row1 col3: Wren walking right, passing pose near leg planted under hip, far knee coming through.
Row1 col4: Wren walking right, FAR leg extended forward and near leg back, opposite contact to col2, legs truly exchanged.
Row2 col1: Wren walking right, opposite passing pose far leg planted under hip, near knee coming through.
Row2 col2: Wren leaning and reaching forward with free hand to examine a clue, lantern down.
Row2 col3: Wren raising brass lantern in front of him, green light at glass, careful investigative pose.
Row2 col4: Lady Evelyn Blackthorn, practical living Victorian widow, auburn hair in updo, dark burgundy long dress, brass brooch, composed hands, dignified angular features. Facing left.
Row3 col1: Professor Lucien Vale, thin polished older antiquarian, pointed grey beard, spectacles, charcoal frock coat and purple waistcoat, clasped hands, devious but charming. Facing left.
Row3 col2: Sir Oswald, whole spectral turquoise medieval knight in beautifully ornate plate armor, HEADLESS neck above gorget, holds his expressive mustachioed head under one arm, sword sheathed. Ghost with intact feet.
Row3 col3: Mrs Brindle, kindly stout elderly spectral housekeeper, Victorian apron and long dress, hair bun, spectral turquoise, complete expressive silhouette, hands on apron. Ghost with intact feet.
Row3 col4: the Thirteenth Guest, tall floating indigo smoky ghost with predatory borrowed Victorian face and long connected trailing cloak, spectral turquoise edge light, no gore.
No scenery, no ground, no shadows outside cells, no text, no numbering. Preserve real transparent alpha.

## Interactive objects
Use case: illustration-story. A TRANSPARENT production game prop sprite atlas, STRICT 5 columns and 5 rows, 25 separate complete object illustrations, even cells with clear 12% transparent padding on all sides. No borders, labels, numbers, text or grid lines. Square 1536x1536 if possible. Original Gothic Victorian storybook adventure art, finely inked painterly gouache, 1990s point-and-click game, dark oak, midnight blue, bottle green, tarnished brass, candle amber and spectral turquoise. All objects front view, coherent perspective with theatrical frontal room. Each object isolated whole, alpha transparency around it. Do not add floor or backdrop. Fill each cell with its object, respecting padding.
Row1 left to right: (1) tall Gothic stone arched doorway opening into blackness, entire arch frame, (2) antique brass-bound wooden shipping crate with diamond-shaped V mark, (3) ornate gilded portrait with a terrified moustached Victorian man's open screaming mouth, vent grille integrated below frame, (4) same portrait and vent with calm closed mouth, (5) ornate EMPTY antique silver portrait frame with deep navy interior.
Row2 left to right: (1) same silver frame holding a charming little turquoise ghost face, (2) open handwritten leather journal with engraved bell ward diagram, no legible words, (3) open carved mahogany music box with brass mechanism and small ballerina, (4) framed sepia Victorian household photograph, (5) short-handled cleaning brush with pale bristles.
Row3: (1) tall iron fireplace poker with hooked tip, (2) copper service-tube rectangular maintenance hatch closed soot-dark cover and pipe attached above, (3) same service-tube hatch open revealing red leather bellows and a small brass reed mechanism, (4) tall oak cabinet closed glass door with brass keyhole and little key inside, (5) same oak cabinet with open door and empty dark shelves.
Row4: (1) heavy silver iron chain hanging loose vertically, (2) same chain pulled taut diagonally toward upper right and attached to ring anchor, (3) tall ornate brass standing mirror reflecting blue moonlight, (4) same mirror turned inward with spectral turquoise reflection, (5) whole massive medieval bronze bell suspended by wood beam and chain, rectangular dark silver-lined lantern recess in front near lower lip.
Row5: (1) small wispy mischievous turquoise ghost, expressive face and translucent tapering tail, (2) ornate brass spirit lantern glowing amber glass, (3) red leather hand bellows with brass nozzle, (4) brass tuning fork, (5) antique household key and little square winding key together.
Each tile a single complete polished asset. No scene composition, no extra objects, preserve even strict 5x5 grid and true transparent background.
