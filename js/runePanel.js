// runePanel.js
import { state, runeState } from "./state.js";
import { emit, on } from "./events.js";

const GRID_SIZE = 4;
const TILE_SIZE = 80;
const TILE_PADDING = 8;
const ELEMENTS = ["fire", "water", "air", "earth"];

const ELEMENT_COLORS = {
  fire: "#ff4444",
  water: "#4444ff",
  air: "#44ffff",
  earth: "#88ff44"
};

const SWAP_COST = 1;
const RESET_COST = 5;

let canvas = null;
let ctx = null;
let canvasContainer = null;

export function initRunePanel() {
  on("gemsChanged", () => {
    if (state.activePanel === "panelRune") {
      updateRunePanel(); // Changed from renderRunePanel
    }
  });
}

export function renderRunePanel() {
  const panel = document.getElementById("panelRune");
  if (!panel) return;

  panel.innerHTML = `
    <div class="rune-panel-content">
      <div class="rune-header">
        <h2>Elemental Rune Forge</h2>
        <p class="rune-description">Match 3 or more elements to collect crystals</p>
      </div>
      
      <div class="rune-stats">
        <div class="crystal-display">
          <div class="crystal-item fire-crystal">
            <span class="crystal-icon">🔥</span>
            <span class="crystal-count" id="fireCrystalCount">${runeState.crystals.fire}</span>
          </div>
          <div class="crystal-item water-crystal">
            <span class="crystal-icon">💧</span>
            <span class="crystal-count" id="waterCrystalCount">${runeState.crystals.water}</span>
          </div>
          <div class="crystal-item air-crystal">
            <span class="crystal-icon">💨</span>
            <span class="crystal-count" id="airCrystalCount">${runeState.crystals.air}</span>
          </div>
          <div class="crystal-item earth-crystal">
            <span class="crystal-icon">🌍</span>
            <span class="crystal-count" id="earthCrystalCount">${runeState.crystals.earth}</span>
          </div>
        </div>
        <div class="rune-info">
          <div class="info-item">
            <span>Swap Cost: ${SWAP_COST} 💎</span>
          </div>
          <div class="info-item">
            <span id="availableGemsDisplay">Available Gems: ${Math.floor(state.resources.gems)}</span>
          </div>
          <div id="comboDisplayContainer">
            ${runeState.comboMultiplier > 1 ? `
              <div class="combo-display">
                <span>Combo: x${runeState.comboMultiplier}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="rune-game-container">
        <div id="runeCanvasContainer" class="rune-canvas-container">
          <canvas id="runeCanvas"></canvas>
        </div>
        
        <div class="rune-controls">
          <button id="resetGridBtn" class="rune-btn reset-btn" ${state.resources.gems < RESET_COST ? 'disabled' : ''}>
            Reset Grid (${RESET_COST} 💎)
          </button>
          <div class="match-hint">
            Drag tiles to swap • 3+ match = crystals
          </div>
        </div>
      </div>
    </div>
  `;

  addRunePanelCSS();
  initCanvas();
  initializeGrid();
  setupEventListeners();
}

export function updateRunePanel() {
  // Only update dynamic elements without re-rendering the whole panel
  
  // Update crystal counts
  const fireCrystal = document.getElementById("fireCrystalCount");
  const waterCrystal = document.getElementById("waterCrystalCount");
  const airCrystal = document.getElementById("airCrystalCount");
  const earthCrystal = document.getElementById("earthCrystalCount");
  
  if (fireCrystal) fireCrystal.textContent = runeState.crystals.fire;
  if (waterCrystal) waterCrystal.textContent = runeState.crystals.water;
  if (airCrystal) airCrystal.textContent = runeState.crystals.air;
  if (earthCrystal) earthCrystal.textContent = runeState.crystals.earth;
  
  // Update available gems
  const gemsDisplay = document.getElementById("availableGemsDisplay");
  if (gemsDisplay) {
    gemsDisplay.textContent = `Available Gems: ${Math.floor(state.resources.gems)}`;
  }
  
  // Update combo display
  const comboContainer = document.getElementById("comboDisplayContainer");
  if (comboContainer) {
    if (runeState.comboMultiplier > 1) {
      comboContainer.innerHTML = `
        <div class="combo-display">
          <span>Combo: x${runeState.comboMultiplier}</span>
        </div>
      `;
    } else {
      comboContainer.innerHTML = '';
    }
  }
  
  // Update reset button state
  const resetBtn = document.getElementById("resetGridBtn");
  if (resetBtn) {
    resetBtn.disabled = state.resources.gems < RESET_COST;
  }
}

function addRunePanelCSS() {
  if (document.getElementById('rune-panel-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'rune-panel-styles';
  style.textContent = `
    .rune-panel-content {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }

    .rune-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .rune-header h2 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .rune-description {
      color: #666;
      font-size: 0.9em;
      margin: 0;
    }

    .rune-stats {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      border: 2px solid #d0d7de;
    }

    .crystal-display {
      display: flex;
      justify-content: space-around;
      margin-bottom: 12px;
    }

    .crystal-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.5);
      border: 2px solid rgba(0, 0, 0, 0.1);
    }

    .crystal-icon {
      font-size: 24px;
    }

    .crystal-count {
      font-weight: bold;
      font-size: 1.1em;
      color: #333;
    }

    .fire-crystal { border-color: #ff4444; }
    .water-crystal { border-color: #4444ff; }
    .air-crystal { border-color: #44ffff; }
    .earth-crystal { border-color: #88ff44; }

    .rune-info {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 8px;
    }

    .info-item {
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 6px;
      font-size: 0.9em;
      font-weight: 500;
    }

    .combo-display {
      padding: 4px 12px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border-radius: 6px;
      font-weight: bold;
      animation: pulse 0.5s ease-in-out infinite alternate;
    }

    @keyframes pulse {
      from { transform: scale(1); }
      to { transform: scale(1.05); }
    }

    .rune-game-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .rune-canvas-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 12px;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    #runeCanvas {
      display: block;
      background: #2a2a4a;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .rune-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .rune-btn {
      padding: 12px 24px;
      font-size: 1em;
      font-weight: bold;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .reset-btn {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .reset-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }

    .reset-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .match-hint {
      font-size: 0.85em;
      color: #666;
      text-align: center;
    }

    @keyframes tileMatch {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
      100% { transform: scale(0); opacity: 0; }
    }

    @keyframes tileAppear {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;
  
  document.head.appendChild(style);
}

function initCanvas() {
  canvas = document.getElementById("runeCanvas");
  canvasContainer = document.getElementById("runeCanvasContainer");
  if (!canvas) return;

  ctx = canvas.getContext("2d");
  
  const totalSize = GRID_SIZE * (TILE_SIZE + TILE_PADDING) + TILE_PADDING;
  canvas.width = totalSize;
  canvas.height = totalSize;
}

function initializeGrid() {
  // Create initial grid
  runeState.grid = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    runeState.grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      runeState.grid[row][col] = getRandomElement();
    }
  }
  
  // Ensure no initial matches
  while (hasMatches()) {
    shuffleGrid();
  }
  
  drawGrid();
}

function getRandomElement() {
  return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}

function shuffleGrid() {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      runeState.grid[row][col] = getRandomElement();
    }
  }
}

function drawGrid() {
  if (!ctx || !canvas) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const element = runeState.grid[row][col];
      if (element) {
        drawTile(row, col, element);
      }
    }
  }
  
  // Highlight selected tile
  if (runeState.selectedTile) {
    const { row, col } = runeState.selectedTile;
    const x = col * (TILE_SIZE + TILE_PADDING) + TILE_PADDING;
    const y = row * (TILE_SIZE + TILE_PADDING) + TILE_PADDING;
    
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
  }
}

function drawTile(row, col, element) {
  const x = col * (TILE_SIZE + TILE_PADDING) + TILE_PADDING;
  const y = row * (TILE_SIZE + TILE_PADDING) + TILE_PADDING;
  
  // Draw tile background
  const gradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
  gradient.addColorStop(0, ELEMENT_COLORS[element]);
  gradient.addColorStop(1, adjustBrightness(ELEMENT_COLORS[element], -30));
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  
  // Draw border
  ctx.strokeStyle = adjustBrightness(ELEMENT_COLORS[element], -50);
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
  
  // Draw element icon/text
  ctx.fillStyle = "#fff";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const icons = { fire: "🔥", water: "💧", air: "💨", earth: "🌍" };
  ctx.fillText(icons[element], x + TILE_SIZE / 2, y + TILE_SIZE / 2);
}

function adjustBrightness(color, amount) {
  const num = parseInt(color.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function setupEventListeners() {
  if (!canvas) return;
  
  let dragStart = null;
  
  canvas.addEventListener("mousedown", (e) => {
    if (runeState.isAnimating) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / (TILE_SIZE + TILE_PADDING));
    const row = Math.floor(y / (TILE_SIZE + TILE_PADDING));
    
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      dragStart = { row, col };
      runeState.selectedTile = { row, col };
      drawGrid();
    }
  });
  
  canvas.addEventListener("mouseup", (e) => {
    if (!dragStart || runeState.isAnimating) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / (TILE_SIZE + TILE_PADDING));
    const row = Math.floor(y / (TILE_SIZE + TILE_PADDING));
    
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      const dragEnd = { row, col };
      handleSwap(dragStart, dragEnd);
    }
    
    dragStart = null;
    runeState.selectedTile = null;
    drawGrid();
  });
  
  // Reset button
  const resetBtn = document.getElementById("resetGridBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (state.resources.gems >= RESET_COST) {
        state.resources.gems -= RESET_COST;
        emit("gemsChanged");
        initializeGrid();
        console.log("Grid reset!");
      }
    });
  }
}

function handleSwap(start, end) {
  // Check if adjacent
  const rowDiff = Math.abs(start.row - end.row);
  const colDiff = Math.abs(start.col - end.col);
  
  if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
    // Check if player has gems
    if (state.resources.gems < SWAP_COST) {
      console.log("Not enough gems to swap!");
      return;
    }
    
    // Perform swap
    const temp = runeState.grid[start.row][start.col];
    runeState.grid[start.row][start.col] = runeState.grid[end.row][end.col];
    runeState.grid[end.row][end.col] = temp;
    
    // Check for matches
    if (hasMatches()) {
      // Valid swap - deduct gem
      state.resources.gems -= SWAP_COST;
      emit("gemsChanged");
      processMatches();
    } else {
      // Invalid swap - revert
      const temp2 = runeState.grid[start.row][start.col];
      runeState.grid[start.row][start.col] = runeState.grid[end.row][end.col];
      runeState.grid[end.row][end.col] = temp2;
      console.log("No matches - swap reverted");
    }
    
    drawGrid();
  }
}

function hasMatches() {
  // Check horizontal matches
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 2; col++) {
      const element = runeState.grid[row][col];
      if (element && 
          element === runeState.grid[row][col + 1] && 
          element === runeState.grid[row][col + 2]) {
        return true;
      }
    }
  }
  
  // Check vertical matches
  for (let col = 0; col < GRID_SIZE; col++) {
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      const element = runeState.grid[row][col];
      if (element && 
          element === runeState.grid[row + 1][col] && 
          element === runeState.grid[row + 2][col]) {
        return true;
      }
    }
  }
  
  return false;
}

function findMatches() {
  const matches = [];
  const visited = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  
  // Find horizontal matches
  for (let row = 0; row < GRID_SIZE; row++) {
    let matchStart = 0;
    for (let col = 1; col < GRID_SIZE; col++) {
      if (runeState.grid[row][col] !== runeState.grid[row][col - 1]) {
        if (col - matchStart >= 3) {
          for (let i = matchStart; i < col; i++) {
            matches.push({ row, col: i, element: runeState.grid[row][i] });
            visited[row][i] = true;
          }
        }
        matchStart = col;
      }
    }
    if (GRID_SIZE - matchStart >= 3) {
      for (let i = matchStart; i < GRID_SIZE; i++) {
        matches.push({ row, col: i, element: runeState.grid[row][i] });
        visited[row][i] = true;
      }
    }
  }
  
  // Find vertical matches
  for (let col = 0; col < GRID_SIZE; col++) {
    let matchStart = 0;
    for (let row = 1; row < GRID_SIZE; row++) {
      if (runeState.grid[row][col] !== runeState.grid[row - 1][col]) {
        if (row - matchStart >= 3) {
          for (let i = matchStart; i < row; i++) {
            if (!visited[i][col]) {
              matches.push({ row: i, col, element: runeState.grid[i][col] });
            }
          }
        }
        matchStart = row;
      }
    }
    if (GRID_SIZE - matchStart >= 3) {
      for (let i = matchStart; i < GRID_SIZE; i++) {
        if (!visited[i][col]) {
          matches.push({ row: i, col, element: runeState.grid[i][col] });
        }
      }
    }
  }
  
  return matches;
}

async function processMatches() {
  runeState.isAnimating = true;
  
  const matches = findMatches();
  if (matches.length === 0) {
    runeState.isAnimating = false;
    return;
  }
  
  // Update combo
  const now = Date.now();
  if (now - runeState.lastMatchTime < 2000) {
    runeState.comboMultiplier = Math.min(runeState.comboMultiplier + 1, 5);
  } else {
    runeState.comboMultiplier = 1;
  }
  runeState.lastMatchTime = now;
  
  // Award crystals
  const elementCounts = {};
  matches.forEach(match => {
    elementCounts[match.element] = (elementCounts[match.element] || 0) + 1;
  });
  
  for (const element in elementCounts) {
    const count = elementCounts[element];
    let crystals = 0;
    if (count >= 5) crystals = 5;
    else if (count === 4) crystals = 3;
    else crystals = 1;
    
    crystals *= runeState.comboMultiplier;
    runeState.crystals[element] += crystals;
    console.log(`Earned ${crystals} ${element} crystals!`);
  }
  
  // Remove matched tiles
  matches.forEach(match => {
    runeState.grid[match.row][match.col] = null;
  });
  
  drawGrid();
  await sleep(300);
  
  // Apply gravity
  applyGravity();
  drawGrid();
  await sleep(300);
  
  // Fill empty spaces
  fillEmptySpaces();
  drawGrid();
  await sleep(300);
  
  // Check for chain reactions
  if (hasMatches()) {
    await processMatches();
  } else {
    runeState.isAnimating = false;
    updateRunePanel(); // Changed from renderRunePanel - just update the displays
  }
}

function applyGravity() {
  for (let col = 0; col < GRID_SIZE; col++) {
    let writeRow = GRID_SIZE - 1;
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (runeState.grid[row][col] !== null) {
        runeState.grid[writeRow][col] = runeState.grid[row][col];
        if (writeRow !== row) {
          runeState.grid[row][col] = null;
        }
        writeRow--;
      }
    }
  }
}

function fillEmptySpaces() {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (runeState.grid[row][col] === null) {
        runeState.grid[row][col] = getRandomElement();
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { runeState };