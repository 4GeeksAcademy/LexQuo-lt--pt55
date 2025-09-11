import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";

export const AddLawyer = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();
    const API = import.meta.env.VITE_BACKEND_URL;

    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        password: '',
        is_active: true,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.firstname?.trim() || !formData.lastname?.trim() || !formData.email?.trim() || !formData.phone?.trim() || !formData.password) {
            setError("Firstname, Lastname, Email, Phone and Password are required.");
            setLoading(false);
            return;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            setError("Invalid email.");
            setLoading(false);
            return;
        }
        if (formData.password.length < 8) {
            setError("Password must have at least 8 characters.");
            setLoading(false);
            return;
        }

        try {

            const payload = {
                firstname: formData.firstname.trim(),
                lastname: formData.lastname.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone?.trim(),
                password: formData.password,
                is_active: !!formData.is_active,
            };

            const response = await fetch(`${API}/api/lawyers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload), 
            });

            if (response.ok) {
                const newLawyer = await response.json();

                dispatch({ type: 'ADD_LAWYER', payload: newLawyer });

                alert('Lawyer created successfully!');

                navigate('/lawyers');

            } else if (response.status === 409) { 
                const errorData = await response.json();
                throw new Error(errorData.error || "Email already exists");
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
        } catch (err) {
            console.error("Error creating Lawyer:", err);
            setError(err.message || "Failed to create lawyer");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h1>Add New Lawyer</h1>
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
                                    <label htmlFor="firstname" className="form-label">
                                        Firstname *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="firstname"
                                        name="firstname"
                                        value={formData.firstname}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Firstname"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="lastname" className="form-label">
                                        Lastname *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="lastname"
                                        name="lastname"
                                        value={formData.lastname}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Lastname"
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
                                        placeholder="example@email.com"
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
                                    <label htmlFor="password" className="form-label"> Password * </label>
                                    <div className="input-group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-control"
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Password"
                                            minLength="6"
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowPassword(v => !v)}
                                            disabled={loading}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                                        </button>
                                    </div>
                                </div>

                                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                    <Link to="/lawyers" className="btn btn-secondary me-md-2">
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
                                                <i className="bi bi-plus-circle"></i> Create Lawyer
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