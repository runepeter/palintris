import Phaser from 'phaser';
import { parseLevelId } from '../core/progression';
import { audio } from '../audio/sound';
import { COLORS, cssColor, FONTS } from '../theme/theme';
import { createServices, installServices } from './services';
import { SCENE } from './ui';
import { ART, registerJewelFrames } from './art';

const FONT_TIMEOUT_MS = 2000;

const loadFonts = async (): Promise<void> => {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const loads = [document.fonts.load(`600 24px ${FONTS.display}`), document.fonts.load(`400 16px ${FONTS.body}`)];
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
  await Promise.race([Promise.allSettled(loads).then(() => undefined), timeout]);
};

export class BootScene extends Phaser.Scene {
  private assetFailed = false;

  constructor() {
    super(SCENE.boot);
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => { this.assetFailed = true; });
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      const progress = document.getElementById('loading-progress') as HTMLProgressElement | null;
      if (progress !== null) progress.value = value;
    });
    this.load.image(ART.realm, 'assets/mirror-realm.webp');
    this.load.image(ART.jewels, 'assets/jewel-tiles.webp');
    this.load.image(ART.wild, 'assets/wild-jewel.webp');
  }

  create(): void {
    if (this.assetFailed) {
      const message = document.getElementById('loading-message');
      if (message !== null) message.textContent = 'Kunne ikke laste spillet. Sjekk forbindelsen og prøv igjen.';
      document.getElementById('loading-progress')?.setAttribute('hidden', '');
      const retry = document.getElementById('retry-loading');
      retry?.removeAttribute('hidden');
      retry?.addEventListener('click', () => window.location.reload(), { once: true });
      return;
    }
    registerJewelFrames(this);
    this.cameras.main.setBackgroundColor(cssColor(COLORS.background));
    const s = createServices();
    installServices(this.game, s);
    audio.configure({ sound: s.settings().sound, music: s.settings().music });
    void loadFonts().then(() => this.next(), () => this.next());
  }

  private next(): void {
    document.getElementById('loading')?.remove();
    const params = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
    const hasBoard = this.scene.get(SCENE.board) !== null;
    const mode = params?.get('mode') ?? null;
    if (mode === 'sticky' && hasBoard) {
      this.scene.start(SCENE.board, { mode, levelId: params?.get('level') ?? '' });
      return;
    }
    if ((mode === 'daily' || mode === 'blitz') && hasBoard) {
      this.scene.start(SCENE.board, { mode });
      return;
    }
    const level = params?.get('level') ?? null;
    if (level !== null && parseLevelId(level) !== null && hasBoard) {
      this.scene.start(SCENE.board, { mode: 'campaign', levelId: level });
      return;
    }
    this.scene.start(SCENE.menu);
  }
}
