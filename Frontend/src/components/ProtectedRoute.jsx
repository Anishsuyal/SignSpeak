import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem("auth");

  return isAuthenticated ? children : <Navigate to="/login" />;
}