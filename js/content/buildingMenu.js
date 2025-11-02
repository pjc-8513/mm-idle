import { state, partyState } from "../state.js";
import { buildings as BUILDING_DEFS } from './buildingDefs.js';
import { classes } from "./classes.js";
import { abilities } from "./abilities.js";
import { emit, on } from "../events.js";
import { logMessage } from "../systems/log.js";
import { getBuildingLevel } from "../town.js";
//import { openDock } from "../systems/dockManager.js";

export function initBuildingMenu() {
    on("goldChanged", () => {
  const dock = document.getElementById("mainDock");
  if (dock && !dock.classList.contains("hidden")) {
    const currentBuildingId = dock.getAttribute("data-building-id");
    if (currentBuildingId && state.activePanel === "panelTown") {
      const building = state.buildings.find(b => b.id === currentBuildingId) 
        || { id: currentBuildingId, name: "Building" };
      const renderer = BUILDING_MENUS[currentBuildingId];
//      console.log('[building menu] renderer: ', renderer);
      if (renderer) dock.innerHTML = renderer(building);
      }
    }
  });
  console.log('buildingMenu initialized!');
}

// You can tweak this cost formula as you like:
const TRAINING_COST = () => 100 * partyState.heroLevel;  // Example: scales with hero level
let TRAINING_EXP_GAIN = 50; // How much EXP you get per training

export const BUILDING_MENUS = {
  trainingCenter: (building) => {
    // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Training Center</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first to unlock hero training!</p>
      `;
    }

    const cost = TRAINING_COST();
    const canAfford = state.resources.gold >= cost;
    const btnColor = canAfford ? "green" : "red";

    return `
      <h3>Training Center</h3>
        <div class="building-stats">
        <p>Need some training?</p>
        <p>Cost: <strong>${cost} gold</strong></p>
        </div>
        <button 
          style="background-color: ${btnColor};" 
          onclick="exchangeGoldForExp('${building.id}')"
        >
          Train for EXP
        </button>
      </div>
    `;
  },
  blacksmith: (building) => {
        // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Blacksmith</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first in order to increase hero attack!</p>
      `;
    } else {
    return `
      <h3>Blacksmith</h3>
        <div class="building-stats">
        <p>Level up to raise the attack of your hero!</p>
      </div>
      <div>
        <p>Current attack bonus: ${partyState.heroBonuses.attack} </p>
      </div>
    `;
    }
  },
  library: (building) => {
            // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Library</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first in order to unlock spell drops and increase element effectiveness!</p>
      `;
    } else {
      const bonus = (buildingLevel * 50) / 100;
      return`
      <h3>Library</h3>
      <div class="building-stats">
        <p>Level up to raise the tier of spell drops available and increase spell effectiveness!</p>
      </div>
      <div>
        <p>Current spell modifier bonus from library: ${bonus} </p>
      </div>
      `;
    }
  },
  inn: (building) => {
        // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Inn</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first to unlock hero training!</p>
      `;
    } 
    
    return `
    <h3>Inn</h3>
    <div class="building-stats">
      <p style="text-align: center; margin: 8px 0;">Assign adventurers to increase income.</p>
    </div>
    ${renderPartyAssignment(building)}
  `;
},
  farm: unitProducingMenu,
  barracks: unitProducingMenu,
  thievesGuild: unitProducingMenu,
  darkTower: unitProducingMenu,
  archery: unitProducingMenu,
  temple: unitProducingMenu,
  grove: unitProducingMenu,
  belltower: unitProducingMenu,
  magicConflux: (building) => `
    <h3>Magic Conflux</h3>
    <div>
      <button onclick="increaseElementalPower('${building.id}')">Boost Elemental Power</button>
    </div>
  `
};


function getClassInfo(classId) {
  const level = partyState.classLevels[classId];
  const thisClass = classes.find((b) => b.id === classId);
  const name = thisClass.name;
  //console.log(name);
  if (level === undefined){ 
    return{
        id: classId,
        name: name,
        level: 0
    } 
    }
  return {
    id: classId,
    name: name,
    level
  };
}

function getBuildingInfo(buildingId, level) {
  //console.log(`building.id ${buildingId}`);
  const def = BUILDING_DEFS.find((b) => b.id === buildingId);
  if (!def) return null;

  let effects = {};
  if (typeof def.effects === "function") {
    effects = def.effects(level);
  } else {
    effects = {
      goldIncomePerHit: def.goldIncomePerHit ?? 0,
      gemPerSecond: def.gemPerSecond ?? 0,
    };
  }

  let classInfo = [];
  if (def.upgradedClasses) {
    const upgradedClasses = Array.isArray(def.upgradedClasses)
      ? def.upgradedClasses
      : [def.upgradedClasses];

    classInfo = upgradedClasses.map((uc) => getClassInfo(uc.id)).filter(Boolean).map((classData) => ({
      id: classData.id,
      name: classData.name,
      level: classData.level,
    }));
  }

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    image: def.image,
    level,
    effects,
    classes: classInfo,
  };
}


function unitProducingMenu(building) {
 // console.log('unit producing building: ', building);
  const info = getBuildingInfo(building.id, building.level);
  const income = info?.effects?.goldIncomePerHit ?? 0;

  const upgradedUnits = (info?.classes ?? [])
    .map(
      (cls) => `
        <div class="unit-info">
          <strong>${cls.name}</strong> (Lv ${cls.level})
        </div>
      `
    )
    .join("");

  return `
    <h3>${info?.name ?? building.id}</h3>
    ${info?.description ? `<p>${info.description}</p>` : ""}
    <div class="building-stats">
      <p><strong>Income per hit:</strong> ${income} gold</p>
    </div>
    <div class="upgraded-units">
      <h4>Upgrades:</h4>
      ${upgradedUnits || "<p>No upgraded units.</p>"}
    </div>
  `;
}

// --- Training function ---
window.exchangeGoldForExp = function (buildingId) {
  const cost = TRAINING_COST();
  const trainingLevel = getBuildingLevel(buildingId);
  TRAINING_EXP_GAIN = 50 + (trainingLevel - 1) * 10; // Increase EXP gain with building level
  if (state.resources.gold >= cost) {
    state.resources.gold -= cost;
    logMessage("That's the ticket!");
    emit("addHeroExp", TRAINING_EXP_GAIN);
    emit("goldChanged", state.resources.gold);
  } else {
    // Optional feedback (e.g. play a sound, flash red, etc.)
   // console.log("Not enough gold!");
    logMessage("Not enough gold!");
  }

};

function renderPartyAssignment(building) {
  const unlockedSlots = getUnlockedInnSlots();

  const slotsHTML = state.innAssignments.slots.map((classId, index) => {
    const isUnlocked = index < unlockedSlots;
    const assignedClass = classes.find(c => c.id === classId);
    const label = assignedClass ? assignedClass.name : "Empty";
    const image = assignedClass ? assignedClass.image : "";
    const slotClass = assignedClass ? "assigned-slot" : "empty-slot";

    return `
      <div 
        class="inn-slot ${slotClass}" 
        onclick="${isUnlocked ? `assignToInnSlot(${index})` : ''}"
        title="${isUnlocked ? (assignedClass ? assignedClass.description : 'Click to assign') : 'Locked slot'}"
        style="${isUnlocked ? '' : 'opacity: 0.4; pointer-events: none;'}"
      >
        ${image ? `<img src="${image}" alt="${label}" class="class-icon" />` : ''}
        <span class="slot-label">${isUnlocked ? label : 'Locked'}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="inn-assignment-container">
      <p>Gold Income Bonus: ${(state.innAssignments.goldIncomeMultiplier * 100).toFixed(0)}%</p>
      <div class="inn-slots">
        ${slotsHTML}
      </div>
      <p>${unlockedSlots} / 4 slots unlocked (Inn Level ${getUnlockedInnSlots() * 10 - 9}+)</p>
    </div>
  `;
}




window.assignToInnSlot = function (slotIndex) {
  const current = state.innAssignments.slots[slotIndex];

  if (current) {
    // Unassign
    state.innAssignments.slots[slotIndex] = null;
    state.innAssignments.goldIncomeMultiplier -= 0.2;
    logMessage(`Slot ${slotIndex + 1} unassigned.`);
  } else {
    // Get list of already assigned class IDs
    const assignedClassIds = state.innAssignments.slots.filter(Boolean);

    // Filter for unlocked and unassigned classes
    const unlockedClasses = classes.filter(cls => {
      const building = state.buildings.find(b => b.id === cls.buildingRequired.id);
      const isUnlocked = building && building.level >= cls.buildingRequired.level;
      const isUnassigned = !assignedClassIds.includes(cls.id);
      return isUnlocked && isUnassigned;
    });

    if (unlockedClasses.length === 0) {
      logMessage("No unlocked classes available.");
      return;
    }

    const randomClass = unlockedClasses[Math.floor(Math.random() * unlockedClasses.length)];
    state.innAssignments.slots[slotIndex] = randomClass.id;
    state.innAssignments.goldIncomeMultiplier += 0.2;
    logMessage(`${randomClass.name} assigned to slot ${slotIndex + 1}.`);
  }

  // Re-render the inn menu. Prefer a dedicated #building-menu container if present,
  // otherwise render into the main dock. This prevents errors when the
  // #building-menu element isn't present in the DOM.
  const dock = document.getElementById("mainDock");
  const currentBuildingId = dock?.getAttribute("data-building-id") || "inn";
  const innMenu = BUILDING_MENUS.inn({ id: currentBuildingId });
  const container = document.querySelector("#building-menu") || dock;
  if (container) {
    container.innerHTML = innMenu;
  } else {
    console.warn("assignToInnSlot: no container found to render inn menu");
  }
};

function getUnlockedInnSlots() {
  const inn = state.buildings.find(b => b.id === "inn");
  const level = inn ? inn.level : 0;
  return Math.min(1 + Math.floor(level / 10), 4);
}


function enforceInnSlotLimits() {
  const unlocked = getUnlockedInnSlots();
  for (let i = unlocked; i < state.innAssignments.slots.length; i++) {
    if (state.innAssignments.slots[i]) {
      state.innAssignments.slots[i] = null;
      state.innAssignments.goldIncomeMultiplier -= 0.2;
    }
  }
}
