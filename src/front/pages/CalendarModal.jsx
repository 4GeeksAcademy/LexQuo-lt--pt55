// components/EventDetailsModal.jsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const CalendarModal = ({ isOpen, onClose, event, onDelete }) => {
  if (!isOpen || !event) return null;

  const { title, extendedProps = {} } = event;
  const {
    type,               // "deadline" | "appointment"
    recordId,
    courtfileTitle,
    courtfileNumber,
    details,
    location,
    createdAt,          // opcional: ISO
    description         // opcional
  } = extendedProps;

  const isDeadline = String(type).toLowerCase() === "deadline";
  const isAppointment = String(type).toLowerCase() === "appointment";

  const editPath =
    isDeadline ? `/deadlines/${recordId}` :
    isAppointment ? `/appointments/${recordId}` :
    "#";

  const detailsPath = editPath; // ajustá si tenés ruta específica de "ver"

  const fmtDateTime = (d) => {
    if (!d) return "";
    try {
      const dt = d instanceof Date ? d : new Date(d);
      const date = dt.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const time = event.allDay
        ? "All Day"
        : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `${date}${event.allDay ? "" : `, ${time}`}`;
    } catch {
      return "";
    }
  };

  // Accesibilidad: cerrar con Esc
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal fade show d-block"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border">
          {/* Header Phoenix */}
          <div className="ps-card border-bottom border-translucent modal-header">
            <div>
              <div className="modal-title text-body-highlight mb-0 h4">
                {title || (isDeadline ? "Deadline" : "Appointment")}
              </div>
            </div>

            {/* Botón cerrar estilo Phoenix (icono inline) */}
            <button type="button" className="p-1 ms-auto btn" onClick={onClose} aria-label="Close">
              {/* fa-xmark inline para no depender de assets */}
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Body Phoenix */}
          <div className="px-card pb-card pt-1 fs-9 modal-body">
            {/* Badges arriba */}
            <div className="mb-3 d-flex flex-wrap gap-2">
              <span className={`badge ${isDeadline ? "bg-danger" : "bg-primary"}`}>
                {isDeadline ? "Deadline" : "Appointment"}
              </span>
              {courtfileNumber && (
                <span className="badge bg-dark">
                  Case #{courtfileNumber}{courtfileTitle ? ` — ${courtfileTitle}` : ""}
                </span>
              )}
            </div>

            {/* Sección: Description */}
            <div className="mt-3 border-bottom border-translucent pb-3">
              <h5 className="mb-0 text-body-secondary">Description</h5>
              <p className="mb-0 mt-2">
                {description || details || (isDeadline
                  ? "No additional description for this deadline."
                  : "No additional details for this appointment.")}
              </p>
            </div>

            {/* Sección: Date and Time (estilo exacto del ejemplo) */}
            <div className="mt-4">
              <h5 className="mb-0 text-body-secondary">Date and Time</h5>
              <p className="mb-1 mt-2">
                {fmtDateTime(event.start)}
                {(!event.allDay && event.end) ? (
                  <> — {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                ) : null}
              </p>
            </div>

            {/* Para appointment, mostramos Location si existe */}
            {isAppointment && (location || details) && (
              <div className="mt-3">
                <h5 className="mb-0 text-body-secondary">Location</h5>
                <p className="mb-1 mt-2">{location || "No location specified"}</p>
              </div>
            )}

            {/* Created At opcional */}
            {(createdAt) && (
              <div className="mt-3">
                <h5 className="mb-0 text-body-secondary">Created</h5>
                <p className="mb-1 mt-2">
                  {fmtDateTime(createdAt)}
                </p>
              </div>
            )}
          </div>

          {/* Footer Phoenix */}
          <div className="d-flex justify-content-end px-card pt-0 border-top-0 modal-footer">
            <Link
              role="button"
              tabIndex={0}
              to={editPath}
              className="btn btn-phoenix-secondary btn-sm"
              onClick={onClose}
            >
              {/* lápiz: Bootstrap Icons */}
              <i className="bi bi-pencil me-1" /> Edit
            </Link>

            <button
              type="button"
              className="btn btn-phoenix-danger btn-sm ms-2"
              onClick={onDelete}
            >
              <i className="bi bi-trash me-1" /> Delete
            </button>

            <Link
              role="button"
              tabIndex={0}
              to={detailsPath}
              className="btn btn-primary btn-sm ms-2"
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
