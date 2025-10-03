// views/Payments/Payments.jsx
import { Link, Navigate, useNavigate } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import AppNavsShell from "../../components/AppNavsShell";
import PaymentBadge from "../../components/PaymentBadge";

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
        className={`btn btn-sm fs-md-9 fs-10 ${
          fStatus === s ? "btn-dark" : "btn-outline-secondary"
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
