// spriteAnimationSystem.js
import { floatingTextManager } from "./floatingtext.js";

export class spriteAnimationManager {
  constructor(ctx, tileSize = 64) {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.tileSize = tileSize;
    this.activeAnimations = [];
  }

  loadSpriteSheet(src, frameWidth, frameHeight, callback) {
    const image = new Image();
    image.src = src;
    image.onload = () => {
      const columns = Math.floor(image.width / frameWidth);
      callback({ image, frameWidth, frameHeight, columns });
    };
  }

  playAnimation({ type, targets, spritePath, frameWidth, frameHeight, frameCount, frameRate }) {
    this.loadSpriteSheet(spritePath, frameWidth, frameHeight, (sheet) => {
      for (const { x, y } of targets) {
        this.activeAnimations.push({
          ...sheet,
          x: x,
          y: y,
          frameCount,
          frameRate,
          currentFrame: 0,
          frameDuration: 1 / frameRate, // seconds per frame
          elapsed: 0,
          totalDuration: frameCount / frameRate // total animation duration in seconds
        });
      }
    });
  }

  // Update with delta time (seconds)
  update(delta = 1/60) {
    for (const anim of this.activeAnimations) {
      anim.elapsed += delta;
      anim.currentFrame = Math.floor(anim.elapsed / anim.frameDuration);
    }
    
    // Remove completed animations
    this.activeAnimations = this.activeAnimations.filter(
      (anim) => anim.elapsed < anim.totalDuration
    );
  }

  draw() {
    for (const anim of this.activeAnimations) {
      const frame = Math.min(anim.currentFrame, anim.frameCount - 1);
      const sx = (frame % anim.columns) * anim.frameWidth;
      const sy = Math.floor(frame / anim.columns) * anim.frameHeight;

      this.ctx.drawImage(
        anim.image,
        sx, sy, anim.frameWidth, anim.frameHeight,
        anim.x, anim.y, anim.frameWidth, anim.frameHeight
      );
    }
  }
}