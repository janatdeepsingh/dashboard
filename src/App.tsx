// src/App.tsx
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "./firebase.ts";
import RealtimeData from "./components/RealtimeData";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  return (
    <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <h1>NEH Monitoring MicroStation Dashboard</h1>
          <p className="App-description">
            Tracking and Analyzing MicroStation for Real-Time Monitoring of Urban
            Traffic Noise, Emissions, and Urban Heat Intensity
          </p>
          {user && (
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          )}
        </header>
        <main>
          <Routes>
            <Route
              path="/"
              element={
                user ? (
                  <div style={{ marginTop: "18px", height: "100%", width: "100%" }}>
                    <RealtimeData />
                  </div>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
