# Lokal spillende sidecar

Sidecaren lar en lokal språkmodell spille Palintris og foreslå en bedre strategi. En runde gir erfaringsspill, en kandidat, paret evaluering og en separat sluttprøve. Bare målt gevinst på utviklingsbrett kan erstatte strategien. Spillregler, modellvekter og produktkode endres ikke.

Krever Node 20+, prosjektets `npm ci`, og Ollama som allerede serverer `gemma4:e4b-mlx`. Ingen API-nøkkel, Python, Firebase eller Claude er nødvendig. Bare lokale HTTP-endepunkter godtas; videresendinger avvises. Modellens digest kontrolleres før hvert modellkall.

```sh
npm run sidecar -- --output sidecar-runs/smoke --smoke --timeout-ms 180000
npm run sidecar -- --output sidecar-runs/round-1 --minutes 20 --max-calls 40 --timeout-ms 180000
```

Standardsettet har åtte kuraterte brett: to trening, tre utvikling og tre holdout. Swap, rotate, mirror, wildcard, remove og låste brikker er representert. Hvert brett har to trekk i budsjett. Full runde kjører 14 spill og ett strategiforslag, maksimalt 29 modellkall før eventuell feil. Smoke spiller bare første treningsbrett. Sticky dekkes av motoradapterens tester, ikke standardutvalget. Modellen får synlig tilstand, egne tidligere trekk og lovlige valg; løsningsspor og BFS-fasit er skjult.

CLI-valg: `--model`, `--base-url`, `--timeout-ms` (standard 60000), `--minutes` (maks 60), `--max-calls`, `--manifest`, `--from`, `--smoke`. Se `npm run sidecar -- --help`.

## Resultater og stopp

Runmappen inneholder `report.md`, `config.json`, `state.json`, `games/*.json` og `events.jsonl`. JSON-checkpoints har sjekksum; config/state knytter kjøringen til kode, modell, datasett og grenser. Hendelsesloggen bevarer også beslutninger fra avbrutte spill. Modellsvar som feiler, er ulovlige eller kommer etter stopp blir aldri erstattet av en reserveagent eller bokført som fullførte tap.

```sh
touch sidecar-runs/round-1/STOP
```

SIGINT/SIGTERM stopper også. Pågående HTTP-kall avbrytes ved stopp/fristen. En eksklusiv `session.lock` hindrer parallelle skrivere. Ved prosesskrasj: sjekk at PID-en i låsfilen er avsluttet før du fjerner filen manuelt.

Gjenoppta med nøyaktig samme kommando etter at en eventuell STOP-fil er fjernet. Fullførte spill gjenbrukes; et avbrutt spill begynner på nytt. Forbrukte modellkall og den opprinnelige fristen beholdes. Endret kode, modell-digest eller konfig krever ny runmappe. Frist/kallgrense er stoppstatus (exit 2), modellfeil er feil (exit 1), fullført er exit 0. En utløpt kjøring kan derfor ikke gis ubegrenset budsjett ved restart.

## Ny forbedringsrunde

`--from` overfører beholdt strategi fra en fullført kjøring. Den krever et nytt manifest og avviser tidligere brett fra alle train/dev/holdout-sett i kjedens forhistorie. IDs og innholdshasher valideres. Holdoutresultater sendes aldri til strategiforslaget.

```sh
npm run sidecar -- --output sidecar-runs/round-2 \
  --from sidecar-runs/round-1 --manifest /absolutt/sti/nye-brett.json
```

Manifestet er en JSON-liste med disse feltene per brett:

```json
[
  {
    "id": "train-example",
    "split": "train",
    "tiles": [
      { "id": 0, "symbol": "A", "locked": false, "wild": false },
      { "id": 1, "symbol": "A", "locked": false, "wild": false },
      { "id": 2, "symbol": "B", "locked": false, "wild": false }
    ],
    "hand": { "wild": 0, "remove": 0 },
    "ops": ["swap"],
    "budget": 2
  }
]
```

Eksemplet viser bare formatet og tilsvarer et standardtreningsbrett; det kan ikke brukes som nytt brett i neste runde. En full runde krever alle tre splitter. ID er en trygg slug; budsjett er 1–10. Alle brett må være uløste og BFS-verifisert løsbare innen budsjett. Bruk reelt nye posisjoner; omdøping av symboler eller svært like oppgaver gir ikke uavhengig evidens selv om de har ulike hasher.

## Tolkning

Reward per brett er 0 ved manglende løsning, ellers `1 + 0.1 / antall trekk`. Kandidaten må ha strengt høyere gjennomsnitt og minst like mange løsninger. Likhet beholder incumbent. Rapporten viser også BFS-minimum, stjerner og trekk. Holdout sammenligner initial og beholdt strategi uten å endre valget.

Dette er et lite gjennomførbarhetsforsøk. Resultater viser modellens atferd på disse brettene, ikke dokumentert generell læring, menneskelig vanskelighetsgrad eller visuell kvalitet. UI og geststyring verifiseres fremdeles med browsertester. En fullført runde uten bedre strategi er et gyldig resultat. For større studier trengs flere ulike oppgaver og forhåndsdefinerte statistiske kriterier.

```sh
npm test -- scripts/sidecar
npm run typecheck
npm run lint
npm run build
```

## Verifisert lokalt 26. september 2026

`gemma4:e4b-mlx`, digest `5a08735df03c348ab10d56e8ad758098ff1960ab6030605c95fde7d90fc9de18`:

- Første smoke traff 60-sekundersgrensen: ett forsøkt kall, ingen fullførte spill.
- Ny smoke med 180 sekunder løste brettet på to trekk mot BFS-minimum ett. Første respons tok 166,53 sekunder, neste 0,31. Dette fastslår ikke hvorfor første respons var treg.
- Én full runde: 14 spill, 19 modellkall. Dev: begge strategier løste 1 av 3 brett; reward 0,3667 for begge. Kandidaten ble ikke beholdt. Holdout: initial og beholdt strategi løste begge 1 av 3. Ingen forbedring påvist.
- Trekkresponsene i fullrunden tok 0,10–0,60 sekunder. Gjenopptakelse med samme kommando ga fortsatt 19 kall og 14 spill.

Full sporbarhet ligger lokalt i `sidecar-runs/2026-09-26-round-1/report.md` og tilhørende checkpoints. Runfiler er ignorert av Git. Dette var en liten gjennomførbarhetsprøve, ikke et estimat på generell spilleevne.
