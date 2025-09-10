import { Link, useNavigate, useParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditLawyer = () => {
    const { store, dispatch } = useGlobalReducer();
    const { lawyerId } = useParams();
    const navigate = useNavigate();

    const API = import.meta.env.VITE_BACKEND_URL;

    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        password: '',
        is_active: true
    });

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState(null);

    const fetchLawyer = async () => {
        try {
            setFetching(true);

            const response = await fetch(`${API}/api/lawyers/${lawyerId}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setFormData(data);
            setError(null);
        } catch (error) {
            console.error('Error fetching lawyer:', error);
            setError('Failed to load lawyer data');
        } finally {
            setFetching(false);
        }
    };


    useEffect(() => {
        fetchLawyer();
    }, [lawyerId]);

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

            const response = await fetch(`${API}/api/lawyers/${lawyerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const updatedLawyer = await response.json();

                dispatch({
                    type: 'UPDATE_LAWYER',
                    payload: updatedLawyer
                });

                navigate(`/lawyers/view/${lawyerId}`);

                alert('Lawyer updated successfully!');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update Lawyer');
            }
        } catch (error) {
            console.error('Error updating Lawyer:', error);
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
                    <p>Loading Lawyer data...</p>
                </div>
            </div>
        );
    }

    if (error && !formData.firstname) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle"></i> {error}
                </div>
                <Link to="/lawyers" className="btn btn-primary">
                    Back to Lawyers
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
                        <h1>Edit Lawyer</h1>
                        <Link to="/lawyers" className="btn btn-outline-secondary">
                            <i className="bi bi-arrow-left"></i> Back to List
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
                                <div className="mb-3">
                                    <label htmlFor="firstname" className="form-label">
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="firstname"
                                        name="firstname"
                                        value={formData.firstname}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="lastname" className="form-label">
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="lastname"
                                        name="lastname"
                                        value={formData.lastname}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="phone" className="form-label">
                                        Phone *
                                    </label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone || ""}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="+54 9 11 5555-5555"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="password" className="form-label">
                                        Password (leave empty to keep current)
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                        placeholder="Enter new password"
                                    />
                                </div>

                                <div className="mb-3 form-check">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="is_active"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleInputChange}
                                        disabled={loading}
                                    />
                                    <label htmlFor="is_active" className="form-check-label">
                                        Active Lawyer
                                    </label>
                                </div>


                                {/* Buttons */}
                                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                    <Link to={`/lawyers/view/${lawyerId}`} className="btn btn-secondary me-md-2">
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
                                                <i className="bi bi-check-circle"></i> Update Lawyer
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