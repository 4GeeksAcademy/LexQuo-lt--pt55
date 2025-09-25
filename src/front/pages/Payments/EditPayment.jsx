import { Link, useNavigate, useParams, Navigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditPayment = () => {
  const { store, dispatch } = useGlobalReducer();
  const params = useParams();
  const paymentId = params.paymentId ?? params.id;
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo || `/payments/view/${paymentId}`;

  if (!paymentId) {
    return <Navigate to="/payments" replace />;
  }

  const token = store?.auth?.token;
  const role = (me?.role || "").toLowerCase();

  const API = import.meta.env.VITE_BACKEND_URL;

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer";

  if (!allowed) return <Navigate to="/403" replace />;


  // Opciones para los desplegables
  const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "ARS", label: "ARS - Argentine Peso" },
    { value: "COP", label: "COP - Colombian Peso" },
    { value: "MXN", label: "MXN - Mexican Peso" }
  ];

  const meansOptions = [
    { value: "TDC", label: "TDC - Credit Card" }
  ];

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ];

  const [formData, setFormData] = useState({
    amount: "",
    currency: "",
    status: "",
    means: "",
  });

  const isReadOnly = !(["admin_user", "lawyer"].includes(role) && formData.status === "pending");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  // Función para capitalizar la primera letra
  const capitalizeFirstLetter = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const fetchPayment = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${API}/api/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
  }, [paymentId, token]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    setLoading(true);
    setError(null);
    try {
      const payload = { ...formData };

      const response = await fetch(`${API}/api/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedPayment = await response.json();
        dispatch({ type: "UPDATE_PAYMENT", payload: updatedPayment });
        navigate(returnTo, { replace: true });
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
        <Link to={returnTo} className="btn btn-primary">Back</Link>
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
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          {/* Form */}
          {isReadOnly && (
            <div className="alert alert-info mb-3">
              This payment can only be edited by admin or lawyer while status is <strong>pending</strong>.
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
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                    disabled={loading || isLawyerReadOnly}
                  />
                </div>

                {/* Currency - Desplegable */}
                <div className="mb-3">
                  <label htmlFor="currency" className="form-label">Currency *</label>
                  <select
                    className="form-select"
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    required
                    disabled={loading || isLawyerReadOnly}
                  >
                    <option value="">Select currency</option>
                    {currencyOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status - Desplegable */}
                <div className="mb-3">
                  <label htmlFor="status" className="form-label">Status *</label>
                  <select
                    className="form-select"
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    disabled={loading || isLawyerReadOnly}
                  >
                    <option value="">Select status</option>
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Means - Desplegable */}
                <div className="mb-3">
                  <label htmlFor="means" className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    id="means"
                    name="means"
                    value={formData.means}
                    onChange={handleInputChange}
                    disabled={loading || isReadOnly}
                  >
                    <option value="">Select payment method</option>
                    {meansOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                  <Link to={returnTo} className="btn btn-secondary me-md-2">Cancel</Link>
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