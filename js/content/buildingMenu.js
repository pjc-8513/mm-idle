import { state, partyState } from "../state.js";
import { buildings as BUILDING_DEFS } from './buildingDefs.js';
import { classes } from "./classes.js";
import { abilities } from "./abilities.js";
import { emit, on } from "../events.js";
import { logMessage } from "../systems/log.js";
import { openBuildingDock } from "../town.js";

export function initBuildingMenu() {
    on("goldChanged", () => {
  const dock = document.getElementById("buildingDock");
  if (dock && !dock.classList.contains("hidden")) {
    const currentBuildingId = dock.getAttribute("data-building-id");
    if (currentBuildingId) {
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
const TRAINING_EXP_GAIN = 50; // How much EXP you get per training

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
  inn: (building) => `
    <h3>Inn</h3>
    <div>
      Assign adventurers to increase income.<br>
      ${renderPartyAssignment(building)}
    </div>
  `,
  farm: unitProducingMenu,
  barracks: unitProducingMenu,
  thievesGuild: unitProducingMenu,
  darkTower: unitProducingMenu,
  archery: unitProducingMenu,
  temple: unitProducingMenu,
  grove: unitProducingMenu,
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
  console.log(name);
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
  if (state.resources.gold >= cost) {
    state.resources.gold -= cost;
    logMessage("That's the ticket!");
    emit("addHeroExp", TRAINING_EXP_GAIN);
    emit("goldChanged", state.resources.gold);
  } else {
    // Optional feedback (e.g. play a sound, flash red, etc.)
    console.log("Not enough gold!");
    logMessage("Not enough gold!");
  }

  // Re-render the dock to update button color & gold display
  //const building = { id: buildingId, name: "Training Center" };
  //openBuildingDock(building);
};