// NavbarLogin.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../Logued.css";
import LogoLexQuoB from "../assets/img/LogoLexQuoB.png";
import useGlobalReducer from "../hooks/useGlobalReducer";
import Avatar from "react-avatar";
import React, { useEffect, useRef, useState } from "react";

const NavbarLogin = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();

  const API = import.meta.env.VITE_BACKEND_URL;
  const token = store?.auth?.token;

  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();
  const id = me?.id;

  // ----- Rutas según rol
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

  // ==================== SEARCH BOX ====================
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // items: [{type, id, left, main, right}]
  const [items, setItems] = useState([]);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // ===== Utils
  const _join = (...xs) => xs.filter(Boolean).join(" ").trim();
  const _pick = (...cands) =>
    cands.find((v) => typeof v === "string" && v.trim().length) || "";

  // ===== Normalizadores robustos
  const toCourtfile = (row = {}) => {
    const cf = row.courtfile ?? row;
    return {
      id: cf?.id,
      case_number: cf?.case_number || "",
      title: cf?.title || "",
      jurisdiction: cf?.jurisdiction || "",
      court: cf?.court || "",
    };
  };

  const _nameFrom = (row = {}) => {
    // tu backend usa firstname/lastname
    const direct = _join(row.firstname, row.lastname);
    const snake = _join(row.first_name, row.last_name);
    const camel = _join(row.firstName, row.lastName);
    return (
      direct ||
      snake ||
      camel ||
      row.full_name ||
      row.fullName ||
      row.name ||
      row.display_name ||
      row.displayName ||
      row.email ||
      ""
    );
  };

  const toLawyer = (row = {}) => ({
    id: row.id ?? row.lawyer_id,
    name: _nameFrom(row),
    email: _pick(row.email, row.lawyer_email),
    phone: _pick(row.phone, row.lawyer_phone),
  });

  const toClient = (row = {}) => ({
    id: row.id ?? row.client_id,
    name: _nameFrom(row),
    email: _pick(row.email, row.client_email),
    phone: _pick(row.phone, row.client_phone),
  });

  const toAppointment = (row = {}) => {
    const a = row.appointment || row;
    return {
      id: a.id ?? row.appointment_id,
      title: a.title ?? row.appointment_title ?? "",
      date: a.date ?? row.appointment_date ?? "",
      starts_at: a.starts_at ?? row.starts_at ?? "",
      ends_at: a.ends_at ?? row.ends_at ?? "",
      courtfile_number: row.courtfile_number || row.case_number || "", // << nuevo
    };
  };

  const toDeadline = (row = {}) => {
    const d = row.deadline || row.deadlines || row;
    return {
      id: d.id ?? row.deadline_id,
      type: d.deadline_type ?? row.deadline_type ?? "",
      date: d.deadline_date ?? row.deadline_date ?? "",
      hour: d.deadline_hour ?? row.deadline_hour ?? "",
      courtfile_number: row.courtfile_number || row.case_number || "", // << nuevo
    };
  };


  const toDocument = (row = {}) => {
    const d = row.document || row;
    return {
      id: d.id ?? row.document_id ?? row.id,
      name: d.name ?? row.document_name ?? row.original_filename ?? "",
      category: d.category ?? row.category ?? "",
      type: d.type ?? row.mime_type ?? row.document_type ?? "",
      description: d.description ?? row.description ?? "",
      date:
        d.document_date ??
        row.document_date ??
        d.created_at ??
        row.created_at ??
        d.create_at ??
        row.create_at ??
        "",
      courtfile_number: row.courtfile_number || row.case_number || "", // << nuevo
    };
  };

  // ---- endpoints según rol
  const courtfilesEndpoint =
    role === "lawyer"
      ? `${API}/api/lawyers-courtfiles`
      : role === "client"
        ? `${API}/api/clients-courtfiles`
        : `${API}/api/courtfiles`;

  const lawyersEndpoint = `${API}/api/lawyers`;
  const clientsEndpoint = `${API}/api/clients`;

  // para mostrar solo lo que el usuario puede ver, usamos los endpoints de relaciones
  const appointmentsEndpoint =
    role === "admin_user" ? `${API}/api/appointments` : `${API}/api/appointments-courtfiles`;
  const deadlinesEndpoint =
    role === "admin_user" ? `${API}/api/deadlines` : `${API}/api/deadlines-courtfiles`;
  // documentos vinculados a expedientes visibles
  const documentsEndpoint = `${API}/api/courtfile-document`;

  // click afuera => cerrar
  useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // buscar en paralelo: courtfiles + lawyers + clients + appointments + deadlines + documents
  useEffect(() => {
    let t;
    const run = async () => {
      const query = q.trim().toLowerCase();
      if (query.length < 2) {
        setItems([]);
        setOpen(false);
        setHi(-1);
        return;
      }
      setLoading(true);

      const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };
      const fetchJson = (url) =>
        fetch(url, { headers })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []);

      try {
        const [cfRaw, lwRaw, clRaw, apRaw, dlRaw, docRaw] = await Promise.all([
          fetchJson(courtfilesEndpoint),
          fetchJson(lawyersEndpoint),
          fetchJson(clientsEndpoint),
          fetchJson(appointmentsEndpoint),
          fetchJson(deadlinesEndpoint),
          fetchJson(documentsEndpoint),
        ]);

        const match = (s = "") => s.toLowerCase().includes(query);

        // Courtfiles
        const cfList = (Array.isArray(cfRaw) ? cfRaw : [])
          .map(toCourtfile)
          .filter((cf) =>
            match([cf.case_number, cf.title, cf.jurisdiction, cf.court].filter(Boolean).join(" "))
          )
          .slice(0, 5)
          .map((cf) => ({
            type: "courtfile",
            id: cf.id,
            left: cf.case_number || "—",
            main: cf.title || "",
            right: cf.court || cf.jurisdiction || "",
          }));

        // Lawyers
        const lwList = (Array.isArray(lwRaw) ? lwRaw : [])
          .map(toLawyer)
          .filter((lw) => match([lw.name, lw.email, lw.phone].filter(Boolean).join(" ")))
          .slice(0, 5)
          .map((lw) => ({
            type: "lawyer",
            id: lw.id,
            left: lw.name || lw.email || "—",
            main: lw.email || "",
            right: lw.phone || "",
          }));

        // Clients
        const clList = (Array.isArray(clRaw) ? clRaw : [])
          .map(toClient)
          .filter((cl) => match([cl.name, cl.email, cl.phone].filter(Boolean).join(" ")))
          .slice(0, 5)
          .map((cl) => ({
            type: "client",
            id: cl.id,
            left: cl.name || cl.email || "—",
            main: cl.email || "",
            right: cl.phone || "",
          }));

        // Appointments
        const apList = (Array.isArray(apRaw) ? apRaw : [])
          .map(toAppointment)
          .filter(a => match([a.title, a.date, a.starts_at, a.ends_at, a.courtfile_number].filter(Boolean).join(" ")))
          .slice(0, 5)
          .map(a => ({
            type: "appointment",
            id: a.id,
            left: a.title || "—",
            main: [a.date, a.starts_at].filter(Boolean).join(" "), // fecha debajo
            right: a.courtfile_number || "",                      // nro. expte a la derecha
          }));

        // Deadlines
        const dlList = (Array.isArray(dlRaw) ? dlRaw : [])
          .map(toDeadline)
          .filter(d => match([d.type, d.date, d.hour, d.courtfile_number].filter(Boolean).join(" ")))
          .slice(0, 5)
          .map(d => ({
            type: "deadline",
            id: d.id,
            left: d.type || "—",
            main: [d.date, d.hour].filter(Boolean).join(" "),     // fecha debajo
            right: d.courtfile_number || "",                      // nro. expte a la derecha
          }));

        // Documents
        const docList = (Array.isArray(docRaw) ? docRaw : [])
          .map(toDocument)
          .filter(d =>
            match([d.name, d.category, d.type, d.description, d.date, d.courtfile_number]
              .filter(Boolean).join(" "))
          )
          .slice(0, 5)
          .map(d => ({
            type: "document",
            id: d.id,
            left: d.name || "—",
            main: d.date || "",                 // fecha debajo del título
            right: d.courtfile_number || "",    // nro. de expte a la derecha
          }));

        const combined = [...cfList, ...lwList, ...clList, ...apList, ...dlList, ...docList];
        setItems(combined);
        setOpen(combined.length > 0);
        setHi(-1);
      } catch (e) {
        console.error("search error", e);
        setItems([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    };

    t = setTimeout(run, 300); // debounce 300ms
    return () => clearTimeout(t);
  }, [
    q,
    courtfilesEndpoint,
    lawyersEndpoint,
    clientsEndpoint,
    appointmentsEndpoint,
    deadlinesEndpoint,
    documentsEndpoint,
    token,
  ]);

  const goFromItem = (it) => {
    if (!it) return;
    setOpen(false);
    setQ("");
    setItems([]);

    if (it.type === "courtfile") {
      if ((store?.me?.role || "").toLowerCase() === "client") {
        navigate(`/courtfiles/viewclient/${it.id}`);
      } else if ((store?.me?.role || "").toLowerCase() === "lawyer") {
        navigate(`/courtfiles/ViewCourtfileLawyer/${it.id}`);
      } else {
        // fallback por si el rol es admin_user u otro
        navigate(`/courtfiles/${it.id}`);
      }
    } else if (it.type === "lawyer") {
      navigate(`/lawyers/view/${it.id}`);
    } else if (it.type === "client") {
      navigate(`/clients/view/${it.id}`);
    } else if (it.type === "appointment") {
      navigate(`/appointments/view/${it.id}`);
    } else if (it.type === "deadline") {
      navigate(`/deadlines/view/${it.id}`);
    } else if (it.type === "document") {
      navigate(`/documents/view/${it.id}`);
    }
  };

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

        {/* ===== Phoenix Search (center) ===== */}
        <div className="flex-grow-1 d-none d-md-flex justify-content-center">
          <div
            ref={boxRef}
            className={`position-relative w-100 ${open ? "phoenix-open" : ""}`}
            style={{ maxWidth: 420 }}
          >
            <form
              className="position-relative"
              onSubmit={(e) => {
                e.preventDefault();
                const chosen = items[hi] ?? items[0];
                if (open && chosen) goFromItem(chosen);
              }}
            >
              <input
                ref={inputRef}
                placeholder="Search..."
                className="search-input search rounded-pill form-control form-control-sm phoenix-input"
                type="search"
                value={q}
                onFocus={() => q.trim().length >= 2 && setOpen(items.length > 0)}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (!open && e.key === "ArrowDown" && items.length) {
                    setOpen(true);
                    setHi(0);
                    return;
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHi((i) => (i + 1) % Math.max(items.length, 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHi((i) => (i <= 0 ? items.length - 1 : i - 1));
                  } else if (e.key === "Enter") {
                    if (open && items[hi]) {
                      e.preventDefault();
                      goFromItem(items[hi]);
                    }
                  } else if (e.key === "Escape") {
                    setOpen(false);
                    setHi(-1);
                    if (q) setQ("");
                  }
                }}
              />

              {/* Lupa */}
              <i
                className="bi bi-search"
                style={{
                  position: "absolute",
                  left: "0.9rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "inherit",
                }}
              />
              {/* Clear */}
              {q && (
                <button
                  type="button"
                  className="btn btn-sm phoenix-clear"
                  onClick={() => {
                    setQ("");
                    setItems([]);
                    setOpen(false);
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear"
                  title="Clear"
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}
                >
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </form>

            {/* Dropdown resultados */}
            {open && (
              <div
                className="dropdown-menu show phoenix-menu w-100 p-0"
              // si querés corrido a la derecha:
              // style={{ marginLeft: 12, width: 'calc(100% - 12px)' }}
              >
                {loading && (
                  <div className="dropdown-item py-2 text-muted small">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Searching…
                  </div>
                )}

                {!loading &&
                  (() => {
                    const cf = items.filter((i) => i.type === "courtfile");
                    const lw = items.filter((i) => i.type === "lawyer");
                    const cl = items.filter((i) => i.type === "client");
                    const ap = items.filter((i) => i.type === "appointment");
                    const dl = items.filter((i) => i.type === "deadline");
                    const dc = items.filter((i) => i.type === "document");

                    const Section = ({ title }) => (
                      <div className="dropdown-header text-uppercase small text-muted py-2 px-3">{title}</div>
                    );

                    const Row = (it, idx) => (
                      <button
                        key={`${it.type}-${it.id}`}
                        type="button"
                        className={`dropdown-item phoenix-item ${idx === hi ? "active" : ""}`}
                        onMouseEnter={() => setHi(idx)}
                        onClick={() => goFromItem(it)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <strong className="me-2">{it.left}</strong>
                          <span className="text-muted small">{it.right}</span>
                        </div>
                        <div className="text-truncate small text-secondary">{it.main}</div>
                      </button>
                    );

                    const linear = [...cf, ...lw, ...cl, ...ap, ...dl, ...dc];
                    let idx = 0;

                    return (
                      <>
                        {cf.length > 0 && <Section title="Courtfiles" />}
                        {cf.map((it) => Row(it, idx++))}

                        {lw.length > 0 && <Section title="Lawyers" />}
                        {lw.map((it) => Row(it, idx++))}

                        {cl.length > 0 && <Section title="Clients" />}
                        {cl.map((it) => Row(it, idx++))}

                        {ap.length > 0 && <Section title="Appointments" />}
                        {ap.map((it) => Row(it, idx++))}

                        {dl.length > 0 && <Section title="Deadlines" />}
                        {dl.map((it) => Row(it, idx++))}

                        {dc.length > 0 && <Section title="Documents" />}
                        {dc.map((it) => Row(it, idx++))}

                        {linear.length === 0 && (
                          <div className="dropdown-item py-2 text-muted small">No matches</div>
                        )}
                      </>
                    );
                  })()}
              </div>
            )}
          </div>
        </div>

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
                src={me?.url_img || undefined}
                size="40"
                round={true}
                textSizeRatio={2}
                maxInitials={2}
                className="cursor-pointer"
              />
            </a>

            <ul className="dropdown-menu dropdown-menu-start" style={{ right: 0, left: "auto" }} aria-labelledby="userDropdown">
              {/* Profile */}
              <li>
                <Link
                  className={`dropdown-item d-flex align-items-center ${!id ? "disabled" : ""}`}
                  to={id ? profilePath : "#"}
                  onClick={(e) => {
                    if (!id) e.preventDefault();
                  }}
                >
                  <i className="bi bi-person me-2" /> Profile
                </Link>
              </li>

              {/* Change Password */}
              <li>
                <Link
                  className={`dropdown-item d-flex align-items-center ${!id ? "disabled" : ""}`}
                  to={id ? passwordPath : "#"}
                  onClick={(e) => {
                    if (!id) e.preventDefault();
                  }}
                >
                  <i className="bi bi-gear me-2" /> Change Password
                </Link>
              </li>

              <li>
                <hr className="dropdown-divider" />
              </li>

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
