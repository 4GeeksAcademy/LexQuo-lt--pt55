// src/views/ChatsOverview.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import useUnreadBadges from "../hooks/useUnreadBadges.jsx";

export default function ChatsOverview() {
  const API = import.meta.env.VITE_BACKEND_URL;
  const { store } = useGlobalReducer();
  const location = useLocation();

  // PrivateRoute ya aseguró sesión, así que usamos solo el store:
  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  if (!["lawyer", "client", "admin_user"].includes(role)) return <Navigate to="/403" replace />;

  const returnTo =
    location.state?.returnTo ||
    (role === "lawyer" ? "/DashboardLawyer"
      : role === "client" ? "/DashboardClient"
        : "/DashboardAdmin");

  // Endpoint según rol
  const listEndpoint = useMemo(() => {
    return role === "lawyer" ? "/api/lawyers-courtfiles" : "/api/clients-courtfiles";
  }, [role]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const caseIds = useMemo(() => rows.map(r => Number(r.id)).filter(Boolean), [rows]);

  const { unreadByCase, totalUnread } = useUnreadBadges({
    API,
    token,
    userId: me?.id,
    role,
    courtfileIds: caseIds,
  });

  const unreadCountFor = (id) => {
    const key = Number(id);
    const u = (typeof unreadByCase?.get === "function")
      ? unreadByCase.get(key)
      : unreadByCase?.[key];
    return u?.count ?? (u?.hasUnread ? 1 : 0);
  };

  const fetchData = async () => {
    try {
      setLoading(true); setErr("");

      // 1) Traer los expedientes visibles
      const resp = await fetch(`${API}${listEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();

      // 2) Normalizar (tomar el courtfile dentro de la relación si viene así)
      const normalized = data.map(r => ({
        relation_id: r.id,
        ...(r.courtfile || r),
      }));

      const ids = normalized.map(cf => cf.id).filter(Boolean);
      if (ids.length === 0) {
        setRows(normalized);
        return;
      }

      // 3) Pedir al backend la última actividad + unread por expediente
      const unreadResp = await fetch(
        `${API}/api/messages/unread?role=${encodeURIComponent(role)}&user_id=${me?.id}&courtfile_ids=${ids.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const unreadMap = unreadResp.ok ? await unreadResp.json() : {};

      // 4) Merge: anexamos last_message_at (y opcionalmente unreadCount para ordenar)
      const merged = normalized.map(cf => {
        const u = unreadMap?.[String(cf.id)];
        return {
          ...cf,
          last_message_at: u?.last_message_at || null,
          _unreadCount: u?.count ?? (u?.hasUnread ? 1 : 0),
        };
      });

      // 5) Orden: primero por last_message_at desc, luego desempatar por no leídos
      merged.sort((a, b) => {
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        if (tb !== ta) return tb - ta;            // más reciente primero
        return (b._unreadCount || 0) - (a._unreadCount || 0); // opcional: con unread arriba si empata
      });

      setRows(merged);
    } catch (e) {
      setErr(e.message || "Error fetching chats");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { fetchData(); }, [API, listEndpoint, token]);

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
                    <div className="d-inline-block position-relative">
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

                      {unreadCountFor(cf.id) > 0 && (
                        <span
                          className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                          style={{ pointerEvents: "none" }}
                          title="unread"
                        >
                          {unreadCountFor(cf.id) > 99 ? "99+" : unreadCountFor(cf.id)}
                          <span className="visually-hidden">unread messages</span>
                        </span>
                      )}
                    </div>
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