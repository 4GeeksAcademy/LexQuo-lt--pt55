import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState } from "react";

export const AddPayment = () => {
  const { dispatch, store } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = (store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null"))?.token;

  // vienen de ViewCourtfileLawyer
  const courtfileId = location.state?.courtfileId || null;
  const returnTo = location.state?.returnTo || "/payments";

  const [formData, setFormData] = useState({
    amount: "",
    currency: "",
    means: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1) Crear Payment
      const response = await fetch(`${API}/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create payment");
      }

      const newPayment = await response.json();
      dispatch({ type: "ADD_PAYMENT", payload: newPayment });

      // 2) Linkear al Courtfile (si venía el id)
      if (courtfileId) {
        const linkResp = await fetch(`${API}/api/payments-courtfile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            payment_id: newPayment.id,
            courtfile_id: Number(courtfileId)
          })
        });
        if (!linkResp.ok) {
          const e = await linkResp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${linkResp.status}`);
        }
      }

      alert("Payment created and linked successfully!");
      navigate(returnTo);
    } catch (err) {
      console.error("Error creating & linking Payment:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Add New Payment</h1>
            <Link to={returnTo} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back
            </Link>
          </div>

          <div className="card">
            <div className="card-body">
              {courtfileId && (
                <div className="alert alert-info">
                  Este pago se linkeará al expediente <b>#{courtfileId}</b>.
                </div>
              )}

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
                    className="form-control"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    placeholder="Amount"
                    disabled={loading}
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
                    placeholder="e.g., ARS / USD"
                    disabled={loading}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="means" className="form-label">Means *</label>
                  <input
                    type="text"
                    className="form-control"
                    id="means"
                    name="means"
                    value={formData.means}
                    onChange={handleInputChange}
                    required
                    placeholder="Payment method"
                    disabled={loading}
                  />
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to={returnTo} className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i> Create & Link
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
