import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";

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
  const [error, setError] = useState(null);

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
      // Preferimos descarga nativa cuando tenemos nombre original o extensión clara
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
      // Si falla, al menos abrir en pestaña nueva
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
        setError(null);
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Failed to load document data");
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [API, token, documentId]);

  // ---------- If we know the CF id but lack number/title, fetch the CF ----------
  useEffect(() => {
    const loadCourtfileBasics = async () => {
      try {
        if (!linkedCourtfile?.id) return;
        if (linkedCourtfile.number && linkedCourtfile.title) return;

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
      } catch {
        // noop
      }
    };
    loadCourtfileBasics();
  }, [API, token, linkedCourtfile?.id, linkedCourtfile?.number, linkedCourtfile?.title]);

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
      alert("Document deleted successfully!");
    } catch (err) {
      console.error(err);
      alert(`Error deleting document: ${err.message}`);
    }
  };

  // ---------- UI states ----------
  if (loading) {
    return (
      <AppNavsShell>
        <div className="container mt-4 text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading…</span></div>
          <p className="mt-2">Loading document…</p>
        </div>
      </AppNavsShell>
    );
  }

  if (error || !documentData) {
    return (
      <AppNavsShell>
        <div className="container mt-4">
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle"></i> {error || "Document not found"}
          </div>
          <Link to={returnTo} className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left"></i> Back
          </Link>
        </div>
      </AppNavsShell>
    );
  }

  // prefer created_at but keep backward compat with create_at
  const createdAt = documentData.created_at || documentData.create_at;

  return (
    <AppNavsShell>
      <div className="page-add col-8">

        {/* Topbar */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-3">
            <h1 className="h2 mb-2">Document details</h1>

            {linkedCourtfile && (
              <span className="badge bg-dark">
                {`Linked to Case ${linkedCourtfile.number || `#${linkedCourtfile.id}`}${linkedCourtfile.title ? ` — ${linkedCourtfile.title}` : ""
                  }`}
              </span>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>
        </div>

        {/* Card */}
        <div className="card shadow-sm card-roomy">
          <div className="card-body">
            {/* Título principal = NAME */}
            <h2 className="h1 mb-4">{documentData.name || "-"}</h2>

            {/* Grid 2x2 alineada */}
            <div className="row g-4">
              {/* Col izquierda */}
              <div className="col-12 col-lg-6">
                <div className="mb-3">
                  <span className="fw-semibold text-muted d-block mb-1">Download</span>
                  <button
                    onClick={() => handleDownload(documentData)}
                    className="btn btn-success btn-sm mt-1"
                    title={`Download ${documentData.name}`}
                  >
                    <i className="bi bi-download"></i>{" "}
                    {documentData.original_filename || documentData.name || "File"}
                  </button>
                </div>

                <div className="mb-0">
                  <span className="fw-semibold text-muted d-block mb-1">Created At</span>
                  <span className="fs-8">{safeDateTime(createdAt)}</span>
                </div>
              </div>

              {/* Col derecha */}
              <div className="col-12 col-lg-6">
                <div className="mb-3">
                  <span className="fw-semibold text-muted d-block mb-1">Category</span>
                  {documentData.category ? (
                    <span className="badge bg-secondary mt-1">{documentData.category}</span>
                  ) : (
                    <span className="fs-6">—</span>
                  )}
                </div>

                <div className="mb-0">
                  <span className="fw-semibold text-muted d-block mb-1">Document Date</span>
                  <span className="fs-8">{dateYMDToDMY(documentData.document_date)}</span>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="row mt-4">
              <div className="col-12">
                <span className="fw-semibold text-muted d-block mb-2">Description</span>
                <div className="border p-3 bg-light rounded">
                  {documentData.description ? (
                    <p className="mb-0">{documentData.description}</p>
                  ) : (
                    <p className="text-muted mb-0">No description provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card-footer bg-light d-flex justify-content-end gap-2">
            <Link to={`/documents/${documentData.id}`} state={{ returnTo }} className="btn btn-warning btn-sm">
              <i className="bi bi-pencil"></i> Edit
            </Link>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              <i className="bi bi-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );

};
