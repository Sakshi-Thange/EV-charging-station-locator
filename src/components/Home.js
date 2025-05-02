import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import "../Home.css";

function Home() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      if (auth.currentUser) {
        try {
          const q = query(
            collection(db, "bookings"),
            where("userId", "==", auth.currentUser.uid)
          );
          
          const querySnapshot = await getDocs(q);
          const userBookings = [];
          querySnapshot.forEach((doc) => {
            userBookings.push({ id: doc.id, ...doc.data() });
          });
          setBookings(userBookings);
        } catch (error) {
          console.error("Error fetching bookings:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBookings();
  }, []);

  return (
    <div className="home-container" style={{ backgroundImage: "url('/assets/ev-charger.jpg')" }}>
      <div className="text-section">
        <h1>EV Charger Locator</h1>
        <p>Find an EV charger near you.</p>
        <div className="search-box">
          <input type="text" placeholder="Search location..." />
          
<button 
  onClick={() => navigate("/map")}
  aria-label="Search"
>
  <span role="img">🔍</span>
</button>
        </div>

        <div className="bookings-section">
          <h2>Your Bookings</h2>
          {loading ? (
            <p>Loading bookings...</p>
          ) : bookings.length > 0 ? (
            bookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <h3>{booking.station.name}</h3>
                <p>{new Date(booking.datetime).toLocaleString()}</p>
                <p>{booking.station.locationName}</p>
              </div>
            ))
          ) : (
            <p>No bookings found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;