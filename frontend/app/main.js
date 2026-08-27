import { directionMapping } from './config.js';
import { updateState } from './state.js';
import { initMap } from './map.js';
import { populateUserSelect, populateRouteSelect, updateDirectionSelect, populateNeighborhoodSelect, applyRadnetzMode, setupEventListeners } from './ui.js';

// Initialize application
function init() {
  initMap();
  populateUserSelect();
  populateRouteSelect();
  updateDirectionSelect();
  populateNeighborhoodSelect();
  applyRadnetzMode();
  setupEventListeners();
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
