import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { auth, db } from '../firebase';
import { collection, addDoc, getDocs } from "firebase/firestore";

// Cache and rate limiting configuration
const locationCache = {};
const REQUEST_DELAY = 1000; // 1 second delay between requests
let lastRequestTime = 0;

// Custom icons
const customIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/684/684908.png",
  iconSize: [38, 38],
  iconAnchor: [22, 38],
  popupAnchor: [-3, -38]
});

const highlightIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/3503/3503100.png",
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [-3, -45]
});

// Improved geocoding function with better error handling
const getLocationName = async (lat, lng) => {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  
  if (locationCache[cacheKey]) {
    return locationCache[cacheKey];
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_DELAY) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
  }

  try {
    lastRequestTime = Date.now();
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'EVChargerLocator/1.0 (your@email.com)',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Nominatim rate limit reached - using coordinates');
        return cacheKey;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Format a better display name from the address components
    let locationName = cacheKey;
    if (data.address) {
      const addr = data.address;
      locationName = [
        addr.road,
        addr.neighbourhood,
        addr.suburb,
        addr.city_district,
        addr.city,
        addr.state,
        addr.country
      ].filter(Boolean).join(", ");
    } else if (data.display_name) {
      locationName = data.display_name;
    }
    
    locationCache[cacheKey] = locationName;
    return locationName;

  } catch (error) {
    console.error("Error fetching location name:", error);
    return cacheKey;
  }
};

function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  
  const [selectedStation, setSelectedStation] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [recommendedStations, setRecommendedStations] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [bookingData, setBookingData] = useState({
    name: "",
    email: "",
    phone: "",
    datetime: "",
    station: null
  });

  // Create popup content for markers with better location display
  const createPopupContent = async (station) => {
    const container = document.createElement("div");
    container.style.minWidth = "200px";
    
    const name = document.createElement("h4");
    name.textContent = station.name || "EV Charging Station";
    name.style.margin = "0 0 8px 0";
    
    // Get formatted location name
    let locationName;
    try {
      locationName = await getLocationName(station.lat, station.lon);
    } catch (error) {
      locationName = `${station.lat.toFixed(4)}, ${station.lon.toFixed(4)}`;
    }

    const location = document.createElement("p");
    location.textContent = locationName;
    location.style.margin = "0 0 8px 0";
    location.style.fontSize = "14px";
    location.style.color = "#666";
    
    const coords = document.createElement("p");
    coords.textContent = `Coordinates: ${station.lat.toFixed(4)}, ${station.lon.toFixed(4)}`;
    coords.style.margin = "0 0 8px 0";
    coords.style.fontSize = "12px";
    coords.style.color = "#999";
    
    const button = document.createElement("button");
    button.textContent = "Book Now";
    button.style.cssText = `
      padding: 6px 12px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      width: 100%;
    `;
    
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      setSelectedStation({ ...station, locationName });
      setShowBookingForm(true);
    });

    container.appendChild(name);
    container.appendChild(location);
    container.appendChild(coords);
    container.appendChild(button);
    
    return container;
  };

  // Load charging stations from API
  const loadStations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!mapRef.current) {
        throw new Error("Map not initialized");
      }

      const response = await fetch("http://localhost:5000/api/stations");
      if (!response.ok) throw new Error("Failed to fetch stations");
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received");
      }

      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (mapRef.current && marker && mapRef.current.hasLayer(marker)) {
          mapRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];

      // Add new markers
      for (const station of data) {
        if (!station.lat || !station.lon) continue;
        
        if (!mapRef.current) break;
        
        const marker = L.marker([station.lat, station.lon], { 
          icon: customIcon 
        }).addTo(mapRef.current);
        
        const popupContent = await createPopupContent(station);
        marker.bindPopup(popupContent);
        
        markersRef.current.push(marker);
      }
      
    } catch (err) {
      console.error("Error loading stations:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize map and load stations
  // Update your useEffect in MapPage.js
useEffect(() => {
  // Initialize the map only if it doesn't exist
  if (!mapRef.current) {
    try {
      mapRef.current = L.map("map", {
        preferCanvas: true
      }).setView([18.5204, 73.8567], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
      }).addTo(mapRef.current);

      loadStations(); // Call loadStations here
    } catch (error) {
      console.error("Map initialization error:", error);
      setError("Failed to initialize map. Please refresh the page.");
    }
  }

  return () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    markersRef.current = [];
  };
}, []); // Empty dependency array is fine here since we only want this to run once


useEffect(() => {
  loadBookings();
}, []);

const loadBookings = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "bookings"));
    const bookings = [];
    querySnapshot.forEach((doc) => {
      bookings.push({ id: doc.id, ...doc.data() });
    });
    console.log("Bookings:", bookings);
    // Set bookings to state if needed
  } catch (error) {
    console.error("Error loading bookings:", error);
  }
};
const handleBookingSubmit = async (e) => {
  e.preventDefault();
  
  if (!selectedStation) return;
  
  try {
    setIsLoading(true);
    
    // Create the booking object with all required fields
    const bookingDetails = {
      name: bookingData.name || "Not provided",
      email: bookingData.email || "Not provided",
      phone: bookingData.phone || "Not provided",
      datetime: new Date(bookingData.datetime),
      station: {
        name: selectedStation.name || "Unknown Station",
        locationName: selectedStation.locationName || 
                     `${selectedStation.lat.toFixed(4)}, ${selectedStation.lon.toFixed(4)}`,
        lat: selectedStation.lat || 0,
        lon: selectedStation.lon || 0,
        distance: selectedStation.distance || 0 // Ensure distance has a value
      },
      userId: auth.currentUser?.uid || "anonymous",
      status: "pending_payment" // Initial status
    };

    // Navigate to payment page with booking details
    navigate("/payment", {
      state: {
        bookingDetails
      }
    });

  } catch (error) {
    console.error("Error:", error);
    alert("Error processing booking: " + error.message);
  } finally {
    setIsLoading(false);
  }
};  
  

  
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRecommendation = async () => {
    if (isLoading) return;
    
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser.");
      return;
    }
  
    setIsLoading(true);
    setError(null);
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const { latitude, longitude } = position.coords;
      
      // Get formatted location name
      const locationName = await getLocationName(latitude, longitude);
      setUserLocation({ 
        lat: latitude, 
        lng: longitude,
        name: locationName 
      });
      
      // Center map on user location
      if (mapRef.current) {
        mapRef.current.setView([latitude, longitude], 13);
      }
  
      // Get recommendations
      const response = await fetch(
        `http://localhost:5000/api/recommend?lat=${latitude}&lon=${longitude}`
      );
  
      if (!response.ok) throw new Error("Failed to get recommendations");
  
      const data = await response.json();
  
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Process recommended stations with location names
      const stationsWithNames = await Promise.all(
        data.map(async station => {
          const locationName = await getLocationName(station.lat, station.lon);
          return { ...station, locationName };
        })
      );
      
      // Highlight recommended stations on map
      markersRef.current.forEach(marker => {
        const station = stationsWithNames.find(s => 
          s.lat === marker.getLatLng().lat && 
          s.lon === marker.getLatLng().lng
        );
        
        if (station) {
          marker.setIcon(highlightIcon);
          marker.openPopup();
        }
      });
      
      setRecommendedStations(stationsWithNames);
      
    } catch (error) {
      console.error("Recommendation error:", error);
      setError(error.message || "Failed to get recommendations");
      alert(error.message || "Failed to get recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "left", padding: "20px", position: "relative" }}>
      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <p>Loading...</p>
          </div>
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate("/home")}
        style={{
          marginBottom: "10px",
          padding: "10px 20px",
          fontSize: "16px",
          background: "#007bff",
          color: "white",
          border: "none",
          cursor: "pointer",
          borderRadius: "5px",
        }}
        disabled={isLoading}
      >
        ⬅ Back
      </button>

      <h1>Find Nearby EV Charging Stations</h1>
      
      {/* Error message with retry button */}
      {error && (
        <div style={{
          padding: "10px",
          backgroundColor: "#ffebee",
          color: "#c62828",
          borderRadius: "4px",
          marginBottom: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{error}</span>
          <button 
            onClick={loadStations}
            style={{
              padding: "5px 10px",
              background: "#c62828",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Map container */}
      <div id="map" style={{ height: "500px", width: "100%", borderRadius: "8px", border: "1px solid #ddd" }}></div>

      {/* Recommendation section */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={handleRecommendation}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            background: "#28a745",
            color: "white",
            border: "none",
            cursor: "pointer",
            borderRadius: "5px",
          }}
          disabled={isLoading}
        >
          {isLoading ? "Finding Stations..." : "Find Recommended Stations Near Me"}
        </button>

        {userLocation && (
          <p style={{ marginTop: "10px" }}>
            Your location: {userLocation.name}
          </p>
        )}

        {recommendedStations.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h3>Recommended Stations</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
              {recommendedStations.map((station, index) => (
                <div 
                  key={index}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "15px",
                    width: "300px",
                    cursor: "pointer",
                    backgroundColor: selectedStation?.name === station.name ? "#f0f8ff" : "white",
                    transition: "background-color 0.2s"
                  }}
                  onClick={() => {
                    setSelectedStation(station);
                    setShowBookingForm(true);
                    
                    if (mapRef.current) {
                      mapRef.current.setView([station.lat, station.lon], 15);
                    }
                  }}
                >
                  <h4 style={{ marginTop: 0 }}>{station.name || "EV Charging Station"}</h4>
                  <p style={{ marginBottom: "8px" }}>{station.locationName}</p>
                  <p style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
                    Coordinates: {station.lat.toFixed(4)}, {station.lon.toFixed(4)}
                  </p>
                  <p style={{ marginBottom: "8px" }}>Distance: {station.distance} km</p>
                  <button 
                    style={{
                      padding: "8px 16px",
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      width: "100%",
                      marginTop: "10px"
                    }}
                  >
                    Book This Station
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking form modal */}
      {showBookingForm && selectedStation && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "white",
          padding: "25px",
          borderRadius: "10px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
          zIndex: 1000,
          width: "450px",
          maxWidth: "95%",
          maxHeight: "90vh",
          overflowY: "auto"
        }}>
          <h2 style={{ marginTop: 0 }}>Book Charging Slot</h2>
          <h3 style={{ marginBottom: "5px" }}>{selectedStation.name || "EV Charging Station"}</h3>
          <p style={{ marginTop: 0, color: "#666" }}>
            {selectedStation.locationName || `${selectedStation.lat.toFixed(4)}, ${selectedStation.lon.toFixed(4)}`}
          </p>
          <p style={{ marginTop: 0, color: "#999", fontSize: "14px" }}>
            Coordinates: {selectedStation.lat.toFixed(4)}, {selectedStation.lon.toFixed(4)}
          </p>
          {selectedStation.distance && (
            <p style={{ marginTop: 0, color: "#666" }}>
              Distance: {selectedStation.distance} km from you
            </p>
          )}
          
          <form onSubmit={handleBookingSubmit}>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Name:
              </label>
              <input
                type="text"
                name="name"
                value={bookingData.name}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
              />
            </div>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Email:
              </label>
              <input
                type="email"
                name="email"
                value={bookingData.email}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
              />
            </div>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Phone:
              </label>
              <input
                type="tel"
                name="phone"
                value={bookingData.phone}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
              />
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
                Date & Time:
              </label>
              <input
                type="datetime-local"
                name="datetime"
                value={bookingData.datetime}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
              />
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowBookingForm(false)}
                style={{
                  padding: "10px 20px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  flex: 1
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                style={{
                  padding: "10px 20px",
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  flex: 1
                }}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default MapPage;