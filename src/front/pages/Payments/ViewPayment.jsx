import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import AppNavsShell from "../../components/AppNavsShell";
import PaymentBadge from "../../components/PaymentBadge";

export const ViewPayment = () => {
  const { paymentId } = useParams();
  const { store } = useGlobalReducer();
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
  const [error, setError] = useState(null);
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);

  const isPending = payment?.status === "pending";
  const isAdminOrLawyer = ["admin_user", "lawyer"].includes(role);
  const isClient = role === "client";
  const canShowButtons = isPending;

  const capitalizeFirstLetter = (str) => {
    if (!str) return "-";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

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
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Reference copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

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
        setError(null);
      } catch (err) {
        console.error("Error fetching payment:", err);
        setError("Failed to load payment data");
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) fetchPayment();
  }, [paymentId, API, token]);

  const handleDelete = async (payment, e) => {
  e?.stopPropagation?.();

  // Guard: solo admin o lawyer pueden accionar
  if (!(role === "admin_user" || role === "lawyer")) return;

  const isAdmin = role === "admin_user";
  const endpoint = isAdmin
    ? `${API}/api/payments/${payment.id}`
    : (payment.relation_id
        ? `${API}/api/payments-courtfile/${payment.relation_id}`
        : null);

  if (!endpoint) {
    alert("Missing relation id to unlink this payment.");
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

    // Reducer: usa id correcto según caso
    dispatch({
      type: "DELETE_PAYMENT",
      payload: isAdmin ? payment.id : payment.relation_id,
    });

    alert(isAdmin ? "Payment deleted successfully!" : "Payment unlinked successfully!");
  } catch (err) {
    console.error("Error deleting/unlinking payment:", err);
    alert(`Error: ${err.message}`);
  }
};
  

  const handleStripeCheckout = async () => {
    if (!isPending) return;
    setIsProcessingStripe(true);
    try {
      const response = await fetch(`${API}/api/payments/${paymentId}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      alert(`Error iniciando el pago: ${err.message}`);
      setIsProcessingStripe(false);
    }
  };

  //---------------Lógica para traer expedientes linkeados-------------
  // Intento inicial desde location.state (si venís desde un listado con info del expediente)
  const state = location.state || {};
  const initialLinked = state.courtfileId
    ? { id: state.courtfileId, number: state.courtfileNumber, title: state.courtfileTitle }
    : null;

  // estado local del expediente vinculado
  const [linkedCourtfile, setLinkedCourtfile] = useState(initialLinked);

  useEffect(() => {
    const loadCf = async () => {
      try {
        if (linkedCourtfile?.id && (!linkedCourtfile.number || !linkedCourtfile.title)) {
          const resp = await fetch(`${API}/api/courtfiles/${linkedCourtfile.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
            const d = await resp.json();
            setLinkedCourtfile(cf => ({ ...(cf || {}), number: d.case_number, title: d.title }));
          }
        }
      } catch {
        /* noop */
      }
    };
    loadCf();
  }, [API, linkedCourtfile?.id, token]);

  useEffect(() => {
    const fetchLinked = async () => {
      try {
        if (linkedCourtfile || !paymentId || !token) return;

        // endpoint de relaciones Payment<->Courtfile
        const resp = await fetch(`${API}/api/payments-courtfile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) return;

        const rows = await resp.json();
        // buscá por payment_id
        const rel =
          (rows || []).find(r => Number(r.payment_id) === Number(paymentId)) ||
          (rows || []).find(r => Number(r.paymentId) === Number(paymentId)); // por si la API usa camelCase

        if (rel) {
          setLinkedCourtfile({
            id: rel.courtfile_id ?? rel.courtfileId,
            number: rel.courtfile_number ?? rel.courtfileNumber,
            title: rel.courtfile_title ?? rel.courtfileTitle
          });
        }
      } catch {
        /* noop */
      }
    };
    fetchLinked();
  }, [API, paymentId, linkedCourtfile, token]);


  // ---------- UI states ----------
  if (loading) {
    return (
      <AppNavsShell>
        <div className="container mt-4 text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading payment...</p>
        </div>
      </AppNavsShell>
    );
  }

  if (error || !payment) {
    return (
      <AppNavsShell>
        <div className="container mt-4">
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle"></i> {error || "Payment not found"}
          </div>
          <Link to={returnTo} className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left"></i> Back
          </Link>
        </div>
      </AppNavsShell>
    );
  }

  return (
    <AppNavsShell>
      <div className="container main-content">
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

        <div className="col-8">
          {/* --- Permisos --- */}
          {(() => {
            // normalizo status
            const st = (payment?.status || "").toLowerCase();
            const isPending = st === "pending";
            const isAdmin = (role || "").toLowerCase() === "admin_user";
            const isLawyer = (role || "").toLowerCase() === "lawyer";
            const isClient = (role || "").toLowerCase() === "client";

            // Guardo en window para usar abajo sin recalcular (opcional)
            window.__pay_flags = {
              showPay: isAdmin || (isLawyer && isPending) || (isClient && isPending),
              showEditDelete: isAdmin || (isLawyer && isPending),
            };
            return null;
          })()}

          {/* Header (title + actions) */}
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h1 className="h2 fw-bolder mb-1">Payment</h1>
            </div>

            {(window.__pay_flags?.showEditDelete) && (
              <div className="d-flex gap-2">
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
              </div>
            )}
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
                      <h4 className="fw-bolder mb-0">
                        {payment.amount || "—"}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Means / Currency */}
                <div className="col-sm-4 border-start-sm border-translucent ps-sm-5">
                  <div className="d-inline-flex align-items-center">
                    <div className="d-flex bg-info-subtle rounded flex-center me-3" style={{ width: 32, height: 32 }}>
                      <i className="bi bi-credit-card text-info" />
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-1">Means</p>
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

            {/* Footer actions */}
            <div className="card-footer bg-light d-flex justify-content-end gap-2">
              {window.__pay_flags?.showPay && (
                <button
                  className="btn btn-success"
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

              {window.__pay_flags?.showEditDelete && (
                <>
                  <Link
                    to={`/payments/${payment.id}`}
                    state={{ returnTo }}
                    className="btn btn-warning"
                  >
                    <i className="bi bi-pencil" /> Edit
                  </Link>
                  <button className="btn btn-danger" onClick={handleDelete}>
                    <i className="bi bi-trash" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );


};
