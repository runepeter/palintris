# Palintris Game Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gjøre den eksisterende Palintris-loopen tydeligere, mer belønnende og mer fristende å spille videre.

**Architecture:** Rene feedbackberegninger i `src/game`; Phaser-scener presenterer dem uten å endre regler eller lagringsformat. Hver leveranse er spillbar og committes separat.

**Tech Stack:** TypeScript, Phaser 3, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-08-palintris-game-feel-design.md`

## Global Constraints

- Ingen nye brettregler. Kun `w1-01` kan endres i kampanjeinnholdet.
- Ingen nye runtime-avhengigheter, backend, push eller deploy.
- `reducedMotion` skal bevare informasjon uten kontinuerlig bevegelse.
- Mobil minst 360 × 640; desktop skal fortsatt fungere.
- Hver produksjonsendring starter med en test som feiler av forventet grunn.

---

### Task 0: Et første trekk som gir mening

**Files:**
- Modify: `src/content/__tests__/campaign.test.ts`
- Modify: `scripts/build-campaign.ts`
- Modify: `src/content/campaign.v1.json`
- Modify: `src/game/intro.ts`

- [ ] Skriv test som krever at `w1-01` har en synlig, instruert swap og løses på ett trekk.
- [ ] Kjør testen og bekreft forventet RED.
- [ ] Lag et håndlaget introduksjonsbrett uten å endre `w1-02`–`w6-15`.
- [ ] Oppdater introteksten til å peke på riktig brikke.
- [ ] Kjør innholds- og introtester.
- [ ] Commit: `fix: gjør første trekk tydelig og tilfredsstillende`.

---

### Task 1: Feedbackmodell og harmonimåler

**Files:**
- Create: `src/game/feedback.ts`
- Create: `src/game/__tests__/feedback.test.ts`
- Modify: `src/scenes/BoardScene.ts`
- Modify: `src/scenes/hookTypes.ts`

- [ ] Skriv tester for parprogresjon, nye matchende par, flyt-reset og prestasjonstekst.
- [ ] Kjør testen og bekreft forventet RED.
- [ ] Implementer de rene funksjonene.
- [ ] Vis harmonimåler i HUD og eksponer feedback i testhook.
- [ ] Legg til e2e-asserts for start og forbedrende trekk.
- [ ] Kjør målrettede og fulle tester.
- [ ] Commit: `feat: vis harmoni og flyt for hvert trekk`.

### Task 2: Juicy trekk og levende portal

**Files:**
- Modify: `src/scenes/TileView.ts`
- Modify: `src/scenes/effects.ts`
- Modify: `src/scenes/BoardScene.ts`
- Modify: `src/theme/theme.ts`

- [ ] Skriv/utvid test for identifikasjon av nye matchende par og reduced-motion-tilstand.
- [ ] Kjør testen og bekreft RED.
- [ ] Puls nye par, vis kort `Harmoni +N`/`Flyt ×N`, og legg til statisk/animert portalglød.
- [ ] Bekreft at undo/reset og første render ikke feirer.
- [ ] Visuell kontroll på mobil og redusert bevegelse.
- [ ] Kjør full verifisering.
- [ ] Commit: `feat: gi gode trekk mer magisk respons`.

### Task 3: Resultat som belønner mestring

**Files:**
- Modify: `src/game/feedback.ts`
- Modify: `src/game/__tests__/feedback.test.ts`
- Modify: `src/scenes/ResultScene.ts`
- Modify: `e2e/board.spec.ts`

- [ ] Skriv test for 1/2/3-stjernetittel og ny rekord.
- [ ] Kjør testen og bekreft RED.
- [ ] Bygg prestasjonskort, rekordmerke og tydelig hovedhandling.
- [ ] Verifiser daglig/fri/kampanje-varianter og liten høyde.
- [ ] Kjør full verifisering.
- [ ] Commit: `feat: gjør løsningsøyeblikket mer belønnende`.

### Task 4: Blitz med innsats og sluttspurt

**Files:**
- Modify: `src/scenes/BoardScene.ts`
- Modify: `src/scenes/effects.ts`
- Modify: `e2e/blitz.spec.ts`

- [ ] Vis eksisterende tidsbonus ved løsning og tidsstraff ved skip.
- [ ] Gi de siste ti sekundene tydelig, reduced-motion-trygg hast.
- [ ] Verifiser overgang mellom minst to Blitz-brett og timeout.
- [ ] Kjør målrettede tester og build.
- [ ] Commit: `feat: gjør hvert sekund i Blitz mer spennende`.

### Task 5: Meny som trekker spilleren tilbake

**Files:**
- Modify: `src/game/feedback.ts`
- Modify: `src/game/__tests__/feedback.test.ts`
- Modify: `src/scenes/MenuScene.ts`
- Modify: `e2e/exit.spec.ts`

- [ ] Skriv test for progresjonssammendrag fra stjernekart og Blitz-rekord.
- [ ] Kjør testen og bekreft RED.
- [ ] Vis stjerner, løste speil og rekord; endre CTA ved eksisterende progresjon.
- [ ] Visuell kontroll på mobil, kompakt landskap og desktop.
- [ ] Kjør alle verifiseringskommandoer og ekte smoke-test.
- [ ] Commit: `feat: vis reisen og rekordene på menyen`.

### Task 6: Sluttgjennomgang

**Files:** alle endrede filer.

- [ ] Inspiser commitrekken og arbeidsmappen; la `jalla.txt` urørt.
- [ ] Kjør alle verifiseringskommandoene fra specen ferskt.
- [ ] Spill kampanje, Daily og Blitz med ekte input.
- [ ] Gjør separat visuell review på 360 × 640, 390 × 844, 844 × 390 og desktop.
- [ ] Rett bare konkrete funn og verifiser på nytt.
- [ ] Commit eventuelle sluttjusteringer; ikke push.
