import { initMap, switchMapStyle } from '../map.js';
import { state, updateState } from '../state.js';
import { setupEventListeners, initSegmentation } from './ui_radnetz_segmentation.js';

// Initialize application
function init() {
  // Initialize the map first
  updateState({use: "radnetz"});
  initMap();
  
  // Wait for map to load before adding layers
  state.map.on('load', () => {
    // Add radnetz layer to the map
    initSegmentation();
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

