// views/Deadlines/Deadlines.jsx
import { Link, Navigate, useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import AppNavsShell from "../../components/AppNavsShell";
import DeadlineBadge from "../../components/DeadlineBadge";

export const Deadlines = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const token = store?.auth?.token;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  // ---------- Local UI state ----------
  const [q, setQ] = useState("");
  const [fPriority, setFPriority] = useState("all"); // all | low | medium | high | urgent
  const [loading, setLoading] = useState(false);

  // ---------- Fetch ----------
  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/deadlines`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      dispatch({ type: "SET_DEADLINES", payload: data });
    } catch (err) {
      console.error("Error fetching deadlines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadlines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Helpers ----------
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString();
  };

  const getPriorityBadgeClass = (priority) => {
    switch ((priority || "").toLowerCase()) {
      case "low": return "bg-secondary";
      case "medium": return "bg-info";
      case "high": return "bg-warning text-dark";
      case "urgent": return "bg-danger";
      default: return "bg-secondary";
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this deadline?")) return;
    try {
      const resp = await fetch(`${API}/api/deadlines/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }
      dispatch({ type: "DELETE_DEADLINE", payload: id });
      alert("Deadline deleted successfully!");
    } catch (err) {
      console.error("Error deleting deadline:", err);
      alert(`Error deleting deadline: ${err.message}`);
    }
  };

  // ---------- Derived list ----------
  const deadlines = store.deadlines || [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return deadlines.filter((d) => {
      const matchesQ =
        !term ||
        String(d.id || "").includes(term) ||
        (d.deadline_type || "").toLowerCase().includes(term);
      const matchesPriority =
        fPriority === "all" ? true : String(d.priority || "").toLowerCase() === fPriority;
      return matchesQ && matchesPriority;
    });
  }, [deadlines, q, fPriority]);

  // ---- NUEVO: estado de sort + handler ----
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // ---- NUEVO: utilidades de comparación ----
  const priorityRank = { low: 1, medium: 2, high: 3, urgent: 4 };

  const toDateValue = (dateStr, hourStr) => {
    // Combina fecha + hora si hay, para ordenar correctamente
    if (!dateStr) return Number.NEGATIVE_INFINITY;
    const iso = hourStr ? `${dateStr}T${hourStr}` : dateStr;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
  };

  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  // ---- NUEVO: lista ordenada ----
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, direction } = sortConfig;
    if (!key) return arr;

    arr.sort((A, B) => {
      let res = 0;

      if (key === "deadline_date") {
        const va = toDateValue(A.deadline_date, A.deadline_hour);
        const vb = toDateValue(B.deadline_date, B.deadline_hour);
        res = cmp(va, vb);
      } else if (key === "deadline_hour") {
        // Formato HH:MM (string) — comparamos normalizando vacío
        const va = A.deadline_hour || "";
        const vb = B.deadline_hour || "";
        res = cmp(va, vb);
      } else if (key === "priority") {
        const va = priorityRank[(A.priority || "").toLowerCase()] ?? 0;
        const vb = priorityRank[(B.priority || "").toLowerCase()] ?? 0;
        res = cmp(va, vb);
      } else {
        // genérico: string vs número
        const va = A[key] ?? "";
        const vb = B[key] ?? "";
        if (typeof va === "string" && typeof vb === "string") {
          res = va.localeCompare(vb, undefined, { sensitivity: "base" });
        } else {
          res = cmp(va, vb);
        }
      }

      return direction === "asc" ? res : -res;
    });

    return arr;
  }, [filtered, sortConfig]);

  return (
    <AppNavsShell>
      <div className="container add-page">
        {/* ===== Toolbar ===== */}
        <div className="mb-1">
          {/* Fila 1: título + contador */}
          <div className="mb-5">
            <div className="d-flex gap-3">
              <h1 className="h2 mb-2">Deadlines</h1>
              <span className="text-muted small">
                {loading ? "Loading…" : `${filtered.length} of ${deadlines.length || 0}`}
              </span>
            </div>
            <p className="text-muted small mt-1">
              {role === "admin_user" && "Admins can create, edit and delete deadlines."}
              {role === "lawyer" && "Lawyers can create, edit and delete deadlines of their cases."}
            </p>
          </div>

          {/* Fila 2: search + filtros + Add */}
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            {/* Izquierda */}
            <div className="d-flex align-items-center gap-2 flex-nowrap">
              {/* Search */}
              <div className="search-box" style={{ position: "relative", maxWidth: 320, flex: "1 1 auto" }}>
                <i
                  className="bi bi-search"
                  style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", color: "#6c757d" }}
                />
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search by ID or type"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ paddingLeft: "2rem" }}
                />
                {q && (
                  <button
                    className="btn btn-sm position-absolute"
                    onClick={() => setQ("")}
                    title="Clear"
                    style={{ top: "50%", right: 6, transform: "translateY(-50%)", background: "transparent", border: "none", color: "#6c757d" }}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>

              {/* Filtro priority */}
              <div className="d-flex align-items-center gap-2 flex-nowrap">
                {["all", "low", "medium", "high", "urgent"].map((p) => (
                  <button
                    key={p}
                    className={`btn btn-sm ${fPriority === p ? "btn-dark" : "btn-outline-secondary"}`}
                    onClick={() => setFPriority(p)}
                  >
                    {p[0].toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Derecha: Add */}
            <div className="ms-auto">
              <Link to="/deadlines/addDeadline" className="btn btn-primary">
                <i className="bi bi-plus-lg me-1" /> Add deadline
              </Link>
            </div>
          </div>
        </div>

        {/* ===== Tabla ===== */}
        {filtered.length > 0 ? (
          <div className="table-responsive pt-0">
            <table className="table table-modern align-middle mb-0 pt-0">
              <thead className="table-light">
                <tr>
                  <th className="text-start" role="button" onClick={() => requestSort("id")} style={{ width: "20px" }}>
                    ID{" "}
                    <i
                      className={`bi ${sortConfig.key === "id"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  <th role="button" onClick={() => requestSort("deadline_type")}>
                    Type{" "}
                    <i
                      className={`bi ${sortConfig.key === "deadline_type"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  <th role="button" onClick={() => requestSort("deadline_date")}>
                    Date{" "}
                    <i
                      className={`bi ${sortConfig.key === "deadline_date"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  <th role="button" onClick={() => requestSort("deadline_hour")}>
                    Time{" "}
                    <i
                      className={`bi ${sortConfig.key === "deadline_hour"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  <th role="button" onClick={() => requestSort("priority")}>
                    Priority{" "}
                    <i
                      className={`bi ${sortConfig.key === "priority"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  <th style={{ width: 60 }} className="text-start pe-3">
                    <span className="text-muted">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {sorted.map((d) => (
                  <tr
                    key={d.id}
                    className="table-row-clickable"
                    onClick={() => navigate(`/deadlines/view/${d.id}`)}
                    role="button"
                  >
                    <td className="text-start ps-2">{d.id}</td>
                    <td>{d.deadline_type}</td>
                    <td>{formatDate(d.deadline_date)}</td>
                    <td>{d.deadline_hour || "—"}</td>
                    <td><DeadlineBadge priority={d.priority} outline /> </td>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="dropdown position-static">
                        <button
                          className="btn btn-link text-secondary p-0 me-3"
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          aria-label="Row actions"
                        >
                          <i className="bi bi-three-dots fs-7"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li>
                            <Link className="dropdown-item" to={`/deadlines/view/${d.id}`}>
                              <i className="bi bi-eye me-2" /> View
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to={`/deadlines/${d.id}`}>
                              <i className="bi bi-pencil me-2" /> Edit
                            </Link>
                          </li>
                          <li><hr className="dropdown-divider" /></li>
                          <li>
                            <button
                              className="dropdown-item text-danger"
                              onClick={() => handleDelete(d.id)}
                            >
                              <i className="bi bi-trash me-2" /> Delete
                            </button>
                          </li>
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
            <span className="spinner-border spinner-border-sm me-2" /> Loading deadlines…
          </div>
        ) : (
          <div className="alert alert-info">
            <i className="bi bi-info-circle" /> No deadlines found. Create your first one!
          </div>
        )
        }
      </div >
    </AppNavsShell >
  );
};
