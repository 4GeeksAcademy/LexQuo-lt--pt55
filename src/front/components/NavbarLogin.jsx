// NavbarLogin.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../Logued.css";
import LogoLexQuoB from "../assets/img/LogoLexQuoB.png";
import useGlobalReducer from "../hooks/useGlobalReducer"; // ajustá la ruta si es distinta

const NavbarLogin = () => {
  const { dispatch } = useGlobalReducer();
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark fixed-top py-2">
      <div className="container-fluid">

        {/* Izquierda: toggler + brand */}
        <div className="d-flex align-items-center">
          {/* 🔔 Toggler: abre/cierra la sidebar como offcanvas en < lg */}
          <button
            className="btn btn-sm btn-outline-light border-0 d-lg-none me-2"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#navbarVerticalOffcanvas"
            aria-controls="navbarVerticalOffcanvas"
            aria-label="Toggle sidebar"

          >
            <i className="bi bi-list" />
          </button>

          <Link to="/DashboardLawyer" className="navbar-brand d-flex align-items-center gap-2 mb-0 text-white">
            <img
              src={LogoLexQuoB}
              style={{ height: "30px" }}
            />
          </Link>
        </div>

        {/* Centro: buscador */}
        <form className="w-100 d-none d-md-block">
          <div className="position-relative mx-auto" style={{ maxWidth: 420 }}>
            <input
              type="search"
              placeholder="Search..."
              className="form-control form-control-sm rounded-pill bg-dark text-light border-secondary"
            />
            <i className="bi bi-search position-absolute top-50 end-0 translate-middle-y me-3 text-secondary" />
          </div>
        </form>

        {/* Derecha: iconos */}
        <ul className="navbar-nav flex-row gap-3 align-items-center ms-auto">
          <li className="nav-item">
            <button className="btn btn-sm btn-outline-light border-0 p-0">
              <i className="bi bi-brightness-high" />
            </button>
          </li>
          <li className="nav-item">
            <button className="btn btn-sm btn-outline-light border-0 p-0 position-relative">
              <i className="bi bi-bell" />
            </button>
          </li>
          <li className="nav-item dropdown">
            <a
              className="nav-link dropdown-toggle p-0"
              href="#"
              id="userDropdown"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <img
                src="https://dummyimage.com/40x40/0b3a6a/ffffff.png&text=LQ"
                alt="User Avatar"
                className="rounded-circle"
                style={{ height: 32, width: 32 }}
              />
            </a>
            <ul className="dropdown-menu dropdown-menu-start" style={{ right: 0, left: "auto" }} aria-labelledby="userDropdown">
              <li><Link className="dropdown-item" to="/lawyers/view/:lawyerId">Perfil</Link></li>
              <li><Link className="dropdown-item" to="/">Configuración</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <NavLink
                  to="#"
                  className="dropdown-item" // en vez de nav-link, para que se vea bien en el menú
                  onClick={(e) => {
                    e.preventDefault();
                    localStorage.removeItem("auth");
                    localStorage.removeItem("user_name");
                    dispatch({ type: "CLEAR_AUTH" });
                    navigate("/login");
                  }}
                >
                  <div className="d-flex align-items-center">
                    <i className="bi bi-box-arrow-right me-2" />
                    Logout
                  </div>
                </NavLink>
              </li>
            </ul>
          </li>
        </ul>

      </div>
    </nav>
  );
};

export default NavbarLogin;


