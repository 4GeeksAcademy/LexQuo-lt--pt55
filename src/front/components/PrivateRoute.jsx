// src/pages/common/PrivateRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export default function PrivateRoute({ roles }) {
  const location = useLocation();
  const { store } = useGlobalReducer();
  const token = JSON.parse(sessionStorage.getItem("auth") || "null")?.token || null;
  const me = store?.me;

  // sin token o sin me -> login según rol esperado
  if (!token || !me) {
    if (roles?.includes("lawyer")) {
      return <Navigate to="/LoginLawyer" replace state={{ returnTo: location.pathname }} />;
    }
    if (roles?.includes("client")) {
      return <Navigate to="/LoginClient" replace state={{ returnTo: location.pathname }} />;
    }
    return <Navigate to="/LoginClient" replace state={{ returnTo: location.pathname }} />;
  }

  // si hay roles y no coincide -> 403
  if (roles?.length && !roles.includes(me.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
