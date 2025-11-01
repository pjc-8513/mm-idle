import { state } from '../state.js';
import { updateEnemyCard } from '../area.js';

export function applyVisualEffect(effectType, duration = 0.6) {
  for (let row = 0; row < state.enemies.length; row++) {
    for (let col = 0; col < state.enemies[row].length; col++) {
      const enemy = state.enemies[row][col];
      if (!enemy || enemy.hp <= 0) continue;
      
      enemy.visualEffect = effectType;
      enemy.visualEffectTimer = duration;
      updateEnemyCard(enemy, row, col);
    }
  }
}

export function updateVisualEffects(delta) {
  for (let row = 0; row < state.enemies.length; row++) {
    for (let col = 0; col < state.enemies[row].length; col++) {
      const enemy = state.enemies[row][col];
      if (!enemy) continue;
      
      if (enemy.visualEffect && enemy.visualEffectTimer > 0) {
        enemy.visualEffectTimer -= delta;
        
        if (enemy.visualEffectTimer <= 0) {
          enemy.visualEffect = null;
          enemy.visualEffectTimer = 0;
          //console.log(`[light flash] creating flash at ${row}, ${col}`);
          updateEnemyCard(enemy, row, col);
        }
      }
    }
  }
}

/**
 * Flashes the screen with a color (default white) for a brief duration.
 * @param {string} color - Flash color (e.g., 'white', '#ffcc00').
 * @param {number} duration - Duration in ms.
 */
export function flashScreen(color = "white", duration = 500) {
  if (state.activePanel !== "panelArea") return;
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = color;
  overlay.style.opacity = "0.8";
  overlay.style.zIndex = "9999";
  overlay.style.transition = `opacity ${duration / 2}ms ease-out`;
  document.body.appendChild(overlay);

  setTimeout(() => (overlay.style.opacity = "0"), duration / 2);
  setTimeout(() => overlay.remove(), duration);
}

/**
 * Shakes the entire screen or battle container for a brief duration.
 * @param {number} duration - Duration of the shake in milliseconds.
 * @param {number} intensity - Maximum pixel offset for the shake.
 */
export function shakeScreen(duration = 500, intensity = 5) {
  if (state.activePanel !== "panelArea") return;
  const container = document.querySelector("#game") || document.body; 
  if (!container) return;

  const start = Date.now();
  const originalStyle = container.style.transform;

  function animate() {
    const elapsed = Date.now() - start;
    if (elapsed >= duration) {
      container.style.transform = originalStyle;
      return;
    }

    const dx = (Math.random() - 0.5) * intensity * 2;
    const dy = (Math.random() - 0.5) * intensity * 2;
    container.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(animate);
  }

  animate();
}
