import Phaser from 'phaser';
import { parseLevelId } from '../core/progression';
import { audio } from '../audio/sound';
import { COLORS, cssColor, FONTS } from '../theme/theme';
import { createServices, installServices } from './services';
import { SCENE } from './ui';

const FONT_TIMEOUT_MS = 2000;

const loadFonts = async (): Promise<void> => {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const loads = [document.fonts.load(`600 24px ${FONTS.display}`), document.fonts.load(`400 16px ${FONTS.body}`)];
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
  await Promise.race([Promise.all(loads).then(() => undefined), timeout]);
};

export class BootScene2 extends Phaser.Scene {
  constructor() {
    super(SCENE.boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(cssColor(COLORS.background));
    const s = createServices();
    installServices(this.game, s);
    audio.configure({ sound: s.settings().sound, music: s.settings().music });
    void loadFonts().then(() => this.next());
  }

  private next(): void {
    const level = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('level') : null;
    if (level !== null && parseLevelId(level) !== null && this.scene.get(SCENE.board) !== null) {
      this.scene.start(SCENE.board, { levelId: level });
      return;
    }
    this.scene.start(SCENE.menu);
  }
}
