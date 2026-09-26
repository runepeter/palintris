# Hjelp på brettet og nytt brett etter fullført reise

Grunnlag: progresjonsauditen 27.09. Introer vises én gang og kan ikke hentes fram igjen; en langsom spiller som glemmer «hold og dra» eller hvordan Joker/Fjern brukes har ingen vei tilbake. En sterk spiller som har mestret alle verdener får «Spill igjen» til w6-15 selv om mange brett er uspilte.

## Ferdig
1. En «?»-knapp (44×44) øverst til høyre på brettet viser et kort hjelpepanel for verktøyene brettet faktisk tillater. Panelet gjenbruker introoverlayet, lukkes med «Skjønner» eller første godtatte trekk, og merkes ikke som sett intro. Skjult mens en ekte intro vises. Ren tekstfunksjon med test: maks to linjer à 44 tegn og kort form ≤ 46 tegn (avkortes ikke på 844×390).
2. Når reisen er fullført, sender hovedknappen til første uspilte, åpne brett (laveste verden først) før den faller tilbake til w6-15.

## Utenfor
Ny lagring, endrede introer, tastaturhjelp, endret meny.

## Verifisering
`npm test`, `npm run typecheck`, `npm run lint`, `npm run e2e -- --workers=1`, `npm run e2e:release`. Før/etter-bilder av brett med og uten hjelp (360×640, 360×500, 844×390). Uavhengig review.
