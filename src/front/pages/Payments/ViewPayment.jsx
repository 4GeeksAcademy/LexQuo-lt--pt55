import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import AppNavsShell from "../../components/AppNavsShell";
import PaymentBadge from "../../components/PaymentBadge";
import { toast } from 'react-toastify';

export const ViewPayment = () => {
  const { paymentId } = useParams();
  const { store, dispatch } = useGlobalReducer(); // <-- agregado dispatch
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/payments";

  const API = import.meta.env.VITE_BACKEND_URL;
  const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

  const token = store?.auth?.token;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer" || role === "client";
  if (!allowed) return <Navigate to="/403" replace />;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);

  // helpers
  const capitalizeFirstLetter = (str) => (!str ? "-" : str.charAt(0).toUpperCase() + str.slice(1));
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  // ------- fetch pago -------
  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setPayment(data);
        
      } catch (err) {
        console.error("Error fetching payment:", err);
        toast.error("Failed to load payment data");
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) fetchPayment();
  }, [paymentId, API, token]);

  //--------------- Lógica de courtfile vinculado -------------
  const state = location.state || {};
  const initialLinked = state.courtfileId
    ? { id: state.courtfileId, number: state.courtfileNumber, title: state.courtfileTitle }
    : null;

  const [linkedCourtfile, setLinkedCourtfile] = useState(initialLinked);
  const [relationId, setRelationId] = useState(null); // <- para unlink (lawyer)
  const cameFromCourtfile = Boolean(state.courtfileId);
  const [hasCourtfileAccess, setHasCourtfileAccess] = useState(cameFromCourtfile || role === "admin_user");

  // Completar número/título si falta
  useEffect(() => {
    const loadCf = async () => {
      try {
        if (linkedCourtfile?.id && (!linkedCourtfile.number || !linkedCourtfile.title)) {
          const resp = await fetch(`${API}/api/courtfiles/${linkedCourtfile.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
            const d = await resp.json();
            setLinkedCourtfile((cf) => ({ ...(cf || {}), number: d.case_number, title: d.title }));
          }
        }
      } catch {/* noop */}
    };
    loadCf();
  }, [API, linkedCourtfile?.id, token]);

  // Descubrir relación Payment<->Courtfile y guardar relationId
  useEffect(() => {
    const fetchLinked = async () => {
      try {
        if ((!paymentId || !token) || (linkedCourtfile && relationId)) return;

        const resp = await fetch(`${API}/api/payments-courtfile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) return;

        const rows = await resp.json();
        const rel =
          (rows || []).find(r => Number(r.payment_id ?? r.paymentId) === Number(paymentId));

        if (rel) {
          setLinkedCourtfile((prev) => prev || {
            id: rel.courtfile_id ?? rel.courtfileId,
            number: rel.courtfile_number ?? rel.courtfileNumber,
            title: rel.courtfile_title ?? rel.courtfileTitle
          });
          setRelationId(rel.id ?? rel.relation_id ?? rel.relationId ?? null);
        }
      } catch {/* noop */}
    };
    fetchLinked();
  }, [API, paymentId, token, linkedCourtfile, relationId]);

  // Chequear acceso del usuario (lawyer/client) al courtfile
  useEffect(() => {
    const checkAccess = async () => {
      if (!linkedCourtfile?.id) return;

      if (role === "admin_user") { setHasCourtfileAccess(true); return; }
      if (cameFromCourtfile) { setHasCourtfileAccess(true); return; }

      // 1) intento endpoint am-i-linked
      try {
        const r = await fetch(`${API}/api/courtfiles/${linkedCourtfile.id}/am-i-linked`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (r.ok) {
          const d = await r.json();
          if (typeof d?.linked === "boolean") {
            setHasCourtfileAccess(d.linked);
            return;
          }
        }
      } catch {/* noop */}

      // 2) fallback: listar mis expedientes y comparar
      try {
        const listEndpoint =
          role === "lawyer"
            ? `${API}/api/lawyers-courtfiles`
            : `${API}/api/clients-courtfiles`;

        const r2 = await fetch(listEndpoint, { headers: { Authorization: `Bearer ${token}` } });
        if (r2.ok) {
          const rows = await r2.json();
          const myCfIds = (rows || []).map(x => x.courtfile?.id ?? x.courtfile_id ?? x.id);
          const ok = myCfIds.some(id => Number(id) === Number(linkedCourtfile.id));
          setHasCourtfileAccess(ok);
          return;
        }
      } catch {/* noop */}

      setHasCourtfileAccess(false);
    };

    checkAccess();
  }, [API, token, role, linkedCourtfile?.id, cameFromCourtfile]);

  // ---------- Acciones ----------
  const handleDelete = async (e) => {
    e?.stopPropagation?.();

    const st = (payment?.status || "").toLowerCase();
    const isAdmin = role === "admin_user";
    const isLawyer = role === "lawyer";

    if (!isAdmin) {
      // lawyer: solo pending + acceso al courtfile
      if (!isLawyer) return;
      if (st !== "pending" || !hasCourtfileAccess) return;
    }

    const endpoint = isAdmin
      ? `${API}/api/payments/${payment.id}`
      : (relationId ? `${API}/api/payments-courtfile/${relationId}` : null);

    if (!endpoint) {
      toast.error("Missing relation id to unlink this payment.");
      return;
    }

    const msg = isAdmin
      ? "Are you sure you want to delete this payment?"
      : "Are you sure you want to unlink this payment from the courtfile?";

    if (!window.confirm(msg)) return;

    try {
      const resp = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      dispatch({ type: "DELETE_PAYMENT", payload: isAdmin ? payment.id : relationId });

      toast.success(isAdmin ? "Payment deleted successfully!" : "Payment unlinked successfully!");
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("Error deleting/unlinking payment:", err);
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleStripeCheckout = async () => {
    const st = (payment?.status || "").toLowerCase();
    const isAdmin = role === "admin_user";
    const isClient = role === "client";

    const canAdminPay = isAdmin && st === "pending";
    const canClientPay = isClient && st === "pending" && hasCourtfileAccess;

    if (!canAdminPay && !canClientPay) return;

    setIsProcessingStripe(true);
    try {
      const response = await fetch(`${API}/api/payments/${paymentId}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payment),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create Stripe Checkout Session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error("Error during Stripe checkout:", err);
      toast.error(`Error iniciando el pago: ${err.message}`);
      setIsProcessingStripe(false);
    }
  };

  // ---------- UI states ----------
  if (loading) {
    return (
      <AppNavsShell>
        <div className="container add-page text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading payment...</p>
        </div>
      </AppNavsShell>
    );
  }

  // ---- flags UI ----
  const st = (payment?.status || "").toLowerCase();
  const isPending = st === "pending";
  const isAdmin = role === "admin_user";
  const isLawyer = role === "lawyer";
  const isClient = role === "client";

  const canEditDelete =
    isAdmin || (isLawyer && isPending && hasCourtfileAccess);

  const canPay =
    (isAdmin && isPending) || (isClient && isPending && hasCourtfileAccess);

  return (
    <AppNavsShell>
      <div className="container add-page">
        {/* Breadcrumbs */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link to={returnTo || "/payments"}>Payments</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Details
            </li>
          </ol>
        </nav>

        <div className="col-12 col-lg-8">
          {/* Header (title + actions) */}
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h1 className="h2 fw-bolder mb-1">Payment</h1>
              {!hasCourtfileAccess && (isLawyer || isClient) && linkedCourtfile?.id && (
                <p className="text-danger small mb-0">
                  You’re not linked to this case file, so you can’t act on this payment.
                </p>
              )}
            </div>

            <div className="d-flex gap-2">
              {canPay && (
                <button
                  className="btn btn-phoenix-success btn-sm"
                  onClick={handleStripeCheckout}
                  disabled={isProcessingStripe}
                >
                  {isProcessingStripe ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  ) : (
                    <i className="bi bi-credit-card" />
                  )}{" "}
                  Pay
                </button>
              )}

              {canEditDelete && (
                <>
                  <Link
                    to={`/payments/${payment.id}`}
                    state={{ returnTo }}
                    className="btn btn-phoenix-secondary btn-sm"
                  >
                    <i className="bi bi-pencil" /> Edit
                  </Link>
                  <button className="btn btn-phoenix-danger btn-sm" onClick={handleDelete}>
                    <i className="bi bi-trash" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Summary strip */}
          <div className="card mb-3 mt-4">
            <div className="card-body">
              <div className="row text-center g-4 justify-content-center">
                {/* Amount */}
                <div className="col-sm-4">
                  <div className="d-inline-flex align-items-center">
                    <div className="d-flex bg-success-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
                      <i className="bi bi-currency-dollar text-success" />
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-1">Amount</p>
                      <h4 className="fw-bolder mb-0">{payment.amount || "—"}</h4>
                    </div>
                  </div>
                </div>

                {/* Payment Methods / Currency */}
                <div className="col-sm-4 border-start-sm border-translucent ps-sm-5">
                  <div className="d-inline-flex align-items-center">
                    <div className="d-flex bg-info-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
                      <i className="bi bi-credit-card text-info" />
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-1">Payment Method</p>
                      <h4 className="fw-bolder text-nowrap mb-0">
                        {capitalizeFirstLetter(payment.means) || "—"}
                        {payment.currency ? ` · ${payment.currency}` : ""}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="col-sm-4 border-start-sm border-translucent ps-sm-5">
                  <div className="d-inline-flex align-items-center">
                    <div className="d-flex bg-primary-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
                      <i className="bi bi-circle-half text-primary" />
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-1">Status</p>
                      <div className="mt-1">
                        <PaymentBadge status={payment.status} outline />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="card">
            <div className="card-body">
              <div className="row g-4">
                {/* Left column */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <span className="fw-bold text-muted d-block mb-1">Currency</span>
                    <span className="fs-8 d-block">{payment.currency || "—"}</span>
                  </div>

                  <div className="mb-3">
                    <span className="fw-bold text-muted d-block mb-1">Created At</span>
                    <span className="fs-8 d-block">{formatDateTime(payment.created_at)}</span>
                  </div>

                  {payment.status === "approved" && payment.stripe_payment_intent_id && (
                    <div className="mb-3">
                      <span className="fw-bold text-muted d-block mb-1">Paid At</span>
                      <span className="fs-8 d-block">{formatDateTime(payment.paid_at)}</span>
                    </div>
                  )}

                  {payment.status === "processing" && payment.stripe_payment_intent_id && (
                    <div className="mb-3">
                      <span className="fw-bold text-muted d-block mb-1">Processing Since</span>
                      <span className="fs-8 d-block">
                        {formatDateTime(payment.updated_at || payment.created_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <span className="fw-bold text-muted d-block mb-1">Last Updated</span>
                    <span className="fs-8 d-block">
                      {formatDateTime(payment.updated_at || payment.created_at)}
                    </span>
                  </div>

                  {(payment.status === "approved" || payment.status === "processing") &&
                    payment.stripe_payment_intent_id && (
                      <div className="mb-3">
                        <span className="fw-bold text-muted d-block mb-1">Payment ID</span>
                        <span className="fs-8 d-block font-monospace">
                          {payment.stripe_payment_intent_id}
                        </span>
                      </div>
                    )}

                  {linkedCourtfile && (
                    <div className="mb-3">
                      <span className="fw-bold text-muted d-block mb-1">Case File</span>
                      <Link
                        to={`/courtfiles/ViewCourtfileLawyer/${linkedCourtfile.id}`}
                        className="badge badge-phoenix badge-phoenix-secondary fs-8 mt-2"
                        title={linkedCourtfile.title || ""}
                      >
                        {linkedCourtfile.number || `#${linkedCourtfile.id}`}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Footer removido (botones ahora están en el header) */}
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};
