import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { matches } from '../core/palindrome';
import { makeTile, WILD_SYMBOL } from '../core/tiles';
import type { GestureState, HintReason, Intent, Target } from '../game/gestures';
import { GestureMachine } from '../game/gestures';
import { intentToCommand } from '../game/intents';
import type { KeyCode } from '../game/keyboard';
import { KeyboardController } from '../game/keyboard';
import type { BoardLayout, LayoutKind } from '../game/layout';
import { computeLayout, hitGap, hitTile } from '../game/layout';
import type { ModeLevel } from '../game/modes/types';
import type { SessionReject, SessionView } from '../game/session';
import { BoardSession } from '../game/session';
import { COLORS, durations, EASING, RADIUS, SPACE, worldAccent } from '../theme/theme';
import { Effects } from './effects';
import { SegmentMenu } from './SegmentMenu';
import { services } from './services';
import { installHook, removeHook } from './testHook';
import { TileView } from './TileView';
import { contentLeft, contentWidth, makeButton, makeLabel, SCENE } from './ui';

interface BoardData {
  readonly levelId: string;
}

const HUD_HEIGHT = 96;
const HAND_HEIGHT = 120;
const HUD_STRIPE = 4;
const ZONE_HEIGHT = 56;
const DASH = 8;
/** Øvre grense for treffradien rundt hånd-sonene og angre/reset. Se near(). */
const ZONE_HIT = 48;
const BANNER_W = 360;
const BANNER_H = 96;

/** Brikken bak joker-spøkelset. Ligger utenfor brettet, så id-en treffer aldri this.tiles. */
const GHOST_TILE = makeTile(-1, WILD_SYMBOL, { wild: true });

const KEY_MAP: Readonly<Record<string, KeyCode>> = {
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  Space: 'Space',
  KeyQ: 'KeyQ',
  KeyW: 'KeyW',
  KeyE: 'KeyE',
  KeyZ: 'KeyZ',
  KeyR: 'KeyR',
  KeyJ: 'KeyJ',
  KeyX: 'KeyX',
  Escape: 'Escape',
};

const HINT_TEXT: Readonly<Record<HintReason | SessionReject, string>> = {
  locked: 'Låst brikke',
  segmentContainsLocked: 'Segmentet inneholder låst brikke',
  segmentTooShort: 'Segment må ha minst 3',
  handEmpty: 'Hånden er tom',
  notAdjacent: 'Ikke naboer',
  notAllowed: 'Ikke tillatt her',
  minLength: 'Rekka kan ikke bli kortere',
  maxLength: 'Rekka kan ikke bli lengre',
  nothingToUndo: 'Ingenting å angre',
  outOfRange: 'Ugyldig',
  disposed: 'Ugyldig',
};

/** Stiplet ramme rundt hånd-sonene; Graphics har ingen innebygd stiplet strek. */
const dashedRect = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void => {
  const line = (x1: number, y1: number, x2: number, y2: number): void => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.round(len / (DASH * 2)));
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = t0 + 0.5 / steps;
      g.lineBetween(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
    }
  };
  line(x, y, x + w, y);
  line(x + w, y, x + w, y + h);
  line(x + w, y + h, x, y + h);
  line(x, y + h, x, y);
};

export class BoardScene2 extends Phaser.Scene {
  private levelId = '';
  private level!: ModeLevel;
  private session!: BoardSession;
  private machine!: GestureMachine;
  private keyboard!: KeyboardController;
  private effects!: Effects;
  private layout!: BoardLayout;
  private originX = 0;
  private originY = 0;
  private tiles = new Map<number, TileView>();
  private mirrorGfx!: Phaser.GameObjects.Graphics;
  private gapGfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Container;
  private hand!: Phaser.GameObjects.Container;
  private menu!: SegmentMenu;
  private banner: Phaser.GameObjects.Container | null = null;
  private hint: Phaser.GameObjects.Text | null = null;
  private wildGhost: TileView | null = null;
  private armedRing: Phaser.GameObjects.Graphics | null = null;
  /** Brikka som dras; snap-back trenger id, siden indeksene flytter seg under et trekk. */
  private dragId: number | null = null;
  private lastState: GestureState | null = null;
  private keyboardActive = false;
  private solvedFired = false;
  private inputLocked = false;
  private pendingTweens = 0;
  private lastKind: LayoutKind | null = null;
  private lastSize: { w: number; h: number } | null = null;
  private hudCache: { movesUsed: number; budgetLeft: number } | null = null;
  private handCache: { wild: number; remove: number; canUndo: boolean } | null = null;
  private view!: SessionView;
  private d = durations(false);

  /** Fast referanse, så teardown kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => {
    for (const v of this.tiles.values()) {
      this.tweens.killTweensOf(v);
      v.setScale(1);
    }
    this.pendingTweens = 0;
    this.render(false);
    // Banner og meny er plassert mot den gamle bredden og må settes på nytt.
    if (this.banner !== null) {
      this.hideBanner();
      this.showDeadEnd();
    }
    this.syncGestureVisuals();
  };

  constructor() {
    super(SCENE.board);
  }

  /** Phaser gjenbruker sceneinstansen, så feltene må nullstilles her og ikke bare i initialiseringen. */
  init(data: BoardData): void {
    this.levelId = data.levelId;
    this.tiles = new Map();
    this.pendingTweens = 0;
    this.inputLocked = false;
    this.lastKind = null;
    this.lastSize = null;
    this.hudCache = null;
    this.handCache = null;
    this.banner = null;
    this.hint = null;
    this.wildGhost = null;
    this.armedRing = null;
    this.dragId = null;
    this.lastState = null;
    this.keyboardActive = false;
    this.solvedFired = false;
    this.zoneCache = { wild: { x: 0, y: 0 }, remove: { x: 0, y: 0 }, undo: { x: 0, y: 0 }, reset: { x: 0, y: 0 } };
  }

  create(): void {
    const s = services(this);
    const level = s.mode.load(this.levelId);
    if (level === null) {
      this.scene.start(SCENE.menu);
      return;
    }
    this.level = level;
    this.d = durations(s.settings().reducedMotion);
    this.effects = new Effects(this, s.settings().reducedMotion);
    this.session = new BoardSession({
      rules: level.rules,
      tiles: level.tiles,
      hand: level.hand,
      target: level.target,
      budget: level.budget,
      solver: s.solver,
      onChange: (v) => this.onViewChange(v),
    });
    this.view = this.session.view();
    const env = {
      count: () => this.view.tiles.length,
      isLocked: (i: number) => this.view.tiles[i]?.locked === true,
      hasWild: () => this.view.hand.wild > 0,
      canRemove: () => this.view.hand.remove > 0,
    };
    this.machine = new GestureMachine(env);
    this.keyboard = new KeyboardController(env);
    this.mirrorGfx = this.add.graphics().setDepth(1);
    this.gapGfx = this.add.graphics().setDepth(4);
    this.hud = this.add.container(0, 0).setDepth(10);
    this.hand = this.add.container(0, 0).setDepth(10);
    this.menu = new SegmentMenu(this, worldAccent(level.world), HUD_HEIGHT);
    this.render(false);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    installHook(this.makeHook());
    this.setupInput();
  }

  override update(time: number): void {
    this.machine.tick(time);
    // tick() er stille, så hold-overgangen fanges bare ved å sammenligne tilstanden.
    if (this.machine.state !== this.lastState) this.syncGestureVisuals();
    if (this.inputLocked && this.pendingTweens === 0) this.inputLocked = false;
  }

  /** Klemmes mot 0: en resize nullstiller telleren, men utfasing-tweens utenfor this.tiles lever videre. */
  private tweenDone(): void {
    this.pendingTweens = Math.max(0, this.pendingTweens - 1);
  }

  private teardown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    removeHook();
    this.session.dispose();
  }

  private setupInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.pointer('down', p));
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.pointer('move', p));
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => this.pointer('up', p));
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.cancelPointer());
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.key(e));
  }

  /**
   * Sonene ligger på rad med pitch contentWidth/4. Radien må holde seg under halve pitchen,
   * ellers overlapper nabosirklene på smale skjermer og Joker vinner på rekkefølge alene.
   * Treffet begrenses også til hånd-stripa, så sirklene aldri skygger for brettet.
   */
  private near(z: { x: number; y: number }, x: number, y: number): boolean {
    if (y < this.scale.height - HAND_HEIGHT) return false;
    const r = Math.min(ZONE_HIT, contentWidth(this) / 8 - 2);
    return Math.hypot(x - z.x, y - z.y) <= r;
  }

  /** Blindveien slipper bare angre og reset gjennom; de knappene er egne interaktive objekter. */
  private blockedByBanner(x: number, y: number): boolean {
    if (this.banner === null) return false;
    return !this.near(this.zoneCache.undo, x, y) && !this.near(this.zoneCache.reset, x, y);
  }

  private pointer(type: 'down' | 'move' | 'up', p: Phaser.Input.Pointer): void {
    const handOff = this.keyboardActive;
    this.keyboardActive = false;
    // Pekeren tar over markeringen fra tastaturet, ellers blir tastaturets valg stående usynlig
    // og gir et byttepar ingen ser. Motstykket er machine.reset() i key().
    if (type === 'down') this.keyboard.state = { ...this.keyboard.state, selected: null, segment: null };
    // Et nytt grep mens brikker fortsatt flyr ville tatt tak i en brikke som ikke er framme ennå.
    const busy = this.inputLocked || (type === 'down' && this.pendingTweens > 0);
    if (busy || this.view.solved || this.blockedByBanner(p.x, p.y)) {
      if (handOff) this.syncGestureVisuals();
      return;
    }
    const target = this.resolveTarget(p.x, p.y);
    this.applyIntents(this.machine.handle({ type, x: p.x, y: p.y, t: this.time.now, target }));
    this.syncGestureVisuals();
  }

  private cancelPointer(): void {
    this.machine.handle({ type: 'cancel', x: 0, y: 0, t: this.time.now, target: { kind: 'none' } });
    this.syncGestureVisuals();
  }

  /** Tilstandene der et gap er det eneste meningsfulle målet på brettet. */
  private wildActive(): boolean {
    const name = this.machine.state.name;
    return name === 'dragWild' || name === 'wildArmed';
  }

  private resolveTarget(x: number, y: number): Target {
    const action = this.menu.hitAction(x, y);
    if (action !== null) return { kind: 'menu', action };
    if (this.near(this.zoneCache.wild, x, y)) return { kind: 'hand', item: 'wild' };
    if (this.near(this.zoneCache.remove, x, y)) return { kind: 'hand', item: 'remove' };
    const lx = (x - this.originX) / this.layout.scale;
    const ly = (y - this.originY) / this.layout.scale;
    // Brikketreff er ubrukt under joker-drag, og mellomrommene mellom to brikker er bare GAP
    // brede. Testes gapet først, blir hele hitGap-radien slippsone i stedet.
    if (this.wildActive()) {
      const at = hitGap(this.layout, lx, ly);
      if (at !== null) return { kind: 'gap', at };
    }
    const index = hitTile(this.layout, lx, ly);
    if (index !== null) return { kind: 'tile', index };
    return { kind: 'none' };
  }

  private applyIntents(intents: readonly Intent[]): void {
    for (const intent of intents) {
      if (intent.type === 'hint') {
        this.showHint(intent.reason);
        audio.playError();
        continue;
      }
      if (intent.type === 'segment') this.menu.hide();
      const cmd = intentToCommand(intent, this.view.tiles);
      if (cmd === null) continue;
      const r = this.session.dispatch(cmd);
      if (!r.ok) {
        this.showHint(r.reason);
        audio.playError();
        continue;
      }
      if (intent.type === 'swap') audio.playSwap();
      else if (intent.type !== 'segment') audio.playSelect();
      else if (intent.action === 'mirror') audio.playMirror();
      else audio.playRotate();
      this.effects.nudge();
    }
  }

  /** Indeksspennet som skal markeres: fra gestmaskinen, ellers fra tastaturets eget segment. */
  private segmentSpan(): { from: number; to: number } | null {
    const s = this.machine.state;
    if (s.name === 'segment') return { from: Math.min(s.anchor, s.end), to: Math.max(s.anchor, s.end) };
    if (s.name === 'menu') return { from: s.from, to: s.to };
    if (!this.keyboardActive) return null;
    const seg = this.keyboard.state.segment;
    return seg === null ? null : { from: Math.min(seg.anchor, seg.end), to: Math.max(seg.anchor, seg.end) };
  }

  private syncGestureVisuals(): void {
    const s = this.machine.state;
    this.lastState = s;
    const kb = this.keyboardActive ? this.keyboard.state : null;
    const selected = s.name === 'selected' ? s.index : (kb?.selected ?? null);
    const span = this.segmentSpan();
    const dragIndex = s.name === 'dragTile' ? s.index : null;

    // Kalles på hver pekerbevegelse, så uendrede brikker skal slippe en full opptegning.
    this.view.tiles.forEach((tile, i) => {
      const v = this.tiles.get(tile.id);
      if (v === undefined) return;
      const next = {
        selected: i === selected,
        segment: span !== null && i >= span.from && i <= span.to,
        ghost: i === dragIndex,
        cursor: kb !== null && i === kb.cursor,
      };
      const f = v.flags;
      if (f.selected !== next.selected || f.segment !== next.segment || f.ghost !== next.ghost || f.cursor !== next.cursor) {
        v.setFlags(next);
      }
    });

    this.syncDrag(s);
    this.syncWildGhost(s);
    this.drawGaps(s);
    this.armedRing?.setVisible(s.name === 'wildArmed');
    if (s.name === 'menu') {
      const p = this.segmentAnchor(s.from, s.to);
      this.menu.show(p.x, p.y, s.to - s.from + 1 >= 3);
    } else {
      this.menu.hide();
    }
  }

  private syncDrag(s: GestureState): void {
    if (s.name === 'dragTile') {
      const tile = this.view.tiles[s.index];
      if (tile === undefined) return;
      const v = this.tiles.get(tile.id);
      if (v === undefined) return;
      if (this.dragId !== tile.id) {
        // Overtakelsen må rydde opp etter seg: killTweensOf kaller ikke onComplete,
        // så telleren teller vi ned selv, ellers står busy() fast på true.
        const killed = this.tweens.getTweensOf(v).length;
        this.tweens.killTweensOf(v);
        for (let i = 0; i < killed; i++) this.tweenDone();
        v.setScale(1);
        this.dragId = tile.id;
      }
      v.setDepth(15);
      v.setPosition(s.x, s.y);
      return;
    }
    if (this.dragId === null) return;
    const v = this.tiles.get(this.dragId);
    const i = this.view.tiles.findIndex((t) => t.id === this.dragId);
    this.dragId = null;
    if (v === undefined) return;
    v.setDepth(5);
    const slot = i < 0 ? undefined : this.layout.slots[i];
    if (slot === undefined) return;
    const p = this.screenPoint(slot.x, slot.y);
    this.pendingTweens++;
    this.tweens.add({ targets: v, x: p.x, y: p.y, duration: this.d.snap, ease: EASING.pop, onComplete: () => this.tweenDone() });
  }

  /**
   * Slippsonene for jokeren. Uten dem har spilleren ingen anelse om hvor mellomrommene er;
   * i hårnål gjelder det også mellomrommet over folden. Tømmes så snart tilstanden forlates.
   */
  private drawGaps(s: GestureState): void {
    this.gapGfx.clear();
    if (s.name !== 'dragWild' && s.name !== 'wildArmed') return;
    // wildArmed har ingen peker nede; activePointer holder siste kjente posisjon.
    const px = s.name === 'dragWild' ? s.x : this.input.activePointer.x;
    const py = s.name === 'dragWild' ? s.y : this.input.activePointer.y;
    const nearest = hitGap(this.layout, (px - this.originX) / this.layout.scale, (py - this.originY) / this.layout.scale);
    const w = this.layout.gap * this.layout.scale + SPACE.sm;
    const h = this.layout.tile * this.layout.scale * 0.8;
    const accent = worldAccent(this.level.world);
    for (const g of this.layout.gaps) {
      const p = this.screenPoint(g.x, g.y);
      this.gapGfx.fillStyle(accent, g.at === nearest ? 0.8 : 0.35);
      this.gapGfx.fillRoundedRect(p.x - w / 2, p.y - h / 2, w, h, w / 2);
    }
  }

  private syncWildGhost(s: GestureState): void {
    if (s.name !== 'dragWild') {
      this.wildGhost?.destroy();
      this.wildGhost = null;
      return;
    }
    if (this.wildGhost === null) {
      this.wildGhost = new TileView(this, GHOST_TILE);
      this.wildGhost.setDepth(15);
      this.wildGhost.setFlags({ ghost: true });
    }
    this.wildGhost.setTile(GHOST_TILE, this.layout.tile * this.layout.scale, services(this).settings().colorBlind);
    this.wildGhost.setPosition(s.x, s.y);
  }

  /** Menyen legges over den øverste brikka i segmentet. */
  private segmentAnchor(from: number, to: number): { x: number; y: number } {
    const a = this.layout.slots[from];
    const b = this.layout.slots[to];
    if (a === undefined || b === undefined) return { x: this.scale.width / 2, y: this.scale.height / 2 };
    const p1 = this.screenPoint(a.x, a.y);
    const p2 = this.screenPoint(b.x, b.y);
    return { x: (p1.x + p2.x) / 2, y: Math.min(p1.y, p2.y) - this.layout.tile * this.layout.scale * 0.8 };
  }

  private key(e: KeyboardEvent): void {
    if (this.inputLocked || this.view.solved) return;
    const code = KEY_MAP[e.code];
    if (code === undefined) return;
    if (this.banner !== null && code !== 'KeyZ' && code !== 'KeyR') return;
    // Tastaturet tar over: uten dette blir maskinen stående i selected med en indeks
    // som ingen klemmer, og neste pekertrykk bytter feil par.
    this.machine.reset();
    this.keyboardActive = true;
    const rest: Intent[] = [];
    for (const intent of this.keyboard.handle({ code, shift: e.shiftKey })) {
      if (intent.type !== 'undo' && intent.type !== 'reset') {
        rest.push(intent);
        continue;
      }
      const r = this.session.dispatch({ type: intent.type });
      if (!r.ok) this.showHint(r.reason);
      else if (intent.type === 'undo') audio.playUndo();
    }
    this.applyIntents(rest);
    this.syncGestureVisuals();
  }

  private showHint(reason: HintReason | SessionReject): void {
    this.hint?.destroy();
    const text = makeLabel(this, contentLeft(this) + contentWidth(this) / 2, HUD_HEIGHT + SPACE.lg, HINT_TEXT[reason], {
      size: 16,
      color: COLORS.danger,
      font: 'body',
      bold: true,
    });
    text.setDepth(30);
    this.hint = text;
    this.tweens.add({
      targets: text,
      alpha: 0,
      // Full opasitet en stund først; en tekst som fader fra første frame rekker ikke å bli lest.
      delay: this.d.normal,
      duration: this.d.calm,
      ease: EASING.fade,
      onComplete: () => {
        if (this.hint === text) this.hint = null;
        text.destroy();
      },
    });
    this.effects.nudge();
  }

  private showDeadEnd(): void {
    if (this.banner !== null) return;
    const w = Math.min(contentWidth(this) - SPACE.xl, BANNER_W);
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(-w / 2, -BANNER_H / 2, w, BANNER_H, RADIUS.panel);
    g.lineStyle(3, COLORS.danger, 1);
    g.strokeRoundedRect(-w / 2, -BANNER_H / 2, w, BANNER_H, RADIUS.panel);
    const title = makeLabel(this, 0, -SPACE.md, 'Ingen vei videre herfra', { size: 20, color: COLORS.danger, bold: true });
    const sub = makeLabel(this, 0, SPACE.lg, 'Angre eller start på nytt', { size: 15, color: COLORS.inkMuted, font: 'body' });
    const x = contentLeft(this) + contentWidth(this) / 2;
    this.banner = this.add.container(x, HUD_HEIGHT + SPACE.xl + BANNER_H / 2, [g, title, sub]).setDepth(25);
  }

  private hideBanner(): void {
    this.banner?.destroy();
    this.banner = null;
  }

  private onSolved(): void {
    if (this.solvedFired) return;
    this.solvedFired = true;
    this.inputLocked = true;
    this.hideBanner();
    this.menu.hide();
    audio.playSuccess();
    this.effects.mirrorWave(this.layout, this.originX, this.originY, this.layout.scale);
    this.effects.flash(COLORS.success, 0.2);
    const movesUsed = this.view.movesUsed;
    const outcome = services(this).mode.onSolved(this.levelId, movesUsed);
    this.time.delayedCall(this.d.ceremony, () => {
      // ResultScene2 kommer i Task 6; uten den er menyen eneste trygge landing.
      const next = this.scene.get(SCENE.result) !== null ? SCENE.result : SCENE.menu;
      this.scene.start(next, { levelId: this.levelId, outcome, movesUsed, target: this.level.target });
    });
  }

  /** Brettområdet: mellom HUD og hånd, maks 480 bredt, sentrert. Kun geometri og speillinje. */
  private relayout(): void {
    const w = contentWidth(this);
    const left = contentLeft(this);
    const boardTop = HUD_HEIGHT;
    const boardHeight = this.scale.height - HUD_HEIGHT - HAND_HEIGHT;
    this.layout = computeLayout({ count: this.view.tiles.length, width: w, height: boardHeight });
    this.originX = left + (w - this.layout.width * this.layout.scale) / 2;
    this.originY = boardTop + (boardHeight - this.layout.height * this.layout.scale) / 2;
    this.drawMirror();
  }

  /**
   * Bygger HUD og hånd bare når størrelsen eller de viste verdiene har endret seg. Hånden
   * inneholder knapper, så en unødig ombygging mellom pointerdown og pointerup ville spist klikket.
   */
  private refreshChrome(resized: boolean): void {
    const hud = this.hudCache;
    if (resized || hud === null || hud.movesUsed !== this.view.movesUsed || hud.budgetLeft !== this.view.budgetLeft) {
      this.hudCache = { movesUsed: this.view.movesUsed, budgetLeft: this.view.budgetLeft };
      this.buildHud();
    }
    const hand = this.handCache;
    const h = this.view.hand;
    if (resized || hand === null || hand.wild !== h.wild || hand.remove !== h.remove || hand.canUndo !== this.view.canUndo) {
      this.handCache = { wild: h.wild, remove: h.remove, canUndo: this.view.canUndo };
      this.buildHand();
    }
  }

  /** Tegner alt fra this.view: brikker (opprett/oppdater/fjern etter id), speillinje, HUD, hånd. animate styrer om brikker tweenes til plass. */
  private render(animate: boolean): void {
    this.relayout();
    const resized = this.lastSize === null || this.lastSize.w !== this.scale.width || this.lastSize.h !== this.scale.height;
    this.lastSize = { w: this.scale.width, h: this.scale.height };
    this.refreshChrome(resized);
    const colorBlind = services(this).settings().colorBlind;
    const size = this.layout.tile * this.layout.scale;
    const live = new Set<number>();

    this.view.tiles.forEach((tile, i) => {
      const slot = this.layout.slots[i];
      if (slot === undefined) return;
      live.add(tile.id);
      const p = this.screenPoint(slot.x, slot.y);
      let v = this.tiles.get(tile.id);
      if (v === undefined) {
        v = new TileView(this, tile);
        v.setDepth(5);
        v.setPosition(p.x, p.y);
        this.tiles.set(tile.id, v);
        if (animate) {
          v.setScale(0);
          this.pendingTweens++;
          this.tweens.add({ targets: v, scale: 1, duration: this.d.normal, ease: EASING.pop, onComplete: () => this.tweenDone() });
        }
      }
      v.setTile(tile, size, colorBlind);
      // Draget eier posisjonen til brikka det holder. Løseren svarer midt i neste drag, og
      // uten dette ville render tweenet brikka tilbake til sloten mens fingeren flytter den.
      if (tile.id === this.dragId) return;
      if (animate && (v.x !== p.x || v.y !== p.y)) {
        this.pendingTweens++;
        this.tweens.add({
          targets: v,
          x: p.x,
          y: p.y,
          duration: this.d.normal,
          ease: EASING.move,
          onComplete: () => this.tweenDone(),
        });
      } else {
        v.setPosition(p.x, p.y);
      }
    });

    for (const [id, v] of [...this.tiles]) {
      if (live.has(id)) continue;
      this.tiles.delete(id);
      if (!animate) {
        v.destroy();
        continue;
      }
      this.pendingTweens++;
      this.tweens.add({
        targets: v,
        scale: 0,
        alpha: 0,
        duration: this.d.snap,
        ease: EASING.move,
        onComplete: () => {
          this.tweenDone();
          v.destroy();
        },
      });
    }

    const n = this.view.tiles.length;
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) {
      const a = this.view.tiles[i];
      const b = this.view.tiles[n - 1 - i];
      if (a === undefined || b === undefined) continue;
      const m = matches(a, b);
      this.tiles.get(a.id)?.setFlags({ matched: m });
      this.tiles.get(b.id)?.setFlags({ matched: m });
    }
    if (n % 2 === 1) {
      const mid = this.view.tiles[half];
      if (mid !== undefined) this.tiles.get(mid.id)?.setFlags({ matched: true });
    }

    if (this.lastKind !== null && this.lastKind !== this.layout.kind) this.inputLocked = true;
    this.lastKind = this.layout.kind;
  }

  private onViewChange(v: SessionView): void {
    this.view = v;
    this.keyboard.clampCursor();
    this.render(true);
    if (v.solved) {
      this.onSolved();
      return;
    }
    if (v.solveStatus.kind === 'deadEnd') this.showDeadEnd();
    else this.hideBanner();
    this.syncGestureVisuals();
  }

  private screenPoint(x: number, y: number): { x: number; y: number } {
    return { x: this.originX + x * this.layout.scale, y: this.originY + y * this.layout.scale };
  }

  private drawMirror(): void {
    const m = this.layout.mirror;
    const a = this.screenPoint(m.x1, m.y1);
    const b = this.screenPoint(m.x2, m.y2);
    this.mirrorGfx.clear();
    this.mirrorGfx.lineStyle(3, worldAccent(this.level.world), 0.6);
    this.mirrorGfx.lineBetween(a.x, a.y, b.x, b.y);
  }

  private buildHud(): void {
    this.hud.removeAll(true);
    const w = contentWidth(this);
    const left = contentLeft(this);
    const y = HUD_HEIGHT / 2;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panel, 1);
    bg.fillRect(0, 0, this.scale.width, HUD_HEIGHT);
    bg.fillStyle(worldAccent(this.level.world), 1);
    bg.fillRect(0, HUD_HEIGHT - HUD_STRIPE, this.scale.width, HUD_STRIPE);
    this.hud.add(bg);
    this.hud.add(
      makeLabel(this, left + SPACE.lg, y, `Verden ${this.level.world} · Nivå ${this.level.n}`, {
        size: 16,
        color: COLORS.inkMuted,
        font: 'body',
        align: 'left',
      })
    );
    this.hud.add(makeLabel(this, left + w / 2, y, `Trekk ${this.view.movesUsed} / mål ${this.level.target}`, { size: 22, bold: true }));
    this.hud.add(
      makeLabel(this, left + w - SPACE.lg, y, `Budsjett ${this.view.budgetLeft}`, {
        size: 16,
        color: COLORS.inkMuted,
        font: 'body',
        align: 'right',
      })
    );
  }

  private buildHand(): void {
    this.hand.removeAll(true);
    const w = contentWidth(this);
    const left = contentLeft(this);
    const cy = this.scale.height - HAND_HEIGHT / 2;
    const pitch = w / 4;
    const centerOf = (i: number): number => left + pitch * (i + 0.5);
    const zoneW = pitch - SPACE.md;

    this.hand.add(this.makeZone(centerOf(0), cy, zoneW, `Joker ×${this.view.hand.wild}`, this.view.hand.wild > 0));
    // Ladet joker har ingen spøkelse å vise, så sonen får en ring i stedet.
    const ring = this.add.graphics();
    ring.lineStyle(3, COLORS.ink, 1);
    ring.strokeRoundedRect(centerOf(0) - zoneW / 2 - 4, cy - ZONE_HEIGHT / 2 - 4, zoneW + 8, ZONE_HEIGHT + 8, RADIUS.button);
    ring.setVisible(this.machine.state.name === 'wildArmed');
    this.hand.add(ring);
    this.armedRing = ring;
    this.hand.add(this.makeZone(centerOf(1), cy, zoneW, `Fjern ×${this.view.hand.remove}`, this.view.hand.remove > 0));
    this.hand.add(
      makeButton(this, {
        x: centerOf(2),
        y: cy,
        width: zoneW,
        height: ZONE_HEIGHT,
        label: 'Angre',
        accent: COLORS.inkMuted,
        enabled: this.view.canUndo,
        onClick: () => {
          this.session.dispatch({ type: 'undo' });
          audio.playUndo();
        },
      })
    );
    this.hand.add(
      makeButton(this, {
        x: centerOf(3),
        y: cy,
        width: zoneW,
        height: ZONE_HEIGHT,
        label: 'Reset',
        accent: COLORS.danger,
        onClick: () => this.session.dispatch({ type: 'reset' }),
      })
    );

    this.zoneCache = {
      wild: { x: centerOf(0), y: cy },
      remove: { x: centerOf(1), y: cy },
      undo: { x: centerOf(2), y: cy },
      reset: { x: centerOf(3), y: cy },
    };
  }

  private makeZone(x: number, y: number, w: number, label: string, active: boolean): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.lineStyle(2, active ? COLORS.ink : COLORS.locked, active ? 0.8 : 0.4);
    dashedRect(g, -w / 2, -ZONE_HEIGHT / 2, w, ZONE_HEIGHT);
    const text = makeLabel(this, 0, 0, label, { size: 15, color: active ? COLORS.ink : COLORS.inkMuted, font: 'body' });
    const c = this.add.container(x, y, [g, text]);
    c.setSize(w, ZONE_HEIGHT);
    return c;
  }

  private makeHook(): import('./testHook').TestHook {
    return {
      levelId: this.levelId,
      view: () => this.view,
      screenLayout: () => ({
        slots: this.layout.slots.map((s) => ({ index: s.index, ...this.screenPoint(s.x, s.y) })),
        gaps: this.layout.gaps.map((g) => ({ at: g.at, ...this.screenPoint(g.x, g.y) })),
        tile: this.layout.tile * this.layout.scale,
      }),
      menu: () => (this.menu.visible ? this.menu.positions() : null),
      zones: () => this.zones(),
      busy: () => this.inputLocked || this.pendingTweens > 0,
      state: () => this.machine.state,
    };
  }

  private zones(): { wild: { x: number; y: number }; remove: { x: number; y: number }; undo: { x: number; y: number }; reset: { x: number; y: number } } {
    return this.zoneCache;
  }

  private zoneCache = { wild: { x: 0, y: 0 }, remove: { x: 0, y: 0 }, undo: { x: 0, y: 0 }, reset: { x: 0, y: 0 } };
}
