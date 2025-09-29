// views/Calendar/CalendarDashboard.jsx
import { Navigate } from "react-router-dom";
import React from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import AppNavsShell from "../components/AppNavsShell";
import DashboardCalendar from "../components/DashboardCalendar";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

export default function Calendar() {
    const today = new Date();

    const { store } = useGlobalReducer();
    const API = import.meta.env.VITE_BACKEND_URL;

    const token = store?.auth?.token || null;
    const role = (store?.me?.role || "").toLowerCase();

    // ---------- Guards ----------
    const allowed = role === "admin_user" || role === "lawyer";
    if (!allowed) return <Navigate to="/403" replace />;

    // (opcional) cómo construir la URL al courtfile
    const getCourtfileUrl = (id) => `/courtfiles/ViewCourtfileLawyer/${id}`;

    return (
        <AppNavsShell>
            <div className="container add-page">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h1 className="h4 mb-0">
                        {format(today, "EEEE", { locale: enUS })}{" "}
                        <span className="mx-3">|</span>
                        {format(today, "dd MMM, yyyy", { locale: enUS })}
                    </h1>
                </div>

                <DashboardCalendar
                    apiBase={API}
                    authToken={token}
                    getCourtfileUrl={getCourtfileUrl}
                />
            </div>
        </AppNavsShell>
    );
}
