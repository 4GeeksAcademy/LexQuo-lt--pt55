// SidebarLogin.jsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Nav, Collapse } from "react-bootstrap";
import "../Logued.css";
import { useState, useEffect } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";

export default function SidebarLogin() {

  const { dispatch } = useGlobalReducer();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({
    courtfiles: false,
    calendar: false,
    payments: false
  });
  const location = useLocation();

  const returnState = { returnTo: location.pathname + location.search };

  useEffect(() => {
    const saved = localStorage.getItem("lq_sidebar_collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("lq_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const linkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Función para cerrar el offcanvas en móviles
  const closeOffcanvas = () => {
    const offcanvas = document.querySelector('.offcanvas');
    if (offcanvas) {
      const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvas);
      if (bsOffcanvas) {
        bsOffcanvas.hide();
      }
    }
  };

  return (
    <nav
      id="navbarVerticalOffcanvas"
      className={`offcanvas-lg offcanvas-start navbar-vertical bg-dark text-white ${collapsed ? "is-collapsed" : ""}`}
      tabIndex="-1"
      aria-labelledby="navbarVerticalOffcanvasLabel"
    >
      {/* Header solo en < lg */}
      <div className="offcanvas-header d-lg-none">
        <h5 className="offcanvas-title" id="navbarVerticalOffcanvasLabel">Menú</h5>
        <button
          type="button"
          className="btn-close btn-close-white text-reset"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>

      {/* Body: arriba scroll, abajo bloque fijo */}
      <div className="offcanvas-body p-0 d-flex flex-column">
        <div className="navbar-vertical-content scrollbar d-flex flex-column h-100">
          <ul className="navbar-nav flex-column pb-2">

            {/* Home */}
            <li className="nav-item pt-3">
              <NavLink
                to="/DashboardLawyer"
                state={returnState}
                className={linkClass}
                onClick={closeOffcanvas}
              >
                <div className="d-flex align-items-center">
                  <span className="nav-link-icon"><i className="bi bi-house" /></span>
                  <span className="nav-link-text">Home</span>
                </div>
              </NavLink>
            </li>

            {/* Courtfiles (grupo) */}
            <li className="nav-item mt-2">
              <div className="nav-label">Apps</div>

              <button
                className="nav-link dropdown-indicator w-100 text-start border-0 bg-transparent"
                onClick={() => toggleGroup('courtfiles')}
                aria-expanded={openGroups.courtfiles}
              >
                <div className="d-flex align-items-center">
                  <span className="dropdown-indicator-icon me-1">
                    <i className={`bi bi-caret-${openGroups.courtfiles ? 'down' : 'right'}-fill`} />
                  </span>
                  <span className="nav-link-icon"><i className="bi bi-folder2-open" /></span>
                  <span className="nav-link-text">Courtfiles</span>
                </div>
              </button>

              <Collapse in={openGroups.courtfiles}>
                <div>
                  <Nav as="ul" className="flex-column">
                    <Nav.Item as="li">
                      <NavLink
                        to="/courtfiles"
                        state={returnState}
                        className={linkClass}
                        onClick={closeOffcanvas}
                      >
                        List
                      </NavLink>
                    </Nav.Item>
                    <Nav.Item as="li">
                      <NavLink
                        to="/courtfiles/addcourtfile"
                        state={returnState}
                        className={linkClass}
                        onClick={closeOffcanvas}
                      >
                        New
                      </NavLink>
                    </Nav.Item>
                  </Nav>
                </div>
              </Collapse>

              {/* Chats (simple) */}
              <NavLink
                to="/chats"
                state={returnState}
                className={linkClass}
                onClick={closeOffcanvas}
              >
                <div className="d-flex align-items-center">
                  <span className="dropdown-indicator-icon me-1"></span>
                  <span className="nav-link-icon"><i className="bi bi-chat-dots" /></span>
                  <span className="nav-link-text">Chats</span>
                </div>
              </NavLink>

              {/* Calendar (grupo) */}
              <button
                className="nav-link dropdown-indicator w-100 text-start border-0 bg-transparent"
                onClick={() => toggleGroup('calendar')}
                aria-expanded={openGroups.calendar}
              >
                <div className="d-flex align-items-center">
                  <span className="dropdown-indicator-icon me-1">
                    <i className={`bi bi-caret-${openGroups.calendar ? 'down' : 'right'}-fill`} />
                  </span>
                  <span className="nav-link-icon"><i className="bi bi-calendar3" /></span>
                  <span className="nav-link-text">Calendar</span>
                </div>
              </button>

              <Collapse in={openGroups.calendar}>
                <div>
                  <Nav as="ul" className="flex-column">
                    <Nav.Item as="li">
                      <NavLink
                        to="/calendar"
                        state={returnState}
                        className={linkClass}
                        onClick={closeOffcanvas}
                      >
                        Calendar View
                      </NavLink>
                    </Nav.Item>
                    <Nav.Item as="li">
                      <NavLink
                        to="/deadlines"
                        state={returnState}
                        className={linkClass}
                        onClick={closeOffcanvas}
                      >
                        Deadlines
                      </NavLink>
                    </Nav.Item>
                    <Nav.Item as="li">
                      <NavLink
                        to="/appointments"
                        state={returnState}
                        className={linkClass}
                        onClick={closeOffcanvas}
                      >
                        Appointments
                      </NavLink>
                    </Nav.Item>
                  </Nav>
                </div>
              </Collapse>

              {/* Add Documents (directo a add) */}
              <NavLink
                to="/documents/addDocument"
                state={returnState}
                className={linkClass}
                onClick={closeOffcanvas}
              >
                <div className="d-flex align-items-center">
                  <span className="dropdown-indicator-icon me-1"></span>
                  <span className="nav-link-icon"><i className="bi bi-file-earmark-plus" /></span>
                  <span className="nav-link-text">Add Documents</span>
                </div>
              </NavLink>

              {/* Clients */}
              <NavLink
                to="/clients"
                state={returnState}
                className={linkClass}
                onClick={closeOffcanvas}
              >
                <div className="d-flex align-items-center">
                  <span className="dropdown-indicator-icon me-1"></span>
                  <span className="nav-link-icon"><i className="bi bi-people" /></span>
                  <span className="nav-link-text">Clients</span>
                </div>
              </NavLink>

              {/* Lawyers */}
              <NavLink
                to="/lawyers"
                state={returnState}
                className={linkClass}
                onClick={closeOffcanvas}
              >
                <div className="d-flex align-items-center">
                  <span className="dropdown-indicator-icon me-1"></span>
                  <span className="nav-link-icon"><i className="bi bi-person-badge" /></span>
                  <span className="nav-link-text">Lawyers</span>
                </div>
              </NavLink>

              {/* Payments (grupo) */}
              <button
                className="nav-link dropdown-indicator w-100 text-start border-0 bg-transparent"
                onClick={() => toggleGroup('payments')}
                aria-expanded={openGroups.payments}
              >
                <div className="d-flex align-items-center">
                  <span className="dropdown-indicator-icon me-1">
                    <i className={`bi bi-caret-${openGroups.payments ? 'down' : 'right'}-fill`} />
                  </span>
                  <span className="nav-link-icon"><i className="bi bi-cash-coin" /></span>
                  <span className="nav-link-text">Payments</span>
                </div>
              </button>

              <Collapse in={openGroups.payments}>
                <div>
                  <Nav as="ul" className="flex-column">
                    <Nav.Item as="li">
                      <NavLink
                        to="/payments"
                        state={returnState}
                        className={linkClass}
                        onClick={closeOffcanvas}
                      >
                        List
                      </NavLink>
                    </Nav.Item>
                    <Nav.Item as="li">
                      <NavLink
                        to="/payments/addPayment"
                        state={returnState}
                        className={linkClass}
                        onClick={closeOffcanvas}
                      >
                        Add
                      </NavLink>
                    </Nav.Item>
                  </Nav>
                </div>
              </Collapse>
            </li>
          </ul>

          {/* Bloque inferior fijo */}
          <div className="mt-auto pt-3">
            {/* Botón colapsar */}
            <button
              type="button"
              className="btn border-0 navbar-vertical-toggle fw-semibold w-100 white-space-nowrap d-flex justify-content-center"
              onClick={() => {
                const c = document.documentElement.classList;
                c.toggle("navbar-vertical-collapsed");
                localStorage.setItem(
                  "lq_sidebar_collapsed",
                  c.contains("navbar-vertical-collapsed") ? "1" : "0"
                );
                setCollapsed(prev => !prev);
              }}
            >
              <i className="bi bi-chevron-double-left me-2 toggle-icon" />
              <span className="navbar-vertical-footer-text">Collapsed View</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}