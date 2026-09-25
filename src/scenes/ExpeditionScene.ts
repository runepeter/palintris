import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { EXPEDITION_ROOMS, RELICS, type RelicId, type RouteKind } from '../game/modes/expedition';
import { COLORS, EASING } from '../theme/theme';
import { makeBackdrop } from './art';
import { services } from './services';
import { makeButton, makeLabel, SCENE } from './ui';
import { screenHeight, screenWidth } from './viewport';

import type {} from './hookTypes';

const CHAPTERS = ['Den glemte hagen', 'Prismesalen', 'Speilets hjerte'];

export class ExpeditionScene extends Phaser.Scene {
  private buttons: { id: string; x: number; y: number }[] = [];
  private readonly onResize = (): void => this.build();

  constructor() { super(SCENE.expedition); }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
      if (import.meta.env.DEV) delete window.__expedition;
    });
  }

  private button(id: string, x: number, y: number, width: number, label: string, action: () => void, accent: number = COLORS.glow): void {
    this.buttons.push({ id, x, y });
    makeButton(this, { x, y, width, height: 48, label, labelSize: 16, accent, onClick: action }).setName(id);
  }

  private label(x: number, y: number, text: string, size = 14, color: number = COLORS.inkMuted, width = 340): Phaser.GameObjects.Text {
    const label = makeLabel(this, x, y, text, { size, color, font: 'body' });
    label.setWordWrapWidth(width, true).setLineSpacing(4);
    return label;
  }

  private build(): void {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.buttons = [];
    const mode = services(this).modes.expedition;
    const state = mode.state;
    const phase = state?.phase ?? 'entrance';
    const extraMove = state?.relics.includes('extraMove') === true ? 1 : 0;
    const w = screenWidth(this);
    const h = screenHeight(this);
    const landscape = w > h * 1.3 && h < 600;
    const cx = w / 2;
    const panelW = Math.min(landscape ? 440 : 430, landscape ? w * 0.47 : w - 40);
    const leftX = landscape ? w * 0.26 : cx;
    const actionX = landscape ? w * 0.74 : cx;
    const short = h < 720;
    makeBackdrop(this, 'quiet', landscape ? Math.min(w - 24, 1040) : 500);
    this.button('menu', landscape ? 62 : cx - panelW / 2 + 37, 42, 74, '← Meny', () => this.scene.start(SCENE.menu), COLORS.line);
    this.label(landscape ? leftX + 20 : cx + 40, 42, 'NI ROM · ÉN EKSPEDISJON', 10, COLORS.star, panelW - 90).setLetterSpacing(1.7);
    makeLabel(this, leftX, landscape ? 95 : 92, 'SPEILEKSPEDISJONEN', { size: Math.min(25, panelW / 16), bold: true, color: COLORS.ink }).setLetterSpacing(1);
    const finished = phase === 'won' || phase === 'lost';
    if (state !== null) {
      this.label(leftX, landscape ? 125 : 126, `${'♥'.repeat(state.lives)}${'♡'.repeat(3 - state.lives)}   ·   ${state.score} poeng   ·   Flyt ${state.streak}`, 14, COLORS.star, panelW);
    } else {
      this.label(leftX, 126, 'Velg vei. Finn relikvier. Bryt speilets forbannelse.', 13, COLORS.inkMuted, panelW);
    }
    this.drawMap(leftX, landscape ? 181 : short ? 190 : 214, panelW, state?.floor ?? 1, phase === 'won');
    const chapter = Math.min(2, Math.floor(((state?.floor ?? 1) - 1) / 3));
    this.label(leftX, landscape ? 231 : short ? 239 : 268, finished ? (phase === 'won' ? 'ALLE TRE VOKTERE ER BESEIRET' : 'EN NY VEI VENTER') : CHAPTERS[chapter] ?? '', 11, COLORS.glow, panelW).setLetterSpacing(1.8);

    const areaTop = landscape ? 62 : short ? 278 : 319;
    const areaBottom = landscape ? h - 30 : h - 105;
    const areaHeight = areaBottom - areaTop;
    if (phase === 'entrance') {
      this.drawSigil(actionX, areaTop + areaHeight * 0.17, short || landscape ? 27 : 38, COLORS.glow);
      this.label(actionX, areaTop + areaHeight * 0.4, 'Hvor langt tør du gå?', 22, COLORS.ink, panelW);
      this.label(actionX, areaTop + areaHeight * 0.59, 'Gjør rekken lik fra begge ender.\n3 liv. Ingen klokke. Hvert trekk er bindende.', 14, COLORS.inkMuted, panelW - 8);
      this.button('start', actionX, areaBottom - 22, panelW - 12, 'Åpne portalen  →', () => { mode.start(crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()); audio.playSuccess(); this.build(); }, COLORS.star);
    } else if (phase === 'route' && state !== null) {
      this.resultLine(actionX, areaTop - 6, panelW);
      if (state.floor % 3 === 0) {
        this.drawSigil(actionX, areaTop + areaHeight * 0.25, 33, COLORS.danger);
        this.label(actionX, areaTop + areaHeight * 0.51, `VOKTER ${state.floor / 3} / 3`, 22, COLORS.ink, panelW);
        this.label(actionX, areaTop + areaHeight * 0.68, `Et større speil. En større belønning.\nMål +${2 + extraMove} trekk · 300 grunnpoeng`, 14, COLORS.inkMuted, panelW);
        this.button('guardian', actionX, areaBottom - 21, panelW - 12, 'Møt vokteren  →', () => this.enter('guardian'), COLORS.danger);
      } else {
        this.label(actionX, areaTop + 19, `Rom ${state.floor} · Velg din vei`, 20, COLORS.ink, panelW);
        const cardH = Math.min(115, (areaHeight - 49) / 2);
        this.routeCard(actionX, areaTop + 49 + cardH / 2, panelW, cardH, 'safe', 'Den lune stien', `Mål +${3 + extraMove} trekk · 100 grunnpoeng`, COLORS.glow);
        this.routeCard(actionX, areaTop + 57 + cardH * 1.5, panelW, cardH, 'risk', 'Bruddlinjen', `Mål +${1 + extraMove} trekk · 180 grunnpoeng`, COLORS.danger);
      }
    } else if (phase === 'board' && state !== null) {
      this.drawSigil(actionX, areaTop + areaHeight * 0.2, 32, COLORS.glow);
      this.label(actionX, areaTop + areaHeight * 0.43, `Rom ${state.floor} venter på deg`, 22, COLORS.ink, panelW);
      this.label(actionX, areaTop + areaHeight * 0.63, `${state.commands.length} trekk er bevart.\nDu fortsetter akkurat der du slapp.`, 14, COLORS.inkMuted, panelW);
      this.button('resume', actionX, areaBottom - 22, panelW - 12, 'Fortsett ekspedisjonen  →', () => this.scene.start(SCENE.board, { mode: 'expedition' }), COLORS.star);
    } else if (phase === 'reward') {
      this.resultLine(actionX, areaTop - 6, panelW);
      this.label(actionX, areaTop + 20, 'Velg et relikvie', 22, COLORS.ink, panelW);
      const offers = mode.offers();
      const cardH = Math.min(96, (areaHeight - 42) / 3);
      offers.forEach((id, i) => this.relicCard(actionX, areaTop + 44 + cardH * (i + 0.5), panelW, cardH - 7, id));
    } else if (finished && state !== null) {
      this.drawSigil(actionX, areaTop + areaHeight * 0.16, 34, phase === 'won' ? COLORS.star : COLORS.inkMuted);
      this.label(actionX, areaTop + areaHeight * 0.38, phase === 'won' ? 'Speilet er helt igjen.' : 'Portalen lukker seg.', 23, COLORS.ink, panelW);
      this.label(actionX, areaTop + areaHeight * 0.56, `${state.score} poeng · ${phase === 'won' ? 9 : state.floor - 1}/9 rom\nRekord ${mode.records.bestScore} · ${mode.records.wins} seire`, 16, COLORS.star, panelW);
      this.label(actionX, areaTop + areaHeight * 0.75, phase === 'won' ? 'En ny reise. Nye relikvier. En høyere rekord.' : 'Prøv en tryggere vei eller bygg andre relikvier.', 12, COLORS.inkMuted, panelW);
      this.button('restart', actionX, areaBottom - 20, panelW - 12, 'En ny ekspedisjon  →', () => { mode.start(crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()); this.build(); }, COLORS.star);
    }

    const relicX = landscape ? leftX : cx;
    const relicY = landscape ? h - 83 : h - 67;
    const relicText = state === null || state.relics.length === 0 ? 'Relikvier venter etter rom 2, 4, 6 og 8.' : state.relics.map((id) => `${RELICS[id].glyph} ${RELICS[id].name}`).join('  ·  ');
    this.label(relicX, relicY, relicText, 12, COLORS.glow, panelW - 4);
    this.label(relicX, landscape ? h - 35 : h - 29, 'Meny og omlasting bevarer reisen i denne nettleseren.', 10, COLORS.inkMuted, panelW);
    if (import.meta.env.DEV) window.__expedition = { phase, buttons: this.buttons };
  }

  private resultLine(x: number, y: number, width: number): void {
    const result = services(this).modes.expedition.state?.lastResult;
    if (result === null || result === undefined) return;
    this.label(x, y, result.kind === 'failed' ? 'Ett liv tapt. Velg veien videre.' : `${result.perfect ? 'PERFEKT SPEIL' : 'SPEILET ER LØST'}  +${result.points}`, 11, result.kind === 'failed' ? COLORS.danger : COLORS.star, width);
  }

  private enter(route: RouteKind): void {
    if (services(this).modes.expedition.chooseRoute(route)) this.scene.start(SCENE.board, { mode: 'expedition' });
  }

  private routeCard(x: number, y: number, width: number, height: number, route: RouteKind, title: string, detail: string, accent: number): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 0.94).fillRoundedRect(x - width / 2, y - height / 2, width, height, 12);
    g.lineStyle(1, accent, 0.5).strokeRoundedRect(x - width / 2, y - height / 2, width, height, 12);
    const dense = height < 100;
    this.label(x, y - height / 2 + 17, title, dense ? 16 : 19, accent, width - 12);
    this.label(x, y - height / 2 + 36, detail, 12, COLORS.inkMuted, width - 12);
    this.button(route, x, y + height / 2 - 27, width - 18, route === 'safe' ? 'Ta den lune stien  →' : 'Våg bruddlinjen  →', () => this.enter(route), accent);
  }

  private relicCard(x: number, y: number, width: number, height: number, id: RelicId): void {
    const relic = RELICS[id];
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 0.98).fillRoundedRect(x - width / 2, y - height / 2, width, height, 12);
    g.lineStyle(1, COLORS.glow, 0.48).strokeRoundedRect(x - width / 2, y - height / 2, width, height, 12);
    this.label(x - width / 2 + 27, y, relic.glyph, 25, COLORS.star, 45);
    this.label(x + 15, y - height * 0.22, relic.name, 16, COLORS.ink, width - 80);
    this.label(x + 15, y + height * 0.19, relic.description, height < 76 ? 11 : 12, COLORS.inkMuted, width - 80);
    const zone = this.add.zone(x, y, width, Math.max(44, height)).setInteractive({ useHandCursor: true }).setName(`relic-${id}`);
    let armed = false;
    zone.on('pointerdown', () => { armed = true; });
    zone.on('pointerout', () => { armed = false; });
    zone.on('pointerup', () => {
      if (!armed) return;
      armed = false;
      if (services(this).modes.expedition.claimRelic(id)) { audio.playAchievement(); this.build(); }
    });
    this.buttons.push({ id: `relic-${id}`, x, y });
  }

  private drawMap(x: number, y: number, width: number, floor: number, won: boolean): void {
    const pitch = (width - 32) / (EXPEDITION_ROOMS - 1);
    const start = x - (width - 32) / 2;
    const g = this.add.graphics();
    for (let i = 0; i < EXPEDITION_ROOMS; i++) {
      const px = start + i * pitch;
      const py = y + (i % 3 === 1 ? -15 : i % 3 === 2 ? 0 : 12);
      const complete = i + 1 < floor || won;
      const active = i + 1 === floor && !won;
      const guardian = (i + 1) % 3 === 0;
      const accent = complete ? COLORS.glow : active ? COLORS.star : COLORS.line;
      if (i > 0) {
        const prevY = y + ((i - 1) % 3 === 1 ? -15 : (i - 1) % 3 === 2 ? 0 : 12);
        g.lineStyle(complete || active ? 2 : 1, complete || active ? COLORS.glow : COLORS.line, 0.65);
        g.lineBetween(px - pitch, prevY, px, py);
      }
      g.fillStyle(COLORS.panel, 1).fillCircle(px, py, guardian ? 15 : 12);
      g.lineStyle(active ? 2 : 1, accent, 1).strokeCircle(px, py, guardian ? 15 : 12);
      if (active) { g.lineStyle(1, accent, 0.3).strokeCircle(px, py, 19); }
      this.label(px, py, complete ? '✓' : guardian ? '◆' : String(i + 1), 12, accent, 26);
    }
  }

  private drawSigil(x: number, y: number, radius: number, accent: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, accent, 0.25).strokeCircle(0, 0, radius + 9);
    g.lineStyle(2, accent, 0.8).strokeCircle(0, 0, radius);
    g.lineStyle(1, accent, 0.5);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      g.lineBetween(Math.cos(a) * radius, Math.sin(a) * radius, Math.cos(a + 2 * Math.PI / 3) * radius, Math.sin(a + 2 * Math.PI / 3) * radius);
    }
    g.fillStyle(accent, 0.85).fillCircle(0, 0, 4);
    g.setPosition(x, y);
    if (!services(this).settings().reducedMotion) this.tweens.add({ targets: g, angle: 60, duration: 10000, repeat: -1, ease: EASING.fade, yoyo: true });
  }
}
