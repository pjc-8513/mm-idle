// spellbookPanel.js
import { emit, on } from "./events.js"; // adjust path as needed
import { state, partyState, quickSpellState } from "./state.js";
import { heroSpells } from "./content/heroSpells.js";

export function initSpellbookPanel() {
  // Re-render whenever gold/gems changes
  on("goldChanged", () => {
    if (document.getElementById("panelSpellbook").classList.contains("active")) {
      renderSpellbookPanel();
    }
  });
    on("gemChanged", () => {
    if (document.getElementById("panelSpellbook").classList.contains("active")) {
      renderSpellbookPanel();
    }
  });
  console.log("Spellbook Panel initialized!");
}

let lastSpellbookState = {
  gold: 0,
  registered: [],
};

// =============================================================
// RENDER ENTRY POINT
// =============================================================

export function renderSpellbookPanel() {
  const panel = document.getElementById("panelSpellbook");

  if (!panel.querySelector(".spellGrid")) {
    fullRenderSpellbookPanel();
  } else {
    updateSpellbookPanel();
  }
}

// =============================================================
// INITIAL FULL RENDER
// =============================================================

function fullRenderSpellbookPanel() {
  const panel = document.getElementById("panelSpellbook");
  panel.innerHTML = `
    <div class="spellbook-panel-header">
      <h2>Spellbook</h2>
    </div>
  `;

  const container = document.createElement("div");
  container.classList.add("spellGrid");

  heroSpells.forEach(spell => {
    const spellCard = document.createElement("div");
    spellCard.classList.add("spellCard");
    spellCard.dataset.spellId = spell.id;

    // --- Icon ---
    const imageDiv = document.createElement("div");
    imageDiv.classList.add("spellImage");
    const img = document.createElement("img");
    img.src = spell.icon;
    img.alt = spell.name;
    img.onerror = () => {
      img.style.display = "none";
      imageDiv.innerHTML = `<div class="spell-placeholder">${spell.name[0]}</div>`;
    };
    imageDiv.appendChild(img);

    // --- Info ---
    const infoDiv = document.createElement("div");
    infoDiv.classList.add("spellInfo");

    const nameDiv = document.createElement("div");
    nameDiv.classList.add("spellName");
    nameDiv.textContent = `${spell.name} (Lvl ${spell.skillLevel})`;

    const descDiv = document.createElement("div");
    descDiv.classList.add("spellDescription");
    descDiv.textContent = spell.description;

    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(descDiv);

    // --- Buttons ---
    const btnContainer = document.createElement("div");
    btnContainer.classList.add("spellButtons");

    const upgradeBtn = document.createElement("button");
    upgradeBtn.classList.add("spellUpgradeBtn");
    upgradeBtn.dataset.spellId = spell.id;

    const quickBtn = document.createElement("button");
    quickBtn.classList.add("spellQuickBtn");
    quickBtn.dataset.spellId = spell.id;

    btnContainer.appendChild(upgradeBtn);
    btnContainer.appendChild(quickBtn);

    spellCard.appendChild(imageDiv);
    spellCard.appendChild(infoDiv);
    spellCard.appendChild(btnContainer);
    container.appendChild(spellCard);
  });

  panel.appendChild(container);

  // initial update
  updateSpellbookPanel();

  // subscribe to events
  setupSpellbookListeners();
}

// =============================================================
// EVENT-DRIVEN UPDATING
// =============================================================

function setupSpellbookListeners() {
  on("goldChanged", updateSpellbookPanel);
  on("spellUpgraded", updateSpellbookPanel);
  on("quickSpellsChanged", updateSpellbookPanel);
}

// =============================================================
// INCREMENTAL UPDATE
// =============================================================

export function updateSpellbookPanel() {
  const currentGold = Math.floor(state.resources.gold);
  const registeredSpells = quickSpellState.registered || [];

  // Optimization: detect if meaningful changes occurred
  const goldChanged = currentGold !== lastSpellbookState.gold;
  const regChanged = !arraysEqual(registeredSpells, lastSpellbookState.registered);
  if (!goldChanged && !regChanged) return;

  const spellCards = document.querySelectorAll(".spellCard");

  spellCards.forEach(card => {
    const spellId = card.dataset.spellId;
    const spell = heroSpells.find(s => s.id === spellId);
    if (!spell) return;

    // --- Update info ---
    const nameDiv = card.querySelector(".spellName");
    nameDiv.textContent = `${spell.name} (Lvl ${spell.skillLevel})`;

    // --- Upgrade button ---
    const upgradeBtn = card.querySelector(".spellUpgradeBtn");
    const upgradeCost = getSpellUpgradeCost(spell);
    const canAfford = currentGold >= upgradeCost;

    upgradeBtn.textContent = `Upgrade (${upgradeCost}g)`;
    upgradeBtn.disabled = !canAfford;
    upgradeBtn.classList.toggle("affordable", canAfford);
    upgradeBtn.classList.toggle("unaffordable", !canAfford);

    upgradeBtn.onclick = () => {
      if (!canAfford) return;
      spendGold(upgradeCost);
      spell.skillLevel++;
      emit("spellUpgraded", spell.id);
    };

    // --- Quick register ---
    const quickBtn = card.querySelector(".spellQuickBtn");
    const isRegistered = registeredSpells.includes(spell.id);

    quickBtn.textContent = isRegistered ? "Unregister" : "Register";
    quickBtn.classList.toggle("registered", isRegistered);

    quickBtn.onclick = () => {
      toggleQuickSpell(spell.id);
      emit("quickSpellsChanged");
    };
  });

  // Save snapshot
  lastSpellbookState = {
    gold: currentGold,
    registered: [...registeredSpells],
  };
}

// =============================================================
// HELPERS
// =============================================================

function getSpellUpgradeCost(spell) {
  return Math.floor(10 * Math.pow(spell.skillLevel, 2));
}

function spendGold(amount) {
  state.resources.gold = Math.max(0, state.resources.gold - amount);
  emit("goldChanged");
}

function toggleQuickSpell(spellId) {
  const idx = quickSpellState.registered.indexOf(spellId);
  if (idx >= 0) quickSpellState.registered.splice(idx, 1);
  else quickSpellState.registered.push(spellId);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
