import { Link, useNavigate, useParams, Navigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const EditLawyer = () => {
    const { store, dispatch } = useGlobalReducer();
    const { lawyerId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState(null);

    const API = import.meta.env.VITE_BACKEND_URL;

    const location = useLocation();
    const ssAuth = JSON.parse(sessionStorage.getItem("auth") || "null");
    const token = ssAuth?.token || null;
    const role = (store?.me?.role || "").toLowerCase();
    const ALLOWED_ROLES = ["lawyer", "admin_user"];

    if (!token) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ returnTo: location.pathname + location.search }}
            />
        );
    }

    if (!role) {
        return (
            <div className="container mt-4 text-center">
                <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
                <p>Verificando permisos...</p>
            </div>
        );
    }

    if (!ALLOWED_ROLES.includes(role)) {
        return <Navigate to="/403" replace />;
    }

    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        password: '',
        file: null,
        is_active: true
    });



    const fetchLawyer = async () => {
        try {
            setFetching(true);

            const response = await fetch(`${API}/api/lawyers/${lawyerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setFormData({
                firstname: data.firstname ?? "",
                lastname: data.lastname ?? "",
                email: data.email ?? "",
                phone: data.phone ?? "",
                password: "",
                is_active: !!data.is_active,
            });
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
    }, [lawyerId, API, token]);

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


        if (!formData.firstname?.trim() || !formData.lastname?.trim() || !formData.phone?.trim()) {
            setError("Firstname, Lastname and Phone are required.");
            setLoading(false);
            return;
        }

        if (formData.password && formData.password.length < 8) {
            setError("Password must have at least 8 characters.");
            setLoading(false);
            return;
        }

        try {
            const data = new FormData();
            data.append('firstname', formData.firstname.trim());
            data.append('lastname', formData.lastname.trim());
            data.append('phone', formData.phone.trim());
            data.append('is_active', !!formData.is_active);

            if (formData.password) {
                data.append('password', formData.password);
            }

            if (formData.file) {
                data.append('file', formData.file);
            }

            const response = await fetch(`${API}/api/lawyers/${lawyerId}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
                body: data,
            });

            if (response.ok) {
                const updatedLawyer = await response.json();
                dispatch({ type: "UPDATE_LAWYER", payload: updatedLawyer });
                alert("Lawyer updated successfully!");
                navigate(`/lawyers/view/${lawyerId}`);
            } else if (response.status === 409) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Email already exists");
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to update Lawyer");
            }

        } catch (error) {
            console.error("Error updating Lawyer:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

            if (allowedTypes.includes(selectedFile.type)) {
                setFormData(prev => ({
                    ...prev,
                    file: selectedFile
                }));
                setError(null);
            } else {
                setFormData(prev => ({ ...prev, file: null }));
                setError("Only image formats (JPEG, PNG, GIF, WEBP) are allowed.");
                e.target.value = null;
            }
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
                                        readOnly
                                        disabled
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

                                <div className="mb-3">
                                    <label htmlFor="file" className="form-label">
                                        Profile image
                                    </label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        id="file"
                                        name="file"
                                        onChange={handleFileChange}
                                        disabled={loading}
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