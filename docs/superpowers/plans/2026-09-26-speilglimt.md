# Speilglimt — implementeringsplan

## Ferdig, avgrensning og verifisering
Ferdig: Spilleren tjener ett glimt per tre ulike løste ordinære kampanjebrett, kan bruke det til ett korrekt neste-trekk-hint, og beholder forbruk/hjelpestatus etter reload. Hjelp gir vanlig seier, men aldri sterke førsteforsøk. Synlig motivasjon og mobilvennlig44px-kontroll uten ny lobbymodus.
Utenfor: Autospilling, joker/ekstra trekk, hjelp på introer/prøver/bonusbrett/konkurranser, temapakker og fallende brett. Ingen endring av gamle brett eller mestringstilgang.
Verifisering: `npm test`, `npm run typecheck`, `npm run lint`, `npm run e2e -- --workers=1`, `npm run e2e:release`; reell mobilflyt360×640/360×500/844×390, uavhengig review, før/etterarkiv og offentlig filhash/spillkontroll før ferdig.

> Utfør med superpowers:subagent-driven-development. Autonomt mandat gjelder; ingen interaktive skillgodkjenninger. Én integrator eier commit/deploy. Les spec før hver del.

Mål: nyttig belønning for fremdrift, med forståelig og ærlig hjelp.
Arkitektur: Opt-in førstekommando fra eksisterende BFS/requestSeq; ren beholdningslogikk og atomisk lagringsforsøk; scenen presenterer hint uten å utføre det.
Teknologi: eksisterende TypeScript/Phaser/Vitest/Playwright/worker; ingen ny avhengighet.
Spec: docs/superpowers/specs/2026-09-26-speilglimt-design.md.

## Før implementasjon
- [ ] Vent på avsluttet sidecar runtimefrys og publisert nattretting av mestringsfeedback. Bekreft gitstatus og ingen overlappende agenter/prosesser.
- [ ] Les faktisk HEAD og oppdater kontrakt hvis scenens hånd-/rotasjonslayout krever et annet grensesnitt. Ingen ny UI før førbilder.

## 1. BFS og worker: bevisbart neste trekk
Filer: src/core/solver.ts, src/core/solverProtocol.ts og eksisterende solvertester.
API: SolveRequest.includeFirstMove?:boolean; solved-resultat firstMove?:MoveCommand. Uten flagg uendret resultatshape. QueueItem kan bære rotens førstetrekk; ikke lagre hele ruter.
- [ ] Røde tester: tilbakefør firstMove gjennom ekte applyMove og bevis restløsning medmoves-1; swap, rotate, mirror, hånd, kvote og bonusobjektiv. Allerede løst/unknown/cancelled/umulig skal ikke gi et kjøpbart trekk.
- [ ] Implementer opt-in og worker-roundtrip; sjekk limits og identity-semantikk uendret.
- [ ] Avgrenset test/review før videre kobling.

## 2. Beholdning og varig, atomisk forbruk
Filer: ny src/game/tools.ts, src/core/storage.ts, src/game/saveStore.ts og egne domenetester.
API: speilglimtBalance(data):number; earnedSpeilglimt(data):number; canUseSpeilglimt(levelId):boolean. Valgfri save.tools med speilglimtSpent, valgfri FirstAttempt.assisted:true. SaveStore.tryUpdate(fn):boolean oppdaterer minnet bare etter vellykket persistens; vanlig update uendret.
- [ ] Røde tester: bare90kjente kampanjebrett teller, floor(unike/3), gamle saves får beholdning, replay gir ikke mer, ingen opptjening fra tilgang/trials/sidecar.
- [ ] Velg og dokumenter konservativ parser for korrupt spent/assisted før implementasjon. Bevar øvrig save; ikke gjør korrupt assisted til et rent sterkt forsøk. Ingen kjøp når lagring blokkeres eller beholdning er tom.
- [ ] Test én lagringsoperasjon for debit+assisted, skrivefeil uten minnemutasjon, parse/reload og uendret eksisterende save-policy. Kjør ekte in-memory StorageLike; bare feilende ekstern lagring simuleres.

## 3. Gjeldende sesjon og mestring
Filer: src/game/session.ts, src/game/modes/campaign.ts, src/game/mastery.ts og relevante tester. Koordiner storage/testfil-eierskap med del2.
API: SessionOptions.includeFirstMove?:boolean; known SolveStatus kan ha firstMove?:MoveCommand. CampaignMode-spesifikk metode for atomisk glimtbruk navngis i kontrakten før UI-dispatch; øvrige modes skal ikke få påtvunget metode.
- [ ] Røde tester: samme solverrequest/requestSeq, sent svar etter nytt trekk/reset/dispose aldri kjøpbart, ordinarystatus uendret, ingen ekstra klientrequest.
- [ ] Valider aktuell firstMove gjennom applyMove på snapshot før forbruk. Ingen boarddispatch ved hint. assisted markeres før hint publiseres, også når forsøket senere angrer/resetter/reloader.
- [ ] classify(assisted) aldri strong; eksisterende mestringstilgang/tilbud beholdes. masteryProgressCount må utelate assisted fra hypotetiske sterke.
- [ ] Bevis snapshot/history/budget/kvote uendret ved bruk, og vanlig senere trekk gir ordinært forbruk.

## 4. Presentasjon og opptjeningsmotivasjon
Filer: BoardScene.ts, ResultScene.ts, ev. liten egen hintpresenter; bare nødvendige temafelt.
- [ ] Ta ekte førbilder. Lag liten layoutskisse for44px-knapp uten overlapp med hånd/helrotasjon på360×500.
- [ ] Rød E2E: tjen ett glimt gjennom faktiske tre seire, bruk på tillatt neste brett, se forklaring/markert brikke eller segment/retning, flytt selv, få seier, behold balance/assisted vedreload.
- [ ] Implementer konkret norsk handlingshint for alle tillatte kommandoer. Ingen hele løsningsruter. Ekskluderte intro-/mestringsbrett må være forståelige; ikke vis en mystisk utilgjengelig knapp.
- [ ] Samme aktive hint debiteres ikke ved dobbelttrykk. Neste akseptertekommando/reset/exit/resize rydder markeringen; reset/angre refunderer ikke glimt. Inputvern ved tween/modal/solved. Vis forklaring ved skrivefeil, bruk ingen glimt da.
- [ ] Resultatet viser opptjening og at brettet ble løst med hjelp uten å love selvstendig mestring. Behold én primær viderehandling.

## 5. Integrasjon og uavhengig review
- [ ] Test før/etter, inverse ingenhjelp, blokkert storage, pendingworker, doubleclick, resize, undo/reset/reload og gammelsave. Ingen produktendringer under samlet testpakke.
- [ ] Del review per solver/session og save/mastery/UI hvis samlet diff over800linjer/15filer. Bruk adversarial skill på relevante reparasjoner, visuell reviewer med kilde-/viewportmapping.
- [ ] Samlet verifisering, signert commit, dist-onlydeploy, rollbackregistrering, offentlige filhash og isolert faktisk spillflyt. Ikke muter brukerens eksisterende produksjonslagring.
- [ ] Oppdater docs/day-progress-2026-09-26.md og lokalt skjermbildegalleri. Ingen push/PR/merge/GitHub-kommentarer. Vurder neste konkrete funn innen nattmandatet.

## Bindende presisering før dispatch
Les «Låst etter uavhengig planreview» i spec. Test særlig hjelp på historisk strong-replay uten omskriving, den aktuelle spillesesjonens resultatmerking, quote-objekt fra tidligere sesjon/revisjon som fortsatt er et lovlig trekk, resize uten ny debit,90/90 uten falsk31.belønning, korruptspentogassisted ogsetterfeil. Parserreglene er nå valgt; oppgaven om å velge dem er dermed designmessig ferdig, men test/implementasjon gjenstår.
