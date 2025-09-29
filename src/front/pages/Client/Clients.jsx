import { useNavigate, Link, Navigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import AppNavsShell from "../../components/AppNavsShell";
import StatusPill from "../../components/StatusPill";


export const Clients = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const token = store?.auth?.token;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();
  const canEdit = role === "admin_user";

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  // ---------- Local UI state ----------
  const [q, setQ] = useState("");                // search
  const [status, setStatus] = useState("all");   // filter
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/clients`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: "SET_CLIENTS", payload: data });
      } else {
        console.error("Error fetching clients");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteClient = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      const response = await fetch(`${API}/api/clients/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        dispatch({ type: "DELETE_CLIENT", payload: id });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      alert(`Error deleting client: ${error.message}`);
    }
  };

  // ---------- Derived list (search + filter) ----------
  const clients = store.clients || [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients.filter((c) => {
      const matchesQ =
        !term ||
        `${c.firstname || ""} ${c.lastname || ""}`.toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        String(c.id || "").includes(term);
      const matchesStatus =
        status === "all" ? true : status === "active" ? !!c.is_active : !c.is_active;
      return matchesQ && matchesStatus;
    });
  }, [clients, q, status]);

  return (
    <AppNavsShell>
      <div className="container add-page">

        {/* ===== Toolbar superior ===== */}
        <div className="mb-1">

          {/* Fila 1: título + contador */}
          <div className="mb-4">
            <div className="d-flex gap-3">
              <h1 className="h2 mb-2">Clients</h1>
              <span className="text-muted small">
                {loading ? "Loading…" : `${filtered.length} of ${clients.length || 0}`}
              </span>
            </div>
            <p className="text-muted small mt-1">
              To unlink a client, you can do it either from the client’s view or directly from the related courtfile.
            </p>
          </div>

          {/* Fila 2: izquierda = search + filtros | derecha = Add client */}
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">

            {/* Izquierda */}
            <div className="d-flex align-items-center gap-2 flex-nowrap">
              {/* Search */}
              {/* Search estilo custom */}
              <div className="search-box" style={{ position: "relative", maxWidth: 320, flex: "1 1 auto" }}>
                <i className="bi bi-search search-icon"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "10px",
                    transform: "translateY(-50%)",
                    color: "#6c757d"
                  }}
                />
                <input
                  type="search"
                  className="form-control search-input"
                  placeholder="Search clients"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ paddingLeft: "2rem" }}
                />
                {q && (
                  <button
                    className="clear-btn"
                    onClick={() => setQ("")}
                    title="Clear"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "10px",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#6c757d",
                      cursor: "pointer"
                    }}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>

              {/* Filtros en la misma línea */}
              <div className="d-flex align-items-center gap-2 flex-nowrap">
                <button
                  className={`btn btn-sm ${status === "all" ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => setStatus("all")}
                >
                  All
                </button>
                <button
                  className={`btn btn-sm ${status === "active" ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => setStatus("active")}
                >
                  Active
                </button>
                <button
                  className={`btn btn-sm ${status === "inactive" ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => setStatus("inactive")}
                >
                  Inactive
                </button>
              </div>
            </div>

            {/* Derecha */}
            <div className="ms-auto">
              {role === "lawyer" ? (
                <Link
                  to="/clients/link-or-create"
                  className="btn btn-primary"
                >
                  <i className="bi bi-plus-lg me-1"></i> Link or create client
                </Link>
              ) : (
                <Link
                  to="/clients/addClient"
                  className="btn btn-primary"
                >
                  <i className="bi bi-plus-lg me-1"></i> Add client
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ===== Tabla ===== */}
        {filtered.length > 0 ? (
          <div className="table-responsive pt-0">
            <table className="table table-modern align-middle mb-0 pt-0">
              <thead className="table-light">
                <tr>

                  <th>Customer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th style={{ width: 60 }}> {/* acciones */}
                    <span className="text-muted">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}
                    className="table-row-clickable"
                    onClick={() => navigate(`/clients/view/${c.id}`)}>


                    {/* Customer (avatar + nombre) */}
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        {c.url_img ? (
                          <img
                            src={c.url_img}
                            alt={`${c.firstname || ""} ${c.lastname || ""}`}
                            className="rounded-circle border object-fit-cover"
                            style={{ width: 36, height: 36 }}
                          />
                        ) : (
                          <div
                            className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center border"
                            style={{ width: 36, height: 36 }}
                            aria-label="no avatar"
                          >
                            <i className="bi bi-person text-muted"></i>
                          </div>
                        )}
                        <div className="lh-sm">
                          <div className="fw-semibold">
                            {(c.firstname || "—") + " " + (c.lastname || "")}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td>
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-decoration-none">
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td>{c.phone || <span className="text-muted">—</span>}</td>

                    {/* Status */}
                    <td>
                      <StatusPill status={c?.status ?? (c.is_active ? "Active" : "Inactive")} />
                    </td>

                    {/* Kebab actions */}
                    <td className="text-center">
                      <div className="dropdown position-static">
                        <button
                          className="btn btn-link text-secondary p-0"
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          aria-label="Row actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <i className="bi bi-three-dots fs-7"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li>
                            <Link className="dropdown-item" to={`/clients/view/${c.id}`}>
                              <i className="bi bi-eye me-2"></i> View
                            </Link>
                          </li>
                          {canEdit && (
                            <li>
                              <Link className="dropdown-item" to={`/clients/${c.id}`}>
                                <i className="bi bi-pencil me-2"></i> Edit
                              </Link>
                            </li>
                          )}

                          <li><hr className="dropdown-divider" /></li>

                          {/* si también querés limitar Delete a admins, dejá esto condicionado */}
                          {canEdit && (
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                onClick={() => handleDeleteClient(c.id)}
                              >
                                <i className="bi bi-trash me-2"></i> Delete
                              </button>
                            </li>
                          )}
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <div className="alert alert-light border d-flex align-items-center" role="alert">
            <span className="spinner-border spinner-border-sm me-2" /> Loading clients…
          </div>
        ) : (
          <div className="alert alert-info">
            <i className="bi bi-info-circle"></i> No clients found. Create your first one!
          </div>
        )}
      </div>
    </AppNavsShell>
  );
};
