(() => {
  const AREAS_URL = "assets/data/service-areas.json";
  const BASE_STYLE = {
    color: "#007d36",
    weight: 1.5,
    opacity: 0.9,
    fillColor: "#00a347",
    fillOpacity: 0.24
  };
  const ACTIVE_STYLE = { ...BASE_STYLE, weight: 2.5, fillOpacity: 0.52 };

  const list = document.querySelector("[data-area-list]");
  const mapElement = document.getElementById("map");
  if (!list || !mapElement) return;

  let map;
  let areas = [];
  let selectedAreaId = null;
  let language = document.documentElement.lang.split("-")[0] || "it";
  const layersById = new Map();

  const areaLabel = (area) => area.labels[language] || area.labels.it || area.id;
  const mapText = (key, fallback) => window.siteTranslate?.(key) || fallback;

  function updatePopupCloseLabel() {
    const closeButton = mapElement.querySelector(".leaflet-popup-close-button");
    if (!closeButton) return;
    const label = mapText("map.popupClose", "Close popup");
    closeButton.title = label;
    closeButton.setAttribute("aria-label", label);
  }

  function updateZoomLabels() {
    const labels = [
      [".leaflet-control-zoom-in", "map.zoomIn", "Zoom in"],
      [".leaflet-control-zoom-out", "map.zoomOut", "Zoom out"]
    ];
    labels.forEach(([selector, key, fallback]) => {
      const control = mapElement.querySelector(selector);
      if (!control) return;
      const label = mapText(key, fallback);
      control.title = label;
      control.setAttribute("aria-label", label);
    });
    updatePopupCloseLabel();
  }

  function renderList() {
    const fragment = document.createDocumentFragment();
    areas.forEach((area) => {
      const button = document.createElement("button");
      button.className = "province-item";
      button.type = "button";
      button.dataset.areaId = area.id;
      const selected = area.id === selectedAreaId;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.textContent = areaLabel(area);
      button.addEventListener("click", () => selectArea(area.id));
      fragment.append(button);
    });
    list.replaceChildren(fragment);
  }

  function popupContent(area) {
    const heading = document.createElement("strong");
    heading.className = "map-popup-title";
    heading.textContent = areaLabel(area);
    return heading;
  }

  function setSelected(areaId) {
    selectedAreaId = areaId;
    list.querySelectorAll(".province-item").forEach((button) => {
      const selected = button.dataset.areaId === areaId;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    areas.forEach((area) => {
      const layer = layersById.get(area.id);
      if (!layer) return;
      layer.setStyle(area.id === areaId ? ACTIVE_STYLE : BASE_STYLE);
      layer.bindPopup(popupContent(area));
    });
  }

  function selectArea(areaId) {
    const area = areas.find((item) => item.id === areaId);
    const layer = layersById.get(areaId);
    if (!area || !layer || !map) return;

    setSelected(areaId);
    map.fitBounds(layer.getBounds(), { padding: [24, 24], maxZoom: 8, duration: 0.7 });
    layer.openPopup();
  }

  function showMapMessage(key, fallback) {
    const message = document.createElement("p");
    message.className = "map-fallback";
    message.textContent = window.siteTranslate ? window.siteTranslate(key) : fallback;
    mapElement.replaceChildren(message);
  }

  async function loadAreas() {
    try {
      const response = await fetch(AREAS_URL);
      if (!response.ok) throw new Error(`Coverage data returned ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.areas) || !data.areas.length) throw new Error("Coverage data is empty");

      areas = data.areas.filter((area) => area.id && area.geometryId && area.labels?.it);
      renderList();

      if (typeof L === "undefined") {
        showMapMessage("presence.mapUnavailable", "The interactive map is unavailable. The coverage list is still shown.");
        return;
      }

      const geometryFile = /^[a-z0-9-]+\.geojson$/i.test(data.boundariesFile || "")
        ? data.boundariesFile
        : "it-provinces.geojson";
      const geometryResponse = await fetch(`assets/data/${geometryFile}`);
      if (!geometryResponse.ok) throw new Error(`Map boundaries returned ${geometryResponse.status}`);
      const geometry = await geometryResponse.json();
      const areaByGeometryId = new Map(areas.map((area) => [area.geometryId, area]));
      const findArea = (feature) => areaByGeometryId.get(feature.properties?.geometryId)
        || areas.find((area) => area.id === feature.properties?.province);
      const features = geometry.features.filter((feature) => findArea(feature));
      const matchedIds = new Set(features.map((feature) => findArea(feature).id));

      if (!features.length) throw new Error("No coverage areas have matching map boundaries");
      const missingAreas = areas.filter((area) => !matchedIds.has(area.id));
      if (missingAreas.length) console.warn("Coverage areas without map geometry:", missingAreas.map((area) => area.id));

      map = L.map(mapElement, { scrollWheelZoom: false, tap: true, zoomControl: false });
      L.control.zoom({
        zoomInTitle: mapText("map.zoomIn", "Zoom in"),
        zoomOutTitle: mapText("map.zoomOut", "Zoom out")
      }).addTo(map);
      updateZoomLabels();
      map.on("popupopen", updatePopupCloseLabel);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19
      }).addTo(map);

      const polygons = L.geoJSON({ type: "FeatureCollection", features }, {
        style: BASE_STYLE,
        onEachFeature: (feature, layer) => {
          const area = findArea(feature);
          if (!area) return;
          layer.bindPopup(popupContent(area));
          layer.on("click", () => selectArea(area.id));
          layersById.set(area.id, layer);
        }
      }).addTo(map);

      const bounds = polygons.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [22, 22], maxZoom: 6 });

      map.once("click", () => map.scrollWheelZoom.enable());
      const refreshSize = () => map?.invalidateSize();
      if ("ResizeObserver" in window) new ResizeObserver(refreshSize).observe(mapElement);
      else window.addEventListener("resize", refreshSize, { passive: true });
      window.setTimeout(refreshSize, 250);
    } catch (error) {
      console.error("Unable to load the Frascarelli coverage map:", error);
      if (!areas.length) showMapMessage("presence.dataUnavailable", "The coverage list could not be loaded.");
      else if (typeof L !== "undefined" && !map) showMapMessage("presence.mapUnavailable", "The interactive map is unavailable. The coverage list is still shown.");
    }
  }

  window.addEventListener("fr:language-change", (event) => {
    language = event.detail?.language || "it";
    renderList();
    areas.forEach((area) => layersById.get(area.id)?.bindPopup(popupContent(area)));
    updateZoomLabels();
  });

  loadAreas();
})();
