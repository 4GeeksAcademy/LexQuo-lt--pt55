// components/CalendarModal.jsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import DeadlineBadge from "../components/DeadlineBadge"; // 🔁 ajustá la ruta si hace falta

// ===== Helpers embebidos =====
const TZ = "America/Argentina/Buenos_Aires";
const pad2 = (n) => String(n).padStart(2, "0");

const toGoogleDates = (start, end, allDay) => {
  if (!start) return "";
  // Si no hay end, generamos uno (1h después o día siguiente si allDay)
  const safeEnd =
    end ||
    (allDay
      ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
      : new Date(start.getTime() + 60 * 60 * 1000));

  if (allDay) {
    const ymd = (d) =>
      `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
    // En Google, end es exclusivo
    return `${ymd(start)}/${ymd(safeEnd)}`;
  } else {
    const toUTC = (d) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    return `${toUTC(start)}/${toUTC(safeEnd)}`;
  }
};

const defaultCourtfileUrl = (id) =>
  `/courtfiles/ViewCourtfileLawyer/${id}`;

const buildGoogleCalUrl = (ev, courtfileUrlFn = defaultCourtfileUrl) => {
  const text = `${ev.title} — ${ev.type === "deadline" ? "Deadline" : "Appointment"}`;
  const detailsParts = [];
  if (ev.courtfileNumber) detailsParts.push(`Courtfile #${ev.courtfileNumber}`);
  if (ev.courtfileTitle) detailsParts.push(ev.courtfileTitle);
  if (ev.courtfileId) {
    const cfUrl = `${window.location.origin}${courtfileUrlFn(ev.courtfileId)}`;
    detailsParts.push(`Link: ${cfUrl}`);
  }
  const details = detailsParts.join(" · ");
  const dates = toGoogleDates(ev.start, ev.end, !!ev.allDay);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    details,
    dates,
    ctz: TZ,
  }).toString();

  return `https://calendar.google.com/calendar/render?${params}`;
};

// ===== Componente =====
const CalendarModal = ({ isOpen, onClose, event, onDelete, userRole }) => { // Agregar userRole como prop
  if (!isOpen || !event) return null;

  const { title, extendedProps = {} } = event;
  const {
    type,               // "deadline" | "appointment"
    recordId,
    courtfileId,
    courtfileTitle,
    courtfileNumber,
    details,
    location,
    priority,           // solo deadlines
    time                // hora (deadline) o rango/string (appointment)
  } = extendedProps;

  const isDeadline = String(type).toLowerCase() === "deadline";
  const isAppointment = String(type).toLowerCase() === "appointment";

  const editPath =
    isDeadline ? `/deadlines/${recordId}` :
      isAppointment ? `/appointments/${recordId}` : "#";

  const detailsPath = editPath;

  const fmtDate = (d) => {
    try {
      const dt = d instanceof Date ? d : new Date(d);
      return dt.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    } catch { return ""; }
  };

  const fmtTime = (d) => {
    try {
      const dt = d instanceof Date ? d : new Date(d);
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const renderDateTime = () => {
    const dayStr = fmtDate(event.start);
    if (event.allDay) return <p className="mb-1 mt-2">{dayStr} — All Day</p>;

    if (isDeadline) {
      const oneTime = time || fmtTime(event.start);
      return <p className="mb-1 mt-2">{dayStr}, {oneTime}</p>;
    }

    if (isAppointment) {
      if (time) return <p className="mb-1 mt-2">{dayStr}, {time}</p>;
      const from = fmtTime(event.start);
      const to = event.end ? fmtTime(event.end) : "";
      return <p className="mb-1 mt-2">{dayStr}{from ? `, ${from}` : ""}{to ? ` — ${to}` : ""}</p>;
    }

    const from = fmtTime(event.start);
    const to = event.end ? fmtTime(event.end) : "";
    return <p className="mb-1 mt-2">{dayStr}{from ? `, ${from}` : ""}{to ? ` — ${to}` : ""}</p>;
  };

  const descText = (isAppointment && details) ? details : "";

  const courtfilePath = courtfileId
    ? defaultCourtfileUrl(courtfileId)
    : null;

  // 🔗 URL para Google Calendar
  const googleUrl = buildGoogleCalUrl(
    {
      ...extendedProps,
      title: title || (isDeadline ? "Deadline" : "Appointment"),
      start: event.start,
      end: event.end,
      allDay: event.allDay,
    },
    defaultCourtfileUrl
  );

  // Verificar si el usuario es client
  const isClient = userRole === "client";

  return (
    <div
      className="modal fade show d-block"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}                      // click fuera => cierra
    >
      <div
        className="modal-dialog modal-dialog-centered modal-md"
        style={{ maxWidth: "500px" }}
        onClick={(e) => e.stopPropagation()} // clicks dentro => no cierra
      >
        <div className="modal-content border">
          {/* Header */}
          <div className="ps-card border-bottom border-translucent modal-header">
            <div className="w-100">
              <div className="modal-title text-body-highlight mb-1 h4">
                {title || (isDeadline ? "Deadline" : "Appointment")}
              </div>

              {/* Badges debajo del título */}
              <div className="d-flex flex-wrap gap-2 fs-10">
                <span className={`badge ${isDeadline ? "badge-phoenix badge-phoenix-danger" : "badge-phoenix badge-phoenix-primary"}`}>
                  {isDeadline ? "DEADLINE" : "APPOINTMENT"}
                </span>

                {isDeadline && (
                  <DeadlineBadge priority={priority} outline />
                )}
              </div>
            </div>

            <button type="button" className="p-1 ms-2 btn" onClick={onClose} aria-label="Close">
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Body */}
          <div className="px-card pt-2 pb-3 fs-9 modal-body">
            {/* Date and Time (sin borde arriba) */}
            <div className="pb-3">
              <h5 className="mb-0 text-body-secondary">Date and Time</h5>
              {renderDateTime()}
            </div>

            {/* Location */}
            {isAppointment && !!location && (
              <div className="pt-3 pb-3 border-top border-translucent">
                <h5 className="mb-0 text-body-secondary">Location</h5>
                <p className="mb-0 mt-2">{location}</p>
              </div>
            )}

            {/* Details */}
            {descText && (
              <div className="pt-3 pb-3 border-top border-translucent">
                <h5 className="mb-0 text-body-secondary">Details</h5>
                <p className="mb-0 mt-2">{descText}</p>
              </div>
            )}

            {/* Courtfile */}
            {(courtfileNumber || courtfileTitle) && (
              <div className="pt-3 pb-1 border-top border-translucent">
                <h5 className="mb-0 text-body-secondary">Courtfile</h5>
                <p className="mb-0 mt-2 text-truncate" title={`${courtfileNumber || ""} ${courtfileTitle || ""}`}>
                  {courtfilePath ? (
                    <Link
                      to={courtfilePath}
                      className="text-decoration-none link-body-emphasis"
                      onClick={onClose}
                    >
                      Case #{courtfileNumber}{courtfileTitle ? ` — ${courtfileTitle}` : ""}
                    </Link>
                  ) : (
                    <>Case #{courtfileNumber}{courtfileTitle ? ` — ${courtfileTitle}` : ""}</>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="d-flex px-card pt-0 border-top-0 modal-footer">
            {/* ✅ Add to Google a la izquierda */}
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="me-auto"
            >
              <i className="bi bi-google me-1" /> 
            </a>

            {/* Botones condicionales - ocultar Edit y Delete para client */}
            {!isClient && (
              <>
                <Link
                  role="button"
                  tabIndex={0}
                  to={editPath}
                  className="btn btn-phoenix-secondary btn-sm"
                  onClick={onClose}
                >
                  <i className="bi bi-pencil me-1" /> Edit
                </Link>

                <button
                  type="button"
                  className="btn btn-phoenix-danger btn-sm ms-2"
                  onClick={onDelete}
                >
                  <i className="bi bi-trash me-1" /> Delete
                </button>
              </>
            )}

            <Link
              role="button"
              tabIndex={0}
              to={detailsPath}
              className={`btn btn-primary btn-sm ${!isClient ? 'ms-2' : ''}`}
              onClick={onClose}
            >
              See more details <i className="bi bi-chevron-right ms-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarModal;