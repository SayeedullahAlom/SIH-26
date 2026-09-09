import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import InspectionsList from "./pages/InspectionsList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NewInspection from "./pages/NewInspection";
import InspectionDetail from "./pages/InspectionDetail";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes: Blocks unauthenticated access immediately */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* Starts from Dashboard */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />

              {/* Dedicated All Inspections Window */}
              <Route path="/inspections" element={<InspectionsList />} />
              <Route path="/inspections/new" element={<NewInspection />} />
              <Route path="/inspections/:id" element={<InspectionDetail />} />

              {/* Officer Profile & Compliance Summary */}
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}