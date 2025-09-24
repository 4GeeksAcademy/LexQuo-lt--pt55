import { useNavigate, Navigate, Link } from "react-router-dom";
import { LogoutButton } from "../../components/LogoutButton";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useEffect, useState, useMemo } from "react";

import useUnreadBadges from "../../hooks/useUnreadBadges";
import { markNow } from "../../hooks/chatUnread";

export const DashboardClient = () => {
    const API = import.meta.env.VITE_BACKEND_URL;
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    // -------------------- AUTH + ME (nuevo esquema) --------------------
    const token = store?.auth?.token || null;                    // CHANGED
    const me = store?.me || null;                                // CHANGED
    const authed = !!token;                                      // CHANGED
    const role = (me?.role || "").toLowerCase();                 // CHANGED

    // Si querés bloquear estrictamente que solo "client" entre acá:
    if (!authed || !me) return <Navigate to="/login" replace />; // CHANGED
    if (role !== "client") return <Navigate to="/403" replace />; // CHANGED

    const currentClientId = me?.id || null;                      // CHANGED
    const name = `${me?.firstname ?? ""} ${me?.lastname ?? ""}`.trim(); // CHANGED


    //....................... COURTFILES DEL CLIENTE ..........................................
    const [cases, setCases] = useState([]);
    const [loadingCases, setLoadingCases] = useState(false);
    const [casesErr, setCasesErr] = useState("");

    const fetchClientData = async () => {
        if (!authed) return;
        try {
            setLoadingCases(true);
            // ✅ Llamá al endpoint correcto; el back filtra por el JWT si sos client
            const resp = await fetch(`${API}/api/clients-courtfiles`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || "Failed to fetch courtfiles");

            // ✅ Normalizá a "expedientes planos" (usando los campos de courtfile)
            const normalized = (Array.isArray(data) ? data : []).map((row) => {
                const cf = row?.courtfile || {};
                return {
                    id: cf.id,                                // ahora sí es ID del expediente
                    case_number: cf.case_number,
                    title: cf.title,
                    jurisdiction: cf.jurisdiction,
                    court: cf.court,
                    status: cf.status,
                    assigned_lawyers: cf.assigned_lawyers || [], // según tu serialize()
                };
            });
            setCases(normalized);
        } catch (error) {
            console.error("Error fetching client data:", error);
            setCasesErr(error.message);
        } finally {
            setLoadingCases(false);
        }
    };

    useEffect(() => {
        fetchClientData();
    }, [API, token, me?.id]);

    // 🔔 UNREAD (total y por expediente)
    const caseIds = useMemo(() => (Array.isArray(cases) ? cases.map((c) => c.id) : []), [cases]);

    // Si tu hook espera "auth" y "role", armamos un objeto mínimo compatible:
    const authForHook = useMemo(
        () => ({ token, user: { id: me.id } }),                     // CHANGED
        [token, me?.id]
    );

    const { unreadByCase, totalUnread, refresh: refreshUnread } = useUnreadBadges({
        API,
        auth: authForHook,                                          // CHANGED
        role,                                                       // "client"
        courtfileIds: caseIds,
    });



    // markReadBackend y onOpenCaseChat 
    async function markReadBackend(API, token, role, cfid) {
        const userId = me?.id; // usar store.me
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
        } catch (_) { }
    }

    const onOpenCaseChat = async (cfid) => {
        if (me?.id && cfid) {
            markNow(me.id, cfid);                                     // CHANGED
            await markReadBackend(API, token, role, cfid);
            refreshUnread();
        }
    };

    // ✅ NUEVO: handler real para "All Chats" (no marca global)
    const onOpenAllChats = (e) => {
        e.preventDefault();
        navigate("/chats", { state: { returnTo: "/DashboardClient" } });
    };

    // ✅ NUEVO: abrir chat de un expediente SIN perder el state y esperando el markRead
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


    return (
        <div className="container text-center mt-5">
            <h1>DASHBOARD CLIENT</h1>
            <h1>¡HELLO {authed ? (name) : "you must log in"}!</h1>
            {currentClientId && (
                <Link
                    to={`/clients/view/${currentClientId}`}
                    className="btn btn-sm btn-info me-1"
                    title="View details"
                    state={{ returnTo: "/DashboardClient" }}
                >
                    <i className="bi bi-eye me-1"></i>
                    View Profile
                </Link>
            )}

            {authed ? (
                <div className="mt-5 text-start">
                    {/* COURTFILES SECTION */}
                    <div className="d-flex justify-content-between align-items-center">
                        <h3>COURTFILES</h3>
                        <Link
                            to="/chats"
                            state={{ returnTo: "/DashboardClient" }}
                            className="btn btn-sm btn-outline-primary position-relative"
                            title="View all chats"
                            onClick={onOpenAllChats}   // ⬅️ ahora existe y navega con state
                        >
                            <i className="bi bi-chat-dots" /> All Chats
                            {totalUnread > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                    {totalUnread}
                                </span>
                            )}
                        </Link>
                    </div>
                    {!loadingCases && cases.length > 0 && (
                        <div className="table-responsive">
                            <table className="table table-striped table-hover">
                                <thead className="table-dark">
                                    <tr>
                                        <th>ID</th>
                                        <th>Case Number</th>
                                        <th>Title</th>
                                        <th>Jurisdiction</th>
                                        <th>Court</th>
                                        <th>Status</th>
                                        <th>Assigned Lawyers</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cases.map(cf => (
                                        <tr key={cf.id}>
                                            <td>{cf.id}</td>
                                            <td>{cf.case_number}</td>
                                            <td>{cf.title}</td>
                                            <td>{cf.jurisdiction}</td>
                                            <td>{cf.court}</td>
                                            <td>
                                                <span className={`badge ${cf.status ? 'bg-success' : 'bg-secondary'}`}>
                                                    {cf.status ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                {cf.assigned_lawyers?.map(lawyer => (
                                                    <div key={lawyer.id} className="mb-1">
                                                        <strong>{lawyer.name}</strong>
                                                        <br />
                                                    </div>
                                                )) || 'No lawyers assigned'}
                                            </td>
                                            <td className="text-end">
                                                <Link
                                                    to={`/chats/${cf.id}`}
                                                    state={{
                                                        courtfileId: cf.id,
                                                        courtfileNumber: cf.case_number,
                                                        courtfileTitle: cf.title,
                                                        senderRole: "client",
                                                        returnTo: "/DashboardClient",
                                                    }}
                                                    className="btn btn-sm btn-outline-primary me-1 position-relative"
                                                    title="Open chat"
                                                    onClick={(e) => openCaseChat(e, cf)}  // ⬅️ esperamos markRead y luego navigate con state
                                                >
                                                    <i className="bi bi-chat-dots"></i>
                                                    {unreadByCase.get(cf.id)?.hasUnread && (
                                                        <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                                                            <span className="visually-hidden">New</span>
                                                        </span>
                                                    )}
                                                </Link>
                                                <Link
                                                    to={`/courtfiles/viewclient/${cf.id}`}
                                                    className="btn btn-sm btn-info me-1"
                                                    title="View"
                                                >
                                                    <i className="bi bi-eye"></i> View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="text-end">
                        <LogoutButton className="btn btn-sm btn-outline-danger mt-5" />
                    </div>
                </div>
            ) : (
                <div className="d-flex gap-2 mt-5 justify-content-end">
                    <Link
                        to="/SignUpClient"
                        className="btn btn-sm btn-outline-warning mt-3"
                        style={{ border: "none" }}
                    >
                        Create User
                    </Link>
                    <Link
                        to="/login"
                        className="btn btn-sm btn-outline-primary mt-3"
                        style={{ border: "none" }}
                    >
                        Login
                    </Link>
                </div>
            )}
        </div>
    );
};