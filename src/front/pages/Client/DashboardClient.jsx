import { useNavigate } from "react-router-dom";
import { LogoutButton } from "../../components/LogoutButton";
import { Link } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useEffect, useState, useMemo } from "react";

import useUnreadBadges from "../../hooks/useUnreadBadges";
import { markNow } from "../../hooks/chatUnread";

export const DashboardClient = () => {
    const API = import.meta.env.VITE_BACKEND_URL;
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const [auth, setAuth] = useState(() => {
        try { return store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null"); }
        catch { return null; }
    });

    useEffect(() => {
        if (!store?.auth && auth?.token) {
            dispatch({ type: "SET_AUTH", payload: auth });
        }
    }, [store?.auth, auth, dispatch]);

    useEffect(() => {
        if (store?.auth && store.auth !== auth) {
            setAuth(store.auth);
        }
    }, [store?.auth]);

    const authed = !!auth?.token;
    const role = (auth?.role || "").toLowerCase();


    const name = auth?.user ? `${auth.user?.firstname ?? ""} ${auth.user?.lastname ?? ""}`.trim() : "";

    //....................... COURTFILES DEL CLIENTE ..........................................
    const [cases, setCases] = useState([]);
    const [loadingCases, setLoadingCases] = useState(false);
    const [casesErr, setCasesErr] = useState("");

    const fetchClientData = async () => {
        if (!authed) return;

        try {
            const clientId = auth.user.id;
            const token = auth.token;

            // Fetch client's courtfiles
            setLoadingCases(true);
            const courtfilesResponse = await fetch(`${API}/api/clients/${clientId}/get-courtfiles`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (courtfilesResponse.ok) {
                const courtfilesData = await courtfilesResponse.json();
                setCases(courtfilesData);
            } else {
                throw new Error('Failed to fetch courtfiles');
            }

        } catch (error) {
            console.error("Error fetching client data:", error);
            setCasesErr(error.message);
        } finally {
            setLoadingCases(false);
        }
    };

    useEffect(() => {
        if (!authed) return;
        fetchClientData();
    }, [API, authed, auth?.token, dispatch]);

    // 🔔 UNREAD (total y por expediente)
    const caseIds = useMemo(() => (Array.isArray(cases) ? cases.map((c) => c.id) : []), [cases]);

    const { unreadByCase, totalUnread, refresh: refreshUnread } = useUnreadBadges({
        API,
        auth,
        role,            // "client"
        courtfileIds: caseIds,
    });

    // Marcar leído al abrir chat general
    const onOpenAllChats = () => {
        if (auth?.user?.id) {
            // Para chats generales marcamos un “now” sin courtfileId
            markNow(auth.user.id, null);
            refreshUnread();
        }
    };

    // Marcar leído al abrir chat de un expediente
    const onOpenCaseChat = (cfid) => {
        if (auth?.user?.id && cfid) {
            markNow(auth.user.id, cfid);
            refreshUnread();
        }
    };


    return (
        <div className="container text-center mt-5">
            <h1>DASHBOARD CLIENT</h1>
            <h1>¡HELLO {authed ? (name) : "you must log in"}!</h1>

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
                            onClick={onOpenAllChats}
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
                                                    onClick={() => onOpenCaseChat(cf.id)}
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
                        to="/LoginClient"
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