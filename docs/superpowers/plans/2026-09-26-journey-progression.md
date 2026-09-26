# Hovedreise — implementeringsplan

## Ferdig, avgrensning og verifisering
Ferdig: én hovedreise, mestringstilpasset progresjon, tydelig helbrettrotasjon, gradvis kvote- og midtbrikkemekanikk, bevart lagring og verifiserte produksjonsleveranser. Utenfor: konto, betaling, nye hovedmoduser, push/PR/merge. Hver leveranse: `npm test`, `npm run typecheck`, `npm run lint`, relevante `npm run e2e -- --workers=1`, `npm run e2e:release`, mobil visuell kontroll og offentlig fil-/spillkontroll. Ingen samtidige Playwright-suiter.

> Utførelse: superpowers:subagent-driven-development, med avgrensede implementerings- og review-agenter. Sir har bedt om autonom gjennomføring uten å vente på ham. Implementer løpende, før beslutninger/bevis i docs/day-progress-2026-09-26.md.

**Mål:** Gjøre kampanjen til én motiverende, tydelig og stadig mer variert reise.
**Arkitektur:** Rene domenevalg og persistente forsøksdata; Phaser presenterer dem. Gjenbruk kommandoer og BoardSession. Nye regler må være representert i solver og lagring før de vises i UI.
**Teknologi:** TypeScript, Phaser, Vitest, Playwright, Vercel statisk prebuilt.
**Spec:** docs/superpowers/specs/2026-09-26-journey-progression-design.md

## Felles krav
- Bevar gamle nivå-IDer, stjerner, innstillinger og aktiv ekspedisjon. Nye brett får nye IDer.
- Ingen skillgodkjenningsstopp; vurder uklarheter med Gemma 4/Claude eller uavhengig reviewer.
- Signer commits via 1Password. Ikke inkluder .codex. Publiser kun testet dist.
- Nøyaktig mål og løselighet skal verifiseres. Ukjent solver-resultat gir ikke lov til å kalle noe umulig.
- Ved introduksjon: ett nytt konsept om gangen, norsk kort tekst, 44 px berøringsmål, redusert bevegelse.

## Review-fokus
1. Gammel/ødelagt lagring må bevare opptjente stjerner og ikke gi ulovlig tilgang.
2. Reload, reset, angre og replay skal ikke kunne produsere falske sterke førsteforsøk.
3. Tilpasning må aldri hoppe over mekanikkintroduksjoner eller redusere opptjent tilgang.
4. Brikkeidentitet og restkvote må påvirke solverens søkenøkkel og angre/replay.
5. Smal mobil og landskap: navigasjon, trekkknapper og kvotetall må være synlige uten overlapping.

## Leveranse 1: Én start og synlig fremdrift
Filer: src/scenes/MenuScene.ts, ny src/scenes/ChallengesScene.ts, src/scenes/ui.ts, src/main.ts, ny src/game/journey.ts og tester, berørte E2E-filer.
- [x] Skriv røde tester for anbefalt neste brett: tom lagring, delvis verden, ny verden låst opp, hele kampanjen løst. Eksempel: `expect(journeyDestination({})).toBe('w1-01')`.
- [x] Implementer ren anbefaling fra faktisk opplåst progresjon. Hovedknapp går direkte til anbefalt kampanjebrett; kart er sekundært. Fremdriftskort viser faktisk neste mekanikk og krav, ikke oppdiktet XP.
- [x] Flytt ekspedisjon, Daglig og Blitz til ChallengesScene med korte forklaringer og tilbakeknapp. Behold Sticky kun som dev-prototype i undermenyen.
- [x] Oppdater E2E til ny navigasjon; verifiser mobil/landskap og gamle kampanjestjerner. Kjør testene først rødt, så grønt.
- [x] Uavhengig review, signert commit, deploy og offentlig kontroll. Registrer SHA/deploy i dagsloggen.

## Leveranse 2: Mestring og forsøk
Filer: ny src/game/mastery.ts, src/core/storage.ts, src/core/progression.ts, src/game/modes/campaign.ts, src/game/modes/types.ts, src/scenes/BoardScene.ts, src/scenes/ResultScene.ts, src/scenes/WorldMapScene.ts, src/game/journey.ts og tester.
- [x] Før kode: fastsett og skriv eksakt data-/beslutningskontrakt i dagsloggen med Claude eller uavhengig domenereviewer. Tre sterke av de siste fem unike førstegangsforsøkene innen en mekanikkfamilie er utgangspunkt. Optimal løsning uten reset/angre er sterk uansett tidsbruk; rask nær-optimal løsning kan også være sterk. Tid alene kan ikke gjøre en optimal løsning svak.
- [x] Skriv tester for samme optimale løsningsbane ved kort/lang aktiv tid, pauser, skjult fane, reset, angre, reload, replay og sidemoduser. Introduksjoner må være ufravikelige; snarveier er tilgang, aldri falske stjerner.
- [x] Persistente kampanjeforsøk og aktiv spilletid. Pause-/animasjonstid telles ikke. Klassifiser bare etter fullført forsøk, aldri midt i brett.
- [x] Tilby mestringsprøve ved sterke resultater, og frivillig ekstra øving ved problemer. Vis konkret neste belønning på lobby/kart/resultat. Ingen nedgradering av opptjent tilgang.
- [x] Uavhengig review, relevante og samlede tester, mobilkontroll, signert commit og egen verifisert deploy.

## Leveranse 3: Helbrettrotasjon
Filer: src/scenes/BoardScene.ts, faktisk bevegelsesrenderer, src/game/moveAnimation.ts og tester/E2E.
- [x] Reproduserende test: helbrettknapp lager `{type:'rotate',from:0,to:n-1,dir:'left'}` og gir forventet ID-rekkefølge. Låste brikker avviser hele trekket. Input under animasjon skal ikke doble trekket.
- [x] Gjenbruk motoren, legg til synlige knapper etter introduksjon. Vis kantbrikkens bane til motsatt ende og de øvrige brikkenes forskyvning. Redusert bevegelse skal fortsatt vise retningen.
- [x] Review, mobil-/animasjonskontroll, tester, commit og verifisert deploy.

## Leveranse 4: Kvote og midtbonus i reisen
Filer: src/core/tiles.ts, src/core/step.ts, src/core/commands.ts, src/core/solver.ts, src/core/solverProtocol.ts, src/core/level.ts, kampanje-/reiseinnhold, lagring, TileView/BoardScene/ResultScene og tester.
- [x] Skriv liten eksakt kontrakt for nye brikkefelt/mål og innholdstilgang før dispatch. Kvote følger ID, brukes én gang per endret posisjon per kommando, null avviser atomisk, angre gjenoppretter.
- [x] Røde tester for begge deltakere i swap, rotate, mirror med urørt midte, undo/reset, søkenøkler, reload og ugyldige data. Ingen håndkort/sticky i første kvoteinnhold.
- [x] Bonusmål refererer konkret brikke-ID på oddetallsbrett med minst tre av symbolet. Vanlig palindrom fullfører; markert brikke i midten gir bonusmerke. Solver verifiserer både vanlig og bonusløsning, og at bonusen krever et reelt valg.
- [x] Introduser i eksisterende reise med egne nivå-IDer, aldri nye lobbyknapper eller overskriving av gamle stjerner. Merk kvote og bonus tydelig før og under spill.
- [ ] Uavhengig domene-/UI-review, full testpakke, mobil visuell kontroll, signert commit og offentlig verifisert deploy.

## Tillegg fra Sir
- Før/etter-bilder per visuell leveranse i hovedrepoets lokale, Git-ignorerte screenshots-local/. Registrer tilstand/provenance; manglende historiske før-bilder merkes ærlig.
- Lokal spillende sidecar: docs/superpowers/plans/2026-09-26-sidecar.md. Skal ferdigstilles som del av dagsarbeidet, uten å forsinke verifiserte spill-leveranser.

## Sluttkontroll
- [ ] Hele nye spillerreisen og retur med gammel lagring testes; mobilregresjoner og endelig produksjonskontroll.
- [ ] Dagslogg oppdateres med levert/gjenstående. Automatisk oppfølging pauses når scope er ferdig, senest kl. 23. Ingen kunstig videreutvikling etter ferdig scope.
