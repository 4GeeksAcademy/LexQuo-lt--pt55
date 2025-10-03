import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";

export const AddPayment = () => {
  const { dispatch, store } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  // Vienen desde ViewCourtfileLawyer (si abrís desde el caso)
  const preselectedCourtfileId = location.state?.courtfileId || null;
  const preselectedCourtfileNumber = location.state?.courtfileNumber || null;
  const preselectedCourtfileTitle = location.state?.courtfileTitle || null;
  const returnTo = location.state?.returnTo || "/payments";

  const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "ARS", label: "ARS - Argentine Peso" },
    { value: "COP", label: "COP - Colombian Peso" },
    { value: "MXN", label: "MXN - Mexican Peso" }
  ];

  const meansOptions = [{ value: "TDC", label: "TDC - Credit Card" }];

  const [formData, setFormData] = useState({
    amount: "",
    currency: "",
    means: "",
    courtfile_id: preselectedCourtfileId ? String(preselectedCourtfileId) : "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Para dropdown cuando NO viene preseleccionado
  const [myCases, setMyCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [preselectedCf, setPreselectedCf] = useState(
    preselectedCourtfileNumber
      ? { case_number: preselectedCourtfileNumber, title: preselectedCourtfileTitle }
      : null
  );

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoadingCases(true);

        if (preselectedCourtfileId) {
          if (!preselectedCf) {
            const r = await fetch(`${API}/api/courtfiles/${preselectedCourtfileId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (r.ok) {
              const d = await r.json();
              setPreselectedCf({ case_number: d.case_number, title: d.title });
            }
          }
          setMyCases([]);
          return;
        }

        const listEndpoint =
          role === "admin_user"
            ? `${API}/api/courtfiles`
            : `${API}/api/lawyers-courtfiles`;

        const resp = await fetch(listEndpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${resp.status}`);
        }
        const data = await resp.json();

        const mapped = (data || []).map((r) => {
          const cf = r.courtfile ?? r;
          return {
            id: cf.id,
            number: cf.case_number,
            title: cf.title,
          };
        });

        setMyCases(mapped);
      } catch (err) {
        setError(err.message || "Error fetching courtfiles");
      } finally {
        setLoadingCases(false);
      }
    };

    fetchCases();
  }, [API, token, preselectedCourtfileId, preselectedCf, role]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.courtfile_id) throw new Error("Please select a courtfile to link this payment.");
      if (!formData.currency) throw new Error("Please select a currency.");
      if (!formData.means) throw new Error("Please select a payment method.");

      const response = await fetch(`${API}/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(formData.amount),
          currency: formData.currency,
          means: formData.means,
          courtfile_id: Number(formData.courtfile_id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create payment");
      }

      const newPayment = await response.json();
      dispatch({ type: "ADD_PAYMENT", payload: newPayment });

      alert("Payment created and linked successfully!");
      navigate(`/payments/view/${newPayment.id}`, {
        replace: true,
        state: {
          returnTo,
          courtfileId: Number(formData.courtfile_id),
          courtfileNumber: preselectedCourtfileNumber || undefined,
          courtfileTitle: preselectedCourtfileTitle || undefined,
        },
      });
    } catch (err) {
      console.error("Error creating Payment:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppNavsShell>
      <div className="container mt-4 add-page">
        <div className="row">
          <div className="col-12 col-md-8">

            {/* Breadcrumb */}
            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to={returnTo || "/payments"}>Payments</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Add
                </li>
              </ol>
            </nav>

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-4">
              {/* Título */}
              <h1 className="h2 fw-bold mb-0 fs-6 fs-md-5">
                Add New Payment
              </h1>

              {/* Botones */}
              <div className="d-flex gap-2 mt-2 mt-md-0 align-self-end align-self-md-center">
                <Link to={returnTo} className="btn btn-phoenix btn-phoenix-secondary btn-sm fs-10 fs-md-9">
                  Cancel
                </Link>
                <button
                  type="submit"
                  form="paymentForm" // engancha con el id del form
                  className="btn btn-phoenix btn-phoenix-primary btn-sm fs-10 fs-md-9"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </div>


            {/* Courtfile context / selector */}
            {preselectedCourtfileId ? (
              <span className="badge bg-dark mt-1 mb-3">
                Related to Courtfile {preselectedCf?.case_number || "—"}
                {preselectedCf?.title ? ` — ${preselectedCf.title}` : ""}
              </span>
            ) : (
              <div className="form-floating mb-3">
                <select
                  className="form-select"
                  id="courtfile_id"
                  name="courtfile_id"
                  value={formData.courtfile_id}
                  onChange={handleInputChange}
                  required
                  disabled={loading || loadingCases}
                >
                  <option value=""></option>
                  {myCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.number} — {c.title}
                    </option>
                  ))}
                </select>
                <label htmlFor="courtfile_id">Link to Courtfile *</label>
              </div>
            )}

            {/* Form */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-triangle me-2" /> {error}
              </div>
            )}

            <form id="paymentForm" onSubmit={handleSubmit}>
              {/* Amount */}
              <div className="form-floating mb-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  id="amount"
                  name="amount"
                  placeholder=" "
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="amount">Amount *</label>
              </div>

              {/* Currency */}
              <div className="form-floating mb-3">
                <select
                  className="form-select"
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value=""></option>
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="currency">Currency *</label>
              </div>

              {/* Payment Method */}
              <div className="form-floating mb-3">
                <select
                  className="form-select"
                  id="means"
                  name="means"
                  value={formData.means}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value=""></option>
                  {meansOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="means">Payment Method *</label>
              </div>

            </form>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};
