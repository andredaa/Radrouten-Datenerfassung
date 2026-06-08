import { initMap, switchMapStyle } from '../map.js';
import { state, updateState } from '../state.js';
import { setupEventListeners, initBikeShopsLayer } from './ui_bikeshops.js';

// Initialize application
function init() {
  // Initialize the map first
  updateState({use: "bike-shops"});
  initMap();
  
  // Wait for map to load before adding layers
  state.map.on('load', () => {
    // Add bike shops layer to the map
    initBikeShopsLayer();
  });
  
  // Setup UI event listeners
  setupEventListeners();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

