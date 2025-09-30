import { Link, useParams, useNavigate, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useState, useEffect, useMemo } from "react";
import useUnreadBadges from "../../hooks/useUnreadBadges";
import { markNow } from "../../hooks/chatUnread";
import AppNavsShell from "../../components/AppNavsShell";
import DeadlineBadge from "../../components/DeadlineBadge";
import PaymentBadge from "../../components/PaymentBadge";

function KebabMenu({ children }) {
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div className="dropdown dropup position-static text-center" onClick={stop}>
      <button
        className="btn btn-link text-secondary p-0 me-2"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        aria-label="Row actions"
        onMouseDown={stop}
      >
        <i className="bi bi-three-dots icon-btn" />
      </button>
      <ul className="dropdown-menu dropdown-menu-end" onMouseDown={stop}>
        {children}
      </ul>
    </div>
  );
}


export const ViewCourtfileLawyer = () => {
  const { store, dispatch } = useGlobalReducer();
  const { courtfileId } = useParams();
  const { auth, me } = store;
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store.auth.token;
  const role = (store.auth.role || "").toLowerCase();
  // ID del abogado logueado (normalizado a Number)
  const currentLawyerId = useMemo(() => {
    const raw = store?.me?.id ?? null;
    return raw != null ? Number(raw) : null;
  }, [store?.me?.id]);

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
          headers: { Authorization: `Bearer ${token}` }
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

        name: r.document_name || r.original_filename || "-",
        url_route: r.document_url,

        document_date: r.document_date,
        created_at: r.created_at,

        // mostrar en columna "File type"
        type: r.mime_type || r.document_type || null,

        // mostrar en columna "Category" (legal/taxonómica)
        category: r.category || null,

        original_filename: r.original_filename || null,
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
        (r) => Number(r.lawyer_id) !== currentLawyerId
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

  const loadSavedSuggestions = async () => {
    try {
      const resp = await fetch(`${API}/api/ai/suggestions?courtfile_id=${courtfile.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (resp.ok) {
        const saved = await resp.json();
        // mezclá: primero las guardadas, luego las de cache si querés
        if (Array.isArray(saved) && saved.length > 0) {
          setAiSuggestions(saved);
          dispatch({ type: "SET_AI_SUGGESTIONS_CACHE", payload: { courtfileId: courtfile.id, suggestions: saved } });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generar nuevas sugerencias y reemplazar en DB
  const handleGenerateSuggestions = async () => {
    try {
      setAiLoading(true);
      setAiError("");
      const resp = await fetch(`${API}/api/ai/suggest-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: courtfile?.description,
          jurisdiction: courtfile?.jurisdiction,
          court: courtfile?.court,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

      // ahora persistimos en backend reemplazando
      const saveResp = await fetch(`${API}/api/ai/suggestions/replace`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courtfile_id: courtfile.id,
          suggestions: data.suggestions,
          source_description: courtfile?.description,
          source_jurisdiction: courtfile?.jurisdiction,
          source_court: courtfile?.court,
        }),
      });

      const saveData = await saveResp.json();
      if (!saveResp.ok) throw new Error(saveData?.error || `HTTP ${saveResp.status}`);

      await loadSavedSuggestions(); // refrescar lista en UI
    } catch (e) {
      setAiError(e.message || "Error generando sugerencias");
    } finally {
      setAiLoading(false);
    }
  };

  // Archivar una sugerencia
  const handleArchiveSuggestion = async (sugId) => {
    try {
      const r = await fetch(`${API}/api/ai/suggestions/${sugId}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("No se pudo archivar");
      await loadSavedSuggestions();
    } catch (e) {
      setAiError(e.message);
    }
  };

  useEffect(() => {
    if (courtfile?.id && token) loadSavedSuggestions();
  }, [courtfile?.id, token]);
  // ===== END AI SUGGESTIONS =====



  // ------------------- EFFECTS -------------------
  useEffect(() => {
    if (!courtfileId) return;
    fetchCourtfile();
  }, [courtfileId, token]);

  useEffect(() => {
    if (!courtfileId || !token || currentLawyerId == null) return;
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
    <AppNavsShell>
      <div className="container-fluid">
        {/* ===== Breadcrumbs + Titlebar ===== */}
        {/* ===== Breadcrumbs ===== */}
        <div className="d-flex align-items-center gap-2 text-muted small mb-2">
          <span className="opacity-50">›</span>
          <Link to="/courtfiles" className="text-decoration-none text-muted">
            Courtfile view
          </Link>
          <span className="opacity-50">›</span>
          <span>Courtfile details</span>
        </div>

        {/* ===== Title + Actions ===== */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          {/* Título */}
          <h2 className="mb-0 fw-bold">Courtfile details</h2>

          {/* Botones */}
          <div className="d-flex gap-2">
            <button
              className="px-3 text-body text-decoration-none btn btn-link"
              onClick={(e) => onOpenChatClick(e)}
              title="Open chat"
            >
              <i className="bi bi-chat-dots me-1" />
              Chat
            </button>

            <Link
              to="/lawyers/link-or-invite"
              state={{
                courtfileId: courtfile.id,
                courtfileNumber: courtfile.case_number,
                courtfileTitle: courtfile.title,
                returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
              }}
              className="px-3 text-body text-decoration-none btn btn-link"
            >
              <i className="bi bi-person-plus me-1" />
              Add lawyer
            </Link>

            <Link
              to={`/courtfiles/${courtfile.id}`}
              state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
              className="px-3 text-body text-decoration-none btn btn-link"
            >
              <i className="bi bi-pencil me-1" />
              Edit
            </Link>

            <button
              className="btn btn-phoenix-danger"
              onClick={handleLeaveCase}
              disabled={!myRelationId || leaving}
            >
              {leaving ? "Leaving…" : "Leave case"}
            </button>
          </div>
        </div>


        {/* ===== Layout: main + aside ===== */}
        <div className="row g-4">
          {/* MAIN */}
          <div className="col-xl-7 col-xxl-8">
            {/* Card: Case info */}
            <div className="card">
              <div className="card-body">
                {/* Case Number arriba */}
                <div className="mb-4">
                  <div className="text-uppercase text-muted fw-bold small section-title">
                    Case Number
                  </div>
                  <div className="fs-5">{courtfile.case_number || "—"}</div>
                </div>

                {/* Grid 2 columnas */}
                <div className="row">
                  {/* Columna izquierda */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="text-uppercase text-muted fw-bold small section-title">
                        Title
                      </div>
                      <div>{courtfile.title || "—"}</div>
                    </div>
                    <div className="mb-0">
                      <div className="text-uppercase text-muted fw-bold small section-title">
                        Jurisdiction
                      </div>
                      <span className="badge-phoenix badge badge-phoenix-secondary">
                        {courtfile.jurisdiction || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Columna derecha */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="text-uppercase text-muted fw-bold small section-title">
                        Status
                      </div>
                      <span
                        className={`fs-10 badge-phoenix badge ${courtfile.status
                          ? "badge-phoenix-success"
                          : "badge-phoenix-secondary"
                          }`}
                      >
                        {courtfile.status ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mb-0">
                      <div className="text-uppercase text-muted fw-bold small section-title">
                        Court
                      </div>
                      <div>{courtfile.court || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Description ocupando todo */}
                <div className="mt-4">
                  <div className="text-uppercase text-muted fw-bold small section-title mb-2">
                    Description
                  </div>
                  <div className="p-3 rounded bg-light">
                    {courtfile.description || "—"}
                  </div>
                </div>
              </div>
            </div>


            {/* ===== Documents ===== */}
            <div className="d-flex align-items-center justify-content-between mt-4">
              <h2 className="h5 text-uppercase text-muted mb-0 fw-bold">Documents</h2>
              <Link
                to="/documents/addDocument"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                }}
                className="btn btn-phoenix-primary ms-2"
              >
                + Add document
              </Link>
            </div>

            {loadingDocuments && <p className="mt-2">Loading documents…</p>}
            {documentsErr && (
              <div className="alert alert-danger mt-2">{documentsErr}</div>
            )}
            {!loadingDocuments && !documentsErr && caseDocuments.length === 0 && (
              <div className="alert alert-info mt-2">No documents yet.</div>
            )}

            {!loadingDocuments && caseDocuments.length > 0 && (
              <div className="table-responsive mt-2">
                <table className="table table-hover align-middle table-modern">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 120 }}>Date</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>File</th>
                      <th style={{ width: 48 }} className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...caseDocuments]
                      .sort((a, b) => parseDate(b) - parseDate(a))
                      .map((doc) => (
                        <tr key={doc.relation_id}>
                          <td>{parseDate(doc).toLocaleDateString()}</td>
                          <td>{doc.name || doc.document_name || "—"}</td>
                          <td>{doc.category || doc.document_type || "—"}</td>
                          <td>
                            {doc.url_route || doc.document_url ? (
                              <a
                                href={doc.url_route || doc.document_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="text-center">
                            <KebabMenu>
                              <li>
                                <Link
                                  className="dropdown-item"
                                  to={`/documents/view/${doc.document_id || doc.id}`}
                                  state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                                >
                                  <i className="bi bi-eye me-2" /> View
                                </Link>
                              </li>
                              <li>
                                <Link
                                  className="dropdown-item"
                                  to={`/documents/${doc.document_id || doc.id}`}
                                  state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                                >
                                  <i className="bi bi-pencil me-2" /> Edit
                                </Link>
                              </li>
                              <li><hr className="dropdown-divider" /></li>
                              <li>
                                <button
                                  className="dropdown-item text-danger"
                                  disabled={!doc.relation_id || deletingDocRelId === doc.relation_id}
                                  onClick={() => handleDeleteDocumentRelation(doc.relation_id)}
                                >
                                  {deletingDocRelId === doc.relation_id ? (
                                    <span className="spinner-border spinner-border-sm me-2" />
                                  ) : (
                                    <i className="bi bi-trash me-2" />
                                  )}
                                  Unlink
                                </button>
                              </li>
                            </KebabMenu>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}


            {/* ===== Deadlines ===== */}
            <div className="d-flex align-items-center justify-content-between mt-4">
              <h2 className="h5 text-uppercase text-muted mb-0 fw-bold">Deadlines</h2>
              <Link
                to="/deadlines/addDeadline"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                }}
                className="btn btn-phoenix-primary ms-2"
              >
                + New deadline
              </Link>
            </div>

            {loadingDeadlines && <p className="mt-2">Loading deadlines…</p>}
            {deadlinesErr && (
              <div className="alert alert-danger mt-2">{deadlinesErr}</div>
            )}
            {!loadingDeadlines && !deadlinesErr && caseDeadlines.length === 0 && (
              <div className="alert alert-info mt-2">No deadlines yet.</div>
            )}
            {!loadingDeadlines && caseDeadlines.length > 0 && (
              <div className="table-responsive mt-2">
                <table className="table table-hover align-middle table-modern">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "20px" }}>ID</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Hour</th>
                      <th>Priority</th>
                      <th style={{ width: 48 }} className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseDeadlines.map((dl) => (
                      <tr key={dl.relation_id}>
                        <td className="text-start ps-2">{dl.deadline_id}</td>
                        <td>{dl.deadline_type}</td>
                        <td>{dl.deadline_date}</td>
                        <td>{dl.deadline_hour}</td>
                        <td>
                          <DeadlineBadge priority={dl.priority} outline />
                        </td>
                        <td className="text-center">
                          <KebabMenu>
                            <li>
                              <Link
                                className="dropdown-item"
                                to={`/deadlines/view/${dl.deadline_id}`}
                                state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                              >
                                <i className="bi bi-eye me-2" /> View
                              </Link>
                            </li>
                            <li>
                              <Link
                                className="dropdown-item"
                                to={`/deadlines/${dl.deadline_id}`}
                                state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                              >
                                <i className="bi bi-pencil me-2" /> Edit
                              </Link>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                disabled={!dl.relation_id || deletingDeadlineRelId === dl.relation_id}
                                onClick={() => handleDeleteDeadlineRelation(dl.relation_id)}
                              >
                                {deletingDeadlineRelId === dl.relation_id ? (
                                  <span className="spinner-border spinner-border-sm me-2" />
                                ) : (
                                  <i className="bi bi-trash me-2" />
                                )}
                                Unlink
                              </button>
                            </li>
                          </KebabMenu>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ===== Appointments ===== */}
            <div className="d-flex align-items-center justify-content-between mt-4">
              <h2 className="h5 text-uppercase text-muted mb-0 fw-bold">Appointments</h2>
              <Link
                to="/appointments/addAppointment"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                }}
                className="btn btn-phoenix-primary ms-2"
              >
                + New appointment
              </Link>
            </div>

            {loadingAppointments && <p className="mt-2">Loading appointments…</p>}
            {appointmentsErr && (
              <div className="alert alert-danger mt-2">{appointmentsErr}</div>
            )}
            {!loadingAppointments && !appointmentsErr && caseAppointments.length === 0 && (
              <div className="alert alert-info mt-2">No appointments yet.</div>
            )}
            {!loadingAppointments && caseAppointments.length > 0 && (
              <div className="table-responsive mt-2">
                <table className="table table-hover align-middle table-modern">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "20px" }}>ID</th>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Starts</th>
                      <th>Ends</th>
                      <th>Location</th>
                      <th style={{ width: 48 }} className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseAppointments.map((ap) => (
                      <tr key={ap.relation_id}>
                        <td className="text-start ps-2">{ap.appointment_id}</td>
                        <td>{ap.appointment_title}</td>
                        <td>{ap.appointment_date}</td>
                        <td>{ap.starts_at}</td>
                        <td>{ap.ends_at}</td>
                        <td>{ap.appointment_location}</td>
                        <td className="text-center">
                          <KebabMenu>
                            <li>
                              <Link
                                className="dropdown-item"
                                to={`/appointments/view/${ap.appointment_id}`}
                                state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                              >
                                <i className="bi bi-eye me-2" /> View
                              </Link>
                            </li>
                            <li>
                              <Link
                                className="dropdown-item"
                                to={`/appointments/${ap.appointment_id}`}
                                state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                              >
                                <i className="bi bi-pencil me-2" /> Edit
                              </Link>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                disabled={!ap.relation_id || deletingApptRelId === ap.relation_id}
                                onClick={() => handleDeleteAppointmentRelation(ap.relation_id)}
                              >
                                {deletingApptRelId === ap.relation_id ? (
                                  <span className="spinner-border spinner-border-sm me-2" />
                                ) : (
                                  <i className="bi bi-trash me-2" />
                                )}
                                Unlink
                              </button>
                            </li>
                          </KebabMenu>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ===== Lawyers ===== */}
            <div className="d-flex align-items-center justify-content-between mt-4">
              <h2 className="h5 text-uppercase text-muted mb-0 fw-bold">Lawyers</h2>
              <Link
                to="/lawyers/link-or-invite"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                }}
                className="btn btn-phoenix-primary ms-2"
              >
                + New lawyer
              </Link>
            </div>
            {loadingLawyers && <p className="mt-2">Loading lawyers…</p>}
            {lawyersErr && <div className="alert alert-danger mt-2">{lawyersErr}</div>}
            {!loadingLawyers && !lawyersErr && caseLawyers.length === 0 && (
              <div className="alert alert-info mt-2">No lawyers linked.</div>
            )}
            {!loadingLawyers && caseLawyers.length > 0 && (
              <div className="table-responsive mt-2">
                <table className="table table-hover align-middle table-modern">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "20px" }}>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th style={{ width: 48 }} className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseLawyers.map((lw) => (
                      <tr key={lw.relation_id}>
                        <td className="text-start ps-2">{lw.lawyer_id}</td>
                        <td>{lw.lawyer_name || "—"}</td>
                        <td>{lw.lawyer_email || "—"}</td>
                        <td>{lw.lawyer_phone || "—"}</td>
                        <td className="text-center">
                          <KebabMenu>
                            <li>
                              <Link
                                className="dropdown-item"
                                to={`/lawyers/view/${lw.lawyer_id}`}
                                state={{
                                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                                }}
                              >
                                <i className="bi bi-eye me-2" />
                                View
                              </Link>
                            </li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                disabled={
                                  !lw.relation_id ||
                                  deletingLawyerRelId === lw.relation_id ||
                                  lw.lawyer_id !== currentLawyerId
                                }
                                onClick={() => handleDeleteLawyerRelation(lw.relation_id)}
                              >
                                {deletingLawyerRelId === lw.relation_id ? (
                                  <span className="spinner-border spinner-border-sm me-2" />
                                ) : (
                                  <i className="bi bi-trash me-2" />
                                )}
                                Unlink
                              </button>
                            </li>
                          </KebabMenu>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ===== Clients ===== */}
            <div className="d-flex align-items-center justify-content-between mt-4">
              <h2 className="h5 text-uppercase text-muted mb-0 fw-bold">Clients</h2>
              <Link
                to="/clients/link-or-create"
                state={{
                  courtfileId: courtfile.id,
                  courtfileNumber: courtfile.case_number,
                  courtfileTitle: courtfile.title,
                  returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                }}
                className="btn btn-phoenix-primary ms-2"
              >
                + New client
              </Link>
            </div>

            {loadingClients && <p className="mt-2">Loading clients…</p>}
            {clientsErr && (
              <div className="alert alert-danger mt-2">{clientsErr}</div>
            )}
            {!loadingClients && !clientsErr && caseClients.length === 0 && (
              <div className="alert alert-info mt-2">No clients linked.</div>
            )}
            {!loadingClients && caseClients.length > 0 && (
              <div className="table-responsive mt-2">
                <table className="table table-hover align-middle table-modern">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "20px" }}>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th style={{ width: 48 }} className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseClients.map((cl) => (
                      <tr key={cl.relation_id}>
                        <td className="text-start ps-2">{cl.client_id}</td>
                        <td>{cl.client_name || "—"}</td>
                        <td>{cl.client_email || "—"}</td>
                        <td>{cl.client_phone || "—"}</td>
                        <td className="text-center">
                          <KebabMenu>
                            <li>
                              <Link
                                className="dropdown-item"
                                to={`/clients/view/${cl.client_id}`}
                                state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                              >
                                <i className="bi bi-eye me-2" /> View
                              </Link>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                disabled={!cl.relation_id || deletingClientRelId === cl.relation_id}
                                onClick={() => handleDeleteClientRelation(cl.relation_id)}
                              >
                                {deletingClientRelId === cl.relation_id ? (
                                  <span className="spinner-border spinner-border-sm me-2" />
                                ) : (
                                  <i className="bi bi-trash me-2" />
                                )}
                                Unlink
                              </button>
                            </li>
                          </KebabMenu>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ASIDE */}
          <div className="col-xl-5 col-xxl-4">
            <div className="aside-sticky">
              {/* Summary card */}
              <div className="card">
                <div className="card-body">
                  <h3 className="mb-3 fw-bold">Summary</h3>

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Status :</span>
                    <span
                      className={`ms-2 fs-10 badge-phoenix badge ${courtfile.status ? "badge-phoenix-success" : "badge-phoenix-secondary"
                        }`}
                    >
                      {courtfile.status ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Jurisdiction :</span>
                    <span>{courtfile.jurisdiction || "—"}</span>
                  </div>
                  <div className="d-flex py-1">
                    <span className="text-muted">Court :</span>
                    <span className="ms-auto text-end text-break">{courtfile.court || "—"}</span>
                  </div>

                  <div className="border-top my-3"></div>

                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Documents</span>
                    <strong>{caseDocuments.length}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Deadlines</span>
                    <strong>{caseDeadlines.length}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Appointments</span>
                    <strong>{caseAppointments.length}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Clients</span>
                    <strong>{caseClients.length}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Payments</span>
                    <strong>{casePayments.length}</strong>
                  </div>
                </div>
              </div>

              {/* Payments card (mismo contenido, movido aquí) */}
              <div className="card mt-4">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <h2 className="h3 mb-0 fw-bold">Payments</h2>
                    <Link
                      to="/payments/addPayment"
                      state={{
                        courtfileId: courtfile.id,
                        courtfileNumber: courtfile.case_number,
                        courtfileTitle: courtfile.title,
                        returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                      }}
                      className="btn btn-phoenix-primary ms-2"
                    >
                      + New payment
                    </Link>
                  </div>

                  {loadingPayments && <p className="mt-2">Loading payments…</p>}
                  {paymentsErr && (
                    <div className="alert alert-danger mt-2">{paymentsErr}</div>
                  )}
                  {!loadingPayments && !paymentsErr && casePayments.length === 0 && (
                    <div className="alert alert-info mt-2">No payments linked.</div>
                  )}
                  {!loadingPayments && casePayments.length > 0 && (
                    <div className="table-responsive mt-2">
                      <table className="table table-hover align-middle table-modern">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "20px" }}>ID</th>
                            <th>Amount</th>
                            <th>Currency</th>
                            <th>Status</th>
                            <th>Means</th>
                            <th>Paid At</th>
                            <th style={{ width: 48 }} className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {casePayments.map((p) => (
                            <tr key={`${p.id}-${p.relation_id}`}>
                              <td className="text-start ps-2">{p.id}</td>
                              <td>{p.amount}</td>
                              <td>{p.currency}</td>
                              <td>
                                <PaymentBadge status={p.status} outline />
                              </td>
                              <td>{p.means || "—"}</td>
                              <td>{p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</td>
                              <td className="text-center">
                                <KebabMenu>
                                  <li>
                                    <Link
                                      className="dropdown-item"
                                      to={`/payments/view/${p.id}`}
                                      state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
                                    >
                                      <i className="bi bi-eye me-2" /> View
                                    </Link>
                                  </li>
                                  {(() => {
                                    const canEdit = String(p.status || "").toLowerCase() === "pending";
                                    return (
                                      <li>
                                        <Link
                                          className={`dropdown-item ${canEdit ? "" : "disabled"}`}
                                          to={canEdit ? `/payments/${p.id}` : "#"}
                                          state={canEdit ? { returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` } : undefined}
                                          onClick={(e) => { if (!canEdit) e.preventDefault(); }}
                                          title={canEdit ? "Edit payment" : "Only pending payments can be edited"}
                                        >
                                          <i className="bi bi-pencil me-2" /> Edit
                                        </Link>
                                      </li>
                                    );
                                  })()}
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button
                                      className="dropdown-item text-danger"
                                      disabled={p.status === "approved" || !p.relation_id || deletingPaymentRelId === p.relation_id}
                                      onClick={() => handleDeletePaymentRelation(p.relation_id)}
                                    >
                                      {deletingPaymentRelId === p.relation_id ? (
                                        <span className="spinner-border spinner-border-sm me-2" />
                                      ) : (
                                        <i className="bi bi-trash me-2" />
                                      )}
                                      Unlink
                                    </button>
                                  </li>
                                </KebabMenu>
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Nota: si querés, meté aquí AI Suggestions en un accordion colapsado */}
            </div>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );

};