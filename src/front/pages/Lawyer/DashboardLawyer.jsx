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

    useEffect(() => {
        if (store?.auth && store.auth !== auth) {
            setAuth(store.auth);
        }
    }, [store?.auth]);

    const authed = !!auth?.token;

    const name =
        auth?.user
            ? `Dr/a. ${auth.user?.firstname ?? ""} ${auth.user?.lastname ?? ""}`.trim()
            : sessionStorage.getItem("user_name") || "";

    //....................... FLUJO COMPLETO PARA COURTFILES..........................................
    const [cases, setCases] = useState([]);
    const [loadingCases, setLoadingCases] = useState(false);
    const [casesErr, setCasesErr] = useState("");

    const [creating, setCreating] = useState(false);
    const [createErr, setCreateErr] = useState("");

    const [form, setForm] = useState({
        case_number: "",
        title: "",
        jurisdiction: "",
        court: "",
        status: "ACTIVE", // o "INACTIVE"
        description: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!authed) return;
        setCreating(true);
        setCreateErr("");
        try {
            const cfResp = await fetch(`${API}/api/courtfiles`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${auth.token}`,
                },
                body: JSON.stringify({
                    case_number: form.case_number,
                    title: form.title,
                    description: form.description,
                    jurisdiction: form.jurisdiction,
                    court: form.court,
                    status: form.status,
                }),
            });
            if (!cfResp.ok) {
                const e = await cfResp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${cfResp.status}`);
            }
            const newCF = await cfResp.json();

            const relResp = await fetch(`${API}/api/lawyers-courtfiles`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${auth.token}`,
                },
                body: JSON.stringify({
                    courtfile_id: newCF.id,
                }),
            });
            if (!relResp.ok) {
                const e = await relResp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${relResp.status}`);
            }
            await fetchCases();

            setForm({
                case_number: "",
                title: "",
                jurisdiction: "",
                court: "",
                status: "",
                description: ""
            });
        } catch (err) {
            setCreateErr(err.message || "Error creating courtfile");
        } finally {
            setCreating(false);
        }
    };

    const [deletingId, setDeletingId] = useState(null);
    const handleDeleteRelation = async (relationId) => {
        if (!authed) return;
        if (!window.confirm("Delete this link? The case will no longer be associated with this lawyer.")) return;
        try {
            setDeletingId(relationId);
            const resp = await fetch(`${API}/api/lawyers-courtfiles/${relationId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            if (!resp.ok) {
                const e = await resp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${resp.status}`);
            }
            // refresco
            await fetchCases();
        } catch (err) {
            alert(err.message || "Error deleting relation");
        } finally {
            setDeletingId(null);
        }
    };

    const fetchCases = async () => {
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
            // guardo relation_id para poder borrar vínculos
            setCases(data.map(r => ({ relation_id: r.id, ...(r.courtfile || r) })));
        } catch (e) {
            setCasesErr(e.message || "Error fetching courtfiles");
        } finally {
            setLoadingCases(false);
        }
    };


    //....................... FLUJO COMPLETO PARA DEADLINES..........................................
    const [deadlines, setDeadlines] = useState([]);
    const [loadingDeadlines, setLoadingDeadlines] = useState(false);
    const [deadlinesErr, setDeadlinesErr] = useState("");
    const [deletingDeadlineRelId, setDeletingDeadlineRelId] = useState(null);

    const fetchDeadlines = async () => {
        try {
            setLoadingDeadlines(true);
            setDeadlinesErr("");
            const resp = await fetch(`${API}/api/deadlines-courtfiles`, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            if (!resp.ok) {
                const e = await resp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${resp.status}`);
            }
            const data = await resp.json();
            // guardo relation_id (id de la relación) + el resto
            setDeadlines(data.map(d => ({ relation_id: d.id, ...d })));
        } catch (e) {
            setDeadlinesErr(e.message || "Error fetching deadlines");
        } finally {
            setLoadingDeadlines(false);
        }
    };

    const handleDeleteDeadlineRelation = async (relationId) => {
        if (!authed) return;
        if (!window.confirm("Delete this link? The deadline will no longer be associated with this case.")) return;
        try {
            setDeletingDeadlineRelId(relationId);
            const resp = await fetch(`${API}/api/deadlines-courtfiles/${relationId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            if (!resp.ok) {
                const e = await resp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${resp.status}`);
            }
            await fetchDeadlines();
        } catch (err) {
            alert(err.message || "Error deleting relation");
        } finally {
            setDeletingDeadlineRelId(null);
        }
    };

    const getPriorityBadgeClass = (priority = "") => {
        switch (String(priority).toLowerCase()) {
            case "low": return "bg-secondary";
            case "medium": return "bg-info";
            case "high": return "bg-warning";
            case "urgent": return "bg-danger";
            default: return "bg-secondary";
        }
    };

    // ....................... FLUJO COMPLETO PARA APPOINTMENTS ..........................................
    const [appointments, setAppointments] = useState([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [appointmentsErr, setAppointmentsErr] = useState("");
    const [deletingApptRelId, setDeletingApptRelId] = useState(null);

    const fetchAppointments = async () => {
        try {
            setLoadingAppointments(true);
            setAppointmentsErr("");
            const resp = await fetch(`${API}/api/appointments-courtfiles`, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            if (!resp.ok) {
                const e = await resp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${resp.status}`);
            }
            const data = await resp.json();
            // guardo relation_id (id de la relación) + el resto
            setAppointments(data.map(a => ({ relation_id: a.id, ...a })));
        } catch (e) {
            setAppointmentsErr(e.message || "Error fetching appointments");
        } finally {
            setLoadingAppointments(false);
        }
    };

    const handleDeleteAppointmentRelation = async (relationId) => {
        if (!authed) return;
        if (!window.confirm("Delete this link? The appointment will no longer be associated with this case.")) return;
        try {
            setDeletingApptRelId(relationId);
            const resp = await fetch(`${API}/api/appointments-courtfiles/${relationId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            if (!resp.ok) {
                const e = await resp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${resp.status}`);
            }
            await fetchAppointments();
        } catch (err) {
            alert(err.message || "Error deleting relation");
        } finally {
            setDeletingApptRelId(null);
        }
    };

    useEffect(() => {
        if (!authed) return;
        fetchCases();
        fetchDeadlines();
        fetchAppointments();
    }, [API, authed, auth?.token, dispatch]);


    return (
        <div className="container text-center mt-5">
            <h1>DASHBOARD LAWYER</h1>
            <h1>¡HELLO {authed ? (name) : "Dr/a., you must log in"}!</h1>



            {authed ? (
                <div className="mt-5 text-start">
                    <div className="d-flex justify-content-between align-items-center">
                        <h3>COURTFILES</h3>
                        <div className="d-flex justify-content-end mb-3">
                            <Link
                                to="/courtfiles/addcourtfile"
                                state={{ linkToLawyer: true, returnTo: "/DashboardLawyer" }}
                                className="btn btn-sm btn-success"
                            >
                                + Create New Courtfile
                            </Link>
                        </div>
                    </div>
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
                                                <span className={`badge ${cf.status === true ? "bg-success" : cf.status === false ? "bg-secondary" : "bg-info"}`}>
                                                    {typeof cf.status === "boolean" ? (cf.status ? "Active" : "Inactive") : cf.status}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <Link
                                                    to={`/courtfiles/view/${cf.id}`}
                                                    className="btn btn-sm btn-info me-1"
                                                    title="View"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </Link>

                                                {/* Opcional: solo si tenés ruta de edición */}
                                                <Link
                                                    to={`/courtfiles/${cf.id}`}
                                                    className="btn btn-sm btn-warning me-1"
                                                    title="Edit"
                                                >
                                                    <i className="bi bi-pencil"></i>
                                                </Link>

                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    title={cf.relation_id ? "Unlink" : "No link available"}
                                                    disabled={!cf.relation_id || deletingId === cf.relation_id}
                                                    onClick={() => handleDeleteRelation(cf.relation_id)}
                                                >
                                                    {deletingId === cf.relation_id ? (
                                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    ) : (
                                                        <i className="bi bi-trash"></i>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-5 text-start">
                        <div className="d-flex justify-content-between align-items-center">
                            <h3>DEADLINES</h3>
                            <Link
                                to="/deadlines/addDeadline"
                                state={{ returnTo: "/DashboardLawyer" }}
                                className="btn btn-sm btn-success"
                            >
                                + Create New Deadline
                            </Link>
                        </div>

                        {loadingDeadlines && <p className="mt-3">Loading deadlines...</p>}

                        {deadlinesErr && (
                            <div className="alert alert-danger mt-3">{deadlinesErr}</div>
                        )}

                        {!loadingDeadlines && !deadlinesErr && deadlines.length === 0 && (
                            <div className="alert alert-info mt-3">
                                No deadlines linked yet. Please add one!
                            </div>
                        )}

                        {!loadingDeadlines && deadlines.length > 0 && (
                            <div className="table-responsive mt-3">
                                <table className="table table-striped table-hover">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Deadline ID</th>
                                            <th>Type</th>
                                            <th>Date</th>
                                            <th>Hour</th>
                                            <th>Priority</th>
                                            <th>Case Number</th>
                                            <th>Case Title</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deadlines.map(dl => (
                                            <tr key={`${dl.relation_id}`}>
                                                <td>{dl.deadline_id}</td>
                                                <td>{dl.deadline_type}</td>
                                                <td>{dl.deadline_date}</td>
                                                <td>{dl.deadline_hour}</td>
                                                <td>
                                                    <span className={`badge ${getPriorityBadgeClass(dl.priority)}`}>
                                                        {String(dl.priority).charAt(0).toUpperCase() + String(dl.priority).slice(1).toLowerCase()}
                                                    </span>
                                                </td>
                                                <td>{dl.courtfile_number}</td>
                                                <td>{dl.courtfile_title}</td>
                                                <td className="text-end">
                                                    <Link
                                                        to={`/deadlines/view/${dl.deadline_id}`}
                                                        className="btn btn-sm btn-info me-1"
                                                        title="View"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </Link>
                                                    <Link
                                                        to={`/deadlines/${dl.deadline_id}`}
                                                        className="btn btn-sm btn-warning me-1"
                                                        title="Edit"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </Link>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        title={dl.relation_id ? "Unlink" : "No link available"}
                                                        disabled={!dl.relation_id || deletingDeadlineRelId === dl.relation_id}
                                                        onClick={() => handleDeleteDeadlineRelation(dl.relation_id)}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>


                    <div className="mt-5 text-start">
                        <div className="d-flex justify-content-between align-items-center">
                            <h3>APPOINTMENTS</h3>
                            <Link
                                to="/appointments/addAppointment"
                                state={{ returnTo: "/DashboardLawyer" }}
                                className="btn btn-sm btn-success"
                            >
                                + Create New Appointment
                            </Link>
                        </div>

                        {loadingAppointments && <p className="mt-3">Loading appointments...</p>}

                        {appointmentsErr && (
                            <div className="alert alert-danger mt-3">{appointmentsErr}</div>
                        )}

                        {!loadingAppointments && !appointmentsErr && appointments.length === 0 && (
                            <div className="alert alert-info mt-3">
                                No appointments linked yet. Please add one!
                            </div>
                        )}

                        {!loadingAppointments && appointments.length > 0 && (
                            <div className="table-responsive mt-3">
                                <table className="table table-striped table-hover">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Appointment ID</th>
                                            <th>Title</th>
                                            <th>Date</th>
                                            <th>Starts</th>
                                            <th>Ends</th>
                                            <th>Location</th>
                                            <th>Case Number</th>
                                            <th>Case Title</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointments.map(ap => (
                                            <tr key={`${ap.relation_id}`}>
                                                <td>{ap.appointment_id}</td>
                                                <td>{ap.appointment_title}</td>
                                                <td>{ap.appointment_date}</td>
                                                <td>{ap.starts_at}</td>
                                                <td>{ap.ends_at}</td>
                                                <td>{ap.appointment_location}</td>
                                                <td>{ap.courtfile_number}</td>
                                                <td>{ap.courtfile_title}</td>
                                                <td className="text-end">
                                                    <Link
                                                        to={`/appointments/view/${ap.appointment_id}`}
                                                        className="btn btn-sm btn-info me-1"
                                                        title="View"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </Link>
                                                    <Link
                                                        to={`/appointments/${ap.appointment_id}`}
                                                        className="btn btn-sm btn-warning me-1"
                                                        title="Edit"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </Link>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        title={ap.relation_id ? "Unlink" : "No link available"}
                                                        disabled={!ap.relation_id || deletingApptRelId === ap.relation_id}
                                                        onClick={() => handleDeleteAppointmentRelation(ap.relation_id)}
                                                    >
                                                        {deletingApptRelId === ap.relation_id ? (
                                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                        ) : (
                                                            <i className="bi bi-trash"></i>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
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