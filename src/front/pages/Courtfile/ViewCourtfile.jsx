import { Link, useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const ViewCourtfile = () => {
    const { store, dispatch } = useGlobalReducer();
    const { courtfileId } = useParams();
    const navigate = useNavigate();

    const API = import.meta.env.VITE_BACKEND_URL;

    const [courtfile, setCourtfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCourtfile = async () => {
            try {
                setLoading(true);

                const response = await fetch(`${API}/api/courtfiles/${courtfileId}`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setCourtfile(data);
                setError(null);
            } catch (error) {
                console.error('Error fetching courtfile:', error);
                setError('Failed to load courtfile data');
            } finally {
                setLoading(false);
            }
        };

        if (courtfileId) {
            fetchCourtfile();
        }
    }, [courtfileId]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this courtfile?')) {
            return;
        }

        try {

            const response = await fetch(`${API}/api/courtfiles/${courtfileId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                dispatch({ type: 'DELETE_COURTFILE', payload: courtfileId });
                navigate('/courtfiles');
                alert('Courtfile deleted successfully!');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete courtfile');
            }
        } catch (error) {
            console.error('Error deleting courtfile:', error);
            alert(`Error deleting courtfile: ${error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading courtfile...</p>
                </div>
            </div>
        );
    }

    if (error || !courtfile) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle"></i> {error || 'Courtfile not found'}
                </div>
                <Link to="/courtfiles" className="btn btn-primary">
                    <i className="bi bi-arrow-left"></i> Back to Courtfiles
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
                        <div>
                            <h1>Courtfile Details</h1>
                            <p className="text-muted">Case #{courtfile.id}</p>
                        </div>
                        <Link to="/courtfiles" className="btn btn-outline-secondary">
                            <i className="bi bi-arrow-left"></i> Back to List
                        </Link>
                    </div>

                    {/* Card con detalles */}
                    <div className="card">
                        <div className="card-header bg-dark text-white">
                            <h5 className="card-title mb-0">
                                <i className="bi bi-file-earmark-text"></i> Case Information
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                {/* Columna izquierda */}
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="fw-bold text-muted">Case Number</label>
                                        <p className="fs-5">{courtfile.case_number}</p>
                                    </div>

                                    <div className="mb-3">
                                        <label className="fw-bold text-muted">Title</label>
                                        <p className="fs-6">{courtfile.title}</p>
                                    </div>

                                    <div className="mb-3">
                                        <label className="fw-bold text-muted">Jurisdiction</label>
                                        <p>
                                            <span className="badge bg-secondary">
                                                {courtfile.jurisdiction}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Columna derecha */}
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="fw-bold text-muted">Court</label>
                                        <p>{courtfile.court}</p>
                                    </div>

                                    <div className="mb-3">
                                        <label className="fw-bold text-muted">Status</label>
                                        <p>
                                            <span className={`badge ${courtfile.status ? 'bg-success' : 'bg-danger'}`}>
                                                {courtfile.status ? 'Active' : 'Inactive'}
                                            </span>
                                        </p>
                                    </div>

                                    <div className="mb-3">
                                        <label className="fw-bold text-muted">Created Date</label>
                                        <p>{new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Descripción */}
                            <div className="row">
                                <div className="col-12">
                                    <div className="mb-3">
                                        <label className="fw-bold text-muted">Description</label>
                                        <div className="card bg-light">
                                            <div className="card-body">
                                                <p className="card-text">{courtfile.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card footer con botones de acción */}
                        <div className="card-footer bg-light">
                            <div className="d-flex gap-2 justify-content-end">
                                <Link
                                    to={`/courtfiles/${courtfile.id}`}
                                    className="btn btn-warning"
                                >
                                    <i className="bi bi-pencil"></i> Edit
                                </Link>

                                <button
                                    className="btn btn-danger"
                                    onClick={handleDelete}
                                >
                                    <i className="bi bi-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}