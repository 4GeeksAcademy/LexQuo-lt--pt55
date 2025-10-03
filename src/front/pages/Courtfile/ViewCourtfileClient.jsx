import { Link, useParams, useNavigate, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useState, useEffect, useMemo } from "react";

import useUnreadBadges from "../../hooks/useUnreadBadges";
import { markNow } from "../../hooks/chatUnread";
import AppNavsShell from "../../components/AppNavsShell";

export const ViewCourtfileClient = () => {
  const { store } = useGlobalReducer();
  const { courtfileId } = useParams();
  const { auth, me } = store;
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;

  // tomar todo del store (PrivateRoute ya rehidrata)
  const token = auth?.token;
  const role = String(auth?.role || "").toLowerCase();
  const authed = !!token;

  // guards
  if (role !== "client") return <Navigate to="/403" replace />;

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
        headers: { Authorization: `Bearer ${token}` }
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
        { headers: { Authorization: `Bearer ${token}` } }
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
        { headers: { Authorization: `Bearer ${token}` } }
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

  // ------------------- 🔔 UNREAD -------------------
  const caseIds = useMemo(() => [Number(courtfileId)], [courtfileId]);
  const { unreadByCase, refresh: refreshUnread } = useUnreadBadges({
    API,
    token,
    userId: me?.id,
    role,
    courtfileIds: caseIds,
  });

  // ---- marcar leído en backend (igual que en los dashboards) ----
  async function markReadBackend(API, token, role, userId, cfid) {
    if (!API || !token || !userId || !cfid) return;
    try {
      await fetch(`${API}/api/messages/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courtfile_id: cfid,
          role: String(role || "").toLowerCase(),
          user_id: userId,
        }),
      });
    } catch { }
  }

  const onOpenChatClick = async (e) => {
    e.preventDefault();
    const cfid = Number(courtfileId);
    if (me?.id && cfid) {
      markNow(me.id, cfid);
      await markReadBackend(API, token, role, me.id, cfid);
      refreshUnread();
      navigate(`/chats/${cfid}`, {
        state: {
          courtfileId: cfid,
          courtfileNumber: courtfile?.case_number,
          courtfileTitle: courtfile?.title,
          senderRole: "client",
          returnTo: `/courtfiles/ViewCourtfileClient/${cfid}`,
        },
      });
    }
  };

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
      <AppNavsShell>
        <div className="container-fluid px-0 px-md-3">
          <div className="row">
            <div className="col-12 col-xl-8 col-xxl-7 mx-auto">
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 mb-0">Loading courtfile...</p>
              </div>
            </div>
          </div>
        </div>
      </AppNavsShell>
    );
  }

  if (error || !courtfile) {
    return (
      <AppNavsShell>
        <div className="container-fluid px-0 px-md-3">
          <div className="row">
            <div className="col-12 col-xl-8 col-xxl-7 mx-auto">
              <div className="alert alert-danger mt-4">
                <i className="bi bi-exclamation-triangle"></i> {error || "Courtfile not found"}
              </div>
              <Link to="/DashboardClient" className="btn btn-primary">
                <i className="bi bi-arrow-left"></i> Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </AppNavsShell>
    );
  }

  return (
    <AppNavsShell>
      <div className="container-fluid px-0 px-md-3">

        {/* ===== Breadcrumbs ===== */}
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to="/DashboardClient">Dashboard</Link>
            </li>
            <li className="breadcrumb-item">
              <Link to="/courtfiles">Courtfiles</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              {courtfile.case_number || "—"}
              {courtfile.title ? ` — ${courtfile.title}` : ""}
            </li>
          </ol>
        </nav>

        {/* ===== Title + Actions (alineado al MAIN, sin centrar) ===== */}
        <div className="row g-3 mb-3">
          <div className="col-12 ">
            <div className="d-flex justify-content-between align-items-center py-2">
              <h2 className="mb-0 mt-1">Courtfile details</h2>

              <div className="position-relative d-flex gap-2 flex-wrap">
                <button
                  className="px-3 text-body text-decoration-none btn btn-link position-relative"
                  onClick={(e) => onOpenChatClick(e)}
                  title="Open chat"
                >
                  <span className="position-relative">
                    <i className="bi bi-chat-dots me-2" />
                    {unreadByCase.get(Number(courtfileId))?.hasUnread && (
                      <span
                        className="position-absolute bg-danger border border-light rounded-circle"
                        style={{ top: "-2px", right: "2px", width: "10px", height: "10px" }}
                      />
                    )}
                  </span>
                  Chat
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Layout: MAIN + ASIDE (como lawyer) ===== */}
        <div className="row g-4">
          {/* MAIN: Case info + Appointments */}
          <div className="col-12 col-xl-7 col-xxl-8">
            {/* Card: Case info */}
            <div className="card">
              <div className="card-body">
                {/* Case Number */}
                <div className="mb-4">
                  <div className="text-uppercase text-muted fw-bold small section-title">Case Number</div>
                  <div className="fs-5">{courtfile.case_number || "—"}</div>
                </div>

                {/* Grid 2 columnas */}
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="text-uppercase text-muted fw-bold small section-title">Title</div>
                      <div>{courtfile.title || "—"}</div>
                    </div>
                    <div className="mb-0">
                      <div className="text-uppercase text-muted fw-bold small section-title">Jurisdiction</div>
                      <span className="badge-phoenix badge badge-phoenix-secondary">
                        {courtfile.jurisdiction || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="text-uppercase text-muted fw-bold small section-title">Status</div>
                      <span
                        className={`fs-10 badge-phoenix badge ${courtfile.status ? "badge-phoenix-success" : "badge-phoenix-secondary"
                          }`}
                      >
                        {courtfile.status ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mb-0">
                      <div className="text-uppercase text-muted fw-bold small section-title">Court</div>
                      <div>{courtfile.court || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mt-4">
                  <div className="text-uppercase text-muted fw-bold small section-title mb-2">Description</div>
                  <div className="p-3 rounded bg-body-secondary">
                    {courtfile.description || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Appointments ===== */}
            <div className="d-flex align-items-center justify-content-between mt-4">
              <h2 className="h5 text-uppercase text-muted mb-0 fw-bold">Appointments</h2>
            </div>

            {loadingAppointments && <p className="mt-2">Loading appointments…</p>}
            {appointmentsErr && <div className="alert alert-danger mt-2">{appointmentsErr}</div>}
            {!loadingAppointments && !appointmentsErr && caseAppointments.length === 0 && (
              <div className="alert text-secondary bg-transparent border-0 mt-2">No appointments scheduled for this case.</div>
            )}

            {!loadingAppointments && caseAppointments.length > 0 && (
              <div className="table-responsive mt-2">
                <table className="table table-hover align-middle table-modern mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="px-3">Title</th>
                      <th className="px-3">Date</th>
                      <th className="px-3">Time</th>
                      <th className="pe-8 text-center">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseAppointments.map(ap => (
                      <tr
                        key={ap.relation_id}
                        className="table-row-clickable"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          navigate(`/appointments/view/${ap.appointment_id}`, {
                            state: {
                              returnTo: `/courtfiles/ViewCourtfileClient/${courtfile.id}`,
                              courtfileId: courtfile.id,
                              courtfileNumber: courtfile.case_number,
                              courtfileTitle: courtfile.title
                            },
                          })
                        }
                      >
                        <td className="px-3">{ap.appointment_title}</td>
                        <td className="px-3">{ap.appointment_date}</td>
                        <td className="px-3">
                          {ap.starts_at} - {ap.ends_at}
                        </td>
                        <td className="px-3">{ap.appointment_location || "Not specified"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ASIDE: Payments en su propia card (como en lawyer) */}
          <div className="col-12 col-xl-5 col-xxl-4">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <h2 className="h3 mb-0 fw-bold">Payments</h2>
                </div>

                {loadingPayments && <p className="mt-2">Loading payments…</p>}
                {paymentsErr && <div className="alert alert-danger mt-2">{paymentsErr}</div>}
                {!loadingPayments && !paymentsErr && casePayments.length === 0 && (
                  <div className="alert text-secondary bg-transparent border-0 mt-2">No payments for this case.</div>
                )}

                {!loadingPayments && casePayments.length > 0 && (
                  <div className="table-responsive mt-2">
  <table className="table table-hover align-middle table-modern mb-0">
    <thead className="table-light">
      <tr>
        <th className="px-3" style={{ width: "20px" }}>ID</th>
        <th className="px-3">Amount</th>
        <th className="px-3">Currency</th>
        <th className="px-3">Status</th>
        <th className="px-3">Means</th>
        <th className="px-3">Paid At</th>
        <th className="text-end px-3" style={{ minWidth: "100px" }}>Actions</th>
      </tr>
    </thead>
    <tbody>
      {casePayments.map(p => (
        <tr
          key={p.relation_id}
          className="table-row-clickable"
          style={{ cursor: "pointer" }}
          onClick={() =>
            navigate(`/payments/view/${p.id}`, {
              state: {
                returnTo: `/courtfiles/ViewCourtfileClient/${courtfile.id}`,
                courtfileId: courtfile.id,
                courtfileNumber: courtfile.case_number,
                courtfileTitle: courtfile.title
              }
            })
          }
        >
          <td className="px-3">{p.id}</td>
          <td className="px-3">${p.amount}</td>
          <td className="px-3">{p.currency}</td>
          <td className="px-3">
            <span
              className={`badge badge-phoenix ${
                p.status === "approved"
                  ? "badge-phoenix-success"
                  : p.status === "pending"
                  ? "badge-phoenix-warning"
                  : "badge-phoenix-danger"
              }`}
            >
              {p.status || "—"}
            </span>
          </td>
          <td className="px-3">{p.means || "—"}</td>
          <td className="px-3">{p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</td>
          <td className="text-center px-3">
            {p.status === "pending" ? (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // evita navegar al hacer click
                  handlePay(p.id);
                }}
                className="btn btn-sm btn-success"
                style={{ minWidth: "80px" }}
              >
                <i className="bi bi-cash"></i> Pay
              </button>
            ) : (
              <span className="text-body-tertiary">—</span>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

                )}

                {/* meta info */}
                {!loadingPayments && casePayments.length > 0 && (
                  <p className="text-body-tertiary small mt-2 mb-0">
                    {casePayments.filter(p => p.status === "pending").length} pending •{" "}
                    {casePayments.filter(p => p.status === "approved").length} approved
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );


};
