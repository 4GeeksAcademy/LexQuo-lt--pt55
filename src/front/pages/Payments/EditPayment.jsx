import { Link, useNavigate, useParams, Navigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect, useMemo } from "react";
import AppNavsShell from "../../components/AppNavsShell";

export const EditPayment = () => {
  const { store, dispatch } = useGlobalReducer();
  const params = useParams();
  const paymentId = params.paymentId ?? params.id;
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo || `/payments/view/${paymentId}`;

  const [serverStatus, setServerStatus] = useState(null);

  if (!paymentId) return <Navigate to="/payments" replace />;

  const token = store?.auth?.token;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  const API = import.meta.env.VITE_BACKEND_URL;

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  // canEdit basado en lo que dice el servidor
  const canEdit =
    role === "admin_user" ||
    (role === "lawyer" && serverStatus === "pending");

  const isReadOnly = !canEdit;

  // Opciones desplegables
  const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "ARS", label: "ARS - Argentine Peso" },
    { value: "COP", label: "COP - Colombian Peso" },
    { value: "MXN", label: "MXN - Mexican Peso" },
  ];

  const meansOptions = [{ value: "TDC", label: "TDC - Credit Card" }];

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  const [formData, setFormData] = useState({
    amount: "",
    currency: "",
    status: "",
    means: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Payment
  const fetchPayment = async () => {
    try {
      setFetching(true);
      const resp = await fetch(`${API}/api/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      setFormData({
        amount: data.amount ?? "",
        currency: data.currency ?? "",
        means: data.means ?? "",
        status: data.status ?? "",
      });
      setServerStatus(String(data.status || "").toLowerCase());
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    setLoading(true);
    setError(null);

    try {
      const basePayload = {
        amount: formData.amount,
        currency: formData.currency,
        means: formData.means,
      };

      const payload =
        role === "admin_user"
          ? { ...basePayload, status: formData.status }
          : basePayload;

      const resp = await fetch(`${API}/api/payments/${paymentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update Payment");
      }

      const updated = await resp.json();
      dispatch({ type: "UPDATE_PAYMENT", payload: updated });
      alert("Payment updated successfully!");
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("Error updating Payment:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const crumbs = useMemo(() => {
    return [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Payments", to: "/payments" },
      { label: `Edit #${paymentId}`, to: null },
    ];
  }, [paymentId]);

  // ---- Loading/Error ----
  if (fetching) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border" role="status"></div>
        <p>Loading Payment data...</p>
      </div>
    );
  }

  if (error && !formData.amount) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error}
        </div>
        <Link to={returnTo} className="btn btn-primary">
          Back
        </Link>
      </div>
    );
  }

  return (
    <AppNavsShell>
      <div className="container add-page">
        <div className="row">
          <div className="col-lg-9">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="mb-4">
              <ol className="breadcrumb small mb-0">
                {crumbs.map((c, i) => {
                  const isLast = i === crumbs.length - 1;
                  return (
                    <li
                      key={i}
                      className={`breadcrumb-item ${isLast ? "active" : ""}`}
                      {...(isLast ? { "aria-current": "page" } : {})}
                    >
                      {isLast || !c.to ? (
                        <span className="text-body">{c.label}</span>
                      ) : (
                        <Link to={c.to} state={{ returnTo }}>
                          {c.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-5 fw-bold mb-0">Edit Payment</h1>
              <div className="d-flex gap-2">
                <Link
                  to={returnTo}
                  className="btn btn-phoenix btn-phoenix-secondary"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  form="paymentForm"
                  className="btn btn-phoenix btn-phoenix-primary"
                  disabled={loading || isReadOnly}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2" />
                      Update Payment
                    </>
                  )}
                </button>
              </div>
            </div>

            {!canEdit && (
              <div className="alert alert-info mb-3">
                {role === "lawyer" ? (
                  <>
                    Only <strong>pending</strong> payments can be edited by lawyers.
                  </>
                ) : (
                  <>You don't have permission to edit this payment.</>
                )}
              </div>
            )}

            {error && (
              <div className="alert alert-danger d-flex align-items-center">
                <i className="bi bi-exclamation-triangle me-2" /> {error}
              </div>
            )}

            {/* Form */}
            <form id="paymentForm" onSubmit={handleSubmit}>
              {/* Amount */}
              <div className="form-floating mb-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control form-control-ux"
                  id="amount"
                  name="amount"
                  placeholder=" "
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  disabled={loading || isReadOnly}
                />
                <label htmlFor="amount">Amount *</label>
              </div>

              {/* Currency */}
              <div className="form-floating mb-3">
                <select
                  className="form-select form-control-ux"
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  required
                  disabled={loading || isReadOnly}
                >
                  <option value=""></option>
                  {currencyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="currency">Currency *</label>
              </div>

              {/* Status */}
              <div className="form-floating mb-3">
                <select
                  className="form-select form-control-ux"
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  disabled={loading || isReadOnly || role !== "admin_user"}
                >
                  <option value=""></option>
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="status">Status *</label>
              </div>

              {/* Means */}
              <div className="form-floating mb-4">
                <select
                  className="form-select form-control-ux"
                  id="means"
                  name="means"
                  value={formData.means}
                  onChange={handleInputChange}
                  disabled={loading || isReadOnly}
                >
                  <option value=""></option>
                  {meansOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="means">Payment Method</label>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};
