import { state } from "./state.js";
import { emit, on } from "./events.js";
import { calculateStats } from "./systems/math.js";
import { classes } from "./content/classes.js";
import { attachRequirementTooltip } from "./tooltip.js";

// Store the last state to detect changes
let lastPartyState = {
  gold: -1,
  gems: -1,
  partySize: -1,
  partyMembers: []
};

export function initPartyPanel() {
  // Re-render whenever gold or party composition changes
  on("goldChanged", () => {
    if (document.getElementById("panelParty").classList.contains("active")) {
      renderPartyPanel();
    }
  });

  on("gemsChanged", () => {
    if (document.getElementById("panelParty").classList.contains("active")) {
      renderPartyPanel();
    }
  });

  on("partyChanged", () => {
    if (document.getElementById("panelParty").classList.contains("active")) {
      renderPartyPanel();
    }
  });

  on("buildingsChanged", () => {
    if (document.getElementById("panelParty").classList.contains("active")) {
      renderPartyPanel();
    }
  });
}

export function renderPartyPanel() {
  const panel = document.getElementById("panelParty");
  
  // Only do full render if this is the first time or panel is empty
  if (!panel.querySelector('.partyGrid')) {
    fullRenderPartyPanel();
  } else {
    updatePartyPanel();
  }
}

function fullRenderPartyPanel() {
  const panel = document.getElementById("panelParty");
  panel.innerHTML = `
    <div class="party-panel-header">
      <h2>Party</h2>
    </div>
  `;

  const container = document.createElement("div");
  container.classList.add("partyGrid");

  classes.forEach((cls, index) => {
    const partyCard = document.createElement("div");
    partyCard.classList.add("partyCard");
    partyCard.dataset.classId = cls.id;

    // Character image
    const imageDiv = document.createElement("div");
    imageDiv.classList.add("partyImage");
    const img = document.createElement("img");
    img.src = `../assets/images/classes/${cls.id}.png`;
    img.alt = cls.name;
    img.onerror = () => {
      img.style.display = 'none';
      imageDiv.innerHTML = `<div class="party-placeholder">${cls.name[0]}</div>`;
    };
    imageDiv.appendChild(img);

    // Class info overlay
    const infoOverlay = document.createElement("div");
    infoOverlay.classList.add("partyInfo");

    const nameDiv = document.createElement("div");
    nameDiv.classList.add("partyName");
    nameDiv.textContent = cls.name;
    nameDiv.textContent += ` (Lvl ${state.classLevels[cls.id] || 1})`;

    // Production info

    const productionDiv = document.createElement("div");
    productionDiv.classList.add("partyProduction");

    infoOverlay.appendChild(nameDiv);
    infoOverlay.appendChild(productionDiv);

    // Purchase/Recruit button
    const btn = document.createElement("button");
    btn.classList.add("purchaseBtn");
    btn.dataset.classId = cls.id;
    btn.dataset.index = index;

    // Span for cost text (this is what gets updated later)
    const costSpan = document.createElement("span");
    costSpan.classList.add("purchase-cost");
    btn.appendChild(costSpan);

    // Tooltip (persistent child)
    attachRequirementTooltip(btn, cls, { checkBuildingRequirements, getBuildingLevel, getHeroLevel: () => state.heroLevel });

    // Click listener once
    btn.addEventListener("click", () => {
      recruitClass(cls.id);
    });

    partyCard.appendChild(imageDiv);
    partyCard.appendChild(infoOverlay);
    partyCard.appendChild(btn);
    container.appendChild(partyCard);
  });

  panel.appendChild(container);

  // Update initial states
  updatePartyPanel();
}

function updatePartyPanel() {
  const currentGold = Math.floor(state.resources.gold);
  const currentGems = state.resources.gems;
  const currentPartySize = state.party.length;
  const currentPartyMembers = [...state.party];

  // Detect changes
  const goldChanged = currentGold !== lastPartyState.gold;
  const gemsChanged = currentGems !== (lastPartyState.gems || 0);
  const partySizeChanged = currentPartySize !== lastPartyState.partySize;
  const partyMembersChanged = !arraysEqual(currentPartyMembers, lastPartyState.partyMembers);

  if (!goldChanged && !gemsChanged && !partySizeChanged && !partyMembersChanged) {
    return;
  }

  const partyCards = document.querySelectorAll('.partyCard');

  partyCards.forEach(card => {
    const classId = card.dataset.classId;
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    // --- Update production display ---
    const productionDiv = card.querySelector('.partyProduction');
    const goldProduction = cls.goldIncomePerHit || 0;
    const gemProduction = cls.gemPerSecond || 0;

    let productionText = "";
    if (goldProduction > 0) {
      productionText += `${goldProduction.toFixed(1)}g/s`;
    }
    if (gemProduction > 0) {
      if (productionText) productionText += " ";
      productionText += `${gemProduction.toFixed(3)}💎/s`;
    }
    productionDiv.textContent = productionText || "";

    // --- Update level display ---
    const nameDiv = card.querySelector('.partyName');
    nameDiv.textContent = cls.name;
    nameDiv.textContent += ` (Lvl ${state.classLevels[cls.id] || 1})`;

    // --- Update purchase button ---
    const btn = card.querySelector('.purchaseBtn');
    const costSpan = btn.querySelector('.purchase-cost');

const isUnlocked = state.unlockedClasses.includes(cls.id);
const isInParty = state.party.some(member => member.id === cls.id);
const canAfford = state.resources.gold >= cls.goldCost && state.resources.gems >= (cls.gemCost || 0);
const buildingReqMet = checkBuildingRequirements(cls);
const partyFull = state.party.length >= state.maxPartySize;

btn.classList.remove("recruited", "blocked", "unaffordable", "affordable");

if (isInParty) {
  btn.classList.add("recruited");
  btn.disabled = false; // allow removal
  costSpan.textContent = "✓ In Party (click to remove)";
  btn.onclick = () => togglePartyMember(cls.id);

} else if (isUnlocked) {
  btn.classList.add("affordable");
  btn.disabled = partyFull;
  costSpan.textContent = partyFull ? "Party Full" : "Add to Party";
  btn.onclick = () => togglePartyMember(cls.id);

} else if (!buildingReqMet) {
  btn.classList.add("blocked");
  btn.disabled = true;
  costSpan.textContent = `${cls.goldCost}g${cls.gemCost > 0 ? ` ${cls.gemCost}💎` : ""}`;

} else if (!canAfford) {
  btn.classList.add("unaffordable");
  btn.disabled = true;
  costSpan.textContent = `${cls.goldCost}g${cls.gemCost > 0 ? ` ${cls.gemCost}💎` : ""}`;

} else {
  btn.classList.add("affordable");
  btn.disabled = false;
  costSpan.textContent = `${cls.goldCost}g${cls.gemCost > 0 ? ` ${cls.gemCost}💎` : ""}`;
  btn.onclick = () => recruitClass(cls.id);
}


    // --- Update card status ---
    card.classList.remove("recruited", "blocked", "unaffordable", "available");

    if (isInParty) {
      card.classList.add("recruited");
    } else if (!buildingReqMet) {
      card.classList.add("blocked");
    } else if (!canAfford || partyFull) {
      card.classList.add("unaffordable");
    } else {
      card.classList.add("available");
    }
  });

  // Save snapshot
  lastPartyState = {
    gold: currentGold,
    gems: currentGems,
    partySize: currentPartySize,
    partyMembers: currentPartyMembers
  };
}

// Helper
function checkBuildingRequirements(cls) {
  //console.log("Checking requirements for class:", cls.id);
  //console.log("character building:", cls.buildingRequired);
  if (!cls.buildingRequired) return true;
  
  // Handle single requirement (object) or multiple requirements (array)
  const requirements = Array.isArray(cls.buildingRequired) 
    ? cls.buildingRequired 
    : [cls.buildingRequired];
  
  return requirements.every(req => {
    const requiredLevel = getBuildingLevel(req.id);
    //console.log(`Checking ${req.id}: required ${req.level}, current ${requiredLevel}`);
    return requiredLevel >= req.level;
  });
}

// Helper function to get building level
function getBuildingLevel(buildingId) {
  if (!state.buildings) return 0;
  const buildingData = state.buildings.find(b => b.id === buildingId);
  return buildingData ? buildingData.level : 0;
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

// --- Recruit/Unlock a class (pays cost once) ---
function recruitClass(classId) {
  const cls = classes.find(c => c.id === classId);
  if (!cls) return;

  const alreadyUnlocked = state.unlockedClasses.includes(classId);
  const buildingReqMet = checkBuildingRequirements(cls);

  if (!alreadyUnlocked &&
      state.resources.gold >= cls.goldCost &&
      state.resources.gems >= (cls.gemCost || 0) &&
      buildingReqMet) {
    
    // Pay cost
    state.resources.gold -= cls.goldCost;
    state.resources.gems -= (cls.gemCost || 0);

    // Mark unlocked
    // Deep clone to avoid reference issues
    const clsTemplate = classes.find(c => c.id === classId);
    if (!clsTemplate) return;
    const clone = JSON.parse(JSON.stringify(clsTemplate));
    // Use current global level (default 1)
    const level = state.classLevels[classId] || 1;
    clone.level = level;

    state.classLevels[classId] = level;
    state.unlockedClasses.push(classId);
    console.log("Class unlocked:", clone);
    emit("classUnlocked", cls);
    emit("goldChanged", state.resources.gold);
    emit("gemsChanged", state.resources.gems);
  }
}

// --- Add/Remove from active party ---
function togglePartyMember(classId) {
  const idx = state.party.findIndex(member => member.id === classId);
  const clsTemplate = classes.find(c => c.id === classId);
  if (!clsTemplate) return;
  const clone = JSON.parse(JSON.stringify(clsTemplate));
  // Use current global level (default 1)
  const level = state.classLevels[classId] || 1;
  clone.level = level;

  if (idx !== -1) {
    // Remove from party
    state.party.splice(idx, 1);
    emit("partyChanged", state.party);
    updateResonance();
  } else if (state.party.length < state.maxPartySize) {
    // Add to party (only if unlocked)
    if (state.unlockedClasses.includes(classId)) {
      // Calculate stats before adding
      clone.stats = calculateStats(clone, level);
      console.log("Adding to party:", clone);
      state.party.push(clone);
      updateResonance();
      emit("partyChanged", state.party);
    }
  }
}

// Party resonance logic
const resonanceBonuses = {
  2: 50,
  3: 100,
  4: 200
};

function updateResonance() {
  const resonanceCounts = {};

  // Count resonance occurrences
  state.party.forEach(member => {
    const resonance = member.resonance;
    resonanceCounts[resonance] = (resonanceCounts[resonance] || 0) + 1;
  });

  // Apply bonuses
  Object.keys(resonanceCounts).forEach(resonance => {
    const count = resonanceCounts[resonance];
    const bonus = resonanceBonuses[count] || 0;
    state.elementalDmgModifiers[resonance] = (state.elementalDmgModifiers[resonance] || 0) + bonus;
  });
  console.log('[party resonance]: ', state.elementalDmgModifiers);
}
