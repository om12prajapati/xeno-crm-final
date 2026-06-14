import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./Login.jsx";
import Signup from "./Signup.jsx";
import Dashboard from "./Dashboard.jsx";
import { applyThemeLight } from "./theme.js";

// ProtectedRoute component dynamically checks login state on transitions
function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem("loggedIn");
  return isLoggedIn ? children : <Navigate to="/" replace />;
}

function App() {
  useEffect(() => {
    const activeTheme = localStorage.getItem("themeLight") || "purple";
    applyThemeLight(activeTheme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;