import { Link } from "react-router-dom";

const HomeButtons = () => {
    return ( 
                        <div className="ml-auto mt-5 mb-5">
                    <Link to="/courtfiles">
                        <button className="btn btn-light me-2">Courtfiles</button>
                    </Link>
                    <Link to="/lawyers">
                        <button className="btn btn-light me-2">Lawyers</button>
                    </Link>
                    <Link to="/admins">
                        <button className="btn btn-light me-2">Admins</button>
                    </Link>
                    <Link to="/clients">
                        <button className="btn btn-light me-2">Clients</button>
                    </Link>
                    <Link to="/deadlines">
                        <button className="btn btn-light me-2">Deadlines</button>
                    </Link>
                    <Link to="/appointments">
                        <button className="btn btn-light me-2">Appointments</button>
                    </Link>
                    <Link to="/documents">
                        <button className="btn btn-light me-2">Documents</button>
                    </Link>
                    <Link to="/payments">
                        <button className="btn btn-light me-2">Payments</button>
                    </Link>
                    <Link to="/ClientsCourtfiles">
                        <button className="btn btn-light me-2">Clients-Courtfiles</button>
                    </Link>
                    <Link to="/DeadlinesCourtfiles">
                        <button className="btn btn-light me-2">Deadlines-Courtfiles</button>
                    </Link>
                    <Link to="/LawyersCourtfiles">
                        <button className="btn btn-light me-2">Lawyers-Courtfiles</button>
                    </Link>
                    <Link to="/AppointmentsCourtfiles">
                        <button className="btn btn-light me-2">Appointments-Courtfiles</button>
                    </Link>
                    <Link to="/CourtfilesDocuments">
                        <button className="btn btn-light me-2">Courtfile-Documents</button>
                    </Link>
                    <Link to="/PaymentCourtfiles">
                        <button className="btn btn-light me-2">Payments-Courtfile</button>
                    </Link>
                </div>
    );
};

export default HomeButtons;