import { useNavigate, Link, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useEffect, useState, useMemo } from "react"
import AppNavsShell from "../../components/AppNavsShell";
import StatusPill from "../../components/StatusPill";
import { toast } from 'react-toastify';

export const Courtfiles = () => {

  const { store, dispatch } = useGlobalReducer()
  const API = import.meta.env.VITE_BACKEND_URL;

  const [loading, setLoading] = useState(false);

  const token = store?.auth?.token;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  const navigate = useNavigate();

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer" ||
    role === "client";

  if (!allowed) return <Navigate to="/403" replace />;

  useEffect(() => {
    const fetchCourtfiles = async () => {
      try {
        const response = await fetch(`${API}/api/courtfiles`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          dispatch({ type: 'SET_COURTFILES', payload: data });
        } else {
          console.error("Error fetching courtfiles");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchCourtfiles();
  }, [dispatch]);

  const handleDeleteCourtfile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this courtfile?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/api/courtfiles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (response.ok) {
        dispatch({ type: 'DELETE_COURTFILE', payload: id });
        toast.success('Courtfile deleted successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting courtfile:', error);
      toast.error(`Error deleting courtfile: ${error.message}`);
    }
  };

  // ----------------------- ORDEN DE TABLA -------------------------
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });

  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // fuente de datos: lo que ya tenés en el store
  const baseCases = store.courtfiles || [];

  // versión ordenada según sortConfig
  const sortedCases = useMemo(() => {
    const arr = [...baseCases];
    const { key, direction } = sortConfig;
    if (!key) return arr;

    arr.sort((a, b) => {
      const av = (a?.[key] ?? "").toString().toLowerCase();
      const bv = (b?.[key] ?? "").toString().toLowerCase();
      if (av < bv) return direction === "asc" ? -1 : 1;
      if (av > bv) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [baseCases, sortConfig]);

  // ---------------- BUSCADOR COURTFILES ----------------
  const [search, setSearch] = useState("");
  // ---------------- FILTRO STATUS ----------------
  const [status, setStatus] = useState("all"); // all | active | inactive

  // ---------------- BUSCADOR + FILTRO COURTFILES ----------------
  const filteredCases = useMemo(() => {
    const cases = sortedCases;

    // Normaliza "activo/inactivo" desde distintas fuentes
    const isActiveValue = (cf) => {
      if (typeof cf?.is_active === "boolean") return cf.is_active;
      const s = String(cf?.status ?? cf?.state ?? "").toLowerCase();
      if (s.includes("active") || s.includes("open")) return true;
      if (s.includes("inactive") || s.includes("closed") || s.includes("archiv")) return false;
      return true; // si es desconocido, lo consideramos activo por defecto
    };

    const byStatus = cases.filter((cf) => {
      if (status === "all") return true;
      return status === "active" ? isActiveValue(cf) : !isActiveValue(cf);
    });

    if (!search?.trim()) return byStatus;

    const q = search.toLowerCase();
    return byStatus.filter((cf) =>
      [cf.case_number, cf.title, cf.jurisdiction, cf.court, cf.status, cf.state]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [sortedCases, search, status]);

  const normalizeStatus = (raw) => {
    if (raw === true) return "active";
    if (raw === false) return "inactive";
    if (raw == null) return "inactive";
    const s = String(raw).trim().toLowerCase();
    if (["1", "true", "active", "open"].includes(s)) return "active";
    if (["0", "false", "inactive", "closed", "archiv"].includes(s)) return "inactive";
    return "inactive"; // default fallback
  };

  const homeByRole =
    role === "admin_user"
      ? "/DashboardAdmin"
      : role === "client"
        ? "/DashboardClient"
        : "/DashboardLawyer";

  // ruta de view según rol
  const viewPathFor = (id) =>
    role === "client"
      ? `/courtfiles/viewclient/${id}`
      : `/courtfiles/ViewCourtfileLawyer/${id}`;

  const isClient = role === "client";

  return (
    <AppNavsShell>
      <div className="container add-page">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to={homeByRole}>Dashboard</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Courtfiles
            </li>
          </ol>
        </nav>

        <div className="">

          {/* ===== Toolbar ===== */}
          <div className="toolbar-courtfiles">
            <div className="d-flex gap-3 mb-2">
              <h2 className="mb-5">Courtfiles</h2>
            </div>

            {/* Fila 2: izq = search + filtros | der = Add */}
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap flex-sm-nowrap">
              {/* Izquierda */}
              <div
                className="d-flex align-items-center gap-2 flex-column flex-sm-row w-100"
                style={{ minWidth: 0 }}
              >
                {/* Search (igual estilo) */}
                <div className="search-box w-100 w-sm-auto" style={{ width: "clamp(260px, 40vw, 420px)" }}>
                  <i className="bi bi-search search-icon"></i>
                  <input
                    type="search"
                    className="form-control search-input"
                    placeholder="Search by number, title, court..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="clear-btn" onClick={() => setSearch("")} title="Clear">
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>

                {/* Botoncitos de estado */}
                <div className="d-flex align-items-center gap-2 flex-nowrap flex-shrink-0 w-100 w-sm-auto justify-content-between justify-content-sm-start">
                  <button
                    className={`btn btn-sm ${status === "all" ? "btn-dark" : "px-3 text-body text-decoration-none btn btn-link"}`}
                    onClick={() => setStatus("all")}
                  >
                    All
                  </button>

                  <button
                    className={`btn btn-sm ${status === "active" ? "btn-dark" : "px-3 text-body text-decoration-none btn btn-link"}`}
                    onClick={() => setStatus("active")}
                  >
                    Active
                  </button>

                  <button
                    className={`btn btn-sm ${status === "inactive" ? "btn-dark" : "px-3 text-body text-decoration-none btn btn-link"}`}
                    onClick={() => setStatus("inactive")}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              {/* Derecha */}
              <div className="ms-auto flex-shrink-0 w-100 w-sm-auto">
                <Link
                  to="/courtfiles/addcourtfile"
                  state={{ linkToLawyer: true, returnTo: "/DashboardLawyer" }}
                  className="btn btn-phoenix btn-phoenix-primary w-100 w-sm-auto"
                >
                  + New Courtfile
                </Link>
              </div>
            </div>
          </div>

          <table className="table table-modern align-middle mb-0 pt-1 table-courtfiles">
            <thead>
              <tr>
                <th className="text-center" role="button" onClick={() => requestSort("id")}>
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

                <th role="button" onClick={() => requestSort("title")}>
                  Case{" "}
                  <i
                    className={`bi ${sortConfig.key === "title"
                      ? sortConfig.direction === "asc"
                        ? "bi-arrow-up"
                        : "bi-arrow-down"
                      : "bi-arrow-down-up text-muted"
                      }`}
                  />
                </th>

                <th role="button" onClick={() => requestSort("jurisdiction")}>
                  Jurisdiction{" "}
                  <i
                    className={`bi ${sortConfig.key === "jurisdiction"
                      ? sortConfig.direction === "asc"
                        ? "bi-arrow-up"
                        : "bi-arrow-down"
                      : "bi-arrow-down-up text-muted"
                      }`}
                  />
                </th>

                <th role="button" onClick={() => requestSort("court")}>
                  Court{" "}
                  <i
                    className={`bi ${sortConfig.key === "court"
                      ? sortConfig.direction === "asc"
                        ? "bi-arrow-up"
                        : "bi-arrow-down"
                      : "bi-arrow-down-up text-muted"
                      }`}
                  />
                </th>

                <th
                  className="text-center"
                  role="button"
                  onClick={() => requestSort("status")}
                >
                  Status{" "}
                  <i
                    className={`bi ${sortConfig.key === "status"
                      ? sortConfig.direction === "asc"
                        ? "bi-arrow-up"
                        : "bi-arrow-down"
                      : "bi-arrow-down-up text-muted"
                      }`}
                  />
                </th>

                {/* Actions header (oculto para clients) */}
                {!isClient && <th>{/* Actions column */}</th>}
              </tr>
            </thead>

            <tbody>
              {filteredCases.map((courtfile) => (
                <tr
                  key={courtfile.id}
                  onClick={() => navigate(viewPathFor(courtfile.id))}
                  className="table-row-clickable"
                >
                  {/* ID */}
                  <td className="text-center pe-3">{courtfile.id}</td>

                  {/* CASE */}
                  <td>
                    <div className="cell-main">
                      <div className="title text-truncate" title={courtfile.title || "—"}>
                        {courtfile.title || "—"}
                      </div>
                      <div className="subtitle text-truncate" title={courtfile.case_number || "—"}>
                        {courtfile.case_number || "—"}
                      </div>
                    </div>
                  </td>

                  {/* Jurisdiction */}
                  <td title={courtfile.jurisdiction || "—"}>
                    <div className="juris-clip">
                      {courtfile.jurisdiction || "—"}
                    </div>
                  </td>

                  {/* Court */}
                  <td title={courtfile.court || "—"}>
                    <div>{courtfile.court || "—"}</div>
                  </td>

                  {/* Status */}
                  <td className="col-status text-center">
                    {normalizeStatus(courtfile?.status ?? courtfile?.is_active ?? courtfile?.state) === "active" ? (
                      <span className="fs-10 badge-phoenix badge badge-phoenix-success">Active</span>
                    ) : (
                      <span className="fs-10 badge-phoenix badge badge-phoenix-secondary">Inactive</span>
                    )}
                  </td>

                  {/* Actions (solo admin/lawyer) */}
                  {!isClient && (
                    <td className="col-actions">
                      <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-sm btn-light icon-btn"
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          aria-label="More actions"
                        >
                          <i className="bi bi-three-dots icon-btn" />
                        </button>

                        <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                          <li>
                            <Link
                              to={`/courtfiles/view/${courtfile.id}`}
                              className="dropdown-item d-flex align-items-center gap-2"
                            >
                              <i className="bi bi-eye" />
                              View
                            </Link>
                          </li>

                          <li>
                            <Link
                              to={`/courtfiles/${courtfile.id}`}
                              className="dropdown-item d-flex align-items-center gap-2"
                            >
                              <i className="bi bi-pencil" />
                              Edit
                            </Link>
                          </li>

                          <li><hr className="dropdown-divider" /></li>

                          <li>
                            <button
                              className="dropdown-item text-danger d-flex align-items-center gap-2"
                              onClick={() => handleDeleteCourtfile(courtfile.id)}
                            >
                              <i className="bi bi-trash" />
                              Delete
                            </button>
                          </li>
                        </ul>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppNavsShell>
  );
};
