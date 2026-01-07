import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

/**
 * Screen-level effects for camera shake, flash overlays, and slow motion
 * Provides juicy feedback for game actions
 */
export class ScreenEffects {
  private scene: Phaser.Scene;
  private flashOverlay: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Shake the camera for impact feedback
   * @param intensity - Shake intensity (0.002 = subtle, 0.01 = intense)
   * @param duration - Duration in milliseconds
   */
  public shake(intensity: number, duration: number): void {
    if (this.scene.cameras.main) {
      this.scene.cameras.main.shake(duration, intensity);
    }
  }

  /**
   * Flash colored overlay on screen
   * @param color - Hex color (e.g., 0x00ff88 for success green)
   * @param alpha - Opacity (0-1, typical 0.3-0.5)
   * @param duration - Duration in milliseconds
   */
  public flash(color: number, alpha: number, duration: number): void {
    // Clean up existing overlay
    if (this.flashOverlay) {
      this.flashOverlay.destroy();
    }

    // Create full-screen colored overlay
    this.flashOverlay = this.scene.add.graphics();
    this.flashOverlay.fillStyle(color, alpha);
    this.flashOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.flashOverlay.setDepth(9999); // Always on top

    // Fade out and destroy
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.flashOverlay?.destroy();
        this.flashOverlay = null;
      },
    });
  }

  /**
   * Slow down game time for dramatic effect
   * @param factor - Time scale factor (0.5 = half speed, 0.2 = super slow)
   * @param duration - Duration in REAL TIME milliseconds
   */
  public slowMotion(factor: number, duration: number): void {
    // Set slow motion
    this.scene.time.timeScale = factor;

    // Restore normal speed after duration
    this.scene.time.delayedCall(duration / factor, () => {
      this.scene.time.timeScale = 1.0;
    });
  }

  /**
   * Zoom effect for emphasis (zoom in then back)
   * @param intensity - Zoom amount (1.1 = 110% size)
   * @param duration - Duration in milliseconds
   */
  public zoomPulse(intensity: number, duration: number): void {
    const camera = this.scene.cameras.main;
    if (!camera) return;

    const originalZoom = camera.zoom;

    this.scene.tweens.add({
      targets: camera,
      zoom: originalZoom * intensity,
      duration: duration / 2,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Vignette effect - darken edges for focus
   * @param intensity - Darkness (0-1)
   * @param duration - Fade in duration
   * @param holdTime - How long to hold before fading out (0 = permanent until cleared)
   */
  public vignette(intensity: number, duration: number, holdTime: number = 0): Phaser.GameObjects.Graphics {
    const vignette = this.scene.add.graphics();
    vignette.setDepth(9998);

    // Draw gradient vignette (approximated with concentric rectangles)
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const alpha = intensity * t * t; // Quadratic falloff
      const inset = (GAME_WIDTH / 2) * (1 - t);

      vignette.lineStyle(inset / steps, 0x000000, alpha);
      vignette.strokeRect(
        inset,
        inset * (GAME_HEIGHT / GAME_WIDTH),
        GAME_WIDTH - inset * 2,
        GAME_HEIGHT - inset * 2 * (GAME_HEIGHT / GAME_WIDTH)
      );
    }

    // Fade in
    vignette.setAlpha(0);
    this.scene.tweens.add({
      targets: vignette,
      alpha: 1,
      duration,
      ease: 'Cubic.easeIn',
    });

    // Auto fade out after hold time
    if (holdTime > 0) {
      this.scene.time.delayedCall(holdTime + duration, () => {
        this.scene.tweens.add({
          targets: vignette,
          alpha: 0,
          duration,
          ease: 'Cubic.easeOut',
          onComplete: () => vignette.destroy(),
        });
      });
    }

    return vignette;
  }

  /**
   * Freeze frame effect - pause with dramatic flash
   * @param duration - Freeze duration in milliseconds
   * @param flashColor - Optional flash color
   */
  public freezeFrame(duration: number, flashColor: number = 0xffffff): void {
    // Flash
    this.flash(flashColor, 0.8, 100);

    // Pause game
    this.scene.time.timeScale = 0;

    // Resume after duration
    this.scene.time.delayedCall(duration, () => {
      this.scene.time.timeScale = 1.0;
    });
  }

  /**
   * Screen distortion ripple effect from a point
   * @param _x - World X coordinate (reserved for future shader implementation)
   * @param _y - World Y coordinate (reserved for future shader implementation)
   * @param intensity - Ripple strength
   * @param duration - Animation duration
   */
  public ripple(_x: number, _y: number, intensity: number = 0.01, duration: number = 600): void {
    const camera = this.scene.cameras.main;
    if (!camera) return;

    // Create ripple shader effect (simplified with camera shake)
    // In a full implementation, this would use a custom shader
    this.shake(intensity, duration);
  }

  /**
   * Cleanup method - call when scene is destroyed
   */
  public destroy(): void {
    if (this.flashOverlay) {
      this.flashOverlay.destroy();
      this.flashOverlay = null;
    }
  }
}
