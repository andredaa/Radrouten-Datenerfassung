import { switchMapStyle } from '../map.js';
import { state } from '../state.js';
import { backendUrl, highlightNeighborhood } from '../config.js';
import { hamburgNeighborhoods } from './hamburgNeighborhoods.js';

// Segmentation tool state (local to this page, not part of the shared app state)
let segmentStart = null; // fid of the segment's start feature
let segmentEnd = null; // fid of the segment's end feature
const segmentFeatureIds = new Set(); // fids of features "in between" start and end
let currentFeature = null; // feature currently shown in the segmentation dialog
const alreadyProcessedFids = new Set(); // fids that have already been saved as part of a segment

function getFid(feature) {
  return feature?.properties?.fid;
}

// Show feature properties + segmentation actions dialog
export function segmentationDialog(feature) {
  currentFeature = feature;

  const infoProperties = document.getElementById("segmentationProperties");
  infoProperties.innerHTML = '';

  const properties = feature.properties;

  const relevantProps = [
    "breite",
    "radweg_art",
    "oberflaeche",
    "fuehrungsart",
    "strassenname",
    "zweirichtung",
    "fid"
  ];

  // Add only the relevant feature properties
  Object.entries(properties).forEach(([key, value]) => {
    if (relevantProps.indexOf(key) === -1) {
      return;
    }
    const row = document.createElement('div');
    row.className = 'property-row';

    // Format the key to be more readable
    const formattedKey = key.replace(/_/g, ' ').replace(/:/g, ' - ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Handle null values
    const displayValue = value === null ? 'N/A' : value;

    row.innerHTML = `
      <div class="property-key">${formattedKey}:</div>
      <div class="property-value">${displayValue}</div>
    `;
    infoProperties.appendChild(row);
  });

  document.getElementById("segmentationDialog").classList.add("show");
}

// Close segmentation dialog
export function closeSegmentation() {
  document.getElementById("segmentationDialog").classList.remove("show");
  currentFeature = null;
}

// Set the currently opened feature as the segment start
function setAsStart() {
  if (!currentFeature) return;
  const fid = getFid(currentFeature);

  segmentFeatureIds.delete(fid);
  segmentStart = fid;

  updateSegmentUi();
  closeSegmentation();
}

// Set the currently opened feature as the segment end
function setAsEnd() {
  if (!currentFeature) return;
  const fid = getFid(currentFeature);

  segmentFeatureIds.delete(fid);
  segmentEnd = fid;

  updateSegmentUi();
  closeSegmentation();
}

// Add the currently opened feature to the segment (neither start nor end)
function addFeatureToSegment() {
  if (!currentFeature) return;
  const fid = getFid(currentFeature);

  if (fid === segmentStart || fid === segmentEnd) return;
  segmentFeatureIds.add(fid);

  updateSegmentUi();
  closeSegmentation();
}

// Reset the whole segment selection
function clearSegment() {
  segmentStart = null;
  segmentEnd = null;
  segmentFeatureIds.clear();
  updateSegmentUi();
}

// Refresh the status panel labels/buttons and the map highlight layers
function updateSegmentUi() {
  const startValue = document.getElementById("segmentStartValue");
  const endValue = document.getElementById("segmentEndValue");
  const featuresValue = document.getElementById("segmentFeaturesValue");
  const saveBtn = document.getElementById("saveSegmentBtn");

  if (startValue) startValue.textContent = segmentStart ?? "-";
  if (endValue) endValue.textContent = segmentEnd ?? "-";
  if (featuresValue) featuresValue.textContent = segmentFeatureIds.size;
  if (saveBtn) saveBtn.disabled = segmentStart === null || segmentEnd === null;

  updateSegmentHighlightLayers();
}

// Re-apply the start/end/between filters to the map highlight layers
function updateSegmentHighlightLayers() {
  if (!state.map) return;

  const betweenIds = [...segmentFeatureIds];

  if (state.map.getLayer("radnetz-start")) {
    state.map.setFilter("radnetz-start", ["==", ["get", "fid"], segmentStart ?? -1]);
  }
  if (state.map.getLayer("radnetz-end")) {
    state.map.setFilter("radnetz-end", ["==", ["get", "fid"], segmentEnd ?? -1]);
  }
  if (state.map.getLayer("radnetz-between")) {
    state.map.setFilter(
      "radnetz-between",
      betweenIds.length
        ? ["in", ["get", "fid"], ["literal", betweenIds]]
        : ["==", ["get", "fid"], -1]
    );
  }
}

// Re-apply the already-processed fids to the black highlight layer
function updateProcessedHighlightLayer() {
  if (!state.map) return;

  const processedIds = [...alreadyProcessedFids];

  if (state.map.getLayer("radnetz-processed")) {
    state.map.setFilter(
      "radnetz-processed",
      processedIds.length
        ? ["in", ["get", "fid"], ["literal", processedIds]]
        : ["==", ["get", "fid"], -1]
    );
  }
}

// Post the current segment (start, end, segment_ids) to the backend
async function saveSegmentation() {
  if (segmentStart === null || segmentEnd === null) return;

  const saveBtn = document.getElementById("saveSegmentBtn");
  const segmentIds = [...new Set([segmentStart, segmentEnd, ...segmentFeatureIds])];

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Speichern...";
  }

  try {
    const url = `${backendUrl}/new_radnetz_segment`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: segmentStart,
        end: segmentEnd,
        segment_ids: segmentIds,
      }),
    });

    if (!response.ok) {
      console.error("Failed to save radnetz segment:", response.status);
      alert("Segment konnte nicht gespeichert werden.");
      return;
    }

    segmentIds.forEach((fid) => alreadyProcessedFids.add(fid));
    updateProcessedHighlightLayer();

    clearSegment();
  } catch (e) {
    console.error("could not save radnetz segment", e);
    alert("Segment konnte nicht gespeichert werden.");
  } finally {
    if (saveBtn) {
      saveBtn.textContent = "Segment speichern";
      saveBtn.disabled = segmentStart === null || segmentEnd === null;
    }
  }
}

// Setup all event listeners
export function setupEventListeners() {
  const styleBtns = document.querySelectorAll(".style-btn");
  const segmentationDialogEl = document.getElementById("segmentationDialog");
  const closeSegmentationBtn = document.getElementById("closeSegmentation");
  const setStartBtn = document.getElementById("setStartBtn");
  const setEndBtn = document.getElementById("setEndBtn");
  const addFeatureBtn = document.getElementById("addFeatureBtn");
  const saveSegmentBtn = document.getElementById("saveSegmentBtn");
  const clearSegmentBtn = document.getElementById("clearSegmentBtn");

  // Style switcher buttons
  styleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      switchMapStyle(btn.dataset.style);
    });
  });

  // segmentation dialog buttons
  closeSegmentationBtn.addEventListener("click", closeSegmentation);
  setStartBtn.addEventListener("click", setAsStart);
  setEndBtn.addEventListener("click", setAsEnd);
  addFeatureBtn.addEventListener("click", addFeatureToSegment);

  // segment status panel buttons
  saveSegmentBtn.addEventListener("click", saveSegmentation);
  clearSegmentBtn.addEventListener("click", clearSegment);

  // Close dialog when clicking outside of it
  segmentationDialogEl.addEventListener("click", (e) => {
    if (e.target === segmentationDialogEl) {
      closeSegmentation();
    }
  });

  // Keyboard shortcut: "a" adds the currently opened feature to the segment
  document.addEventListener("keydown", (e) => {
    if ((e.key === "a" || e.key === "A") && segmentationDialogEl.classList.contains("show")) {
      addFeatureToSegment();
    }
  });

  updateSegmentUi();
}

async function getRadnetzLayer() {
  const url = `${backendUrl}/get_layer?layer_name=radnetz`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch radnetz layer:", response.status);
      return { type: "FeatureCollection", features: [] };
    }

    return await response.json();
  } catch (e) {
    console.error("could not fetch radnetz layer", e);
    return { type: "FeatureCollection", features: [] };
  }
}

async function getRadnetzProcessed() {
  const url = `${backendUrl}/get_radnetz_fids_segmented`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch already processed radnetz fids:", response.status);
      return [];
    }

    return await response.json();
  } catch (e) {
    console.error("could not fetch processed fids for radnetz", e);
    return [];
  }
}

// Initialize radnetz layer on the map
export async function initSegmentation() {
  if (!state.map) return;

  const data = await getRadnetzLayer();

  data.features.forEach((feature, index) => {
    feature.properties.feature_index = index;
  });

  // add fids of previously processed features to the alreadyProcessed set
  const processedPreviously = await getRadnetzProcessed();
  processedPreviously.forEach((fid) => alreadyProcessedFids.add(fid));

  if (highlightNeighborhood) {
    // Add source and layer
    state.map.addSource("hamburg-neighborhood-source", {
      type: "geojson",
      data: hamburgNeighborhoods,
    });

  // Base layer: alternating light/dark blue depending on fid parity
  state.map.addLayer({
    id: "hamburg-neighborhood",
    type: "line",
    source: "hamburg-neighborhood-source",
    paint: {
      "line-color": "#d85256",
      "line-width": 4,
    },
    filter: ["==", ["get", "stadtteil_name"], highlightNeighborhood],
  });
  }

  // Add source and layer
  state.map.addSource("radnetz-source", {
    type: "geojson",
    data,
  });

  // Casing layer: inverted alternating color outline — even gets dark casing, odd gets light casing
  // so adjacent features always have contrasting borders even where they touch
  state.map.addLayer({
    id: "radnetz-line-casing",
    type: "line",
    source: "radnetz-source",
    paint: {
      "line-color": [
        "case",
        ["has", "feature_index"],
        [
          "case",
          ["==", ["%", ["to-number", ["get", "feature_index"]], 2], 0],
          "#1e3a8a", // even: dark blue casing (opposite of fill)
          "#60a5fa"  // odd: light blue casing (opposite of fill)
        ],
        "#ffffff"  // fallback
      ],
      "line-width": 7,
    }
  });

  // Base layer: alternating light/dark blue depending on fid parity
  state.map.addLayer({
    id: "radnetz-line",
    type: "line",
    source: "radnetz-source",
    paint: {
      "line-color": [
        "case",
        ["has", "feature_index"],
        [
          "case",
          ["==", ["%", ["to-number", ["get", "feature_index"]], 2], 0],
          "#60a5fa", // even: light blue
          "#1e3a8a"  // odd: dark blue
        ],
        "#000000"  // fallback: black
      ],
      "line-width": 4,
    }
  });

  // Highlight layer: fids that have already been saved as part of a segment (black)
  state.map.addLayer({
    id: "radnetz-processed",
    type: "line",
    source: "radnetz-source",
    paint: {
      "line-color": "#d710de",
      "line-width": 4,
    },
    filter: ["==", ["get", "fid"], -1],
  });

  // Highlight layer: features added "in between" start and end (yellow)
  state.map.addLayer({
    id: "radnetz-between",
    type: "line",
    source: "radnetz-source",
    paint: {
      "line-color": "#facc15",
      "line-width": 6,
    },
    filter: ["==", ["get", "fid"], -1],
  });

  // Highlight layer: segment end (orange)
  state.map.addLayer({
    id: "radnetz-end",
    type: "line",
    source: "radnetz-source",
    paint: {
      "line-color": "#f97316",
      "line-width": 7,
    },
    filter: ["==", ["get", "fid"], -1],
  });

  // Highlight layer: segment start (green)
  state.map.addLayer({
    id: "radnetz-start",
    type: "line",
    source: "radnetz-source",
    paint: {
      "line-color": "#22c55e",
      "line-width": 7,
    },
    filter: ["==", ["get", "fid"], -1],
  });

  // Re-apply the current selection to the freshly (re)created highlight layers
  updateSegmentHighlightLayers();
  updateProcessedHighlightLayer();

  // Label layer: show feature_index at the midpoint of each line
  state.map.addLayer({
    id: "radnetz-label",
    type: "symbol",
    source: "radnetz-source",
    layout: {
      "symbol-placement": "line-center",
      "text-field": ["get", "feature_index"],
      "text-size": 11,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-allow-overlap": false,
      "text-ignore-placement": false,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#000000",
      "text-halo-width": 1.5,
    }
  });

  // Add click handler for radnetz features
  state.map.on("click", "radnetz-line", (e) => {
    if (e.features.length > 0) {
      const feature = e.features[0];
      segmentationDialog(feature);
    }
  });

  // Change cursor on hover
  state.map.on("mouseenter", "radnetz-line", () => {
    state.map.getCanvas().style.cursor = "pointer";
  });

  state.map.on("mouseleave", "radnetz-line", () => {
    state.map.getCanvas().style.cursor = "";
  });
}
