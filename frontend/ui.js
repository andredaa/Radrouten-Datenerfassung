import { users, directionMapping } from './config.js';
import { state, updateState } from './state.js';
import { switchMapStyle } from './map.js';
import { loadRadroute, getCompletedSurveys } from './routes.js';
import { openSurveyModal, closeSurveyModal, closeDialog, trackSurveyActivity } from './survey.js';
import { updateCompletedSurveysLayer } from './routes.js';

// Populate user select dropdown
export function populateUserSelect() {
  const userSelect = document.getElementById("userSelect");
  userSelect.innerHTML = "";
  users.forEach(user => {
    const option = document.createElement("option");
    option.value = user;
    option.textContent = user;
    userSelect.appendChild(option);
  });
  userSelect.value = state.selectedUser;
}

// Populate route select dropdown
export function populateRouteSelect() {
  const routeSelect = document.getElementById("routeSelect");
  routeSelect.innerHTML = "";
  for (let i = 1; i <= 23; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Route ${i}`;
    routeSelect.appendChild(option);
  }
  routeSelect.value = state.selectedRouteId;
}

// Update direction select based on selected route
export function updateDirectionSelect() {
  const directionSelect = document.getElementById("directionSelect");
  const directions = directionMapping[state.selectedRouteId];
  directionSelect.innerHTML = "";
  
  directions.forEach(direction => {
    const option = document.createElement("option");
    option.value = direction;
    option.textContent = direction;
    directionSelect.appendChild(option);
  });
  
  directionSelect.value = state.selectedDirection;
}

// Setup all event listeners
export function setupEventListeners() {
  const menuToggle = document.getElementById("menuToggle");
  const menuPanel = document.getElementById("menuPanel");
  const userSelect = document.getElementById("userSelect");
  const routeSelect = document.getElementById("routeSelect");
  const directionSelect = document.getElementById("directionSelect");
  const loadRouteBtn = document.getElementById("loadRouteBtn");
  const surveyModal = document.getElementById("surveyModal");
  const closeModal = document.getElementById("closeModal");
  const closeModalFooter = document.getElementById("closeModalFooter");
  const confirmDialog = document.getElementById("confirmDialog");
  const dialogCancel = document.getElementById("dialogCancel");
  const dialogSurvey = document.getElementById("dialogSurvey");
  const dialogRemove = document.getElementById("dialogRemove");
  const styleBtns = document.querySelectorAll(".style-btn");

  // Menu toggle
  menuToggle.addEventListener("click", () => {
    menuPanel.classList.toggle("open");
  });

  // User selection
  userSelect.addEventListener("change", (e) => {
    updateState({ selectedUser: e.target.value });
  });

  // Route selection
  routeSelect.addEventListener("change", (e) => {
    updateState({ selectedRouteId: parseInt(e.target.value) });
    updateDirectionSelect();
  });

  // Direction selection
  directionSelect.addEventListener("change", (e) => {
    updateState({ selectedDirection: e.target.value });
  });

  // Load route button
  loadRouteBtn.addEventListener("click", () => {
    if (!state.selectedUser) {
      alert("Select User!");
      return;
    }
    if (!state.selectedRouteId) {
      alert("Select route id!");
      return;
    }
    if (!state.selectedDirection) {
      alert("Select direction!");
      return;
    }

    console.log("state.selectedDirection", state.selectedDirection)

    loadRadroute();
    getCompletedSurveys();
    menuPanel.classList.remove("open");
  });

  // Style switcher buttons
  styleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      switchMapStyle(btn.dataset.style);
    });
  });

  // Dialog buttons
  dialogCancel.addEventListener("click", closeDialog);
  
  dialogRemove.addEventListener("click", () => {
    if (state.selectedFeature && state.selectedFeature.properties.segment_id) {
      const segmentId = state.selectedFeature.properties.segment_id;
      trackSurveyActivity(state.selectedUser, segmentId, "delete").then((success) => {
        if (success) {
          state.completedSurveys.delete(segmentId);
          updateCompletedSurveysLayer();
        } else {
          alert("Failed to delete survey entry. It may be older than 20 minutes.");
        }
      });
      closeDialog();
    }
  });

  dialogSurvey.addEventListener("click", () => {
    if (state.selectedFeature) {
      const segmentId = state.selectedFeature.properties.segment_id;
      const geometryWkb = state.selectedFeature.properties.geometry_wkb;
      trackSurveyActivity(state.selectedUser, segmentId, "start");
      openSurveyModal(segmentId, geometryWkb, state.selectedUser);
    }
  });

  // Close dialog on overlay click
  confirmDialog.addEventListener("click", (e) => {
    if (e.target === confirmDialog) {
      closeDialog();
    }
  });

  // Close modal buttons
  closeModal.addEventListener("click", closeSurveyModal);
  closeModalFooter.addEventListener("click", closeSurveyModal);
  
  // Close modal on overlay click
  surveyModal.addEventListener("click", (e) => {
    if (e.target === surveyModal) {
      closeSurveyModal();
    }
  });
}
