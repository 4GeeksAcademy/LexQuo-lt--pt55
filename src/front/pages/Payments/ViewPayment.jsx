import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";

export const ViewPayment = () => {
  const { paymentId } = useParams();
  const { store } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/payments";

  const API = import.meta.env.VITE_BACKEND_URL;
  const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  const ssAuth = JSON.parse(sessionStorage.getItem("auth") || "null");
  const token = store?.auth?.token;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const role = (store?.me?.role || "").toLowerCase();

  const isPending = payment?.status === "pending";
  const isAdminOrLawyer = ["admin_user", "lawyer"].includes(role);
  const isClient = role === "client";
  const canShowButtons = isPending; // Sólo con 'pending' se habilitan acciones

  // Función para capitalizar la primera letra
  const capitalizeFirstLetter = (str) => {
    if (!str) return "-";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Función para formatear la fecha
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";

    try {
      const date = new Date(dateString);

      // Formato: yyyy-mm-dd hh:mm
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString; // Retorna el original si hay error
    }
  };

  // Función para copiar al portapapeles
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Reference copied to clipboard!");
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payment)
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

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          <p>Loading payment...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Payment not found"}
        </div>
        <Link to={returnTo} className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back to Payments
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Payment Details</h1>
              <p className="text-muted">ID #{payment.id}</p>
            </div>
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-person-badge"></i> Payment Information
              </h5>
            </div>

            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Amount</label>
                    <p className="fs-6">{payment.amount || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Currency</label>
                    <p className="fs-6">{payment.currency || "-"}</p>
                  </div>

                  {/* Fecha de creación - SIEMPRE visible */}
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Created At</label>
                    <p className="fs-6">{formatDateTime(payment.created_at)}</p>
                  </div>

                  {payment.status == "approved" && payment.stripe_payment_intent_id != null && (
                    <div className="mb-3">
                      <label className="fw-bold text-muted">Paid At</label>
                      <p className="fs-6">{formatDateTime(payment.paid_at)}</p>
                    </div>
                  )}
                  {payment.status === "processing" && payment.stripe_payment_intent_id != null && (
                    <div className="mb-3">
                      <label className="fw-bold text-muted">Processing Since</label>
                      <p className="fs-6">{formatDateTime(payment.updated_at || payment.created_at)}</p>
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Status</label>
                    <p className="fs-6">{capitalizeFirstLetter(payment.status)}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Means</label>
                    <p className="fs-6">{capitalizeFirstLetter(payment.means)}</p>
                  </div>

                  {/* Fecha de última actualización - SIEMPRE visible */}
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Last Updated</label>
                    <p className="fs-6">{formatDateTime(payment.updated_at || payment.created_at)}</p>
                  </div>

                  {payment.status == "approved" && payment.stripe_payment_intent_id != null && (
                    <div className="mb-3">
                      <label className="fw-bold text-muted">Payment ID</label>
                      <p className="fs-6 font-monospace">{payment.stripe_payment_intent_id}</p>
                    </div>
                  )}
                  {payment.status == "processing" && payment.stripe_payment_intent_id != null && (
                    <div className="mb-3">
                      <label className="fw-bold text-muted">Payment ID</label>
                      <p className="fs-6 font-monospace">{payment.stripe_payment_intent_id}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card-footer bg-light">
              <div className="d-flex gap-2 justify-content-end">
                {canShowButtons && (
                  <>
                    {/* CLIENTE: sólo puede pagar */}
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

                    {/* ADMIN/LAWYER: pueden hacer cualquier acción mientras esté 'pending' */}
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
                {/* Si NO está 'pending': no se muestran botones (solo lectura) */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};