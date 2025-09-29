import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";

export const AddDocument = () => {
  const { store, dispatch } = useGlobalReducer();
  const location = useLocation();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer";

  if (!allowed) return <Navigate to="/403" replace />;

  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/documents";
  const suggestion = location.state?.suggestion || null;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    document_date: "",
    courtfile_id: preselectedCourtfileId ? String(preselectedCourtfileId) : ""
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);

  const [myCases, setMyCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [preselectedCf, setPreselectedCf] = useState(
    preselectedCourtfileNumber ? { case_number: preselectedCourtfileNumber, title: preselectedCourtfileTitle } : null
  );

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoadingCases(true);

        // si ya viene el courtfileId, no hace falta llenar el combo
        if (preselectedCourtfileId) {
          // si no llegaron number/title, podemos intentar completarlos
          if (!preselectedCf) {
            const r = await fetch(`${API}/api/courtfiles/${preselectedCourtfileId}`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
            });
            if (r.ok) {
              const d = await r.json();
              setPreselectedCf({ case_number: d.case_number, title: d.title });
            }
          }
          setMyCases([]);
          return;
        }

        const endpoint = role === "admin_user"
          ? `${API}/api/courtfiles`
          : `${API}/api/lawyers-courtfiles`;
        const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" }
        const resp = await fetch(endpoint, { headers });

        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${resp.status}`);
        }

        const raw = await resp.json();
        const mapped = (raw || [])
          .map(item => item?.courtfile ?? item) // si viene como relación usa .courtfile, si no, usa el item plano
          .filter(Boolean)
          .map(cf => ({
            id: cf.id,
            number: cf.case_number,
            title: cf.title,
          }))
          .sort((a, b) => String(a.number || "").localeCompare(String(b.number || "")));

        setMyCases(mapped);
      } catch (err) {
        setError(err.message || "Error fetching courtfiles");
      } finally {
        setLoadingCases(false);
      }
    };
    fetchCases();
  }, [API, token, preselectedCourtfileId, preselectedCf]);


  const documentCategories = [
    "Resolution / Ruling",
    "Party Filing",
    "Evidence",
    "Precautionary Measure / Urgent Request",
    "Public Prosecutor's Office Action",
    "Relevant Judicial Proceeding",
    "Official Letter / Communication",
    "Judgment",
    "Costs and Fees",
    "Internal Note / Reminder",
    "Others"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);


    if (!preselectedCourtfileId && !formData.courtfile_id) {
      setLoading(false);
      setError("Please select a courtfile to link this document.");
      return;
    }

    try {
      // 1) Crear el Document (multipart/form-data)
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("category", formData.category);
      data.append("document_date", formData.document_date);
      if (file) data.append("file", file);

      const response = await fetch(`${API}/api/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create document");
      }

      const newDocument = await response.json();
      dispatch({ type: "ADD_DOCUMENT", payload: newDocument });

      // 2) Link al Courtfile (preseleccionado o elegido)
      const targetCfId = preselectedCourtfileId ? Number(preselectedCourtfileId) : Number(formData.courtfile_id);

      if (targetCfId) {
        setLinking(true);
        const linkResp = await fetch(`${API}/api/courtfile-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            document_id: newDocument.id,
            courtfile_id: targetCfId
          })
        });

        if (!linkResp.ok) {
          const e = await linkResp.json().catch(() => ({}));
          throw new Error(e.error || `Document created, but failed to link (HTTP ${linkResp.status})`);
        }
      }

      alert("Document created and linked successfully!");
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("Error creating Document:", err);
      setError(err.message);
    } finally {
      setLinking(false);
      setLoading(false);
    }
  };

  return (
  <AppNavsShell>
    <div className="container add-page">
      <div className="row">
        <div className="col-lg-10 col-xl-10">
          
          {/* Header */}
          <div className="d-flex justify-content-between mb-4">
            <div>
              <h1 className="display-5 fw-bold mb-0">Add New Document</h1>
              {preselectedCourtfileId && (
                <span className="badge bg-dark mt-2">
                  Linked to Case {preselectedCourtfileNumber || `#${preselectedCourtfileId}`}
                  {preselectedCourtfileTitle ? ` — ${preselectedCourtfileTitle}` : ""}
                </span>
              )}
            </div>
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-1" /> Back
            </Link>
          </div>

          {/* Card contenedora */}
          
              {suggestion && (
                <div className="alert alert-info">
                  <h5 className="mb-1">
                    <i className="bi bi-lightbulb" /> Sugerencia IA
                  </h5>
                  <strong>{suggestion.title}</strong>
                  {suggestion.reasoning && <p className="mb-1">{suggestion.reasoning}</p>}
                  {Array.isArray(suggestion.next_steps) && suggestion.next_steps.length > 0 && (
                    <ul className="mb-1">
                      {suggestion.next_steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  )}
                  {suggestion.legal_basis && (
                    <small className="text-muted">Fundamento: {suggestion.legal_basis}</small>
                  )}
                </div>
              )}

              {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                  <i className="bi bi-exclamation-triangle me-2" /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>

                {/* Courtfile selector si no está preseleccionado */}
                {!preselectedCourtfileId && (
                  <div className="form-floating mb-3">
                    <select
                      className="form-select"
                      id="courtfile_id"
                      name="courtfile_id"
                      value={formData.courtfile_id}
                      onChange={handleInputChange}
                      required
                      disabled={loading || loadingCases}
                    >
                      <option value=""></option>
                      {myCases.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.number} — {c.title}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="courtfile_id">Link to Courtfile *</label>
                  </div>
                )}

                {/* Document name */}
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    placeholder=" "
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                  <label htmlFor="name">Document Name *</label>
                </div>

                {/* Document date */}
                <div className="form-floating mb-3">
                  <input
                    type="date"
                    className="form-control"
                    id="document_date"
                    name="document_date"
                    placeholder=" "
                    value={formData.document_date}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <label htmlFor="document_date">Document Date</label>
                  <div className="form-text">Used for the case timeline</div>
                </div>

                {/* File */}
                <div className="mb-3">
                  <label htmlFor="file" className="form-label">File (optional)</label>
                  <input
                    type="file"
                    className="form-control"
                    id="file"
                    name="file"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </div>

                {/* Category */}
                <div className="form-floating mb-3">
                  <select
                    className="form-select"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value=""></option>
                    {documentCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="category">Category</label>
                </div>

                {/* Description */}
                <div className="form-floating mb-3">
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    placeholder=" "
                    style={{ height: 100 }}
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <label htmlFor="description">Description</label>
                </div>

                {/* Actions */}
                <div className="d-flex gap-2 justify-content-end mt-4">
                  <Link to={returnTo} className="btn btn-outline-secondary">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading || linking}>
                    {loading || linking ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        {linking ? " Linking..." : " Creating..."}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle me-2" />
                        Create Document
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
  </AppNavsShell>
);
};