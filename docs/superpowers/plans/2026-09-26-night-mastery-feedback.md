# Oppnåelig mestringsfeedback

Ferdig: Resultatet viser telleren mot mestringsprøven bare når gjenværende førsteforsøk fortsatt kan fylle den. Gamle fullt løste verdener og brukte forsøksvinduer lover ikke uoppnåelig fremgang. Eksisterende tilbud, stjerner, tilgang og normal viderehandling beholdes.

Utenfor: Nye mestringsterskler, ny lagring, nye verktøy, nye hovedmoduser og endring av gamle brett.

Verifisering: `npm test`, `npm run typecheck`, `npm run lint`, `npm run e2e -- --workers=1`, `npm run e2e:release`; før/etter360×640 og844×390; uavhengig domenereview og visuell review, signert kilde, dist-onlypublisering med alle offentlige filhash og isolert offentlig spilltest.

Funn: Ekte replay med gammel lagring gir ingen førsteforsøk; ResultScene viste likevel0/3. Også familier med for få nye forsøk igjen må unngå løftet. Oppnåelighet er en optimistisk øvre grense, ikke en solvergaranti for hvert påbegynt brett.

1. Røde domenetester: legacyfullført, vanlig nyreise,1–2gjenstående, rullerende5, påbegynte ordinals, brukt/angret/feilversjon-forsøk, eksisterende tilbud.
2. Ren count|null-visningshelper i mastery.ts. Beregn beste mulige siste5 ved gjenværende kvalifiserte førsteforsøk med faktiske ordinals; nye forsøk får nyere ordinal. UI bruker helper etter eksisterende tilbud/øving. Ingen endring av tilbuds-/opptjeningsregler.
3. Faktisk replay via UI gir førbilde og rød E2E. Etterfix skal telleren være borte, videreknapp/gjenspilling fungere, og nyspiller fortsatt se opptjeningen.
4. Reviewer validerer hypotetisk vindu og inverscase. Samlet sjekk, publisering og dagslogg.

Sir har autorisert autonom gjennomføring; dette er en avgrenset retting innen nattens progresjonsarbeid.
