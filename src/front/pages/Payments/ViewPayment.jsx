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

  const handleDelete = async () => {
    if (!(isPending && isAdminOrLawyer)) return;
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    try {
      const response = await fetch(`${API}/api/payments/${paymentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        navigate(returnTo, { replace: true });
        alert("Payment deleted successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete payment");
      }
    } catch (err) {
      console.error("Error deleting payment:", err);
      alert(`Error deleting payment: ${err.message}`);
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
      <div className="page-add col-8">
        {/* Topbar */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex align-items-center gap-3">
            <h1 className="h2 mb-2">Payment details</h1>
            <span className="text-muted small">ID #{payment.id}</span>
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
            {/* Título principal dentro de la card */}
            <h2 className="h1 mb-4">Payment</h2>

            {/* Grid 2x2 alineada */}
            <div className="row g-4">
              {/* Col izquierda */}
              <div className="col-12 col-lg-6">
                <div className="mb-3">
                  <span className="fw-semibold text-muted d-block mb-1">Amount</span>
                  <span className="fs-8 d-block mt-1">{payment.amount || "-"}</span>
                </div>
                <div className="mb-3">
                  <span className="fw-semibold text-muted d-block mb-1">Currency</span>
                  <span className="fs-8 d-block mt-1">{payment.currency || "-"}</span>
                </div>
                <div className="mb-0">
                  <span className="fw-semibold text-muted d-block mb-1">Created At</span>
                  <span className="fs-8 d-block mt-1">{formatDateTime(payment.created_at)}</span>
                </div>

                {payment.status == "approved" && payment.stripe_payment_intent_id != null && (
                  <div className="mt-3">
                    <span className="fw-semibold text-muted d-block mb-1">Paid At</span>
                    <span className="fs-8 d-block mt-1">{formatDateTime(payment.paid_at)}</span>
                  </div>
                )}

                {payment.status === "processing" && payment.stripe_payment_intent_id != null && (
                  <div className="mt-3">
                    <span className="fw-semibold text-muted d-block mb-1">Processing Since</span>
                    <span className="fs-8 d-block mt-1">
                      {formatDateTime(payment.updated_at || payment.created_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Col derecha */}
              <div className="col-12 col-lg-6">
                <div className="mb-3">
                  <span className="fw-semibold text-muted d-block mb-1">Status</span>
                  <PaymentBadge status={payment.status} outline />
                </div>
                <div className="mb-3">
                  <span className="fw-semibold text-muted d-block mb-1">Means</span>
                  <span className="fs-8 d-block mt-1">{capitalizeFirstLetter(payment.means)}</span>
                </div>
                <div className="mb-0">
                  <span className="fw-semibold text-muted d-block mb-1">Last Updated</span>
                  <span className="fs-8 d-block mt-1">{formatDateTime(payment.updated_at || payment.created_at)}</span>
                </div>

                {payment.status == "approved" && payment.stripe_payment_intent_id != null && (
                  <div className="mt-3">
                    <span className="fw-semibold text-muted d-block mb-1">Payment ID</span>
                    <span className="fs-8 d-block mt-1 font-monospace">
                      {payment.stripe_payment_intent_id}
                    </span>
                  </div>
                )}
                {payment.status == "processing" && payment.stripe_payment_intent_id != null && (
                  <div className="mt-3">
                    <span className="fw-semibold text-muted d-block mb-1">Payment ID</span>
                    <span className="fs-8 d-block mt-1 font-monospace">
                      {payment.stripe_payment_intent_id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="card-footer bg-light d-flex justify-content-end gap-2">
            {canShowButtons && (
              <>
                {isClient && (
                  <button
                    className="btn btn-success"
                    onClick={handleStripeCheckout}
                    disabled={isProcessingStripe}
                  >
                    {isProcessingStripe ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      <i className="bi bi-credit-card"></i>
                    )}{" "}
                    Pay
                  </button>
                )}

                {isAdminOrLawyer && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={handleStripeCheckout}
                      disabled={isProcessingStripe}
                    >
                      {isProcessingStripe ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="bi bi-credit-card"></i>
                      )}{" "}
                      Pay
                    </button>
                    <Link to={`/payments/${payment.id}`} state={{ returnTo }} className="btn btn-warning">
                      <i className="bi bi-pencil"></i> Edit
                    </Link>
                    <button className="btn btn-danger" onClick={handleDelete}>
                      <i className="bi bi-trash"></i> Delete
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};
