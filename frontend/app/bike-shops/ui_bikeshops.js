import { switchMapStyle } from '../../map.js';
import { state, updateState } from '../../state.js';
import { bikeShopsGeoJson } from './bikeShopsData.js';

// Show bike shop info panel with all properties
export function showBikeShopInfo(feature) {
  const infoPanel = document.getElementById("infoPanel");
  const infoProperties = document.getElementById("infoProperties");
  
  // Clear previous properties
  infoProperties.innerHTML = '';
  
  // Get all properties from the feature
  const properties = feature.properties;
  const geometry = feature.geometry;
  
  // Add geometry information
  if (geometry && geometry.coordinates) {
    const row = document.createElement('div');
    row.className = 'property-row';
    row.innerHTML = `
      <div class="property-key">Coordinates:</div>
      <div class="property-value">${geometry.coordinates[1].toFixed(6)}, ${geometry.coordinates[0].toFixed(6)}</div>
    `;
    infoProperties.appendChild(row);
  }
  
  // Add all feature properties
  Object.entries(properties).forEach(([key, value]) => {
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
  
  // Show panel
  infoPanel.classList.add("show");
}

// Close info panel
export function closeInfoPanel() {
  const infoPanel = document.getElementById("infoPanel");
  infoPanel.classList.remove("show");
}

// Setup all event listeners
export function setupEventListeners() {
  const styleBtns = document.querySelectorAll(".style-btn");
  const infoPanel = document.getElementById("infoPanel");
  const closeInfoBtn = document.getElementById("closeInfo");

  // Style switcher buttons
  styleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      switchMapStyle(btn.dataset.style);
    });
  });

  // Close info panel button
  closeInfoBtn.addEventListener("click", closeInfoPanel);

  // Close info panel when clicking outside
  infoPanel.addEventListener("click", (e) => {
    if (e.target === infoPanel) {
      closeInfoPanel();
    }
  });
}

// Initialize bike shops layer on the map
export function initBikeShopsLayer() {
  if (!state.map) return;
  
  // Add source and layer
  state.map.addSource("bike-shops-source", {
    type: "geojson",
    data: bikeShopsGeoJson,
  });
  
  // Add circle layer for bike shops
  state.map.addLayer({
    id: "bike-shops-circle",
    type: "circle",
    source: "bike-shops-source",
    paint: {
      "circle-radius": 8,
      "circle-color": "#10b981",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff"
    }
  });
  
  // Add click handler for bike shops
  state.map.on("click", "bike-shops-circle", (e) => {
    if (e.features.length > 0) {
      const feature = e.features[0];
      showBikeShopInfo(feature);
    }
  });
  
  // Change cursor on hover
  state.map.on("mouseenter", "bike-shops-circle", () => {
    state.map.getCanvas().style.cursor = "pointer";
  });
  
  state.map.on("mouseleave", "bike-shops-circle", () => {
    state.map.getCanvas().style.cursor = "";
  });
}
