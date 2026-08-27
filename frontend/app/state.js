// Application state management
export const state = {
  map: null,
  use: "kartierung",
  currentStyle: "light",
  selectedRouteId: 1,
  selectedUser: "",
  selectedDirection: null,
  selectedLocationQuestionaire: null,
  isLoading: false,
  selectedFeature: null,
  completedSurveys: new Set(),
  selectedNeighborhood: ""
};

export function getState() {
  return state;
}

export function updateState(updates) {
  Object.assign(state, updates);
}
