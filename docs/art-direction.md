# Palintris: speilverdenen

Visuell retning, 2026-09-08. Erstatter den flate kremfargede paletten i redesign-specens visuelle del.

Mørk petrol, antikt gull, lysende juveler og en illustrert speilportal. Seks motiv følger A–F: sol, måne, stjerne, blad, dråpe, blomst. Bokstavene beholdes som ekstra identifikasjon. Joker har egen opalbrikke med femtagget stjerne; låste brikker beholder motivet med mørkere overflate og hengelås.

## Ressurser

Generert med innebygd imagegen, deretter eksportert til WebP med `cwebp`. Ingen bilder lastes fra eksterne bildeservere.

| Fil i `public/assets` | Oppløsning | Bruk |
| --- | --- | --- |
| `mirror-realm.webp` | 1024 × 1536 | Meny og dempet scenebakgrunn |
| `jewel-tiles.webp` | 1536 × 1024 | Seks transparente brikker; utsnitt registrert i `art.ts` |
| `wild-jewel.webp` | 512 × 512 | Transparent joker; eget utsnitt |

Brikkearket bruker rundt 416 × 408 piksler per brikke, vist i 44–84 logiske piksler. Canvas og tekst tegnes med skjermens pikselfaktor, begrenset til 2 for å begrense GPU-arbeidet. Layout og gester bruker logiske piksler. Desktop beholder hele portalens portrettkomposisjon med dempet bakgrunn på sidene.

## Genereringsprompter

### Bakgrunn

Use case: stylized-concept. Create one production game background for Palintris, a premium mobile palindrome puzzle game set in a magical mirror realm. Portrait 1024x1536. Hand-painted stylized 3D fantasy game environment with crafted painterly textures, polished art direction, rich deep petrol teal and midnight blue, luminous turquoise, amber golden accents. An ancient elegant circular bronze mirror portal at upper center (center x50%, y34%, diameter about 40% image width), floating above a reflective still pool, its inside a softly glowing celestial teal mist, carved geometric symmetry motifs. Framing of dark mossy stone, delicate fern leaves, small glowing crystals, golden firefly points along edges. Distant misty mountains and tiny floating islands visible through arch. The bottom 40% is very dark quiet reflective water with subtle teal ripples, plenty of negative space for real interface buttons to be placed over it. Top 15% dark quiet sky for title overlay. Dramatic luminous depth, jewel-like materials, strong silhouette, intentional coherent illustration suitable for a professional indie puzzle game. Restrained detail in central lower play area, rich detailed edges. No text, no letters, no logos, no UI, no buttons, no watermark. Not flat vector, not website art. This asset will be used full screen behind real game interface.

### Brikkeark

Use case: stylized-concept. Production game sprite atlas, EXACT 3 columns by 2 rows evenly spaced regular grid, canvas 1536x1024 pixels with transparent background. Six independent front-facing square magical jewel game tiles. Tile centers exactly (256,256), (768,256), (1280,256), (256,768), (768,768), (1280,768). Every tile completely within its own 512x512 cell, centered, same size about 420x420 pixels, transparent 46px gutter on all sides. No overlap. Premium fantasy mobile puzzle game art matching ancient bronze and teal magical mirror realm. Each tile is a chunky beveled rounded-square jewel in an elegant thin engraved antique gold frame with clipped corners, visible bottom thickness, deep jewel facets, subtle handpainted material texture, bright specular highlight on upper left edge. Big unique simple luminous ivory emblem centered on each: top left ruby coral red with sun emblem, top middle amber orange with crescent moon emblem, top right golden yellow with four point diamond star emblem, bottom left emerald green with leaf emblem, bottom middle sapphire sky blue with water droplet emblem, bottom right violet amethyst with six petal flower emblem. All symbols must read easily at tiny size. Consistent light from upper left, frontal straight-on view, no rotation. Gold frame narrow, gemstone face dominant. Polished stylized 3D handpainted game asset quality, luminous rich color, intentional raised details, not flat vector. No letters, no text, no labels, no numbers, no UI, no background scene, no board, no watermark. Genuinely transparent background. Exact six objects, exact grid alignment. Asset atlas, not mockup.

### Joker

Brikkearkets original brukt som stilreferanse.

Reference image is style reference only. Create ONE new wildcard joker game tile, matching this exact premium jeweled fantasy tile asset style: chunky rounded square faceted gemstone in narrow engraved antique gold frame with four clipped decorative corner brackets and visible bottom thickness. Single centered front-facing square tile taking 85% of a square 1024x1024 canvas, transparent background all around. Iridescent opal gemstone face with dark amethyst and midnight teal depths and flowing prismatic rainbow light reflections across facets. A single large luminous ivory FIVE-POINT STAR engraved in the center, easily recognizable at 44 pixels. No other emblems. Same upper left specular lighting, same gold framing proportions, same frontal orthographic view and handpainted glossy 3D render quality as reference six tiles. It must read as the magical wild tile in the same game asset family, special without losing legibility. No letters, no text, no watermark, no environment. Genuinely transparent background; preserve transparent space outside the gold border. One square tile only, not a sheet or grid.

## Kontroll

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run e2e`.

Visuell kontroll: 360 × 640 og 390 × 844 mobil; 844 × 390 liggende; 1440 × 900 desktop. Egen Retina-test verifiserer fysisk canvas-oppløsning, resize, brikketrykk og angre. Nettlesertestene dekker også drag, joker, fjerning, hårnål-layout og løsning. Mobilbilder kontrollert med lås, joker og fargeblindmønster.
