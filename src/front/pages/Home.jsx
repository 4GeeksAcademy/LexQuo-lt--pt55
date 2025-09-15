import React, { useEffect } from "react"
import rigoImageUrl from "../assets/img/rigo-baby.jpg";
import justiceImage from "../assets/img/justice.gif";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { Link } from "react-router-dom";

export const Home = () => {

	const { store, dispatch } = useGlobalReducer()

	const loadMessage = async () => {
		try {
			const backendUrl = import.meta.env.VITE_BACKEND_URL

			if (!backendUrl) throw new Error("VITE_BACKEND_URL is not defined in .env file")

			const response = await fetch(backendUrl + "/api/hello")
			const data = await response.json()

			if (response.ok) dispatch({ type: "set_hello", payload: data.message })

			return data

		} catch (error) {
			if (error.message) throw new Error(
				`Could not fetch the message from the backend.
				Please check if the backend is running and the backend port is public.`
			);
		}

	}

	useEffect(() => {
		loadMessage()
	}, [])

	return (
		<div className="text-center mt-5">
			<h1 className="display-4 mb-5">LexQuo</h1>

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
				<Link to="/LawyersClients">
					<button className="btn btn-light me-2">Lawyers-Clients</button>
				</Link>
				<Link to="/CourtfilesDocuments">
					<button className="btn btn-light me-2">Courtfile-Documents</button>
				</Link>
			</div>

			<div className="container mt-5 mb-5">
				<h1>LOGIN LAWYER</h1>
				<div className="ml-auto mt-5 mb-5">
					<Link to="/LoginLawyer">
						<button className="btn btn-light me-2">Login Lawyer</button>
					</Link>
					<Link to="/SignUpLawyer">
						<button className="btn btn-light me-2">Sign Up Lawyer</button>
					</Link>
					<Link to="/DashboardLawyer">
						<button className="btn btn-light me-2">Dashboard Lawyer</button>
					</Link>
				</div>
			</div>

			<div className="container mt-5 mb-5">
				<h2>LOGIN CLIENT</h2>
				<div className="ml-auto mt-3 mb-3">
					<Link to="/LoginClient">
						<button className="btn btn-light me-2">Login Client</button>
					</Link>
					<Link to="/SignUpClient">
						<button className="btn btn-light me-2">Sign Up Client</button>
					</Link>
				</div>
			</div>


			<div className="alert alert-info">
				{store.message ? (
					<span>{store.message}</span>
				) : (
					<span className="text-danger">
						Loading message from the backend (make sure your python 🐍 backend is running)...
					</span>
				)}
			</div>
		</div>
	);
}; 