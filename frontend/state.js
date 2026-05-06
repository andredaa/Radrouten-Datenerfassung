// Application state management
export const state = {
  map: null,
  currentStyle: "light",
  selectedRouteId: 1,
  selectedUser: "",
  selectedDirection: null,
  isLoading: false,
  selectedFeature: null,
  completedSurveys: new Set()
};

export function getState() {
  return state;
}

export function updateState(updates) {
  Object.assign(state, updates);
}
