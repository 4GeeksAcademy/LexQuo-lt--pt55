// DashboardCalendar.jsx
import Calendar from "react-calendar";
import { useMemo, useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { Link } from "react-router-dom";
import "react-calendar/dist/Calendar.css";
import { es } from "date-fns/locale";

// ✅ Independiente: sin store. Props opcionales para api/token/urls.
export default function DashboardCalendar({
  apiBase,
  authToken,
  getCourtfileUrl
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ---------------------- Config ----------------------
  const API = apiBase || import.meta.env.VITE_BACKEND_URL || "";
  const TZ = "America/Argentina/Buenos_Aires";

  // Intenta encontrar un token si no se pasa por prop
  const token =
    authToken ||
    (() => {
      const tryGet = (k) => {
        try {
          const v = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (!v) return null;
          // admite plano o JSON con {token} o {auth:{token}}
          try {
            const parsed = JSON.parse(v);
            if (parsed?.token) return parsed.token;
            if (parsed?.auth?.token) return parsed.auth.token;
            if (typeof parsed === "string") return parsed;
          } catch {
            return v;
          }
        } catch {
          return null;
        }
      };
      return (
        tryGet("auth") ||
        tryGet("token") ||
        tryGet("access_token") ||
        tryGet("jwt") ||
        null
      );
    })();

  const pad2 = (n) => String(n).padStart(2, "0");

  // ---------------- Deadlines ----------------
  const [deadlines, setDeadlines] = useState([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);
  const [deadlinesErr, setDeadlinesErr] = useState("");
  const [deletingDeadlineRelId, setDeletingDeadlineRelId] = useState(null);

  const fetchDeadlines = async () => {
    try {
      setLoadingDeadlines(true);
      setDeadlinesErr("");
      const resp = await fetch(`${API}/api/deadlines-courtfiles`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      // ✅ guardo id de la RELACIÓN como relation_id (para DELETE /deadlines-courtfiles/:id)
      setDeadlines(data.map(d => ({ relation_id: d.id, ...d })));
    } catch (e) {
      setDeadlinesErr(e.message || "Error fetching deadlines");
    } finally {
      setLoadingDeadlines(false);
    }
  };

  // ---------------- Appointments ----------------
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsErr, setAppointmentsErr] = useState("");
  const [deletingApptRelId, setDeletingApptRelId] = useState(null);

  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      setAppointmentsErr("");
      const resp = await fetch(`${API}/api/appointments-courtfiles`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      // ✅ guardo id de la RELACIÓN como relation_id
      setAppointments(data.map(a => ({ relation_id: a.id, ...a })));
    } catch (e) {
      setAppointmentsErr(e.message || "Error fetching appointments");
    } finally {
      setLoadingAppointments(false);
    }
  };


  // ---------------- Delete ----------------
  const handleDeleteRelation = async (ev) => {
    if (!window.confirm(`¿Eliminar este vínculo de ${ev.type}?`)) return;

    const baseUrl =
      ev.type === "deadline"
        ? `${API}/api/deadlines-courtfiles`
        : `${API}/api/appointments-courtfiles`;

    try {
      if (ev.type === "deadline") setDeletingDeadlineRelId(ev.relationId);
      if (ev.type === "appointment") setDeletingApptRelId(ev.relationId);

      const resp = await fetch(`${baseUrl}/${ev.relationId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${resp.status}`);
      }

      // refresco la lista correspondiente
      if (ev.type === "deadline") await fetchDeadlines();
      if (ev.type === "appointment") await fetchAppointments();
    } catch (err) {
      alert(err.message || "Error deleting relation");
    } finally {
      if (ev.type === "deadline") setDeletingDeadlineRelId(null);
      if (ev.type === "appointment") setDeletingApptRelId(null);
    }
  };


  // ---------------- Helpers ----------------
  const pick = (obj, keyCandidates, fallback = undefined) => {
    for (const k of keyCandidates) {
      const v = k
        .split(".")
        .reduce((acc, part) => (acc ? acc[part] : undefined), obj);
      if (v !== undefined && v !== null) return v;
    }
    return fallback;
  };

  const parseDateTimeLocal = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const [y, m, d] = String(dateStr).split("-").map(Number);
    let hh = 0,
      mm = 0,
      ss = 0;
    if (timeStr) {
      const parts = String(timeStr).split(":").map(Number);
      hh = parts[0] ?? 0;
      mm = parts[1] ?? 0;
      ss = parts[2] ?? 0;
    }
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh, mm, ss);
    return isNaN(dt) ? null : dt;
  };

  const dateKeyLocal = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const fmtTimeRange = (start, end) => {
    const cut = (t) => (t ? String(t).slice(0, 5) : "");
    if (start && end) return `${cut(start)}–${cut(end)}`;
    if (start) return cut(start);
    return "";
  };

  const toGoogleDates = (start, end, allDay) => {
    if (allDay) {
      const ymd = (d) =>
        `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
      return `${ymd(start)}/${ymd(end)}`; // end exclusivo
    } else {
      const toUTC = (d) =>
        d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      return `${toUTC(start)}/${toUTC(end)}`;
    }
  };

  const courtfileUrl = (id) =>
    typeof getCourtfileUrl === "function"
      ? getCourtfileUrl(id)
      : `/courtfiles/ViewCourtfileLawyer/${id}`;

  const buildGoogleCalUrl = (ev) => {
    const text = `${ev.title} — ${ev.type === "deadline" ? "Deadline" : "Appointment"}`;
    const detailsParts = [];
    if (ev.courtfileNumber) detailsParts.push(`Courtfile #${ev.courtfileNumber}`);
    if (ev.courtfileTitle) detailsParts.push(ev.courtfileTitle);
    if (ev.courtfileId) {
      const cfUrl = `${window.location.origin}${courtfileUrl(ev.courtfileId)}`;
      detailsParts.push(`Link: ${cfUrl}`);
    }
    const details = detailsParts.join(" · ");
    const dates = toGoogleDates(ev.start, ev.end, !!ev.allDay);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text,
      details,
      dates,
      ctz: TZ
    }).toString();
    return `https://calendar.google.com/calendar/render?${params}`;
  };

  // ---------------- Normalización (sin store) ----------------
  const events = useMemo(() => {
    const normD = (deadlines || []).map((rel) => {

      const relationId = rel.relation_id ?? rel.id ?? null;

      const dateStr = rel.deadline_date || rel.due_date || rel.date || null;
      const timeStr = rel.deadline_hour || rel.due_time || rel.time || null;

      const date = parseDateTimeLocal(dateStr, timeStr);
      if (!date) return null;

      const allDay = !timeStr;
      const end = allDay
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        : new Date(date.getTime() + 60 * 60 * 1000);

      return {
        id: `dead-${rel.deadline_id ?? relationId ?? Math.random()}`,
        relationId,
        recordId: rel.deadline_id ?? null,

        type: "deadline",
        title: rel.deadline_type || rel.type || rel.title || rel.name || "Deadline",

        date,
        start: date,
        end,
        allDay,
        time: timeStr ? String(timeStr).slice(0, 5) : "", // “HH:MM” para UI

        courtfileId: rel.courtfile_id ?? null,
        courtfileTitle: rel.courtfile_title || "",
        courtfileNumber: rel.courtfile_number || "",
      };
    }).filter(Boolean);


    const normA = (appointments || []).map((rel) => {

      const relationId = rel.relation_id ?? rel.id ?? null;

      const apptDate = rel.appointment_date || rel.date || null;   // "2025-10-03"
      const startsAt = rel.starts_at || rel.start_time || rel.time || null; // "03:45"
      const endsAt = rel.ends_at || rel.end_time || null;             // "04:15"

      const date = parseDateTimeLocal(apptDate, startsAt);
      if (!date) return null;

      const end = endsAt
        ? parseDateTimeLocal(apptDate, endsAt)
        : new Date(date.getTime() + 60 * 60 * 1000);
      const allDay = !startsAt && !endsAt;

      return {
        id: `appt-${rel.appointment_id ?? relationId ?? Math.random()}`,
        relationId,                // para DELETE /appointments-courtfiles/:id
        recordId: rel.appointment_id ?? null,

        type: "appointment",
        title: rel.appointment_title || rel.title || rel.subject || "Appointment",

        date,
        start: date,
        end,
        allDay,
        time: fmtTimeRange(startsAt, endsAt),

        courtfileId: rel.courtfile_id ?? null,
        courtfileTitle: rel.courtfile_title || "",
        courtfileNumber: rel.courtfile_number || ""
      };
    }).filter(Boolean);

    const all = [...normD, ...normA];
    all.sort((x, y) => x.date - y.date);
    return all;
  }, [appointments, deadlines]);

  // ---------------- Agrupar por día ----------------
  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const key = dateKeyLocal(ev.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    return map;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    const key = dateKeyLocal(selectedDate);
    return eventsByDay.get(key) || [];
  }, [selectedDate, eventsByDay]);

  // ---------------- Efecto: carga inicial ----------------
  useEffect(() => {
    fetchDeadlines();
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token]); // se recarga si cambia api/token

  // ---------------- Render ----------------
  return (
    <div className="card shadow-sm border-0">
      <div className="card-body ">
        <div className="d-flex align-items-center justify-content-between mb-2">

          <div className="d-flex align-items-center w-100 mb-3">
            <div className="d-flex justify-content-start">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </button>
            </div>

            <div className="ms-auto d-flex justify-content-end gap-2">
              <Link to="/appointments/addAppointment" className="btn btn-sm btn-primary">
                <i className="bi bi-plus-lg me-1" />
                Add Appointment
              </Link>
              <Link to="/deadlines/addDeadline" className="btn btn-sm btn-danger">
                <i className="bi bi-plus-lg me-1" />
                Add Deadline
              </Link>
            </div>
          </div>


        </div>

        {(loadingDeadlines || loadingAppointments) && (
          <div className="small text-muted mb-2">
            Cargando eventos…
          </div>
        )}
        {(deadlinesErr || appointmentsErr) && (
          <div className="alert alert-warning py-2">
            {deadlinesErr || appointmentsErr}
          </div>
        )}

        <Calendar
          value={selectedDate}
          onClickDay={(d) => setSelectedDate(d)}
          formatMonthYear={(locale, date) =>
            format(date, "MMMM yyyy", { locale: es }).replace(/^\p{Ll}/u, (c) => c.toUpperCase())
          }
          tileContent={({ date, view }) => {
            if (view !== "month") return null;
            const key = dateKeyLocal(date);
            const dayEvents = eventsByDay.get(key) || [];
            if (dayEvents.length === 0) return null;

            const hasDeadline = dayEvents.some((ev) => ev.type === "deadline");
            const dotColor = hasDeadline ? "#dc3545" : "#0d6efd";
            const tooltipLabel = hasDeadline ? "Deadline" : "Appointment";

            return (
              <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                <span
                  title={`${tooltipLabel}: ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    display: "inline-block",
                    background: dotColor,
                    boxShadow: "0 0 0 1px #fff"
                  }}
                />
              </div>
            );
          }}
          tileClassName={({ date }) =>
            isSameDay(date, selectedDate) ? "rc-day-selected" : undefined
          }
        />

        {/* Lista del día seleccionado */}
        <div className="mt-3">
          <div className="d-flex align-items-center justify-content-between">
            <h6 className="mb-2">Events for {format(selectedDate, "dd/MM/yyyy")}</h6>
            <small className="text-muted">
              {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? "" : "s"}
            </small>
          </div>

          {selectedDayEvents.length === 0 && (
            <div className="text-center text-muted py-4 border rounded-3">
              <i className="bi bi-calendar2-x fs-4 d-block mb-1"></i>
              No events on this day
            </div>
          )}

          <ul className="list-unstyled event-list">
            {selectedDayEvents.map((ev) => (
              <li key={ev.id} className="event-item pb-0 mb-0">
                <div className="p-3 rounded-3 border bg-white hover-elevate d-flex align-items-center justify-content-between">
                  <div className="me-3">
                    <div className="d-flex flex-column">
                      <span className={`rc-pill ${ev.type === "deadline" ? "is-deadline" : "is-appointment"}`} >
                        {ev.type === "deadline" ? "Deadline" : "Appointment"}
                      </span>
                      <span className="rc-event-title mt-2">{ev.title}</span>
                    </div>
                    <div className="rc-event-time mt-1" style={{ fontSize: 13 }}>
                      {ev.time ? (
                        <span>
                          <i className="bi bi-clock me-1" />{" "}
                          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
                            Time: {ev.time}
                          </span>
                        </span>
                      ) : (
                        "No defined time"
                      )}
                    </div>
                    <div className="mt-2">
                      <a
                        href={buildGoogleCalUrl(ev)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                        title="Agregar a Google Calendar"
                      >
                        <i className="bi bi-google me-1" />
                        Add to Google Calendar
                      </a>
                    </div>
                  </div>

                  <div className="text-end">
                    {ev.courtfileId ? (
                      <Link
                        to={courtfileUrl(ev.courtfileId)}
                        className="btn btn-sm btn-outline-secondary d-flex flex-column align-items-center"
                        title="Ver expediente"
                        style={{ minWidth: 160 }}
                      >
                        {/* NÚMERO ARRIBA, EN NEGRITA */}
                        <span className="fw-semibold">
                          {ev.courtfileNumber ? `#${ev.courtfileNumber}` : "s/n"}
                        </span>

                        {/* TÍTULO ABAJO, MÁS CHICO Y TRUNCADO */}
                        <small className="text-muted text-truncate" style={{ maxWidth: "100%" }}>
                          {ev.courtfileTitle || "Sin título"}
                        </small>
                      </Link>
                    ) : (
                      <div className="d-flex flex-column align-items-end">
                        <span className="fw-semibold">s/c</span>
                        <small className="text-muted">Sin courtfile</small>
                      </div>
                    )}

                    <button
                      className="btn btn-sm btn-outline-danger mt-5"
                      onClick={() => handleDeleteRelation(ev)}
                      disabled={
                        (ev.type === "deadline" && deletingDeadlineRelId === ev.relationId) ||
                        (ev.type === "appointment" && deletingApptRelId === ev.relationId)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
