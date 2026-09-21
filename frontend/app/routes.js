import { backendUrl, isRadnetzMode } from './config.js';
export { isRadnetzMode } from './config.js';
import { state, updateState } from './state.js';
import { handleFeatureClick } from './survey.js';

// Load radroute from backend
export async function loadRadroute() {
  console.log("loading route", state.selectedDirection, state.selectedRouteId, state.map);
  if (!state.map) return;
  if (isRadnetzMode && !state.selectedNeighborhood) return;
  if (!isRadnetzMode && (state.selectedRouteId === undefined || !state.selectedDirection)) return;

  updateState({ isLoading: true });
  const loadRouteBtn = document.getElementById("loadRouteBtn");
  loadRouteBtn.disabled = true;
  loadRouteBtn.textContent = "Loading...";
  
  try {
    // Remove existing radroute layers if present
    const layersToRemove = ["radroute-label", "radroute-highlight", "radroute-highlight-outline", "radroute-completed", "radroute"];
    layersToRemove.forEach(layerId => {
      if (state.map.getLayer(layerId)) {
        state.map.removeLayer(layerId);
      }
    });
    if (state.map.getSource("radroute-source")) {
      state.map.removeSource("radroute-source");
    }
    
    // Fetch radroute data from backend
    const url = isRadnetzMode
      ? `${backendUrl}/get_radnetz_by_neighborhood?stadtteil_names=${encodeURIComponent(state.selectedNeighborhood)}`
      : `${backendUrl}/get_layer?layer_name=radrouten&route_id=${state.selectedRouteId}&direction=${encodeURIComponent(state.selectedDirection)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      console.error("Failed to fetch radroute:", response.status);
      return;
    }
      
    const data = await response.json();
    
    // Use dual color scheme: blue for even, magenta for odd segment_idx
    const colorExpression = [
      "case",
      ["==", ["%", ["get", "segment_idx"], 2], 0],
      "#10a397", // Even segments: blue
      "#FF6600"  // Odd segments: bright orange
    ];
    
    // Add source and layer
    state.map.addSource("radroute-source", {
      type: "geojson",
      data: data,
    });
    
    state.map.addLayer({
      id: "radroute",
      type: "line",
      source: "radroute-source",
      paint: {
        "line-color": colorExpression,
        "line-width": 8,
        "line-opacity": 0.8,
      },
    });

    // Add layer for completed surveys (black)
    state.map.addLayer({
      id: "radroute-completed",
      type: "line",
      source: "radroute-source",
      paint: {
        "line-color": "#000000",
        "line-width": 4,
        "line-opacity": 1,
      },
      filter: ["in", "segment_id"],
    });
    updateCompletedSurveysLayer();

    // Add white outline layer for highlighted feature
    state.map.addLayer({
      id: "radroute-highlight-outline",
      type: "line",
      source: "radroute-source",
      paint: {
        "line-color": "#ffffff",
        "line-width": 8,
        "line-opacity": 1,
      },
      filter: ["==", "segment_id", ""],
    });

    // Add layer for highlighted feature
    state.map.addLayer({
      id: "radroute-highlight",
      type: "line",
      source: "radroute-source",
      paint: {
        "line-color": "#fbbf24",
        "line-width": 6,
        "line-opacity": 1,
      },
      filter: ["==", "segment_id", ""],
    });

    // Add label layer for all segments
    state.map.addLayer({
      id: "radroute-label",
      type: "symbol",
      source: "radroute-source",
      layout: {
        "text-field": ["get", "segment_idx"],
        "text-size": 14,
        "text-offset": [0, -1.5],
        "symbol-placement": "line-center",
      },
      paint: {
        "text-color": "#000000",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });

    // Add click handler for features
    state.map.on("click", "radroute", handleFeatureClick);
    state.map.on("mouseenter", "radroute", () => {
      state.map.getCanvas().style.cursor = "pointer";
    });
    state.map.on("mouseleave", "radroute", () => {
      state.map.getCanvas().style.cursor = "";
    });
    
    // Fit map to radroute bounds
    if (data.features && data.features.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      data.features.forEach(feature => {
        if (feature.geometry.type === "LineString") {
          feature.geometry.coordinates.forEach(coord => {
            bounds.extend(coord);
          });
        } else if (feature.geometry.type === "MultiLineString") {
          feature.geometry.coordinates.forEach(line => {
            line.forEach(coord => bounds.extend(coord));
          });
        }
      });
      state.map.fitBounds(bounds, { padding: 50 });
    }
  } catch (error) {
    console.error("Error loading radroute:", error);
  } finally {
    updateState({ isLoading: false });
    loadRouteBtn.disabled = false;
    loadRouteBtn.textContent = "Load Route";
  }
}

// Update completed surveys layer
export function updateCompletedSurveysLayer() {
  console.log("updating completed layer");
  if (state.map && state.map.getLayer("radroute-completed")) {
    const filter = ["in", "segment_id", ...Array.from(state.completedSurveys)];
    state.map.setFilter("radroute-completed", filter);
  }
}

// Get completed surveys from backend
export async function getCompletedSurveys() {
  const url = isRadnetzMode
    ? `${backendUrl}/get_finished_segments?stadtteil_name=${encodeURIComponent(state.selectedNeighborhood)}&user=${state.selectedUser}`
    : `${backendUrl}/get_finished_segments?route_id=${state.selectedRouteId}&direction=${encodeURIComponent(state.selectedDirection)}&user=${state.selectedUser}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    console.error("Failed to fetch completed surveys:", response.status);
    return;
  }
    
  const completed = await response.json();
  updateState({ completedSurveys: new Set(completed) });
  updateCompletedSurveysLayer();
}
