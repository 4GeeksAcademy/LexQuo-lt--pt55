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

  const caseLabel =
    preselectedCourtfileNumber ||
    preselectedCourtfileTitle ||
    (preselectedCourtfileId ? `#${preselectedCourtfileId}` : null);

  return (
    <AppNavsShell>
      <div className="container add-page">
        <div className="row">
          <div className="col-12 col-md-8">

            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb">
                {caseLabel && (
                  <li className="breadcrumb-item">
                    <Link to={`/courtfiles/ViewCourtfileLawyer/${preselectedCourtfileId}`}>
                      {caseLabel}
                    </Link>
                  </li>
                )}
                <li className="breadcrumb-item">
                  <Link to={returnTo || "/documents"}>Documents</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Add
                </li>
              </ol>
            </nav>

     {/* Header */}
<div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4">
  <div>
    <h1 className="display-5 fw-bold mb-2 mb-sm-0">Add New Document</h1>
    {preselectedCourtfileId && (
      <span className="badge badge-phoenix-secondary mt-1 mb-3 text-wrap text-break">
        Linked to Case {preselectedCourtfileNumber || `#${preselectedCourtfileId}`}
        {preselectedCourtfileTitle ? ` — ${preselectedCourtfileTitle}` : ""}
      </span>
    )}
  </div>

  <div className="d-flex gap-2 mt-2 mt-md-0 align-self-end align-self-md-center">
    <Link to={returnTo} className="btn btn-phoenix btn-phoenix-secondary fs-10 fs-md-9">
      Cancel
    </Link>
    <button
      type="submit"
      form="addDocumentForm"
      className="btn btn-phoenix btn-phoenix-primary fs-10 fs-md-9"
      disabled={loading || linking}
    >
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
</div>


            {/* Card contenedora */}

            {suggestion && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-3 p-md-4 border-start border-4 border-primary rounded-start">
                  <div className="d-flex align-items-start">
                    <div
                      className="me-3 rounded-circle bg-warning-subtle text-warning d-inline-flex align-items-center justify-content-center"
                      style={{ width: 36, height: 36 }}
                    >
                      <i className="bi bi-lightbulb-fill" />
                    </div>

                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-1 text-uppercase text-muted fw-bold">Sugerencia IA</h6>
                        {suggestion.urgency && (
                          <span className={`badge badge-phoenix ${String(suggestion.urgency).toLowerCase() === "urgent" ? "badge-phoenix-danger" :
                              String(suggestion.urgency).toLowerCase() === "high" ? "badge-phoenix-warning" :
                                String(suggestion.urgency).toLowerCase() === "medium" ? "badge-phoenix-info" :
                                  "badge-phoenix-secondary"
                            }`}>
                            {String(suggestion.urgency).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <h5 className="mb-1 fw-semibold">{suggestion.title}</h5>

                      {suggestion.reasoning && (
                        <p className="mb-2 text-body-secondary">{suggestion.reasoning}</p>
                      )}

                      {Array.isArray(suggestion.next_steps) && suggestion.next_steps.length > 0 && (
                        <ul className="mb-2 small ps-3">
                          {suggestion.next_steps.map((step, i) => <li key={i}>{step}</li>)}
                        </ul>
                      )}

                      {(suggestion.legal_basis || typeof suggestion.confidence === "number") && (
                        <div className="small text-body-tertiary">
                          {suggestion.legal_basis ? `Fundamento: ${suggestion.legal_basis}` : ""}
                          {typeof suggestion.confidence === "number" ? ` • Conf.: ${(suggestion.confidence * 100).toFixed(0)}%` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-triangle me-2" /> {error}
              </div>
            )}

            <form id="addDocumentForm" onSubmit={handleSubmit}>

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
            </form>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};