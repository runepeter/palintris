# Speilekspedisjonen · 25. september 2026

Ni rom knyttes sammen til én reise. Trygg og farlig vei gir ulike trekkbudsjetter og poeng. Tre liv, fire relikvievalg og voktere i rom 3, 6 og 9. Relikvier åpner rotasjon/speiling eller gir ekstra trekk, poeng og liv. Siste kapittel har elleve brikker. Reisen gjenopptas etter menybesøk eller omlasting.

Trekk er bindende. Livsoffer krever bekreftelse; siste liv avslutter reisen. Poengrekord og antall seire lagres lokalt. Kampanjen, Daglig, Blitz, fri spilling og deres lagring beholdes. Sticky er fortsatt bare en lokal prototype.

## Verifisering

- 341 enhetstester, typekontroll og lint passerer.
- Alle 33 utviklingstester har passert: full runde ga 32/33; den siste testen brukte gammel posisjon for innstillinger i landskap. Etter oppdatert posisjon passerer også den.
- Seks produksjonstester i Chromium/WebKit: kampanje, lagring, blokkert lagring og ekspedisjon/gjenopptak. Utviklingskroker finnes ikke i produksjonsbygget.
- Hele ekspedisjonen spilles gjennom med ekte UI-input i E2E: fire relikvievalg, gjenopptak under valg, ni rom, seier og ny reise.
- Regresjonstest reproducerer og beskytter mot drag gjennom livsoffer-dialogen.
- Domene og sceneintegrasjon er uavhengig kodegjennomgått. Balansen ble justert etter prøving av flere tusen genererte brett. 180 tvungne fallback-tilfeller og 1080 genererte brett beholder vanskelighetsgulvet.
- Visuelt kontrollert: 360×640, 390×844, 844×390 og 1440×900. Uavhengig bildegjennomgang fant ingen publiseringsblokkere. Fysiske telefoner og skjermleser er ikke testet.

## Publisering

Direkte Vercel-publisering av ferdigbygde statiske filer til eksisterende `cyclaw/palintris`. Git-grenen pushes ikke. Neste publisering fra GitHub må inkludere ekspedisjonsgrenen for å beholde utvidelsen.

Publisert 25. september 2026: https://palintris.vercel.app

Deploy: https://palintris-j3yqrejwt-cyclaw.vercel.app (`READY`, production).

Alle tolv offentlige filer er byte-for-byte identiske med testet `dist`. Spillbundle: `index-ChZwgjnP.js`, SHA-256 `8f5d39121ef73670153b72a3875fc0511567bc0b594d2186dc685ad8462affed`. Manuell produksjonssjekk: åpne ekspedisjon, velge vei, gjøre trekk, laste om, gjenoppta identisk brett og løse første rom.

Tidligere produksjonsdeploy: https://palintris-hk501i8d3-cyclaw.vercel.app

## Mulig videre finpuss

Tettere plassering av relikvievalg på høy mobil/desktop og tydeligere fremtidige kartnoder. Ingen kjente funksjonelle blokkere fra gjennomgangen.
