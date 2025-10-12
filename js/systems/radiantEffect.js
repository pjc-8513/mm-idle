// effects/radiantEffect.js

import { getEnemyCanvasPosition } from "../area.js";
import { state } from "../state.js";

const radiantBursts = [];

export function spawnRadiantBurst(row, col) {
  if (state.activePanel !== "panelArea") return;

  const canvas = document.getElementById("enemyEffectsCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const pos = getEnemyCanvasPosition(row, col);
  if (!pos) return;

  const burst = {
    x: pos.x,
    y: pos.y,
    radius: 0,
    maxRadius: 60 + Math.random() * 20,
    opacity: 1,
    life: 0,
    maxLife: 0.6, // seconds
    colorStops: ["#fff8e1", "#fff176", "#ffd54f", "#fbc02d", "#f57f17"]
  };

  radiantBursts.push(burst);
}

export function updateRadiantEffects(delta) {
  const canvas = document.getElementById("enemyEffectsCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = radiantBursts.length - 1; i >= 0; i--) {
    const b = radiantBursts[i];
    b.life += delta;
    if (b.life >= b.maxLife) {
      radiantBursts.splice(i, 1);
      continue;
    }

    const progress = b.life / b.maxLife;
    b.radius = b.maxRadius * progress;
    b.opacity = 1 - progress;

    const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);

    // use RGBA with opacity fade
    const inner = `rgba(255, 248, 225, ${b.opacity})`; // soft yellow-white center
    const mid = `rgba(255, 235, 130, ${b.opacity * 0.6})`;
    const outer = `rgba(255, 255, 255, 0)`; // fade to transparent

    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.5, mid);
    gradient.addColorStop(1, outer);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

