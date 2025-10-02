// tooltip.js

/**
 * Ensures a tooltip element exists inside a container (button, div, etc.)
 * Returns the tooltip DOM element.
 */
export function ensureTooltip(container) {
  let tooltip = container.querySelector(".requirement-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.classList.add("requirement-tooltip");
    container.appendChild(tooltip);
  }
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

  console.log('entity: ', entity);

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


/**
 * Hide requirements tooltip.
 */
export function hideRequirementTooltip(container) {
  const tooltip = container.querySelector(".requirement-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
  }
}
