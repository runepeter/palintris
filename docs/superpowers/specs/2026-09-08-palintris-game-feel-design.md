# Palintris game-feel – designspec

## Ferdigkriterier

- Hvert trekk viser umiddelbart hvor mye av speilet som er i harmoni.
- Første brett lærer swap med ett synlig, meningsfullt trekk.
- Bedre trekk belønnes med tydelig, kort feedback uten å dekke brettet.
- Blitz viser tidsgevinst, tidsstraff og tydelig sluttspurt.
- Løsningsskjermen viser prestasjon, forbedring og et fristende neste steg.
- Menyen viser lagret progresjon og grunn til å komme tilbake.
- Kampanje, Daily, Blitz og fri spilling forblir spillbare på 360 × 640, 390 × 844 og desktop.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` og `npm run e2e -- --workers=1` består.

## Utenfor scope

- Nye brettregler, konto, backend, ledertavle, kjøp og nye grafikkpakker.
- Endring av kampanjebrett utover et håndlaget introduksjonsbrett `w1-01`.
- Push eller deploy.

## Retning

Palintris skal føles som å vekke en magisk speilportal. Den eksisterende juvelgrafikken beholdes. Poleringen konsentreres om tre sløyfer: les brettet, gjør et godt trekk, få en tydelig belønning.

### Brettet

HUD-en viser `harmoni` som antall matchende par av totalt antall par, med en kort lysende måler. Første visning er rolig. Et trekk som øker antallet gir en puls i nye par, partikler og teksten `Harmoni +N`. Flere forbedrende trekk etter hverandre bygger `Flyt ×2`, `Flyt ×3` og videre. Et trekk som ikke forbedrer nullstiller flyten uten negativ effekt. Undo og reset gir ingen belønning.

Portalen får diskret ambient liv: sakte lysprikker og en svak pustende glød. `reducedMotion` beholder statisk lys og all informasjon, men ingen kontinuerlige tweens eller partikler.

`w1-01` starter med et synlig nesten-speil og løses av den swapen introen peker ut. Det skal ikke være mulig å bruke første trekk på å bytte to identiske symboler. Resten av kampanjen beholdes uendret.

### Blitz

Et løst speil viser tidsbonusen før neste brett. Skip viser tidsstraffen, og de siste ti sekundene får en tydelig visuell puls. Reglene og tidstallene beholdes.

### Resultat

Resultatet bruker prestasjonsnivået som hovedhistorie: `Perfekt harmoni` ved tre stjerner, `Strålende speiling` ved to og `Speilet er åpnet` ved én. Ny personlig stjernerekord vises eksplisitt. Statistikk ligger i et juvelrammet kort, og hovedknappen forteller hva som skjer videre.

### Meny og progresjon

Menyen viser samlede stjerner, antall løste kampanjebrett og Blitz-rekord. Kampanjeknappen skifter til `Fortsett reisen` når spillet har progresjon. Informasjonen leses fra eksisterende lokal lagring; ingen ny lagringsstruktur.

## Struktur

- `src/game/feedback.ts`: rene beregninger for parprogresjon, flyt og prestasjonstekst.
- `src/scenes/BoardScene.ts`, `TileView.ts`, `effects.ts`: presentasjon og animasjon.
- `src/scenes/ResultScene.ts`, `MenuScene.ts`: motivasjon og progresjon.
- Tester i `src/game/__tests__` og eksisterende Playwright-hook/e2e.

Game logic forblir ren og uavhengig av Phaser. Sceneeffekter bruker kun avledet feedback og endrer aldri trekk, stjerner eller lagring.

## Feilhåndtering og ytelse

Feedbackberegning er O(n) for maks 14 brikker. Effekter rydder egne objekter ved tween-slutt; scene-shutdown rydder resten. Manglende lyd, vibrasjon eller bilde påvirker ikke regler. DPR er fortsatt begrenset til 2.

## Verifisering

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run e2e -- --workers=1
```

Visuelt: skjermbilder av meny, brett før/etter forbedrende trekk, resultat med 1/2/3 stjerner og kompakt landskap. Spill minst ett kampanjebrett og én Blitz-overgang med ekte input.
