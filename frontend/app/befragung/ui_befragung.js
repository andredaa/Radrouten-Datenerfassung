import { switchMapStyle } from '../map.js';
import { state, updateState } from '../state.js';
import { locationsGeoJson } from './locationsData.js';

// Extract unique location names from locationsGeoJson
const locations = [...new Set(
  locationsGeoJson.features
    .map(f => f.properties.stadtteil)
    .filter(name => name != null && name !== '')
)].sort();

// Populate location select dropdown
export function populateLocationSelect() {
  const locationSelect = document.getElementById("locationSelect");
  locationSelect.innerHTML = "";
  
  // Add default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Select a location --";
  locationSelect.appendChild(defaultOption);
  
  locations.forEach(location => {
    const option = document.createElement("option");
    option.value = location;
    option.textContent = location;
    locationSelect.appendChild(option);
  });
  
  if (state.selectedLocationQuestionaire) {
    locationSelect.value = state.selectedLocationQuestionaire;
  }
}

// Show location info dialog
export function showLocationDialog(feature) {
  const dialog = document.getElementById("confirmDialog");
  const dialogTitle = dialog.querySelector(".dialog-title");
  const dialogMessage = document.getElementById("dialogMessage");
  const dialogSurvey = document.getElementById("dialogSurvey");
  const dialogRemove = document.getElementById("dialogRemove");
  
  // Set title and message
  dialogTitle.textContent = feature.properties.stadtteil || "Location";
  dialogMessage.textContent = feature.properties.description;
  
  // Hide unnecessary buttons
  dialogSurvey.style.display = "none";
  dialogRemove.style.display = "none";
  
  // Show dialog
  dialog.classList.add("show");
}

// Close location dialog
export function closeLocationDialog() {
  const dialog = document.getElementById("confirmDialog");
  const dialogSurvey = document.getElementById("dialogSurvey");
  const dialogRemove = document.getElementById("dialogRemove");
  
  // Reset buttons
  dialogSurvey.style.display = "";
  dialogRemove.style.display = "";
  
  dialog.classList.remove("show");
}

// Setup all event listeners
export function setupEventListeners() {
  const menuToggle = document.getElementById("menuToggle");
  const menuPanel = document.getElementById("menuPanel");
  const locationSelect = document.getElementById("locationSelect");
  const loadLocationBtn = document.getElementById("loadLocationBtn");
  const styleBtns = document.querySelectorAll(".style-btn");
  const confirmDialog = document.getElementById("confirmDialog");
  const dialogCancel = document.getElementById("dialogCancel");

  // Menu toggle
  menuToggle.addEventListener("click", () => {
    menuPanel.classList.toggle("open");
  });

  // Location selection
  locationSelect.addEventListener("change", (e) => {
    updateState({ selectedLocationQuestionaire: e.target.value });
    if (e.target.value) {
      flyToSelectedLocation();
    }
  });


  // Load location button (if it exists)
  if (loadLocationBtn) {
    loadLocationBtn.addEventListener("click", () => {
      flyToSelectedLocation();
      menuPanel.classList.remove("open");
    });
  }  
  
  // Style switcher buttons
  styleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      switchMapStyle(btn.dataset.style);

    });
  });
  
  // Dialog cancel button
  dialogCancel.addEventListener("click", closeLocationDialog);
  
  // Close dialog on overlay click
  confirmDialog.addEventListener("click", (e) => {
    if (e.target === confirmDialog) {
      closeLocationDialog();
    }
  });
}

// Initialize locations layer on the map
export function initLocationsLayer() {
  if (!state.map) return;
  
  // Add source and layer
  state.map.addSource("locations-source", {
    type: "geojson",
    data: locationsGeoJson,
  });
  
  // Add circle layer for locations
  state.map.addLayer({
    id: "locations-circle",
    type: "circle",
    source: "locations-source",
    paint: {
      "circle-radius": 8,
      "circle-color": "#3b82f6",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff"
    }
  });
  
  // Add labels for locations
  state.map.addLayer({
    id: "locations-labels",
    type: "symbol",
    source: "locations-source",
    layout: {
      "text-field": ["get", "stadtteil"],
      "text-size": 12,
      "text-offset": [0, 1.5],
      "text-anchor": "top"
    },
    paint: {
      "text-color": "#1f2937",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2
    }
  });
  
  // Add click handler for locations
  state.map.on("click", "locations-circle", (e) => {
    if (e.features.length > 0) {
      const feature = e.features[0];
      const stadtteil = feature.properties.stadtteil;
      
      if (stadtteil) {
        updateState({ selectedLocationQuestionaire: stadtteil });
        const locationSelect = document.getElementById("locationSelect");
        if (locationSelect) {
          locationSelect.value = stadtteil;
        }
        
        // Show location description dialog
        showLocationDialog(feature);
      }
    }
  });
  
  // Change cursor on hover
  state.map.on("mouseenter", "locations-circle", () => {
    state.map.getCanvas().style.cursor = "pointer";
  });
  
  state.map.on("mouseleave", "locations-circle", () => {
    state.map.getCanvas().style.cursor = "";
  });
}

// Fly to the selected location on the map
function flyToSelectedLocation() {
  if (!state.map || !state.selectedLocationQuestionaire) return;
  
  const selectedFeature = locationsGeoJson.features.find(
    feat => feat.properties.stadtteil === state.selectedLocationQuestionaire
  );
  
  if (selectedFeature && selectedFeature.geometry.coordinates) {
    state.map.flyTo({
      center: selectedFeature.geometry.coordinates,
      zoom: 14,
      duration: 1500,
      essential: true
    });
  }
}

