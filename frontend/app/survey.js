import { backendUrl, surveyUrl } from './config.js';
import { state, updateState } from './state.js';
import { updateCompletedSurveysLayer } from './routes.js';
import { stopwatch } from './stopwatch.js';

const SURVEY_META_KEYS = new Set(["user", "segment_id", "geometry_wkb", "response_id_backend"]);

function preparePrefilledAnswers(answers) {
  return Object.fromEntries(
    Object.entries(answers)
      .filter(([key]) => !SURVEY_META_KEYS.has(key))  // avoid setting the old reponse_id_backend or duplicate params
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]) // format array answers
  );
}

// Track survey activity
export async function trackSurveyActivity(user, segmentId, actionType) {
  const url = `${backendUrl}/track_survey_activity`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "route_id": state.selectedRouteId,
        "route_direction": state.selectedDirection,
        "user": user,
        "segment_id": segmentId,
        "action": actionType
      })
    });
    
    if (!response.ok) {
      console.error("Survey activity tracking received error from backend", response.status);
      return false;
    }
    if (actionType == "start") {
      return response.json()
    }

    return true;
  } catch (e) {
    console.error("could not perform survey track", e);
    return false;
  }
}

export async function getResponseDetails(user, segmentId) {
  const url = new URL(`${backendUrl}/get_response_details`);
  url.searchParams.set("user", user);
  url.searchParams.set("segment_id", segmentId);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      console.error("Fetching Survey response details from backend failed: ", response.status);
      return false;
    }

    return await response.json()
  } catch (e) {
    console.error("could not fetch survey response details", e);
    return null;
  }

}

// Handle feature click
export function handleFeatureClick(e) {
  const dialogMessage = document.getElementById("dialogMessage");
  const dialogRemove = document.getElementById("dialogRemove");
  const dialogEditResponse = document.getElementById("dialogEditResponse");
  const dialogSurvey = document.getElementById("dialogSurvey");
  const confirmDialog = document.getElementById("confirmDialog");

  if (e.features && e.features.length > 0) {
    updateState({ selectedFeature: e.features[0] });
    const segmentId = state.selectedFeature.properties.segment_id;
    const isCompleted = state.completedSurveys.has(segmentId);
    
    if (isCompleted) {
      dialogMessage.textContent = `Du hast Segment ${segmentId} bereits kartiert - möchtest du die Kartierung löschen? `;
      dialogRemove.style.display = "block";
      dialogEditResponse.style.display = "block";
      dialogSurvey.style.display = "none";
    } else {
      dialogMessage.textContent = `Segment ${segmentId} kartieren ?`;
      dialogRemove.style.display = "none";
      dialogEditResponse.style.display = "none";
      dialogSurvey.style.display = "block";
    }
    
    confirmDialog.classList.add("show");
  }
}

// Open survey modal
export function openSurveyModal(segmentId, geometryWkb, user, responseIdBackend, predefinedAnswers={}) {
  const surveyIframe = document.getElementById("surveyIframe");
  const modalTitle = document.getElementById("modalTitle");
  const surveyModal = document.getElementById("surveyModal");
  const confirmDialog = document.getElementById("confirmDialog");

  console.log("response id survey", responseIdBackend)

  if (!surveyUrl) {
    console.error("Survey url missing");
    return
  }

  // construct the url with preset params
  const url = new URL(surveyUrl);
  url.searchParams.set("user", user);
  url.searchParams.set("segment_id", segmentId);
  url.searchParams.set("geometry_wkb", geometryWkb);
  url.searchParams.set("response_id_backend", responseIdBackend)
  url.searchParams.set("9e90a2e8151f4943b79b4723", "2670e59186274c25adfed9f2");

  Object.entries(preparePrefilledAnswers(predefinedAnswers)).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  surveyIframe.src = url.toString();
  
  modalTitle.textContent = Object.keys(predefinedAnswers).length
    ? `Survey - Segment ${segmentId} (UPDATE)`
    : `Survey - Segment ${segmentId}`;
  surveyModal.classList.add("show");
  confirmDialog.classList.remove("show");
  
  // Highlight selected feature
  if (state.map && state.map.getLayer("radroute-highlight")) {
    state.map.setFilter("radroute-highlight-outline", ["==", "segment_id", segmentId]);
    state.map.setFilter("radroute-highlight", ["==", "segment_id", segmentId]);
  }
}

// Close survey modal
export function closeSurveyModal() {
  console.log("closing modal here here");
  const surveyModal = document.getElementById("surveyModal");
  const surveyIframe = document.getElementById("surveyIframe");

  surveyModal.classList.remove("show");

  // Mark as completed if survey was opened
  if (state.selectedFeature && state.selectedFeature.properties.segment_id) {
    const segmentId = state.selectedFeature.properties.segment_id;
    state.completedSurveys.add(segmentId);
    updateCompletedSurveysLayer();
    trackSurveyActivity(state.selectedUser, segmentId, "stop");
  }
  
  // Clear highlight
  if (state.map && state.map.getLayer("radroute-highlight")) {
    state.map.setFilter("radroute-highlight-outline", ["==", "segment_id", ""]);
    state.map.setFilter("radroute-highlight", ["==", "segment_id", ""]);
  }
  
  // Clear iframe src to stop any playing content
  surveyIframe.src = "";
  updateState({ selectedFeature: null });
  // clear stopwatch (if it exists)
  if (stopwatch) {
    stopwatch.reset();
  }
}

// Close confirmation dialog
export function closeDialog() {
  const confirmDialog = document.getElementById("confirmDialog");
  confirmDialog.classList.remove("show");
  updateState({ selectedFeature: null });
}
