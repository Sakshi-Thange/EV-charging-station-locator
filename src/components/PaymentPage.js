import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingDetails } = location.state || {};
  
  const [paymentMethod, setPaymentMethod] = useState("credit");
  const [cardDetails, setCardDetails] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: ""
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      // Prepare Firestore-safe data
      const firestoreBooking = {
        ...bookingDetails,
        paymentMethod,
        amount: calculateTotal(),
        status: "confirmed",
        paymentStatus: "paid",
        transactionId: `TXN${Math.floor(Math.random() * 1000000)}`,
        createdAt: serverTimestamp(),
        // Ensure all nested objects have valid values
        station: {
          name: bookingDetails.station.name || "Unknown Station",
          locationName: bookingDetails.station.locationName || "Unknown Location",
          lat: bookingDetails.station.lat || 0,
          lon: bookingDetails.station.lon || 0,
          distance: bookingDetails.station.distance || 0
        }
      };
  
      // Remove any undefined values
      const cleanBooking = JSON.parse(JSON.stringify(firestoreBooking));
      
      const docRef = await addDoc(collection(db, "bookings"), cleanBooking);
      
      setPaymentSuccess(true);
      
      setTimeout(() => {
        navigate("/booking-success", { 
          state: { 
            bookingDetails: cleanBooking,
            paymentDetails: {
              method: paymentMethod,
              amount: calculateTotal(),
              transactionId: docRef.id
            }
          }
        });
      }, 2000);
  
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotal = () => {
    // Simple pricing calculation - you can replace with your own logic
    const basePrice = 50; // Base price for charging
    const durationHours = 2; // Example duration
    return (basePrice * durationHours).toFixed(2);
  };

  if (paymentSuccess) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "48px", color: "#28a745", marginBottom: "20px" }}>✓</div>
        <h2>Payment Successful!</h2>
        <p>Your booking is now confirmed.</p>
        <p>Redirecting to booking details...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <h2>Complete Your Payment</h2>
      
      <div style={{ 
        backgroundColor: "#f8f9fa", 
        padding: "20px", 
        borderRadius: "8px", 
        marginBottom: "20px"
      }}>
        <h3>Booking Summary</h3>
        <p><strong>Station:</strong> {bookingDetails?.station?.name || "EV Charging Station"}</p>
        <p><strong>Location:</strong> {bookingDetails?.station?.locationName || "Unknown location"}</p>
        <p><strong>Date & Time:</strong> {new Date(bookingDetails?.datetime).toLocaleString()}</p>
        <p><strong>Duration:</strong> 2 hours (estimated)</p>
        <h4 style={{ marginTop: "10px" }}>Total: ₹{calculateTotal()}</h4>
      </div>

      <form onSubmit={handlePaymentSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "500" }}>
            Payment Method
          </label>
          <div style={{ display: "flex", gap: "15px", marginBottom: "15px" }}>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="radio"
                name="paymentMethod"
                value="credit"
                checked={paymentMethod === "credit"}
                onChange={() => setPaymentMethod("credit")}
                style={{ marginRight: "8px" }}
              />
              Credit Card
            </label>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="radio"
                name="paymentMethod"
                value="debit"
                checked={paymentMethod === "debit"}
                onChange={() => setPaymentMethod("debit")}
                style={{ marginRight: "8px" }}
              />
              Debit Card
            </label>
            <label style={{ display: "flex", alignItems: "center" }}>
              <input
                type="radio"
                name="paymentMethod"
                value="upi"
                checked={paymentMethod === "upi"}
                onChange={() => setPaymentMethod("upi")}
                style={{ marginRight: "8px" }}
              />
              UPI
            </label>
          </div>

          {paymentMethod === "credit" || paymentMethod === "debit" ? (
            <>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                  required
                />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px" }}>Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "15px" }}>
                <div style={{ flex: 1, marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px" }}>Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                    style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                    required
                  />
                </div>
                <div style={{ flex: 1, marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "5px" }}>CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                    style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px" }}>UPI ID</label>
              <input
                type="text"
                placeholder="yourname@upi"
                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                required
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          style={{
            padding: "12px 24px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            width: "100%",
            fontSize: "16px",
            fontWeight: "500"
          }}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing Payment..." : `Pay ₹${calculateTotal()}`}
        </button>
      </form>

      <p style={{ marginTop: "15px", fontSize: "12px", color: "#666", textAlign: "center" }}>
        Your payment is secured with 256-bit SSL encryption
      </p>
    </div>
  );
}

export default PaymentPage;