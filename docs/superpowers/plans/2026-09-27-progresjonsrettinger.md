# Progresjonsrettinger fra nattaudit

Grunnlag: skrivebeskyttet progresjonsaudit 27.09 med ekte løser og reiselogikk (rådata i sesjonens scratchpad, funn gjengitt her).

## Ferdig
1. **w5-01 lærer begge verktøy.** Brettet `CBCECEE` har tre odde symboler; det kan bare løses med både joker og Fjern, men introen nevner bare jokeren. Introteksten forklarer Fjern også. Test: hvert kampanjeintrobrett kan løses innen budsjett med mekanikkene som er introdusert til og med introen (pluss det introen eksplisitt forklarer).
2. **Restbrett i stigende rekkefølge.** Når høyeste åpne verden er ferdig, sender reisen spilleren til laveste verden med uløste brett (i dag: w5-13 … w1-15, reisen ender på w1-15). Normal progresjon mot nyeste verden uendret.
3. **Sikker blindvei ved paritet.** Flere odde symboler enn jokere på brettet + jokere og Fjern i hånden + 1 kan aldri bli palindrom. Sesjonen gir da `deadEnd` uten løser. Aldri falsk blindvei: egenskapstest mot løseren på små brett.
4. **Tikk under resultatseglet** krysser «N trekk · mål M». Nederste tikk tegnes ikke.

## Utenfor
Endring av de 90 brettene eller deres mål, nye brett, ny lagring, endret mestringsregel, «Spill igjen»-valg etter fullført reise.

## Verifisering
`npm test`, `npm run typecheck`, `npm run lint`, `npm run e2e -- --workers=1`, `npm run e2e:release`. Før/etter-bilder av w5-01-intro (360×640, 844×390) og resultat (844×390). Uavhengig review før merge.
