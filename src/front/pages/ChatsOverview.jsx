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

  // ---- Auth ----
  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();
  if (!["lawyer", "client", "admin_user"].includes(role)) return <Navigate to="/403" replace />;

  const returnTo =
    location.state?.returnTo ||
    (role === "lawyer" ? "/DashboardLawyer" : role === "client" ? "/DashboardClient" : "/DashboardAdmin");

  // ---- Endpoint según rol ----
  const listEndpoint = useMemo(
    () => (role === "lawyer" ? "/api/lawyers-courtfiles" : "/api/clients-courtfiles"),
    [role]
  );

  // ---- State ----
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all"); // all | read | unread

  // ---- Unread helper ----
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
    const u = typeof unreadByCase?.get === "function" ? unreadByCase.get(key) : unreadByCase?.[key];
    return u?.count ?? (u?.hasUnread ? 1 : 0);
  };

  // ---- Fetch ----
  const fetchData = async () => {
    try {
      setLoading(true);
      setErr("");

      const resp = await fetch(`${API}${listEndpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();

      const normalized = data.map((r) => ({ relation_id: r.id, ...(r.courtfile || r) }));
      const ids = normalized.map((cf) => cf.id).filter(Boolean);

      let unreadMap = {};
      if (ids.length) {
        const unreadResp = await fetch(
          `${API}/api/messages/unread?role=${encodeURIComponent(role)}&user_id=${me?.id}&courtfile_ids=${ids.join(",")}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        unreadMap = unreadResp.ok ? await unreadResp.json() : {};
      }

      const merged = normalized.map((cf) => {
        const u = unreadMap?.[String(cf.id)];
        return {
          ...cf,
          last_message_at: u?.last_message_at || null,
          _unreadCount: u?.count ?? (u?.hasUnread ? 1 : 0),
          _snippet: u?.snippet || "",
          _avatar: cf.avatar_url || null, // si algún día mandás avatar por expediente/persona
        };
      });

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

  // ---- Derivados (tabs + search) ----
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((cf) => {
      const unread = unreadCountFor(cf.id) > 0;
      const passTab = tab === "all" ? true : tab === "unread" ? unread : !unread;
      if (!passTab) return false;
      if (!term) return true;
      return (
        String(cf.case_number || "").toLowerCase().includes(term) ||
        String(cf.title || "").toLowerCase().includes(term) ||
        String(cf.jurisdiction || "").toLowerCase().includes(term) ||
        String(cf.court || "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, tab]);

  // ---- UI helpers ----
  const fmtTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }); // e.g. Mon, 10:05
  };
  const initials = (txt) =>
    (txt || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "CF";

  return (
    <AppNavsShell>
      <div className="container-fluid px-3">
        {/* Topbar simple */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-3">
            <h1 className="h2 mb-0">Chats</h1>
            {totalUnread > 0 && (
              <span className="badge bg-danger rounded-pill">{totalUnread > 99 ? "99+" : totalUnread}</span>
            )}
          </div>
          <Link to={returnTo} className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1" />
            Back
          </Link>
        </div>

        {/* ===== Layout Phoenix: sidebar + placeholder ===== */}

        <div className="chat d-flex gap-3">
          {/* ===== SIDEBAR ===== */}
          <div className="chat-sidebar p-3 p-xl-1 card" style={{ minWidth: 320, maxWidth: 420, width: "100%" }}>
            {/* (Botón y menú responsive del demo existen, pero no hacen falta funcionalmente) */}

            {/* Search (desktop) */}
            <div className="form-icon-container mb-4 d-sm-none d-xl-block">
              <input
                placeholder="People, Groups and Messages"
                className="form-icon-input form-control"
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <i className="fa-solid fa-user text-body fs-9 form-icon" />
            </div>

            {/* Tabs All/Read/Unread */}
            <div className="mb-5 d-sm-none d-xl-flex nav nav-phoenix-pills" role="tablist">
              {["all", "read", "unread"].map((k) => (
                <div className="nav-item" key={k}>
                  <a
                    role="tab"
                    data-rr-ui-event-key={k}
                    id={`react-aria-${k}-tab`}
                    aria-controls={`react-aria-${k}-tabpane`}
                    aria-selected={tab === k}
                    className={`nav-link ${tab === k ? "active" : ""}`}
                    tabIndex={tab === k ? "0" : "-1"}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setTab(k);
                    }}
                  >
                    {k[0].toUpperCase() + k.slice(1)}
                  </a>
                </div>
              ))}
            </div>

            {/* Lista de conversaciones */}
            <div className="scrollbar">
              <div className="chat-conversation-tab flex-column nav" role="tablist">
                {loading && <div className="px-3 py-2 text-muted small">Loading chats…</div>}
                {err && <div className="px-3 py-2 text-danger small">{err}</div>}
                {!loading && !err && filtered.length === 0 && (
                  <div className="px-3 py-2 text-muted small">No results</div>
                )}

                {filtered.map((cf) => {
                  const unread = unreadCountFor(cf.id);
                  const lastAt = fmtTime(cf.last_message_at);
                  const name = cf.title || `Courtfile #${cf.id}`;
                  const snippet =
                    cf._snippet ||
                    (cf.court ? `${cf.jurisdiction ?? ""} ${cf.court}`.trim() : cf.jurisdiction || "");

                  return (
                    <Link
                      key={cf.id}
                      role="tab"
                      className={`d-flex align-items-center justify-content-center p-2 nav-link ${unread > 0 ? "unread" : "read"
                        }`}
                      to={`/chats/${cf.id}`}
                      state={{
                        courtfileId: cf.id,
                        courtfileNumber: cf.case_number,
                        courtfileTitle: cf.title,
                        senderRole: role,
                        returnTo: "/chats",
                      }}
                      data-discover="true"
                      title="Open conversation"
                    >
                      {/* Avatar */}
                      <div className="position-relative me-2 me-sm-0 me-xl-2">
                        <div className="d-block avatar">
                          {cf._avatar ? (
                            <img
                              alt="avatar"
                              className="border border-2 border-light-subtle rounded-circle"
                              src={cf._avatar}
                            />
                          ) : (
                            <div className="border border-2 border-light-subtle rounded-circle d-flex align-items-center justify-content-center bg-body-tertiary text-body fw-semibold"
                              style={{ width: "100%", height: "100%" }}>
                              {initials(name)}
                            </div>
                          )}
                        </div>

                        {/* puntito en mobile cuando hay unread */}
                        {unread > 0 && (
                          <span
                            className="bg-primary rounded-circle top-0 end-0 position-absolute text-white d-flex flex-center fs-10 fw-semibold d-none d-sm-flex d-xl-none lh-1"
                            style={{ height: "1rem", width: "1rem" }}
                          >
                            {unread > 9 ? "" : unread}
                          </span>
                        )}
                      </div>

                      {/* Texto */}
                      <div className="flex-1 d-sm-none d-xl-block">
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="text-body fw-normal name text-nowrap mb-0">{name}</h5>
                          <p className="fs-10 text-body-tertiary text-opacity-85 mb-0 text-nowrap">{lastAt}</p>
                        </div>

                        <div className="d-flex justify-content-between">
                          <p className="fs-9 mb-0 line-clamp-1 text-body-tertiary text-opacity-85 message">
                            {snippet || "Open chat"}
                          </p>

                          {unread > 0 && (
                            <span className="px-1 unread-badge ms-1 badge-phoenix badge-phoenix-primary badge">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ===== PANEL DERECHO (placeholder) ===== */}
          <div className="h-100 w-100 d-none d-sm-block card">
            <div className="h-100 d-flex flex-column flex-center text-center card-body">
              <img alt="chat" height="260" width="320" className="mb-15 d-dark-none" src="/assets/chat-_IOBP0be.webp" />
              <img alt="chat" height="260" width="320" className="mb-15 d-light-none" src="/assets/dark_chat-Bg8B0lAX.webp" />
              <h3 className="text-body fw-semibold mb-3 fs-7 fs-sm-6">Click to select a Conversation or,</h3>
              <h3 className="text-primary fw-semibold fs-7 fs-sm-6">Start a New Conversation</h3>
            </div>
          </div>
        </div>

      </div>
    </AppNavsShell>
  );
}
