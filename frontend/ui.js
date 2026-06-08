import { users, directionMapping } from './config.js';
import { state, updateState } from './state.js';
import { switchMapStyle } from './map.js';
import { loadRadroute, getCompletedSurveys } from './routes.js';
import { loadRadrouteStatus } from './allRoutesStatus.js';
import { openSurveyModal, closeSurveyModal, closeDialog, trackSurveyActivity } from './survey.js';
import { updateCompletedSurveysLayer } from './routes.js';


/**
 * neues feature: 
 * gesamter Abschnitt Baustelle (button)
 *  - ruft survey modal auf , passed params wo antworten auf "nicht kartierbar, baustelle steheh"
 *             "data": {
                "1120ba29a30c4c069ba0c84d": "mit vereinzelten Unebenheiten (≤1 cm)",  <<----- 
                "1e352551fbb74b2e8bea193e": "Baustelle ",
                "3ff931faea514fcca598d295": "Keine Kartierung möglich",
                "54b16f6d1b35465eaa70bbc4": "Keine Kartierung möglich",
                "65d24eef91174451bd133729": [
                    "Baustelle"
                ],
                "74b5a5db51fa4913a6a9f3bf": "Keine Kartierung möglich",
                "83075783322f4c4381b41672": "Keine Kartierung möglich",
                "8387cd6e0069425f8e4d7cc9": "Baustelle ",
                "8600cace891146338ca28228": "Keine Kartierung möglich",
                "8635f3e71d4e47289ca2fb3c": "Keine Kartierung möglich",
                "9334d492d6f843609a78fd86": "Baustelle ",
                "9e90a2e8151f4943b79b4723": "ja",
                "a62uq5ixf4eobdfjb0iefw4o": "Baustelle ",
                "b828590cdbb44ef19a9cd85f": "Baustelle ",
                "e922b34126c94acb982e3c57": "Baustelle ",
                "f4ede6869518490793d7c592": "Baustelle ",
                "gtsxi76o6gtdxhdycu18e18z": "Baustelle ",
                "k6pjlstjuoentr9ep1wt7lrm": "Keine Kartierung möglich",
                "nf4q43gxbaczcto7s429kjyl": "Keine Kartierung möglich"
            },
 */


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
  const loadRouteStatusBtn = document.getElementById("loadRouteStatusBtn");
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
  
  // Load route status button
  loadRouteStatusBtn.addEventListener("click", () => {
    loadRadrouteStatus();
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
      trackSurveyActivity(state.selectedUser, segmentId, "start").then((trackResponse) => {
        openSurveyModal(segmentId, geometryWkb, state.selectedUser, trackResponse["response_id"]);
      });
    }
  });

  dialogEditResponse.addEventListener("click", () => {
    if (state.selectedFeature && state.selectedFeature.properties.segment_id) {
      const segmentId = state.selectedFeature.properties.segment_id;

      /*
      new backend route: get response details for segment_id and user!
        -> filter survey logs from db, get newest response_id_backend for segment id 
        -> get the last responses, for response_id_backend
        -> if responses, invalidate in logs
        -> return json with all response params
        -> 

      new frontend logic:
        - do survey as normal, just pass the prefilled answers as new param to the openSurveyModal function.
        - open formbricks survey for segment, include all entries from backend's response json as url params (prefilled)
      */

      /**
       * weiteres feature:
       * wenn selected feature len(fids) == 1 ,  like oberfläche, breite etc are the same (new backend query)
       *  -> get response details of prev. feature (segment_id -1) 
       * set them as prefilled data for survey / button copy from previous
       * 
       * 
       * is the same?
          breite_mean ,same
          has_traffic_light: "False" , same
          hindernis: same
          oberflaeche: same
          radweg_art: same
          zweirichtung: same
       * 
       */

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
