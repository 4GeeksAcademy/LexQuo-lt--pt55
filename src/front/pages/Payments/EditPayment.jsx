import { Link, useNavigate, useParams, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditPayment = () => {
  const { store, dispatch } = useGlobalReducer();
  const params = useParams();
  const paymentId = params.paymentId ?? params.id;

  if (!paymentId) {
    return <Navigate to="/payments" replace />;
  }

  const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
  const role = auth?.role;

  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    amount: "",
    currency: "",
    status: "",
    means: "",
  });

  const isLawyerReadOnly = role === "lawyer" && formData.status === "approved";

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayment = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${API}/api/payments/${paymentId}`); // singular
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        ...data
      }));
      setError(null);
    } catch (err) {
      console.error("Error fetching payment:", err);
      setError("Failed to load payment data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (paymentId) fetchPayment();
  }, [paymentId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLawyerReadOnly) return;
    setLoading(true);
    setError(null);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      const response = await fetch(`${API}/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedPayment = await response.json();
        dispatch({ type: "UPDATE_PAYMENT", payload: updatedPayment });
        navigate(`/payments/view/${paymentId}`);
        alert("Payment updated successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update Payment");
      }
    } catch (err) {
      console.error("Error updating Payment:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
          <p>Loading Payment data...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.amount) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
        <Link to="/payments" className="btn btn-primary">Back to Payments</Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Edit Payment</h1>
            <Link to="/payments" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          {/* Form */}
          {isLawyerReadOnly && (
            <div className="alert alert-info mb-3">
              This payment is approved and cannot be edited by a lawyer.
            </div>
          )}
          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="amount" className="form-label">Amount *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    disabled={loading || isLawyerReadOnly}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="currency" className="form-label">Currency *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    required
                    disabled={loading || isLawyerReadOnly}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="status" className="form-label">Status *</label>
                  <select class="form-select" aria-label="Default select example"
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    disabled={loading || isLawyerReadOnly}
                    defaultValue={""}
                  >
                    <option value="">Select status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="means" className="form-label">Means *</label>
                  <input
                    type="means"
                    className="form-control"
                    id="means"
                    name="means"
                    value={formData.means}
                    onChange={handleInputChange}
                    required
                    placeholder="Payment method"
                    disabled={loading || isLawyerReadOnly}
                  />
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to={`/payments/view/${paymentId}`} className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading || isLawyerReadOnly}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i> Update Payment
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
