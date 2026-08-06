import AppShell from "../layout/AppShell";
import AdminLayout from "../layout/AdminLayout";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const AuthenticatedApp = () => {
  const { pathname } = useLocation();
  const { role } = useAuth();
  if (role === "admin" && !pathname.startsWith("/admin")) {
    return <Navigate to="/admin/entries" replace />;
  }
  return pathname.startsWith("/admin") ? <AdminLayout /> : <AppShell />;
};

export default AuthenticatedApp;
