import { LogoutButton } from "../../components/LogoutButton";
import { Navigate, Link } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useEffect, useState, useMemo } from "react";
import useUnreadBadges from "../../hooks/useUnreadBadges";
import { markNow } from "../../hooks/chatUnread";
import { useNavigate } from "react-router-dom";
import DashboardCalendar from "../../components/DashboardCalendar";
import AppNavsShell from "../../components/AppNavsShell";
import StatusPill from "../../components/StatusPill";


export const DashboardLawyer = () => {
    const API = import.meta.env.VITE_BACKEND_URL;
    const { store } = useGlobalReducer();
    const navigate = useNavigate();

    const token = store?.auth?.token || null;
    const me = store?.me || null;
    const role = (me?.role || "").toLowerCase();

    if (role !== "lawyer") return <Navigate to="/403" replace />;

    const currentLawyerId = me?.id || null;

    // ---------------- COURTFILES ----------------
    const [cases, setCases] = useState([]);
    const [loadingCases, setLoadingCases] = useState(false);
    const [casesErr, setCasesErr] = useState("");

    const fetchCases = async () => {
        try {
            setLoadingCases(true);
            setCasesErr("");
            const resp = await fetch(`${API}/api/lawyers-courtfiles`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) {
                const e = await resp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${resp.status}`);
            }
            const data = await resp.json();
            setCases(data.map((r) => ({ relation_id: r.id, ...(r.courtfile || r) })));
        } catch (e) {
            setCasesErr(e.message || "Error fetching courtfiles");
        } finally {
            setLoadingCases(false);
        }
    };

    // borrar relación abogado-expediente
    const [deletingId, setDeletingId] = useState(null);
    const handleDeleteRelation = async (relationId) => {
        if (!window.confirm("Delete this link? The case will no longer be associated with this lawyer.")) return;
        try {
            setDeletingId(relationId);
            const resp = await fetch(`${API}/api/lawyers-courtfiles/${relationId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) {
                const e = await resp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${resp.status}`);
            }
            await fetchCases();
        } catch (err) {
            alert(err.message || "Error deleting relation");
        } finally {
            setDeletingId(null);
        }
    };

    // ---------------- UNREAD BADGES / CHATS ----------------
    const caseIds = Array.isArray(cases) ? cases.map((c) => c.id) : [];
    const { unreadByCase, totalUnread, refresh: refreshUnread } = useUnreadBadges({
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
                body: JSON.stringify({
                    courtfile_id: cfid,
                    role: String(role || "").toLowerCase(),
                    user_id: userId,
                }),
            });
        } catch (err) {
            console.error("Error marcando leído:", err);
        }
    }

    const onOpenChatClick = async (cfid) => {
        const userId = me?.id;
        if (!userId || !cfid) return;
        markNow(userId, cfid);
        await markReadBackend(API, token, role, cfid);
        refreshUnread();
    };

    const openCaseChat = async (e, cf) => {
        e.preventDefault();
        await onOpenChatClick(cf.id);
        navigate(`/chats/${cf.id}`, {
            state: {
                courtfileId: cf.id,
                courtfileNumber: cf.case_number,
                courtfileTitle: cf.title,
                senderRole: "lawyer",
                returnTo: "/DashboardLawyer",
            },
        });
    };

    // ---------------- BUSCADOR COURTFILES ----------------
    const [search, setSearch] = useState("");
    const filteredCases = useMemo(() => {
        if (!search?.trim()) return cases;
        const q = search.toLowerCase();
        return cases.filter((cf) =>
            [cf.case_number, cf.title, cf.jurisdiction, cf.court, cf.status]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        );
    }, [cases, search]);

    // ---------------- MAPA POR ID (para tooltips/títulos) ----------------
    const caseById = useMemo(() => {
        const m = new Map();
        for (const cf of cases) m.set(cf.id, cf);
        return m;
    }, [cases]);

    // ---------------- WIDGET DE PAGOS (simple como en Payments) ----------------

    //Helpers
    // payment_id -> [courtfile_id, ...]
    const [pcMap, setPcMap] = useState(new Map());

    // Mapa de expedientes por id a partir de `cases` que ya cargás arriba
    const caseMap = useMemo(() => {
        const m = new Map();
        for (const cf of cases) {
            m.set(cf.id, { title: cf.title, case_number: cf.case_number });
        }
        return m;
    }, [cases]);

    const fetchPaymentLinks = async () => {
        try {
            const r = await fetch(`${API}/api/payments-courtfile`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });
            if (!r.ok) return;
            const data = await r.json();
            const map = new Map();
            data.forEach((pc) => {
                const pid = pc?.payment_id;
                const cid = pc?.courtfile_id;
                if (!pid || !cid) return;
                if (!map.has(pid)) map.set(pid, []);
                map.get(pid).push(cid);
            });
            setPcMap(map);
        } catch (e) {
            console.error("links fetch err:", e);
        }
    };

    const [payments, setPayments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [paymentsErr, setPaymentsErr] = useState("");

    // fetch igual que en la vista general (pero guardo en estado local del Dashboard)
    const fetchPayments = async () => {
        try {
            setLoadingPayments(true);
            setPaymentsErr("");

            const response = await fetch(`${API}/api/payments`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                setPayments(Array.isArray(data) ? data : []);
            } else {
                setPayments([]);
                setPaymentsErr("Error fetching payments");
            }
        } catch (error) {
            console.error("Error:", error);
            setPayments([]);
            setPaymentsErr(error.message || "Error fetching payments");
        } finally {
            setLoadingPayments(false);
        }
    };

    // derivados (idéntica idea: comparar contra strings planos)
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const is = (v, txt) => String(v || "").toLowerCase().trim() === txt;

    // solo los "pending"
    const pending = useMemo(() => {
        return payments.filter((p) => {
            const st = String(p?.status || "").toLowerCase().trim();
            return st === "pending" || st === "processing";
        });
    }, [payments]);

    // aprobados en el mes actual
    const paidThisMonth = useMemo(() => {
        return payments.filter((p) => {
            if (!is(p.status, "approved") || !p?.paid_at) return false;
            const d = new Date(p.paid_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            return key === ym;
        });
    }, [payments, ym]);

    const sumPaidThisMonth = paidThisMonth.reduce(
        (acc, p) => acc + (Number.parseFloat(p?.amount) || 0),
        0
    );

    // mismo formateo sencillo
    const fmtMoney = (amt, cur = "USD") => {
        const n = Number.parseFloat(amt) || 0;
        try {
            return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(n);
        } catch {
            return n.toLocaleString();
        }
    };


    // ---------------- EFFECTS ----------------
    useEffect(() => {
        fetchCases();      // ya definida arriba
        fetchPayments();
        fetchPaymentLinks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API, token, currentLawyerId]);

    // ----------------------- HOOK PARA ORDENAR TABLA -------------------------
    const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });

    const requestSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedCases = useMemo(() => {
        let sortable = [...filteredCases];
        if (sortConfig.key) {
            sortable.sort((a, b) => {
                const aVal = a[sortConfig.key] ?? "";
                const bVal = b[sortConfig.key] ?? "";
                if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [filteredCases, sortConfig]);


    return (
        <AppNavsShell>
            <div className="container main-content">
                <h1 className="text-start pb-2">Dashboard Lawyer</h1>

                {/* ==== FILA 1: COURTFILES FULL WIDTH ==== */}
                <div className="row g-4 mt-3">
                    <div className="col-12">
                        {/* ===== Toolbar COURTFILES (compacta) ===== */}
                        {/* ====== Bloque arriba: título + contador + botón ====== */}
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <h2 className="mb-0">
                                Courtfiles{" "}
                                <span className="text-muted fw-normal small">
                                    ({filteredCases.length})
                                </span>
                            </h2>

                            <Link
                                to="/courtfiles/addcourtfile"
                                state={{ linkToLawyer: true, returnTo: "/DashboardLawyer" }}
                                className="btn btn-sm btn-info"
                            >
                                + New Courtfile
                            </Link>
                        </div>

                        {/* ====== Bloque abajo: buscador ====== */}
                        <div className="d-flex justify-content-end">
                            <div className="search-box">
                                <i className="bi bi-search search-icon"></i>
                                <input
                                    type="search"
                                    className="form-control search-input"
                                    placeholder="Search by number, title, court..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {search && (
                                    <button
                                        className="clear-btn"
                                        onClick={() => setSearch("")}
                                        title="Clear"
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                )}
                            </div>
                        </div>



                        {/* tabla */}
                        {loadingCases && <p className="mt-3">Loading courtfiles...</p>}
                        {casesErr && <div className="alert alert-danger mt-3">{casesErr}</div>}
                        {!loadingCases && !casesErr && filteredCases.length === 0 && (
                            <div className="alert alert-info mt-3">No courtfiles found.</div>
                        )}

                        {!loadingCases && filteredCases.length > 0 && (
                            <div className="table-responsive table-wrap">
                                <table className="table table-modern align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th className="text-center" role="button" onClick={() => requestSort("id")}>
                                                ID{" "}
                                                <i
                                                    className={`bi ${sortConfig.key === "id"
                                                        ? sortConfig.direction === "asc"
                                                            ? "bi-arrow-up"
                                                            : "bi-arrow-down"
                                                        : "bi-arrow-down-up text-muted"
                                                        }`}
                                                />
                                            </th>
                                            <th role="button" onClick={() => requestSort("title")}>
                                                Case{" "}
                                                <i
                                                    className={`bi ${sortConfig.key === "title"
                                                        ? sortConfig.direction === "asc"
                                                            ? "bi-arrow-up"
                                                            : "bi-arrow-down"
                                                        : "bi-arrow-down-up text-muted"
                                                        }`}
                                                />
                                            </th>
                                            <th role="button" onClick={() => requestSort("jurisdiction")}>
                                                Jurisdiction{" "}
                                                <i
                                                    className={`bi ${sortConfig.key === "jurisdiction"
                                                        ? sortConfig.direction === "asc"
                                                            ? "bi-arrow-up"
                                                            : "bi-arrow-down"
                                                        : "bi-arrow-down-up text-muted"
                                                        }`}
                                                />
                                            </th>
                                            <th role="button" onClick={() => requestSort("court")}>
                                                Court{" "}
                                                <i
                                                    className={`bi ${sortConfig.key === "court"
                                                        ? sortConfig.direction === "asc"
                                                            ? "bi-arrow-up"
                                                            : "bi-arrow-down"
                                                        : "bi-arrow-down-up text-muted"
                                                        }`}
                                                />
                                            </th>
                                            <th className="text-center" role="button" onClick={() => requestSort("status")}>
                                                Status{" "}
                                                <i
                                                    className={`bi ${sortConfig.key === "status"
                                                        ? sortConfig.direction === "asc"
                                                            ? "bi-arrow-up"
                                                            : "bi-arrow-down"
                                                        : "bi-arrow-down-up text-muted"
                                                        }`}
                                                />
                                            </th>
                                            <th>
                                                {/* Actions column */}
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {sortedCases.map((cf) => {
                                            // === status robusto: acepta booleano o string ===
                                            const raw =
                                                typeof cf.status === "boolean"
                                                    ? cf.status
                                                        ? "Active"
                                                        : "Inactive"
                                                    : String(cf.status || "").trim();

                                            const statusLabel = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                                            const key = statusLabel.toLowerCase();

                                            let statusClass = "bg-secondary text-light";
                                            if (["active", "approved", "open"].includes(key)) statusClass = "bg-success text-light";
                                            else if (["inactive", "disabled", "closed"].includes(key)) statusClass = "bg-secondary text-light";
                                            else if (["pending", "waiting"].includes(key)) statusClass = "bg-warning text-dark";
                                            else if (["in progress", "sent", "review"].includes(key)) statusClass = "bg-info text-dark";
                                            else if (["error", "rejected", "failed"].includes(key)) statusClass = "bg-danger text-light";

                                            return (
                                                <tr key={cf.id}
                                                    onClick={() => navigate(`/courtfiles/ViewCourtfileLawyer/${cf.id}`)}
                                                    className="table-row-clickable">
                                                    {/* ID */}
                                                    <td className="text-center pe-3">{cf.id}</td>

                                                    {/* CASE: título arriba + número abajo (como la foto) */}
                                                    <td>
                                                        <div className="cell-main">
                                                            <div className="title text-truncate" title={cf.title}>
                                                                {cf.title || "—"}
                                                            </div>
                                                            <div className="subtitle text-truncate" title={cf.case_number}>
                                                                {cf.case_number || "—"}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Jurisdiction angosta con elipsis confiable */}
                                                    <td title={cf.jurisdiction}>
                                                        <div className="truncate-200">{cf.jurisdiction || "—"}</div>
                                                    </td>

                                                    {/* Court compacta con elipsis */}
                                                    <td title={cf.court}>
                                                        <div className="truncate-160">{cf.court || "—"}</div>
                                                    </td>

                                                    {/* Status en pill consistente */}

                                                    <td className="col-status">
                                                        <StatusPill status={cf?.status ?? cf?.is_active ?? cf?.state} />
                                                    </td>


                                                    {/* Actions compactas a la derecha (tus mismos botones) */}
                                                    <td className="col-actions">
                                                        <div className="dropdown">
                                                            {/* Botón kebab */}
                                                            <button
                                                                className="btn btn-sm btn-light icon-btn"
                                                                type="button"
                                                                data-bs-toggle="dropdown"
                                                                aria-expanded="false"
                                                                aria-label="More actions"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <i className="bi bi-three-dots" />
                                                            </button>

                                                            {/* Menú */}
                                                            <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                                                                <li>
                                                                    <button
                                                                        className="dropdown-item d-flex align-items-center gap-2"
                                                                        onClick={(e) => openCaseChat(e, cf)}
                                                                    >
                                                                        <i className="bi bi-chat-dots" />
                                                                        Chat
                                                                        {unreadByCase.get(cf.id)?.hasUnread && (
                                                                            <span className="ms-auto badge bg-danger rounded-pill">•</span>
                                                                        )}
                                                                    </button>
                                                                </li>

                                                                <li>
                                                                    <Link
                                                                        to={`/courtfiles/ViewCourtfileLawyer/${cf.id}`}
                                                                        state={{ returnTo: "/DashboardLawyer" }}
                                                                        className="dropdown-item d-flex align-items-center gap-2"
                                                                    >
                                                                        <i className="bi bi-eye" />
                                                                        View
                                                                    </Link>
                                                                </li>

                                                                <li>
                                                                    <Link
                                                                        to={`/courtfiles/${cf.id}`}
                                                                        state={{ returnTo: `/courtfiles/ViewCourtfileLawyer/${cf.id}` }}
                                                                        className="dropdown-item d-flex align-items-center gap-2"
                                                                    >
                                                                        <i className="bi bi-pencil" />
                                                                        Edit
                                                                    </Link>
                                                                </li>

                                                                <li><hr className="dropdown-divider" /></li>

                                                                <li>
                                                                    <button
                                                                        className="dropdown-item text-danger d-flex align-items-center gap-2"
                                                                        title={cf.relation_id ? "Unlink" : "No link available"}
                                                                        disabled={!cf.relation_id || deletingId === cf.relation_id}
                                                                        onClick={() => handleDeleteRelation(cf.relation_id)}
                                                                    >
                                                                        <i className="bi bi-trash" />
                                                                        Remove
                                                                        {deletingId === cf.relation_id && (
                                                                            <span className="spinner-border spinner-border-sm ms-auto" />
                                                                        )}
                                                                    </button>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                    </td>

                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                        )}
                    </div>
                </div>

                {/* ==== FILA 2: CALENDAR (8) + PAYMENTS (4) ==== */}
                <div className="row g-4 mt-5">
                    <div className="col-12 col-lg-8">
                        <DashboardCalendar
                            apiBase={import.meta.env.VITE_BACKEND_URL}
                            authToken={token}
                            getCourtfileUrl={(id) => `/courtfiles/ViewCourtfileLawyer/${id}`}
                        />
                    </div>

                    <div className="col-12 col-lg-4">
                        <div className="card shadow-sm">
                            <div className="card-header pb-1">
                                {/* Fila 1: título + fecha */}
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fs-5 fw-bold">Payments status</h5>
                                    <small className="text-muted">{new Date().toLocaleDateString()}</small>
                                </div>

                                {/* Fila 2: botón, alineado a la derecha */}
                                <div className="text-end mt-3">
                                    <Link to="/payments" className="btn btn-sm btn-outline-primary">
                                        View all payments
                                    </Link>
                                </div>
                            </div>

                            <div className="card-body">

                                {/* Pending */}
                                <h6 className="mb-2 fs-7 fw-semibold text-muted">Upcoming / Pending</h6>
                                {pending.length === 0 ? (
                                    <p className="text-muted small">No pending or processing payments.</p>
                                ) : (
                                    <ul className="list-unstyled mb-3">
                                        {pending.slice(0, 6).map((p) => {
                                            const st = String(p?.status || "").toLowerCase().trim();
                                            let badgeClass = "bg-secondary";
                                            let label = st;
                                            if (st === "pending") {
                                                badgeClass = "bg-transparent text-info border border-info d-inline-flex align-items-center gap-1";
                                                label = (
                                                    <>
                                                        Pending <i className="bi bi-clock"></i>
                                                    </>
                                                );
                                            } else if (st === "processing") {
                                                badgeClass = "bg-transparent text-warning border border-warning d-inline-flex align-items-center gap-1";
                                                label = (
                                                    <>
                                                        Processing <i className="bi bi-arrow-repeat"></i>
                                                    </>
                                                );
                                            }

                                            const cfIds = pcMap.get(p.id) || [];
                                            const cfLinks = cfIds.map((cid, idx) => {
                                                const meta = caseMap.get(cid);
                                                const txt = meta?.case_number || `Courtfile #${cid}`;
                                                return (
                                                    <React.Fragment key={`p-${p.id}-cf-${cid}`}>
                                                        <Link
                                                            to={`/courtfiles/ViewCourtfileLawyer/${cid}`}
                                                            className="courtfile-link"
                                                        >
                                                            {txt}
                                                        </Link>
                                                        {idx < cfIds.length - 1 ? ", " : ""}
                                                    </React.Fragment>
                                                );
                                            });

                                            return (
                                                <li
                                                    key={`pend-${p.id}`}
                                                    className="d-flex align-items-center justify-content-between border-bottom py-3 payment-item"
                                                >
                                                    <div className="fw-semibold text-truncate" style={{ minWidth: 120 }}>
                                                        ${fmtMoney(p.amount, p.currency || "USD")}
                                                    </div>
                                                    <div className="flex-grow-1 px-2 text-truncate">{cfLinks}</div>
                                                    <span className={`badge ${badgeClass}`}>{label}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {/* Paid this month */}
                                <div className="d-flex justify-content-between align-items-center pt-5">
                                    <h6 className="mb-2 fs-7 fw-semibold text-muted">Paid this month</h6>
                                    <span className="badge bg-success">
                                        Total: {fmtMoney(sumPaidThisMonth, paidThisMonth[0]?.currency || "USD")}
                                    </span>
                                </div>

                                {paidThisMonth.length === 0 ? (
                                    <p className="text-muted small">No approved payments this month.</p>
                                ) : (
                                    <ul className="list-unstyled">
                                        {paidThisMonth.slice(0, 6).map((p) => {
                                            const cfIds = pcMap.get(p.id) || [];
                                            const cfLinks = cfIds.map((cid, idx) => {
                                                const meta = caseMap.get(cid);
                                                const txt = meta?.case_number || `Courtfile #${cid}`;
                                                return (
                                                    <React.Fragment key={`paid-${p.id}-cf-${cid}`}>
                                                        <Link
                                                            to={`/courtfiles/ViewCourtfileLawyer/${cid}`}
                                                            className="courtfile-link"
                                                        >
                                                            {txt}
                                                        </Link>
                                                        {idx < cfIds.length - 1 ? ", " : ""}
                                                    </React.Fragment>
                                                );
                                            });

                                            return (
                                                <li
                                                    key={`paid-${p.id}`}
                                                    className="d-flex align-items-center justify-content-between border-bottom py-3 payment-item"
                                                >
                                                    <div className="fw-semibold text-truncate" style={{ minWidth: 120 }}>
                                                        {fmtMoney(p.amount, p.currency || "USD")}
                                                    </div>
                                                    <div className="flex-grow-1 px-2 text-truncate">{cfLinks}</div>
                                                    <small className="text-muted">
                                                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ""}
                                                    </small>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        
                    </div>


                </div>

                <div className="text-end">
                    <LogoutButton className="btn btn-sm btn-outline-danger mt-5" />
                </div>
            </div>
        </AppNavsShell>
    );

};
