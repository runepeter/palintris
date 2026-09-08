import type Phaser from 'phaser';

/** 2× gir skarpe Retina-kanter uten 9× pikselarbeid på telefoner med DPR 3. */
export const PIXEL_RATIO = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

export const screenWidth = (scene: Phaser.Scene): number => scene.scale.width / PIXEL_RATIO;
export const screenHeight = (scene: Phaser.Scene): number => scene.scale.height / PIXEL_RATIO;

export const prepareViewport = (scene: Phaser.Scene): void => {
  scene.cameras.main.setZoom(PIXEL_RATIO).centerOn(screenWidth(scene) / 2, screenHeight(scene) / 2);
};
