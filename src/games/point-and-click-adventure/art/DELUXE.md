# Blackthorn Nocturne · Deluxe

## Art direction

Blackthorn Castle remains an eccentric Victorian household in 1889. Deluxe
reinterprets the Arcade cast and objects as a cinematic, handcrafted Gothic
diorama: sculptural faces, tailored wool, worn leather, engraved bronze, polished
mahogany and translucent sea-glass spirits. Moonlit blue stone contrasts with
small pools of honey-colored candlelight. Preserve Wren's teal coat, moustache,
satchel and lantern, Evelyn's burgundy dress, Vale's purple waistcoat, Oswald's
carried head, Brindle's apron and the Guest's predatory borrowed face.

Five new room plates, complete character/action cels, an eight-cel walk and new
interactive-object and equipment sheets share this material language. Architecture
stays quieter than the cast and clues. Door thresholds and the clear lower floor
remain registered to the existing world geometry. No people, interactive objects
or substitute clue shapes are painted into scenery.

The visual hierarchy is face and silhouette, then interactive objects, then
architecture. Bronze edges and ivory paper separate tools from the dark scenery;
ghosts use cool glass-like bodies rather than broad opaque bloom. Complete cels
communicate walking, reaching and raised-lantern actions, with registered feet
and pelvis anchors. No animation changes approach timing or puzzle results.

Restrained moonbeams, suspended dust and ghost reflections lend depth. The bell
chamber's blue glass apparition against the enormous bronze bell is the central
visual moment; repaired restraints and containment retain their separate authored
states. Effects follow active presentation time, freeze on pause and suppress
decorative motion under reduced motion. Panels use dark lacquer and warm brass
edges, preserving the existing native controls and reading layout.

## Integration

The shared game-owned Canvas compositor consumes separate typed artwork
definitions. Deluxe imports and image requests stay behind selection. Candidate
artwork must decode, validate and draw against the retained run before activation.
Failed or cancelled candidates release their images and canvases. A Deluxe draw
failure pauses the case and prepares fresh Arcade artwork; Arcade failures expose
Retry artwork. Follow the shared [replacement contract](../../../../docs/architecture.md#replacement-and-recovery).

Original AI-generated source illustrations and production prompts live in
`deluxe/source/` and `deluxe/prompts.md`. `deluxe/pack.mjs` exports the committed
WebP plates and alpha-bounded frame definitions. These assets have no third-party
pack dependencies or required credits.

Run `node src/games/point-and-click-adventure/art/deluxe/pack.mjs` from the
repository root to export the sources. Whole drawings are bounded by their alpha;
the script records explicit pelvis columns and foot baselines without realigning
every passing pose to its lowest pixel. Registration and room seams belong in
that script, role mappings in `../deluxe.ts`, and gameplay geometry in content.

| Source | Export contract |
| --- | --- |
| `source/rooms.png` | 1717 × 916, two columns and three rows: hall/gallery, library/kitchen, bell/spare hall. Five 1440 × 810 WebP plates, with their wall/floor seam registered to world y=365. |
| `source/cast.png` | 1774 × 887, four columns and two rows: Wren idle/reach/lantern, Evelyn, Vale, Oswald, Brindle and the Guest. Complete cels with independently authored anchors. |
| `source/walk.png` | 1774 × 887, four columns and two rows, eight chronological full-body walking cels. Hip columns and common row baselines retain the stride's vertical response. |
| `source/props.png` | 1254 × 1254, five columns and rows, matching the Arcade semantic object roles and paired puzzle states. |
| `source/equipment.png` | 1254 × 1254, three columns and rows: lens/chalk/extended brush, household key/winding key/casebook, table/brush/satchel. |
| `source/service.png` | 1536 × 1024, three full-height columns: closed, open and disconnected service assembly. High cleanout, continuous pipe/drive shaft and hand-height clock control share registered positions. See the [assembly brief](README.md#kitchen-service-assembly). |

Exports retain transparent alpha and use smooth Canvas sampling. The compositor
caches static scenery at display resolution and preserves native sprite-sheet
detail. The display buffer remains capped at 2560 × 1440 independently of display DPR.
High-quality scenery resampling runs only on cache rebuild; moving cels use
inexpensive smooth sampling. Room grading uses Canvas compositing on entry,
without pixel readbacks or new variants as Wren walks.
Room-matched reflected color, restrained highlights and soft contact shadows
integrate the detailed objects into their painted setting. The shared local
[scene-cohesion contract](README.md#scene-cohesion) owns this treatment.
Selected artwork supplies
inventory icons as well as scene objects. Only the selected candidate requests
Deluxe images; a fresh clone needs no generation service.
