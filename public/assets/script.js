//public->assets->script.js
// Initialize the map and set its view to Pune, Maharashtra
var map = L.map('map').setView([18.5204, 73.8567], 13);

// Load OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Fetch charging stations from Flask API
fetch('/api/stations')
    .then(response => response.json())
    .then(data => {
        if (!Array.isArray(data)) {
            console.error("API did not return an array:", data);
            return;
        }

        data.forEach(station => {
            var lat = station.lat;
            var lon = station.lon;
            var name = station.name || "EV Charging Station";

            // Create marker with EV icon
            var marker = L.marker([lat, lon]).addTo(map)
                .bindPopup(`<b>${name}</b><br>Latitude: ${lat}<br>Longitude: ${lon}`);
        });
    })
    .catch(error => console.error("Error fetching stations:", error));
