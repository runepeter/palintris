import { screenWidth, screenHeight } from './viewport';
import { drawMedallion, makeBackdrop } from './art';
import Phaser from 'phaser';
import { isWorldUnlocked, levelId, LEVELS_PER_WORLD, WORLD_COUNT, type StarMap } from '../core/progression';
import { freeLevelId } from '../game/modes/free';
import { COLORS, DURATION, EASING, SPACE, worldAccent } from '../theme/theme';
import { services } from './services';
import { contentLeft, contentWidth, makeButton, makeLabel, SCENE } from './ui';

interface WorldMapData {
  readonly world?: number;
}

const COLS = 5;
const ROWS = 3;
const WORLD_NAMES = ['Speillunden', 'Månehagen', 'Tidevannstempelet', 'Krystallhvelvet', 'Stjernestien', 'Harmoniens port'];

export class WorldMapScene extends Phaser.Scene {
  private world = 1;

  /** Fast referanse, så teardown kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => {
    this.children.removeAll(true);
    this.build();
  };

  constructor() {
    super(SCENE.worldMap);
  }

  /** Phaser gjenbruker sceneinstansen, så feltet må nullstilles her og ikke bare i initialiseringen. */
  init(data: WorldMapData = {}): void {
    const stars = services(this).store.stars();
    this.world = data.world ?? this.highestUnlocked(stars);
  }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
  }

  private highestUnlocked(stars: StarMap): number {
    for (let w = WORLD_COUNT; w >= 1; w--) {
      if (isWorldUnlocked(w, stars)) return w;
    }
    return 1;
  }

  private build(): void {
    makeBackdrop(this);
    const s = services(this);
    const stars = s.store.stars();
    const width = contentWidth(this);
    const left = contentLeft(this);
    const cx = screenWidth(this) / 2;
    const accent = worldAccent(this.world);
    const compact = screenHeight(this) < 560;

    makeLabel(this, cx, 56, `Verden ${this.world}`, { size: 32, color: accent, bold: true });

    const prevDisabled = this.world <= 1;
    const nextDisabled = this.world >= WORLD_COUNT || !isWorldUnlocked(this.world + 1, stars);
    makeButton(this, {
      x: left + 36, y: 56, width: 56, height: 44, label: '◀', accent, enabled: !prevDisabled,
      onClick: () => this.scene.start(SCENE.worldMap, { world: this.world - 1 }),
    });
    makeButton(this, {
      x: left + width - 36, y: 56, width: 56, height: 44, label: '▶', accent, enabled: !nextDisabled,
      onClick: () => this.scene.start(SCENE.worldMap, { world: this.world + 1 }),
    });

    makeLabel(this, cx, 108, WORLD_NAMES[this.world - 1] ?? '', { size: 19, color: COLORS.ink }).setVisible(!compact);
    const solved = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => stars[levelId(this.world, i + 1)] ?? 0).filter((n) => n > 0).length;
    makeLabel(this, cx, 136, `${solved} / 15 speil åpnet`, { size: 12, color: COLORS.inkMuted, font: 'body' }).setVisible(!compact);
    const gridTop = compact ? 84 : 174;
    const gridBottom = screenHeight(this) - (compact ? 110 : 140);
    const cellW = width / COLS;
    const cellH = Math.min(cellW, (gridBottom - gridTop) / ROWS);
    const gridHeight = cellH * ROWS;
    const gridStartY = gridTop + Math.max(0, (gridBottom - gridTop - gridHeight) / 2);
    const cellSize = Math.min(cellW, cellH) - (compact ? SPACE.sm : SPACE.md);

    const path = this.add.graphics();
    path.lineStyle(2, COLORS.gold, 0.3);
    const positions = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
      const row = Math.floor(i / COLS);
      const col = row % 2 === 0 ? i % COLS : COLS - 1 - i % COLS;
      return { x: left + cellW * (col + 0.5), y: gridStartY + cellH * (row + 0.5) };
    });
    path.strokePoints(positions);
    for (let n = 1; n <= LEVELS_PER_WORLD; n++) {
      const id = levelId(this.world, n);
      const unlocked = s.modes.campaign.isUnlocked(id);
      const starCount = stars[id] ?? 0;
      const position = positions[n - 1];
      if (position === undefined) continue;
      const { x, y } = position;
      this.buildLevelCell(x, y, cellSize, n, id, starCount, unlocked, accent);
    }

    const worldUnlocked = isWorldUnlocked(this.world, stars);
    makeButton(this, {
      x: cx, y: screenHeight(this) - (compact ? 80 : 92), width: 220, height: compact ? 36 : 44, label: 'Fri spilling', accent: COLORS.inkMuted, enabled: worldUnlocked,
      onClick: () => this.scene.start(SCENE.board, { mode: 'free', levelId: freeLevelId(this.world, 1) }),
    });
    makeButton(this, { x: cx, y: screenHeight(this) - (compact ? 34 : 44), width: 180, height: compact ? 40 : 48, label: 'Tilbake', accent, onClick: () => this.scene.start(SCENE.menu) });
  }

  private buildLevelCell(x: number, y: number, size: number, n: number, id: string, starCount: number, unlocked: boolean, accent: number): void {
    const g = drawMedallion(this, 0, 0, size / 2, unlocked ? accent : COLORS.line);
    const numberLabel = makeLabel(this, 0, -size * 0.12, String(n), { size: Math.round(size * 0.32), color: unlocked ? COLORS.ink : COLORS.inkMuted, bold: true });
    const starLabel = makeLabel(this, 0, size * 0.3, '★'.repeat(starCount) + '☆'.repeat(3 - starCount), { size: Math.round(size * 0.18), color: starCount > 0 ? COLORS.star : COLORS.line, font: 'body' });
    const c = this.add.container(x, y, [g, numberLabel, starLabel]);
    c.setSize(size, size);
    if (!unlocked) return;
    c.setInteractive({ useHandCursor: true });
    // Rask inn/ut-hovring kunne stable opp konkurrerende skaleringstweens; drep forrige først.
    c.on('pointerover', () => {
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, scale: 1.05, duration: DURATION.snap, ease: EASING.pop });
    });
    c.on('pointerout', () => {
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, scale: 1, duration: DURATION.snap, ease: EASING.pop });
    });
    c.on('pointerup', () => this.scene.start(SCENE.board, { mode: 'campaign', levelId: id }));
  }
}
