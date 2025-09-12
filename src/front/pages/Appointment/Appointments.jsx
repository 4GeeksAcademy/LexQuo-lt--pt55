import { Link } from "react-router-dom";
import React, { useEffect } from "react"
import useGlobalReducer from "../../hooks/useGlobalReducer";


export const Appointments = () => {
    const { store, dispatch } = useGlobalReducer()
    const API = import.meta.env.VITE_BACKEND_URL;

    const fetchAppointments = async () => {
        try {
            const response = await fetch(`${API}/api/appointments`);
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: 'SET_APPOINTMENTS', payload: data });
            } else {
                console.error("Error fetching appointments");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleDeleteAppointments = async (id) => {
        if (!window.confirm('Are you sure you want to delete this appointment?')) return

        try {
            const response = await fetch(`${API}/api/appointments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                dispatch({ type: 'DELETE_APPOINTMENT', payload: id });
                alert('Appointment deleted successfully!');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error deleting appointment:', error);
            alert(`Error deleting appointment: ${error.message}`);
        }
    };



    return (
        <div className="container mt-4">
            <h1 className="mb-4">APPOINTMENT</h1>

            <Link to="/appointments/addAppointment" className="btn btn-primary mb-3">
                <i className="bi bi-plus-circle"></i> New Appointment
            </Link>

            {store.appointments && store.appointments.length > 0 ? (
                <div className="table-responsive">
                    <table className="table table-striped table-hover">
                        <thead className="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Location</th>
                                <th>Date</th>
                                <th>Starts at</th>
                                <th>Ends at</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {store.appointments.map((appointment) => (
                                <tr key={appointment.id}>
                                    <td>
                                        <strong>{appointment.id}</strong>
                                    </td>
                                    <td>{appointment.title}</td>
                                    <td>{appointment.location}</td>
                                    <td>{appointment.date}</td>
                                    <td>{appointment.starts_at}</td>
                                    <td>{appointment.ends_at}</td>
                                    <td>{appointment.created_at}</td>
                                    <td>
                                        <Link
                                            to={`/appointments/view/${appointment.id}`}
                                            className="btn btn-sm btn-info me-1"
                                            title="View details"
                                        >
                                            <i className="bi bi-eye"></i>
                                        </Link>
                                        <Link
                                            to={`/appointments/${appointment.id}`}
                                            className="btn btn-sm btn-warning me-1"
                                            title="Edit"
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </Link>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            title="Delete"
                                            onClick={() => { handleDeleteAppointments(appointment.id) }}
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="alert alert-info">
                    <i className="bi bi-info-circle"></i> No appointments found. Create your first one!
                </div>
            )}
        </div>
    );
}