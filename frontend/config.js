// Configuration constants
export const users = [
  "Jan",
  "Finja",
  "Bente",
  "Lynn",
  "Emma",
  "Tom T.",
  "Henri",
  "Tim M.",
  "Tom W.",
  "Andre",
  "Lukas",
  "Line",
  "Rosa",
  "Christoph",
  "Thomas"
];

export const directionMapping = {
  1: ["Ost", "West"],
  2: ["Nordwest", "Südost"],
  3: ["Nordwest", "Südost"],
  4: ["Nord", "Süd"],
  5: ["Nordost", "Südwest"],
  6: ["Nordost", "Südwest"],
  7: ["Nordost", "Südwest"],
  8: ["Nordwest", "Südost"],
  9: ["Nordwest", "Südost"],
  11: ["Nord", "Süd"],
  12: ["Nord", "Süd"],
  13: ["Nordwest", "Südost"],
  14: ["Nordost", "Südwest"],
  15: ["Nord", "Süd"],
  16: ["Nordost", "Südwest"],
  17: ["Nordwest", "Südost"],
  18: ["Nord", "Süd"],
  19: ["Nordost", "Südwest"],
  20: ["Nord", "Süd"],
  21: ["Ost", "West"],
  22: ["Nordwest", "Südost"],
  23: ["Nord", "Süd"],
};

export const mapStyles = {
  light: "https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  satellite: {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        ],
        tileSize: 256,
        attribution: "© Esri"
      }
    },
    layers: [
      {
        id: "satellite",
        type: "raster",
        source: "satellite",
        minzoom: 0,
        maxzoom: 22
      }
    ]
  }
};

// Read backendUrl from URL parameter, fallback to localhost
const urlParams = new URLSearchParams(window.location.search);
export const backendUrl = urlParams.get('backendUrl') || 'https://h2870643.stratoserver.net/backend';
export const formbricksUrl = urlParams.get('formbricksUrl') || 'https://h2870643.stratoserver.net/formbricks';
export const surveyId = urlParams.get('formbricksSurvey') || 'cmobkudkr000no601u3taqnu2';
export const surveyUrl = `${formbricksUrl}/s/${surveyId}?embed=true`;

console.log('Using backend URL:', backendUrl);
console.log('Using survey URL:', surveyUrl);
