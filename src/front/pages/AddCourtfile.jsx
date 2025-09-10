import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const AddCourtfile = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();
    const API = import.meta.env.VITE_BACKEND_URL;

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
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const newCourtfile = await response.json();

                dispatch({ type: 'ADD_COURTFILE', payload: newCourtfile });

                navigate('/courtfiles');

                alert('Courtfile created successfully!');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create courtfile');
            }
        } catch (error) {
            console.error('Error creating courtfile:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h1>Add New Courtfile</h1>
                        <Link to="/courtfiles" className="btn btn-outline-secondary">
                            <i className="bi bi-arrow-left"></i> Back to List
                        </Link>
                    </div>

                    <div className="card">
                        <div className="card-body">
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    <i className="bi bi-exclamation-triangle"></i> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>

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
                                        placeholder="e.g., EXP-2024-001"
                                    />
                                </div>

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
                                        placeholder="Case title"
                                    />
                                </div>

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
                                        placeholder="Detailed description of the case"
                                    ></textarea>
                                </div>

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
                                    >
                                        <option value="">Select a jurisdiction</option>
                                        {JURISDICCIONES_PJN.map(jurisdiction => (
                                            <option key={jurisdiction} value={jurisdiction}>
                                                {jurisdiction}
                                            </option>
                                        ))}
                                    </select>
                                </div>

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
                                        placeholder="e.g., Juzgado Nacional de Primera Instancia"
                                    />
                                </div>

                                <div className="mb-3 form-check">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="status"
                                        name="status"
                                        checked={formData.status}
                                        onChange={handleInputChange}
                                    />
                                    <label className="form-check-label" htmlFor="status">
                                        Active Case
                                    </label>
                                </div>

                                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                    <Link to="/courtfiles" className="btn btn-secondary me-md-2">
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
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-plus-circle"></i> Create Courtfile
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