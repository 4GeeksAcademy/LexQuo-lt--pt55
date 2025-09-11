import { Link, useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const ViewPayment = () => {
  const { dispatch } = useGlobalReducer();
  const { paymentId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/api/payments/${paymentId}`); // singular
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    try {
      const response = await fetch(`${API}/api/payments/${paymentId}`, { method: "DELETE" });
      if (response.ok) {
        dispatch({ type: "DELETE_PAYMENT", payload: Number(paymentId) || paymentId });
        navigate("/payments");
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
        <Link to="/payments" className="btn btn-primary">
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
            <Link to="/payments" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
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
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Status</label>
                    <p className="fs-6">{payment.status || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Means</label>
                    <p className="fs-6">{payment.means || "-"}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Paid At</label>
                    <p className="fs-6">{payment.paid_at || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer bg-light">
              <div className="d-flex gap-2 justify-content-end">
                <Link to="/payments" className="btn btn-outline-secondary">
                  <i className="bi bi-arrow-left"></i> Back
                </Link>
                <Link to={`/payments/${payment.id}`} className="btn btn-warning">
                  <i className="bi bi-pencil"></i> Edit
                </Link>
                <button className="btn btn-danger" onClick={handleDelete}>
                  <i className="bi bi-trash"></i> Delete
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
