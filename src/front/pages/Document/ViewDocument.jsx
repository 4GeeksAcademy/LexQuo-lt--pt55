import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";
import { toast } from 'react-toastify';

export const ViewDocument = () => {
  const { store, dispatch } = useGlobalReducer();
  const { documentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/documents";

  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token || null;
  const role = (store?.me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  // ---------- State ----------
  const [documentData, setDocumentData] = useState(null);
  const [linkedCourtfile, setLinkedCourtfile] = useState(() => {
    const s = location.state || {};
    if (s.courtfileId) return { id: s.courtfileId, number: s.courtfileNumber, title: s.courtfileTitle };
    if (s.preselectedCourtfileId)
      return { id: s.preselectedCourtfileId, number: s.preselectedCourtfileNumber, title: s.preselectedCourtfileTitle };
    return null;
  });
  const [loading, setLoading] = useState(true);


  // ===== AI (para este documento) =====
  const [aiLoading, setAiLoading] = useState(false);

  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [cfDetails, setCfDetails] = useState(null); // descripción / jurisdicción / court

  // ---------- Helpers ----------
  const safeDateTime = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  };

  const dateYMDToDMY = (v) => {
    if (!v) return "-";
    const m = /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!m) return "-";
    const [y, mo, d] = v.split("-");
    return `${d}/${mo}/${y}`;
  };

  const handleDownload = (doc) => {
    try {
      if (!doc?.url_route) return;
      const a = document.createElement("a");
      a.href = doc.url_route;
      const fallbackExt = doc.type ? `.${String(doc.type).toLowerCase()}` : "";
      a.download = doc.original_filename || `${doc.name || "document"}${fallbackExt}`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      window.open(doc.url_route, "_blank", "noopener,noreferrer");
    }
  };

  // ---------- Fetch document ----------
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        if (!documentId) return;
        setLoading(true);
        const resp = await fetch(`${API}/api/documents/${documentId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setDocumentData(data);
        
      } catch (err) {
        console.error("Error fetching document:", err);
        toast.error("Failed to load document data");
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [API, token, documentId]);

  useEffect(() => {
    if (documentData) {
      console.log("📋 Document Data Loaded:", {
        id: documentData.id,
        name: documentData.name,
        url_route: documentData.url_route,
        hasUrl: !!(documentData.url_route || documentData.document_url)
      });
    }
  }, [documentData]);

  // ---------- If we know the CF id but lack number/title, fetch the CF ----------
  useEffect(() => {
    const loadCourtfileBasics = async () => {
      try {
        if (!linkedCourtfile?.id) return;
        if (linkedCourtfile.number && linkedCourtfile.title && cfDetails) return;

        const resp = await fetch(`${API}/api/courtfiles/${linkedCourtfile.id}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!resp.ok) return;
        const d = await resp.json();

        setLinkedCourtfile((cf) => ({
          ...(cf || {}),
          number: d.case_number ?? cf?.number ?? null,
          title: d.title ?? cf?.title ?? null,
        }));
        setCfDetails({
          description: d.description || "",
          jurisdiction: d.jurisdiction || "",
          court: d.court || "",
          case_number: d.case_number || "",
          id: d.id,
        });
      } catch {
        // noop
      }
    };
    loadCourtfileBasics();
  }, [API, token, linkedCourtfile?.id]); // detalles CF se cargan si tenemos id

  // ---------- If nothing in state, locate the CF link from relation table ----------
  useEffect(() => {
    const fetchLinked = async () => {
      try {
        if (linkedCourtfile || !documentId) return;
        const resp = await fetch(`${API}/api/courtfile-document`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!resp.ok) return;
        const rows = await resp.json();
        const rel = (rows || []).find((r) => Number(r.document_id) === Number(documentId));
        if (rel) {
          setLinkedCourtfile({
            id: rel.courtfile_id,
            number: rel.courtfile_number ?? null,
            title: rel.courtfile_title ?? null,
          });
        }
      } catch {
        // noop
      }
    };
    fetchLinked();
  }, [API, token, documentId, linkedCourtfile]);

  // ====== ANALIZAR DOCUMENTO (AI) ======
  const runDocumentAnalysis = async () => {
    console.log("🔍 runDocumentAnalysis called");

    if (!documentData) {
      console.log("❌ No documentData");
      return;
    }

    const documentUrl = documentData.url_route || documentData.document_url || null;
    const documentName = documentData.name || documentData.original_filename || `document-${documentId}`;

    console.log("📄 Document data:", { documentUrl, documentName, documentId });

    if (!documentUrl) {
      console.log("❌ No document URL found");
      toast.error("No document URL found to analyze.");
      return;
    }

    try {
      setAiLoading(true);
      setAiSuggestions([]);

      const body = {
        document_url: documentUrl,
        document_name: documentName,
        case_description: cfDetails?.description || "",
        case_jurisdiction: cfDetails?.jurisdiction || "",
        case_court: cfDetails?.court || "",
        case_number: cfDetails?.case_number || "",
      };

      console.log("📤 Sending AI request:", body);

      const resp = await fetch(`${API}/api/ai/analyze-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      console.log("📥 AI Response status:", resp.status);

      const data = await resp.json().catch(() => ({}));
      console.log("📥 AI Response data:", data);

      if (!resp.ok) {
        throw new Error(data?.error || `HTTP ${resp.status}`);
      }

      // CORRECCIÓN: Mapear los campos del backend a los que espera el frontend
      const rawSuggestions = Array.isArray(data?.analysis) ? data.analysis : [];
      console.log("🔍 Raw suggestions from backend:", rawSuggestions);

      // Mapear los campos al formato que espera el frontend
      const sugs = rawSuggestions.map((suggestion, index) => ({
        id: `temp-${Date.now()}-${index}`, // ID temporal para React
        title: suggestion.title || "Sugerencia sin título",
        reasoning: suggestion.content || "", // content → reasoning
        urgency: suggestion.urgency || "medium",
        next_steps: typeof suggestion.actions === 'string'
          ? [suggestion.actions]
          : Array.isArray(suggestion.actions)
            ? suggestion.actions
            : [], // actions → next_steps
        legal_basis: suggestion.legal_basis || "",
        confidence: suggestion.confidence || 0.8
      }));

      console.log("✅ Mapped AI Suggestions:", sugs.length);
      if (sugs.length > 0) {
        console.log("🔍 First mapped suggestion:", sugs[0]);
      }

      setAiSuggestions(sugs);

    } catch (e) {
      console.error("❌ AI Analysis error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  // Efecto mejorado para análisis automático
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);

  useEffect(() => {
    console.log("🔄 Analysis effect triggered", {
      hasDocumentData: !!documentData,
      hasLinkedCourtfile: !!linkedCourtfile?.id,
      hasCfDetails: !!cfDetails,
      hasRunAnalysis
    });

    // Condiciones más estrictas + evitar ejecuciones múltiples
    if (!documentData || hasRunAnalysis) {
      return;
    }

    // Si hay courtfile vinculado, esperar a que carguen los detalles
    if (linkedCourtfile?.id && !cfDetails) {
      console.log("⏳ Waiting for courtfile details");
      return;
    }

    console.log("🚀 Starting automatic analysis");
    setHasRunAnalysis(true);
    runDocumentAnalysis();
  }, [documentData, linkedCourtfile?.id, cfDetails, hasRunAnalysis]);

  // Efecto separado para debug
  useEffect(() => {
    console.log("📊 AI State update:", {
      aiLoading,
      aiSuggestionsCount: aiSuggestions?.length,
      hasCfDetails: !!cfDetails
    });
  }, [aiLoading, aiSuggestions, cfDetails]);


  // ---------- Delete ----------
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const resp = await fetch(`${API}/api/documents/${documentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      dispatch({ type: "DELETE_DOCUMENT", payload: Number(documentId) || documentId });
      navigate(returnTo, { replace: true });
      toast.success("Document deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error(`Error deleting document: ${err.message}`);
    }
  };

  // ---------- UI states ----------
  if (loading) {
    return (
      <AppNavsShell>
        <div className="container add-page text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-2">Loading courtfile…</p>
        </div>
      </AppNavsShell>
    );
  }

 
  // prefer created_at but keep backward compat with create_at
  const createdAt = documentData.created_at || documentData.create_at;

  return (
    <AppNavsShell>
      <div className="container add-page">
        {/* Header */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-end mb-4">

          <div>
            <nav aria-label="breadcrumb" className="mb-2">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to={`/courtfiles/ViewCourtfileLawyer/${linkedCourtfile.id}`}>Documents</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Details
                </li>
              </ol>
            </nav>
            <h1 className="h2 fw-bolder mb-0 line-clamp-1">
              {documentData.name || "Document"}
            </h1>
          </div>

          {["lawyer", "admin_user"].includes((store?.me?.role || "").toLowerCase()) && (
            <div className="d-flex gap-2 mt-2 mt-sm-0 align-self-end align-self-sm-center">
              <Link
                to={`/documents/${documentData.id}`}
                state={{ returnTo }}
                className="btn btn-phoenix-secondary btn-sm"
              >
                <i className="bi bi-pencil" /> Edit
              </Link>
              <button className="btn btn-phoenix-danger btn-sm" onClick={handleDelete}>
                <i className="bi bi-trash" /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Row con las dos cards */}
        <div className="row g-4">
          {/* Card de información del documento */}
          <div className="col-12 col-lg-6">
            <div className="card mb-4">
              <div className="card-body">
                {/* Download */}
                <div className="d-flex justify-content-between align-items-center py-2">
                  <span className="fw-semibold text-muted">Download</span>
                  <button
                    onClick={() => handleDownload(documentData)}
                    className="btn btn-phoenix btn-phoenix-success"
                    title={`Download ${documentData.name || ""}`}
                  >
                    <i className="bi bi-download" />{" "}
                    {documentData.original_filename || documentData.name || "File"}
                  </button>
                </div>
                <hr className="my-2" />

                {/* Document Date */}
                <div className="d-flex justify-content-between align-items-center py-2">
                  <span className="fw-semibold text-muted">Document Date</span>
                  <span className="fw-bold">
                    {documentData.document_date ? dateYMDToDMY(documentData.document_date) : "—"}
                  </span>
                </div>

                <hr className="my-2" />

                {/* Category */}
                <div className="d-flex justify-content-between align-items-center py-2">
                  <span className="fw-semibold text-muted">Category</span>
                  {documentData.category ? (
                    <span className="badge badge-phoenix badge-phoenix-secondary">
                      {documentData.category}
                    </span>
                  ) : (
                    <span className="text-body">—</span>
                  )}
                </div>
                <hr className="my-2" />

                {/* Created At */}
                <div className="d-flex justify-content-between align-items-center py-2">
                  <span className="fw-semibold text-muted">Created At</span>
                  <span className="fw-bold">{safeDateTime(createdAt) || "—"}</span>
                </div>
                <hr className="my-2" />

                {/* Case File */}
                <div className="d-flex justify-content-between align-items-center py-2">
                  <span className="fw-semibold text-muted">Case File</span>
                  {linkedCourtfile ? (
                    <Link
                      to={`/courtfiles/ViewCourtfileLawyer/${linkedCourtfile.id}`}
                      className="badge badge-phoenix badge-phoenix-secondary fs-8"
                      title={linkedCourtfile.title || ""}
                      state={{ returnTo: `/documents/view/${documentData.id}` }}
                    >
                      {linkedCourtfile.number || `#${linkedCourtfile.id}`}
                    </Link>
                  ) : (
                    <span className="text-body-secondary">—</span>
                  )}
                </div>

                {/* Description */}
                <hr className="my-2" />
                <div className="py-2">
                  <span className="fw-semibold text-muted d-block mb-2">Description</span>
                  <div className="border rounded bg-light p-3">
                    {documentData.description && documentData.description.trim() ? (
                      <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                        {documentData.description}
                      </p>
                    ) : (
                      <span className="text-body-secondary">No description provided</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======== ASIDE: AI Suggestions para este documento ======== */}
          <div className="col-12 col-lg-6">
            <div className="card">
              <div className="card-body">
                {/* Header igual a Payments / Courtfile AI */}
                <div className="d-flex align-items-center justify-content-between">
                  <h2 className="h3 mb-0 fw-bold">AI Suggestions</h2>
                  <button
                    className="btn btn-phoenix-secondary ms-2"
                    onClick={runDocumentAnalysis}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <span className="spinner-border spinner-border-sm" role="status" />
                    ) : (
                      <>
                        <i className="bi bi-arrow-repeat me-1"></i> Reload
                      </>
                    )}
                  </button>
                </div>

                <div className="border-top my-3"></div>

                {/* Contenido */}

                {aiLoading && (
                  <div className="text-muted d-flex align-items-center">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Analizando el contenido del documento…
                  </div>
                )}

                {!aiLoading && (!aiSuggestions || aiSuggestions.length === 0) && (
                  <div className="alert text-secondary bg-transparent border-0 mt-2">Sin sugerencias por ahora.</div>
                )}

                {!aiLoading && Array.isArray(aiSuggestions) && aiSuggestions.length > 0 && (
                  <div className="list-group list-group-flush">
                    {aiSuggestions.map((sug, idx) => {
                      const urg = String(sug.urgency || "medium").toLowerCase();
                      const urgClass =
                        urg === "urgent" ? "badge-phoenix-danger" :
                          urg === "high" ? "badge-phoenix-warning" :
                            urg === "medium" ? "badge-phoenix-info" :
                              "badge-phoenix-secondary";

                      return (
                        <div key={sug.id || idx} className="list-group-item">
                          {/* Header item: título + urgencia + kebab */}
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h5 className="mb-1 fw-semibold">{sug.title || "Sugerencia"}</h5>
                              <span className={`fs-10 badge-phoenix badge ${urgClass}`}>
                                {String(sug.urgency || "MEDIUM").toUpperCase()}
                              </span>
                            </div>

                            <div className="dropdown">
                              <button
                                className="btn btn-sm btn-link text-body-tertiary p-0"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                              >
                                <i className="bi bi-three-dots fs-8"></i>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                                {/* Crear Deadline desde sugerencia */}
                                <li>
                                  <Link
                                    className="dropdown-item"
                                    to="/deadlines/addDeadline"
                                    state={{
                                      courtfileId: linkedCourtfile?.id || cfDetails?.id || null,
                                      courtfileNumber: linkedCourtfile?.number || cfDetails?.case_number || null,
                                      courtfileTitle: linkedCourtfile?.title || null,
                                      prefill: { type: "Other", description: sug.title || "" },
                                      suggestion: sug,
                                      returnTo: `/documents/view/${documentData.id}`,
                                    }}
                                  >
                                    <i className="bi bi-calendar2-plus me-2"></i> Deadline
                                  </Link>
                                </li>

                                {/* Crear Appointment desde sugerencia */}
                                <li>
                                  <Link
                                    className="dropdown-item"
                                    to="/appointments/addAppointment"
                                    state={{
                                      courtfileId: linkedCourtfile?.id || cfDetails?.id || null,
                                      courtfileNumber: linkedCourtfile?.number || cfDetails?.case_number || null,
                                      courtfileTitle: linkedCourtfile?.title || null,
                                      prefill: { title: sug.title || "", details: sug.reasoning || "" },
                                      suggestion: sug,
                                      returnTo: `/documents/view/${documentData.id}`,
                                    }}
                                  >
                                    <i className="bi bi-clock me-2"></i> Appointment
                                  </Link>
                                </li>

                                {/* Crear Document (nota) desde sugerencia */}
                                <li>
                                  <Link
                                    className="dropdown-item"
                                    to="/documents/addDocument"
                                    state={{
                                      courtfileId: linkedCourtfile?.id || cfDetails?.id || null,
                                      courtfileNumber: linkedCourtfile?.number || cfDetails?.case_number || null,
                                      courtfileTitle: linkedCourtfile?.title || null,
                                      prefill: { title: sug.title || "", content: sug.reasoning || "" },
                                      suggestion: sug,
                                      returnTo: `/documents/view/${documentData.id}`,
                                    }}
                                  >
                                    <i className="bi bi-file-earmark-plus me-2"></i> Case record
                                  </Link>
                                </li>

                                {/* Archivar si la sugerencia viene persistida con id */}
                                {sug.id && (
                                  <>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                      <button
                                        className="dropdown-item text-danger"
                                        onClick={() => handleArchiveSuggestion(sug.id)}
                                      >
                                        <i className="bi bi-archive me-2"></i> Archivar
                                      </button>
                                    </li>
                                  </>
                                )}
                              </ul>
                            </div>
                          </div>

                          {sug.reasoning && (
                            <p className="mt-2 mb-2 text-body-secondary small">{sug.reasoning}</p>
                          )}
                          {Array.isArray(sug.next_steps) && sug.next_steps.length > 0 && (
                            <ul className="mb-2 small ps-3">
                              {sug.next_steps.map((step, i) => <li key={i}>{step}</li>)}
                            </ul>
                          )}
                          <small className="text-body-tertiary">
                            {sug.legal_basis ? `Fundamento: ${sug.legal_basis}` : ""}
                            {typeof sug.confidence === "number" ? ` • Conf.: ${(sug.confidence * 100).toFixed(0)}%` : ""}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );

};