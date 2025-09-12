import { useNavigate } from "react-router-dom";
import { LogoutButton } from "../../components/LogoutButton";
import { Link, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import React, { useEffect, useState, useMemo } from "react";

export const DashboardLawyer = () => {

    const API = import.meta.env.VITE_BACKEND_URL;
    const { store, dispatch } = useGlobalReducer();

    const [auth, setAuth] = useState(() => {
        try { return store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null"); }
        catch { return null; }
    });

    useEffect(() => {
        if (!store?.auth && auth?.token) {
            dispatch({ type: "SET_AUTH", payload: auth });
        }
    }, [store?.auth, auth, dispatch]);

    const authed = !!auth?.token;

    const name =
        auth?.user
            ? `Dr/a. ${auth.user?.firstname ?? ""} ${auth.user?.lastname ?? ""}`.trim()
            : sessionStorage.getItem("user_name") || "";

    const [cases, setCases] = useState([]);
    const [loadingCases, setLoadingCases] = useState(false);
    const [casesErr, setCasesErr] = useState("");

    useEffect(() => {
        if (!authed) return;
        (async () => {
            try {
                setLoadingCases(true);
                setCasesErr("");
                const resp = await fetch(`${API}/api/lawyers-courtfiles`, {
                    headers: { Authorization: `Bearer ${auth.token}` },
                });
                if (!resp.ok) {
                    const e = await resp.json().catch(() => ({}));
                    throw new Error(e.error || `HTTP ${resp.status}`);
                }
                const data = await resp.json();
                // si tu backend devuelve relaciones con courtfile incluido
                setCases(data.map(r => r.courtfile || r));
            } catch (e) {
                setCasesErr(e.message || "Error fetching courtfiles");
            } finally {
                setLoadingCases(false);
            }
        })();
    }, [API, authed, auth?.token]);

    return (
        <div className="container text-center mt-5">
            <h1>DASHBOARD LAWYER</h1>
            <h1>¡HELLO {authed ? (name) : "Dr/a., you must log in"}!</h1>



            {authed ? (
                <div className="container mt-4">
                    <h3>COURTFILES</h3>
                    {loadingCases && <p>Loading courtfiles...</p>}
                    {casesErr && (
                        <div className="alert alert-danger">{casesErr}</div>
                    )}
                    {!loadingCases && !casesErr && cases.length === 0 && (
                        <div className="alert alert-info">
                            No courtfiles linked yet. Please add one!
                        </div>
                    )}
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
                                            <td>{cf.status ? "Active" : "Inactive"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-5">
                        <h3>DEADLINES</h3>
                        <p>(todavía no implementado)</p>
                    </div>

                    <div className="mt-5">
                        <h3>APPOINTMENTS</h3>
                        <p>(todavía no implementado)</p>
                    </div>

                    <div className="text-end">
                        <LogoutButton className="btn btn-sm btn-outline-danger mt-5" />
                    </div>
                </div>
            ) : (
                <div className="d-flex gap-2 mt-5 justify-content-end">
                    <Link
                        to="/SignUpLawyer"
                        className="btn btn-sm btn-outline-warning mt-3"
                        style={{ border: "none" }}
                    >
                        Create User
                    </Link>
                    <Link
                        to="/"
                        className="btn btn-sm btn-outline-primary mt-3"
                        style={{ border: "none" }}
                    >
                        Sign in
                    </Link>
                </div>
            )}
        </div>
    );
};