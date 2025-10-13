// systems/radiantEffect.js
// Creates radiant glow and pulse effects for Cleric's light attacks
// Also creates vampire mist effects
// Works with the existing enemyEffectsCanvas

const radiantBursts = [];
let radiantPulse = null;
const vampireMistParticles = [];

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

// called when cleric's AOE triggers
export function createRadiantBurst(x, y) {
  radiantBursts.push({
    x,
    y,
    life: 0,
    maxLife: 0.8, // seconds
    maxRadius: 60 + Math.random() * 20,
    opacity: 1
  });
}

// optional: create a big central pulse when the cleric's ability triggers
export function createRadiantPulse() {
  radiantPulse = {
    life: 0,
    maxLife: 1.5,
    maxRadius: 400, // how far the light expands
    opacity: 0.6
  };
}

// 🧛 Create vampire mist effect that rises to the timer
export function createVampireMist(secondsRestored) {
  const canvas = document.getElementById("enemyEffectsCanvas");
  if (!canvas) return;

  // Get timer position (you may need to adjust these coordinates based on your layout)
  const timerX = canvas.width / 2;
  const timerY = 50; // Adjust based on where your timer is

  // Create multiple mist particles for a thick, eerie effect
  const particleCount = Math.min(30 + Math.floor(secondsRestored / 2), 60); // More particles for bigger heals
  
  for (let i = 0; i < particleCount; i++) {
    const startX = canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.6;
    const startY = canvas.height - 50 + Math.random() * 50;
    
    vampireMistParticles.push({
      x: startX,
      y: startY,
      targetX: timerX + (Math.random() - 0.5) * 100,
      targetY: timerY + (Math.random() - 0.5) * 40,
      life: 0,
      maxLife: 1.5 + Math.random() * 0.5, // 1.5-2 seconds to rise
      size: 15 + Math.random() * 25,
      opacity: 0.4 + Math.random() * 0.3,
      swayOffset: Math.random() * Math.PI * 2, // For wavy movement
      swaySpeed: 2 + Math.random() * 2
    });
  }
}

// main update & render
export function updateRadiantEffects(delta) {
  const canvas = document.getElementById("enemyEffectsCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Draw radiant pulse first (so bursts glow on top)
  if (radiantPulse) {
    radiantPulse.life += delta;
    const p = radiantPulse.life / radiantPulse.maxLife;
    if (p >= 1) radiantPulse = null;
    else {
      const radius = radiantPulse.maxRadius * p;
      const alpha = radiantPulse.opacity * (1 - p);
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        radius
      );
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(0.4, `rgba(255,245,200,${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Draw individual radiant bursts
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
    const inner = `rgba(255, 255, 255, ${b.opacity})`;
    const mid = `rgba(255, 240, 180, ${b.opacity * 0.5})`;
    const outer = `rgba(255, 255, 255, 0)`;

    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.5, mid);
    gradient.addColorStop(1, outer);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 🧛 Draw vampire mist particles
  for (let i = vampireMistParticles.length - 1; i >= 0; i--) {
    const p = vampireMistParticles[i];
    p.life += delta;
    
    if (p.life >= p.maxLife) {
      vampireMistParticles.splice(i, 1);
      continue;
    }

    const progress = p.life / p.maxLife;
    
    // Ease-in-out for smooth movement
    const easeProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    // Interpolate position from start to target
    const currentX = p.x + (p.targetX - p.x) * easeProgress;
    const currentY = p.y + (p.targetY - p.y) * easeProgress;
    
    // Add wavy horizontal motion
    const sway = Math.sin(p.swayOffset + p.life * p.swaySpeed) * 20 * (1 - progress);
    
    // Fade in, stay visible, then fade out at the end
    let alpha;
    if (progress < 0.2) {
      alpha = progress / 0.2; // Fade in
    } else if (progress > 0.8) {
      alpha = (1 - progress) / 0.2; // Fade out
    } else {
      alpha = 1; // Full opacity in middle
    }
    alpha *= p.opacity;

    // Draw the mist particle with gradient for ethereal effect
    const gradient = ctx.createRadialGradient(
      currentX + sway, currentY, 0,
      currentX + sway, currentY, p.size
    );
    
    // Purple/dark violet colors for vampire mist
    gradient.addColorStop(0, `rgba(138, 43, 226, ${alpha})`); // Blue-violet
    gradient.addColorStop(0.3, `rgba(75, 0, 130, ${alpha * 0.8})`); // Indigo
    gradient.addColorStop(0.6, `rgba(106, 13, 173, ${alpha * 0.5})`); // Dark violet
    gradient.addColorStop(1, `rgba(75, 0, 130, 0)`); // Fade to transparent

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(currentX + sway, currentY, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}