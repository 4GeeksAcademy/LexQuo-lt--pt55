import { useNavigate, Navigate } from "react-router-dom";
import { LogoutButton } from "../../components/LogoutButton";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useEffect, useState, useMemo } from "react";
import AppNavsShell from "../../components/AppNavsShell";

import useUnreadBadges from "../../hooks/useUnreadBadges";
import { markNow } from "../../hooks/chatUnread";
import DashboardCalendar from "../../components/DashboardCalendar";
import PaymentBadge from "../../components/PaymentBadge";

export const DashboardClient = () => {
  const API = import.meta.env.VITE_BACKEND_URL;
  const { store } = useGlobalReducer();
  const navigate = useNavigate();

  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  if (role !== "client") return <Navigate to="/403" replace />;

  const currentClientId = me?.id || null;
  const name = `${me?.firstname ?? ""} ${me?.lastname ?? ""}`.trim();

  // ===== COURTFILES =====
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [casesErr, setCasesErr] = useState("");

  const fetchClientData = async () => {
    try {
      setLoadingCases(true);
      const resp = await fetch(`${API}/api/clients-courtfiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to fetch courtfiles");

      const normalized = await Promise.all(
        (Array.isArray(data) ? data : []).map(async (row) => {
          const cf = row?.courtfile || {};

          // Lawyers vinculados
          let lawyers = [];
          try {
            const lr = await fetch(`${API}/api/lawyers-courtfiles?courtfile_id=${cf.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const ldata = lr.ok ? await lr.json() : [];
            lawyers = ldata.map((l) => ({
              id: l.lawyer_id,
              name: l.lawyer_name,
              email: l.lawyer_email,
              phone: l.lawyer_phone,
            }));
          } catch {
            lawyers = [];
          }

          // Payments vinculados
          let payments = [];
          try {
            const pr = await fetch(`${API}/api/payments-courtfile?courtfile_id=${cf.id}&expand=payment`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const pdata = pr.ok ? await pr.json() : [];
            payments = pdata.map((pc) => pc.payment || {});
          } catch {
            payments = [];
          }

          return {
            id: cf.id,
            case_number: cf.case_number,
            title: cf.title,
            jurisdiction: cf.jurisdiction,
            court: cf.court,
            status: cf.status,
            assigned_lawyers: lawyers,
            payments,
          };
        })
      );

      setCases(normalized);
    } catch (error) {
      setCasesErr(error.message);
    } finally {
      setLoadingCases(false);
    }
  };

  // ===== UNREAD =====
  const caseIds = useMemo(() => (Array.isArray(cases) ? cases.map((c) => c.id) : []), [cases]);
  const { totalUnread, refresh: refreshUnread } = useUnreadBadges({
    API,
    token,
    userId: me?.id,
    role,
    courtfileIds: caseIds,
  });

  async function markReadBackend(API, token, role, cfid) {
    const userId = me?.id;
    if (!API || !token || !userId || !cfid) return;
    try {
      await fetch(`${API}/api/messages/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courtfile_id: cfid, role, user_id: userId }),
      });
    } catch {}
  }

  const onOpenCaseChat = async (cfid) => {
    if (me?.id && cfid) {
      markNow(me.id, cfid);
      await markReadBackend(API, token, role, cfid);
      refreshUnread();
    }
  };

  const openCaseChat = async (e, cf) => {
    e.preventDefault();
    await onOpenCaseChat(cf.id);
    navigate(`/chats/${cf.id}`, {
      state: {
        courtfileId: cf.id,
        courtfileNumber: cf.case_number,
        courtfileTitle: cf.title,
        senderRole: "client",
        returnTo: "/DashboardClient",
      },
    });
  };

  // ===== APPOINTMENTS =====
  const [appointments, setAppointments] = useState([]);
  const fetchAppointments = async () => {
    try {
      const r = await fetch(`${API}/api/appointments-courtfiles`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = r.ok ? await r.json() : [];
      setAppointments(Array.isArray(data) ? data : []);
    } catch {
      setAppointments([]);
    }
  };

  useEffect(() => {
    fetchClientData();
    fetchAppointments();
  }, [API, token, me?.id]);

  // ===== KPIs =====
  const upcomingAppointments = appointments.filter((a) => {
    const d = new Date(a.appointment_date);
    const diff = (d - new Date()) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  const allPayments = cases.flatMap((cf) => cf.payments || []);
  const pendingPayments = allPayments.filter((p) =>
    ["pending", "processing"].includes((p.status || "").toLowerCase())
  );

  // ===== Helpers =====
  const fmtMoney = (amt, cur = "USD") => {
    const n = Number.parseFloat(amt) || 0;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(n);
    } catch {
      return n.toLocaleString();
    }
  };

  // ===== RETURN =====
  return (
    <AppNavsShell>
      <div className="container add-page mt-4">
        {/* Header */}
        <div className="row align-items-center mb-4">
          <div className="col">
            <h2 className="mb-1">Client Dashboard</h2>
            <p className="text-body-secondary mb-0">Welcome {name}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="row align-items-center g-4 mb-4">
          <div className="col-6 col-md-3">
            <div className="d-flex align-items-center">
              <i className="bi bi-folder2-open text-primary fs-3 me-2"></i>
              <div>
                <h4 className="mb-0">{cases.length}</h4>
                <small className="text-muted">Courtfiles</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="d-flex align-items-center">
              <i className="bi bi-clock-history text-info fs-3 me-2"></i>
              <div>
                <h4 className="mb-0">{upcomingAppointments.length}</h4>
                <small className="text-muted">Next 7 days</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="d-flex align-items-center">
              <i className="bi bi-receipt text-warning fs-3 me-2"></i>
              <div>
                <h4 className="mb-0">{pendingPayments.length}</h4>
                <small className="text-muted">Payments Pending</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="d-flex align-items-center">
              <i className="bi bi-envelope text-danger fs-3 me-2"></i>
              <div>
                <h4 className="mb-0">{totalUnread}</h4>
                <small className="text-muted">Unread Messages</small>
              </div>
            </div>
          </div>
        </div>

        {/* Courtfiles table */}
        <div className="row g-4">
          <div className="col-12">
            <h3 className="mb-1">Courtfiles</h3>
            {loadingCases && <p className="mt-3">Loading courtfiles...</p>}
            {casesErr && <div className="alert alert-danger mt-3">{casesErr}</div>}
            {!loadingCases && cases.length === 0 && (
              <div className="alert text-secondary bg-transparent border-0 mt-2">No courtfiles found.</div>
            )}

            {cases.length > 0 && (
              <div className="table-responsive table-wrap">
                <table className="table table-modern align-middle mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Number</th>
                      <th>Title</th>
                      <th>Jurisdiction</th>
                      <th>Court</th>
                      <th>Status</th>
                      <th>Lawyers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((cf) => (
                      <tr
                        key={cf.id}
                        onClick={() => navigate(`/courtfiles/viewclient/${cf.id}`)}
                        className="table-row-clickable"
                      >
                        <td className="text-center pe-3">{cf.id}</td>
                        <td>{cf.case_number}</td>
                        <td>{cf.title}</td>
                        <td>{cf.jurisdiction}</td>
                        <td>{cf.court}</td>
                        <td>
                          <span
                            className={`fs-10 badge-phoenix badge ${
                              cf.status ? "badge-phoenix-success" : "badge-phoenix-secondary"
                            }`}
                          >
                            {cf.status ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          {cf.assigned_lawyers?.length > 0
                            ? cf.assigned_lawyers.map((l) => <div key={l.id}>{l.name}</div>)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Row: Calendar + Payments */}
        <div className="row g-4 mt-5">
          <div className="col-12 col-lg-8">
            <DashboardCalendar
              apiBase={API}
              authToken={token}
              getCourtfileUrl={(id) => `/courtfiles/viewclient/${id}`}
              height={420}
              contentHeight={420}
              userRole="client"
            />
          </div>
          <div className="col-12 col-lg-4">
            <div className="card">
              <div className="card-header pb-1 d-flex justify-content-between align-items-center">
                <h3 className="mb-0 fw-bold">Payments</h3>
                <small className="text-muted">{new Date().toLocaleDateString()}</small>
              </div>
              <div className="card-body">
                {allPayments.length === 0 && (
                  <p className="text-muted small">No payments found.</p>
                )}
                {allPayments.length > 0 && (
                  <ul className="list-unstyled payment-detail-text">
                    {allPayments.slice(0, 6).map((p) => (
                      <li
                        key={p.id}
                        className="d-flex align-items-center justify-content-between border-bottom py-3 payment-item"
                      >
                        <div className="fw-semibold text-truncate" style={{ minWidth: 120 }}>
                          ${fmtMoney(p.amount, p.currency)}
                        </div>
                        <PaymentBadge status={p.status} outline className="fs-10" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );
};
