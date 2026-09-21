import { users, directionMapping, isRadnetzMode } from './config.js';
import { state, updateState } from './state.js';
import { switchMapStyle } from './map.js';
import { loadRadroute, getCompletedSurveys } from './routes.js';
import { loadRadrouteStatus } from './allRoutesStatus.js';
import { openSurveyModal, closeSurveyModal, closeDialog, trackSurveyActivity, getResponseDetails } from './survey.js';
import { updateCompletedSurveysLayer } from './routes.js';
import { hamburgNeighborhoods } from './hamburgNeighborhoods.js';


// neighborhoods for Radnetz kartierung
const NEIGHBORHOODS = [
  "Harvestehude, Rotherbaum, Eimsbüttel, Hoheluft-West, Winterhude",
  "Altona-Altstadt, Altona-Nord, Ottensen",
  "St. Pauli, Neustadt, Sternschanze",
  "HafenCity",
  "Wilhelmsburg",
  "Hamm, Dulsberg, Wandsbek, Marienthal, Jenfeld, Eilbek, Tonndorf",
  "Rahlstedt, Tonndorf",
  "Bergedorf, Lohbrügge, Neuallermöhe, Neuengamme, Curslack",
  "Osdorf, Nienstedten, Gross Flottbek, Othmarschen, Lurup",
  "Niendorf, Schnelsen",
  "Alle"
];

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

// Populate neighborhood select dropdown
export function populateNeighborhoodSelect() {
  const neighborhoodSelect = document.getElementById("neighborhoodSelect");
  neighborhoodSelect.innerHTML = "";
  NEIGHBORHOODS.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    neighborhoodSelect.appendChild(option);
  });
  updateState({ selectedNeighborhood: NEIGHBORHOODS[0] });
  neighborhoodSelect.value = NEIGHBORHOODS[0];
}

// Show/hide UI elements based on radnetz mode
export function applyRadnetzMode() {
  const routeGroup = document.getElementById("routeGroup");
  const directionGroup = document.getElementById("directionGroup");
  const neighborhoodGroup = document.getElementById("neighborhoodGroup");
  const menuTitle = document.getElementById("menuTitle");
  if (isRadnetzMode) {
    routeGroup.style.display = "none";
    directionGroup.style.display = "none";
    neighborhoodGroup.style.display = "";
    if (menuTitle) menuTitle.textContent = "Radnetz";

    const addNeighborhoodLayer = () => {
      // Add source and layer
      state.map.addSource("hamburg-neighborhood-source", {
        type: "geojson",
        data: hamburgNeighborhoods,
      });

      // Base layer: alternating light/dark blue depending on fid parity
      state.map.addLayer({
        id: "hamburg-neighborhood",
        type: "line",
        source: "hamburg-neighborhood-source",
        paint: {
          "line-color": "#f2f458",
          "line-width": 4,
        },
      });
    };

    if (state.map.isStyleLoaded()) {
      addNeighborhoodLayer();
    } else {
      state.map.once("load", addNeighborhoodLayer);
    }

  } else {
    routeGroup.style.display = "";
    directionGroup.style.display = "";
    neighborhoodGroup.style.display = "none";
  }
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
  const neighborhoodSelect = document.getElementById("neighborhoodSelect");
  const loadRouteBtn = document.getElementById("loadRouteBtn");
  const loadRouteStatusBtn = document.getElementById("loadRouteStatusBtn");
  const surveyModal = document.getElementById("surveyModal");
  const closeModal = document.getElementById("closeModal");
  const closeModalFooter = document.getElementById("closeModalFooter");
  const confirmDialog = document.getElementById("confirmDialog");
  const dialogCancel = document.getElementById("dialogCancel");
  const dialogSurvey = document.getElementById("dialogSurvey");
  const dialogRemove = document.getElementById("dialogRemove");
  const dialogEditResponse = document.getElementById("dialogEditResponse");
  const dialogConstructionSite = document.getElementById("dialogConstructionSite");
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

  // Neighborhood selection
  neighborhoodSelect.addEventListener("change", (e) => {
    updateState({ selectedNeighborhood: e.target.value });
  });

  // Load route button
  loadRouteBtn.addEventListener("click", () => {
    if (!state.selectedUser) {
      alert("Select User!");
      return;
    }
    if (isRadnetzMode) {
      if (!state.selectedNeighborhood) {
        alert("Select neighborhood!");
        return;
      }
    } else {
      if (!state.selectedRouteId) {
        alert("Select route id!");
        return;
      }
      if (!state.selectedDirection) {
        alert("Select direction!");
        return;
      }
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

 async function flagFeatureAsDeleted(segmentId) { 
    await trackSurveyActivity(state.selectedUser, segmentId, "delete").then((success) => {
          if (success) {
            state.completedSurveys.delete(segmentId);
            updateCompletedSurveysLayer();
          } else {
            alert("Failed to delete survey entry. It may be older than 20 minutes.");
          }
        });
  }

  function checkSameFeature(currentProps, formbricksResponseDetails) {
    if (
      (currentProps["geometry_wkb"] == formbricksResponseDetails["geometry_wkb"])
      && (currentProps["segment_id"] == formbricksResponseDetails["segment_id"])
      && (state.selectedUser == formbricksResponseDetails["user"])
    ) {
      return true;
    }

    return false;
  }

  // Dialog buttons
  dialogCancel.addEventListener("click", closeDialog);
  
  dialogRemove.addEventListener("click", () => {
    if (state.selectedFeature && state.selectedFeature.properties.segment_id) {
      const segmentId = state.selectedFeature.properties.segment_id;
      flagFeatureAsDeleted(segmentId);
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

  dialogConstructionSite.addEventListener("click", async() => {
    if (state.selectedFeature) {
      const segmentId = state.selectedFeature.properties.segment_id;
      const geometryWkb = state.selectedFeature.properties.geometry_wkb;
      trackSurveyActivity(state.selectedUser, segmentId, "start").then((trackResponse) => {
        openSurveyModal(
          segmentId,
          geometryWkb,
          state.selectedUser,
          trackResponse["response_id"],
          {
            "9e90a2e8151f4943b79b4723": "ja",
            "1e352551fbb74b2e8bea193e": "Baustelle ",
            "3ff931faea514fcca598d295": "Keine Kartierung möglich",
            "54b16f6d1b35465eaa70bbc4": "Keine Kartierung möglich",
            "65d24eef91174451bd133729": "Baustelle",
            "74b5a5db51fa4913a6a9f3bf": "Keine Kartierung möglich",
            "83075783322f4c4381b41672": "Keine Kartierung möglich",
            "8387cd6e0069425f8e4d7cc9": "Baustelle ",
            "8600cace891146338ca28228": "Keine Kartierung möglich",
            "8635f3e71d4e47289ca2fb3c": "Keine Kartierung möglich",
            "9334d492d6f843609a78fd86": "Baustelle",
            "a62uq5ixf4eobdfjb0iefw4o": "Baustelle",
            "b828590cdbb44ef19a9cd85f": "Baustelle",
            "e922b34126c94acb982e3c57": "Baustelle",
            "f4ede6869518490793d7c592": "Baustelle",
            "gtsxi76o6gtdxhdycu18e18z": "Baustelle",
            "k6pjlstjuoentr9ep1wt7lrm": "Keine Kartierung möglich",
            "nf4q43gxbaczcto7s429kjyl": "Keine Kartierung möglich"
          }
        );
      });
    }
  });
  
  dialogEditResponse.addEventListener("click", async () => {
    if (state.selectedFeature && state.selectedFeature.properties.segment_id) {
      const segmentId = state.selectedFeature.properties.segment_id;

      const formbricksResponseDetails = await getResponseDetails(state.selectedUser, segmentId);

      if (formbricksResponseDetails === null) {
        alert("Kann nicht editiert werden.");
        return
      }
      
      if (!checkSameFeature(state.selectedFeature.properties, formbricksResponseDetails)) {
        console.error("Features of selected and logged feature do not match. Do not edit");
        alert("Kann nicht editiert werden.");
        return;
      }

      // create a new formbricks survey response with prefilled answers
      trackSurveyActivity(state.selectedUser, segmentId, "start").then((trackResponse) => {
        // open modal with prefilled answers
        openSurveyModal(
          segmentId,
          formbricksResponseDetails["geometry_wkb"],
          state.selectedUser,
          trackResponse["response_id"],
          formbricksResponseDetails);
      });

      closeDialog();
    }
  });



  /**
   *  weiteres feature: bautstelle. siehe oben.
   * 
   * 
   * 
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
  **/

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