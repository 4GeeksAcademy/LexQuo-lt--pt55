import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";

export const AddCourtfile = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();
    const API = import.meta.env.VITE_BACKEND_URL;

    const location = useLocation();
    const returnTo = location.state?.returnTo || "/courtfiles";

    const token = store?.auth?.token || null;
    const role = (store?.me?.role || "").toLowerCase();
    const meId = store?.me?.id || null;

    if (!["lawyer", "admin_user"].includes(role)) return <Navigate to="/403" replace />;

    const [formData, setFormData] = useState({
        case_number: '',
        title: '',
        description: '',
        jurisdiction: '',
        court: '',
        status: true
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [linking, setLinking] = useState(false);

    const JURISDICCIONES_PJN = [
        'CSJ - Corte Suprema de Justicia de la Nación', 'CIV - Cámara Nacional de Apelaciones en lo Civil', 'CAF - Cámara Nacional de Apelaciones en lo Contencioso Administrativo Federal',
        'CCF - Cámara Nacional de Apelaciones en lo Civil y Comercial Federal', 'CNE - Cámara Nacional Electoral', 'CSS - Cámara Federal de la Seguridad Social',
        'CPE - Cámara Nacional de Apelaciones en lo Penal Económico', 'CNT - Cámara Nacional de Apelaciones del Trabajo', 'CFP - Cámara Criminal y Correccional Federal',
        'CCO - Cámara Nacional de Apelaciones en lo Criminal y Correccional', 'COM - Cámara Nacional de Apelaciones en lo Comercial', 'CPF - Cámara Federal de Casación Penal',
        'CPN - Cámara Nacional de Casación Penal', 'FBB - Justicia Federal de Bahía Blanca', 'FCR - Justicia Federal de Comodoro Rivadavia', 'FCB - Justicia Federal de Córdoba',
        'FCT - Justicia Federal de Corrientes', 'FGR - Justicia Federal de General Roca', 'FLP - Justicia Federal de La Plata', 'FMP - Justicia Federal de Mar del Plata',
        'FMZ - Justicia Federal de Mendoza', 'FPO - Justicia Federal de Posadas', 'FPA - Justicia Federal de Paraná', 'FRE - Justicia Federal de Resistencia',
        'FSA - Justicia Federal de Salta', 'FRO - Justicia Federal de Rosario', 'FSM - Justicia Federal de San Martín', 'FTU - Justicia Federal de Tucumán'
    ];

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {

            const response = await fetch(`${API}/api/courtfiles`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const newCourtfile = await response.json();

                // Guardamos en store
                dispatch({ type: 'ADD_COURTFILE', payload: newCourtfile });
                // Si es LAWYER: vincula automáticamente con su propio id
                if (role === "lawyer") {
                    if (!meId) {
                        throw new Error("No pude obtener tu ID (me.id) para vincular el expediente.");
                    }
                    setLinking(true);
                    const relResp = await fetch(`${API}/api/lawyers-courtfiles`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ lawyer_id: meId, courtfile_id: newCourtfile.id })
                    });
                    if (!relResp.ok) {
                        const e = await relResp.json().catch(() => ({}));
                        throw new Error(e.error || `Failed to link courtfile (HTTP ${relResp.status})`);
                    }
                }

                // Navegación por rol
                const viewPath = role === "lawyer"
                    ? `/courtfiles/ViewCourtfileLawyer/${newCourtfile.id}`
                    : `/courtfiles/ViewCourtfileAdmin/${newCourtfile.id}`;
                const backTo = role === "lawyer" ? "/DashboardLawyer" : "/DashboardAdmin";

                navigate(viewPath, { replace: true, state: { returnTo: backTo } });

                alert('Courtfile created successfully!');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create courtfile');
            }
        } catch (error) {
            console.error('Error creating courtfile:', error);
            setError(error.message);
        } finally {
            setLinking(false);
            setLoading(false);
        }
    };

    return (
        <AppNavsShell>
            <div className="container main-content add-page">
                {/* Header */}
                <nav aria-label="breadcrumb" className="mb-3">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item">
                            <Link to={returnTo || "/courtfiles"}>Cases</Link>
                        </li>
                        <li className="breadcrumb-item active" aria-current="page">
                            Add
                        </li>
                    </ol>
                </nav>


                {/* Panel principal */}
                <div className="col-lg-8 col-xl-8">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h1 className="display-5 fw-bold mb-0">Add New Courtfile</h1>
                        <div className="d-flex gap-2">
                            <Link to={returnTo} className="btn btn-phoenix btn-phoenix-secondary">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                form="addCourtfileForm"
                                className="btn btn-phoenix btn-phoenix-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-plus-circle me-2" />
                                        Create Courtfile
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger d-flex align-items-center" role="alert">
                            <i className="bi bi-exclamation-triangle me-2" /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="addCourtfileForm">

                        {/* CASE NUMBER */}
                        <div className="form-floating mb-3">
                            <input
                                id="case_number"
                                name="case_number"
                                type="text"
                                className="form-control form-control-ux"
                                placeholder=" "               // <- necesario para floating
                                value={formData.case_number}
                                onChange={handleInputChange}
                                required
                            />
                            <label htmlFor="case_number">Case number *</label>
                        </div>

                        {/* TITLE */}
                        <div className="form-floating mb-3">
                            <input
                                id="title"
                                name="title"
                                type="text"
                                className="form-control form-control-ux"
                                placeholder=" "
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                            />
                            <label htmlFor="title">Title *</label>
                        </div>

                        {/* DESCRIPTION (textarea requiere altura fija) */}
                        <div className="form-floating mb-4">
                            <textarea
                                id="description"
                                name="description"
                                className="form-control form-control-ux"
                                placeholder=" "
                                style={{ height: 140 }}        // o la que quieras
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                            />
                            <label htmlFor="description">Description *</label>
                        </div>

                        {/* GRID 2 columnas */}
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="form-floating">
                                    <select
                                        id="jurisdiction"
                                        name="jurisdiction"
                                        className="form-select form-control-ux"
                                        value={formData.jurisdiction}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value=""></option>   {/* vacío para permitir el “placeholder” */}
                                        {JURISDICCIONES_PJN.map(j => (
                                            <option key={j} value={j}>{j}</option>
                                        ))}
                                    </select>
                                    <label htmlFor="jurisdiction">Jurisdiction *</label>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="form-floating">
                                    <input
                                        id="court"
                                        name="court"
                                        type="text"
                                        className="form-control form-control-ux"
                                        placeholder=" "
                                        value={formData.court}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <label htmlFor="court">Court *</label>
                                </div>
                            </div>
                        </div>


                        {/* SWITCH Estado */}
                        <div className="form-switch my-4">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="status"
                                name="status"
                                checked={formData.status}
                                onChange={handleInputChange}
                            />
                            <label className="form-check-label ms-2" htmlFor="status">Active case</label>
                        </div>


                    </form>
                </div>
            </div>
        </AppNavsShell>
    );
}