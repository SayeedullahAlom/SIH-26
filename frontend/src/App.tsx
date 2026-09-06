import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import InspectionsList from "./pages/InspectionsList";
import NewInspection from "./pages/NewInspection";
import InspectionDetail from "./pages/InspectionDetail";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/inspections" element={<InspectionsList />} />
                <Route path="/inspections/new" element={<NewInspection />} />
                <Route path="/inspections/:id" element={<InspectionDetail />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/inspections" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}