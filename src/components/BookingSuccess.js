import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function BookingSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingDetails, paymentDetails } = location.state || {};

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "48px", color: "#28a745", marginBottom: "20px" }}>✓</div>
      <h2>Booking Confirmed!</h2>
      
      <div style={{ 
        backgroundColor: "#f8f9fa", 
        padding: "20px", 
        borderRadius: "8px", 
        margin: "20px 0",
        textAlign: "left"
      }}>
        <h3>Booking Details</h3>
        <p><strong>Station:</strong> {bookingDetails?.station?.name || "EV Charging Station"}</p>
        <p><strong>Location:</strong> {bookingDetails?.station?.locationName || "Unknown location"}</p>
        <p><strong>Date & Time:</strong> {new Date(bookingDetails?.datetime).toLocaleString()}</p>
        <p><strong>Duration:</strong> 2 hours</p>
        
        <h4 style={{ marginTop: "15px" }}>Payment Details</h4>
        <p><strong>Amount Paid:</strong> ₹{paymentDetails?.amount}</p>
        <p><strong>Payment Method:</strong> {paymentDetails?.method === "credit" ? "Credit Card" : 
                                           paymentDetails?.method === "debit" ? "Debit Card" : "UPI"}</p>
        <p><strong>Transaction ID:</strong> {paymentDetails?.transactionId}</p>
      </div>

      <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
        <button
          onClick={() => navigate("/map")}
          style={{
            padding: "10px 20px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Back to Map
        </button>
        <button
          onClick={() => navigate("/home")}
          style={{
            padding: "10px 20px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Go to Home
        </button>
      </div>

      <p style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        A confirmation has been sent to your email at {bookingDetails?.email}
      </p>
    </div>
  );
}

export default BookingSuccess;