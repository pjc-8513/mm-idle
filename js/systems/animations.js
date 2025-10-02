// animations.js
import { state } from '../state.js';
import { emit, on } from '../events.js';
import { getEnemyCanvasPosition } from "../area.js";
import { abilities } from "../content/abilities.js";

export function initAnimations() {
  console.log('Animations initializing...');
  // Listen for game events
  on('coinAnimation', handleCoinAnimation);
  on('skillAnimation', handleSkillAnimation);
}

export function handleCoinAnimation(position) {
  if (state.activePanel !== "panelArea") return;
  
  const pos = getEnemyCanvasPosition(position.row, position.col);
  const canvas = document.getElementById("enemyEffectsCanvas");
  
  if (!canvas) {
    console.log("no canvas (animations)");
    return;
  }
  
  if (state.ui?.spriteAnimations && pos) {
    state.ui.spriteAnimations.playAnimation({
      targets: [pos],
      spritePath: "../assets/images/sprites/coin_drops2.png", 
      frameWidth: 65,
      frameHeight: 90,
      frameCount: 6,
      frameRate: 12  // 12 frames per second (was 5 ticks/frame = ~12fps at 60fps)
    });
  }
}

export function handleSkillAnimation(id, row, col) {
  console.log('Triggering skill animation at: ', row, col);
  if (state.activePanel !== "panelArea") return;
  
  const pos = getEnemyCanvasPosition(row, col);
  const canvas = document.getElementById("enemyEffectsCanvas");
  
  if (!canvas) {
    console.log("no canvas (animations)");
    return;
  }
  
  if (state.ui?.spriteAnimations && pos) {
    const skillSpritePath = abilities.find((a) => a.id === id)?.spritePath;
    console.log("[followThrough animation] spritePath: ", skillSpritePath);
    
    if (!skillSpritePath) return;
    
    state.ui.spriteAnimations.playAnimation({
      targets: [pos],
      spritePath: skillSpritePath, 
      frameWidth: 80,
      frameHeight: 90,
      frameCount: 4,
      frameRate: 12  // 12 frames per second
    });
  }
}