//src->components->App.js
import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Auth from "./components/Auth";
import MapPage from "./components/MapPage"; // Import MapPage
import PaymentPage from "./components/PaymentPage";
import BookingSuccess from "./components/BookingSuccess";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Auth setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/home" element={isAuthenticated ? <Home /> : <Auth setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/booking-success" element={<BookingSuccess />} />
      </Routes>
    </Router>
  );
}

export default App;
