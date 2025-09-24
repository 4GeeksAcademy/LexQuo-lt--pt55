import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const AddPayment = () => {
  const { dispatch, store } = useGlobalReducer();
  const navigate = useNavigate();
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;

  const token = store?.auth?.token;

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

  const meansOptions = [
    { value: "TDC", label: "TDC - Credit Card" }

  ];

  const [formData, setFormData] = useState({
    amount: "",
    currency: "",
    means: "",
    courtfile_id: preselectedCourtfileId ? String(preselectedCourtfileId) : "",
  });

  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);

  // Para dropdown cuando NO viene preseleccionado
  const [myCases, setMyCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [preselectedCf, setPreselectedCf] = useState(
    preselectedCourtfileNumber ? { case_number: preselectedCourtfileNumber, title: preselectedCourtfileTitle } : null
  );

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoadingCases(true);

        // Si vino preseleccionado, sólo completamos el texto (por si faltaba number/title) y no cargamos dropdown
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

        // Si NO viene preseleccionado, traemos los expedientes:
        // - si está logueado lawyer, usamos /api/lawyers-courtfiles (filtrados a sus casos)
        // - si no, /api/courtfiles
        const resp = await fetch(`${API}/api/lawyers-courtfiles`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(e.error || `HTTP ${resp.status}`);
        }
        const data = await resp.json();

        const mapped = data.map(r => ({
          id: r.courtfile.id,
          number: r.courtfile.case_number,
          title: r.courtfile.title,
        }));

        setMyCases(mapped);
      } catch (err) {
        setError(err.message || "Error fetching courtfiles");
      } finally {
        setLoadingCases(false);
      }
    };

    fetchCases();
  }, [API, token, preselectedCourtfileId, preselectedCf]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.courtfile_id) {
        throw new Error("Please select a courtfile to link this payment.");
      }

      if (!formData.currency) {
        throw new Error("Please select a currency.");
      }

      if (!formData.means) {
        throw new Error("Please select a payment method.");
      }

      // 1) Crear Payment
      const response = await fetch(`${API}/api/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: formData.amount,
          currency: formData.currency,
          means: formData.means,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create payment");
      }

      const newPayment = await response.json();
      dispatch({ type: "ADD_PAYMENT", payload: newPayment });

      // 2) Vincular con courtfile (OBLIGATORIO)
      setLinking(true);
      const linkResp = await fetch(`${API}/api/payments-courtfile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_id: newPayment.id,
          courtfile_id: Number(formData.courtfile_id),
        }),
      });

      if (!linkResp.ok) {
        const e = await linkResp.json().catch(() => ({}));
        throw new Error(e.error || `Failed to link payment (HTTP ${linkResp.status})`);
      }

      alert("Payment created and linked successfully!");
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error("Error creating & linking Payment:", err);
      setError(err.message);
    } finally {
      setLinking(false);
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

          {preselectedCourtfileId ? (
            <span className="badge bg-dark mt-2 mb-2">
              Related to Courtfile {preselectedCf?.case_number || "—"}
              {preselectedCf?.title ? ` — ${preselectedCf.title}` : ""}
            </span>
          ) : (
            <div className="mb-3">
              <label htmlFor="courtfile_id" className="form-label">
                Link to Courtfile *
              </label>
              <select
                className="form-select"
                id="courtfile_id"
                name="courtfile_id"
                value={formData.courtfile_id}
                onChange={handleInputChange}
                required
                disabled={loading || loadingCases}
              >
                <option value="">Select a courtfile</option>
                {myCases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.number} — {c.title}
                  </option>
                ))}
              </select>
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

                {/* Amount */}
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
                    disabled={loading}
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
                    disabled={loading}
                  >
                    <option value="">Select currency</option>
                    {currencyOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Means - Desplegable */}
                <div className="mb-3">
                  <label htmlFor="means" className="form-label">Payment Method *</label>
                  <select
                    className="form-select"
                    id="means"
                    name="means"
                    value={formData.means}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select payment method</option>
                    {meansOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <Link to={returnTo} className="btn btn-secondary me-md-2">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={loading || linking}>
                    {loading || linking ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        {linking ? " Linking..." : " Creating..."}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle"></i> Create
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