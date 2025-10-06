// views/Appointments/Appointments.jsx
import { Link, Navigate, useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import AppNavsShell from "../../components/AppNavsShell";
import { toast } from 'react-toastify';

export const Appointments = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const token = store?.auth?.token;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // ---------- Guards ----------
  // Ahora el cliente también puede ver la lista
  const allowed = role === "admin_user" || role === "lawyer" || role === "client";
  if (!allowed) return <Navigate to="/403" replace />;

  // ---------- Local UI state ----------
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------- Fetch ----------
  const fetchAppointments = async () => {
    try {
      setLoading(true);

      // Admin: /api/appointments
      // Lawyer/Client: /api/appointments-courtfiles (filtra por relaciones del usuario en backend)
      const endpoint =
        role === "admin_user"
          ? `${API}/api/appointments`
          : `${API}/api/appointments-courtfiles`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Para lawyer/client mapeamos el formato combinado (join con courtfiles)
      const appointmentsData =
        role === "admin_user"
          ? data
          : data.map((item) => ({
            id: item.appointment_id, // id lógico del turno
            relation_id: item.relation_id ?? item.id, // id de la relación appointment-courtfile (para deletes si aplicara)
            title: item.appointment_title,
            date: item.appointment_date,
            location: item.appointment_location,
            starts_at: item.starts_at,
            ends_at: item.ends_at,
            details: item.appointment_details || item.details || "",
            courtfile_id: item.courtfile_id,
            courtfile_title: item.courtfile_title,
            courtfile_number: item.courtfile_number ?? item?.courtfile?.case_number ?? null, //
          }));

      dispatch({ type: "SET_APPOINTMENTS", payload: appointmentsData });
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]); // si cambia el rol, refetch

  const handleDelete = async (appointment) => {
    // Cliente no puede borrar, por si acaso
    if (role === "client") return;

    if (!window.confirm("Are you sure you want to delete this appointment?")) return;

    try {
      // Lawyers eliminan por relation_id, admins por appointment.id
      const endpoint =
        role === "admin_user"
          ? `${API}/api/appointments/${appointment.id}`
          : `${API}/api/appointments-courtfiles/${appointment.relation_id}`;

      const resp = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      // Dispatch según rol
      if (role === "admin_user") {
        dispatch({ type: "DELETE_APPOINTMENT", payload: appointment.id });
      } else {
        dispatch({ type: "DELETE_APPOINTMENT", payload: appointment.relation_id });
      }

      toast.success("Appointment deleted successfully!");
    } catch (err) {
      console.error("Error deleting appointment:", err);
      toast.error(`Error deleting appointment: ${err.message}`);
    }
  };

  // ---------- Derived list ----------
  const appointments = store.appointments || [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return appointments.filter(
      (a) =>
        !term ||
        String(a.id || "").includes(term) ||
        (a.title || "").toLowerCase().includes(term) ||
        (a.location || "").toLowerCase().includes(term)
    );
  }, [appointments, q]);

  // ---------- Helpers ----------
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString();
  };

  const formatTime = (timeString) => {
    if (!timeString) return "—";
    return String(timeString).slice(0, 5); // HH:MM
  };

  // ---- Estado de orden ----
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const requestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  // ---- Lista ordenada ----
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { key, direction } = sortConfig;
    if (!key) return arr;

    arr.sort((A, B) => {
      let res = 0;

      if (key === "date") {
        const va = new Date(A.date).getTime() || 0;
        const vb = new Date(B.date).getTime() || 0;
        res = cmp(va, vb);
      } else if (key === "starts_at" || key === "ends_at") {
        const va = (A[key] || "").slice(0, 5); // HH:MM
        const vb = (B[key] || "").slice(0, 5);
        res = cmp(va, vb);
      } else {
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

  const homeByRole =
    role === "admin_user"
      ? "/DashboardAdmin"
      : role === "client"
        ? "/DashboardClient"
        : "/DashboardLawyer";

  const isClient = role === "client";

  const courtfilePath = (id) => {
    if (!id) return "#";
    if (role === "lawyer") return `/courtfiles/ViewCourtfileLawyer/${id}`;
    if (role === "client") return `/courtfiles/viewclient/${id}`;
    // fallback (admin u otros)
    return `/courtfiles/view/${id}`;
  };

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

        {/* ===== Toolbar ===== */}
        <div className="mb-1">
          <div className="mb-5">
            <div className="d-flex gap-3">
              <h1 className="h2 mb-2">Appointments</h1>
            </div>
            <p className="text-muted small mt-1">
              {role === "admin_user" && "Admins can create, edit and delete appointments."}
              {role === "lawyer" && "Lawyers can manage appointments of their cases."}
              {role === "client" && "Clients can view their appointments."}
            </p>
          </div>

          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            {/* Izquierda: buscador */}
            <div
              className="search-box"
              style={{ position: "relative", maxWidth: 320, flex: "1 1 auto" }}
            >
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
                className="form-control"
                placeholder="Search by ID, title or location"
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
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </div>

            {/* Derecha: Add (oculto para client) */}
            {!isClient && (
              <div className="ms-auto">
                <Link
                  to="/appointments/addAppointment"
                  className="btn btn-phoenix btn-phoenix-primary"
                >
                  <i className="bi bi-plus-lg me-1" /> Add appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ===== Tabla ===== */}
        {sorted.length > 0 ? (
          <div className="table-responsive pt-0">
            <table className="table table-modern align-middle mb-0 pt-0">
              <thead className="table-light">
                <tr>
                  <th className="text-start" role="button" onClick={() => requestSort("id")}>
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
                  <th>Courtfile</th>

                  <th role="button" onClick={() => requestSort("title")}>
                    Title{" "}
                    <i
                      className={`bi ${sortConfig.key === "title"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  <th role="button" onClick={() => requestSort("location")}>
                    Location{" "}
                    <i
                      className={`bi ${sortConfig.key === "location"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  <th role="button" onClick={() => requestSort("date")}>
                    Date{" "}
                    <i
                      className={`bi ${sortConfig.key === "date"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  <th role="button" onClick={() => requestSort("starts_at")}>
                    Starts{" "}
                    <i
                      className={`bi ${sortConfig.key === "starts_at"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  <th role="button" onClick={() => requestSort("ends_at")}>
                    Ends{" "}
                    <i
                      className={`bi ${sortConfig.key === "ends_at"
                        ? sortConfig.direction === "asc"
                          ? "bi-arrow-up"
                          : "bi-arrow-down"
                        : "bi-arrow-down-up text-muted"
                        }`}
                    />
                  </th>

                  {/* Actions header oculto para client */}
                  {!isClient && (
                    <th style={{ width: 60 }} className="text-start pe-3">
                      <span className="text-muted">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {sorted.map((a) => (
                  <tr
                    key={a.id}
                    className="table-row-clickable"
                    onClick={() => navigate(`/appointments/view/${a.id}`)}
                    role="button"
                  >
                    <td className="text-start ps-2">{a.id}</td>
                    <td style={{ maxWidth: "80px" }} onClick={(e) => e.stopPropagation()}>
                      {a.courtfile_id ? (
                        <Link
                          to={courtfilePath(a.courtfile_id)}
                          state={{ returnTo: location.pathname }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {a.courtfile_number || `${a.courtfile_id}`}
                        </Link>
                      ) : "—"}
                    </td>
                    <td style={{ maxWidth: "100px" }}>{a.title}</td>
                    <td className="text-truncate d-block d-sm-table-cell" style={{ maxWidth: "150px" }}>
                      {a.location}
                    </td>
                    <td>{formatDate(a.date)}</td>
                    <td>{formatTime(a.starts_at)}</td>
                    <td>{formatTime(a.ends_at)}</td>

                    {/* Actions (solo admin/lawyer) */}
                    {!isClient && (
                      <td
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="dropdown position-static">
                          <button
                            className="btn btn-link text-secondary p-0 me-3"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            aria-label="Row actions"
                          >
                            <i className="bi bi-three-dots icon-btn"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                              <Link className="dropdown-item" to={`/appointments/view/${a.id}`}>
                                <i className="bi bi-eye me-2" /> View
                              </Link>
                            </li>
                            <li>
                              <Link className="dropdown-item" to={`/appointments/${a.id}`}>
                                <i className="bi bi-pencil me-2" /> Edit
                              </Link>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                onClick={() => handleDelete(a)}
                              >
                                <i className="bi bi-trash me-2" /> Delete
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
        ) : loading ? (
          <div className="alert alert-light border d-flex align-items-center" role="alert">
            <span className="spinner-border spinner-border-sm me-2" /> Loading appointments…
          </div>
        ) : (
          <div className="alert text-secondary bg-transparent border-0 mt-2">
            <i className="bi bi-info-circle" /> No appointments found.
            {!isClient && " Create your first one!"}
          </div>
        )}
      </div>
    </AppNavsShell>
  );
};
