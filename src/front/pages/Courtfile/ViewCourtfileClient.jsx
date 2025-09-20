import { Link, useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useState, useEffect } from "react";

export const ViewCourtfileClient = () => {
  const { store, dispatch } = useGlobalReducer();
  const { courtfileId } = useParams();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
  const token = auth?.token;
  const authed = !!token;

  // ------------------- COURTFILE -------------------
  const [courtfile, setCourtfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ------------------- APPOINTMENTS (YA FILTRADOS) -------------------
  const [caseAppointments, setCaseAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsErr, setAppointmentsErr] = useState("");

  // ------------------- PAYMENTS (YA FILTRADOS) -------------------
  const [casePayments, setCasePayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsErr, setPaymentsErr] = useState("");

  // ------------------- FETCHERS -------------------
  const fetchCourtfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/courtfiles/${courtfileId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCourtfile(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching courtfile:", err);
      setError("Failed to load courtfile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      setAppointmentsErr("");
      const resp = await fetch(
        `${API}/api/appointments-courtfiles`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const idNum = Number(courtfileId);
      const enriched = data.map(a => ({ relation_id: a.id, ...a }));
      const filtered = enriched.filter(a =>
        a.courtfile_id === idNum || a?.courtfile?.id === idNum
      );
      setCaseAppointments(filtered);
    } catch (e) {
      setAppointmentsErr(e.message || "Error fetching appointments");
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      setPaymentsErr("");
      const idNum = Number(courtfileId);
      const resp = await fetch(
        `${API}/api/payments-courtfile?courtfile_id=${idNum}&expand=payment`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const rows = await resp.json(); // [{ id (relation), courtfile_id, payment: {...} }]
      setCasePayments(rows.map(r => ({ relation_id: r.id, ...(r.payment || {}) })));
    } catch (e) {
      setPaymentsErr(e.message || "Error fetching payments");
    } finally {
      setLoadingPayments(false);
    }
  };

  // ------------------- EFFECTS -------------------
  useEffect(() => {
    if (!courtfileId) return;
    fetchCourtfile();
  }, [courtfileId, token]);

  useEffect(() => {
    if (!authed || !courtfileId) return;
    fetchAppointments();
    fetchPayments();
  }, [API, authed, token, courtfileId]);

  // ------------------- HELPERS -------------------
  const handlePay = async (paymentId) => {
    if (!authed) return;
    try {
      const resp = await fetch(`${API}/api/payments/${paymentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "approved" })
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      await fetchPayments(); // refrescar lista
      alert("Payment approved successfully!");
    } catch (err) {
      console.error("Error approving payment:", err);
      alert(err.message || "Error approving payment");
    }
  };

  // ------------------- RENDER -------------------
  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading courtfile...</p>
        </div>
      </div>
    );
  }

  if (error || !courtfile) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle"></i> {error || "Courtfile not found"}
        </div>
        <Link to="/DashboardClient" className="btn btn-primary">
          <i className="bi bi-arrow-left"></i> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-10">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1>Courtfile Details</h1>
              <p className="text-muted">Case #{courtfile.id}</p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/DashboardClient" className="btn btn-outline-secondary">
                <i className="bi bi-grid"></i> Dashboard
              </Link>
            </div>
          </div>

          <Link
            to="/ChatOnDemand"
            state={{
              courtfileId: courtfile.id,
              senderRole: "lawyer",
              returnTo: `/courtfiles/ViewCourtfileLawyer/${courtfile.id}`
            }}
            className="btn btn-outline-success"
          >
            <i className="bi bi-chat-dots"></i> Chat
          </Link>

          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-file-earmark-text"></i> Case Information
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Case Number</label>
                    <p className="fs-5">{courtfile.case_number}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Title</label>
                    <p className="fs-6">{courtfile.title}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Jurisdiction</label>
                    <p>
                      <span className="badge bg-secondary">{courtfile.jurisdiction}</span>
                    </p>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Court</label>
                    <p>{courtfile.court}</p>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Status</label>
                    <p>
                      <span className={`badge ${courtfile.status ? "bg-success" : "bg-danger"}`}>
                        {courtfile.status ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label className="fw-bold text-muted">Description</label>
                    <div className="card bg-light">
                      <div className="card-body">
                        <p className="card-text">{courtfile.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* APPOINTMENTS */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">APPOINTMENTS</h3>
            </div>

            {loadingAppointments && <p className="mt-3">Loading appointments...</p>}
            {appointmentsErr && <div className="alert alert-danger mt-3">{appointmentsErr}</div>}
            {!loadingAppointments && !appointmentsErr && caseAppointments.length === 0 && (
              <div className="alert alert-info mt-3">No appointments scheduled for this case.</div>
            )}

            {!loadingAppointments && caseAppointments.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseAppointments.map(ap => (
                      <tr key={ap.relation_id}>
                        <td>{ap.appointment_title}</td>
                        <td>{ap.appointment_date}</td>
                        <td>{ap.starts_at} - {ap.ends_at}</td>
                        <td>{ap.appointment_location || 'Not specified'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PAYMENTS */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center">
              <h3 className="m-0">PAYMENTS</h3>
            </div>

            {loadingPayments && <p className="mt-3">Loading payments...</p>}
            {paymentsErr && <div className="alert alert-danger mt-3">{paymentsErr}</div>}
            {!loadingPayments && !paymentsErr && casePayments.length === 0 && (
              <div className="alert alert-info mt-3">No payments for this case.</div>
            )}

            {!loadingPayments && casePayments.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ width: "90px" }}>Payment</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Status</th>
                      <th>Means</th>
                      <th>Paid At</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casePayments.map(p => (
                      <tr key={p.relation_id}>
                        <td>#{p.id}</td>
                        <td>{p.amount}</td>
                        <td>{p.currency}</td>
                        <td>
                          <span className={`badge ${p.status === "approved" ? "bg-success"
                            : p.status === "pending" ? "bg-warning"
                              : "bg-danger"
                            }`}>
                            {p.status || "—"}
                          </span>
                        </td>
                        <td>{p.means || "—"}</td>
                        <td>{p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</td>
                        <td className="text-end d-flex gap-1 justify-content-end">
                          {p.status === "pending" && (
                            <button
                              onClick={() => handlePay(p.id)}
                              className="btn btn-sm btn-success"
                            >
                              <i className="bi bi-cash"></i> Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};