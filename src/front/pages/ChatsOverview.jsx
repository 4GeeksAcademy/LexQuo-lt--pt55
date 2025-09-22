// src/views/ChatsOverview.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export default function ChatsOverview() {
  const API = import.meta.env.VITE_BACKEND_URL;
  const { store } = useGlobalReducer();
  const location = useLocation();

  const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
  const role = (auth?.role || "").toLowerCase();

  // Gatekeeping
  if (!auth?.token) return <Navigate to="/" replace />;
  if (!["lawyer", "client", "admin_user"].includes(role)) return <Navigate to="/403" replace />;

  const returnTo =
  location.state?.returnTo ||
  (() => {
    switch (role) {
      case "lawyer":
        return "/DashboardLawyer";
      case "client":
        return "/DashboardClient";
      case "admin_user":
        return "/DashboardAdmin";
      default:
        return "/";
    }
  })();

  // Endpoint según rol
  const listEndpoint = useMemo(() => {
    return role === "lawyer" ? "/api/lawyers-courtfiles" : "/api/clients-courtfiles";
  }, [role]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true); setErr("");
      const resp = await fetch(`${API}${listEndpoint}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      // Normalizar: cuando el backend devuelve la relación con dentro el courtfile
      const normalized = data.map(r => ({ relation_id: r.id, ...(r.courtfile || r) }));
      setRows(normalized);
    } catch (e) {
      setErr(e.message || "Error fetching chats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [API, listEndpoint]);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>All Chats</h1>
        <Link to={returnTo} className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left" /> Volver
        </Link>
      </div>

      {loading && <p>Cargando…</p>}
      {err && <div className="alert alert-danger">{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <div className="alert alert-info">No hay expedientes vinculados aún.</div>
      )}

      {!loading && rows.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Case Number</th>
                <th>Title</th>
                <th>Jurisdiction</th>
                <th>Court</th>
                <th className="text-end">Chat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(cf => (
                <tr key={cf.id}>
                  <td>{cf.id}</td>
                  <td>{cf.case_number}</td>
                  <td className="text-truncate" style={{ maxWidth: 320 }} title={cf.title}>{cf.title}</td>
                  <td>{cf.jurisdiction}</td>
                  <td>{cf.court}</td>
                  <td className="text-end">
                    <Link
                      to={`/chats/${cf.id}`}
                      state={{
                        courtfileId: cf.id,
                        courtfileNumber: cf.case_number,
                        courtfileTitle: cf.title,
                        senderRole: role,            
                        returnTo: "/chats",         
                      }}
                      className="btn btn-sm btn-outline-primary"
                    >
                      <i className="bi bi-chat-dots" /> Open Chat
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
