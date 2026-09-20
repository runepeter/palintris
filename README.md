# Palintris

Palindrom-puslespill bygget med Phaser 3, TypeScript og Vite. Hvert brett er en rekke
symbolbrikker; målet er å gjøre rekken til et palindrom med færrest mulig trekk, innenfor
et trekkbudsjett.

## Moduser

- **Kampanje** – 90 nivåer over 6 verdener, generert av `scripts/build-campaign.ts`. Hver verden introduserer en ny
  mekanikk: bytt naboer, roter et utsnitt, speil et utsnitt, låste brikker, joker og
  fjerning av brikker.
- **Daglig** – ett felles brett per dag (UTC), med streak.
- **Blitz** – tidsbegrenset kø av brett uten trekkgrense.
- **Fri spilling** – uendelig genererte brett per verden, for øving.
- **Sticky · prøv** – tre prøvebrett med koblede speilpar. Paret flyttes sammen og trekkes inn mot midten ved seier.

## Slik spiller du

Hele rekken skal være lik fra begge ender. Bytt nabobrikker ved å dra eller trykke på begge.
Hold og dra over flere brikker for å velge et utsnitt når rotasjon eller speiling er tillatt.
Tillatte verktøy vises på brettet. Angre og Reset lar deg prøve igjen; Meny avslutter brettet.

På tastatur: piltaster flytter markøren, mellomrom velger, og neste pil bytter med naboen.
Shift + pil velger utsnitt; Q/E roterer og W speiler. Z angrer, R tilbakestiller,
J setter inn joker og X fjerner en brikke når verktøyet er tilgjengelig.

Fremgang og innstillinger lagres i denne nettleseren. Ingen konto eller synkronisering.
Ved blokkert lagring fungerer spillet, men fremgangen forsvinner ved omlasting eller når siden lukkes.

## Utvikling

```bash
npm install       # installer avhengigheter
npm run dev        # dev-server (Vite)
npm test           # enhetstester (Vitest)
npm run typecheck   # tsc --noEmit for app og node-config
npm run lint        # ESLint over src, scripts og e2e
npm run build        # tsc + vite build
npm run e2e           # Playwright, ende-til-ende
npm run e2e:release   # statisk produksjonsbuild i Chromium og WebKit
npm run build:campaign  # regenerer kampanjenivåene
```

## Struktur

- `src/core` – ren spillogikk uten Phaser: brikker, trekk, regler, løser, poengsum,
  lagring.
- `src/content` – kampanjeoppskrifter og det bygde nivåsettet
  (`campaign.v1.json`).
- `src/game` – modusspesifikk logikk (kampanje, daglig, blitz, fri spilling),
  gestikk-tolkning og brettsesjonen scenen kjører mot.
- `src/theme` – farger, fonter og andre designtokens.
- `src/audio` – lyd og musikk.
- `src/scenes` – Phaser-scener (meny, brett, verdenskart, resultater, innstillinger).
- `scripts` – frittstående verktøy, blant annet kampanjegeneratoren.
- `e2e` – Playwright-spesifikasjoner som kjører mot en ekte dev-server.

## Innhold

Kampanjen ligger ferdig bygget i `src/content/campaign.v1.json` (`contentVersion: 1`).
Filen genereres fra oppskriftene i `src/content/recipes.ts` via:

```bash
npm run build:campaign
```

En ny `contentVersion` bumpes i `recipes.ts` når nivåformatet eller genereringen
endres, slik at gamle lagrede fremskritt ikke blandes med nytt innhold.

## Deploy

Prosjektet er satt opp for Vercel (`vercel.json`): `npm run build` bygger til `dist`,
som serveres statisk.

Vercel-prosjektet `cyclaw/palintris` er koblet til `runepeter/palintris` på GitHub.
Push til `main` publiserer automatisk på [palintris.vercel.app](https://palintris.vercel.app/).

Installer testnettlesere med `npx playwright install chromium webkit` før lokal fullverifisering.
CI kjører også produksjonstestene: oppstart, første seier, lagring, innstillinger og blokkert lokal lagring.
Skrifter og grafikk ligger lokalt i `public`; skriftlisensene følger med.

Se [utgivelsesstatus](docs/release-v1.md) for verifisering og siste publiseringssteg.
