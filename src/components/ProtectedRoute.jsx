// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const role = localStorage.getItem("userRole");

  if (allowedRoles.includes(role)) {
    return children;
  } else {
    return <Navigate to="/login" />;
  }
}
