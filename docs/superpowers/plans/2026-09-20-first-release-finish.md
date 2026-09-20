# Første nettutgivelse: siste finish

Ferdig når full testpakke og produksjonsbuild passerer, sentrale spillflyter er kontrollert på mobil og desktop, og påviste lanseringshindre er rettet. Signerte commits; ingen push eller publisering i denne runden.

Utenfor scope: nye mekanikker, flere kampanjenivåer, konto/skysynk, appbutikk og monetisering. Sticky beholdes som et tydelig merket forsøk.

Verifisering: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run e2e -- --workers=1`; separat nettleserkontroll av statisk `dist` via `npm run preview`, uten utviklingskroker.

- [x] Kontroller lagring, moduser og lyd mot faktisk kode og tester.
- [x] Kontroller meny, kart, innstillinger og spill på 360×640, 390×844, 844×390 og desktop.
- [x] Rett reproduserte feil med målrettet regresjonstest; avslutt oppstart og presentasjon for utgivelse.
- [x] Kjør full verifisering etter endringene og kontroller produksjonsflyten.
- [x] Dokumenter utgivelsesstatus, kjente avgrensninger og siste publiseringssteg. Commit.

Resultat: 333 enhetstester, 25 E2E og fire produksjonstester grønne. Produksjonstesten kjører i Chromium og WebKit. Se `docs/release-v1.md` for siste fysiske mobiltest og publisering.
