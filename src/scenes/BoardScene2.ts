import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { matches } from '../core/palindrome';
import { GestureMachine } from '../game/gestures';
import { KeyboardController } from '../game/keyboard';
import type { BoardLayout, LayoutKind } from '../game/layout';
import { computeLayout } from '../game/layout';
import type { ModeLevel } from '../game/modes/types';
import type { SessionView } from '../game/session';
import { BoardSession } from '../game/session';
import { COLORS, durations, EASING, SPACE, worldAccent } from '../theme/theme';
import { Effects } from './effects';
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
  /** Task 5 bruker denne til trykk-, feil- og seiersrespons. */
  effects!: Effects;
  private layout!: BoardLayout;
  private originX = 0;
  private originY = 0;
  private tiles = new Map<number, TileView>();
  private mirrorGfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Container;
  private hand!: Phaser.GameObjects.Container;
  /** Task 5 bygger segmentmenyen. */
  menu: Phaser.GameObjects.Container | null = null;
  /** Task 5 bygger blindvei-banneret. */
  banner: Phaser.GameObjects.Container | null = null;
  private inputLocked = false;
  private pendingTweens = 0;
  private lastKind: LayoutKind | null = null;
  private view!: SessionView;
  private d = durations(false);

  constructor() {
    super(SCENE.board);
  }

  init(data: BoardData): void {
    this.levelId = data.levelId;
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
    this.hud = this.add.container(0, 0).setDepth(10);
    this.hand = this.add.container(0, 0).setDepth(10);
    this.relayout();
    this.render(false);
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.relayout();
      this.render(false);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    installHook(this.makeHook());
    // Task 5 legger til setupInput() her.
  }

  override update(time: number): void {
    // Task 5: this.machine.tick(time) og segmentmarkering.
    void time;
    if (this.inputLocked && this.pendingTweens === 0) this.inputLocked = false;
  }

  private teardown(): void {
    removeHook();
    this.session.dispose();
  }

  /** Brettområdet: mellom HUD og hånd, maks 480 bredt, sentrert. */
  private relayout(): void {
    const w = contentWidth(this);
    const left = contentLeft(this);
    const boardTop = HUD_HEIGHT;
    const boardHeight = this.scale.height - HUD_HEIGHT - HAND_HEIGHT;
    this.layout = computeLayout({ count: this.view.tiles.length, width: w, height: boardHeight });
    this.originX = left + (w - this.layout.width * this.layout.scale) / 2;
    this.originY = boardTop + (boardHeight - this.layout.height * this.layout.scale) / 2;
    this.drawMirror();
    this.buildHud();
    this.buildHand();
  }

  /** Tegner alt fra this.view: brikker (opprett/oppdater/fjern etter id), speillinje, HUD, hånd. animate styrer om brikker tweenes til plass. */
  private render(animate: boolean): void {
    this.relayout();
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
          this.tweens.add({ targets: v, scale: 1, duration: this.d.normal, ease: EASING.pop });
        }
      }
      v.setTile(tile, size, colorBlind);
      if (animate && (v.x !== p.x || v.y !== p.y)) {
        this.pendingTweens++;
        this.tweens.add({
          targets: v,
          x: p.x,
          y: p.y,
          duration: this.d.normal,
          ease: EASING.move,
          onComplete: () => {
            this.pendingTweens--;
          },
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
          this.pendingTweens--;
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
    // Task 5: banner for deadEnd, løsning → Result.
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
      menu: () => null, // Task 5
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
