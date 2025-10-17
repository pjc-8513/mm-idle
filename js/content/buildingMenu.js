import { state, partyState } from "../state.js";
import { buildings as BUILDING_DEFS } from './buildingDefs.js';
import { classes } from "./classes.js";
import { abilities } from "./abilities.js";

export const BUILDING_MENUS = {
  trainingCenter: (building) => `
    <h3>Training Center</h3>
    <div>
      <button onclick="exchangeGoldForExp('${building.id}')">Spend Gold for EXP</button>
    </div>
  `,
  inn: (building) => `
    <h3>Inn</h3>
    <div>
      Assign adventurers to increase income.<br>
      ${renderPartyAssignment(building)}
    </div>
  `,
  farm: unitProducingMenu,
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
