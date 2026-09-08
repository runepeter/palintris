# Palintris

Palindrom-puslespill bygget med Phaser 3, TypeScript og Vite. Hvert brett er en rekke
symbolbrikker; målet er å gjøre rekken til et palindrom med færrest mulig trekk, innenfor
et trekkbudsjett.

## Moduser

- **Kampanje** – 90 håndbygde nivåer over 6 verdener. Hver verden introduserer en ny
  mekanikk: bytt naboer, roter et utsnitt, speil et utsnitt, låste brikker, joker og
  fjerning av brikker.
- **Daglig** – ett felles brett per dag (UTC), med streak.
- **Blitz** – tidsbegrenset kø av brett uten trekkgrense.
- **Fri spilling** – uendelig genererte brett per verden, for øving.

## Utvikling

```bash
npm install       # installer avhengigheter
npm run dev        # dev-server (Vite)
npm test           # enhetstester (Vitest)
npm run typecheck   # tsc --noEmit for app og node-config
npm run lint        # ESLint over src, scripts og e2e
npm run build        # tsc + vite build
npm run e2e           # Playwright, ende-til-ende
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
