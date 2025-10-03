import { Link, Navigate, useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import AppNavsShell from "../../components/AppNavsShell";
import StatusPill from "../../components/StatusPill";

export const Lawyers = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();
  const canEdit = role === "admin_user";



  // ---------- Local UI state ----------
  const [q, setQ] = useState("");              // search
  const [status, setStatus] = useState("all"); // all | active | inactive
  const [loading, setLoading] = useState(false);

  const fetchLawyers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/lawyers`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      dispatch({ type: "SET_LAWYERS", payload: data });
    } catch (err) {
      console.error("Error fetching lawyers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLawyers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteLawyer = async (id) => {
    if (!canEdit) return; // solo admin_user
    const row = (store.lawyers || []).find((l) => l.id === id);
    const displayName = row ? `${row.firstname || ""} ${row.lastname || ""}`.trim() : `#${id}`;
    if (!window.confirm(`Are you sure you want to delete lawyer ${displayName || `#${id}`}?`)) return;

    try {
      const resp = await fetch(`${API}/api/lawyers/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }
      dispatch({ type: "DELETE_LAWYER", payload: id });
      alert("Lawyer deleted successfully!");
    } catch (err) {
      console.error("Error deleting lawyer:", err);
      alert(`Error deleting lawyer: ${err.message}`);
    }
  };

  // ---------- Derived list (search + filter) ----------
  const lawyers = store.lawyers || [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return lawyers.filter((l) => {
      const matchesQ =
        !term ||
        `${l.firstname || ""} ${l.lastname || ""}`.toLowerCase().includes(term) ||
        (l.email || "").toLowerCase().includes(term) ||
        String(l.id || "").includes(term);
      const matchesStatus =
        status === "all" ? true : status === "active" ? !!l.is_active : !l.is_active;
      return matchesQ && matchesStatus;
    });
  }, [lawyers, q, status]);

  const homeByRole =
    role === "admin_user"
      ? "/DashboardAdmin"
      : role === "client"
        ? "/DashboardClient"
        : "/DashboardLawyer";

  return (
    <AppNavsShell>
      <div className="container add-page">

        {/* ===== Breadcrumbs ===== */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to={homeByRole}>Dashboard</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Appointments
            </li>
          </ol>
        </nav>

        {/* ===== Toolbar superior ===== */}
        <div className="mb-1">
          {/* Fila 1: título + contador */}
          <div className="mb-4">
            <div className="d-flex gap-3">
              <h1 className="h2 mb-2">Lawyers</h1>

            </div>
            <p className="text-muted small mt-1">
              Showing lawyers who share at least one courtfile with you {role === "admin_user" ? "(admin sees all)" : ""}. Only a lawyer can unlink themselves from a courtfile.
            </p>
          </div>

          {/* Fila 2: izquierda = search + filtros | derecha = Add lawyer (solo admin) */}
          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-md-between gap-2">
            {/* Izquierda (buscador + filtros) */}
            <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 w-100">
              {/* Search */}
              <div className="search-box position-relative flex-grow-1" style={{ maxWidth: 640 }}>
                <i
                  className="bi bi-search"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 10,
                    transform: "translateY(-50%)",
                    color: "#6c757d",
                  }}
                />
                <input
                  type="search"
                  className="form-control w-100"
                  placeholder="Search lawyers"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ paddingLeft: "2rem" }}
                />
                {q && (
                  <button
                    className="btn btn-sm position-absolute"
                    onClick={() => setQ("")}
                    title="Clear"
                    style={{
                      top: "50%",
                      right: 6,
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#6c757d",
                    }}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>

              {/* Filtros */}
              <div className="d-flex flex-wrap gap-2 mt-2 mt-md-0">
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

            {/* Derecha (Add/Link) */}
            <div className="ms-0 ms-md-auto w-100 w-md-auto mt-2 mt-md-0 d-flex justify-content-md-end align-items-start align-items-md-center">
              {role === "lawyer" ? (
                <Link
                  to="/lawyers/link-or-invite"
                  className="btn btn-phoenix btn-phoenix-primary btn-sm px-3 py-2 lh-sm text-nowrap w-100 w-md-auto d-inline-flex align-items-center gap-2 flex-shrink-0"
                >
                  <i className="bi bi-plus-lg" />
                  <span>Link or invite</span>
                </Link>
              ) : (
                <Link
                  to="/lawyers/addLawyer"
                  className="btn btn-phoenix btn-phoenix-primary btn-sm px-3 py-2 lh-sm text-nowrap w-100 w-md-auto d-inline-flex align-items-center gap-2 flex-shrink-0"
                >
                  <i className="bi bi-plus-lg" />
                  <span>Add lawyer</span>
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
                  <th>Lawyer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  {role !== "client" && (
                    <th style={{ width: 60 }}>
                      <span className="text-muted">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    className="table-row-clickable"
                    onClick={() => navigate(`/lawyers/view/${l.id}`)}
                    role="button"
                  >
                    {/* Avatar + nombre */}
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        {l.url_img ? (
                          <img
                            src={l.url_img}
                            alt={`${l.firstname || ""} ${l.lastname || ""}`}
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
                            {(l.firstname || "—") + " " + (l.lastname || "")}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td>
                      {l.email ? (
                        <a href={`mailto:${l.email}`} className="text-decoration-none">
                          {l.email}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td>{l.phone || <span className="text-muted">—</span>}</td>

                    {/* Status */}
                    <td>
                      <StatusPill status={l?.status ?? (l.is_active ? "Active" : "Inactive")} />
                    </td>

                    {/* Kebab actions */}
                    {role !== "client" && (
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown position-static">
                          <button
                            className="btn btn-link text-secondary p-0"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            aria-label="Row actions"
                          >
                            <i className="bi bi-three-dots icon-btn"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                              <Link className="dropdown-item" to={`/lawyers/view/${l.id}`}>
                                <i className="bi bi-eye me-2"></i> View
                              </Link>
                            </li>
                            {canEdit && (
                              <li>
                                <Link className="dropdown-item" to={`/lawyers/${l.id}`}>
                                  <i className="bi bi-pencil me-2"></i> Edit
                                </Link>
                              </li>
                            )}
                            {canEdit && (
                              <>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                  <button
                                    className="dropdown-item text-danger"
                                    onClick={() => handleDeleteLawyer(l.id)}
                                  >
                                    <i className="bi bi-trash me-2"></i> Delete
                                  </button>
                                </li>
                              </>
                            )}
                          </ul>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <div className="alert alert-light border d-flex align-items-center" role="alert">
            <span className="spinner-border spinner-border-sm me-2" /> Loading lawyers…
          </div>
        ) : (
          <div className="alert text-secondary bg-transparent border-0 mt-2">
            <i className="bi bi-info-circle"></i> No lawyers found for your shared courtfiles.
          </div>
        )}
      </div>
    </AppNavsShell>
  );
};
