// NavbarLogin.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../Logued.css";
import LogoLexQuoB from "../assets/img/LogoLexQuoB.png";
import useGlobalReducer from "../hooks/useGlobalReducer";
import Avatar from "react-avatar";


const NavbarLogin = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();

  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();
  const id = me?.id;

  // Rutas según rol
  const profilePath =
    role === "lawyer"
      ? (id ? `/lawyers/view/${id}` : "/lawyers/view")
      : role === "client"
        ? (id ? `/clients/view/${id}` : "/clients/view")
        : "/sign-in";

  const passwordPath =
    role === "lawyer"
      ? (id ? `/lawyers/${id}/password` : "/lawyers/password")
      : role === "client"
        ? (id ? `/clients/${id}/password` : "/clients/password")
        : "/login";

  function getInitials(name = "") {
    if (!name) return "LQ";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark fixed-top py-2">
      <div className="container-fluid p-0 px-md-3">
        {/* Izquierda: toggler + brand */}
        <div className="d-flex align-items-center">
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
            <img src={LogoLexQuoB} style={{ height: "30px" }} />
          </Link>
        </div>

        {/* Spacer debajo de la navbar */}
    <div className="topbar-spacer" aria-hidden="true"></div>


        {/* Derecha: iconos */}
        <ul className="navbar-nav flex-row gap-3 align-items-center ms-auto">

          <li className="nav-item dropdown">
            <a
              href="#"
              className="nav-link p-0"
              id="userDropdown"
              role="button"
              data-bs-toggle="dropdown"
              data-bs-display="static"
              aria-expanded="false"
            >
              <Avatar
                name={me?.full_name || me?.email || "LexQuo User"}
                src={me?.url_img || undefined}   // ✅ foto si existe
                size="40"
                round={true}
                textSizeRatio={2}
                maxInitials={2}
                className="cursor-pointer"
              />
            </a>

            <ul
              className="dropdown-menu dropdown-menu-start"
              style={{ right: 0, left: "auto" }}
              aria-labelledby="userDropdown"
            >
              {/* Profile */}
              <li>
                <Link
                  className={`dropdown-item d-flex align-items-center ${!id ? "disabled" : ""}`}
                  to={id ? profilePath : "#"}
                  onClick={(e) => { if (!id) e.preventDefault(); }}
                >
                  <i className="bi bi-person me-2" /> Profile
                </Link>
              </li>

              {/* Change Password */}
              <li>
                <Link
                  className={`dropdown-item d-flex align-items-center ${!id ? "disabled" : ""}`}
                  to={id ? passwordPath : "#"}
                  onClick={(e) => { if (!id) e.preventDefault(); }}
                >
                  <i className="bi bi-gear me-2" /> Change Password
                </Link>
              </li>

              <li><hr className="dropdown-divider" /></li>

              {/* Logout */}
              <li>
                <NavLink
                  to="#"
                  className="btn btn-phoenix d-flex align-items-center fw-semibold text-dark"
                  onClick={(e) => {
                    e.preventDefault();
                    localStorage.removeItem("auth");
                    localStorage.removeItem("user_name");
                    dispatch({ type: "CLEAR_AUTH" });
                    navigate("/");
                  }}
                >
                  <i className="bi bi-box-arrow-right me-2" /> Sign out
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
