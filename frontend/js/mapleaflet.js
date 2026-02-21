document.addEventListener("DOMContentLoaded", function () {
  // Default Kathmandu
  const defaultLat = 27.7172;
  const defaultLng = 85.3240;

  const map = L.map("map").setView([defaultLat, defaultLng], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);

  let marker = null;

  // Add/Update marker function
  function addMarker(lat, lng) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);
    window.selectedLat = lat;
    window.selectedLng = lng;
  }

    window.selectedLat = undefined;
    window.selectedLng = undefined;

    document.getElementById("selectedLocation").innerText =
      "Click on the map to select a location";


  // Click map to move marker

  map.on("click", async function (e) {
    const { lat, lng } = e.latlng;
    addMarker(lat, lng);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();

      const addr = data.address || {};
      const simpleAddress = [
        addr.suburb || addr.neighbourhood,
        addr.city || addr.town,
      ]
        .filter(Boolean)
        .join(", ");

      window.selectedAddress = simpleAddress || "Location selected";
      document.getElementById("selectedLocation").innerText =
        window.selectedAddress;
    } catch (err) {
      console.error(err);
      document.getElementById("selectedLocation").innerText =
        "Location selected";
    }
    
  });


  // Search functionality
  const searchInput = document.getElementById("searchLocation");

  // Search function
  async function searchLocation() {
    const query = searchInput.value;
    if (!query) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const results = await res.json();

      if (results && results.length > 0) {
        const place = results[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);

        // Move marker and map
        addMarker(lat, lon);
        map.setView([lat, lon], 13);

        const addr = place.display_name.split(",").slice(0, 3).join(", ");
        window.selectedAddress = addr;
        document.getElementById("selectedLocation").innerText = addr;
      } else {
        alert("Location not found");
      }
    } catch (err) {
      console.error(err);
      alert("Error searching location");
    }
  }

  // Handle Enter key
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      searchLocation();
    }
  });

  // Handle magnifying glass click
  const searchIcon = document.querySelector(".search-icon");
    searchIcon.addEventListener("click", function () {
        searchLocation();
    });
});
