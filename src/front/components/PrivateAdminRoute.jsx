import { Navigate, Outlet, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export default function PrivateAdminRoute() {
  const location = useLocation();
  const { store } = useGlobalReducer();

  // token sólo en localStorage
  const token = JSON.parse(localStorage.getItem("auth") || "null")?.token || null;

  // role desde store (fallback a localStorage si te sirve en pruebas)
  const role =
    String(store?.me?.role || store?.auth?.role || JSON.parse(localStorage.getItem("auth") || "null")?.role || "")
      .toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />;
  }

  if (role !== "admin_user") {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}