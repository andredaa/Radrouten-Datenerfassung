import { mapStyles } from './config.js';
import { state, updateState } from './state.js';
import { loadRadroute } from './routes.js';

// Initialize map
export function initMap() {
  const map = new maplibregl.Map({
    container: "map",
    style: mapStyles[state.currentStyle],
    center: [9.9748145, 53.5682316],
    zoom: 12,
    renderWorldCopies: false,
    attributionControl: true
  });

  // Error handling
  map.on('error', (e) => {
    console.error('Map error:', e);
  });

  // Add controls
  map.addControl(new maplibregl.ScaleControl(), "bottom-right");
  map.addControl(new maplibregl.NavigationControl(), "bottom-right");
  
  // Add GeolocateControl for live GPS tracking
  const geolocateControl = new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true,
    showAccuracyCircle: true
  });
  map.addControl(geolocateControl, "bottom-right");
  
  // Force resize on load to ensure proper rendering in Chrome
  map.on('load', () => {
    setTimeout(() => {
      map.resize();
    }, 100);
  });

  updateState({ map });
}

// Switch map style
export function switchMapStyle(style) {
  if (!state.map) return;
  
  updateState({ currentStyle: style });
  
  // Update button states
  document.querySelectorAll(".style-btn").forEach(btn => {
    if (btn.dataset.style === style) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  
  state.map.setStyle(mapStyles[style]);
  
  // Wait for style to load before adding routes
  setTimeout(() => {
    loadRadroute();
  }, 500);
}
