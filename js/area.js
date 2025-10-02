// area.js
import { state } from "./state.js";
import { emit, on } from "./events.js";
import { AREA_TEMPLATES } from "./content/areaDefs.js";
import { ENEMY_TEMPLATES } from "./content/enemyDefs.js";
import { classes } from "./content/classes.js";
import { spriteAnimationManager } from "./systems/spriteAnimationSystem.js ";
import { setTarget } from "./systems/combatSystem.js";
import { floatingTextManager } from "./systems/floatingtext.js";

/* -------------------------
   Wave Timer Management
   -------------------------*/
let waveTimer = null;
let timeRemaining = 40;
let maxTime = 40;

function startWaveTimer() {
  stopWaveTimer(); // Clear any existing timer
  timeRemaining = maxTime;
  updateTimerDisplay();
  
  waveTimer = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    
    if (timeRemaining <= 0) {
      stopWaveTimer();
      emit("waveTimedOut");
    }
  }, 1000);
}

function stopWaveTimer() {
  if (waveTimer) {
    clearInterval(waveTimer);
    waveTimer = null;
  }
}

function updateTimerDisplay() {
  const timerBar = document.getElementById("waveTimerBar");
  const timerText = document.getElementById("waveTimerText");
  
  if (timerBar && timerText) {
    const percentage = (timeRemaining / maxTime) * 100;
    timerBar.style.width = `${percentage}%`;
    timerText.textContent = `${timeRemaining}s`;
    
    // Color changes based on time remaining
    if (percentage > 50) {
      timerBar.style.background = "linear-gradient(90deg, #2196f3 0%, #03a9f4 100%)";
    } else if (percentage > 20) {
      timerBar.style.background = "linear-gradient(90deg, #ff9800 0%, #ffc107 100%)";
    } else {
      timerBar.style.background = "linear-gradient(90deg, #f44336 0%, #ff5722 100%)";
    }
  }
}

export function addWaveTime(seconds) {
  timeRemaining = Math.min(timeRemaining + seconds, maxTime * 2); // Cap at 2x max time
  updateTimerDisplay();
}

export function getTimeRemaining() {
  return timeRemaining;
}

export function getBonusGoldMultiplier() {
  // More time remaining = more bonus gold
  const timeBonus = timeRemaining / maxTime;
  return 1 + (timeBonus * 0.5); // Up to 50% bonus for clearing quickly
}

/* -------------------------
   Public init / render API
   -------------------------*/
export function initAreaPanel() {
  // Re-render whenever area / enemy / player events happen
  const events = [
    "areaChanged",
    "areaCompleted",
    "areaReset",
    "waveStarted",
    "enemyDefeated",
    "enemyDamaged",
    "playerDamaged",
    "playerHealed",
    "waveCleared",
    "waveTimedOut",
    "partyChanged" // Add party change event
  ];
  events.forEach(ev => on(ev, () => {
    const panel = document.getElementById("panelArea");
    if (panel && panel.classList.contains("active")) {
      // Only render if enemies grid doesn't exist, otherwise just update
      if (!document.getElementById("enemiesGrid")) {
        renderAreaPanel();
        setupEnemyEffectsCanvas();
        console.log("Area panel rendered due to event:", ev);
      } else {
        updateEnemiesGrid();
      }
    }
  }));
  
  on ("waveStarted", () => {
    updateAreaPanel();
    setupEnemyEffectsCanvas();
    updateEnemiesGrid();
    startWaveTimer();
  });

  on ("partyChanged", () => {
    renderPartyDisplay();
    updateAreaPanel();
  });
/*
  // Start timer when wave starts
  on("waveStarted", () => {
    
  });
*/  
  // Stop timer when wave is cleared
  on("waveCleared", () => {
    stopWaveTimer();
  });
  
  // Handle wave timeout
  on("waveTimedOut", () => {
    // Reset to wave 1 and restart area
    state.currentWave = state.baseLevel;
    emit("areaReset");
  });
}


export function renderAreaPanel() {
  const panel = document.getElementById("panelArea");
  if (!panel) return;

  const currentArea = AREA_TEMPLATES[state.currentArea];
  if (!currentArea) {
    panel.innerHTML = "<p>No area selected</p>";
    return;
  }

  // Only render layout once
  if (!panel.querySelector(".area-content")) {
    panel.innerHTML = `
      <div class="area-content">
        <div class="area-main">
          <div class="area-header">
            <h2 id="areaName">${currentArea.name}</h2>
            <p id="areaDescription" class="area-description">${currentArea.description}</p>
            <div class="area-info">
              <span id="waveInfo">Wave: ${state.areaWave}/${currentArea.maxWaves}</span>
            </div>
          </div>
          <div class="wave-timer-section">
            <div class="timer-container">
              <div class="timer-bar-background">
                <div id="waveTimerBar" class="timer-bar"></div>
              </div>
              <div id="waveTimerText" class="timer-text">${timeRemaining}s</div>
            </div>
          </div>
          <div class="battle-section">
            <div class="enemies-section">
              <h3>Enemies</h3>
              <canvas id="enemyEffectsCanvas"></canvas>
              <div id="enemiesGrid" class="enemyGrid"></div>
            </div>
            <div class="party-section">
              <h3>Party</h3>
              <div id="partyDisplay" class="party-vertical"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    addEnemiesGridCSS();
    addVerticalPartyCSS();
    setupEnemyEffectsCanvas(); // Only once
  }

  updateAreaPanel(); // Dynamic updates
}


export function updateAreaPanel() {
  const currentArea = AREA_TEMPLATES[state.currentArea];
  if (!currentArea) return;

  document.getElementById("areaName").textContent = currentArea.name;
  document.getElementById("areaDescription").textContent = currentArea.description;
  document.getElementById("waveInfo").textContent = `Wave: ${state.areaWave}/${currentArea.maxWaves}`;
  document.getElementById("waveTimerText").textContent = `${timeRemaining}s`;

  const grid = document.getElementById("enemiesGrid");
  if (grid) grid.innerHTML = renderEnemiesGrid();

  const party = document.getElementById("partyDisplay");
  if (party) party.innerHTML = renderPartyDisplay();

  resizeEnemyEffectsCanvas();
}


function renderPartyDisplay() {
  if (!state.party || state.party.length === 0) {
    return '<div class="no-party">No party members</div>';
  }
  
  let partyHTML = '';
  console.log("Rendering party members:", state.party);
  state.party.forEach(member => {
    const cls = classes.find(c => c.id === member.id);
    if (cls) {
      partyHTML += renderPartyMember(member, cls);
      console.log("Rendered party member:", member);
    }
  });
  
  return partyHTML;
}

function renderPartyMember(member, cls) {
  const level = state.classLevels[cls.id] || 1;
  
  return `
    <div class="party-member-vertical" data-class-id="${cls.id}">
      <div class="party-image-vertical">
        <img src="../assets/images/classes/${cls.id}.png" alt="${cls.name}" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="party-placeholder-vertical" style="display: none;">${cls.name[0]}</div>
      </div>
      <div class="party-info-vertical">
        <div class="party-name-vertical">${cls.name}</div>
        <div class="party-level-vertical">Lv.${level}</div>
      </div>
    </div>
  `;
}

function updatePartyDisplay() {
  const partyDisplay = document.getElementById("partyDisplay");
  if (partyDisplay) {
    partyDisplay.innerHTML = renderPartyDisplay();
  }
}

function renderEnemiesGrid() {
  let gridHTML = "";

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const enemy = state.enemies[row] && state.enemies[row][col];
      gridHTML += `<div class="enemy-slot" data-row="${row}" data-col="${col}">`;

      if (enemy) {
        gridHTML += renderEnemyCard(enemy, row, col);
      } else {
        gridHTML += '<div class="empty-slot">Empty</div>';
      }

      gridHTML += '</div>';
    }
  }

  return gridHTML;
}


export function resizeEnemyEffectsCanvas() {
  const canvas = document.getElementById("enemyEffectsCanvas");
  const grid = document.getElementById("enemiesGrid");
  if (!canvas || !grid) return;

  const rect = grid.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height +230; 
}




window.addEventListener("resize", resizeEnemyEffectsCanvas);


function renderEnemyCard(enemy, row, col) {
  const template = ENEMY_TEMPLATES[enemy.id];
  const hpPercentage = (enemy.hp / enemy.maxHp) * 100;
  
  return `
    <div class="enemy-card" id="enemy-${row}-${col}">
      <div class="enemy-name">${enemy.name || template.baseName}</div>
      <div class="enemy-level">Lv.${enemy.level}</div>
      <div class="enemy-type">${template.type}</div>
      <div class="enemy-hp">
        <div class="hp-bar">
          <div class="hp-fill" style="width: ${hpPercentage}%"></div>
        </div>
        <div class="hp-text">${enemy.hp}/${enemy.maxHp}</div>
      </div>
      ${enemy.statusEffects && enemy.statusEffects.length > 0 ? 
        `<div class="status-effects">
          ${enemy.statusEffects.map(effect => `<span class="status ${effect.type}">${effect.type}</span>`).join('')}
        </div>` : ''
      }
    </div>
  `;
}

export function updateEnemiesGrid() {
  if (!Array.isArray(state.enemies)) {
    console.warn("Enemies is not an array:", state.enemies);
    return;
  }

  // Safe to proceed
  const firstEnemyGroup = state.enemies[0];
  if (!Array.isArray(firstEnemyGroup)) {
    console.warn("First enemy group is invalid:", firstEnemyGroup);
    return;
  }

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const enemy = state.enemies[row] && state.enemies[row][col];
      const slot = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      
      if (!slot) continue;
      
      if (enemy) {
        // Update existing enemy or create new enemy card
        const existingCard = slot.querySelector('.enemy-card');
        if (existingCard) {
          updateEnemyCard(enemy, row, col);
        } else {
          // Replace empty slot with enemy card
          slot.innerHTML = renderEnemyCard(enemy, row, col);
        }
      } else {
        // Remove enemy card and show empty slot
        slot.innerHTML = '<div class="empty-slot">Empty</div>';
      }
    }
  }
  resizeEnemyEffectsCanvas();
}

function updateEnemyCard(enemy, row, col) {
  const card = document.getElementById(`enemy-${row}-${col}`);
  if (!card) return;
  
  const template = ENEMY_TEMPLATES[enemy.id];
  const hpPercentage = (enemy.hp / enemy.maxHp) * 100;
  
  // Update HP bar and text
  const hpFill = card.querySelector('.hp-fill');
  const hpText = card.querySelector('.hp-text');
  if (hpFill) hpFill.style.width = `${hpPercentage}%`;
  if (hpText) hpText.textContent = `${enemy.hp}/${enemy.maxHp}`;
  
  // Update status effects
  const statusContainer = card.querySelector('.status-effects');
  if (enemy.statusEffects && enemy.statusEffects.length > 0) {
    const statusHTML = enemy.statusEffects.map(effect => 
      `<span class="status ${effect.type}">${effect.type}</span>`
    ).join('');
    
    if (statusContainer) {
      statusContainer.innerHTML = statusHTML;
    } else {
      // Add status effects container if it doesn't exist
      const statusDiv = document.createElement('div');
      statusDiv.className = 'status-effects';
      statusDiv.innerHTML = statusHTML;
      card.appendChild(statusDiv);
    }
  } else if (statusContainer) {
    // Remove status effects if none exist
    statusContainer.remove();
  }

  // Set target on click
  card.onclick = () => {
    setTarget(row, col);
    console.log(`Set target to enemy at [${row}, ${col}]`);
  };
  
  // Add damage animation class if enemy was just damaged
  if (enemy.justDamaged) {
    card.classList.add('damaged');
    setTimeout(() => {
      card.classList.remove('damaged');
      enemy.justDamaged = false;
    }, 500);
  }
}

function addEnemiesGridCSS() {
  // Check if CSS is already added
  if (document.getElementById('enemies-grid-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'enemies-grid-styles';
  style.textContent = `
    .wave-timer-section {
      margin: 12px 0;
      padding: 12px;
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-radius: 8px;
      border: 2px solid #2196f3;
    }
    
    .timer-container {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }
    
    .timer-bar-background {
      flex: 1;
      height: 16px;
      background: #ddd;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #bbb;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .timer-bar {
      height: 100%;
      background: linear-gradient(90deg, #2196f3 0%, #03a9f4 100%);
      width: 100%;
      transition: width 1s linear, background 0.3s ease;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(33,150,243,0.3);
    }
    
    .timer-text {
      font-weight: bold;
      font-size: 1em;
      color: #1976d2;
      min-width: 30px;
      text-align: center;
    }
    
    
    .area-header {
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    
    .area-info {
      display: flex;
      gap: 20px;
      margin-top: 8px;
      font-size: 0.85em;
      color: #666;
    }
    
    .enemies-section h3 {
      margin-bottom: 8px;
      color: #444;
      font-size: 1.1em;
    }
    
    .enemy-slot {
      aspect-ratio: 1;
      min-height: 95px;
      max-height: 110px;
      border: 2px solid #ddd;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .empty-slot {
      color: #999;
      font-style: italic;
      text-align: center;
    }
    
    .enemy-card {
      width: 100%;
      height: 100%;
      padding: 6px;
      background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 0.75em;
      position: relative;
      transition: all 0.3s ease;
    }
    
    .enemy-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 3px 6px rgba(0,0,0,0.1);
    }
    
    .enemy-card.damaged {
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
      animation: damageFlash 0.5s ease-in-out;
    }
    
    @keyframes damageFlash {
      0% { background: linear-gradient(135deg, #ff5722 0%, #f44336 100%); }
      100% { background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); }
    }
    
    .enemy-name {
      font-weight: bold;
      font-size: 0.85em;
      color: #333;
      text-align: center;
      margin-bottom: 1px;
      line-height: 1.1;
    }
    
    .enemy-level {
      text-align: center;
      color: #666;
      font-size: 0.75em;
      margin-bottom: 1px;
      line-height: 1.1;
    }
    
    .enemy-type {
      text-align: center;
      color: #888;
      font-size: 0.7em;
      margin-bottom: 4px;
      text-transform: capitalize;
      line-height: 1.1;
    }
    
    .enemy-hp {
      margin-top: auto;
    }
    
    .hp-bar {
      width: 100%;
      height: 10px;
      background: #ddd;
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 1px;
    }
    
    .hp-fill {
      height: 100%;
      background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
      transition: width 0.3s ease;
    }
    
    .hp-fill[style*="width: 0"] {
      background: #f44336;
    }
    
    .hp-fill[style*="width: 1"], .hp-fill[style*="width: 2"], .hp-fill[style*="width: 3"] {
      background: #ff5722;
    }
    
    .hp-text {
      font-size: 0.65em;
      text-align: center;
      color: #555;
      line-height: 1.1;
    }
    
    .status-effects {
      display: flex;
      flex-wrap: wrap;
      gap: 1px;
      margin-top: 2px;
    }
    
    .status {
      font-size: 0.55em;
      padding: 1px 3px;
      border-radius: 2px;
      color: white;
      font-weight: bold;
      line-height: 1.1;
    }
    
    .status.poison { background: #9c27b0; }
    .status.curse { background: #673ab7; }
    .status.burn { background: #ff5722; }
    .status.freeze { background: #2196f3; }
    .status.stun { background: #ffc107; color: #333; }
  `;
  
  document.head.appendChild(style);
}

function addVerticalPartyCSS() {
  const styleId = 'vertical-party-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .battle-section {
      display: flex;
      gap: 0px;
      align-items: flex-start;
      
    }
    
    .enemies-section {
      flex: 1;
    }
    
    .party-section {
      flex: 0 0 140px;
      min-width: 100px;
      margin-left: 20px;
    }
    
    .party-section h3 {
      margin-bottom: 8px;
      color: #444;
      font-size: 1.1em;
      text-align: center;
    }
    
    .party-vertical {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 350px;
      overflow-y: auto;
    }
    
    .party-member-vertical {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 1px solid #dee2e6;
      border-radius: 6px;
      min-height: 60px;
      transition: all 0.2s ease;
    }
    
    .party-member-vertical:hover {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-color: #2196f3;
      transform: translateX(2px);
    }
    
    .party-image-vertical {
      flex: 0 0 40px;
      width: 40px;
      height: 40px;
      border-radius: 4px;
      overflow: hidden;
      background: #fff;
      border: 1px solid #ddd;
    }
    
    .party-image-vertical img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .party-placeholder-vertical {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #6c757d;
      color: white;
      font-weight: bold;
      font-size: 16px;
    }
    
    .party-info-vertical {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .party-name-vertical {
      font-size: 0.85em;
      font-weight: 600;
      color: #333;
      line-height: 1.2;
    }
    
    .party-level-vertical {
      font-size: 0.75em;
      color: #666;
      font-weight: 500;
    }
    
    .no-party {
      text-align: center;
      color: #999;
      font-style: italic;
      padding: 20px;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .battle-section {
        flex-direction: column;
        gap: 16px;
      }
      
      .party-section {
        flex: none;
        min-width: auto;
      }
      
      .party-vertical {
        flex-direction: row;
        overflow-x: auto;
        overflow-y: visible;
        max-height: none;
        padding-bottom: 4px;
      }
      
      .party-member-vertical {
        flex: 0 0 120px;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Utility function to get enemy at specific position
export function getEnemyAt(row, col) {
  return state.enemies[row] && state.enemies[row][col];
}

// Utility function to set enemy at specific position
export function setEnemyAt(row, col, enemy) {
  if (!state.enemies[row]) state.enemies[row] = [null, null, null];
  state.enemies[row][col] = enemy;
  updateEnemiesGrid();
}

// Utility function to remove enemy at specific position
export function removeEnemyAt(row, col) {
  if (state.enemies[row]) {
    state.enemies[row][col] = null;
    updateEnemiesGrid();
  }
}

/* -------------------------
   Combat helpers
   - damageEnemy(row,col,amount)
   - removeEnemy(row,col) shifts column forward (toward row 0)
   -------------------------*/
   /*
export function damageEnemy(row, col, amount = 0) {
  if (!state.enemies?.[row]?.[col]) return;
  const e = state.enemies[row][col];
  e.hp -= amount;
  if (e.hp <= 0) {
    removeEnemy(row, col);
    emit("enemyDefeated", { row, col });
  } else {
    emit("enemyDamaged", { row, col, amount });
  }
}
*/
export function removeEnemy(row, col) {
  if (!state.enemies?.[row]?.[col]) return;

  // Shift the column *forward* so that rows behind move up to fill the gap.
  // I'm assuming row 0 is the front row. When an enemy at row r dies,
  // rows r+1 -> r, r+2 -> r+1, then clear bottom row (2).
  for (let rr = row; rr < 2; rr++) {
    state.enemies[rr][col] = state.enemies[rr + 1][col] ?? null;
    if (state.enemies[rr][col]) state.enemies[rr][col].row = rr;
  }
  state.enemies[2][col] = null;

  // If wave cleared, emit
  if (isWaveCleared()) {
    emit("waveCleared");
    console.log("Wave cleared!");
  }
}

/* -------------------------
   Utility helpers
   -------------------------*/
function isWaveCleared() {
  if (!state.enemies) return true;
  return state.enemies.flat().every(cell => cell === null);
}

function getPooledPartyStats() {
  // Placeholder pooled stats – replace with your pooled calc logic
  // For now we use heroLevel for level and fallback HP values in state
  return {
    level: state.heroLevel || 1,
    hp: state.partyHp ?? 100,
    maxHp: state.partyMaxHp ?? 100
  };
}

export function getEnemyCanvasPosition(row, col) {
  const slot = document.querySelector(
    `.enemy-slot[data-row="${row}"][data-col="${col}"]`
  );
  const canvas = document.getElementById("enemyEffectsCanvas");
  if (!slot || !canvas) return null;

  const slotRect = slot.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  console.log("slot: ", slotRect, "canvas: ", canvasRect);
  const spriteWidth = 64;
  const spriteHeight = 94;

  const relativeX = slotRect.left - canvasRect.left + slotRect.width / 2;
  const relativeY = slotRect.top - canvasRect.top + slotRect.height / 2;

  return {
    x: relativeX - spriteWidth / 2,
    y: relativeY - spriteHeight / 2
  };
}




let animationFrameId = null;

// area.js - Remove this loop entirely
export function setupEnemyEffectsCanvas() {
  const canvas = document.getElementById("enemyEffectsCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  resizeEnemyEffectsCanvas();

  // Cancel any existing loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Just initialize - don't start a loop
  state.ui = state.ui || {};
  state.ui.spriteAnimations = new spriteAnimationManager(ctx, 64);
  
  console.log('[Canvas] Sprite animation manager initialized');
}