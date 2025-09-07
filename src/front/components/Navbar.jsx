import { Link } from "react-router-dom";

export const Navbar = () => {

	return (
		<nav className="navbar navbar-dark bg-dark my-5 border-bottom border-2 border-white">
			<div className="container">
				<Link to="/" className="text-decoration-none">
					<span className="navbar-brand mx-2 my-2 h1">Home</span>
				</Link>
				<div className="ml-auto">
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
						<button className="btn btn-light">Clients</button>
					</Link>
				</div>
			</div>
		</nav>
	);
};