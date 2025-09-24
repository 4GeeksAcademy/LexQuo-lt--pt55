import React, { useEffect } from "react"
import rigoImageUrl from "../assets/img/rigo-baby.jpg";
import justiceImage from "../assets/img/justice.gif";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { Link } from "react-router-dom";
import HomeButtons from "../components/HomeButtons.jsx";


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
	<HomeButtons/>

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
					<Link to="/DashboardClient">
						<button className="btn btn-light me-2">Dashboard Client</button>
					</Link>
				</div>
			</div>

						<div className="container mt-5 mb-5">
				<h1>LOGIN ADMIN</h1>
				<div className="ml-auto mt-5 mb-5">
					<Link to="/LoginAdmin">
						<button className="btn btn-light me-2">Login Admin</button>
					</Link>
					<Link to="/SignUpAdminUser">
						<button className="btn btn-light me-2">Sign Up Admin</button>
					</Link>
					<Link to="/DashboardAdminUser">
						<button className="btn btn-light me-2">Dashboard Admin</button>
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