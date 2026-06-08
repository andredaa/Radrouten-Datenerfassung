import { initMap, switchMapStyle } from '../map.js';
import { state } from '../state.js';
import { populateLocationSelect, setupEventListeners, initLocationsLayer } from './ui_befragung.js';

// Initialize application
function init() {
  // Initialize the map first
  initMap();
  
  // Wait for map to load before adding layers
  state.map.on('load', () => {
    // Add locations layer to the map
    initLocationsLayer();
  });
  
  // Setup UI
  populateLocationSelect();
  setupEventListeners();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
