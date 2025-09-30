// components/CalendarQuickCreateModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

export default function CalendarModalAdd({
    isOpen,
    onClose,
    dateISO, // "YYYY-MM-DD"
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const [kind, setKind] = useState("appointment"); // "appointment" | "deadline"

    // cerrar con Esc
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => e.key === "Escape" && onClose?.();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // dónde volver al salir de Add… (el Calendar)
    const returnTo = location.pathname + (location.search || "");

    const targetPath =
        kind === "appointment"
            ? `/appointments/addAppointment?date=${encodeURIComponent(dateISO || "")}`
            : `/deadlines/addDeadline?date=${encodeURIComponent(dateISO || "")}`;

    const go = () => {
        if (!dateISO) return;

        const url =
            kind === "appointment"
                ? `/appointments/addAppointment`
                : `/deadlines/addDeadline`;

        navigate(url, { state: { date: dateISO } });
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="modal fade show d-block"
            tabIndex={-1}
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={onClose} // click fuera => cierra
        >
            <div
                className="modal-dialog modal-dialog-centered"
                onClick={(e) => e.stopPropagation()} // clicks dentro => no cierra
            >
                <div className="modal-content border-translucent">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            go();
                        }}
                    >
                        {/* Header */}
                        <div className="modal-header px-card border-0">
                            <div className="w-100 d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 className="text-body-highlight lh-sm mb-0">Add new</h5>

                                    {/* Radios */}
                                    <div className="mt-2">
                                        <div className="form-check form-check-inline">
                                            <input
                                                id="qk-appointment"
                                                className="form-check-input"
                                                type="radio"
                                                name="qkKind"
                                                checked={kind === "appointment"}
                                                onChange={() => setKind("appointment")}
                                            />
                                            <label htmlFor="qk-appointment" className="form-check-label">
                                                Appointment
                                            </label>
                                        </div>
                                        <div className="form-check form-check-inline">
                                            <input
                                                id="qk-deadline"
                                                className="form-check-input"
                                                type="radio"
                                                name="qkKind"
                                                checked={kind === "deadline"}
                                                onChange={() => setKind("deadline")}
                                            />
                                            <label htmlFor="qk-deadline" className="form-check-label">
                                                Deadline
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <button type="button" className="btn p-1 fs-10 text-body" onClick={onClose}>
                                    DISCARD
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="modal-body p-card py-0">
                            <div className="mb-3">
                                <div className="small text-body-secondary">Date</div>
                                <div className="fw-semibold">{dateISO || "—"}</div>
                            </div>
                            {/* Si en el futuro querés sumar timepicker rápido, va acá */}
                        </div>

                        {/* Footer */}
                        <div className="modal-footer d-flex justify-content-between align-items-center border-0">


                            <button type="submit" className="btn btn-primary px-4 ms-auto" disabled={!dateISO}>
                                Continue
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
