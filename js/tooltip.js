import { getEnemyCanvasPosition } from "./area.js";
// tooltip.js

/**
 * Ensures a tooltip element exists inside a container (button, div, etc.)
 * Returns the tooltip DOM element.
 */
export function ensureTooltip(container) {
  //console.log('ensureTooltip called');
  let tooltip = container.querySelector(".requirement-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.classList.add("requirement-tooltip");
    container.appendChild(tooltip);
  }
  return tooltip;
}

export function ensureEnemyTooltip(container) {
  const existing = document.querySelector(`.enemy-tooltip[data-owner-id="${container.dataset.enemyId}"]`);
  if (existing) return existing;

  const tooltip = document.createElement("div");
  tooltip.classList.add("enemy-tooltip");
  tooltip.setAttribute("data-owner-id", container.dataset.enemyId); // optional for tracking
  document.body.appendChild(tooltip);
  return tooltip;
}


/**
 * Attaches hover listeners for showing/hiding a requirements tooltip.
 * Should be called once at initial render.
 *
 * @param {HTMLElement} container - The element (usually a button) that owns the tooltip
 * @param {Object} entity - The building, class, or other entity with requirements
 */
export function attachRequirementTooltip(container, entity, helpers) {
  ensureTooltip(container);

  container.addEventListener("mouseenter", (e) => {
    showRequirementTooltip(e.currentTarget, entity, helpers);
  });
  container.addEventListener("mouseleave", (e) => {
    hideRequirementTooltip(e.currentTarget);
  });
}

/**
 * Show requirements tooltip.
 * Looks up requirements and fills the tooltip text.
 */
export function showRequirementTooltip(container, entity, helpers) {
  const tooltip = container.querySelector(".requirement-tooltip");
  if (!tooltip) return;

  const { checkBuildingRequirements, getBuildingLevel, getHeroLevel } = helpers;
  const currentBuildingLevel = getBuildingLevel(entity.id);
  const heroLevel = getHeroLevel();

  // console.log('entity: ', entity);

  const buildingRequirements = entity.buildingRequired
    ? Array.isArray(entity.buildingRequired)
      ? entity.buildingRequired
      : [entity.buildingRequired]
    : [];

  const heroRequirement = entity.reqHeroLevel
    ? {
        id: 'Hero Level',
        level: entity.reqHeroLevel,
      }
    : null;

const buildingUpgradeLimit = {
  id: 'Building Upgrade Limit',
  level: heroLevel,
  description: `Max upgrade level capped at Hero Level (${heroLevel})`,
  met: currentBuildingLevel < heroLevel
};


  const allRequirements = [...buildingRequirements];
  if (heroRequirement) allRequirements.push(heroRequirement);
  allRequirements.push(buildingUpgradeLimit); // Always include it


const requirementsMet = allRequirements.every((req) => {
  if (req.id === 'Hero Level') {
    return heroLevel >= req.level;
  } else if (req.id === 'Building Upgrade Limit') {
    return req.met;
  } else {
    return getBuildingLevel(req.id) >= req.level;
  }
});


  if (requirementsMet) {
    tooltip.style.display = "none";
    return;
  }

  let tooltipText = "Requirements:<br>";
 
if (!buildingUpgradeLimit.met) {
  tooltipText += `<span style="color: #f44336">✗ ${buildingUpgradeLimit.description}</span><br>`;
}



  if (heroRequirement) {
    tooltipText += `<span style="color: ${getHeroLevel() >= heroRequirement.level ? "#4CAF50" : "#f44336"}">${getHeroLevel() >= heroRequirement.level ? "✓" : "✗"} Hero Level ${heroRequirement.level} (${getHeroLevel()})</span><br>`;
  }

  buildingRequirements.forEach((req) => {
    const currentLevel = getBuildingLevel(req.id);
    const met = currentLevel >= req.level;
    const status = met ? "✓" : "✗";
    const color = met ? "#4CAF50" : "#f44336";
    tooltipText += `<span style="color: ${color}">${status} ${req.id} Level ${req.level} (${currentLevel})</span><br>`;
  });

  tooltip.innerHTML = tooltipText;
  tooltip.style.display = "block";
}

export function showEnemyTooltip(container, enemy) {
  const tooltip = ensureEnemyTooltip(container);
  const pos = getEnemyCanvasPosition(enemy.position.row, enemy.position.col);
  if (!tooltip || !enemy) return;

  const formatList = (obj) =>
    obj && Object.keys(obj).length
      ? `<ul>${Object.entries(obj).map(([key, val]) => `<li>${key}: ${val}</li>`).join("")}</ul>`
      : `<em>None</em>`;

  tooltip.innerHTML = `
    <strong>${enemy.prefix} ${enemy.name}</strong><br>
    <div><strong>HP:</strong> ${enemy.hp} / ${enemy.maxHp}</div>
    <div><strong>Type:</strong> ${enemy.type} (${enemy.elementType})</div>
    <div><strong>Weaknesses:</strong> ${formatList(enemy.weaknesses)}</div>
    <div><strong>Counters:</strong> ${formatList(enemy.counters)}</div>
    <div><strong>Resistances:</strong> ${formatList(enemy.resistances)}</div>
  `;
  tooltip.style.display = "block";
  const rect = container.getBoundingClientRect();
  tooltip.style.top = `${pos.y/2}px`;
  tooltip.style.left = `${pos.x}px`;
  //console.log('showEnemyTooltip called for ', enemy);
  //console.log('Tooltip content: ', tooltip.innerHTML);
  //console.log("Tooltip position:", tooltip.getBoundingClientRect());

}

export function attachEnemyTooltip(container, enemy) {
  ensureEnemyTooltip(container);
  container.addEventListener("mouseenter", (e) => {
    showEnemyTooltip(container, enemy);
    const tooltip = document.querySelector(`.enemy-tooltip[data-owner-id="${container.dataset.enemyId}"]`);
    if (tooltip) {
      tooltip.style.top = `${e.clientY + 10}px`;
      tooltip.style.left = `${e.clientX + 10}px`;
    }
  });
  container.addEventListener("mouseleave", () => hideEnemyTooltip(container));
  container.addEventListener("click", () => {
    const tooltip = document.querySelector(`.enemy-tooltip[data-owner-id="${container.dataset.enemyId}"]`);
    const rect = tooltip?.getBoundingClientRect();
    const styles = tooltip ? window.getComputedStyle(tooltip) : null;
/*
    console.log("🔍 Enemy Card Clicked:");
    console.log("➡️ Enemy Object:", enemy);
    console.log("📦 Tooltip Element:", tooltip);
    console.log("📐 Tooltip Position:", rect);
    console.log("🎨 Tooltip Styles:", styles);
    console.log("🧭 Tooltip Display:", styles?.display);
    console.log("👁️ Tooltip Visibility:", styles?.visibility);
    console.log("🧱 Tooltip Opacity:", styles?.opacity);
    console.log("🧩 Tooltip Inner HTML:", tooltip?.innerHTML);
*/
  });
}


export function removeEnemyTooltipById(enemyId) {
  const tooltip = document.querySelector(`.enemy-tooltip[data-owner-id="${enemyId}"]`);
  if (tooltip) {
    //const container = document.querySelector(`[data-enemy-id="${uniqueId}"]`);    
    tooltip.style.display = "none";
    tooltip.remove();
    console.log(`Tooltip for enemy ${enemyId} removed`);
  }
}

export function removeAllEnemyTooltips() {
  const tooltips = document.querySelectorAll(".enemy-tooltip");
  tooltips.forEach((tooltip) => tooltip.remove());
  console.log("All enemy tooltips removed");
}



/**
 * Hide requirements tooltip.
 */
export function hideRequirementTooltip(container) {
  const tooltip = container.querySelector(".requirement-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
  }
}

export function hideEnemyTooltip(container) {
  const tooltip = document.querySelector(`.enemy-tooltip[data-owner-id="${container.dataset.enemyId}"]`);
  if (tooltip) {
    tooltip.style.display = "none";
  }
  console.log('hideRequirementTooltip called');
}
