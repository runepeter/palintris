import { screenWidth, screenHeight, PIXEL_RATIO, prepareViewport } from './viewport';
import Phaser from 'phaser';
import { makeBackdrop } from './art';
import { audio } from '../audio/sound';
import type { BoardState } from '../core/board';
import type { Command, MoveCommand, Result } from '../core/commands';
import { matches } from '../core/palindrome';
import { markIntroSeen, setDailyProgress } from '../core/storage';
import { makeTile, WILD_SYMBOL } from '../core/tiles';
import { BLITZ, BlitzClock, blitzBonusMs } from '../game/blitz';
import { mmss } from '../game/daily';
import { blitzUrgency, harmonyProgress, moveFeedback } from '../game/feedback';
import type { GestureState, HintReason, Intent, Target } from '../game/gestures';
import { GestureMachine } from '../game/gestures';
import { intentToCommand } from '../game/intents';
import type { IntroSpec } from '../game/intro';
import { introFor, introSatisfiedBy } from '../game/intro';
import { operationSummary, segmentOptions } from '../game/operations';
import type { KeyCode } from '../game/keyboard';
import { KeyboardController } from '../game/keyboard';
import type { BoardLayout, LayoutKind } from '../game/layout';
import { computeLayout, hitGap, hitTile } from '../game/layout';
import { BLITZ_NEXT } from '../game/modes/blitz';
import type { BoardMode, ModeLevel } from '../game/modes/types';
import { moveAnimationFor, type MoveAnimation } from '../game/moveAnimation';
import type { SessionReject, SessionView } from '../game/session';
import { BoardSession } from '../game/session';
import { COLORS, durations, EASING, RADIUS, SPACE, worldAccent } from '../theme/theme';
import { Effects } from './effects';
import { introHeight, IntroOverlay } from './IntroOverlay';
import { SegmentMenu } from './SegmentMenu';
import { services, type Services } from './services';
import { installHook, removeHook } from './testHook';
import { TileView } from './TileView';
import { contentLeft, contentWidth, makeButton, makeLabel, SCENE } from './ui';

export type ModeKind = BoardMode['kind'];

interface BoardData {
  readonly mode: ModeKind;
  /** Kampanje og fri spilling peker ut et brett; daglig og blitz henter sitt eget. */
  readonly levelId?: string;
}

/** De to HUD-linjene. Toppen er stor i blitz, der klokken er hovedsaken. */
interface HudLines {
  readonly top: string;
  readonly topSize: number;
  readonly bottom: string;
  readonly harmony: string;
  readonly operations: string;
  readonly topColor?: number;
  readonly urgent?: boolean;
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
const HUD_TOP = 22;
const HUD_CLOCK = 30;
/** «Hopp over» er for lang for knappebredden på 390 px med standard teksthøyde. */
const SKIP_LABEL = 15;
/** Hvor ofte dagsframgangen skrives mens klokken går. Taket på tid tapt i en reload. */
const DAILY_SAVE_MS = 1000;
/** Luft over og under intropanelet. Brettflaten avgir panelhøyden pluss dette. */
const INTRO_PAD = SPACE.md * 2;
/** Bare et gulv mot ikke-positiv høyde; computeLayout skalerer brettet ned selv. */
const MIN_BOARD = 24;

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

export class BoardScene extends Phaser.Scene {
  private levelId = '';
  private modeKind: ModeKind = 'campaign';
  private mode!: BoardMode;
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
  private portalGfx!: Phaser.GameObjects.Graphics;
  private gapGfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Container;
  private exitButton!: Phaser.GameObjects.Container;
  private hand!: Phaser.GameObjects.Container;
  private menu!: SegmentMenu;
  private banner: Phaser.GameObjects.Container | null = null;
  private hint: Phaser.GameObjects.Text | null = null;
  private wildGhost: TileView | null = null;
  private armedRing: Phaser.GameObjects.Graphics | null = null;
  /** Brikka som dras; snap-back trenger id, siden indeksene flytter seg under et trekk. */
  private dragId: number | null = null;
  private lastState: GestureState | null = null;
  /** Siste håndterte tastehendelse, holdt på identitet. Se key(). */
  private lastKeyEvent: KeyboardEvent | null = null;
  private keyboardActive = false;
  private solvedFired = false;
  /** Satt når create() ga opp fordi nivået ikke fantes. Da er session og machine udefinert. */
  private aborted = false;
  private inputLocked = false;
  private pendingTweens = 0;
  /** Utfasings-tweens for fjernede brikker; de har alt forlatt this.tiles, så onResize må spore dem separat. */
  private fadingTiles = new Set<TileView>();
  private lastKind: LayoutKind | null = null;
  private lastSize: { w: number; h: number } | null = null;
  /** De viste HUD-linjene, så en klokke som tikker bare bygger HUD-en når teksten endrer seg. */
  private hudText: string | null = null;
  private handCache: { wild: number; remove: number; canUndo: boolean } | null = null;
  private view!: SessionView;
  private harmony = { matched: 0, total: 0 };
  private flow = 0;
  private lastGain = 0;
  private pendingCommand: Command | null = null;
  private d = durations(false);
  private pendingVictory: (() => void) | null = null;
  private clearingVictory = false;
  /** Sann mens fanen er skjult: begge klokkene står stille. */
  private paused = false;
  /** Daglig: tid brukt, kommandologg og starttidspunkt for gjenopptakelse. */
  private elapsedMs = 0;
  private timerRunning = false;
  private startedAt = '';
  private commands: Command[] = [];
  /** Tid siden forrige lagring av dagsframgangen; tiden mellom to trekk må også overleve en reload. */
  private sinceDailySaveMs = 0;
  /** Sann mens lagrede kommandoer spilles av: ingen animasjon og ingen ny lagring. */
  private replaying = false;
  private clock = new BlitzClock();
  private blitzDone = false;
  /** Introen for nivået, når det har en og den ikke er sett før. */
  private intro: IntroOverlay | null = null;
  private introSpec: IntroSpec | null = null;

  /** Fast referanse, så teardown kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => {
    if (this.clearingVictory) {
      this.relayout();
      this.refreshChrome(true);
      this.view.tiles.forEach((tile, i) => {
        const slot = this.layout.slots[i];
        if (slot === undefined) return;
        const p = this.screenPoint(slot.x, slot.y);
        const rendered = this.tiles.get(tile.id);
        if (rendered === undefined) return;
        const alpha = rendered.alpha;
        rendered.setTile(tile, this.layout.tile * this.layout.scale, services(this).settings().colorBlind);
        rendered.setAlpha(alpha).setPosition(p.x, p.y);
      });
      this.lastSize = { w: screenWidth(this), h: screenHeight(this) };
      return;
    }
    for (const v of this.tiles.values()) {
      this.tweens.killTweensOf(v);
      v.setScale(1);
    }
    // killTweensOf fyrer ikke onComplete, så de fadende brikkene rydder vi selv i stedet
    // for å la dem henge igjen som usynlig etterslep etter at telleren nullstilles under.
    for (const v of this.fadingTiles) {
      this.tweens.killTweensOf(v);
      v.destroy();
    }
    this.fadingTiles.clear();
    this.pendingTweens = 0;
    this.render(false);
    // Banner og meny er plassert mot den gamle bredden og må settes på nytt.
    if (this.banner !== null) {
      this.hideBanner();
      this.showDeadEnd();
    }
    this.syncGestureVisuals();
  };

  /** Fast referanse, så teardown kan koble den av document. */
  private readonly onVisibility = (): void => {
    this.paused = document.hidden;
    if (this.modeKind !== 'blitz') return;
    if (this.paused) this.clock.pause();
    // Et løst brett venter på neste; da skal klokken stå til det er lastet.
    else if (!this.solvedFired && !this.blitzDone) this.clock.resume();
  };

  constructor() {
    super(SCENE.board);
  }

  /** Phaser gjenbruker sceneinstansen, så feltene må nullstilles her og ikke bare i initialiseringen. */
  init(data: BoardData): void {
    this.modeKind = data.mode;
    this.levelId = data.levelId ?? '';
    this.tiles = new Map();
    this.fadingTiles = new Set();
    this.pendingTweens = 0;
    this.inputLocked = false;
    this.lastKind = null;
    this.lastSize = null;
    this.hudText = null;
    this.harmony = { matched: 0, total: 0 };
    this.flow = 0;
    this.lastGain = 0;
    this.pendingCommand = null;
    this.pendingVictory = null;
    this.clearingVictory = false;
    this.handCache = null;
    this.banner = null;
    this.hint = null;
    this.wildGhost = null;
    this.armedRing = null;
    this.dragId = null;
    this.lastState = null;
    this.lastKeyEvent = null;
    this.keyboardActive = false;
    this.solvedFired = false;
    this.aborted = false;
    this.paused = false;
    this.elapsedMs = 0;
    this.timerRunning = false;
    this.startedAt = '';
    this.commands = [];
    this.sinceDailySaveMs = 0;
    this.replaying = false;
    this.clock = new BlitzClock();
    this.blitzDone = false;
    this.intro = null;
    this.introSpec = null;
    this.zoneCache = { wild: { x: 0, y: 0 }, remove: { x: 0, y: 0 }, undo: { x: 0, y: 0 }, reset: { x: 0, y: 0 } };
  }

  create(): void {
    prepareViewport(this);
    const s = services(this);
    // En blitz-omgang teller sine egne brett, så hver inngang til scenen starter en fersk kø.
    if (this.modeKind === 'blitz') s.restartBlitz();
    this.mode = s.modes[this.modeKind];
    const level = this.mode.load(this.startId(s));
    if (level === null) {
      // session og machine finnes ikke; alt som kjører videre må se at scenen ga opp.
      this.aborted = true;
      this.scene.start(SCENE.menu);
      return;
    }
    this.level = level;
    this.d = durations(s.settings().reducedMotion);
    this.effects = new Effects(this, s.settings().reducedMotion);
    const env = {
      count: () => this.view.tiles.length,
      isLocked: (i: number) => this.view.tiles[i]?.locked === true,
      hasWild: () => this.view.hand.wild > 0,
      canRemove: () => this.view.hand.remove > 0,
      canSegment: () => this.level.rules.allowedOps.has('rotate') || this.level.rules.allowedOps.has('mirror'),
    };
    this.machine = new GestureMachine(env);
    this.keyboard = new KeyboardController(env);
    this.mirrorGfx = this.add.graphics().setDepth(6);
    this.portalGfx = this.add.graphics().setDepth(1);
    if (!s.settings().reducedMotion) {
      this.tweens.add({ targets: this.portalGfx, alpha: 0.62, duration: 1600, yoyo: true, repeat: -1, ease: EASING.fade });
    }
    this.gapGfx = this.add.graphics().setDepth(7);
    this.hud = this.add.container(0, 0).setDepth(10);
    this.exitButton = makeButton(this, {
      x: 0, y: 30, width: 68, height: 44, label: '← Meny', labelSize: 13, accent: COLORS.line,
      onClick: () => this.exitToMenu(),
    }).setDepth(30);
    this.hand = this.add.container(0, 0).setDepth(10);
    this.menu = new SegmentMenu(this, this.accent(), HUD_HEIGHT);
    this.startBoard(level);
    if (this.modeKind === 'blitz') this.clock.start();
    this.paused = document.hidden;
    // Starter omgangen på en skjult fane, ville klokken ellers tikket til fanen ble sett.
    if (this.paused) this.clock.pause();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.setupInput();
    // Et gjenopptatt dagsbrett kan alt være løst; da hører seremonien til nå.
    if (this.view.solved) this.onSolved();
  }

  /** Daglig og blitz eier sin egen id; kampanje og fri spilling får den fra kalleren. */
  private startId(s: Services): string {
    if (this.modeKind === 'daily') return s.modes.daily.todayId();
    if (this.modeKind === 'blitz') return BLITZ_NEXT;
    return this.levelId;
  }

  /** Bygger sesjonen for ett brett og tegner det. Kalleren har ryddet etter forrige brett. */
  private startBoard(level: ModeLevel): void {
    this.level = level;
    this.levelId = level.id;
    this.solvedFired = false;
    this.hudText = null;
    this.handCache = null;
    this.lastKind = null;
    const s = services(this);
    const newSession = (): BoardSession =>
      new BoardSession({
        rules: level.rules,
        tiles: level.tiles,
        hand: level.hand,
        target: level.target,
        budget: level.budget,
        solver: s.solver,
        onChange: (v) => this.onViewChange(v),
      });
    this.session = newSession();
    this.view = this.session.view();
    this.harmony = harmonyProgress(this.view.tiles);
    this.flow = 0;
    this.lastGain = 0;
    if (this.modeKind === 'daily' && !this.replayDaily()) {
      // Lagrede trekk passer ikke brettet lenger; da er dagen bedre tjent med blank start.
      this.session.dispose();
      this.session = newSession();
      this.view = this.session.view();
      this.commands = [];
      this.elapsedMs = 0;
      this.startedAt = '';
      s.store.update((d) => setDailyProgress(d, undefined));
    }
    this.maybeShowIntro();
    this.render(false);
    installHook(this.makeHook());
    this.startModeMusic();
  }

  /**
   * Musikken varierer med verden i kampanje/fri spilling, så høyere verdener føles ekte
   * raskere og lysere. play() lar den samme kombinasjonen fortsette uavbrutt: kalles
   * derfor trygt på hvert brett, ikke bare når verdenen faktisk endrer seg.
   */
  private startModeMusic(): void {
    if (this.modeKind === 'blitz') {
      audio.startMusic('gameplay', { transpose: 0, tempoScale: 1.1 });
      return;
    }
    if (this.modeKind === 'daily') {
      audio.startMusic('gameplay', {});
      return;
    }
    const world = this.level.world;
    audio.startMusic('gameplay', { transpose: (world - 1) * 2, tempoScale: 1 + (world - 1) * 0.04 });
  }

  /**
   * Spiller av dagens lagrede kommandoer. Usant når en av dem ble avvist, slik at
   * kalleren kan forkaste framgangen i stedet for å spille videre på feil tilstand.
   */
  private replayDaily(): boolean {
    const s = services(this);
    const progress = s.store.data.daily.inProgress;
    if (progress === undefined) return true;
    // Framgang fra en tidligere dag hører ikke hjemme her og ville ellers ligget til neste trekk.
    if (progress.puzzleId !== this.levelId) {
      s.store.update((d) => setDailyProgress(d, undefined));
      return true;
    }
    this.replaying = true;
    let ok = true;
    for (const cmd of progress.commands) {
      if (!this.session.dispatch(cmd).ok) {
        ok = false;
        break;
      }
    }
    this.replaying = false;
    if (!ok) return false;
    this.commands = [...progress.commands];
    this.elapsedMs = progress.elapsedMs;
    this.startedAt = progress.startedAt;
    // Klokken gikk da spilleren forlot brettet, og skal gå igjen når det gjenopptas.
    this.timerRunning = this.commands.length > 0;
    return true;
  }

  /** Neste brett i samme scene: uten scene.start, som ville nullstilt klokken og modusen. */
  private loadBoard(level: ModeLevel): void {
    this.destroyIntro();
    this.session.dispose();
    for (const v of this.tiles.values()) {
      this.tweens.killTweensOf(v);
      v.destroy();
    }
    this.tiles.clear();
    this.pendingTweens = 0;
    this.inputLocked = false;
    this.dragId = null;
    this.hideBanner();
    this.hint?.destroy();
    this.hint = null;
    this.wildGhost?.destroy();
    this.wildGhost = null;
    this.menu.hide();
    this.machine.reset();
    this.keyboard.reset();
    this.keyboardActive = false;
    this.startBoard(level);
    this.syncGestureVisuals();
  }

  override update(time: number, delta: number): void {
    if (this.aborted) return;
    this.machine.tick(time);
    // tick() er stille, så hold-overgangen fanges bare ved å sammenligne tilstanden.
    if (this.machine.state !== this.lastState) this.syncGestureVisuals();
    if (this.inputLocked && this.pendingTweens === 0 && !this.solvedFired) this.inputLocked = false;
    if (this.pendingVictory !== null && this.pendingTweens === 0) {
      const begin = this.pendingVictory;
      this.pendingVictory = null;
      begin();
    }
    this.tickClock(delta);
  }

  /** Begge klokkene mates fra spilløkka, aldri fra setInterval: en skjult fane står stille. */
  private tickClock(delta: number): void {
    if (this.modeKind === 'daily') {
      if (!this.timerRunning || this.paused) return;
      this.elapsedMs += delta;
      // Uten dette ville tiden siden forrige trekk gått tapt i en reload, som da ble en gratis pause.
      this.sinceDailySaveMs += delta;
      if (this.sinceDailySaveMs >= DAILY_SAVE_MS) this.saveDailyProgress();
      this.refreshChrome(false);
      return;
    }
    if (this.modeKind !== 'blitz' || this.blitzDone) return;
    // Et brett løst i samme frame har alt lagt på bonusen sin, så over leses etter den.
    if (this.clock.over) {
      this.finishBlitz();
      return;
    }
    this.clock.tick(delta);
    this.refreshChrome(false);
    if (this.clock.over) this.finishBlitz();
  }

  /** Daglig og blitz hører ikke til en verden og har hver sin faste farge. */
  private accent(): number {
    if (this.modeKind === 'daily') return COLORS.inkMuted;
    if (this.modeKind === 'blitz') return COLORS.danger;
    return worldAccent(this.level.world);
  }

  /**
   * Alle godtatte kommandoer går her, så dagens brett kan gjenopptas: kommandologgen
   * og tiden lagres etter hvert trekk, og tiden starter ved det første.
   */
  private dispatch(cmd: Command): Result<BoardState, SessionReject> {
    this.pendingCommand = cmd;
    const r = this.session.dispatch(cmd);
    this.pendingCommand = null;
    if (r.ok) {
      this.recordDaily(cmd);
      this.checkIntro(cmd);
    }
    return r;
  }

  private recordDaily(cmd: Command): void {
    // onSolved har alt ryddet bort inProgress; et nytt lagringskall ville skrevet den tilbake.
    if (this.modeKind !== 'daily' || this.replaying || this.solvedFired) return;
    if (!this.timerRunning) {
      this.timerRunning = true;
      if (this.startedAt === '') this.startedAt = new Date().toISOString();
    }
    this.commands.push(cmd);
    this.saveDailyProgress();
  }

  /** Skriver kommandologgen og tiden slik de står nå. Kalles etter hvert trekk og mens klokken går. */
  private saveDailyProgress(): void {
    this.sinceDailySaveMs = 0;
    // onSolved rydder bort inProgress; en lagring etterpå ville skrevet den tilbake.
    if (this.solvedFired) return;
    const progress = {
      puzzleId: this.levelId,
      startedAt: this.startedAt,
      elapsedMs: Math.round(this.elapsedMs),
      commands: [...this.commands],
    };
    services(this).store.update((d) => setDailyProgress(d, progress));
  }

  /** Klemmes mot 0: en resize nullstiller telleren, men utfasing-tweens utenfor this.tiles lever videre. */
  private tweenDone(): void {
    this.pendingTweens = Math.max(0, this.pendingTweens - 1);
  }

  private teardown(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.aborted) return;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    this.destroyIntro();
    removeHook();
    this.session.dispose();
  }

  private exitToMenu(): void {
    if (this.modeKind === 'daily' && this.timerRunning && !this.solvedFired) this.saveDailyProgress();
    this.timerRunning = false;
    this.clock.pause();
    this.inputLocked = true;
    this.scene.start(SCENE.menu);
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
    if (y < screenHeight(this) - HAND_HEIGHT) return false;
    const r = Math.min(ZONE_HIT, contentWidth(this) / 8 - 2);
    return Math.hypot(x - z.x, y - z.y) <= r;
  }

  /** Blindveien slipper bare angre og reset gjennom; de knappene er egne interaktive objekter. */
  private blockedByBanner(x: number, y: number): boolean {
    if (this.banner === null) return false;
    return !this.near(this.zoneCache.undo, x, y) && !this.near(this.zoneCache.reset, x, y);
  }

  private pointer(type: 'down' | 'move' | 'up', p: Phaser.Input.Pointer): void {
    const x = p.x / PIXEL_RATIO;
    const y = p.y / PIXEL_RATIO;
    // Panelet spiser bare sitt eget trykk; et drag som alt er i gang må kunne slippes over det.
    if (type === 'down' && this.intro?.hitPanel(x, y) === true) return;
    const handOff = this.keyboardActive;
    this.keyboardActive = false;
    // Pekeren tar over markeringen fra tastaturet, ellers blir tastaturets valg stående usynlig
    // og gir et byttepar ingen ser. Motstykket er machine.reset() i key().
    if (type === 'down') this.keyboard.state = { ...this.keyboard.state, selected: null, segment: null };
    // Et nytt grep mens brikker fortsatt flyr ville tatt tak i en brikke som ikke er framme ennå.
    const busy = this.inputLocked || (type === 'down' && this.pendingTweens > 0);
    if (busy || this.view.solved || this.blockedByBanner(x, y)) {
      if (handOff) this.syncGestureVisuals();
      return;
    }
    const target = this.resolveTarget(x, y);
    this.applyIntents(this.machine.handle({ type, x, y, t: this.time.now, target }));
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

  /** Skjermpunktet intensjonen gjelder, lest før dispatch — etterpå er layoutet et annet. */
  private intentPoint(intent: Intent): { x: number; y: number } | null {
    const slot = (i: number): { x: number; y: number } | null => {
      const s = this.layout.slots[i];
      return s === undefined ? null : this.screenPoint(s.x, s.y);
    };
    const between = (i: number, j: number): { x: number; y: number } | null => {
      const a = slot(i);
      const b = slot(j);
      return a === null || b === null ? null : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    switch (intent.type) {
      case 'swap':
        return between(intent.a, intent.b);
      case 'segment':
        return between(intent.from, intent.to);
      case 'remove':
        return slot(intent.index);
      case 'insertWild': {
        const g = this.layout.gaps.find((q) => q.at === intent.at);
        return g === undefined ? null : this.screenPoint(g.x, g.y);
      }
      case 'hint':
        return null;
    }
  }

  private moveAnimation(type: MoveCommand['type']): MoveAnimation {
    const settings = services(this).settings();
    return moveAnimationFor(type, {
      clear: settings.clearAnimations,
      reduced: settings.reducedMotion,
      timed: this.modeKind === 'blitz',
    });
  }

  private moveCue(cmd: MoveCommand): string {
    switch (cmd.type) {
      case 'swap':
        return 'Bytter naboer';
      case 'rotate':
        return cmd.dir === 'left' ? '⟲ Roterer mot venstre' : 'Roterer mot høyre ⟳';
      case 'mirror':
        return '⇋ Speiler segmentet';
      case 'insertWild':
        return 'Åpner plass til Joker';
      case 'remove':
        return 'Fjerner brikken';
    }
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
      const at = this.intentPoint(intent);
      const r = this.dispatch(cmd);
      if (!r.ok) {
        const message = r.reason === 'notAllowed'
          ? `Ikke på dette brettet · ${operationSummary(this.level.rules.allowedOps)}`
          : undefined;
        this.showHint(r.reason, at ?? undefined, message);
        audio.playError();
        continue;
      }
      if (intent.type === 'swap') audio.playSwap();
      else if (intent.type !== 'segment') audio.playSelect();
      else if (intent.action === 'mirror') audio.playMirror();
      else audio.playRotate();
      if (cmd.type === 'undo' || cmd.type === 'reset') continue;
      const animation = this.moveAnimation(cmd.type);
      const feedback = (): void => {
        if (!this.scene.isActive()) return;
        if (at !== null) this.effects.burst(at.x, at.y, this.accent());
        this.effects.nudge();
      };
      if (!animation.detailed) {
        feedback();
        continue;
      }
      if (at !== null) {
        const y = at.y - this.layout.tile * this.layout.scale * 0.9;
        this.effects.toolCue(at.x, y, this.moveCue(cmd), this.accent(), animation.totalMs);
      }
      if (cmd.type === 'mirror') this.effects.mirrorWave(this.layout, this.originX, this.originY, this.layout.scale, animation.totalMs);
      this.time.delayedCall(animation.totalMs, feedback);
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
      this.menu.show(p.x, p.y, segmentOptions(this.level.rules.allowedOps, s.to - s.from + 1));
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
   * Tegnes over brikkene (depth 7): mellomrommet er bare GAP bredt, så en markør under
   * brikkene er praktisk talt usynlig. Derfor også lav alpha, som for speillinja.
   */
  private drawGaps(s: GestureState): void {
    this.gapGfx.clear();
    if (s.name !== 'dragWild' && s.name !== 'wildArmed') return;
    // wildArmed har ingen peker nede; activePointer holder siste kjente posisjon.
    const px = s.name === 'dragWild' ? s.x : this.input.activePointer.x / PIXEL_RATIO;
    const py = s.name === 'dragWild' ? s.y : this.input.activePointer.y / PIXEL_RATIO;
    const nearest = hitGap(this.layout, (px - this.originX) / this.layout.scale, (py - this.originY) / this.layout.scale);
    const w = this.layout.gap * this.layout.scale + SPACE.sm;
    const h = this.layout.tile * this.layout.scale * 0.8;
    const accent = this.accent();
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
    if (a === undefined || b === undefined) return { x: screenWidth(this) / 2, y: screenHeight(this) / 2 };
    const p1 = this.screenPoint(a.x, a.y);
    const p2 = this.screenPoint(b.x, b.y);
    return { x: (p1.x + p2.x) / 2, y: Math.min(p1.y, p2.y) - this.layout.tile * this.layout.scale * 0.8 };
  }

  private key(e: KeyboardEvent): void {
    // Phaser tømmer ikke KeyboardManager.queue mellom passeringene, så det samme
    // event-objektet kan leveres flere ganger. Auto-repeat skal heller ikke telle som trekk.
    if (e.repeat || e === this.lastKeyEvent) return;
    this.lastKeyEvent = e;
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
      const r = this.dispatch({ type: intent.type });
      if (!r.ok) this.showHint(r.reason);
      else if (intent.type === 'undo') audio.playUndo();
    }
    this.applyIntents(rest);
    this.syncGestureVisuals();
  }

  /** Med kjent posisjon vises årsaken like over brikka; ellers faller den tilbake til under HUD. */
  private showHint(reason: HintReason | SessionReject, at?: { x: number; y: number }, message?: string): void {
    this.hint?.destroy();
    const x = at?.x ?? contentLeft(this) + contentWidth(this) / 2;
    const y = at === undefined ? HUD_HEIGHT + SPACE.lg : at.y - this.layout.tile * this.layout.scale * 0.9;
    const text = makeLabel(this, x, y, message ?? HINT_TEXT[reason], {
      size: 16,
      color: COLORS.danger,
      font: 'body',
      bold: true,
    });
    text.setScale(Math.min(1, (contentWidth(this) - SPACE.xl) / text.width));
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
    this.timerRunning = false;
    this.hideBanner();
    this.menu.hide();
    const movesUsed = this.view.movesUsed;
    if (this.modeKind === 'blitz') {
      audio.playSuccess();
      this.effects.mirrorWave(this.layout, this.originX, this.originY, this.layout.scale);
      this.effects.flash(COLORS.success, 0.2);
      this.blitzSolved(movesUsed);
      return;
    }
    const timeMs = Math.round(this.elapsedMs);
    const outcome = this.mode.onSolved(this.levelId, movesUsed, this.modeKind === 'daily' ? { timeMs } : undefined);
    // Vent på at siste trekk faktisk lander, også når spilleren slipper en dratt brikke.
    this.pendingVictory = (): void => {
      this.clearingVictory = true;
      if (this.view.stars === 3) audio.playVictoryJingle();
      else audio.playPalindrome();
      this.effects.mirrorWave(this.layout, this.originX, this.originY, this.layout.scale);
      const tiles = this.view.tiles.flatMap((tile) => {
        const rendered = this.tiles.get(tile.id);
        return rendered === undefined ? [] : [rendered];
      });
      this.effects.clearBoard(tiles, services(this).settings().clearAnimations, () => {
        const next = this.scene.get(SCENE.result) !== null ? SCENE.result : SCENE.menu;
        this.scene.start(next, { mode: this.modeKind, levelId: this.levelId, outcome, movesUsed, target: this.level.target, timeMs });
      });
    };
  }

  /** Bonusen legges på før klokken leses, så et brett løst på målstreken teller. */
  private blitzSolved(movesUsed: number): void {
    const blitz = services(this).modes.blitz;
    const solvedBefore = blitz.solved;
    const atTarget = movesUsed <= this.level.target;
    const bonus = blitzBonusMs(solvedBefore, atTarget);
    blitz.onSolved(this.levelId, movesUsed);
    this.clock.onSolved(solvedBefore, atTarget);
    this.clock.pause();
    this.effects.reward(
      contentLeft(this) + contentWidth(this) / 2,
      screenHeight(this) - HAND_HEIGHT - SPACE.xl,
      `+${bonus / 1000}s${atTarget ? ' · Målbonus!' : ''}`,
      COLORS.success
    );
    this.time.delayedCall(this.d.ceremony, () => this.nextBlitzBoard());
  }

  private nextBlitzBoard(): void {
    if (this.blitzDone) return;
    this.loadBoard(services(this).modes.blitz.load(BLITZ_NEXT));
    // Er fanen skjult, tar onVisibility klokken igjen når spilleren kommer tilbake.
    if (!this.paused) this.clock.resume();
  }

  /** «Hopp over» koster tid; er tiden dermed ute, avsluttes omgangen i stedet. */
  private skipBlitz(): void {
    if (this.blitzDone || this.solvedFired) return;
    this.clock.skip();
    this.effects.reward(
      contentLeft(this) + contentWidth(this) / 2,
      screenHeight(this) - HAND_HEIGHT - SPACE.xl,
      `−${BLITZ.skipCostMs / 1000}s`,
      COLORS.danger
    );
    if (this.clock.over) {
      this.finishBlitz();
      return;
    }
    this.loadBoard(services(this).modes.blitz.load(BLITZ_NEXT));
  }

  private finishBlitz(): void {
    if (this.blitzDone) return;
    this.blitzDone = true;
    this.inputLocked = true;
    this.scene.start(SCENE.blitzResult, services(this).modes.blitz.finish());
  }

  /** Kun kampanjen underviser, og hver intro vises én gang per spiller. */
  private maybeShowIntro(): void {
    if (this.modeKind !== 'campaign') return;
    const spec = introFor(this.levelId);
    if (spec === null) return;
    const s = services(this);
    if (s.store.data.introsSeen.includes(spec.id)) return;
    this.introSpec = spec;
    this.intro = new IntroOverlay(this, spec, s.settings().reducedMotion, () => this.dismissIntro());
  }

  /**
   * Plassen introen tar fra brettflaten. Panelet er lavere i liggende format, og brettet
   * avgir alltid nøyaktig det panelet legger beslag på: de to kan ikke overlappe.
   */
  private introSpace(): number {
    return this.intro === null ? 0 : introHeight(screenHeight(this)) + INTRO_PAD;
  }

  /** Trekket introen ba om er gjort; da er den lært og skal ikke komme igjen. */
  private checkIntro(cmd: Command): void {
    if (this.introSpec !== null && introSatisfiedBy(this.introSpec, cmd)) this.dismissIntro();
  }

  private dismissIntro(): void {
    const spec = this.introSpec;
    if (spec === null) return;
    this.destroyIntro();
    services(this).store.update((d) => markIntroSeen(d, spec.id));
    // Brettflaten vokser igjen; onResize er nøyaktig den omleggingen, tween-opprydding inkludert.
    this.onResize();
  }

  private destroyIntro(): void {
    this.intro?.destroy();
    this.intro = null;
    this.introSpec = null;
  }

  /** Brettområdet: mellom HUD og hånd, maks 480 bredt, sentrert. Kun geometri og speillinje. */
  private relayout(): void {
    const w = contentWidth(this);
    const left = contentLeft(this);
    this.exitButton.setPosition(left + 42, 30);
    if (this.lastSize?.w !== screenWidth(this) || this.lastSize.h !== screenHeight(this)) {
      this.children.getByName('realm-backdrop')?.destroy();
      makeBackdrop(this, 'board');
    }
    this.intro?.layout(w - SPACE.xl, screenHeight(this) - HAND_HEIGHT - SPACE.md);
    const boardTop = HUD_HEIGHT;
    const boardHeight = Math.max(MIN_BOARD, screenHeight(this) - HUD_HEIGHT - HAND_HEIGHT - this.introSpace());
    this.layout = computeLayout({ count: this.view.tiles.length, width: w, height: boardHeight });
    this.originX = left + (w - this.layout.width * this.layout.scale) / 2;
    this.originY = boardTop + (boardHeight - this.layout.height * this.layout.scale) / 2;
    this.drawMirror();
    this.drawPortal();
  }

  /**
   * Bygger HUD og hånd bare når størrelsen eller de viste verdiene har endret seg. Hånden
   * inneholder knapper, så en unødig ombygging mellom pointerdown og pointerup ville spist klikket.
   */
  private refreshChrome(resized: boolean): void {
    const lines = this.hudLines();
    const text = `${lines.top}|${lines.bottom}|${lines.harmony}|${lines.operations}`;
    if (resized || this.hudText !== text) {
      this.hudText = text;
      this.buildHud(lines);
    }
    const hand = this.handCache;
    const h = this.view.hand;
    if (resized || hand === null || hand.wild !== h.wild || hand.remove !== h.remove || hand.canUndo !== this.view.canUndo) {
      this.handCache = { wild: h.wild, remove: h.remove, canUndo: this.view.canUndo };
      this.buildHand();
    }
  }

  /** Tegner alt fra this.view. En MoveAnimation styrer bare selve trekket, ikke resten av scenen. */
  private render(animate: boolean, animation?: MoveAnimation): void {
    if (animation?.detailed === true) this.inputLocked = true;
    this.relayout();
    const resized = this.lastSize === null || this.lastSize.w !== screenWidth(this) || this.lastSize.h !== screenHeight(this);
    this.lastSize = { w: screenWidth(this), h: screenHeight(this) };
    this.refreshChrome(resized);
    const colorBlind = services(this).settings().colorBlind;
    const size = this.layout.tile * this.layout.scale;
    const live = new Set<number>();
    const moveMs = animation?.moveMs ?? this.d.normal;
    const moveDelayMs = animation?.moveDelayMs ?? 0;
    const enterMs = animation?.enterMs ?? this.d.normal;
    const enterDelayMs = animation?.enterDelayMs ?? 0;
    const exitMs = animation?.exitMs ?? this.d.snap;

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
          this.tweens.add({ targets: v, scale: 1, delay: enterDelayMs, duration: enterMs, ease: EASING.pop, onComplete: () => this.tweenDone() });
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
          delay: moveDelayMs,
          duration: moveMs,
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
      this.fadingTiles.add(v);
      this.tweens.add({
        targets: v,
        scale: 0,
        alpha: 0,
        duration: exitMs,
        ease: EASING.move,
        onComplete: () => {
          this.fadingTiles.delete(v);
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
      this.tiles.get(a.id)?.setFlags({ matched: m, unmatched: !m });
      this.tiles.get(b.id)?.setFlags({ matched: m, unmatched: !m });
    }
    // Midtbrikka har ingen make og skal derfor verken ha matched-ring eller dempet kant.
    if (n % 2 === 1) {
      const mid = this.view.tiles[half];
      if (mid !== undefined) this.tiles.get(mid.id)?.setFlags({ matched: false, unmatched: false });
    }

    if (this.lastKind !== null && this.lastKind !== this.layout.kind) this.inputLocked = true;
    this.lastKind = this.layout.kind;
  }

  private onViewChange(v: SessionView): void {
    const previous = this.view;
    const command = this.pendingCommand;
    this.view = v;
    // Avspilling tegner én gang til slutt; hver mellomtilstand ville gitt en animasjon.
    if (this.replaying) return;
    // Løseren sender samme brett en gang til med bare ny status. En ny render her ville
    // avbrutt den langsomme trekkanimasjonen ved å tween-e fra mellomposisjonen på nytt.
    if (command === null) {
      this.refreshChrome(false);
      if (v.solveStatus.kind === 'deadEnd') this.showDeadEnd();
      else this.hideBanner();
      this.syncGestureVisuals();
      return;
    }
    let newMatchedIndexes: readonly number[] = [];
    if (command !== null && command.type !== 'undo' && command.type !== 'reset' && v.movesUsed > previous.movesUsed) {
      const feedback = moveFeedback(previous.tiles, v.tiles, this.flow);
      this.harmony = feedback.harmony;
      this.flow = feedback.flow;
      this.lastGain = feedback.gained;
      newMatchedIndexes = feedback.newMatchedIndexes;
    } else {
      this.harmony = harmonyProgress(v.tiles);
      this.lastGain = 0;
      if (command?.type === 'undo' || command?.type === 'reset') this.flow = 0;
    }
    this.keyboard.clampCursor();
    const animation = command.type === 'undo' || command.type === 'reset' ? undefined : this.moveAnimation(command.type);
    this.render(true, animation);
    if (this.lastGain > 0) this.celebrateMove(newMatchedIndexes);
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
    // I rad-layout ligger linja under midtbrikka eller i 4 px-gapet, så den må stikke ut
    // over og under raden for å være synlig. Tegnes over brikkene, derfor lav alpha.
    const ext = this.layout.kind === 'row' ? this.layout.tile * this.layout.scale * 0.35 : 0;
    this.mirrorGfx.clear();
    this.mirrorGfx.lineStyle(7, COLORS.glow, 0.1);
    this.mirrorGfx.lineBetween(a.x, a.y - ext, b.x, b.y + ext);
    this.mirrorGfx.lineStyle(1, COLORS.glow, 0.75);
    this.mirrorGfx.lineBetween(a.x, a.y - ext, b.x, b.y + ext);
  }

  private drawPortal(): void {
    const w = Math.min(contentWidth(this) - SPACE.xl * 2, this.layout.width * this.layout.scale + SPACE.xl * 3);
    const h = Math.min(screenHeight(this) - HUD_HEIGHT - HAND_HEIGHT - SPACE.xl, this.layout.height * this.layout.scale + SPACE.xl * 3);
    const x = this.originX + (this.layout.width * this.layout.scale) / 2;
    const y = this.originY + (this.layout.height * this.layout.scale) / 2;
    this.portalGfx.clear();
    this.portalGfx.fillStyle(COLORS.glow, 0.035);
    this.portalGfx.fillEllipse(x, y, w, h);
    this.portalGfx.lineStyle(12, this.accent(), 0.035);
    this.portalGfx.strokeEllipse(x, y, w, h);
    this.portalGfx.lineStyle(2, this.accent(), 0.18);
    this.portalGfx.strokeEllipse(x, y, Math.max(20, w - 14), Math.max(20, h - 14));
  }

  private celebrateMove(indexes: readonly number[]): void {
    const reduced = services(this).settings().reducedMotion;
    for (const index of indexes) {
      const tile = this.view.tiles[index];
      if (tile !== undefined) this.tiles.get(tile.id)?.pulse(this.accent(), reduced);
    }
    const cx = contentLeft(this) + contentWidth(this) / 2;
    const y = Math.max(HUD_HEIGHT + SPACE.xl * 2, this.originY - SPACE.lg);
    const flow = this.flow > 1 ? ` · Flyt ×${this.flow}` : '';
    this.effects.reward(cx, y, `Harmoni +${this.lastGain}${flow}`, this.accent());
    if (!reduced) this.effects.burst(cx, y + SPACE.lg, this.accent());
  }

  /** Toppen er trekk-telleren, unntatt i blitz der klokken er det eneste som haster. */
  private hudLines(): HudLines {
    const moves = this.level.targetExact
      ? `Trekk ${this.view.movesUsed} / mål ${this.level.target}`
      : `Trekk ${this.view.movesUsed} · mål ukjent`;
    switch (this.modeKind) {
      case 'daily':
        return { top: moves, topSize: HUD_TOP, bottom: `Daglig · ${mmss(this.elapsedMs)}`, harmony: this.harmonyText(), operations: operationSummary(this.level.rules.allowedOps) };
      case 'blitz': {
        const urgent = blitzUrgency(this.clock.remainingMs);
        return {
          top: urgent ? `⚡ ${mmss(this.clock.remainingMs)} ⚡` : mmss(this.clock.remainingMs),
          topSize: HUD_CLOCK,
          bottom: urgent ? `SISTE SEKUNDER · Løst ${services(this).modes.blitz.solved}` : `Løst ${services(this).modes.blitz.solved} · ${moves}`,
          harmony: this.harmonyText(),
          operations: operationSummary(this.level.rules.allowedOps),
          topColor: urgent ? COLORS.danger : COLORS.ink,
          urgent,
        };
      }
      case 'free':
        return { top: moves, topSize: HUD_TOP, bottom: `Fri spilling · Verden ${this.level.world}`, harmony: this.harmonyText(), operations: operationSummary(this.level.rules.allowedOps) };
      case 'campaign': {
        const budget = this.level.showBudget ? ` · Budsjett ${this.view.budgetLeft}` : '';
        return { top: moves, topSize: HUD_TOP, bottom: `Verden ${this.level.world} · Nivå ${this.level.n}${budget}`, harmony: this.harmonyText(), operations: operationSummary(this.level.rules.allowedOps) };
      }
    }
  }

  private harmonyText(): string {
    const flow = this.flow > 1 ? ` · Flyt ×${this.flow}` : '';
    return `Harmoni ${this.harmony.matched}/${this.harmony.total}${flow}`;
  }

  private buildHud(lines: HudLines): void {
    this.hud.removeAll(true);
    const w = contentWidth(this);
    const left = contentLeft(this);
    const y = HUD_HEIGHT / 2;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panel, 0.94);
    bg.fillRect(0, 0, screenWidth(this), HUD_HEIGHT);
    if (lines.urgent === true) {
      bg.fillStyle(COLORS.danger, 0.1);
      bg.fillRect(0, 0, screenWidth(this), HUD_HEIGHT);
    }
    const progressWidth = w - 48;
    const ratio = this.harmony.total === 0 ? 1 : this.harmony.matched / this.harmony.total;
    bg.fillStyle(COLORS.line, 0.55);
    bg.fillRoundedRect(left + 24, HUD_HEIGHT - HUD_STRIPE, progressWidth, HUD_STRIPE, HUD_STRIPE / 2);
    bg.fillStyle(this.accent(), 0.95);
    bg.fillRoundedRect(left + 24, HUD_HEIGHT - HUD_STRIPE, progressWidth * ratio, HUD_STRIPE, HUD_STRIPE / 2);
    this.hud.add(bg);
    // To linjer: én etikettrad på tvers av 390 px kolliderte med trekk-telleren.
    const cx = left + w / 2;
    const title = makeLabel(this, cx + 38, y - SPACE.md, lines.top, { size: lines.topSize, color: lines.topColor, bold: true });
    title.setScale(Math.min(1, (w - 100) / title.width));
    this.hud.add(title);
    const harmony = makeLabel(this, left + w * 0.25, y + SPACE.lg, lines.harmony, { size: 11, color: this.accent(), font: 'body', bold: true });
    harmony.setScale(Math.min(1, (w * 0.44) / harmony.width));
    const context = makeLabel(this, left + w * 0.75, y + SPACE.lg, lines.bottom, { size: 12, color: COLORS.inkMuted, font: 'body' });
    context.setScale(Math.min(1, (w * 0.44) / context.width));
    const operations = makeLabel(this, cx, HUD_HEIGHT - SPACE.md, lines.operations, { size: 11, color: COLORS.inkMuted, font: 'body', bold: true });
    operations.setScale(Math.min(1, (w - SPACE.xl * 2) / operations.width));
    this.hud.add([harmony, context, operations]);
  }

  private buildHand(): void {
    this.hand.removeAll(true);
    const w = contentWidth(this);
    const left = contentLeft(this);
    const cy = screenHeight(this) - HAND_HEIGHT / 2;
    const pitch = w / 4;
    const centerOf = (i: number): number => left + pitch * (i + 0.5);
    const zoneW = pitch - SPACE.md;
    const tray = this.add.graphics();
    tray.fillStyle(COLORS.panel, 0.96);
    tray.fillRoundedRect(left + 2, screenHeight(this) - HAND_HEIGHT, w - 4, HAND_HEIGHT - 8, RADIUS.panel);
    tray.lineStyle(1, COLORS.gold, 0.4);
    tray.lineBetween(left + 20, screenHeight(this) - HAND_HEIGHT, left + w - 20, screenHeight(this) - HAND_HEIGHT);
    this.hand.add(tray);

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
          if (this.inputLocked || this.pendingTweens > 0) return;
          this.dispatch({ type: 'undo' });
          audio.playUndo();
        },
      })
    );
    const skip = this.modeKind === 'blitz';
    this.hand.add(
      makeButton(this, {
        x: centerOf(3),
        y: cy,
        width: zoneW,
        height: ZONE_HEIGHT,
        label: skip ? 'Hopp over' : 'Reset',
        labelSize: skip ? SKIP_LABEL : undefined,
        accent: COLORS.danger,
        onClick: () => {
          if (this.inputLocked || this.pendingTweens > 0) return;
          if (skip) this.skipBlitz();
          else this.dispatch({ type: 'reset' });
        },
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
      mode: this.modeKind,
      view: () => this.view,
      feedback: () => ({ ...this.harmony, gained: this.lastGain, flow: this.flow }),
      screenLayout: () => ({
        slots: this.layout.slots.map((s) => ({ index: s.index, ...this.screenPoint(s.x, s.y) })),
        gaps: this.layout.gaps.map((g) => ({ at: g.at, ...this.screenPoint(g.x, g.y) })),
        tile: this.layout.tile * this.layout.scale,
      }),
      menu: () => (this.menu.visible ? this.menu.positions() : null),
      zones: () => this.zones(),
      busy: () => this.inputLocked || this.pendingTweens > 0,
      renderedTiles: () => [...this.tiles.values()].map((tile) => ({ id: tile.tileId, alpha: tile.alpha, scaleY: tile.scaleY, size: tile.width })),
      state: () => this.machine.state,
      clockMs: () => (this.modeKind === 'blitz' ? this.clock.remainingMs : Math.round(this.elapsedMs)),
      bannerVisible: () => this.banner !== null,
      introVisible: () => this.intro !== null,
      dismissIntro: () => this.dismissIntro(),
    };
  }

  private zones(): { wild: { x: number; y: number }; remove: { x: number; y: number }; undo: { x: number; y: number }; reset: { x: number; y: number } } {
    return this.zoneCache;
  }

  private zoneCache = { wild: { x: 0, y: 0 }, remove: { x: 0, y: 0 }, undo: { x: 0, y: 0 }, reset: { x: 0, y: 0 } };
}
