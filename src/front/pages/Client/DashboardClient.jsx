import { useNavigate } from "react-router-dom";
import { LogoutButton } from "../../components/LogoutButton";
import { Link } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useEffect, useState } from "react";

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


    return (
        <div className="container text-center mt-5">
            <h1>DASHBOARD CLIENT</h1>
            <h1>¡HELLO {authed ? (name) : "you must log in"}!</h1>

            {authed ? (
                <div className="mt-5 text-start">
                    {/* COURTFILES SECTION */}
                    <div className="d-flex justify-content-between align-items-center">
                        <h3>COURTFILES</h3>
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