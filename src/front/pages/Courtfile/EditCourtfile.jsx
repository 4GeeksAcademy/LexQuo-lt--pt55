import { Link, useNavigate, useParams, useLocation  } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditCourtfile = () => {
    const { store, dispatch } = useGlobalReducer();
    const { courtfileId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const API = import.meta.env.VITE_BACKEND_URL;

    const auth = store?.auth || JSON.parse(sessionStorage.getItem("auth") || "null");
    const token = auth?.token;

    const returnTo = location.state?.returnTo || `/courtfiles/view/${courtfileId}`;

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

    const [formData, setFormData] = useState({
        case_number: '',
        title: '',
        description: '',
        jurisdiction: '',
        court: '',
        status: true
    });

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState(null);

    // Cargar los datos del courtfile al montar el componente
    useEffect(() => {
        const fetchCourtfile = async () => {
            try {
                setFetching(true);

                const response = await fetch(`${API}/api/courtfiles/${courtfileId}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setFormData({
                    ...data,
                    status: data.status === true || data.status === "true"
                });
                setError(null);
            } catch (error) {
                console.error('Error fetching courtfile:', error);
                setError('Failed to load courtfile data');
            } finally {
                setFetching(false);
            }
        };

        if (courtfileId) {
            fetchCourtfile();
        }
    }, [courtfileId, API, token]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {

            const response = await fetch(`${API}/api/courtfiles/${courtfileId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const updatedCourtfile = await response.json();

                dispatch({
                    type: 'UPDATE_COURTFILE',
                    payload: updatedCourtfile
                });

                navigate(returnTo, { replace: true });

                alert('Courtfile updated successfully!');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update courtfile');
            }
        } catch (error) {
            console.error('Error updating courtfile:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading courtfile data...</p>
                </div>
            </div>
        );
    }

    if (error && !formData.case_number) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
                <Link to="/courtfiles" className="btn btn-primary">
                    Back to Courtfiles
                </Link>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h1>Edit Courtfile</h1>
                        <Link to={returnTo} className="btn btn-outline-secondary">
                            <i className="bi bi-arrow-left"></i> Back
                        </Link>
                    </div>

                    {/* Formulario */}
                    <div className="card">
                        <div className="card-body">
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    <i className="bi bi-exclamation-triangle"></i> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {/* Case Number */}
                                <div className="mb-3">
                                    <label htmlFor="case_number" className="form-label">
                                        Case Number *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="case_number"
                                        name="case_number"
                                        value={formData.case_number}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                {/* Title */}
                                <div className="mb-3">
                                    <label htmlFor="title" className="form-label">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                {/* Description */}
                                <div className="mb-3">
                                    <label htmlFor="description" className="form-label">
                                        Description *
                                    </label>
                                    <textarea
                                        className="form-control"
                                        id="description"
                                        name="description"
                                        rows="4"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                    ></textarea>
                                </div>

                                {/* Jurisdiction */}
                                <div className="mb-3">
                                    <label htmlFor="jurisdiction" className="form-label">
                                        Jurisdiction *
                                    </label>
                                    <select
                                        className="form-select"
                                        id="jurisdiction"
                                        name="jurisdiction"
                                        value={formData.jurisdiction}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                    >
                                        <option value="">Select a jurisdiction</option>
                                        {JURISDICCIONES_PJN.map(jurisdiction => (
                                            <option key={jurisdiction} value={jurisdiction}>
                                                {jurisdiction}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Court */}
                                <div className="mb-3">
                                    <label htmlFor="court" className="form-label">
                                        Court *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="court"
                                        name="court"
                                        value={formData.court}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                {/* Status */}
                                <div className="mb-3 form-check">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="status"
                                        name="status"
                                        checked={formData.status === true || formData.status === "true"}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                    />
                                    <label className="form-check-label" htmlFor="status">
                                        Active Case
                                    </label>
                                </div>

                                {/* Buttons */}
                                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                    <Link to={returnTo} className="btn btn-secondary me-md-2">
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-circle"></i> Update Courtfile
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};