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
import PaymentBadge from "../../components/PaymentBadge";


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
    // ---------------- BUSCADOR COURTFILES ----------------
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all"); // all | active | inactive

    // normaliza “activo/inactivo”
    const isActiveValue = (cf) => {
        if (typeof cf?.is_active === "boolean") return cf.is_active;
        const s = String(cf?.status ?? cf?.state ?? "").toLowerCase();
        if (s.includes("active") || s.includes("open")) return true;
        if (s.includes("inactive") || s.includes("closed") || s.includes("archiv")) return false;
        return true; // default: activo
    };

    const filteredCases = useMemo(() => {
        // 1) filtro por status
        const byStatus = cases.filter((cf) => {
            if (status === "all") return true;
            return status === "active" ? isActiveValue(cf) : !isActiveValue(cf);
        });

        // 2) buscador
        if (!search?.trim()) return byStatus;
        const q = search.toLowerCase();

        return byStatus.filter((cf) =>
            [cf.case_number, cf.title, cf.jurisdiction, cf.court, cf.status, cf.state]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        );
    }, [cases, search, status]);

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
        fetchAppointments();
        fetchDeadlines();
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

    const normalizeStatus = (raw) => {
        if (raw === true) return "active";
        if (raw === false) return "inactive";
        if (raw == null) return "inactive";
        const s = String(raw).trim().toLowerCase();
        if (["1", "true", "active", "open"].includes(s)) return "active";
        if (["0", "false", "inactive", "closed", "archiv"].includes(s)) return "inactive";
        return "inactive"; // default fallback
    };

    // ---------------- HELPERS FOR HEADER ----------------
    // ---- top stats (derived from existing state) ----
    const courtfilesCount = Array.isArray(cases) ? cases.length : 0;
    const pendingPaymentsCount = Array.isArray(pending) ? pending.length : 0;
    const unreadMessagesCount = Number.isFinite(totalUnread) ? totalUnread : 0;

    // ===== Appointments & Deadlines (LAWYER scope) =====
    const [appointments, setAppointments] = useState([]);
    const [deadlines, setDeadlines] = useState([]);

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

    const fetchDeadlines = async () => {
        try {
            const r = await fetch(`${API}/api/deadlines-courtfiles`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });
            const data = r.ok ? await r.json() : [];
            setDeadlines(Array.isArray(data) ? data : []);
        } catch {
            setDeadlines([]);
        }
    };

    // --- date utils (supports "YYYY-MM-DD" and ISO) ---
    const toLocalDate = (iso) => {
        if (!iso) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            const [y, m, d] = iso.split("-").map(Number);
            return new Date(y, m - 1, d);
        }
        const d = new Date(iso);
        return Number.isNaN(d) ? null : d;
    };

    const isWithinNextNDaysISO = (iso, n = 7) => {
        const d = toLocalDate(iso);
        if (!d) return false;
        const today = new Date();
        const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());   // today 00:00
        const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());               // event 00:00
        const diffDays = (b - a) / 86400000;
        return diffDays >= 0 && diffDays <= n;
    };

    // ---- Upcoming (next 7 days): appointments + deadlines ----
    // appointments use `appointment_date`; deadlines use `deadline_date`
    const upcomingAppointments = useMemo(
        () => appointments.filter(a => isWithinNextNDaysISO(a?.appointment_date, 7)),
        [appointments]
    );

    const upcomingDeadlines = useMemo(
        () => deadlines.filter(d => isWithinNextNDaysISO(d?.deadline_date, 7)),
        [deadlines]
    );

    const upcomingCount =
        (upcomingAppointments?.length || 0) + (upcomingDeadlines?.length || 0);


    return (
        <AppNavsShell>
            <div className="container add-page">

                {/* ===== TOP: title, subtitle, date ===== */}
                <div className="row align-items-center mb-4">
                    <div className="col">
                        <h2 className="mb-1">Lawyer Dashboard</h2>
                        <p className="text-body-secondary mb-0">What’s going on today</p>
                    </div>
                    <div className="col-md-3 col-auto">
                        <div className="position-relative">
                            <i
                                className="bi bi-calendar3 text-body-tertiary position-absolute top-50 start-0 translate-middle-y ms-3"
                                style={{ pointerEvents: "none" }}
                            />
                            <input
                                type="text"
                                className="form-control ps-6"
                                style={{ paddingLeft: "40px" }} // fuerza el mismo padding que viste en el ejemplo
                                value={new Date().toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "2-digit",
                                })}
                                readOnly
                            />
                        </div>
                    </div>

                </div>

                {/* ===== TOP STATS: floating (no cards) ===== */}
                <div className="row align-items-center g-4 mb-3 mt-3">

                    {/* Courtfiles */}
                    <div className="col-12 col-sm-6 col-md-3">
                        <div className="d-flex align-items-center">
                            <div
                                className="flex-shrink-0 d-inline-flex align-items-center justify-content-center me-2"
                                style={{ width: 40, height: 40 }}
                            >
                                <i className="bi bi-folder2-open text-primary fs-4" />
                            </div>

                            <div className="ms-1">
                                <div className="d-flex align-items-baseline">
                                    <h2 className="mb-0 me-2 lh-1">{courtfilesCount}</h2>
                                    <span className="fw-semibold text-body lh-1">Courtfiles</span>
                                </div>
                                <p className="text-body-secondary fs-9 mb-0">Active</p>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming (week) */}
                    <div className="col-12 col-sm-6 col-md-3">
                        <div className="d-flex align-items-center">
                            <div
                                className="flex-shrink-0 d-inline-flex align-items-center justify-content-center me-2"
                                style={{ width: 40, height: 40 }}
                            >
                                <i className="bi bi-clock-history text-info fs-4" />
                            </div>

                            <div className="ms-1">
                                <div className="d-flex align-items-baseline">
                                    <h2 className="mb-0 me-2 lh-1">{upcomingCount}</h2>
                                    <span className="fw-semibold text-body lh-1">Events</span>
                                </div>
                                <p className="text-body-secondary fs-9 mb-0">Next 7 days</p>
                            </div>
                        </div>
                    </div>

                    {/* Payments pending */}
                    <div className="col-12 col-sm-6 col-md-3">
                        <div className="d-flex align-items-center">
                            <div
                                className="flex-shrink-0 d-inline-flex align-items-center justify-content-center me-2"
                                style={{ width: 40, height: 40 }}
                            >
                                <i className="bi bi-receipt text-warning fs-4" />
                            </div>

                            <div className="ms-1">
                                <div className="d-flex align-items-baseline">
                                    <h2 className="mb-0 me-2 lh-1">{pendingPaymentsCount}</h2>
                                    <span className="fw-semibold text-body lh-1">Payments</span>
                                </div>
                                <p className="text-body-secondary fs-9 mb-0">Pending</p>
                            </div>
                        </div>
                    </div>

                    {/* Unread messages */}
                    <div className="col-12 col-sm-6 col-md-3">
                        <div className="d-flex align-items-center">
                            <div
                                className="flex-shrink-0 d-inline-flex align-items-center justify-content-center me-2"
                                style={{ width: 40, height: 40 }}
                            >
                                <i className="bi bi-envelope text-danger fs-4" />
                            </div>

                            <div className="ms-1">
                                <div className="d-flex align-items-baseline">
                                    <h2 className="mb-0 me-2 lh-1">{unreadMessagesCount}</h2>
                                    <span className="fw-semibold text-body lh-1">Messages</span>
                                </div>
                                <p className="text-body-secondary fs-9 mb-0">Unread</p>
                            </div>
                        </div>
                    </div>

                </div>


                {/* ==== FILA 1: COURTFILES FULL WIDTH ==== */}
                <div className="row g-4">
                    <div className="col-12">
                        {/* ===== Toolbar COURTFILES ===== */}
                        <div>
                            {/* Fila 1: título + contador (arriba) */}
                            <div className="d-flex align-items-center gap-3 mb-2">
                                <div className="mb-2 mt-5">
                                    <h3 className="mb-1">Courtfiles</h3>
                                    <p className="text-muted mb-0 fs-9 mt-2">Manage your entire law firm in one place</p>
                                </div>
                            </div>

                            {/* Fila 2: izq = search + filtros | der = Add (misma línea) */}
                            <div className="d-flex align-items-center justify-content-between gap-2 flex-nowrap">
                                {/* Izquierda */}
                                <div className="d-flex align-items-center gap-2 flex-nowrap w-100" style={{ minWidth: 0 }}>
                                    {/* Search (tu mismo estilo) */}
                                    <div className="search-box" style={{ width: "clamp(260px, 40vw, 420px)" }}>
                                        <i className="bi bi-search search-icon"></i>
                                        <input
                                            type="search"
                                            className="form-control search-input"
                                            placeholder="Search by number, title, court..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        {search && (
                                            <button className="clear-btn" onClick={() => setSearch("")} title="Clear">
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        )}
                                    </div>

                                    {/* Botoncitos de estado */}
                                    <div className="d-flex align-items-center gap-2 flex-nowrap flex-shrink-0">
                                        <button
                                            className={`btn btn-sm ${status === "all" ? "btn-dark" : "px-3 text-body text-decoration-none btn btn-link"}`}
                                            onClick={() => setStatus("all")}
                                        >
                                            All
                                        </button>

                                        <button
                                            className={`btn btn-sm ${status === "active" ? "btn-dark" : "px-3 text-body text-decoration-none btn btn-link"}`}
                                            onClick={() => setStatus("active")}
                                        >
                                            Active
                                        </button>

                                        <button
                                            className={`btn btn-sm ${status === "inactive" ? "btn-dark" : "px-3 text-body text-decoration-none btn btn-link"}`}
                                            onClick={() => setStatus("inactive")}
                                        >
                                            Inactive
                                        </button>
                                    </div>
                                </div>

                                {/* Derecha */}
                                <div className="ms-auto flex-shrink-0">
                                    <Link
                                        to="/courtfiles/addcourtfile"
                                        state={{ linkToLawyer: true, returnTo: "/DashboardLawyer" }}
                                        className="btn btn-phoenix btn-phoenix-primary"
                                    >
                                        + New Courtfile
                                    </Link>
                                </div>
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
                                                        <div className="juris-clip">{cf.jurisdiction || "—"}</div>
                                                    </td>

                                                    {/* Court compacta con elipsis */}
                                                    <td title={cf.court}>
                                                        <div>{cf.court || "—"}</div>
                                                    </td>

                                                    {/* Status en pill consistente */}

                                                    <td className="col-status text-center">
                                                        {normalizeStatus(cf?.status ?? cf?.is_active ?? cf?.state) === "active" ? (
                                                            <span className="fs-10 badge-phoenix badge badge-phoenix-success">Active</span>
                                                        ) : (
                                                            <span className="fs-10 badge-phoenix badge badge-phoenix-secondary">Inactive</span>
                                                        )}
                                                    </td>



                                                    {/* Actions compactas a la derecha (tus mismos botones) */}
                                                    <td className="col-actions">
                                                        <div className="dropdown position-static">
                                                            {/* Botón kebab */}
                                                            <button
                                                                className="btn btn-sm btn-light icon-btn"
                                                                type="button"
                                                                data-bs-toggle="dropdown"
                                                                aria-expanded="false"
                                                                aria-label="More actions"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <i className="bi bi-three-dots icon-btn" />
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
                            height={420}
                            contentHeight={420}
                            userRole="client"
                        />
                    </div>

                    <div className="col-12 col-lg-4">
                        <div className="card">
                            <div className="card-header pb-1">
                                {/* Fila 1: título + fecha */}
                                <div className="d-flex justify-content-between align-items-center">
                                    <h3 className="mb-0 fw-bold">Payments status</h3>
                                    <small className="text-muted">{new Date().toLocaleDateString()}</small>
                                </div>

                                {/* Fila 2: botón, alineado a la derecha */}
                                <div className="text-end mt-3">
                                    <Link to="/payments" className="btn btn-phoenix-primary">
                                        View all payments
                                    </Link>
                                </div>
                            </div>

                            <div className="card-body">

                                {/* Pending */}
                                <h6 className="mb-2 fs-8 fw-bold text-muted">Upcoming / Pending</h6>
                                {pending.length === 0 ? (
                                    <p className="text-muted small">No pending or processing payments.</p>
                                ) : (
                                    <ul className="list-unstyled payment-detail-text">
                                        {pending.slice(0, 6).map((p) => {
                                            const st = String(p?.status || "").toLowerCase().trim();

                                            const cfIds = pcMap.get(p.id) || [];
                                            const cfLinks = cfIds.map((cid, idx) => {
                                                const meta = caseMap.get(cid);
                                                const txt = meta?.case_number || `Courtfile #${cid}`;
                                                return (
                                                    <React.Fragment key={`p-${p.id}-cf-${cid}`}>
                                                        <Link to={`/courtfiles/ViewCourtfileLawyer/${cid}`} className="courtfile-link">
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

                                                    {/* Badge con texto 10px */}
                                                    <PaymentBadge status={st} outline className="fs-10" />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}


                                {/* Paid this month */}
                                <div className="d-flex justify-content-between align-items-center pt-5">
                                    <h6 className="mb-2 fs-8 fw-bold text-muted">Paid this month</h6>
                                    <span className="badge bg-success">
                                        Total: $ {fmtMoney(sumPaidThisMonth, paidThisMonth[0]?.currency || "USD")}
                                    </span>
                                </div>

                                {paidThisMonth.length === 0 ? (
                                    <p className="text-muted small">No approved payments this month.</p>
                                ) : (
                                    <ul className="list-unstyled payment-detail-text">
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
                                                    className="d-flex align-items-center justify-content-between border-bottom py-3 payment-item payment-detail-text"
                                                >
                                                    <div className="fw-semibold text-truncate" style={{ minWidth: 120 }}>
                                                        ${fmtMoney(p.amount, p.currency || "USD")}
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


            </div>
        </AppNavsShell >
    );

};
