// area.js
import { attachEnemyTooltip, removeAllEnemyTooltips } from "./tooltip.js";
import { state, partyState, spellHandState } from "./state.js";
import { emit, on } from "./events.js";
import { AREA_TEMPLATES } from "./content/areaDefs.js";
import { ENEMY_TEMPLATES } from "./content/enemyDefs.js";
import { classes } from "./content/classes.js";
import { spriteAnimationManager } from "./systems/spriteAnimationSystem.js ";
import { getActiveEnemies, setTarget } from "./systems/combatSystem.js";
//import { floatingTextManager } from "./systems/floatingtext.js";
import { summonsState } from "./systems/summonSystem.js";
import { updateSpellDock } from "./systems/dockManager.js";
import { getBuildingLevel } from "./town.js";
import { heroSpells } from "./content/heroSpells.js";

/* -------------------------
   Wave Timer Management (Delta Time)
   -------------------------*/

const BASE_MIN_TIME = 20;        // minimum seconds
const BASE_MAX_TIME = 40;        // maximum seconds
const HP_TIME_RATIO = 2;         // each point of HP = 2 seconds of wave time
let maxTimeUpgradeBonus = 0;     // can be modified by items/upgrades later
let MAX_TIMESHIELD = 10;  // e.g. from building upgrades
let timeShield = 0;
let timeRemaining = 40;
let maxTime = 40;
let waveActive = false;
let paused = false;

export function startWaveTimer() {
  stopWaveTimer(); // just to be safe

  // 🧮 Calculate duration from party HP
  const partyHP = Number(partyState.totalStats.hp) || 0;
  // Example: each HP gives 2 seconds (adjust as you balance)
  let calculatedTime = partyHP * HP_TIME_RATIO;
  
  // Prevent NaN or zero-time waves
  const maxAllowedTime = BASE_MAX_TIME + maxTimeUpgradeBonus;
  maxTime = Math.min(Math.max(BASE_MIN_TIME, calculatedTime), maxAllowedTime);
  
  // initialize
  timeRemaining = maxTime;

  waveActive = true;
  paused = false;

  updateTimerDisplay();
}

export function stopWaveTimer() {
  waveActive = false;
  paused = false;
  timeRemaining = 0;
  updateTimerDisplay();
}

export function pauseWaveTimer() {
  paused = true;
}

export function resumeWaveTimer() {
  if (waveActive) paused = false;
}

export function addTimeShield(seconds) {
  timeShield = Math.min(timeShield + seconds, MAX_TIMESHIELD);
  updateTimerDisplay();
}


/**
 * Called every frame from the main game loop.
 * @param {number} delta - time passed in seconds
 */
export function updateWaveTimer(delta) {
  if (!waveActive || paused) return;

  if (timeShield > 0) {
    const absorbed = Math.min(delta, timeShield);
    timeShield -= absorbed;
    delta -= absorbed;
  }
  timeRemaining -= delta;

  if (timeRemaining <= 0) {
    timeRemaining = 0;
    waveActive = false;
    emit("waveTimedOut");
  }

  updateTimerDisplay();
}

export function addWaveTime(seconds) {
  timeRemaining = Math.min(timeRemaining + seconds, maxTime);
  updateTimerDisplay();
}

export function getTimeRemaining() {
  return timeRemaining;
}

export function getBonusGoldMultiplier() {
  const timeBonus = timeRemaining / maxTime;
  return 1 + (timeBonus * 0.5);
}

function updateTimerDisplay() {
  const shieldPercent = Math.max(0, (timeShield / maxTime) * 100);
  const timePercent = Math.max(0, (timeRemaining / maxTime) * 100);
  const timerBar = document.getElementById("waveTimerBar");
  const timerText = document.getElementById("waveTimerText");

  timerBar.style.background = `linear-gradient(
    to right,
    gold 0% ${shieldPercent}%,
    ${timePercent > 50 ? '#2196f3' : timePercent > 20 ? '#ff9800' : '#f44336'} ${shieldPercent}% 100%
  )`;


  if (timerBar && timerText) {
    const percentage = Math.max(0, (timeRemaining / maxTime) * 100);
    timerBar.style.width = `${percentage}%`;
    timerText.textContent = `${Math.ceil(timeRemaining)}s`;
/*
    // Color changes based on time remaining
    if (percentage > 50) {
      timerBar.style.background = "linear-gradient(90deg, #2196f3 0%, #03a9f4 100%)";
    } else if (percentage > 20) {
      timerBar.style.background = "linear-gradient(90deg, #ff9800 0%, #ffc107 100%)";
    } else {
      timerBar.style.background = "linear-gradient(90deg, #f44336 0%, #ff5722 100%)";
    }
      */
  }
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
    "partyChanged", // Add party change event
    "partyMemberUpdated"
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

    on ("partyMemberUpdated", () => {
    renderPartyDisplay();
    updateAreaPanel();
  });

  // In your initAreaPanel or similar initialization function:
  on("summonCreated", () => {
    updatePartyDisplay();
  });

  on("summonStacked", () => {
    updatePartyDisplay();
  });

  on("summonExpired", () => {
    updatePartyDisplay();
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
  if (!panel.querySelector(".area-content") || state.newArea === true) {
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
  removeAllEnemyTooltips();
  const grid = document.getElementById("enemiesGrid");
  if (grid) {
    grid.innerHTML = renderEnemiesGrid();
            for (let row = 0; row < 3; row++) {
              for (let col = 0; col < 3; col++) {
                const enemy = state.enemies[row] && state.enemies[row][col];
                if (enemy) {
                  const container = document.querySelector(`[data-enemy-id="${enemy.uniqueId}"]`);
                  if (container) {
                    attachEnemyTooltip(container, enemy);
                    //console.log('Attached tooltip to enemy: ', enemy);
                  }
                }
              }
            }
  }

  const party = document.getElementById("partyDisplay");
  if (party) party.innerHTML = renderPartyDisplay();

  resizeEnemyEffectsCanvas();
}


// Updated renderPartyDisplay function
function renderPartyDisplay() {
  if (!partyState.party || partyState.party.length === 0) {
    return '<div class="no-party">No party members</div>';
  }
  
  let partyHTML = '';
  //console.log("Rendering party members:", partyState.party);
  partyState.party.forEach(member => {
    // For summons, we don't look up in classes array
    if (member.isSummon) {
      partyHTML += renderSummonMember(member);
    } else {
      const cls = classes.find(c => c.id === member.id);
      if (cls) {
        partyHTML += renderPartyMember(member, cls);
      }
    }
  });
  
  return partyHTML;
}

function renderPartyMember(member, cls) {
  const level = partyState.classLevels[cls.id] || 1;
  
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

// NEW: Render summon members with special styling
function renderSummonMember(member) {
  const summonData = summonsState.active.find(s => s.id === member.id);
  const durationPercent = summonData ? (summonData.duration / summonData.maxDuration) * 100 : 0;
  const timeRemaining = summonData ? Math.ceil(summonData.duration) : 0;
  
  return `
    <div class="party-member-vertical summon-member" data-class-id="${member.id}">
      <div class="party-image-vertical">
        <img src="${member.image}" alt="${member.name}" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="party-placeholder-vertical" style="display: none;">${member.name[0]}</div>
        ${summonData ? `<div class="summon-timer">⏱️${timeRemaining}s</div>` : ''}
      </div>
      <div class="party-info-vertical">
        <div class="party-name-vertical summon-name">${member.name}</div>
        <div class="party-level-vertical">Summon</div>
      </div>
      ${summonData ? `
        <div class="summon-duration-bar">
          <div class="summon-duration-fill" style="width: ${durationPercent}%"></div>
        </div>
      ` : ''}
    </div>
  `;
}

function updatePartyDisplay() {
  const partyDisplay = document.getElementById("partyDisplay");
  if (partyDisplay) {
    partyDisplay.innerHTML = renderPartyDisplay();
  }
}

// NEW: Efficiently update only summon timers/bars without full re-render
export function updateSummonTimers() {
  if (summonsState.active.length === 0) return;
  
  summonsState.active.forEach(summonData => {
    const memberCard = document.querySelector(`.party-member-vertical[data-class-id="${summonData.id}"]`);
    if (!memberCard) return;
    
    // Update timer text
    const timerEl = memberCard.querySelector('.summon-timer');
    if (timerEl) {
      const timeRemaining = Math.ceil(summonData.duration);
      timerEl.textContent = `⏱️${timeRemaining}s`;
    }
    
    // Update duration bar
    const durationFill = memberCard.querySelector('.summon-duration-fill');
    if (durationFill) {
      const durationPercent = (summonData.duration / summonData.maxDuration) * 100;
      durationFill.style.width = `${durationPercent}%`;
    }
  });
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

  const elementClass = enemy.elementType || "default";
  const bossClass = enemy.isBoss ? "boss" : "";

  const spriteHTML = template.image
    ? `<img class="enemy-sprite" src="${template.image}" alt="${enemy.name || template.baseName}">`
    : `<div class="enemy-placeholder"></div>`;

  return `
    <div class="enemy-card ${elementClass} ${bossClass}" id="enemy-${row}-${col}" data-enemy-id="${enemy.uniqueId}">
      ${spriteHTML}
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

export function updateEnemyCard(enemy, row, col) {
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
    console.log('clicked enemy: ', enemy);
    /*
      openDock(DOCK_TYPES.AREA, { type: "enemy", data: enemy }, {
      sourcePanel: state.activePanel,   // e.g. "panelTown"
      sourceEl: card,                   // the actual DOM element clicked
      persist: false                    // optional: true if this dock should remain across panel switches
    });
    */
    
  };
  /*  
  // Add damage animation class if enemy was just damaged
  if (enemy.justDamaged) {
    card.classList.add('damaged');
    setTimeout(() => {
      card.classList.remove('damaged');
      enemy.justDamaged = false;
    }, 500);
  }
  */
  // Handle visual effects (light, strobe, dark)
  const effectTypes = ['light-flash', 'strobe-flash', 'dark-flash'];
  effectTypes.forEach(effectType => {
    if (enemy.visualEffect === effectType) {
      if (!card.classList.contains(effectType)) {
        card.classList.add(effectType);
      }
      //console.log(`[light flash] creating flash at ${row}, ${col}`);
    } else {
      card.classList.remove(effectType);
    }
  });

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

  /* Heal pulse effect */
  @keyframes healPulse {
    0% {
      box-shadow: 0 0 6px rgba(126, 255, 126, 0.5), 0 0 12px rgba(126, 255, 126, 0.3);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 14px rgba(126, 255, 126, 0.9), 0 0 30px rgba(126, 255, 126, 0.5);
      transform: scale(1.02);
    }
    100% {
      box-shadow: 0 0 6px rgba(126, 255, 126, 0.5), 0 0 12px rgba(126, 255, 126, 0.3);
      transform: scale(1);
    }
  }

  .timer-bar.heal-pulse {
    animation: healPulse 1.2s ease-out;
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
      z-index: 9;
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
    // console.log("Wave cleared!");
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
    level: partyState.heroLevel || 1,
    hp: partyState.partyHp ?? 100,
    maxHp: partyState.partyMaxHp ?? 100
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
  // console.log("slot: ", slotRect, "canvas: ", canvasRect);
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
  
  // console.log('[Canvas] Sprite animation manager initialized');
}

export const AREA_MENUS = {
  enemy: (enemy) => {
    if (!enemy) return `<p>No enemy data available.</p>`;
    return `
      <div class="enemy-hover-target" data-enemy-id="${enemy.uniqueId}">
        <span>${enemy.prefix} ${enemy.name}</span>
      </div>
    `;
  },
  
quickSpells: () => {
  const currentGems = Math.floor(state.resources.gems || 0);
  const drawCost = 5;
  const canAffordDraw = currentGems >= drawCost;
  const handSpells = spellHandState.hand;
  
  // Get library level to determine unlocked tiers
  const libraryLevel = getBuildingLevel("library");
  
  // Generate spell card buttons for current hand
  const spellButtons = handSpells
    .map((spellId, index) => {  // ✅ Add index parameter
      const spell = heroSpells.find(s => s.id === spellId);
      if (!spell) return '';
      
      const canAffordSpell = currentGems >= (spell.gemCost || 0);
      const affordableClass = canAffordSpell ? 'affordable' : 'unaffordable';
      
      return `
        <button 
          class="quick-spell-btn ${affordableClass}" 
          data-spell-id="${spell.id}"
          data-hand-index="${index}"
          title="${spell.name} (Lvl ${spell.skillLevel}) - ${spell.description}"
          ${!canAffordSpell ? 'disabled' : ''}
        >
          <img src="${spell.icon}" alt="${spell.name}" class="spell-icon" />
          <span class="spell-name">${spell.name}</span>
          <span class="gem-cost">${spell.gemCost || 0} gems</span>
        </button>
      `;
    })
    .join('');
  
  const emptySlots = spellHandState.maxHandSize - handSpells.length;
  const emptySlotHTML = '<div class="empty-spell-slot"></div>'.repeat(emptySlots);
  
  return `
    <div class="quick-spells-container">
      <div class="spell-hand-header">
        <h4>Spell Hand</h4>
        <button 
          class="draw-spells-btn ${canAffordDraw ? 'affordable' : 'unaffordable'}"
          ${!canAffordDraw ? 'disabled' : ''}
        >
          Draw Hand (${drawCost} gems)
        </button>
      </div>
      <div class="spell-hand">
        ${spellButtons}
        ${emptySlotHTML}
      </div>
      ${libraryLevel === 0 ? '<p class="spell-hint">Upgrade your Library to unlock spell tiers</p>' : ''}
    </div>
  `;
}
};

export function drawSpellHand() {
  const drawCost = 5;
  const currentGems = state.resources.gems || 0;
  
  if (currentGems < drawCost) {
    console.log("Not enough gems to draw spells");
    return false;
  }
  
  // Get library level to determine unlocked spells
  const libraryLevel = getBuildingLevel("library");
  
  // Filter spells by unlocked tiers
  const unlockedSpells = heroSpells.filter(spell => {
    const tier = spell.tier || 1;
    return tier <= libraryLevel;
  });
  
  if (unlockedSpells.length === 0) {
    console.log("No spells unlocked yet");
    return false;
  }
  
  // Draw 4 random spells (with replacement if not enough unique spells)
  const handSize = Math.min(4, unlockedSpells.length);
  const newHand = [];
  
  for (let i = 0; i < handSize; i++) {
    const randomIndex = Math.floor(Math.random() * unlockedSpells.length);
    newHand.push(unlockedSpells[randomIndex].id);
  }
  
  // Spend gems and update hand
  state.resources.gems -= drawCost;
  spellHandState.hand = newHand;
  
  emit("gemsChanged");
  emit("spellHandDrawn");
  updateSpellDock();
  return true;
}

// Update the spell casting to remove spell from hand by index
export function castSpellFromHand(spellId, handIndex) {  // ✅ Add handIndex parameter
  const spell = heroSpells.find(s => s.id === spellId);
  if (!spell) return false;
  if (getActiveEnemies().length === 0) return false;
  
  const gemCost = spell.gemCost || 0;
  if (state.resources.gems < gemCost) {
    console.log("Not enough gems to cast spell");
    return false;
  }
  
  // Cast the spell
  spell.activate();
  
  // Spend gems
  state.resources.gems -= gemCost;
  
  // ✅ Remove spell from hand by index (not by ID!)
  if (handIndex !== undefined && handIndex >= 0 && handIndex < spellHandState.hand.length) {
    spellHandState.hand.splice(handIndex, 1);
  } else {
    // Fallback: remove first occurrence (shouldn't happen with new system)
    const indexToRemove = spellHandState.hand.indexOf(spellId);
    if (indexToRemove !== -1) {
      spellHandState.hand.splice(indexToRemove, 1);
    }
  }
  
  emit("gemsChanged");
  emit("spellCast", spellId);
  updateSpellDock(); // ✅ Update UI after casting
  
  console.log(`Casted ${spell.name}`);
  return true;
}

/*
// docking menu
export const AREA_MENUS = {
  enemy: (enemy) => `
    <div class="area-menu">
      <h3>${enemy.prefix} ${enemy.name}</h3>
      <p>HP: ${enemy.hp} <br>
      Enemy Type: ${enemy.type} <br>
      Element type: ${enemy.elementType}</p>
      <p> Active counters: ${enemy.counters}<br>
      Resistances: ${enemy.resistances}<br>
      Weaknesses: ${enemy.weaknesses}
    </div>
  `,
    quickSpells: (spells) => `
    <div class="area-menu">
      <h3>Quick Spells</h3>
      <div class="spell-grid">
        ${spells.map(sp => `<div class="spell">${sp.name}</div>`).join("")}
      </div>
    </div>
  `,
};
*/
