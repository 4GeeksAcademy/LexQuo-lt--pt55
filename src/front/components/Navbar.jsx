import { Link } from "react-router-dom";

export const Navbar = () => {

	return (
		<nav className="navbar navbar-dark bg-dark my-5 border-bottom border-2 border-white">
			<div className="container">
				<Link to="/" className="text-decoration-none">
					<span className="navbar-brand mx-2 my-2 h1">Home</span>
				</Link>
			</div>
		</nav>
	);
};