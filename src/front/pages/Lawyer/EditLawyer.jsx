import { Link, useNavigate, useParams, Navigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../../hooks/useGlobalReducer";
import { useState, useEffect } from "react";
import AppNavsShell from "../../components/AppNavsShell";
import { toast } from 'react-toastify';

export const EditLawyer = () => {
  const { store, dispatch } = useGlobalReducer();
  const { lawyerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const API = import.meta.env.VITE_BACKEND_URL;

  // ---------- AUTH + ME ----------
  const token = store?.auth?.token || null;
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();

  // ---------- Guards ----------
  const allowed =
    role === "admin_user" ||
    role === "lawyer";

  if (!allowed) return <Navigate to="/403" replace />;

  // ---------- Estado local ----------
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const ALLOWED_ROLES = ["lawyer", "admin_user"];
  if (!ALLOWED_ROLES.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  const isAdmin = role === "admin_user";
  const isSelf = String(me?.id) === String(lawyerId);
  if (!isAdmin && !isSelf) return <Navigate to="/403" replace />;

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

    } catch (error) {
      console.error('Error fetching lawyer:', error);
      toast.error('Failed to load lawyer data');
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


    if (!formData.firstname?.trim() || !formData.lastname?.trim() || !formData.phone?.trim()) {
      toast.warn("Firstname, Lastname and Phone are required.");
      setLoading(false);
      return;
    }

    if (formData.password && formData.password.length < 8) {
      toast.warn("Password must have at least 8 characters.");
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
        toast.success("Lawyer updated successfully!");
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
      toast.error(error.message);
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

      } else {
        setFormData(prev => ({ ...prev, file: null }));
        toast.error("Only image formats (JPEG, PNG, GIF, WEBP) are allowed.");
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


  return (
    <AppNavsShell>
      <div className="container add-page">
        <div className="row">
          <div className="col-lg-9">
            {/* Breadcrumb (mismo estilo que EditDeadline) */}
            <nav aria-label="breadcrumb" className="mb-4">
              <ol className="breadcrumb small mb-0">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link to="/lawyers">Lawyers</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Edit #{lawyerId}
                </li>
              </ol>
            </nav>

            {/* Header con acciones */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-5 fw-bold mb-0">Edit Lawyer</h1>
              <div className="d-none d-md-flex gap-2">
                <Link
                  to={`/lawyers/view/${lawyerId}`}
                  className="btn btn-phoenix btn-phoenix-secondary"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  form="lawyerForm"
                  className="btn btn-phoenix btn-phoenix-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2" />
                      Update Lawyer
                    </>
                  )}
                </button>
              </div>
            </div>



            {/* Form (floating controls como en EditDeadline) */}
            <form id="lawyerForm" onSubmit={handleSubmit}>
              {/* Firstname */}
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control form-control-ux"
                  id="firstname"
                  name="firstname"
                  placeholder=" "
                  value={formData.firstname}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="firstname">First Name *</label>
              </div>

              {/* Lastname */}
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control form-control-ux"
                  id="lastname"
                  name="lastname"
                  placeholder=" "
                  value={formData.lastname}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="lastname">Last Name *</label>
              </div>

              {/* Email (read-only) */}
              <div className="form-floating mb-3">
                <input
                  type="email"
                  className="form-control form-control-ux"
                  id="email"
                  name="email"
                  placeholder=" "
                  value={formData.email}
                  readOnly
                  disabled
                />
                <label htmlFor="email">Email</label>
              </div>

              {/* Phone */}
              <div className="form-floating mb-3">
                <input
                  type="tel"
                  className="form-control form-control-ux"
                  id="phone"
                  name="phone"
                  placeholder=" "
                  value={formData.phone || ""}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <label htmlFor="phone">Phone *</label>
              </div>

              {/* Password (opcional) */}
              <div className="form-floating mb-3">
                <input
                  type="password"
                  className="form-control form-control-ux"
                  id="password"
                  name="password"
                  placeholder=" "
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <label htmlFor="password">Password (leave empty to keep current)</label>
              </div>

              {/* Profile image (no floating por ser file) */}
              <div className="mb-3">
                <label htmlFor="file" className="form-label">Profile image</label>
                <input
                  type="file"
                  className="form-control"
                  id="file"
                  name="file"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </div>

              {/* Active switch */}
              <div className="form-check form-switch mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <label className="form-check-label" htmlFor="is_active">
                  Active Lawyer
                </label>
              </div>
            </form>
            {/* Botones abajo (solo visibles en mobile) */}
            <div className="d-flex d-md-none gap-2 justify-content-end mt-4">
              <Link
                to={`/lawyers/view/${lawyerId}`}
                className="btn btn-phoenix btn-phoenix-secondary"
              >
                Cancel
              </Link>
              <button
                type="submit"
                form="lawyerForm"
                className="btn btn-phoenix btn-phoenix-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2" />
                    Update Lawyer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppNavsShell>
  );

};