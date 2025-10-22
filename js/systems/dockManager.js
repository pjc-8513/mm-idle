import { BUILDING_MENUS } from "../content/buildingMenu.js";
import { AREA_MENUS } from "../area.js";


/*
export const DOCK_TYPES = {
  BUILDING: "building",
  PARTY: "party",
  AREA: "area", // new universal grid context dock
};


export function openDock(type, data) {
  const dock = document.getElementById("mainDock");
  let contentHTML = "";

  switch (type) {
    case DOCK_TYPES.BUILDING:
       // console.log(`building ${type}`);
      //  console.log('data: ', data);
      contentHTML = getBuildingMenu(data);
      break;

    case DOCK_TYPES.PARTY:
      contentHTML = getPartyMenu(data);
      break;

    case DOCK_TYPES.AREA:
      contentHTML = getAreaMenu(data);
      break;

    default:
      contentHTML = `<p>No dock available for this type.</p>`;
  }

  dock.innerHTML = contentHTML;
  dock.classList.add("visible");
  console.log('dock element: ', dock);
}
*/

export const DOCK_TYPES = {
  BUILDING: "building",
  PARTY: "party",
  AREA: "area",
};

function getDock() {
  return document.getElementById("mainDock");
}

const dockState = {
  open: false,
  type: null,
  context: null,         // payload (e.g. { type: "enemy", data: enemy })
  sourcePanel: null,     // e.g. "panelTown"
  sourceEl: null,        // DOM element that opened the dock (so clicks on it won't close)
  persist: false,        // if true, dock doesn't auto-close on panel switch
};

function renderContent() {
  if (!dockState.type) return `<p>No dock available.</p>`;

  switch (dockState.type) {
    case DOCK_TYPES.BUILDING:
      return getBuildingMenu(dockState.context);
    case DOCK_TYPES.PARTY:
      return BUILDING_MENUS.party ? BUILDING_MENUS.party(dockState.context) : `<p>No party menu</p>`;
    case DOCK_TYPES.AREA:
      return getAreaMenu(dockState.context);
    default:
      return `<p>No dock available for this type.</p>`;
  }
}

export function openDock(type, context = {}, opts = {}) {
  // opts: { sourcePanel: "panelTown", sourceEl: HTMLElement, persist: false }
  dockState.type = type;
  dockState.context = context;
  dockState.sourcePanel = opts.sourcePanel || null;
  dockState.sourceEl = opts.sourceEl || null;
  dockState.persist = !!opts.persist;

  const dockEl = getDock();
  if (!dockEl) {
    console.warn("openDock: #mainDock not found in DOM");
    return;
  }

  dockEl.innerHTML = renderContent();
  dockEl.classList.remove("hidden");
  dockEl.classList.add("visible");
  dockEl.setAttribute("data-dock-type", type);
  if (dockState.sourcePanel) dockEl.setAttribute("data-source-panel", dockState.sourcePanel);
  else dockEl.removeAttribute("data-source-panel");
  dockState.open = true;
}

function getAreaMenu(context) {
    const dock = document.getElementById("mainDock");
    //console.log('dock element: ', dock);
    //console.log('context: ', context);
  if (context.type === "enemy"){ 
    dock.classList.remove("hidden");
    return AREA_MENUS.enemy(context.data);}
//  if (context.type === "party") return AREA_MENUS.party(context.data);
  if (context.type === "quickSpells") return AREA_MENUS.quickSpells(context.data);
  return `<p>No area context available.</p>`;
}


export function getBuildingMenu(building) {
    //console.log('context: ', building);
  const dock = document.getElementById("mainDock");
  const renderer = BUILDING_MENUS[building.id];
    //console.log(renderer);
  if (renderer) {
    dock.setAttribute("data-building-id", building.id); // ✅ track open building
   // dock.innerHTML = renderer(building);
    dock.classList.remove("hidden");
    // ✅ Prevent clicks inside the dock from closing it
    dock.onclick = (e) => e.stopPropagation();
    return renderer(building);
  } else {
    //dock.innerHTML = `<h3>${building.name}</h3><p>No actions available.</p>`;
    dock.classList.remove("hidden");
    return `<h3>${building.name}</h3><p>No actions available.</p>`;
  }
}

export function closeDock(opts = {}) {
  // opts: { force: boolean }
  const force = !!opts.force;

  // If not forced and in panelArea, keep the spell dock open
  if (!force && dockState.sourcePanel === "panelArea" && dockState.type === DOCK_TYPES.AREA) {
    // If the current dock isn't showing quick spells, show them
    if (dockState.context?.type !== "quickSpells") {
      openDock(DOCK_TYPES.AREA, { type: "quickSpells" }, {
        sourcePanel: "panelArea",
        persist: false
      });
    }
    // Don't close the dock
    return;
  }

  // Otherwise, close normally
  dockState.open = false;
  dockState.type = null;
  dockState.context = null;
  dockState.sourcePanel = null;
  dockState.sourceEl = null;
  dockState.persist = false;
  const dockEl = getDock();
  if (!dockEl) return;

  dockEl.classList.remove("visible");
  dockEl.classList.add("hidden");
  dockEl.removeAttribute("data-dock-type");
  dockEl.innerHTML = "";
}


export function updateDockIfEnemyChanged(updatedEnemy) {
  const dock = document.getElementById("mainDock");

  // Is the dock currently showing an enemy?
  const currentType = dock.getAttribute("data-dock-type");
  if (currentType !== "area") return;

  const areaMenu = dock.querySelector(".area-menu[data-enemy-id]");
  if (!areaMenu) return;

  const currentEnemyId = areaMenu.getAttribute("data-enemy-id");
  if (currentEnemyId !== updatedEnemy.uniqueId) return;

  // Re-render with the new enemy data
  dock.innerHTML = AREA_MENUS.enemy(updatedEnemy);
}


export function toggleDock(type, context = {}, opts = {}) {
  // simple toggle logic: if same dock open - close; else open new
  if (dockState.open && dockState.type === type && JSON.stringify(dockState.context) === JSON.stringify(context)) {
    closeDock();
  } else {
    openDock(type, context, opts);
  }
}

/* ---------- ESC key closes dock ---------- */
document.addEventListener("keydown", (e) => {
  if (!dockState.open) return;
  if (e.key === "Escape" || e.key === "Esc") {
    closeDock();
  }
});

/* ---------- Click-away handler (single global) ---------- */
/* Logic:
   - If dock not open -> do nothing
   - If click is inside dock -> do nothing
   - If click is on the sourceEl -> do nothing (so repeated clicks on opener don't close immediately)
   - If click is inside the sourcePanel DOM subtree -> do nothing (so interacting with same panel doesn't close)
   - Otherwise close dock.
*/
document.addEventListener("click", (e) => {
  if (!dockState.open) return;

  const clickEl = e.target;

  const dockEl = getDock();
  if (!dockEl) return;

  // inside dock -> keep open
  if (dockEl.contains(clickEl)) return;

  // click on opener element -> keep open
  if (dockState.sourceEl && (dockState.sourceEl === clickEl || dockState.sourceEl.contains(clickEl))) return;

  // click inside source panel -> keep open
  if (dockState.sourcePanel) {
    const panelEl = document.getElementById(dockState.sourcePanel);
    if (panelEl && panelEl.contains(clickEl)) return;
  }

  // otherwise close
  closeDock();
});