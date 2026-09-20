# Sticky-forsøk

Ferdig: tre spillbare prøvebrett fra menyen, synlig kobling, forhåndsvisning av begge bytter, korrekt Angre/Reset og løser. Signert commit etter review.

Utenfor: kampanjeprogresjon, Joker, fjerning, rotasjon, opplåsingsverktøy og genererte sticky-brett.

Verifisering: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run e2e -- --workers=1`. Visuell kontroll på mobil og desktop, også redusert bevegelse.

Godkjent design: sticky binder når den matcher speilpartneren. Paret beholder speilplassering og flyttes med to speilvendte nabobytter som ett trekk. Angre gjenoppretter tidligere koblinger. Avvis trekk som deler en kobling eller har overlappende bytter rundt en enkelt midtbrikke.

- [x] Kjerneregler og solver: valgfrie sticky/bondedTo-felt, felles planSwap for domene og forhåndsvisning, regresjoner for vanlig spilling.
- [x] Tre håndlagde brett: lær binding, flytt par, velg bindingstidspunkt. Verifiser løsninger og mål med virkelig løser.
- [x] Meny, prototypeprogresjon, merker og lenker, piler for begge bytter, forklarende avvisning og introer.
- [x] Spill gjennom, test, separat review. 331 enhetstester og 20 E2E grønne; type/lint/build godkjent. Bruker har prøvd og bekreftet funksjonen.

Oppfølging: bruker ønsker en mer bearbeidet lenke. Prøv en diskret gullkjede med metallringer som matcher juvelrammene.

Eksisterende main bruker én BoardScene med moduser og delt applyMove/solver. Ingen database eller migrasjon. Valgfrie tile-felt bevarer gamle brett; prøvemodusen lagrer ikke kampanjestjerner.
