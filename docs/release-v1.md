# Første nettutgivelse

## Omfang

90 kampanjenivåer over seks verdener, daglig brett (nytt ved midnatt UTC), Blitz og fri spilling. Sticky-prototypen med tre brett er bare tilgjengelig under lokal utvikling.

Fremgang og innstillinger lagres lokalt i nettleseren. Ingen konto, skysynk, kjøp eller toppliste. Spillet krever nett for første innlasting; det har ikke en installert offline-cache.

## Finish i denne runden

- Forklarer målet på første brett: rekken skal være lik fra begge sider.
- Samlet resultatvisning på desktop og større treffområder på små knapper.
- Synlig oppstart med prøv-igjen ved mislykket ressurslasting.
- Lokale skrifter, norsk sidetekst og ikon i spillets visuelle stil.
- Oppstart fungerer når nettleseren nekter tilgang til lokal lagring.
- Musikkmotoren frigjør avsluttede toner.
- Produksjonstester i Chromium og WebKit inngår i CI.

## Verifisering før publisering

Lokalt verifisert 2026-09-20: 333 enhetstester, 25 nettlesertester og fire produksjonstester fordelt på Chromium og WebKit. Typekontroll, lint og produksjonsbuild passerer. Avstanden i resultatvisningen ble også kontrollert ved 1024×560.

```sh
npm ci
npx playwright install chromium webkit
npm test
npm run typecheck
npm run lint
npm run e2e -- --workers=1
npm run e2e:release
```

Produksjonstesten bygger `dist` og bruker port 4173, uten utviklingskroker eller nivåsnarveier. Den går fra menyen til første kampanjeseier, laster siden på nytt, endrer en innstilling og verifiserer at begge deler lagres. Eget tilfelle blokkerer lokal lagring.

Visuell gjennomgang: 360×640, 390×844, 844×390 og 1440×900. Nettleseremulering erstatter ikke en kort sjekk på faktiske telefoner.

## Publisering

Publisert 2026-09-20 på [palintris.vercel.app](https://palintris.vercel.app/).
Vercel-prosjektet `cyclaw/palintris` er koblet til GitHub; push til `main` publiserer automatisk.
Offentlig prøverunde verifiserte oppstart, første seier med drag, tre stjerner og bevart fremgang etter omlasting. Ingen feil i nettleserkonsollen.

## Gjenstår

1. Gjør en kort prøverunde på fysisk iPhone og Android, særlig dra/hold, lyd og rotasjon av skjermen.

Fremgang på localhost følger ikke med til et nytt domene.

Første utgave er en nettutgave. Appbutikkpakking og ytterligere innhold kan komme senere.
