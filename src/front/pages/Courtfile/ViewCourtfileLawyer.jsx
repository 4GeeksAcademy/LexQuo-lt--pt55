import { Link, useParams, useNavigate, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useState, useEffect, useMemo } from "react";
import useUnreadBadges from "../../hooks/useUnreadBadges";
import { markNow } from "../../hooks/chatUnread";

export const ViewCourtfileLawyer = () => {
  const { store, dispatch } = useGlobalReducer();
  const { courtfileId } = useParams();
  const { auth, me } = store;
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store.auth.token;
  const role = (store.auth.role || "").toLowerCase();
  const currentLawyerId = auth?.user?.id;

  if (role !== "lawyer") return <Navigate to="/403" replace />;

  // ------------------- COURTFILE -------------------
  const [courtfile, setCourtfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [myRelationId, setMyRelationId] = useState(null);
  const [leaving, setLeaving] = useState(false);

  // ------------------- DEADLINES (YA FILTRADOS) -------------------
  const [caseDeadlines, setCaseDeadlines] = useState([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);
  const [deadlinesErr, setDeadlinesErr] = useState("");
  const [deletingDeadlineRelId, setDeletingDeadlineRelId] = useState(null);

  // ------------------- APPOINTMENTS (YA FILTRADOS) -------------------
  const [caseAppointments, setCaseAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsErr, setAppointmentsErr] = useState("");
  const [deletingApptRelId, setDeletingApptRelId] = useState(null);

  // ------------------- DOCUMENTS (YA FILTRADOS) -------------------
  const [caseDocuments, setCaseDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsErr, setDocumentsErr] = useState("");
  const [deletingDocRelId, setDeletingDocRelId] = useState(null);
  // ------------------- AI DOCUMENT ANALYSIS -------------------
  const [analyzingDocId, setAnalyzingDocId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  // ------------------- CLIENTS (YA FILTRADOS) -------------------
  const [caseClients, setCaseClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsErr, setClientsErr] = useState("");
  const [deletingClientRelId, setDeletingClientRelId] = useState(null);

  // ------------------- LAWYERS (NUEVO) -------------------
  const [caseLawyers, setCaseLawyers] = useState([]);
  const [loadingLawyers, setLoadingLawyers] = useState(false);
  const [lawyersErr, setLawyersErr] = useState("");
  const [deletingLawyerRelId, setDeletingLawyerRelId] = useState(null);

  // ------------------- PAYMENTS (YA FILTRADOS) -------------------
  const [casePayments, setCasePayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsErr, setPaymentsErr] = useState("");
  const [deletingPaymentRelId, setDeletingPaymentRelId] = useState(null);

  // ------------------- FETCHERS -------------------
  const fetchCourtfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/courtfiles/${courtfileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCourtfile(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching courtfile:", err);
      setError("Failed to load courtfile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeadlines = async () => {
    try {
      setLoadingDeadlines(true);
      setDeadlinesErr("");
      const resp = await fetch(
        `${API}/api/deadlines-courtfiles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const idNum = Number(courtfileId);
      const enriched = data.map(d => ({ relation_id: d.id, ...d }));
      const filtered = enriched.filter(d =>
        d.courtfile_id === idNum || d?.courtfile?.id === idNum
      );
      setCaseDeadlines(filtered);
    } catch (e) {
      setDeadlinesErr(e.message || "Error fetching deadlines");
    } finally {
      setLoadingDeadlines(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      setAppointmentsErr("");
      const resp = await fetch(
        `${API}/api/appointments-courtfiles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const idNum = Number(courtfileId);
      const enriched = data.map(a => ({ relation_id: a.id, ...a }));
      const filtered = enriched.filter(a =>
        a.courtfile_id === idNum || a?.courtfile?.id === idNum
      );
      setCaseAppointments(filtered);
    } catch (e) {
      setAppointmentsErr(e.message || "Error fetching appointments");
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoadingDocuments(true);
      setDocumentsErr("");
      const resp = await fetch(
        `${API}/api/courtfile-document?courtfile_id=${Number(courtfileId)}`,
        {
          headers:
            { Authorization: `Bearer ${token}` }
        }
      );
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();

      const normalized = data.map(r => ({
        relation_id: r.id,
        courtfile_id: r.courtfile_id,
        document_id: r.document_id,
        type: r.document_type,
        description: r.document_name,
        url_route: r.document_url,
        document_date: r.document_date,
        create_at: r.create_at
      }));
      setCaseDocuments(normalized);
    } catch (e) {
      setDocumentsErr(e.message || "Error fetching documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      setClientsErr("");
      const resp = await fetch(
        `${API}/api/clients-courtfiles?courtfile_id=${Number(courtfileId)}`,
        {
          headers:
            { Authorization: `Bearer ${token}` }
        }
      );
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const normalized = data.map(r => ({
        relation_id: r.id,
        courtfile_id: r.courtfile_id,
        client_id: r.client_id,
        client_name: r.client_name,
        client_email: r.client_email,
        client_phone: r.client_phone
      }));
      setCaseClients(normalized);
    } catch (e) {
      setClientsErr(e.message || "Error fetching clients");
    } finally {
      setLoadingClients(false);
    }
  };



  const fetchCaseLawyers = async () => {
    try {
      setLoadingLawyers(true);
      setLawyersErr("");
      const resp = await fetch(
        `${API}/api/lawyers-courtfiles?courtfile_id=${Number(courtfileId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);

      // ⬇️ excluye a la/el lawyer logueado
      const filtered = (Array.isArray(data) ? data : []).filter(
        (r) => r.lawyer_id !== currentLawyerId
      );

      setCaseLawyers(
        filtered.map(r => ({
          relation_id: r.id,
          lawyer_id: r.lawyer_id,
          lawyer_name: r.lawyer_name,
          lawyer_email: r.lawyer_email,
          lawyer_phone: r.lawyer_phone
        }))
      );
    } catch (e) {
      setLawyersErr(e.message || "Error fetching lawyers");
    } finally {
      setLoadingLawyers(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      setPaymentsErr("");
      const idNum = Number(courtfileId);

      const resp = await fetch(
        `${API}/api/payments-courtfile?courtfile_id=${idNum}&expand=payment`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }

      const rows = await resp.json(); // [{ id, payment: { ... } }]
      setCasePayments(rows.map(r => ({ relation_id: r.id, ...(r.payment || {}) })));
    } catch (e) {
      setPaymentsErr(e.message || "Error fetching payments");
    } finally {
      setLoadingPayments(false);
    }
  };

  // ===== AI SUGGESTIONS =====
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const fetchAISuggestions = async (desc, jur, crt) => {
    try {
      setAiLoading(true);
      setAiError("");
      const resp = await fetch(`${API}/api/ai/suggest-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          description: desc || "",
          jurisdiction: jur || "",
          court: crt || ""
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || `HTTP ${resp.status}`);
      }
      setAiSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
    } catch (e) {
      setAiError(e.message || "Error getting AI suggestions");
    } finally {
      setAiLoading(false);
    }
  };
  // ===== END AI SUGGESTIONS =====



  // ------------------- EFFECTS -------------------
  useEffect(() => {
    if (!courtfileId) return;
    fetchCourtfile();
  }, [courtfileId, token]);

  useEffect(() => {
    fetchDeadlines();
    fetchAppointments();
    fetchDocuments();
    fetchClients();
    fetchCaseLawyers();
    fetchPayments();
  }, [API,
    token, courtfileId]);

  useEffect(() => {
    const fetchMyRelation = async () => {
      try {
        const resp = await fetch(
          `${API}/api/lawyers-courtfiles?courtfile_id=${Number(courtfileId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resp.ok) {
          // no tires error al UI, puede no haber relación
          return;
        }
        const rows = await resp.json();
        // Si el endpoint ya filtra por el lawyer autenticado, tomá el primero.
        // Si no, filtramos nosotros por seguridad.
        const mine = (rows || []).find(r => String(r.lawyer_id) === String(currentLawyerId)) || rows?.[0];
        setMyRelationId(mine?.id ?? null);
      } catch {
        setMyRelationId(null);
      }
    };
    fetchMyRelation();
  }, [API, token, courtfileId, currentLawyerId]);

  // ------------------- HELPERS -------------------
  const getPriorityBadgeClass = (priority = "") => {
    switch (String(priority).toLowerCase()) {
      case "low": return "bg-secondary";
      case "medium": return "bg-info";
      case "high": return "bg-warning";
      case "urgent": return "bg-danger";
      default: return "bg-secondary";
    }
  };

  const parseDate = (d) => {
    const c = d.document_date || d.create_at;
    return c ? new Date(c) : new Date(0);
  };

  const handleLeaveCase = async () => {
    if (!myRelationId) {
      alert("No relation found for this lawyer and case.");
      return;
    }
    if (!window.confirm("Leave this case? You will be unlinked from this courtfile.")) return;
    try {
      setLeaving(true);
      const resp = await fetch(`${API}/api/lawyers-courtfiles/${myRelationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      alert("You have left this case.");
      navigate("/DashboardLawyer", { replace: true });
    } catch (err) {
      console.error("Error unlinking lawyer from courtfile:", err);
      alert(err.message || "Error unlinking relation");
    } finally {
      setLeaving(false);
    }
  };

  const handleDeleteDeadlineRelation = async (relationId) => {

    if (!window.confirm("Delete this link? The deadline will no longer be associated with this case.")) return;
    try {
      setDeletingDeadlineRelId(relationId);
      const resp = await fetch(`${API}/api/deadlines-courtfiles/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      await fetchDeadlines();
    } catch (err) {
      alert(err.message || "Error deleting relation");
    } finally {
      setDeletingDeadlineRelId(null);
    }
  };

  const handleDeleteAppointmentRelation = async (relationId) => {
    if (!window.confirm("Delete this link? The appointment will no longer be associated with this case.")) return;
    try {
      setDeletingApptRelId(relationId);
      const resp = await fetch(`${API}/api/appointments-courtfiles/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      await fetchAppointments();
    } catch (err) {
      alert(err.message || "Error deleting relation");
    } finally {
      setDeletingApptRelId(null);
    }
  };

  const handleDeleteDocumentRelation = async (relationId) => {
    if (!window.confirm("Unlink this document from the case?")) return;
    try {
      setDeletingDocRelId(relationId);
      const resp = await fetch(`${API}/api/courtfile-document/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      await fetchDocuments();
    } catch (err) {
      alert(err.message || "Error unlinking document");
    } finally {
      setDeletingDocRelId(null);
    }
  };

  const handleDeleteClientRelation = async (relationId) => {
    if (!window.confirm("Unlink this client from the case?")) return;
    try {
      setDeletingClientRelId(relationId);
      const resp = await fetch(`${API}/api/clients-courtfiles/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      await fetchClients();
    } catch (err) {
      alert(err.message || "Error unlinking client");
    } finally {
      setDeletingClientRelId(null);
    }
  };


  const handleDeleteLawyerRelation = async (relationId) => {
    if (!window.confirm("¿Salir de este caso?")) return;
    try {
      setDeletingLawyerRelId(relationId);
      const resp = await fetch(`${API}/api/lawyers-courtfiles/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
      await fetchCaseLawyers();
    } catch (err) {
      alert(err.message || "Error deleting relation");
    } finally {
      setDeletingLawyerRelId(null);
    }
  };

  const handleDeletePaymentRelation = async (relationId) => {
    if (!window.confirm("Unlink this payment from the case?")) return;
    try {
      setDeletingPaymentRelId(relationId);
      const resp = await fetch(`${API}/api/payments-courtfile/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      await fetchPayments();
    } catch (e) {
      alert(e.message || "Error unlinking payment");
    } finally {
      setDeletingPaymentRelId(null);
    }
  };

  // 🔔 UNREAD (solo este expediente)
  const caseIds = useMemo(() => [Number(courtfileId)], [courtfileId]);
  const { unreadByCase, totalUnread, refresh: refreshUnread } = useUnreadBadges({
    API,
    token,
    userId: me?.id,
    role,
    courtfileIds: caseIds,
  });
  // ---- marcar leído en backend  ----
  async function markReadBackend(API, auth, role, cfid) {
    const userId =
      auth?.user?.id ??
      auth?.lawyer?.id ??
      auth?.client?.id ??
      auth?.id ?? null;
    if (!API || !auth?.token || !userId || !cfid) return;

    try {
      await fetch(`${API}/api/messages/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          courtfile_id: cfid,
          role: String(role || "").toLowerCase(),
          user_id: userId,
        }),
      });
    } catch (_) { }
  }

  // ---- abrir chat: marca local + backend y navega con state ----
  const onOpenChatClick = async (e) => {
    e.preventDefault();
    const cfid = Number(courtfileId);
    const userId =
      me?.id ??
      auth?.user?.id ??
      auth?.lawyer?.id ??
      auth?.client?.id ??
      auth?.id ??
      null;

    if (!userId || !cfid) return;

    markNow(userId, cfid);
    await markReadBackend(API, auth, role, cfid);
    refreshUnread();

    navigate(`/chats/${cfid}`, {
      state: {
        courtfileId: cfid,
        courtfileNumber: courtfile.case_number,
        courtfileTitle: courtfile.title,
        senderRole: "lawyer",
        returnTo: `/courtfiles/ViewCourtfileLawyer/${cfid}`,
      },
    });
  }; // 👈 solo una llave de cierre y punto y coma



  // ------------------- Document AI -------------------
  const analyzeDocument = async (documentUrl, documentName, documentId) => {
    try {
      setAnalyzingDocId(documentId);
      setAnalysisError("");
      setAnalysisResult(null);

      const resp = await fetch(`${API}/api/ai/analyze-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          document_url: documentUrl,
          document_name: documentName,
          case_description: courtfile?.description || "",
          case_jurisdiction: courtfile?.jurisdiction || "",
          case_court: courtfile?.court || "",
          case_number: courtfile?.case_number || ""
        })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error || `HTTP ${resp.status}`);
      }

      setAnalysisResult({
        documentId,
        documentName,
        analysis: data.analysis
      });
    } catch (err) {
      setAnalysisError(err.message || "Error analyzing document");
      console.error("Analysis error:", err);
    } finally {
      setAnalyzingDocId(null);
    };
  };

  // ------------------- RENDER -------------------
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading courtfile...</p>
        </div>
      </div>
    );
  }

  if (error || !courtfile) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Courtfile not found"}
        </div>
        <Link to="/courtfiles" className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back to Courtfiles
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-10">
          {/* Header del expediente */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Courtfile Details PRIVADOS</h1>
              <p className="text-muted">Case #{courtfile.id}</p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/DashboardLawyer" className="btn btn-outline-secondary">
                <i className="bi bi-grid"></i> Dashboard
              </Link>
              <Link
                to="/lawyers/link-or-invite"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`
                }}
                className="btn btn-outline-primary"
              >
                <i className="bi bi-person-plus"></i> Add Lawyer
              </Link>
              <Link
                to={`/courtfiles/${courtfile.id}`}
                state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                className="btn btn-warning"
              >
                <i className="bi bi-pencil"></i> Edit
              </Link>
              <button className="btn btn-outline-danger" onClick={handleLeaveCase} disabled={!myRelationId || leaving}>
                {leaving ? "Leaving..." : "Leave case"}
              </button>
            </div>
          </div>

          <Link
            to={`/chats/${courtfile.id}`}
            state={{
              courtfileId: courtfile.id,
              courtfileNumber: courtfile.case_number,
              courtfileTitle: courtfile.title,
              senderRole: "lawyer",
              returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
            }}
            className="btn btn-sm btn-outline-primary me-1 position-relative"
            title="Open chat"
            onClick={(e) => onOpenChatClick(e, courtfile)} // le pasás el courtfile
          >
            <i className="bi bi-chat-dots"></i>
            {unreadByCase.get(courtfile.id)?.hasUnread && (
              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                <span className="visually-hidden">New</span>
              </span>
            )}
          </Link>

          {/* Card con detalles */}
          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-file-earmark-text"></i> Case Information
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                {/* Columna izquierda */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Case Number</label>
                    <p className="fs-5">{courtfile.case_number}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Title</label>
                    <p className="fs-6">{courtfile.title}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Jurisdiction</label>
                    <p>
                      <span className="badge bg-secondary">{courtfile.jurisdiction}</span>
                    </p>
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Court</label>
                    <p>{courtfile.court}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Status</label>
                    <p>
                      <span className={`badge ${courtfile.status ? "bg-success" : "bg-danger"}`}>
                        {courtfile.status ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Created Date</label>
                    <p>{courtfile.created_at ? new Date(courtfile.created_at).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Description</label>
                    <div className="card bg-light">
                      <div className="card-body">
                        <p className="card-text">{courtfile.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === AI SUGGESTIONS === */}
          <div className="mt-4">
            <div className="card border-primary">
              <div className="card-header bg-primary text-white d-flex align-items-center justify-content-between">
                <h5 className="mb-0">
                  <i className="bi bi-stars me-2"></i>
                  AI Suggestions (beta)
                </h5>
                <button
                  className="btn btn-sm btn-light"
                  onClick={() =>
                    fetchAISuggestions(
                      courtfile?.description,
                      courtfile?.jurisdiction,
                      courtfile?.court
                    )
                  }
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                  ) : (
                    "Generar sugerencias"
                  )}
                </button>
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => fetchAISuggestions(courtfile.description, courtfile.jurisdiction, courtfile.court)}
                  disabled={aiLoading}
                  title="Refrescar sugerencias"
                >
                  {aiLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-arrow-clockwise"></i>
                  )}
                </button>
              </div>

              <div className="card-body">
                {aiError && <div className="alert alert-danger">{aiError}</div>}

                {!aiError && aiLoading && (
                  <div className="text-muted">
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Analizando descripción y jurisdicción…
                  </div>
                )}

                {!aiLoading && !aiError && (!aiSuggestions || aiSuggestions.length === 0) && (
                  <div className="alert alert-info">Sin sugerencias por ahora.</div>
                )}

                {!aiLoading && !aiError && aiSuggestions.length > 0 && (
                  <div className="list-group">
                    {aiSuggestions.map((sug, idx) => (
                      <div key={idx} className="list-group-item">
                        <div className="d-flex justify-content-between">
                          <h6 className="mb-1">{sug.title || "Sugerencia"}</h6>
                          <span className={`badge ${(sug.urgency || "").toLowerCase() === "urgent" ? "bg-danger" :
                            (sug.urgency || "").toLowerCase() === "high" ? "bg-warning" :
                              (sug.urgency || "").toLowerCase() === "medium" ? "bg-info" : "bg-secondary"
                            }`}>
                            {String(sug.urgency || "medium").toUpperCase()}
                          </span>
                        </div>

                        {sug.reasoning && <p className="mt-1 mb-2 text-muted">{sug.reasoning}</p>}

                        {Array.isArray(sug.next_steps) && sug.next_steps.length > 0 && (
                          <ul className="mb-2">
                            {sug.next_steps.map((step, i) => <li key={i}>{step}</li>)}
                          </ul>
                        )}

                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            {sug.legal_basis ? `Fundamento: ${sug.legal_basis}` : ""}
                            {typeof sug.confidence === "number" ? ` • Conf.: ${(sug.confidence * 100).toFixed(0)}%` : ""}
                          </small>


                          <div className="btn-group">
                            <Link
                              to="/deadlines/addDeadline"
                              state={{
                                courtfileId: courtfile.id,
                                courtfileNumber: courtfile.case_number,
                                courtfileTitle: courtfile.title,
                                prefill: { type: "Other", description: sug.title || "" },
                                returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`
                              }}
                              className="btn btn-sm btn-outline-primary"
                              title="Crear Deadline desde esta sugerencia"
                            >
                              <i className="bi bi-calendar2-plus"></i> Deadline
                            </Link>


                            <Link
                              to="/appointments/addAppointment"
                              state={{
                                courtfileId: courtfile.id,
                                courtfileNumber: courtfile.case_number,
                                courtfileTitle: courtfile.title,
                                prefill: { title: sug.title || "" },
                                returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`
                              }}
                              className="btn btn-sm btn-outline-secondary"
                              title="Crear Appointment desde esta sugerencia"
                            >
                              <i className="bi bi-clock"></i> Appt
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>


          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">DOCUMENTS</h3>
              <Link
                to="/documents/addDocument"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`
                }}
                className="btn btn-sm btn-success"
              >
                + Add Document
              </Link>
            </div>

            {loadingDocuments && <p className="mt-3">Loading documents...</p>}
            {documentsErr && <div className="alert alert-danger mt-3">{documentsErr}</div>}
            {!loadingDocuments && !documentsErr && caseDocuments.length === 0 && (
              <div className="alert alert-info mt-3">No documents linked yet.</div>
            )}

            {!loadingDocuments && caseDocuments.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ width: "120px" }}>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>File</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...caseDocuments]
                      .sort((a, b) => parseDate(b) - parseDate(a))
                      .map(doc => (
                        <tr key={doc.relation_id}>
                          <td>{parseDate(doc).toLocaleDateString()}</td>
                          <td>{doc.type || doc.document_type || "—"}</td>
                          <td>{doc.description || doc.document_description || doc.name}</td>
                          <td>
                            {(doc.url_route || doc.document_url) ? (
                              <a href={doc.url_route || doc.document_url}
                                target="_blank" rel="noreferrer">Open</a>
                            ) : "—"}
                          </td>

                          <td className="text-end">
                            {(doc.type === 'pdf' || doc.document_type === 'pdf') && (
                              <button
                                className="btn btn-sm btn-outline-primary me-1"
                                onClick={() => analyzeDocument(
                                  doc.url_route || doc.document_url,
                                  doc.description || doc.document_name,
                                  doc.document_id
                                )}
                                disabled={analyzingDocId === doc.document_id}
                                title="Analyze with IA"
                              >
                                {analyzingDocId === doc.document_id ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                  <i className="bi bi-robot"></i>
                                )} Analyze
                              </button>
                            )}
                            <Link
                              to={`/documents/view/${doc.document_id || doc.document?.id || doc.id}`}
                              state={{
                                returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                                courtfileId: courtfile.id,
                                courtfileNumber: courtfile.case_number,
                                courtfileTitle: courtfile.title
                              }}
                              className="btn btn-sm btn-info me-1"
                              title="View"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                            <Link
                              to={`/documents/${doc.document_id || doc.document?.id || doc.id}`}
                              state={{
                                returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                                courtfileId: courtfile.id,
                                courtfileNumber: courtfile.case_number,
                                courtfileTitle: courtfile.title
                              }}
                              className="btn btn-sm btn-warning me-1"
                            >
                              <i className="bi bi-pencil"></i>
                            </Link>
                            <button
                              className="btn btn-sm btn-danger"
                              title={doc.relation_id ? "Unlink" : "No link available"}
                              disabled={!doc.relation_id || deletingDocRelId === doc.relation_id}
                              onClick={() => handleDeleteDocumentRelation(doc.relation_id)}
                            >
                              {deletingDocRelId === doc.relation_id ? (
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                              ) : (
                                <i className="bi bi-trash"></i>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {analysisResult && (
                  <div className="mt-4">
                    <div className="card border-success">
                      <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">
                          <i className="bi bi-robot me-2"></i>
                          Análisis del documento: {analysisResult.documentName}
                        </h6>
                        <button
                          className="btn btn-sm btn-light"
                          onClick={() => setAnalysisResult(null)}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                      <div className="card-body">
                        <div className="list-group">
                          {Array.isArray(analysisResult.analysis) ? (
                            analysisResult.analysis.map((item, index) => (
                              <div key={index} className="list-group-item">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div className="flex-grow-1">
                                    <h6 className="mb-1">{item.title || `Punto ${index + 1}`}</h6>
                                    <p className="mb-1">{item.content}</p>
                                    {item.actions && (
                                      <small className="text-muted">
                                        <strong>Acciones sugeridas:</strong> {item.actions}
                                      </small>
                                    )}
                                  </div>
                                  {item.urgency && (
                                    <span className={`badge ms-2 ${item.urgency === 'urgent' ? 'bg-danger' :
                                      item.urgency === 'high' ? 'bg-warning' :
                                        item.urgency === 'medium' ? 'bg-info' : 'bg-secondary'
                                      }`}>
                                      {item.urgency.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="alert alert-info">
                              El análisis se está procesando...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {analysisError && (
                  <div className="alert alert-danger mt-3">
                    <i className="bi bi-exclamation-triangle"></i> Error en el análisis: {analysisError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LAWYERS */}
          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">LAWYERS</h3>
            </div>

            {loadingLawyers && <p className="mt-3">Loading lawyers...</p>}
            {lawyersErr && <div className="alert alert-danger mt-3">{lawyersErr}</div>}
            {!loadingLawyers && !lawyersErr && caseLawyers.length === 0 && (
              <div className="alert alert-info mt-3">No lawyers linked yet. Add one!</div>
            )}

            {!loadingLawyers && caseLawyers.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Lawyer ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseLawyers.map(lw => (
                      <tr key={lw.relation_id}>
                        <td>{lw.lawyer_id}</td>
                        <td>{lw.lawyer_name || "—"}</td>
                        <td>{lw.lawyer_email || "—"}</td>
                        <td>{lw.lawyer_phone || "—"}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-danger"
                            title={lw.relation_id ? "Unlink (leave case)" : "No link available"}
                            disabled={
                              !lw.relation_id ||
                              deletingLawyerRelId === lw.relation_id ||
                              lw.lawyer_id !== currentLawyerId
                            }
                            onClick={() => handleDeleteLawyerRelation(lw.relation_id)}
                          >
                            {deletingLawyerRelId === lw.relation_id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="bi bi-trash"></i>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DEADLINES */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">DEADLINES</h3>
              {/* Botón de agregar en el título */}
              <Link
                to="/deadlines/addDeadline"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`
                }}
                className="btn btn-sm btn-success"
              >
                + New Deadline
              </Link>
            </div>

            {loadingDeadlines && <p className="mt-3">Loading deadlines...</p>}
            {deadlinesErr && <div className="alert alert-danger mt-3">{deadlinesErr}</div>}
            {!loadingDeadlines && !deadlinesErr && caseDeadlines.length === 0 && (
              <div className="alert alert-info mt-3">No deadlines linked yet. Please add one!</div>
            )}

            {!loadingDeadlines && caseDeadlines.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Deadline ID</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Hour</th>
                      <th>Priority</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseDeadlines.map(dl => (
                      <tr key={dl.relation_id}>
                        <td>{dl.deadline_id}</td>
                        <td>{dl.deadline_type}</td>
                        <td>{dl.deadline_date}</td>
                        <td>{dl.deadline_hour}</td>
                        <td>
                          <span className={`badge ${getPriorityBadgeClass(dl.priority)}`}>
                            {String(dl.priority).charAt(0).toUpperCase() + String(dl.priority).slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="text-end">
                          <Link
                            to={`/deadlines/view/${dl.deadline_id}`}
                            state={{
                              returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                              courtfileId: courtfile.id,
                              courtfileNumber: courtfile.case_number,
                              courtfileTitle: courtfile.title
                            }}
                            className="btn btn-sm btn-info me-1"
                            title="View"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>

                          <Link
                            to={`/deadlines/${dl.deadline_id}`}
                            state={{
                              returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                              courtfileId: courtfile.id,
                              courtfileNumber: courtfile.case_number,
                              courtfileTitle: courtfile.title
                            }}
                            className="btn btn-sm btn-warning me-1"
                            title="Edit"
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-danger"
                            title={dl.relation_id ? "Unlink" : "No link available"}
                            disabled={!dl.relation_id || deletingDeadlineRelId === dl.relation_id}
                            onClick={() => handleDeleteDeadlineRelation(dl.relation_id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* APPOINTMENTS */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">APPOINTMENTS</h3>
              {/* Botón de agregar en el título */}
              <Link
                to="/appointments/addAppointment"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`
                }}
                className="btn btn-sm btn-success"
              >
                + New Appointment
              </Link>
            </div>

            {loadingAppointments && <p className="mt-3">Loading appointments...</p>}
            {appointmentsErr && <div className="alert alert-danger mt-3">{appointmentsErr}</div>}
            {!loadingAppointments && !appointmentsErr && caseAppointments.length === 0 && (
              <div className="alert alert-info mt-3">No appointments linked yet. Please add one!</div>
            )}

            {!loadingAppointments && caseAppointments.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Appointment ID</th>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Starts</th>
                      <th>Ends</th>
                      <th>Location</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseAppointments.map(ap => (
                      <tr key={ap.relation_id}>
                        <td>{ap.appointment_id}</td>
                        <td>{ap.appointment_title}</td>
                        <td>{ap.appointment_date}</td>
                        <td>{ap.starts_at}</td>
                        <td>{ap.ends_at}</td>
                        <td>{ap.appointment_location}</td>
                        <td className="text-end">
                          <Link
                            to={`/appointments/view/${ap.appointment_id}`}
                            state={{
                              returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                              courtfileId: courtfile.id,
                              courtfileNumber: courtfile.case_number,
                              courtfileTitle: courtfile.title
                            }}
                            className="btn btn-sm btn-info me-1"
                            title="View"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link
                            to={`/appointments/${ap.appointment_id}`}
                            state={{
                              returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                              courtfileId: courtfile.id,
                              courtfileNumber: courtfile.case_number,
                              courtfileTitle: courtfile.title
                            }}
                            className="btn btn-sm btn-warning me-1"
                            title="Edit"
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-danger"
                            title={ap.relation_id ? "Unlink" : "No link available"}
                            disabled={!ap.relation_id || deletingApptRelId === ap.relation_id}
                            onClick={() => handleDeleteAppointmentRelation(ap.relation_id)}
                          >
                            {deletingApptRelId === ap.relation_id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="bi bi-trash"></i>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============ CLIENTS ============ */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">CLIENTS</h3>
              <Link
                to="/clients/link-or-create" // o a tu ruta de alta si no tenés este flow
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`
                }}
                className="btn btn-sm btn-success"
              >
                + New Client
              </Link>
            </div>

            {loadingClients && <p className="mt-3">Loading clients...</p>}
            {clientsErr && <div className="alert alert-danger mt-3">{clientsErr}</div>}
            {!loadingClients && !clientsErr && caseClients.length === 0 && (
              <div className="alert alert-info mt-3">No clients linked yet. Please add one!</div>
            )}

            {!loadingClients && caseClients.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Client ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseClients.map(cl => (
                      <tr key={cl.relation_id}>
                        <td>{cl.client_id}</td>
                        <td>{cl.client_name || "—"}</td>
                        <td>{cl.client_email || "—"}</td>
                        <td>{cl.client_phone || "—"}</td>
                        <td className="text-end">
                          <Link
                            to={`/clients/view/${cl.client_id}`}
                            state={{
                              returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                              courtfileId: courtfile.id,
                              courtfileNumber: courtfile.case_number,
                              courtfileTitle: courtfile.title
                            }}
                            className="btn btn-sm btn-info me-1"
                            title="View"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-danger"
                            title={cl.relation_id ? "Unlink" : "No link available"}
                            disabled={!cl.relation_id || deletingClientRelId === cl.relation_id}
                            onClick={() => handleDeleteClientRelation(cl.relation_id)}
                          >
                            {deletingClientRelId === cl.relation_id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="bi bi-trash"></i>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============ PAYMENTS ============ */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">PAYMENTS</h3>
              <Link
                to="/payments/addPayment"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`
                }}
                className="btn btn-sm btn-success"
              >
                + New Payment
              </Link>
            </div>

            {loadingPayments && <p className="mt-3">Loading payments...</p>}
            {paymentsErr && <div className="alert alert-danger mt-3">{paymentsErr}</div>}
            {!loadingPayments && !paymentsErr && casePayments.length === 0 && (
              <div className="alert alert-info mt-3">No payments linked yet. Please add one!</div>
            )}

            {!loadingPayments && casePayments.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ width: "90px" }}>ID</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Status</th>
                      <th>Means</th>
                      <th>Paid At</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casePayments.map(p => (
                      <tr key={`${p.id}-${p.relation_id}`}>
                        <td>#{p.id}</td>
                        <td>{p.amount}</td>
                        <td>{p.currency}</td>
                        <td>
                          <span className={`badge ${p.status === "approved" ? "bg-success"
                            : p.status === "pending" ? "bg-warning"
                              : "bg-danger"
                            }`}>
                            {p.status || "—"}
                          </span>
                        </td>
                        <td>{p.means || "—"}</td>
                        <td>{p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</td>
                        <td className="text-end">
                          <Link
                            to={`/payments/view/${p.id}`}
                            state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                            className="btn btn-sm btn-info me-1"
                            title="View"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>

                          <Link
                            to={p.status === "approved" ? "#" : `/payments/${p.id}`}
                            state={p.status === "approved" ? undefined : { returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                            className={`btn btn-sm btn-warning me-1 ${p.status === "approved" ? "disabled" : ""}`}
                            aria-disabled={p.status === "approved"}
                            title={p.status === "approved" ? "Approved payments are read-only" : "Edit"}
                            onClick={(e) => { if (p.status === "approved") e.preventDefault(); }}
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>

                          <button
                            className="btn btn-sm btn-danger"
                            title={p.status === "approved" ? "Cannot unlink an approved payment" : (p.relation_id ? "Unlink" : "No link available")}
                            disabled={p.status === "approved" || !p.relation_id || deletingPaymentRelId === p.relation_id}
                            onClick={() => handleDeletePaymentRelation(p.relation_id)}
                          >
                            {deletingPaymentRelId === p.relation_id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="bi bi-trash"></i>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};