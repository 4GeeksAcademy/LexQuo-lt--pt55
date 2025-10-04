import { Link, useParams, useNavigate, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useState, useEffect, useMemo } from "react";
import useUnreadBadges from "../../hooks/useUnreadBadges";
import { markNow } from "../../hooks/chatUnread";
import AppNavsShell from "../../components/AppNavsShell";
import DeadlineBadge from "../../components/DeadlineBadge";
import PaymentBadge from "../../components/PaymentBadge";
import { toast } from 'react-toastify';

function KebabMenu({ children }) {
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div className="dropdown dropup position-static text-center kebab-menu" onClick={stop}>
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
  

  const [myRelationId, setMyRelationId] = useState(null);
  const [leaving, setLeaving] = useState(false);

  // ------------------- DEADLINES (YA FILTRADOS) -------------------
  const [caseDeadlines, setCaseDeadlines] = useState([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);
 
  const [deletingDeadlineRelId, setDeletingDeadlineRelId] = useState(null);

  // ------------------- APPOINTMENTS (YA FILTRADOS) -------------------
  const [caseAppointments, setCaseAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [deletingApptRelId, setDeletingApptRelId] = useState(null);

  // ------------------- DOCUMENTS (YA FILTRADOS) -------------------
  const [caseDocuments, setCaseDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const [deletingDocRelId, setDeletingDocRelId] = useState(null);
  // ------------------- AI DOCUMENT ANALYSIS -------------------
  const [analyzingDocId, setAnalyzingDocId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);


  // ------------------- CLIENTS (YA FILTRADOS) -------------------
  const [caseClients, setCaseClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const [deletingClientRelId, setDeletingClientRelId] = useState(null);

  // ------------------- LAWYERS (NUEVO) -------------------
  const [caseLawyers, setCaseLawyers] = useState([]);
  const [loadingLawyers, setLoadingLawyers] = useState(false);

  const [deletingLawyerRelId, setDeletingLawyerRelId] = useState(null);

  // ------------------- PAYMENTS (YA FILTRADOS) -------------------
  const [casePayments, setCasePayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

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

    } catch (err) {
      console.error("Error fetching courtfile:", err);
      toast.error("Failed to load courtfile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeadlines = async () => {
    try {
      setLoadingDeadlines(true);

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
      toast.error(e.message || "Error fetching deadlines");
    } finally {
      setLoadingDeadlines(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);

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
      toast.error(e.message || "Error fetching appointments");
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoadingDocuments(true);
      
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
      toast.error(e.message || "Error fetching documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      
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
      toast.error(e.message || "Error fetching clients");
    } finally {
      setLoadingClients(false);
    }
  };



  const fetchCaseLawyers = async () => {
    try {
      setLoadingLawyers(true);
      
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
      toast.error(e.message || "Error fetching lawyers");
    } finally {
      setLoadingLawyers(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);

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
      toast.error(e.message || "Error fetching payments");
    } finally {
      setLoadingPayments(false);
    }
  };

  // ===== AI SUGGESTIONS =====
  const [aiLoading, setAiLoading] = useState(false);
  
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
      toast.error(e.message || "Error generando sugerencias");
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
      toast.error(e.message);
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
      toast.warn("No relation found for this lawyer and case.");
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
      toast.success("You have left this case.");
      navigate("/DashboardLawyer", { replace: true });
    } catch (err) {
      console.error("Error unlinking lawyer from courtfile:", err);
      toast.error(err.message || "Error unlinking relation");
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
      toast.error(err.message || "Error deleting relation");
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
      toast.error(err.message || "Error deleting relation");
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
      toast.error(err.message || "Error unlinking document");
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
      toast.error(err.message || "Error unlinking client");
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
      toast.error(err.message || "Error deleting relation");
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
      toast.error(e.message || "Error unlinking payment");
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
  };

  const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

  function goRow(e, path, state = {}) {
    // si viene con Ctrl/Cmd → nueva pestaña
    if (e?.metaKey || e?.ctrlKey) {
      const fullPath = `${FRONTEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;
      window.open(fullPath, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(path, { state });
  }

  // Define viewPath y viewState para cada tipo de entidad
  const getRowNavigation = (type, item) => {
    switch (type) {
      case 'deadline':
        return {
          path: `/deadlines/view/${item.deadline_id}`,
          state: { returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }
        };
      case 'appointment':
        return {
          path: `/appointments/view/${item.appointment_id}`,
          state: { returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }
        };
      case 'document':
        return {
          path: `/documents/view/${item.document_id || item.id}`,
          state: { returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }
        };
      case 'lawyer':
        return {
          path: `/lawyers/view/${item.lawyer_id}`,
          state: { returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }
        };
      case 'client':
        return {
          path: `/clients/view/${item.client_id}`,
          state: { returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }
        };
      case 'payment':
        return {
          path: `/payments/view/${item.id}`,
          state: { returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }
        };
      default:
        return { path: '#', state: {} };
    }
  };

  // Función unificada para manejar clicks en filas
  const handleRowClick = (e, type, item) => {
    if (!item) return;

    const interactive = e.target.closest('a, button, .dropdown-menu, .dropdown, .no-row-nav, .kebab-menu');
    if (interactive) return;

    const navigation = getRowNavigation(type, item);
    goRow(e, navigation.path, navigation.state);
  };


  // ------------------- Document AI -------------------
  const analyzeDocument = async (documentUrl, documentName, documentId) => {
    try {
      setAnalyzingDocId(documentId);

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
      toast.error(err.message || "Error analyzing document");
      console.error("Analysis error:", err);
    } finally {
      setAnalyzingDocId(null);
    };
  };

  // ===== SORT CONFIG GENERAL =====
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Función comparadora genérica
  const sortData = (items) => {
    if (!sortConfig.key) return items;

    return [...items].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      // normalizar fechas
      if (sortConfig.key.toLowerCase().includes("date") || sortConfig.key.includes("_at")) {
        valA = valA ? new Date(valA) : new Date(0);
        valB = valB ? new Date(valB) : new Date(0);
      }

      // normalizar strings
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Datos ordenados según sortConfig
  const sortedDocuments = useMemo(() => sortData(caseDocuments), [caseDocuments, sortConfig]);
  const sortedDeadlines = useMemo(() => sortData(caseDeadlines), [caseDeadlines, sortConfig]);
  const sortedAppointments = useMemo(() => sortData(caseAppointments), [caseAppointments, sortConfig]);
  const sortedClients = useMemo(() => sortData(caseClients), [caseClients, sortConfig]);
  const sortedLawyers = useMemo(() => sortData(caseLawyers), [caseLawyers, sortConfig]);


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

 
  return (
    <AppNavsShell>
      <div className="container add-page">

        {/* ===== Breadcrumbs ===== */}
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to="/DashboardLawyer">Dashboard</Link>
            </li>
            <li className="breadcrumb-item">
              <Link to="/courtfiles">Courtfiles</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              {courtfile.case_number || "—"}{courtfile.title ? ` — ${courtfile.title}` : ""}
            </li>
          </ol>
        </nav>

        {/* ===== Title + Actions ===== */}
        <div className="d-flex justify-content-between align-items-center mb-3 py-3 flex-wrap gap-2">
          {/* Título */}
          <h2 className="mb-0 fw-bold">Courtfile details</h2>

          {/* Botones */}
          <div className="d-flex flex-wrap gap-2">
            <button
              className="px-3 text-body text-decoration-none btn btn-link position-relative"
              onClick={(e) => onOpenChatClick(e)}
              title="Open chat"
            >
              <i className="bi bi-chat-dots me-1" />
              <span className="d-none d-sm-inline">Chat</span> {/* texto solo en sm+ */}
              {unreadByCase.get(Number(courtfileId))?.hasUnread && (
                <span
                  className="position-absolute bg-danger border border-light rounded-circle"
                  style={{
                    top: "2px",
                    right: "6px",
                    width: "10px",
                    height: "10px"
                  }}
                />
              )}
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
              <span className="d-none d-sm-inline">Add lawyer</span>
            </Link>

            <Link
              to={`/courtfiles/${courtfile.id}`}
              state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}` }}
              className="px-3 text-body text-decoration-none btn btn-link"
            >
              <i className="bi bi-pencil me-1" />
              <span className="d-none d-sm-inline">Edit</span>
            </Link>

            <button
              className="btn btn-phoenix-danger"
              onClick={handleLeaveCase}
              disabled={!myRelationId || leaving}
            >
              <i className="bi bi-box-arrow-right me-1" />
              <span className="d-none d-sm-inline">{leaving ? "Leaving…" : "Leave case"}</span>
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

                {/* Description */}
                <div className="mt-4">
                  <div className="text-uppercase text-muted fw-bold small section-title mb-2">
                    Description
                  </div>

                  {/* Mobile: preview + botón para desplegar */}
                  <div className="d-md-none">
                    {/* preview truncado */}
                    <div className="p-3 rounded bg-light desc-preview">
                      {courtfile.description || "—"}
                    </div>

                    {/* contenido completo, oculto por defecto */}
                    <div className="collapse mt-2" id="descCollapse">
                      <div className="p-3 rounded bg-light">
                        {courtfile.description || "—"}
                      </div>
                    </div>

                    <button
                      className="btn btn-sm btn-outline-secondary mt-2 collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#descCollapse"
                      aria-expanded="false"
                      aria-controls="descCollapse"
                    >
                      <span className="label-more">Show more</span>
                      <span className="label-less">Show less</span>
                    </button>
                  </div>

                  {/* Desktop: siempre expandido */}
                  <div className="d-none d-md-block p-3 rounded bg-light">
                    {courtfile.description || "—"}
                  </div>
                </div>
              </div>
            </div>


            {/* ===== Documents ===== */}
<div className="d-flex align-items-center justify-content-between mt-4">
  <h2 className="h5 text-uppercase text-muted mb-0 fw-bold">Notes & Documents</h2>
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
    + Case Record
  </Link>
</div>

{loadingDocuments && <p className="mt-2">Loading documents…</p>}

{!loadingDocuments && caseDocuments.length === 0 && (
  <div className="alert text-secondary bg-transparent border-0 mt-2">No documents yet.</div>
)}

{!loadingDocuments && caseDocuments.length > 0 && (
  <div className="table-responsive mt-2">
    <table className="table table-hover align-middle table-modern">
      <thead className="table-light">
        <tr>
          <th
            role="button"
            onClick={() => requestSort("document_date")}
          >
            Date{" "}
            <i
              className={`bi ${
                sortConfig.key === "document_date"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th
            role="button"
            onClick={() => requestSort("name")}
          >
            Name{" "}
            <i
              className={`bi ${
                sortConfig.key === "name"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th
            role="button"
            onClick={() => requestSort("category")}
          >
            Category{" "}
            <i
              className={`bi ${
                sortConfig.key === "category"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th>File</th>
          <th style={{ width: 48 }} className="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortedDocuments.map((doc) => (
          <tr
            key={doc.relation_id}
            className="table-row-clickable"
            onClick={(e) => handleRowClick(e, "document", doc)}
          >
            <td>
              {doc.document_date
                ? new Date(doc.document_date).toLocaleDateString()
                : "—"}
            </td>
            <td>{doc.name || doc.document_name || "—"}</td>
            <td>{doc.category || doc.document_type || "—"}</td>
            <td>
              {doc.url_route || doc.document_url ? (
                <a
                  href={doc.url_route || doc.document_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
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

{!loadingDeadlines && caseDeadlines.length === 0 && (
  <div className="alert text-secondary bg-transparent border-0 mt-2">No deadlines yet.</div>
)}
{!loadingDeadlines && caseDeadlines.length > 0 && (
  <div className="table-responsive mt-2">
    <table className="table table-hover align-middle table-modern">
      <thead className="table-light">
        <tr>
          <th style={{ width: "20px" }}>ID</th>
          <th role="button" onClick={() => requestSort("deadline_type")}>
            Type{" "}
            <i
              className={`bi ${
                sortConfig.key === "deadline_type"
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
              className={`bi ${
                sortConfig.key === "deadline_date"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th role="button" onClick={() => requestSort("deadline_hour")}>
            Hour{" "}
            <i
              className={`bi ${
                sortConfig.key === "deadline_hour"
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
              className={`bi ${
                sortConfig.key === "priority"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th style={{ width: 48 }} className="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortedDeadlines.map((dl) => (
          <tr
            key={dl.relation_id}
            className="table-row-clickable"
            onClick={(e) => handleRowClick(e, "deadline", dl)}
          >
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

{!loadingAppointments && caseAppointments.length === 0 && (
  <div className="alert text-secondary bg-transparent border-0 mt-2">No appointments yet.</div>
)}
{!loadingAppointments && caseAppointments.length > 0 && (
  <div className="table-responsive mt-2">
    <table className="table table-hover align-middle table-modern">
      <thead className="table-light">
        <tr>
          <th style={{ width: "20px" }}>ID</th>
          <th role="button" onClick={() => requestSort("appointment_title")}>
            Title{" "}
            <i
              className={`bi ${
                sortConfig.key === "appointment_title"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th role="button" onClick={() => requestSort("appointment_date")}>
            Date{" "}
            <i
              className={`bi ${
                sortConfig.key === "appointment_date"
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
              className={`bi ${
                sortConfig.key === "starts_at"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th>Ends</th>
          <th role="button" onClick={() => requestSort("appointment_location")}>
            Location{" "}
            <i
              className={`bi ${
                sortConfig.key === "appointment_location"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th style={{ width: 48 }} className="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortedAppointments.map((ap) => (
          <tr
            key={ap.relation_id}
            className="table-row-clickable"
            onClick={(e) => handleRowClick(e, "appointment", ap)}
          >
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

{!loadingLawyers && caseLawyers.length === 0 && (
  <div className="alert text-secondary bg-transparent border-0 mt-2">No lawyers linked.</div>
)}
{!loadingLawyers && caseLawyers.length > 0 && (
  <div className="table-responsive mt-2">
    <table className="table table-hover align-middle table-modern">
      <thead className="table-light">
        <tr>
          <th style={{ width: "20px" }}>ID</th>
          <th role="button" onClick={() => requestSort("lawyer_name")}>
            Name{" "}
            <i
              className={`bi ${
                sortConfig.key === "lawyer_name"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th>Email</th>
          <th>Phone</th>
          <th style={{ width: 48 }} className="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortedLawyers.map((lw) => (
          <tr
            key={lw.relation_id}
            className="table-row-clickable"
            onClick={(e) => handleRowClick(e, "lawyer", lw)}
          >
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

{!loadingClients && caseClients.length === 0 && (
  <div className="alert text-secondary bg-transparent border-0 mt-2">
    No clients linked.
  </div>
)}
{!loadingClients && caseClients.length > 0 && (
  <div className="table-responsive mt-2">
    <table className="table table-hover align-middle table-modern">
      <thead className="table-light">
        <tr>
          <th style={{ width: "20px" }}>ID</th>
          <th role="button" onClick={() => requestSort("client_name")}>
            Name{" "}
            <i
              className={`bi ${
                sortConfig.key === "client_name"
                  ? sortConfig.direction === "asc"
                    ? "bi-arrow-up"
                    : "bi-arrow-down"
                  : "bi-arrow-down-up text-muted"
              }`}
            />
          </th>
          <th>Email</th>
          <th>Phone</th>
          <th style={{ width: 48 }} className="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortedClients.map((cl) => (
          <tr
            key={cl.relation_id}
            className="table-row-clickable"
            onClick={(e) => handleRowClick(e, "client", cl)}
          >
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

              {/* === AI SUGGESTIONS === */}

              <div className="card">
                <div className="card-body">
                  {/* Header igual a Payments */}
                  <div className="d-flex align-items-center justify-content-between">
                    <h2 className="h3 mb-0 fw-bold">AI Suggestions</h2>
                    <button
                      className="btn btn-phoenix-secondary ms-2"
                      onClick={handleGenerateSuggestions}
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



                  {aiLoading && (
                    <div className="text-muted d-flex align-items-center">
                      <span className="spinner-border spinner-border-sm me-2" />
                      Analizando descripción y jurisdicción…
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
                          <div key={idx} className="list-group-item">
                            {/* Header item: título + urgencia + kebab arriba */}
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
                                  <li>
                                    <Link
                                      className="dropdown-item"
                                      to="/deadlines/addDeadline"
                                      state={{
                                        courtfileId: courtfile.id,
                                        courtfileNumber: courtfile.case_number,
                                        courtfileTitle: courtfile.title,
                                        prefill: { type: "Other", description: sug.title || "" },
                                        suggestion: sug,
                                        returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                                      }}
                                    >
                                      <i className="bi bi-calendar2-plus me-2"></i> Deadline
                                    </Link>
                                  </li>

                                  <li>
                                    <Link
                                      className="dropdown-item"
                                      to="/appointments/addAppointment"
                                      state={{
                                        courtfileId: courtfile.id,
                                        courtfileNumber: courtfile.case_number,
                                        courtfileTitle: courtfile.title,
                                        prefill: { title: sug.title || "", details: sug.reasoning || "" },
                                        suggestion: sug,
                                        returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                                      }}
                                    >
                                      <i className="bi bi-clock me-2"></i> Appointment
                                    </Link>
                                  </li>

                                  <li>
                                    <Link
                                      className="dropdown-item"
                                      to="/documents/addDocument"
                                      state={{
                                        courtfileId: courtfile.id,
                                        courtfileNumber: courtfile.case_number,
                                        courtfileTitle: courtfile.title,
                                        prefill: { title: sug.title || "", content: sug.reasoning || "" },
                                        suggestion: sug,
                                        returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`,
                                      }}
                                    >
                                      <i className="bi bi-file-earmark-plus me-2"></i> Document
                                    </Link>
                                  </li>

                                  <li><hr className="dropdown-divider" /></li>
                                  {sug.id && (
                                    <li>
                                      <button
                                        className="dropdown-item text-danger"
                                        onClick={() => handleArchiveSuggestion(sug.id)}
                                      >
                                        <i className="bi bi-archive me-2"></i> Archivar
                                      </button>
                                    </li>
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


              {/* Payments card (queda igual) */}
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

                  {!loadingPayments && casePayments.length === 0 && (
                    <div className="alert text-secondary bg-transparent border-0 mt-2">No payments linked.</div>
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
                            <tr key={`${p.id}-${p.relation_id}`}
                              className="table-row-clickable"
                              onClick={(e) => handleRowClick(e, 'payment', p)}>
                              <td className="text-start ps-2">{p.id}</td>
                              <td>{p.amount}</td>
                              <td>{p.currency}</td>
                              <td><PaymentBadge className="fs-10" status={p.status} outline /></td>
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

              {/* Si querés, después metemos acá un accordion para “AI Suggestions (historial)”. */}
            </div>
          </div>

        </div>
      </div>
    </AppNavsShell>
  );

};