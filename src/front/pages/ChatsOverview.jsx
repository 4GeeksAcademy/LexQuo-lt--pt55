// src/views/ChatsOverview.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import useUnreadBadges from "../hooks/useUnreadBadges.jsx";
import AppNavsShell from "../components/AppNavsShell.jsx";

export default function ChatsOverview() {
  const API = import.meta.env.VITE_BACKEND_URL;
  const { store } = useGlobalReducer();
  const location = useLocation();
  const navigate = useNavigate();

  // PrivateRoute ya aseguró sesión
  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  if (!["lawyer", "client", "admin_user"].includes(role)) {
    return <Navigate to="/403" replace />;
  }

  const returnTo =
    location.state?.returnTo ||
    (role === "lawyer"
      ? "/DashboardLawyer"
      : role === "client"
      ? "/DashboardClient"
      : "/DashboardAdmin");

  // Endpoint según rol
  const listEndpoint = useMemo(() => {
    return role === "lawyer" ? "/api/lawyers-courtfiles" : "/api/clients-courtfiles";
  }, [role]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const caseIds = useMemo(() => rows.map((r) => Number(r.id)).filter(Boolean), [rows]);

  const { unreadByCase, totalUnread } = useUnreadBadges({
    API,
    token,
    userId: me?.id,
    role,
    courtfileIds: caseIds,
  });

  const unreadCountFor = (id) => {
    const key = Number(id);
    const u =
      typeof unreadByCase?.get === "function" ? unreadByCase.get(key) : unreadByCase?.[key];
    return u?.count ?? (u?.hasUnread ? 1 : 0);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setErr("");

      // 1) Traer los expedientes visibles
      const resp = await fetch(`${API}${listEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();

      // 2) Normalizar
      const normalized = data.map((r) => ({
        relation_id: r.id,
        ...(r.courtfile || r),
      }));

      const ids = normalized.map((cf) => cf.id).filter(Boolean);
      if (ids.length === 0) {
        setRows(normalized);
        return;
      }

      // 3) Última actividad + unread por expediente
      const unreadResp = await fetch(
        `${API}/api/messages/unread?role=${encodeURIComponent(role)}&user_id=${
          me?.id
        }&courtfile_ids=${ids.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const unreadMap = unreadResp.ok ? await unreadResp.json() : {};

      // 4) Merge
      const merged = normalized.map((cf) => {
        const u = unreadMap?.[String(cf.id)];
        return {
          ...cf,
          last_message_at: u?.last_message_at || null,
          _unreadCount: u?.count ?? (u?.hasUnread ? 1 : 0),
        };
      });

      // 5) Orden por actividad desc, luego por unread desc
      merged.sort((a, b) => {
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return (b._unreadCount || 0) - (a._unreadCount || 0);
      });

      setRows(merged);
    } catch (e) {
      setErr(e.message || "Error fetching chats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, listEndpoint, token]);

  return (
    <AppNavsShell>
      <div className="container add-page">
        {/* ===== Toolbar ===== */}
        <div className="mb-1">
          {/* Fila 1: título + help text */}
          <div className="mb-5">
            <div className="d-flex gap-3 align-items-center">
              <h1 className="h2 mb-2">Chats</h1>
              {totalUnread > 0 && (
                <span className="badge bg-danger rounded-pill">
                  {totalUnread > 99 ? "99+" : totalUnread} unread
                </span>
              )}
            </div>
            <p className="text-muted small mt-1">
              Conversaciones por expediente. Hacé click en la fila para abrir el chat.
            </p>
          </div>

          {/* Fila 2: botón volver (alineado a la derecha como acción) */}
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-2 flex-nowrap" />
            <div className="ms-auto">
              <Link to={returnTo} className="btn btn-outline-secondary">
                <i className="bi bi-arrow-left me-1" />
                Back
              </Link>
            </div>
          </div>
        </div>

        {/* ===== Tabla ===== */}
        {rows.length > 0 ? (
          <div className="table-responsive pt-0">
            <table className="table table-modern align-middle mb-0 pt-0">
              <thead className="table-light">
                <tr>
                  <th className="text-start" style={{ width: "60px" }}>
                    ID
                  </th>
                  <th>Case Number</th>
                  <th>Title</th>
                  <th>Jurisdiction</th>
                  <th>Court</th>
                  <th className="text-end pe-3">
                    <span className="text-muted">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((cf) => (
                  <tr
                    key={cf.id}
                    className="table-row-clickable"
                    onClick={() => navigate(`/chats/${cf.id}`, {
                      state: {
                        courtfileId: cf.id,
                        courtfileNumber: cf.case_number,
                        courtfileTitle: cf.title,
                        senderRole: role,
                        returnTo: "/chats",
                      },
                    })}
                    role="button"
                    title="Open chat"
                  >
                    <td className="text-start ps-2">{cf.id}</td>
                    <td>{cf.case_number}</td>
                    <td
                      className="text-truncate"
                      style={{ maxWidth: 320 }}
                      title={cf.title}
                    >
                      {cf.title}
                    </td>
                    <td>{cf.jurisdiction || "—"}</td>
                    <td>{cf.court || "—"}</td>

                    {/* Actions */}
                    <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>
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
                          className="btn btn-sm btn-phoenix btn-phoenix-primary"
                        >
                          <i className="bi bi-chat-dots me-1" />
                          Open chat
                        </Link>

                        {unreadCountFor(cf.id) > 0 && (
                          <span
                            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                            style={{ pointerEvents: "none" }}
                            title="Unread"
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
        ) : loading ? (
          <div className="alert alert-light border d-flex align-items-center" role="alert">
            <span className="spinner-border spinner-border-sm me-2" /> Loading chats…
          </div>
        ) : err ? (
          <div className="alert alert-danger">{err}</div>
        ) : (
          <div className="alert alert-info">
            <i className="bi bi-info-circle" /> No hay expedientes vinculados aún.
          </div>
        )}
      </div>
    </AppNavsShell>
  );
}
