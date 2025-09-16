import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useEffect, useState } from "react";

export const AddPaymentCourtfile = () => {
  const { dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    payment: "",
    courtfile: ""
  });

  const [payments, setPayments] = useState([])
  const [courtfiles, setCourtfiles] = useState([])
  

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

    const fetchPayments = async () => {
    try {
      const response = await fetch(`${API}/api/payments`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data)
      } else {
        console.error("Error fetching payments");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

        const fetchCourtfiles = async () => {
            try {
                const response = await fetch(`${API}/api/courtfiles`);
                if (response.ok) {
                    const data = await response.json();
                    setCourtfiles(data)
                } else {
                    console.error("Error fetching courtfiles");
                }
            } catch (error) {
                console.error("Error:", error);
            }
        };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = { ...formData };

      const response = await fetch(`${API}/api/payments-courtfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({payment_id: payload.payment, courtfile_id: payload.courtfile})
      });

      if (response.ok) {
        const newPayment = await response.json();
        dispatch({ type: "ADD_PAYMENT_COURTFILE", payload: newPayment });
        navigate("/PaymentCourtfiles");
        alert("Payment Courtfile created successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create payment courtfile");
      }
    } catch (err) {
      console.error("Error creating Payment Courtfile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments()
    fetchCourtfiles()
  }, []) 

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>Add New Payment Courtfile</h1>
            <Link to="/PaymentCourtfiles" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left"></i> Back to List
            </Link>
          </div>

          {/* Card */}
          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="payment" className="form-label">Payment *</label>
                  <select class="form-select" aria-label="Default select example"
                    id="payment"
                    name="payment"
                    value={formData.payment}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    defaultValue={""}
                  >
                    <option value="" disabled>Select payment</option>
                    {payments && payments.length > 0 && payments.map(p =>{
                      return(
                    <option key={p.id} value={p.id}>Payment: {p.id}</option>
                      )
                    })}
                  </select>
                </div>

                                <div className="mb-3">
                  <label htmlFor="courtfile" className="form-label">Status *</label>
                  <select class="form-select" aria-label="Default select example"
                    id="courtfile"
                    name="courtfile"
                    value={formData.courtfile}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    defaultValue={""}
                  >
                    <option value="" disabled>Select courtfile</option>
                    {courtfiles && courtfiles.length > 0 && courtfiles.map(c =>{
                      return(
                    <option key={c.id} value={c.id}>Courtfile: {c.id}</option>
                      )
                    })}
                  </select>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to="/PaymentCourtfiles" className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i> Create Payment Courtfile
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
