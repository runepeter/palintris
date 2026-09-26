# Hovedreise og mestring — designutkast

Status: godkjent av Sir 26. september. Autonom gjennomføring og fortløpende verifisert produksjonspublisering er uttrykkelig autorisert; ingen interaktive plan-/designstopp. Ingen Git-push.

## Ferdig når
- Lobbyen har én tydelig start/fortsett-handling og ett sekundært valg for utfordringer.
- Spilleren ser sitt neste konkrete mål og hva som låses opp.
- Progresjonen reagerer på gjentatt mestring og problemer, uten tidspress eller endring av pågående brett.
- Rotasjon av hele brettet er lett å finne og visuelt forståelig.
- Flyttekvoter og markert midtbrikke introduseres gradvis gjennom verifiserte brett.
- Eksisterende stjerner, innstillinger og ekspedisjoner bevares.

## Utenfor
Nettkonto, flerspiller, kjøp, daglige innloggingskrav, nye parallelle hovedmoduser. Ingen push. Publisering først etter test og gjennomgang.

## Verifisering
`npm test`, `npm run typecheck`, `npm run lint`, `npm run e2e -- --workers=1`, `npm run e2e:release`.
Tester skal dekke lagringsmigrering, tilpasning med pauser/omstarter, lovlige og ulovlige kvotetrekk, rotasjon, midtbonus og hele reisen gjennom nye mekanikkintroduksjoner. Visuell kontroll på 360×640, 390×844, 844×390 og 1440×900, med og uten redusert bevegelse.

## Retning
Valgt: kampanjen blir hovedreisen. Speilekspedisjonen, Daglig og Blitz samles under «Utfordringer».

Lobby: tittel og verden, ett fremdriftskort («Neste: rotasjon»), stor «Fortsett reisen»/«Start reisen», mindre «Utfordringer», kart og innstillinger som diskrete verktøy. Fortsett går direkte til aktivt eller anbefalt brett. Kartet er tilgjengelig for gjenbesøk.

## Progresjon og motivasjon
Hver etappe bruker rytmen introduksjon → øving → kombinasjon → mestringsprøve. Vis neste belønning som en ny evne, et nytt område eller et mesterskapsmerke. Resultatet viser én tydelig viderehandling og konkret fremgang, eksempelvis «2 av 3 prøver mot rotasjon».

Første leveranse beholder eksisterende nivåidentiteter og stjerner. Nye utfordringer får egne identiteter. Eventuelle snarveier gjennom repetisjon lagres som tilgang, aldri som falskt løste nivåer. Introduksjoner kan ikke hoppes over.

Tilpasning skjer mellom brett, basert på de siste fem førstegangsforsøkene innen samme mekanikkfamilie. Effektive løsninger, få omstarter og jevn mestring veier tyngst. Aktiv spilletid er et støttesignal, normalisert mot brettets vanskelighet; meny, skjult fane, introduksjon og animasjon teller ikke. Lang tid alene senker aldri vanskelighetsgraden. Tre sterke forsøk kan gi tilbud om mestringsprøve med mindre repetisjon. Gjentatte mislykkede forsøk gir tilbud om et enklere øvingsbrett. Ingen endring midt i et forsøk, ingen trekk i opptjent progresjon. Eksakte terskler kalibreres med testforløp før publisering.

## Mekanikkrekkefølge
1. Rotasjon: to synlige knapper, «Hele brettet ← / →», når evnen er introdusert. Gjenbruk eksisterende rotasjonskommando over hele rekken. Alle brikker glir ett hakk; endebrikken følger en synlig bue til motsatt ende. Retning vises før og under trekket. Redusert bevegelse får kort overgang og tydelig markering av ny posisjon. Input sperres under flyttingen.
2. Flyttekvote: start med én brikke med to flytt. Kvoten følger brikkens identitet. Hver kommando bruker én kvote på hver begrenset brikke som faktisk skifter posisjon, også ved rotasjon og speiling; en urørt midtbrikke bruker ingen. Begge brikker i et bytte teller. Null betyr at brikken ikke kan flyttes. Ugyldige trekk avvises atomisk. Angre gjenoppretter kvoten i moduser med angre. Ingen håndkort eller sticky-kombinasjoner i første kvoteinnhold.
3. Midtbrikke: merk én bestemt brikke blant minst tre med samme symbol, på et oddetallsbrett. Et vanlig palindrom fullfører nivået; den merkede brikken i midten gir eget bonusmerke. Målet vises før første trekk. Innholdet må ha både en vanlig løsning og en oppnåelig bonusløsning; spilleren får ikke tilfeldig bonus bare ved å løse det eneste mulige palindromet. Harde midtkrav kan komme i senere mesterprøver, ikke første introduksjon.

## Teknisk grunnlag og målområder
Verifisert lokal `origin/main`: samme faste progresjonsregler som arbeidsgrenen, seks verdener à femten nivåer. Verden 2–4 har alle mål på 2–3 trekk. Kampanje registrerer stjerner, men sender ikke løsetid videre. Rotasjon finnes allerede i kommando, motor og solver. Flyttekvote og brikkeidentitet i mål finnes ikke. Appen er statisk; ingen prod-DB eller migrasjonsnummer er relevant.

- Lobby/ruting: `src/scenes/MenuScene.ts`, ny utfordringsscene, `src/scenes/ui.ts`, `src/main.ts`.
- Progresjon: `src/core/progression.ts`, `src/game/modes/campaign.ts`, `src/core/storage.ts`, `src/scenes/WorldMapScene.ts`, `src/scenes/ResultScene.ts`.
- Forsøksmåling: `src/scenes/BoardScene.ts`, `src/game/modes/types.ts`, separat ren funksjon for mestringsvurdering.
- Mekanikk: `src/core/tiles.ts`, `src/core/step.ts`, `src/core/commands.ts`, `src/core/solver.ts`, nivå-/målmodell og solverprotokoll. Søkenøkkelen må skille kvoter og målbrikkens identitet; dagens symbolnøkkel er utilstrekkelig.
- Presentasjon: `src/scenes/BoardScene.ts`, `src/scenes/TileView.ts`, `src/game/moveAnimation.ts`, eksisterende tema.
- Innhold: `src/content/recipes.ts` og separate kuraterte introduksjoner med maskinverifiserte løsninger. Ikke regenerer gamle nivåer under eksisterende stjerner.

## Leveranserekkefølge
Først lobby, fremdriftskort og mestringstilpasning. Deretter synlig helbrettrotasjon. Til slutt kvotebrikker og midtbonus som innhold i samme reise. Ingen ny hovedknapp per mekanikk. Hver del får reproducerende tester før implementasjon og gjennomgang etterpå.
