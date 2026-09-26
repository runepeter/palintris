# Speilglimt — første opptjente hjelpeverktøy

**Anbefaling: bygg én opptjent hjelp som viser neste lovlige trekk; spilleren utfører trekket selv.** Det gir konkret verdi av fremdrift uten å endre brett, trekkbudsjett, kvoter eller stjerner. Start med vanlige kampanjebrett; behold introer, mestringsprøver, bonusprøver og konkurransemoduser uten hjelp i første leveranse.

Status: valgt retning under Sirs autonome nattmandat. Implementasjon starter etter at pågående mestringsretting er publisert og sidecarens runtimefrys er avsluttet. Egen kort implementeringsplan kreves før dispatch.

Brukerintensjon: belønninger som er nyttige underveis, uten flere startvalg. Vurderingen er read-only, basert på faktisk solver/session/mastery/save-kjede. Brainstorming-skillens designramme brukt; ingen implementering eller Playwright kjørt.

## Minste nyttige produkt
- Navn/handling: «Speilglimt · N», forklaring «Vis neste trekk. Du flytter selv.» Ved bruk markeres involverte brikker/segment og konkret handling/retning. Ingen autospilling, ekstra joker eller gratis trekk.
- Opptjening: ett glimt per3 forskjellige løste ordinære kampanjebrett. Beregn opptjent fra faktiske stjerneregistreringer for eksisterende90-IDer; forbruk lagres separat. Gamle spillere får tilsvarende opptjent beholdning. Replay og stjerneforbedring gir ikke nye glimt; mestringsåpning uten stjerner teller ikke. Maks30 opptjente i dagens innhold, ingen skjult bank/cap-regel.
- Vis «2/3 speil til neste glimt» i eksisterende resultatområde og samlet beholdning i spillets verktøykontroll. Ikke legg et nytt startvalg i lobbyen eller en butikk.
- Første glimt kommer etter tre fullførte brett. Fortsatt vanlig seier/stjerner ved hjelp; resultat kan si «Løst med speilglimt». Hjelpen skal ikke late som spilleren demonstrerte selvstendig mestring.
- Avklar kompakt44px-knappplass mot eksisterende hånd/rotasjonskontroller i egen lokal layoutskisse før UI. Ikke press en femte langtekstknapp inn i hånden uten mobilkontroll.

## Hva finnes allerede
- `src/core/solver.ts`: BFS søker korrekt minimum via faktiske `legalMoves`+`applyMove`, kvote-/ID-bevisst key og bonus-terminalregler. Den returnerer bare `moves`, ikke et trekk eller en rute.
- `src/core/solverProtocol.ts` / `solverClient.ts`: worker-roundtrip, cancel og request-ID. **SolverClient har bare én utestående request**; et separat hintkall på samme klient ville avbrutt statusløseren.
- `src/game/session.ts`: starter allerede løser etter hvert aksepterte trekk; `requestSeq` avviser gamle svar, dispose avbryter. Gjenbruk denne kjeden.
- `src/scenes/BoardScene.ts`: eksisterende `showHint` er feil-/avvisningstekst, ikke strategisk hjelp. `moveCue`, segmentmarkering, tile-IDer, pendingTweens/inputLocked og reducedMotion kan gjenbrukes som presentasjonsbyggesteiner.
- `src/game/modes/campaign.ts`: `beginAttempt→recordCommand→onSolved`; telemetry registreres før synkron seier. `mastery.classify` diskvalifiserer undo, men vet foreløpig ikke om hjelp. Mestringsprøvens grant sjekker bare target+1; derfor ekskluderes slike prøver i første leveranse.
- `src/core/storage.ts` / `src/game/saveStore.ts`: v1-save med valgfrie felt. `persistSave` svelger skrivefeil; vanlig update er derfor **ikke bevis på lagret debit**.

## Foreslått avgrenset arkitektur
1. Opt-in `includeFirstMove` på SolveRequest og valgfri `firstMove` på solved-resultat. BFS bærer første kommando fra roten, ikke hele ruter. Ordinære kall uten flagg beholder dagens resultatshape/key/semantikk. Worker viderefører feltet.
2. Session ber om første trekk bare når hjelpefunksjonen er tillatt, og publiserer det sammen med gjeldende solverstatus. Bruk samme requestSeq; aldri en parallell hintrequest på samme klient. Unknown/deadEnd/cancelled har ingen kjøpbar hjelp.
3. Ny ren `src/game/tools.ts`: eligibility, opptjent/spent/balance, debitreducer og statefingerprint. Før visning må kommandoen fortsatt være lovlig via `applyMove` på eksakt aktuell snapshot. Hintet endrer ikke snapshot.
4. Valgfri save-del for forbruk og `assisted?: true` på FirstAttempt. Debit og assisted skrives i **én persistensoperasjon før hint vises**. Legg til et smalt try-persist/commit-API som kan avvise kjøpet ved skrivefeil, uten å endre vanlig spillesave sin feilpolicy.
5. `classify` gir assisted forsøk ordinary, også etter undo/reset/reload. Ikke fabriker undoCount eller annen telemetry. Dagens stars/budget beholdes. Eksisterende opptjente mestringstilganger trekkes aldri tilbake.
6. BoardScene viser kun et hint for gjeldende snapshot, og fjerner markeringen ved neste aksepterte kommando, reset, sceneavslutning eller resize. Dobbelttrykk og ny visning av samme aktive hint belastes ikke igjen. Spilleren kan velge et annet trekk.

## Invarianter
- Hjelp endrer ingen tile-ID, symbol, movesLeft, hånd, history, movesUsed, target eller budget. Selve spillerens senere kommando går gjennom uendret dispatch og forbruker normal kvote/trekk.
- En oppgitt førstekommando må ligge på en full lovlig løsning innen gjenværende budsjett; aldri «best guess» ved unknown. Solverens vanlige palindrome-terminal forblir uendret.
- Ingen debit ved tom beholdning, ugyldig/stale svar, busy/intro/modal/solved eller mislykket lagring. Positivt forbruk og assisted kan ikke skilles ved crash mellom to separate save-skrivinger.
- Gamle saves/stjerner/introer/badges bevares; ugyldig verktøyfelt må isoleres og håndteres konservativt uten å slette resten av save. Replay eller sidecar kan ikke utløse opptjening.
- Ingen hjelp i Daily, Blitz, ekspedisjon, intro-/mestringsbrett eller nye quota/center-prøver i første versjon. Senere hjelp på center-prøven krever eksplisitt valg av vanlig seier eller bonusmål, ellers kan et råd avslutte brettet uten ønsket merke.

## Done og verifikasjon
- TDD: firstMove replay+minimumsbevis/workerroundtrip, unknown og stale-resultat; opptjening uten replay-farming; atomisk debit+assisted/reload og storagefeil; assisted aldri strong; hjelp endrer ikke snapshot og dobbelttrykk debiterer én gang.
- Faktisk mobilflyt: tjen et glimt → vis lovlig trekk → flytt selv → seier/ordinære stjerner → reload beholdning; alternativt ignorer hint, undo/reset og gå ut mens worker kjører. Test360×640,360×500 og844×390, reducedMotion.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, relevante E2E og `npm run e2e:release`; uavhengig kode-/visuell review og før/etter-bilder før prod.
- Primære filer: solver/protocol, session, tools(new), storage/saveStore, mastery/campaign, BoardScene/ResultScene og relevante tester. Ingen levelgenerering eller endring av de93 brettene.

## Out of scope
Autoløsning, 2–3 trekk som pakke, ekstra budsjett, joker/omforming av brikker, hjelp på bonus-/mestringsprøver, monetisering, temaer/ord/bilskilt, fallende speil/Tetris og ny sidecartreningsrunde. Disse er separate utvidelser; budsjett/joker endrer poengkontrakten og bonusvaliditeten og bør ikke smugles inn i et hjelpesystem.

## Låst etter uavhengig planreview
- Opptjening teller alle90kjente legacy-IDer, inkludert introer og nivå15, én gang ved minsténstjerne. Bruk er ekskludert på introer og nivå15.93innholdselementer betyr fortsatt høyst30opptjente glimt; ved90/90 vises ingen lovnad om et31.glimt.
- Hjelp på replay debiterer beholdningen uten å opprette eller endre historisk avsluttet førsteforsøk. Bare det aktive åpne førsteforsøket får assisted:true. Eksisterende strong-resultat og tilbud er historikk og beholdes. Resultatets «løst med hjelp» kommer fra et separat flagg for denne spillingen, nullstilt ved beginAttempt/nyinngang; ikke fra gammel forsøksrecord.
- Hintet leveres som en privat sesjonsbundet quote med objektidentitet, lagret av BoardSession for den aktuelle requestSeq. Forbruk krever at samme quote fortsatt er den aktive i samme sesjon, pluss aktuell applyMove-validering. Hvert akseptert trekk/reset/undo/dispose ugyldiggjør den. En lovlig kommando fra et gammelt svar er ikke tilstrekkelig.
- Betalt quote-identitet beholdes i denne spillingen ved resize selv om markeringen må tegnes på nytt. Gjentatt visning av samme betalte quote er gratis. Neste aksepterte kommando skaper eventuelt ny quote som koster nytt glimt. Angre/reset refunderer ikke tidligere forbruk.
- Feltfravær betyr gammel save ogspent0. Finnes tools men er feilformet, eller spent er utenfor trygt heltall0..30, normaliseres forbruk konservativt til30 uten å røre øvrig lagring. Gyldig spent som overstiger nåværende earned beholdes; balance=max(0,earned-spent). assistedfeltets fravær/false betyr uten hjelp, true betyr hjelp; ugyldig tilstedeværende assisted tolkes konservativt somtrue. Eksisterende parserregler for ellers ugyldige forsøk beholdes.
- tryUpdate må prøve faktisk storage.setItem medhele debiterte SaveData og bare deretter bytte current. Den må ikke bruke persistSave sin feilsvelging. Debit og assisted er ett JSON-dokument og én setItem. Setterfeil girfalse, ingen hint og uendretminne. Normalupdateendrerikkeoppførsel.
