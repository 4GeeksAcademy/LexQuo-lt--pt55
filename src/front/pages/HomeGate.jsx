// HomeGate.jsx
import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { Home } from "../pages/Home";

export default function HomeGate() {
  const { store } = useGlobalReducer();
  const token = store?.auth?.token || null;

  // usa me.role y, si no llegó aún, probá con auth.role
  const role = (store?.me?.role ?? store?.auth?.role ?? "").toLowerCase();

  // sin token: página pública
  if (!token) return <Home />;

  // hay token pero aún no sabemos el rol → no redirijas todavía
  const knownRoles = new Set(["admin_user", "lawyer", "client"]);
  if (!knownRoles.has(role)) {
    return null; // o un spinner
  }

  const to =
    role === "admin_user" ? "/DashboardAdminUser" :
    role === "lawyer"     ? "/DashboardLawyer"   :
                            "/DashboardClient";

  return <Navigate to={to} replace />;
}