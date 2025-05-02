#backend->app.py
from flask import Flask, render_template, jsonify, request
import requests
from flask_cors import CORS
import json
import os
from geopy.distance import geodesic

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Allow all origins for /api/

# Database file for bookings
BOOKINGS_FILE = 'bookings.json'

@app.route('/api/stations')
def get_charging_stations():
    url = "https://overpass-api.de/api/interpreter"
    query = """
        [out:json];
        node["amenity"="charging_station"](18.40,73.70,18.60,74.00);
        out;
    """
    
    try:
        response = requests.get(url, params={'data': query})
        data = response.json()
        
        stations = []
        for element in data.get("elements", []):
            if "lat" in element and "lon" in element:
                stations.append({
                    "lat": element["lat"],
                    "lon": element["lon"],
                    "name": element.get("tags", {}).get("name", "EV Charging Station"),
                    "operator": element.get("tags", {}).get("operator", ""),
                    "capacity": element.get("tags", {}).get("capacity", "Unknown")
                })
        
        return jsonify(stations)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/book', methods=['POST'])
def book_charging_slot():
    try:
        booking_data = request.json
        
        # Load existing bookings
        bookings = []
        if os.path.exists(BOOKINGS_FILE):
            with open(BOOKINGS_FILE, 'r') as f:
                bookings = json.load(f)
        
        # Add new booking
        bookings.append(booking_data)
        
        # Save back to file
        with open(BOOKINGS_FILE, 'w') as f:
            json.dump(bookings, f, indent=4)
            
        return jsonify({"success": True, "message": "Booking confirmed!"})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/recommend')
def recommend_station():
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        
        # Get all stations
        stations_response = get_charging_stations()
        stations = stations_response.json
        
        if not isinstance(stations, list):
            return jsonify({"error": "Failed to fetch stations"}), 500
        
        # Calculate distances for all stations
        user_coords = (lat, lon)
        stations_with_distance = []
        
        for station in stations:
            station_coords = (station['lat'], station['lon'])
            distance = geodesic(user_coords, station_coords).km
            station['distance'] = round(distance, 2)
            stations_with_distance.append(station)
        
        # Sort by distance and return top 3
        stations_with_distance.sort(key=lambda x: x['distance'])
        top_stations = stations_with_distance[:3]
        
        if not top_stations:
            return jsonify({"error": "No stations found"}), 404
            
        return jsonify(top_stations)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)