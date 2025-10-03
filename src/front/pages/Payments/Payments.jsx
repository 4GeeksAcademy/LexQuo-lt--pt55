// views/Payments/Payments.jsx
import { Link, Navigate, useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import AppNavsShell from "../../components/AppNavsShell";
import PaymentBadge from "../../components/PaymentBadge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import {
  PieChart, Pie, Cell, 
} from "recharts";


export const Payments = () => {
  const { store, dispatch } = useGlobalReducer();
  const API = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const token = store?.auth?.token;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed = role === "admin_user" || role === "lawyer" || role === "client";
  if (!allowed) return <Navigate to="/403" replace />;

  // ---------- Local UI state ----------
  const [q, setQ] = useState("");                       // search (id, currency, means)
  const [fStatus, setFStatus] = useState("all");        // all | pending | approved | processing | rejected
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // ---------- Fetch ----------
  const fetchPayments = async () => {
    try {
      setLoading(true);

      const endpoint =
        role === "admin_user"
          ? `${API}/api/payments`
          : `${API}/api/payments-courtfile?expand=payment`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const paymentsData =
        role === "admin_user"
          ? data.map(p => ({
            id: p.id,
            relation_id: null,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            means: p.means,
            created_at: p.created_at,
            paid_at: p.paid_at
          }))
          : data.map(pc => {
            if (!pc.payment) {
              console.warn('PaymentCourtfile without payment:', pc.id);
              return null;
            }
            const pay = pc.payment;
            return {
              id: pay.id,
              relation_id: pc.id,
              amount: pay.amount,
              currency: pay.currency,
              status: pay.status,
              means: pay.means,
              created_at: pay.created_at,
              paid_at: pay.paid_at,
              courtfile_id: pc.courtfile_id,
              // 👇 tomamos el número si viene del backend
              courtfile_number: pc.courtfile_number || pc?.courtfile?.case_number || null
            };
          }).filter(Boolean);

      dispatch({ type: "SET_PAYMENTS", payload: paymentsData });
    } catch (e) {
      console.error("Error fetching payments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Helpers ----------
  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  };

  const money = (amount, currency) => {
    const cur = (currency || "").toUpperCase();
    const n = Number(amount) || 0;
    return `${cur} ${n.toLocaleString()}`;
  };

  // Reglas de UI (el backend ya aplica las definitivas)
  const isPending = (p) => String(p?.status || "").toLowerCase().includes("pending");
  const canAdd = role === "admin_user" || role === "lawyer";
  const canEdit = (p) =>
    role === "admin_user" || (role === "lawyer" && isPending(p));
  const canDelete = (p) =>
    role === "admin_user" || (role === "lawyer" && isPending(p));
  const canPay = (p) =>
    // clientes pueden pagar si pending; (backend ya filtra a vinculados)
    role === "client" && isPending(p);

  const handleDelete = async (payment) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    try {
      // ✅ Admin borra el payment (id); Lawyer/Client borran la relación (relation_id)
      const endpoint =
        role === "admin_user"
          ? `${API}/api/payments/${payment.id}`
          : `${API}/api/payments-courtfile/${payment.relation_id}`;

      const resp = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      dispatch({
        type: "DELETE_PAYMENT",
        payload: role === "admin_user" ? payment.id : payment.relation_id
      });

      alert("Payment deleted successfully!");
    } catch (err) {
      console.error("Error deleting payment:", err);
      alert(`Error deleting payment: ${err.message}`);
    }
  };

  // ---------- Derived list (search + filter) ----------
  const payments = store.payments || [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return payments.filter((p) => {
      const matchesQ =
        !term ||
        String(p.id || "").includes(term) ||
        (p.currency || "").toLowerCase().includes(term) ||
        (p.means || "").toLowerCase().includes(term);
      const matchesStatus =
        fStatus === "all" ? true : String(p.status || "").toLowerCase() === fStatus;
      return matchesQ && matchesStatus;
    });
  }, [payments, q, fStatus]);

  const homeByRole =
    role === "admin_user"
      ? "/DashboardAdmin"
      : role === "client"
        ? "/DashboardClient"
        : "/DashboardLawyer";

  // ===== Monthly chart helpers =====

// keep your selectedMonth state outside (you already have it)
// const [selectedMonth, setSelectedMonth] = useState(null);

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

const monthKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // e.g., 2025-10
};

const monthLabel = (d) =>
  d.toLocaleString("en-US", { month: "short", year: "numeric" });

// Last 12 months (including current)
const last12Months = (() => {
  const arr = [];
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), 1);
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(base.getFullYear(), base.getMonth() - i, 1);
    arr.push(new Date(dt));
  }
  return arr;
})();

// 12-month overview (for building dropdown options; line chart is per selected month)
const monthlyData = useMemo(() => {
  const index = new Map(); // YYYY-MM -> { key, label, pendingCount, approvedCount }
  last12Months.forEach((d) => {
    index.set(monthKey(d), {
      key: monthKey(d),
      label: monthLabel(d),
      pendingCount: 0,
      approvedCount: 0,
    });
  });

  const inWindow = (d) => {
    if (!isValidDate(d)) return false;
    const first = last12Months[0];
    const last = last12Months[last12Months.length - 1];
    const start = new Date(first.getFullYear(), first.getMonth(), 1);  // inclusive
    const end   = new Date(last.getFullYear(),  last.getMonth() + 1, 1); // exclusive
    return d >= start && d < end;
  };

  for (const p of payments) {
    const status = String(p?.status || "").toLowerCase();

    // pending -> created_at
    if (status.includes("pending")) {
      const d = p?.created_at ? new Date(p.created_at) : null;
      if (isValidDate(d) && inWindow(d)) {
        const k = monthKey(new Date(d.getFullYear(), d.getMonth(), 1));
        const b = index.get(k);
        if (b) b.pendingCount += 1;
      }
    }

    // approved -> paid_at (fallback created_at)
    if (status.includes("approved")) {
      const paid = p?.paid_at ? new Date(p.paid_at) : null;
      const useDate = isValidDate(paid) ? paid : (p?.created_at ? new Date(p.created_at) : null);
      if (isValidDate(useDate) && inWindow(useDate)) {
        const k = monthKey(new Date(useDate.getFullYear(), useDate.getMonth(), 1));
        const b = index.get(k);
        if (b) b.approvedCount += 1;
      }
    }
  }

  return Array.from(index.values());
}, [payments]);

// Month options for selects
const monthOptions = useMemo(
  () => monthlyData.map((d) => ({ key: d.key, label: d.label })),
  [monthlyData]
);

// Default selected = most recent month
useEffect(() => {
  if (monthOptions.length > 0 && !selectedMonth) {
    setSelectedMonth(monthOptions[monthOptions.length - 1].key);
  }
}, [monthOptions, selectedMonth]);

// ----- Daily data for selected month (line chart) -----
const { dailyData, lastDayOfMonth } = useMemo(() => {
  if (!selectedMonth) return { dailyData: [], lastDayOfMonth: 31 };

  const [yStr, mStr] = selectedMonth.split("-");
  const y = Number(yStr), m = Number(mStr);
  if (!y || !m) return { dailyData: [], lastDayOfMonth: 31 };

  const lastDay = new Date(y, m, 0).getDate();
  const index = new Map();
  for (let d = 1; d <= lastDay; d++) {
    index.set(d, { dayNum: d, pendingCount: 0, approvedCount: 0 });
  }

  for (const p of payments) {
    const status = String(p?.status || "").toLowerCase();

    if (status.includes("pending")) {
      const created = p?.created_at ? new Date(p.created_at) : null;
      if (isValidDate(created) && created.getFullYear() === y && (created.getMonth() + 1) === m) {
        const d = created.getDate();
        index.get(d).pendingCount += 1;
      }
    }

    if (status.includes("approved")) {
      const paid = p?.paid_at ? new Date(p.paid_at) : null;
      const useDate = isValidDate(paid) ? paid : (p?.created_at ? new Date(p.created_at) : null);
      if (isValidDate(useDate) && useDate.getFullYear() === y && (useDate.getMonth() + 1) === m) {
        const d = useDate.getDate();
        index.get(d).approvedCount += 1;
      }
    }
  }

  return { dailyData: Array.from(index.values()), lastDayOfMonth: lastDay };
}, [selectedMonth, payments]);

// ----- Monthly pies (status & means) -----

// Bounds for selected month
const monthBounds = useMemo(() => {
  if (!selectedMonth) return null;
  const [yStr, mStr] = selectedMonth.split("-");
  const y = Number(yStr), m = Number(mStr);
  if (!y || !m) return null;
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) }; // [start, end)
}, [selectedMonth]);

// Which date to use per payment (same rule as line):
const dateForPayment = (p) => {
  const s = String(p?.status || "").toLowerCase();
  if (s.includes("approved")) {
    const paid = p?.paid_at ? new Date(p.paid_at) : null;
    return isValidDate(paid) ? paid : (p?.created_at ? new Date(p.created_at) : null);
  }
  return p?.created_at ? new Date(p.created_at) : null;
};

// Filter payments within month
const monthlyPayments = useMemo(() => {
  if (!monthBounds) return [];
  const { start, end } = monthBounds;
  return payments.filter((p) => {
    const d = dateForPayment(p);
    return isValidDate(d) && d >= start && d < end;
  });
}, [payments, monthBounds]);

// Status counts (monthly)
const statusData = useMemo(() => {
  const counts = { Approved: 0, Pending: 0, Processing: 0, Rejected: 0 };
  for (const p of monthlyPayments) {
    const s = String(p?.status || "").toLowerCase();
    if (s.includes("approved")) counts.Approved += 1;
    else if (s.includes("pending")) counts.Pending += 1;
    else if (s.includes("processing")) counts.Processing += 1;
    else if (s.includes("rejected")) counts.Rejected += 1;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}, [monthlyPayments]);

const totalStatus = useMemo(
  () => statusData.reduce((sum, s) => sum + (Number(s.value) || 0), 0),
  [statusData]
);

// Means counts (monthly)
const prettyMeansName = (raw = "") => {
  const k = String(raw).trim().toLowerCase();
  if (!k) return "Unknown";
  if (["tdc", "tarjeta", "credit_card", "credit card"].includes(k)) return "Credit card";
  if (["transferencia", "bank_transfer", "transfer"].includes(k)) return "Bank transfer";
  if (["link de pago", "payment_link", "link"].includes(k)) return "Payment link";
  if (["cash", "efectivo"].includes(k)) return "Cash";
  return raw || "Unknown";
};

const meansData = useMemo(() => {
  const map = {};
  for (const p of monthlyPayments) {
    const key = prettyMeansName(p.means || "Unknown");
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
}, [monthlyPayments]);

const totalMeans = useMemo(
  () => meansData.reduce((s, d) => s + (Number(d.value) || 0), 0),
  [meansData]
);

// Phoenix palette (keep yours)
const COLORS_STATUS = ["#27ae60", "#f6c343", "#3874ff", "#e63757"];
const COLORS_MEANS  = ["#3874ff", "#00c9db", "#f6c343", "#6c757d", "#27ae60", "#e63757"];


  return (
    <AppNavsShell>
      <div className="container add-page">

        {/* ===== Breadcrumbs ===== */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to={homeByRole}>Dashboard</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Payments
            </li>
          </ol>
        </nav>


        {/* ===== Toolbar ===== */}
        <div className="mb-1">
          {/* Fila 1: título + contador */}
          <div className="mb-5">
            <div className="d-flex gap-3">
              <h1 className="h2 mb-2">Payments</h1>
            </div>
            <p className="text-muted small mt-1">
              {role === "admin_user" && "Admins can create, edit, delete and change status."}
              {role === "lawyer" && "Lawyers can create/edit/delete while Pending; otherwise view only."}
              {role === "client" && "Clients can view and pay their linked Pending payments."}
            </p>
          </div>

<div className="row gap-5">
          {/* ===== Monthly view (line) ===== */}
<div className="card mb-4 col-12 col-md-5">
  <div className="card-body">
    <div className="d-flex justify-content-between align-items-center mb-2">
      <div>
        <h2 className="h5 mb-0">Total payments</h2>
        <small className="text-muted">Payments received across all channels</small>
      </div>
      <select
        className="form-select form-select-sm"
        style={{ maxWidth: 220 }}
        value={selectedMonth || ""}
        onChange={(e) => setSelectedMonth(e.target.value)}
      >
        {monthOptions.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>

    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={dailyData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="dayNum"
            type="number"
            domain={[1, lastDayOfMonth]}
            ticks={[1, Math.min(15, lastDayOfMonth), lastDayOfMonth]}
            padding={{ left: 12, right: 12 }}
            allowDataOverflow
            tickFormatter={(dayNum) => {
              if (!selectedMonth) return dayNum;
              const [yStr, mStr] = selectedMonth.split("-");
              const d = new Date(Number(yStr), Number(mStr) - 1, Number(dayNum));
              return d.toLocaleString("en-US", { month: "short" }) + "-" + String(d.getDate()).padStart(2, "0");
            }}
            tick={{ fontSize: 12 }}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(dayNum) => {
              if (!selectedMonth) return dayNum;
              const [yStr, mStr] = selectedMonth.split("-");
              const d = new Date(Number(yStr), Number(mStr) - 1, Number(dayNum));
              return d.toLocaleString("en-US", { month: "short" }) + "-" + String(d.getDate()).padStart(2, "0");
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="approvedCount" name="Approved" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="pendingCount"  name="Pending"  strokeWidth={2.5} strokeDasharray="6 6" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
</div>


 {/* ===== pie-chart (Means) ===== */}
<div className="card mb-4 col-12 col-md-5">
  <div className="card-body">
    {/* Header con título y selector */}
    <div className="d-flex justify-content-between align-items-center mb-2">
      <h5 className="fw-bold mb-0">Payment Means</h5>
      <select
        className="form-select form-select-sm"
        style={{ maxWidth: 180 }}
        value={selectedMonth || ""}
        onChange={(e) => setSelectedMonth(e.target.value)}
      >
        {monthOptions.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>

    <div className="d-flex flex-column flex-md-row align-items-center pt-5">
      {/* Donut */}
      <div className="flex-grow-1" style={{ height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={meansData}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              labelLine={false}
              label={false}
            >
              {meansData.map((entry, index) => (
                <Cell
                  key={`cell-means-${index}`}
                  fill={COLORS_MEANS[index % COLORS_MEANS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla lateral */}
      <div className="ms-md-4 mt-3 mt-md-0" style={{ minWidth: 180 }}>
        <p className="text-muted small mb-2">
          Total count {meansData.reduce((sum, m) => sum + m.value, 0)}
        </p>
        <ul className="list-unstyled small">
          {meansData.map((m, i) => (
            <li
              key={m.name}
              className="d-flex justify-content-between align-items-center mb-1"
            >
              <span className="d-flex align-items-center">
                <span
                  className="me-2 d-inline-block rounded-circle"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: COLORS_MEANS[i % COLORS_MEANS.length],
                  }}
                />
                {m.name.charAt(0).toUpperCase() + m.name.slice(1)}
              </span>
              <span className="fw-semibold">{m.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
</div>
</div>



          {/* Fila 2: search + filtros + Add */}
          <div className="row g-2 align-items-center">
            {/* Search */}
            <div className="col-12 col-md">
              <div className="search-box position-relative" style={{ maxWidth: 320 }}>
                <i
                  className="bi bi-search position-absolute"
                  style={{
                    top: "50%",
                    left: 10,
                    transform: "translateY(-50%)",
                    color: "#6c757d",
                  }}
                />
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search by ID, currency or means"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ paddingLeft: "2rem" }}
                />
                {q && (
                  <button
                    className="btn btn-sm position-absolute"
                    onClick={() => setQ("")}
                    title="Clear"
                    style={{
                      top: "50%",
                      right: 6,
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#6c757d",
                    }}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtros */}
            <div className="col-12 col-md-auto d-flex flex-wrap gap-2">
              {["all", "pending", "approved", "processing", "rejected"].map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm fs-md-9 fs-10 ${fStatus === s ? "btn-dark" : "btn-outline-secondary"
                    }`}
                  onClick={() => setFStatus(s)}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Add */}
            <div className="col-12 col-md-auto">
              {canAdd && (
                <Link
                  to="/payments/addPayment"
                  className="btn btn-phoenix btn-phoenix-primary w-100 w-md-auto"
                >
                  <i className="bi bi-plus-lg me-1" /> Add payment
                </Link>
              )}
            </div>
          </div>

        </div>

        {/* ===== Tabla ===== */}
        {filtered.length > 0 ? (
          <div className="table-responsive pt-0">
            <table className="table table-modern align-middle mb-0 pt-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "20px" }} className="text-start">ID</th>
                  <th>Courtfile</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th>Means</th>
                  <th>Created</th>
                  <th>Paid</th>
                  <th style={{ width: 60 }} className="text-center">
                    <span className="text-muted">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="table-row-clickable"
                    onClick={() => navigate(`/payments/view/${p.id}`)}
                    role="button"
                  >
                    <td className="text-start ps-2">{p.id}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {p.courtfile_id ? (
                        <Link to={`/courtfiles/view/${p.courtfile_id}`}>
                          {p.courtfile_number || `${p.courtfile_id}`}
                        </Link>
                      ) : "—"}
                    </td>
                    <td>{money(p.amount, p.currency)}</td>
                    <td>{(p.currency || "").toUpperCase() || "—"}</td>
                    <td><PaymentBadge status={p.status} outline /></td>
                    <td>{p.means ? (p.means.charAt(0).toUpperCase() + p.means.slice(1)) : "—"}</td>
                    <td>{formatDateTime(p.created_at)}</td>
                    <td>{formatDateTime(p.paid_at)}</td>

                    {/* Actions (dropdown / pay / dash) */}
                    {role === "client" ? (
                      <td className="text-center">
                        {canPay(p) ? (
                          <Link
                            className="btn btn-outline-success d-flex align-items-center justify-content-center"
                            to={`/payments/pay/${p.id}`}
                            style={{ minWidth: "100px", padding: "4px 8px", fontSize: "0.8rem" }}
                          >
                            <i className="bi bi-cash-stack me-1" /> Pay
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    ) : (
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="dropdown position-static">
                          <button
                            className="btn btn-link text-secondary p-0 me-3"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            aria-label="Row actions"
                          >
                            <i className="bi bi-three-dots icon-btn"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                              <Link className="dropdown-item" to={`/payments/view/${p.id}`}>
                                <i className="bi bi-eye me-2" /> View
                              </Link>
                            </li>

                            {/* Edit (admin o lawyer si pending) */}
                            {canEdit(p) && (
                              <li>
                                <Link className="dropdown-item" to={`/payments/${p.id}`}>
                                  <i className="bi bi-pencil me-2" /> Edit
                                </Link>
                              </li>
                            )}

                            {/* Delete (admin o lawyer si pending) */}
                            {canDelete(p) && (
                              <>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                  <button className="dropdown-item text-danger" onClick={() => handleDelete(p)}>
                                    <i className="bi bi-trash me-2" /> Delete
                                  </button>
                                </li>
                              </>
                            )}
                          </ul>
                        </div>
                      </td>
                    )}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <div className="alert alert-light border d-flex align-items-center" role="alert">
            <span className="spinner-border spinner-border-sm me-2" /> Loading payments…
          </div>
        ) : (
          <div className="alert text-secondary bg-transparent border-0 mt-2">
            <i className="bi bi-info-circle" /> No payments found.
          </div>
        )}
      </div>
    </AppNavsShell>
  );
};
