import { state, partyState, updateTotalStats } from "./state.js";
import { emit, on } from "./events.js";
import { buildings } from "./content/buildingDefs.js";
import { attachRequirementTooltip } from "./tooltip.js";
import { updateUnlockedSkills } from "./party.js";
import { calculateStats } from "./systems/math.js";
import { BUILDING_MENUS } from "./content/buildingMenu.js";

// Store the last state to detect changes
let lastBuildingState = {
  gold: -1,
  gems: -1,
  buildings: []
};

export function initBuildingPanel() {
  // Re-render whenever gold/gems or building composition changes
  on("goldChanged", () => {
    if (document.getElementById("panelTown").classList.contains("active")) {
      renderBuildingPanel();
    }
  });

  on("gemsChanged", () => {
    if (document.getElementById("panelTown").classList.contains("active")) {
      renderBuildingPanel();
    }
  });

  on("buildingsChanged", () => {
    if (document.getElementById("panelTown").classList.contains("active")) {
      renderBuildingPanel();
    }
  });
}

// close dock menu
document.addEventListener("click", (e) => {
  const dock = document.getElementById("buildingDock");
  if (!dock.classList.contains("hidden") && !dock.contains(e.target)) {
    closeBuildingDock();
  }
});


export function renderBuildingPanel() {
  const panel = document.getElementById("panelTown");
  
  // Only do full render if this is the first time or panel is empty
  if (!panel.querySelector('.buildingGrid')) {
    fullRenderBuildingPanel();
  } else {
    updateBuildingPanel();
  }
}

function fullRenderBuildingPanel() {
  const panel = document.getElementById("panelTown");
  panel.innerHTML = `
    <div class="building-panel-header">
      <h2>Buildings</h2>
    </div>
  `;

  const container = document.createElement("div");
  container.classList.add("buildingGrid");

  buildings.forEach((building, index) => {
    const buildingCard = document.createElement("div");
    buildingCard.classList.add("buildingCard");
    buildingCard.dataset.buildingId = building.id;

    // --- Building image ---
    const imageDiv = document.createElement("div");
    imageDiv.classList.add("buildingImage");
    const img = document.createElement("img");
    img.src = building.image;
    img.alt = building.name;
    img.onerror = () => {
      // fallback if image fails
      img.style.display = 'none';
      imageDiv.innerHTML = `<div class="building-placeholder">${building.name[0]}</div>`;
    };
    imageDiv.appendChild(img);

    // --- Building info overlay ---
    const infoOverlay = document.createElement("div");
    infoOverlay.classList.add("buildingInfo");

    const nameDiv = document.createElement("div");
    nameDiv.classList.add("buildingName");
    nameDiv.textContent = building.name;

    const levelDiv = document.createElement("div");
    levelDiv.classList.add("buildingLevel");

    const productionDiv = document.createElement("div");
    productionDiv.classList.add("buildingProduction");

    infoOverlay.appendChild(nameDiv);
    infoOverlay.appendChild(levelDiv);
    infoOverlay.appendChild(productionDiv);

    // --- Upgrade button ---
    const btn = document.createElement("button");
    btn.classList.add("upgradeBtn");
    btn.dataset.buildingId = building.id;
    btn.dataset.index = index;

    // Cost span (text updates will go here)
    const costSpan = document.createElement("span");
    costSpan.classList.add("upgrade-cost");
    btn.appendChild(costSpan);

    // Tooltip (persistent child of the button)
    attachRequirementTooltip(btn, building, { checkBuildingRequirements, getBuildingLevel, getHeroLevel: () => partyState.heroLevel });

    // Click listener (once)
    btn.addEventListener("click", () => {
      upgradeBuilding(building.id);
    });
    /*
    // Tooltip hover listeners (once)
    btn.addEventListener("mouseenter", (e) => {
      showRequirementTooltip(e.currentTarget, building);
    });
    btn.addEventListener("mouseleave", (e) => {
      hideRequirementTooltip(e.currentTarget);
    });
    */
    // --- Assemble card ---
    buildingCard.appendChild(imageDiv);
    buildingCard.appendChild(infoOverlay);
    buildingCard.appendChild(btn);
    buildingCard.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent bubbling to body
      openBuildingDock(building);
    });
    container.appendChild(buildingCard);
  });

  panel.appendChild(container);

  // After building the panel, update text & classes
  updateBuildingPanel();
}


function updateBuildingPanel() {
  const currentGold = Math.floor(state.resources.gold);
  const currentGems = state.resources.gems;
  const currentBuildings = [...(state.buildings || [])];
  const currentHeroLevel = partyState.heroLevel;

  // Detect changes
  const heroLevelChanged = currentHeroLevel !== (lastBuildingState.heroLevel || 0);
  const goldChanged = currentGold !== lastBuildingState.gold;
  const gemsChanged = currentGems !== (lastBuildingState.gems || 0);
  const buildingsChanged = !arraysEqual(currentBuildings, lastBuildingState.buildings);

  // If nothing changed, don't update
  if (!goldChanged && !gemsChanged && !buildingsChanged && !heroLevelChanged) {
    return;
  }

  const buildingCards = document.querySelectorAll('.buildingCard');

  buildingCards.forEach(card => {
    const buildingId = card.dataset.buildingId;
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const currentLevel = getBuildingLevel(buildingId);
    const nextLevelCost = calculateUpgradeCost(building, currentLevel);

    // --- Update building level (only if buildings changed) ---
    if (buildingsChanged) {
   //   console.log("Updating building card for:", buildingId, "to level", currentLevel);
      const levelDiv = card.querySelector('.buildingLevel');
      levelDiv.textContent = `Level ${currentLevel}`;
    }

    // --- Update production info (only if buildings changed) ---
    if (buildingsChanged) {
      const productionDiv = card.querySelector('.buildingProduction');
      if (currentLevel > 0) {
        const goldProduction = building.goldIncomePerHit * currentLevel;
        const gemProduction = building.gemPerSecond * currentLevel;

        let productionText = "";
        if (goldProduction > 0) {
          productionText += `${goldProduction.toFixed(1)}g/s`;
        }
        if (gemProduction > 0) {
          if (productionText) productionText += " ";
          productionText += `${gemProduction.toFixed(3)}💎/s`;
        }

        productionDiv.textContent = productionText || "No production";
        productionDiv.style.display = "block";
      } else {
        productionDiv.textContent = "";
        productionDiv.style.display = "none";
      }
    }

    // --- Update upgrade button (if gold/gems/buildings/hero level changed) ---
    if (goldChanged || gemsChanged || buildingsChanged || heroLevelChanged) {
      const btn = card.querySelector('.upgradeBtn');
      const canAfford = state.resources.gold >= nextLevelCost.gold &&
                       state.resources.gems >= nextLevelCost.gems;
      const meetsRequirements = checkBuildingRequirements(building) &&
                                currentLevel < partyState.heroLevel &&
                                currentHeroLevel >= (building.reqHeroLevel || 0);

      // Reset state-related classes (but don’t wipe children like tooltips)
      btn.classList.remove("blocked", "unaffordable", "affordable");

      if (!meetsRequirements) {
        btn.classList.add("blocked");
        btn.disabled = true;
      } else if (!canAfford) {
        btn.classList.add("unaffordable");
        btn.disabled = true;
      } else {
        btn.classList.add("affordable");
        btn.disabled = false;
      }

      const costSpan = btn.querySelector('.upgrade-cost');
      costSpan.textContent = `${nextLevelCost.gold}g${nextLevelCost.gems > 0 ? ` ${nextLevelCost.gems}💎` : ""}`;
        
    }

    // --- Update card appearance (only if buildings changed) ---
    if (buildingsChanged) {
      card.classList.remove("not-built", "low-level", "medium-level", "high-level");

      if (currentLevel === 0) {
        card.classList.add("not-built");
      } else if (currentLevel >= 10) {
        card.classList.add("high-level");
      } else if (currentLevel >= 5) {
        card.classList.add("medium-level");
      } else {
        card.classList.add("low-level");
      }
    }
  });

  // Save state snapshot
  // Save state snapshot (deep clone buildings to detect level changes)
  lastBuildingState = {
    gold: currentGold,
    gems: currentGems,
    buildings: currentBuildings.map(b => ({ ...b })), // <-- FIX
    heroLevel: currentHeroLevel
  };

}

/*
function showRequirementTooltip(button, building) {
  const tooltip = button.querySelector('.requirement-tooltip');
  if (!tooltip) {
    console.error('Tooltip element not found');
    return;
  }

  if (!building.buildingRequired || checkBuildingRequirements(building)) {
    tooltip.style.display = 'none';
    return;
  }

  const requirements = Array.isArray(building.buildingRequired) 
    ? building.buildingRequired 
    : [building.buildingRequired];
  
  let tooltipText = "Requirements:<br>";
  requirements.forEach(req => {
    const currentLevel = getBuildingLevel(req.id);
    const met = currentLevel >= req.level;
    const status = met ? "✓" : "✗";
    const color = met ? "#4CAF50" : "#f44336";
    tooltipText += `<span style="color: ${color}">${status} ${req.id} Level ${req.level} (${currentLevel})</span><br>`;
  });
  
  tooltip.innerHTML = tooltipText;
  tooltip.style.display = 'block';
}

function hideRequirementTooltip(button) {
  const tooltip = button.querySelector('.requirement-tooltip');
  if (!tooltip) {
    console.error('Tooltip element not found');
    return;
  }

  tooltip.style.display = 'none';
}
*/

// Helper function to get building level
export function getBuildingLevel(buildingId) {
  if (!state.buildings) return 0;
  const buildingData = state.buildings.find(b => b.id === buildingId);
  return buildingData ? buildingData.level : 0;
}

// Helper function to calculate upgrade cost (could be exponential scaling)
function calculateUpgradeCost(building, currentLevel) {
  const nextLevel = currentLevel + 1;
  const multiplier = Math.pow(1.5, currentLevel); // 50% cost increase per level
  
  return {
    gold: Math.floor(building.goldCost * multiplier),
    gems: Math.floor((building.gemCost || 0) * multiplier)
  };
}

// Helper function to check building requirements
function checkBuildingRequirements(building) {
  if (!building.buildingRequired) return true;
  
  // Handle single requirement (object) or multiple requirements (array)
  const requirements = Array.isArray(building.buildingRequired) 
    ? building.buildingRequired 
    : [building.buildingRequired];
  
  return requirements.every(req => {
    const requiredLevel = getBuildingLevel(req.id);
    return requiredLevel >= req.level;
  });
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((val, index) => JSON.stringify(val) === JSON.stringify(b[index]));
}

function upgradeBuilding(buildingId) {
  const lastTotalGems = state.resources.gems;
  console.log("Attempting to upgrade building:", buildingId);
  const building = buildings.find(b => b.id === buildingId);
  if (!building) return;

  const currentLevel = getBuildingLevel(buildingId);
  const upgradeCost = calculateUpgradeCost(building, currentLevel);

  if (state.resources.gold >= upgradeCost.gold &&
      state.resources.gems >= upgradeCost.gems && 
      currentLevel < partyState.heroLevel &&
      checkBuildingRequirements(building)) {
    
    state.resources.gold -= upgradeCost.gold;
    state.resources.gems -= upgradeCost.gems;
    
    // Initialize buildings array if it doesn't exist
    if (!state.buildings) {
      state.buildings = [];
    }
    
    // Find existing building or create new one
    let buildingData = state.buildings.find(b => b.id === buildingId);
    if (buildingData) {
      console.log('[Building Data]: ', buildingData);
      buildingData.level++;
    } else {
      state.buildings.push({ id: buildingId, level: 1 });
    }

    // --- NEW: upgrade linked classes ---
    if (building.upgradedClasses) {
      const upgraded = Array.isArray(building.upgradedClasses)
        ? building.upgradedClasses
        : [building.upgradedClasses];

      upgraded.forEach(uc => {
        const classId = uc.id;

        partyState.classLevels[classId] = (partyState.classLevels[classId] || 1) + 1;

        const newLevel = partyState.classLevels[classId];

        // Update unlocked class reference
        const unlockedClass = partyState.unlockedClasses.find(c => c.id === classId);
        if (unlockedClass) unlockedClass.level = newLevel;

        // 🔥 NEW: Update party member if present
        const partyMember = partyState.party.find(p => p.id === classId);
        if (partyMember) {
          partyMember.level = newLevel;
          updateUnlockedSkills(partyMember); // check for skill unlocks
          partyMember.stats = calculateStats(partyMember, newLevel);
          emit("partyMemberUpdated", partyMember);
          updateTotalStats(); // 🔥 update totals after removing
        }

        emit("classUpgraded", { id: classId, level: newLevel });
      });
    }
    // Emit upgrade event with building data
    emit("buildingUpgraded", { ...building, level: buildingData ? buildingData.level : 1 });

    emit("goldChanged", state.resources.gold);
    if (state.resources.gems !== lastTotalGems) emit("gemsChanged", state.resources.gems);
    emit("buildingsChanged", state.buildings);
  }
}

export function openBuildingDock(building) {
  const dock = document.getElementById("buildingDock");
  const renderer = BUILDING_MENUS[building.id];

  if (renderer) {
    dock.setAttribute("data-building-id", building.id); // ✅ track open building
    dock.innerHTML = renderer(building);
    dock.classList.remove("hidden");

    // ✅ Prevent clicks inside the dock from closing it
    dock.onclick = (e) => e.stopPropagation();
  } else {
    dock.innerHTML = `<h3>${building.name}</h3><p>No actions available.</p>`;
    dock.classList.remove("hidden");
  }
}

function closeBuildingDock() {
  const dock = document.getElementById("buildingDock");
  dock.classList.add("hidden");
}
