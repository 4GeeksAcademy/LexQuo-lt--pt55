import { Link, useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect, useMemo } from "react";
import AppNavsShell from "../../components/AppNavsShell";

export const EditCourtfile = () => {
  const { store, dispatch } = useGlobalReducer();
  const { courtfileId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token || null;
  const role = (store?.me?.role || "").toLowerCase();

  const defaultReturn =
    role === "lawyer"
      ? `/courtfiles/ViewCourtfileLawyer/${courtfileId}`
      : "/courtfiles";
  const returnTo = location.state?.returnTo || defaultReturn;

  // ---- Permisos ----
  if (!["lawyer", "admin_user"].includes(role))
    return <Navigate to="/403" replace />;

  const JURISDICCIONES_PJN = [
    "CSJ - Corte Suprema de Justicia de la Nación",
    "CIV - Cámara Nacional de Apelaciones en lo Civil",
    "CAF - Cámara Nacional de Apelaciones en lo Contencioso Administrativo Federal",
    "CCF - Cámara Nacional de Apelaciones en lo Civil y Comercial Federal",
    "CNE - Cámara Nacional Electoral",
    "CSS - Cámara Federal de la Seguridad Social",
    "CPE - Cámara Nacional de Apelaciones en lo Penal Económico",
    "CNT - Cámara Nacional de Apelaciones del Trabajo",
    "CFP - Cámara Criminal y Correccional Federal",
    "CCO - Cámara Nacional de Apelaciones en lo Criminal y Correccional",
    "COM - Cámara Nacional de Apelaciones en lo Comercial",
    "CPF - Cámara Federal de Casación Penal",
    "CPN - Cámara Nacional de Casación Penal",
    "FBB - Justicia Federal de Bahía Blanca",
    "FCR - Justicia Federal de Comodoro Rivadavia",
    "FCB - Justicia Federal de Córdoba",
    "FCT - Justicia Federal de Corrientes",
    "FGR - Justicia Federal de General Roca",
    "FLP - Justicia Federal de La Plata",
    "FMP - Justicia Federal de Mar del Plata",
    "FMZ - Justicia Federal de Mendoza",
    "FPO - Justicia Federal de Posadas",
    "FPA - Justicia Federal de Paraná",
    "FRE - Justicia Federal de Resistencia",
    "FSA - Justicia Federal de Salta",
    "FRO - Justicia Federal de Rosario",
    "FSM - Justicia Federal de San Martín",
    "FTU - Justicia Federal de Tucumán",
  ];

  const [formData, setFormData] = useState({
    case_number: "",
    title: "",
    description: "",
    jurisdiction: "",
    court: "",
    status: true,
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  // ---- Fetch ----
  useEffect(() => {
    const fetchCourtfile = async () => {
      try {
        setFetching(true);
        const response = await fetch(`${API}/api/courtfiles/${courtfileId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setFormData({
          ...data,
          status: data.status === true || data.status === "true",
        });
        setError(null);
      } catch (err) {
        console.error("Error fetching courtfile:", err);
        setError("Failed to load courtfile data");
      } finally {
        setFetching(false);
      }
    };
    if (courtfileId) fetchCourtfile();
  }, [courtfileId, API, token]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/api/courtfiles/${courtfileId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update courtfile");
      }
      const updatedCourtfile = await response.json();
      dispatch({ type: "UPDATE_COURTFILE", payload: updatedCourtfile });
      navigate(returnTo, { replace: true });
      alert("Courtfile updated successfully!");
    } catch (err) {
      console.error("Error updating courtfile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Crumbs ----
  const crumbs = useMemo(() => {
    const arr = [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Courtfiles", to: "/courtfiles" },
      { label: `Edit #${courtfileId}`, to: null },
    ];
    return arr;
  }, [courtfileId]);

  // ---- Loading ----
  if (fetching) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border" role="status"></div>
        <p>Loading courtfile data...</p>
      </div>
    );
  }

  if (error && !formData.case_number) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
      </div>
    );
  }

  return (
    <AppNavsShell>
      <div className="container add-page">
        <div className="row">
          <div className="col-lg-9">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="mb-4">
              <ol className="breadcrumb small mb-0">
                {crumbs.map((c, i) => {
                  const isLast = i === crumbs.length - 1;
                  return (
                    <li
                      key={i}
                      className={`breadcrumb-item ${isLast ? "active" : ""}`}
                      {...(isLast ? { "aria-current": "page" } : {})}
                    >
                      {isLast || !c.to ? (
                        <span className="text-body">{c.label}</span>
                      ) : (
                        <Link to={c.to} state={{ returnTo }}>
                          {c.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-5 fw-bold mb-0">Edit Courtfile</h1>
              <div className="d-flex gap-2">
                <Link to={returnTo} className="btn btn-phoenix btn-phoenix-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  form="courtfileForm"
                  className="btn btn-phoenix btn-phoenix-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2" />
                      Update Courtfile
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center">
                <i className="bi bi-exclamation-triangle me-2" /> {error}
              </div>
            )}

            {/* Form */}
            <form id="courtfileForm" onSubmit={handleSubmit}>
              {/* Case Number */}
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control form-control-ux"
                  id="case_number"
                  name="case_number"
                  placeholder=" "
                  value={formData.case_number}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="case_number">Case Number *</label>
              </div>

              {/* Title */}
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control form-control-ux"
                  id="title"
                  name="title"
                  placeholder=" "
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="title">Title *</label>
              </div>

              {/* Description */}
              <div className="form-floating mb-3">
                <textarea
                  className="form-control form-control-ux"
                  id="description"
                  name="description"
                  placeholder=" "
                  style={{ height: 120 }}
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="description">Description *</label>
              </div>

              {/* Jurisdiction */}
              <div className="form-floating mb-3">
                <select
                  className="form-select form-control-ux"
                  id="jurisdiction"
                  name="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value=""></option>
                  {JURISDICCIONES_PJN.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
                <label htmlFor="jurisdiction">Jurisdiction *</label>
              </div>

              {/* Court */}
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control form-control-ux"
                  id="court"
                  name="court"
                  placeholder=" "
                  value={formData.court}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="court">Court *</label>
              </div>

              {/* Status */}
              <div className="form-check mb-4">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="status"
                  name="status"
                  checked={formData.status === true || formData.status === "true"}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <label className="form-check-label" htmlFor="status">
                  Active Case
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};
