# Palintris redesign – designspec

Dato: 2026-09-07
Status: utkast, revisjon 4 etter tre Codex-runder

## Mål

Gjøre Palintris moderne og spillbart på mobil. Grunnideen består: gjør en sekvens til et palindrom ved manipulasjoner. Alt annet kan kastes om.

Beslutninger tatt:
- Mobil touch først. Desktop fungerer, men designes ikke for.
- Phaser 3 beholdes, med ny arkitektur og ren testet kjerne.
- Tre moduser: Kampanje, Daily, Blitz. Versus, Cascade og Mechanical parkeres.

## Bakgrunn: hva som er galt i dag

- Zen og Daily genererer tilfeldige sekvenser uten løsbarhetsgaranti. Med bare swap/rotate/mirror er en sekvens løsbar kun hvis maks ett symbol har oddetall forekomster.
- Progresjon låser seg på nivå 10: LevelSelect bruker samlet nivå-ID, spillscenene lagrer klassisk ID.
- Undo mister start/end/direction for rotate og mirror ved replay, og gjenoppretter budsjettet feil.
- Tomt for trekk gir en tap-modal uten forklaring.
- Seks spillmoduser er kopier av GameScene med hver sin palett. Temafila er død, farger hardkodet 200+ steder.
- Tokens, power-ups, badges, achievements er definert, men badges/achievements kalles aldri, tre power-ups mangler effekt.
- 30 MB ubrukte Kenney-kits, ~150 sprites lastes uten bruk. Fast 800×600, ingen mobil-layout. Null tester.

## 1. Regler og kjerne

### Brikker og sekvens
- En sekvens er en liste av brikker. Hver brikke har stabil `id`, `symbol` og eventuelt én egenskap: `locked` eller `wild`.
- `locked`: kan ikke swappes, ikke inngå i segment, ikke fjernes. Indeksen kan likevel forskyves av innsetting/fjerning andre steder.
- `wild` (joker): matcher alle symboler ved palindrom-sjekk. Kan flyttes som vanlig brikke.
- Lenkede brikker er tatt ut. Ingen enkel, entydig regel ble funnet; kan vurderes senere.
- Reglene er uavhengige av layout. Hårnål-visning (§2) endrer aldri hva som er lovlig.

### Regler, tilstand og kommandoer
Kjernen eksponerer én funksjon:

```
apply(rules: Rules, state: BoardState, cmd: Command): Result<BoardState, RejectReason>
```

- `Rules = { allowedOps: Set<'swap'|'rotate'|'mirror'|'insertWild'|'remove'>, minLength: 3, maxLength: 14 }`. Rules er konstante for et brett.
- `BoardState = { tiles: Tile[], hand: { wild: number, remove: number }, movesUsed: number, history: Snapshot[] }` der `Snapshot = { tiles, hand, movesUsed }`.
- `Command = Swap{a,b} | Rotate{from,to,dir} | Mirror{from,to} | InsertWild{at} | Remove{tileId} | Undo | Reset`.
- Hver kommando validerer mot `rules`, brett og hånd, og returnerer typet årsak ved avvisning: `notAllowed | locked | notAdjacent | segmentTooShort | segmentContainsLocked | handEmpty | minLength | maxLength | nothingToUndo`.
- `Undo` gjenoppretter siste snapshot atomisk. `Reset` legger nåværende tilstand i historikk og går til start-snapshot, og kan angres.
- Kommandoer og tilstand er rene verdier. Ingen Phaser-import i kjernen.

### Operasjoner
- `Swap`: bytt to brikker som er naboer i sekvensrekkefølge. Ingen av dem låst.
- `Rotate`: roter et sammenhengende segment på ≥ 2 brikker ett steg venstre eller høyre. Segmentet inneholder ingen låst brikke.
- `Mirror`: reverser et sammenhengende segment på ≥ 3 brikker uten låst brikke. Segment på 2 er identisk med swap og avvises.
- `InsertWild`: sett inn joker på posisjon 0..n. Krever `hand.wild > 0` og `n < maxLength`.
- `Remove`: fjern ulåst brikke. Krever `hand.remove > 0` og `n > minLength`.
- Hver lovlig kommando unntatt Undo/Reset øker `movesUsed` med 1.

### Palindrom-sjekk
- Sekvens er palindrom når `tiles[i]` matcher `tiles[n-1-i]` for alle i. Joker matcher alt.

### Løser
- BFS over søkenøkkel `key = symbolstreng med joker- og låsmarkør per posisjon + hand.wild + hand.remove`. Brikke-ID, historikk og `movesUsed` inngår ikke. Undo og Reset er ikke kanter.
- Kjører i web worker. Protokoll:
  - `solve({ requestId, rules, tiles, hand, maxMoves, limits: { states: number, ms?: number } }) -> { requestId, status: 'solved' | 'unreachableWithinBudget' | 'unknown', moves?: number }`.
  - `cancel({ requestId })` avbryter et pågående søk.
- `limits.states` er alltid satt. `limits.ms` brukes kun i klient under spilling, aldri der resultatet må være deterministisk (§ generator).
- UI sender `cancel` for forrige forespørsel når ny sendes, og forkaster svar med utdatert `requestId`. `unknown` vises aldri som blindgate.

### Generator og løsbarhet
- Brett genereres baklengs fra et palindrom via lovlige forgjengertilstander:
  - Forgjenger til Swap/Mirror er samme operasjon. Forgjenger til Rotate er rotasjon motsatt vei.
  - Forgjenger til `InsertWild` er å fjerne en joker fra målet. Forgjenger til `Remove` er å sette inn en vanlig brikke. Håndbeholdningen bygges opp tilsvarende, så spillerens hånd nøyaktig dekker løsningen.
  - Målpalindromets lengde pluss antall jokere i hånd er ≤ `maxLength`, og lengde minus antall fjern er ≥ `minLength`, så løsningen er alltid lovlig.
- Generatoren lagrer løsningssekvensen og validerer den ved å spille den gjennom `apply` med brettets `rules` og hånd. Brett som ikke validerer forkastes.
- Kvalitetsfiltre, alle deterministiske:
  - Startbrett som allerede er palindrom forkastes.
  - Løser med fast `limits.states` (ingen ms) beregner `mål`. `solved` med `moves` utenfor oppskriftens intervall `[minMoves, maxMoves]` forkastes. `unknown` godtas kun når løsningslengden ligger i intervallet; da er `mål` = løsningslengde.
  - Kampanje: brett med samme symbolstreng som et tidligere godtatt brett i samme verden forkastes, i fast nivårekkefølge.
  - Daily: brettet for dag N sammenlignes med brettene for tidligere dager i samme ISO-uke, som hver genereres deterministisk fra egen dato. Rekkefølgen er dermed fast og uavhengig av hva klienten har spilt.
  - Introduksjonsnivå for en operasjon: løser med `allowedOps` uten operasjonen og `maxMoves = mål` må gi `unreachableWithinBudget`, altså at mekanikken trengs for å nå mål og tre stjerner. Innen hele budsjettet er kravet ikke oppfyllbart, fordi swap alene når enhver permutasjon på korte brett innen mål + 4. Introduksjonsnivå for låser: løser må gi `solved` både med og uten låsene, og `moves` med låser må være strengt større enn uten. Gir noen av søkene `unknown`, forkastes kandidaten.
- Generatoren er deterministisk fra seed og `contentVersion`. Samme seed og versjon gir samme brett og samme `mål` på alle enheter.

### Mål, budsjett og stjerner
- `mål` = eksakt minimum fra løser når status er `solved`, ellers lengden på den validerte løsningen.
- Budsjett = mål + slakk, slakk ≥ 4 og satt av verdens oppskrift.
- Stjerner: 3 for `movesUsed ≤ mål`, 2 for `≤ mål + 2`, 1 for løst innen budsjett.
- Går spilleren tom for budsjett vises «ingen vei videre» med angre og reset. Ingen tap-skjerm i kampanjen.

### Kjernemodul
`src/core` er ren TypeScript: tiles, rules, commands, apply, palindrome, generator, solver, scoring, progression, storage. Alt testes med vitest.

## 2. Interaksjon og brett

### Layout (portrett)
- Topp: verden/nivå, stjerner, trekk brukt mot mål.
- Midten: brettet. Bunn: hånd (jokere, fjern) med antall, angre, reset. Hånden er en tydelig avgrenset slippsone.
- Brikkestørrelse: marg 8 px per side, gap 4 px. `tile = clamp((bredde − 16 − 4·(k−1)) / k, 44, 84)` der k er brikker per rad, maks 7. På 360 px bredde gir k = 7 brikker på 45 px. Minste touch-mål 44 px. Minste støttede bredde er 360 px; smalere skjermer skalerer hele brettet ned proporsjonalt med `Scale.FIT` innenfor brettområdet.
- Sekvens ≤ 6 brikker: én rad. Sekvens 7–14: **hårnål**. Første halvdel leses venstre mot høyre på øverste rad, andre halvdel høyre mot venstre på nederste rad, slik at par `i` og `n−1−i` står rett over hverandre. Speillinja er horisontal mellom radene. Midtbrikken ved oddetall står alene ytterst til høyre mellom radene. Folden er ytterst til høyre.
- Layout skifter mellom én rad og hårnål når lengden krysser 6 ved innsetting eller fjerning. Skiftet animeres med normal-varighet; input er låst under skiftet.
- Naboskap og segmenter følger alltid sekvensrekkefølgen. I hårnål er de to brikkene ytterst til høyre naboer over folden, og et segment kan krysse folden. Segmentet tegnes som en U rundt folden.

### Speillinje og par
- Speillinja tegnes alltid. Par som matcher lyser samtidig. Umatchede par vises med dempet kant.

### Gester, tilstandsmaskin
- `pointerdown` på ulåst brikke starter `pending`.
- Beveges > 12 px innen 250 ms: `drag`. Brikken følger fingeren. Slippsonen avgjør resultatet ved `pointerup`:
  - over en brikke som er sekvensnabo: `Swap`, uansett retning, også over folden.
  - over hånden når hånden har fjern og brikken kan fjernes: `Remove`.
  - alt annet: sprett tilbake, ingen kommando.
- Holdes ≥ 250 ms uten bevegelse: `segment` med startbrikken markert. Dra over brikker utvider segmentet med brikker som er sekvensnabo til segmentets ende, også over folden. Dra tilbake krymper det. Slipp viser tre knapper over segmentet: roter venstre, speil, roter høyre. Trykk utenfor avbryter. Speil-knappen er deaktivert ved segment på 2.
- Dra joker fra hånd inn i et mellomrom: `InsertWild`. Mellomrom fremheves under drag, inkludert mellomrommet over folden.
- Trykkalternativ uten drag: trykk brikke velger den. Trykk sekvensnabo: `Swap`. Trykk annen brikke: segment fra første til andre i sekvensrekkefølge, knappene vises. Trykk hånd-joker og så mellomrom: `InsertWild`. Trykk valgt brikke og så fjern i hånd: `Remove`.
- Avviste kommandoer viser årsaken kort ved brikken, for eksempel «låst».
- Angre ubegrenset, teller ikke trekk. Reset spør ikke, kan angres.

### Tastatur (desktop)
- Piler flytter markør i sekvensrekkefølge. Shift+piler utvider segment. Mellomrom velger brikke; deretter pil mot nabo utfører Swap. Med segment valgt: Q roter venstre, W speil, E roter høyre. Z angre, R reset, J joker inn før markør, X fjern ved markør.

### Introduksjoner
- Første nivå i hver verden har en kort interaktiv introduksjon som bare viser den nye gesten, ikke tekstsider.

### Tilbakemelding
- Hvert trekk: lyd, partikler, lett kamera-nudge. Løsning: speilbølge fra midten og ut, så stjerner. Alt respekterer «redusert bevegelse».

## 3. Progresjon og moduser

### Kampanje
- Seks verdener à 15 nivåer, 90 totalt. Nivå-ID er `w{verden}-{nr}`, for eksempel `w3-07`.
  1. Swap, lengde 4–6.
  2. Roter, lengde 5–7.
  3. Speil, lengde 6–8, hårnål introduseres.
  4. Låste brikker, lengde 7–10.
  5. Joker og fjern via hånd, lengde 7–10.
  6. Mestring: alt, lengde 10–14, slakk 4.
- Hver verden har en oppskrift: lengdeintervall, alfabetstørrelse, tillatte operasjoner, `[minMoves, maxMoves]`, slakk, hånd-innhold, andel låste.
- Kampanjebrett fryses: `scripts/build-campaign.ts` genererer alle 90 brett fra oppskrift og seed, beregner `mål` med løser, og skriver `src/content/campaign.v{N}.json`. Klienten leser JSON og kjører aldri generatoren for kampanjen. `contentVersion` bumpes når brett endres.
- 3–5 signaturnivåer per verden håndlages i samme JSON-format og valideres av samme skript.
- Opplåsing: neste nivå ved løst. Neste verden når 12 av 15 er løst. Stjerner er ikke en port.
- Fri spilling: knapp per verden, uendelige brett fra oppskriften generert i klient, uten stjerner. Løser med små `states`-grenser gir `mål` eller viser «mål ukjent».

### Daily
- Ett brett per UTC-dato. `puzzleId = daily-{YYYY-MM-DD}-v{contentVersion}`. Generert i klient med deterministiske filtre (§1), så alle med samme `contentVersion` får samme brett og samme `mål`.
- Et forsøk starter ved første trekk og bindes til `puzzleId`. Tid løper fra første trekk til løst, pauser ved skjult fane. Reset og angre teller ikke nytt forsøk. Gjenåpning av uløst forsøk fortsetter fra lagret tilstand. Etter løst kan spilleren starte nytt forsøk; forsøksnummer øker.
- Ingen budsjett. Første fullførte forsøk er delingsresultatet. Beste resultat lagres i tillegg, rangert på trekk, deretter tid.
- Deling: tekst med `puzzleId`, trekk mot mål, tid, forsøksnummer, emoji-rad. Streak lagres lokalt.

### Blitz
- Overlevelsesmodus. Start 45 s, tak 60 s. Løst brett gir `bonus = max(3, 6 − floor(løste / 5))` sekunder, pluss 3 s ved `movesUsed ≤ mål`. Hopp over koster 5 s.
- Brett fra verden 1–3 sine oppskrifter, lengde 4–7. En kø på 2 brett holdes ferdig generert med `mål` fra løser før de vises. Blir køen tom, fryses klokken til neste brett er klart.
- Poeng = løste brett. Rekord lagres lokalt.
- Klokken pauser ved skjult fane og under løst-animasjon. Løsning og tidsutløp i samme oppdatering: løsningen vinner.

### Lagring
- Én versjonert JSON i localStorage: `{ saveVersion, stars: { [levelId]: { stars, contentVersion } }, daily: { attempts[], streak }, blitz: { best }, settings }`.
- `settings = { sound, music, reducedMotion, colorBlind }`.
- Ved ny `contentVersion` beholdes stjerner og opplåsing. Stjerner fra eldre versjon vises med et lite merke, og kan forbedres på det nye brettet.
- Migrasjon fra gammel lagring: `soundEnabled`, `musicEnabled`, `colorBlindMode` tas med, `particlesEnabled` blir `reducedMotion` invertert. Resten forkastes.

### Fjernes
Versus, Cascade, Mechanical, achievements, badges, tokens, power-ups, skip. Koden parkeres på tag `v1-legacy` før omskrivingen.

## 4. Visuelt designsystem

- Én temafil `src/theme/theme.ts` er eneste kilde for farger, fonter, avstander, radier, animasjonstider. Ingen hex i scener.
- Palett: lys, mettet, varm. Kremhvit bakgrunn. Seks brikkefarger med høy innbyrdes kontrast. Én aksentfarge per verden: korall, solgul, turkis, lilla, lime, dyp blå.
- Brikker: farge og tegn er alltid begge synlige. Fargeblind-modus legger i tillegg form-mønster i bakgrunnen. Låst: hengelås og dempet. Joker: regnbuekant og stjerne.
- Font: Fredoka (overskrifter, brikker), Nunito (brødtekst), fra Google Fonts med Arial-fallback.
- Animasjonstokens: snapp 120 ms, normal 220 ms, rolig 400 ms, seremoni 800 ms. `reducedMotion` setter alle til snapp og slår av partikler, shake og flash.
- Effekter som beholdes: konfetti, speilbølge, stjernefall, kamera-nudge, flash. Resten slettes.
- Assets: bare refererte sprites pakkes. Kenney-kits fjernes fra repo. Brikker tegnes med Graphics hvis sprites ikke passer paletten.
- Lyd: chiptune-generator beholdes, én melodi per verden, dempet standardvolum.
- Mørkt tema utenfor scope, men tokens gjør det mulig senere.

## 5. Arkitektur og testing

### Struktur
```
src/core/        ren TS: tiles, rules, commands, apply, palindrome, generator, solver, scoring, progression, storage
src/content/     campaign.v{N}.json, signaturnivåer
src/game/        BoardScene, modes/{campaign,daily,blitz}, HUD, Hand, gestures, layout, effects
src/theme/       theme.ts
src/scenes/      Boot, Menu, WorldMap, Board, Result, Settings
scripts/         build-campaign.ts (generator + løser offline)
```

### BoardScene og modus
- Brettet vet ingenting om modus. Modusen leverer brett, budsjett-/klokkeregler og hva som skjer ved løsning. Ett brett, tre strategier.

### Tid
- Klokker via Phaser time-events. Pause ved `visibilitychange`.

### Skalering
- `Scale.RESIZE`, portrett-layout. Landskap på desktop får samme layout sentrert med maksbredde 480 px.

### Testing
- Vitest på `src/core`:
  - Håndverifiserte regeltilfeller for hver kommando og hver avvisningsårsak, inkludert `minLength`, `maxLength`, låst, joker, segment over «folden» på lengde 7 og 8.
  - Undo/Reset gjenoppretter brett, hånd og `movesUsed` for vilkårlige kommandosekvenser (property-test med fast-check).
  - Generator: alle brett har validert løsning, ingen startbrett er palindrom, lengdegrenser holdes gjennom løsningen, faste seeds gir faste brett og faste `mål` (snapshot).
  - Løser: kjente brett med håndregnet mål, `unknown` ved `states`-grense, determinisme uten `ms`, intro-kriterier for operasjoner og låser.
  - Progresjon: verdensporter ved 12 av 15, stjerner beholdes ved `contentVersion`-bump.
  - Lagringsmigrasjon fra dagens nøkler.
- Vitest på `src/game/gestures` og `src/game/layout` med simulerte pointer-hendelser: hver gest, konflikt drag mot hold, fold-swap, layoutskifte 6↔7, utdatert workersvar forkastes.
- Playwright ved 390×844: løs et hårnål-nivå med drag og trykk, angre midt i, sjekk stjerner.
- Én full mobilverden spilles gjennom manuelt før alle 90 nivåer produseres.

### Verktøy og CI
- Vite, TypeScript beholdes. ESLint til flat config. GitHub Actions kjører `npm test`, `npm run typecheck`, `npm run lint` før Vercel-deploy.

### Migrering
- Ny branch `redesign`. Tag `v1-legacy` på main først. Ny kjerne og BoardScene bygges parallelt, gamle scener slettes når kampanjen spiller ende til ende.

## Utenfor scope
Konto/sky-lagring, ledertavler, mørkt tema, lenkede brikker, Versus, Cascade, Mechanical, monetisering.
