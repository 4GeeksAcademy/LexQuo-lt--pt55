// DashboardCalendar.jsx
import Calendar from "react-calendar";
import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import "react-calendar/dist/Calendar.css";
import { es } from "date-fns/locale";

export default function DashboardCalendar({
  appointments = [],
  deadlines = [],
  getCourtfileUrl,
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();

  const pad2 = (n) => String(n).padStart(2, "0");
  const TZ = "America/Argentina/Buenos_Aires";


  function parseDateTimeLocal(dateStr, timeStr) {
    if (!dateStr) return null;
    const [y, m, d] = String(dateStr).split("-").map(Number);
    let hh = 0, mm = 0, ss = 0;
    if (timeStr) {
      const parts = String(timeStr).split(":").map(Number);
      hh = parts[0] ?? 0; mm = parts[1] ?? 0; ss = parts[2] ?? 0;
    }
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh, mm, ss);
    return isNaN(dt) ? null : dt;
  }

  function dateKeyLocal(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function fmtTimeRange(start, end) {
    const cut = (t) => (t ? String(t).slice(0, 5) : "");
    if (start && end) return `${cut(start)}–${cut(end)}`;
    if (start) return cut(start);
    return "";
  }

  // --- util: formatear fechas para Google Calendar ---
  function toGoogleDates(start, end, allDay) {
    if (allDay) {
      // formato all-day: YYYYMMDD/YYYYMMDD (end exclusivo → sumo 1 día)
      const ymd = (d) =>
        `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
      // end es exclusivo; ya lo calculamos como +1 día en la normalización
      return `${ymd(start)}/${ymd(end)}`;
    } else {
      // con hora: usar UTC con 'Z'
      const toUTC = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      return `${toUTC(start)}/${toUTC(end)}`;
    }
  }

  function buildGoogleCalUrl(ev) {
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
      ctz: TZ,
    }).toString();
    return `https://calendar.google.com/calendar/render?${params}`;
  }



  const pick = (obj, keyCandidates, fallback = undefined) => {
    for (const k of keyCandidates) {
      const v = k.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
      if (v !== undefined && v !== null) return v;
    }
    return fallback;
  };

  const courtfileUrl = (id) =>
    typeof getCourtfileUrl === "function"
      ? getCourtfileUrl(id)
      : `/courtfiles/ViewCourtfileLawyer/${id}`;

  // -------- NORMALIZACIÓN --------
  const events = useMemo(() => {
    // DEADLINES
    const normD = (deadlines || [])
      .map((rel) => {
        const d = pick(rel, ["deadline"], rel);
        const cf = pick(rel, ["courtfile"], null);
        const cfId = pick(rel, ["courtfile_id"], pick(cf, ["id"], null));
        const cfTitle = pick(cf, ["title"], "");
        const cfNumber = pick(cf, ["case_number"], "");

        const dateStr = pick(d, ["deadline_date", "due_date", "date"], null);
        const timeStr = pick(d, ["deadline_hour", "due_time", "time"], null);
        const date = parseDateTimeLocal(dateStr, timeStr);
        if (!date) return null;

        // si no hay hora → evento de día completo (end = +1 día)
        const allDay = !timeStr;
        const end = allDay
          ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
          : new Date(date.getTime() + 60 * 60 * 1000); // por defecto 1h

        return {
          id: `dead-${pick(d, ["id"], pick(rel, ["relation_id", "id"], Math.random()))}`,
          type: "deadline",
          // 🔧 usar deadline_type cuando exista
          title: pick(d, ["deadline_type", "type", "title", "name", "description"], "Deadline"),
          date,
          start: date,     // inicio real
          end,             // fin real
          allDay,
          time: timeStr ? String(timeStr) : "",
          courtfileId: cfId,
          courtfileTitle: cfTitle,
          courtfileNumber: cfNumber,
        };
      })
      .filter(Boolean);

    // APPOINTMENTS
    const normA = (appointments || [])
      .map((rel) => {
        const a = pick(rel, ["appointment"], rel);
        const cf = pick(rel, ["courtfile"], null);
        const cfId = pick(rel, ["courtfile_id"], pick(cf, ["id"], null));
        const cfTitle = pick(cf, ["title"], "");
        const cfNumber = pick(cf, ["case_number"], "");

        const apptDate = pick(a, ["appointment_date", "date", "start_date"], null);
        const startsAt = pick(a, ["starts_at", "start_time", "time"], null);
        const endsAt = pick(a, ["ends_at", "end_time"], null);
        const date = parseDateTimeLocal(apptDate, startsAt);
        if (!date) return null;

        const end = endsAt
          ? parseDateTimeLocal(apptDate, endsAt)
          : new Date(date.getTime() + 60 * 60 * 1000); // default 1h
        const allDay = !startsAt && !endsAt;

        return {
          id: `appt-${pick(a, ["id"], pick(rel, ["relation_id", "id"], Math.random()))}`,
          type: "appointment",
          // 🔧 usar appointment_title cuando exista
          title: pick(a, ["appointment_title", "title", "subject", "name", "description"], "Appointment"),
          date,
          start: date,
          end,
          allDay,
          time: fmtTimeRange(startsAt, endsAt),
          courtfileId: cfId,
          courtfileTitle: cfTitle,
          courtfileNumber: cfNumber,
        };
      })
      .filter(Boolean);

    const all = [...normD, ...normA];
    all.sort((x, y) => x.date - y.date);
    return all;
  }, [appointments, deadlines]);

  // -------- AGRUPACIÓN POR DÍA --------
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

  // -------- RENDER --------
  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
   
          <div className="text-end">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </button>
          </div>
        

        <Calendar
          value={selectedDate}
          onClickDay={(d) => setSelectedDate(d)}
          formatMonthYear={(locale, date) =>
            format(date, "MMMM yyyy", { locale: es }).replace(/^\p{Ll}/u, c => c.toUpperCase())
          }
          tileContent={({ date, view }) => {
            if (view !== "month") return null;
            const key = dateKeyLocal(date);
            const dayEvents = eventsByDay.get(key) || [];
            if (dayEvents.length === 0) return null;

            // un solo punto: prioridad a deadline
            const hasDeadline = dayEvents.some(ev => ev.type === "deadline");
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
                    boxShadow: "0 0 0 1px #fff",
                  }}
                />
              </div>
            );
          }}
          tileClassName={({ date }) => (isSameDay(date, selectedDate) ? "rc-day-selected" : undefined)}
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

          <ul className="list-group">
            {selectedDayEvents.map((ev) => (
              <li key={ev.id} className="list-group-item border-0">
                <div className="p-3 rounded-3 border bg-white hover-elevate d-flex align-items-center justify-content-between">
                  <div className="me-3">
                    {/* 🔧 badge fijo por tipo */}
                    <div className="d-flex flex-column">
                      <span
                        className={`badge rounded-pill fw-semibold me-2 fs-7 ${ev.type === "deadline" ? "bg-danger" : "bg-primary"}`}
                        style={{ width: 112, letterSpacing: ".02em", textAlign: "center" }}
                      >
                        {ev.type === "deadline" ? "Deadline" : "Appointment"}
                      </span>

                      {/* 🔧 negrita: deadline_type / appointment_title */}
                      <span className="fw-semibold mt-1">{ev.title}</span>
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: 13 }}>
                      {ev.time ? <span><i className="bi bi-clock me-1" /> <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>Time: {ev.time}</span></span> : "No defined time"}
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
                        style={{ minWidth: 140 }}   // opcional, fija ancho
                      >
                        <span className="fw-semibold">
                          {ev.courtfileNumber ? `#${ev.courtfileNumber}` : "Expediente"}
                        </span>
                        {ev.courtfileTitle && (
                          <small className="text-muted text-truncate" style={{ maxWidth: "100%" }}>
                            {ev.courtfileTitle}
                          </small>
                        )}
                      </Link>
                    ) : (
                      <span className="badge bg-secondary">No Courtfile</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
/* =========================================
   React-Calendar — fila estable al hover
   (normalizamos <abbr> para TODOS los estados)
   ========================================= */

/* Base calendario */
.react-calendar { 
  width: 100%; 
  border: none; 
}

/* Navegación */
.react-calendar__navigation button { 
  border-radius: 8px; 
}

/* ---- Tiles (celdas de día) ---- */
.react-calendar__tile { 
  position: relative;                 /* para posicionar el dot sin mover nada */
  display: flex;
  align-items: center;                /* centra vertical */
  justify-content: center;            /* centra horizontal */
  border-radius: 10px; 
  transition: background 0.15s ease; 
  line-height: 1;                     /* evita respiración vertical */
  padding: 0.5rem 0 1.1rem !important;/* espacio inferior p/ dot */
}

/* Número del día: caja circular tamaño constante */
.react-calendar__tile abbr {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;                /* ~32px */
  height: 2rem;
  border-radius: 50%;
  box-sizing: border-box;     /* bordes no alteran tamaño */
  text-decoration: none;   
  cursor: default;         
  margin: 0;
  line-height: 1;
}

/* Hover de tile: solo color del círculo */
.react-calendar__tile:enabled:hover { 
  background: transparent !important; 
}
.react-calendar__tile:enabled:hover abbr {
  background: #d0d7de;
  color: inherit;
}

/* Día de hoy */
.react-calendar__tile--now {
  background: transparent !important;
  color: inherit;
  font-weight: 600;
}
.react-calendar__tile--now abbr {
  background: #1a73e8;  /* azul estilo Google */
  color: #fff;
}

/* Día seleccionado */
.react-calendar__tile--active {
  background: transparent !important;   
  color: inherit !important;
  box-shadow: none !important;          
  border-radius: 8px;                  
}
.react-calendar__tile--active abbr {
  background: transparent !important;    
  color: inherit !important;
  box-shadow: 0 0 0 2px #1a73e8;         
}

/* Hoy + Seleccionado → mantener relleno */
.react-calendar__tile--now.react-calendar__tile--active abbr {
  background: #1a73e8 !important;
  color: #fff !important;
  box-shadow: none !important;
}

/* Fines de semana */
.react-calendar__month-view__days__day--weekend {
  color: #6c757d !important; 
  font-weight: 500;          
}

/* (Opcional) altura mínima fija por fila */
.react-calendar__month-view__days__day {
  min-height: 44px; 
}

/* Marcador (dot) como elemento real */
.react-calendar__tile .rc-dot {
  position: absolute;
  bottom: 6px;                        /* ajustá a gusto (4–8px) */
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  pointer-events: none;               /* no robe el hover */
}

/* Colores de dot por tipo */
.react-calendar__tile .rc-dot.is-appointment { background: #1a73e8; }
.react-calendar__tile .rc-dot.is-deadline    { background: #d11a2a; }

/* Quitar subrayado de encabezados (LUN, MAR, ...) */
.react-calendar__month-view__weekdays abbr {
  text-decoration: none !important;
  border-bottom: none !important;
  cursor: default;
}

/* ===== Vista de MESES (year-view) ===== */

/* Sin círculo ni pill para los meses */
.react-calendar__year-view .react-calendar__tile abbr {
  display: inline;
  width: auto;
  height: auto;
  border-radius: 0;
  background: transparent !important;
  box-shadow: none !important;
}

/* Hover en year-view: no pintar fondo */
.react-calendar__year-view .react-calendar__tile:enabled:hover,
.react-calendar__year-view .react-calendar__tile:enabled:focus {
  background: transparent !important;
  color: inherit !important;
}

/* Mes actual (now) en year-view: color normal, sin fondo */
.react-calendar__year-view .react-calendar__tile--now abbr {
  background: transparent !important;
  color: inherit !important;
  box-shadow: none !important;
}

/* Mes activo / que contiene activo: solo negrita, sin pill */
.react-calendar__year-view .react-calendar__tile--active,
.react-calendar__year-view .react-calendar__tile--hasActive {
  background: transparent !important;
  color: inherit !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  font-weight: 600;
}

/* ---- Utilitario de tarjetas con hover-elevate ---- */
.hover-elevate { 
  transition: box-shadow .15s ease, transform .05s ease; 
  border: 1px solid rgba(0,0,0,.08); 
}
.hover-elevate:hover { 
  box-shadow: 0 8px 24px rgba(0,0,0,.08); 
  transform: translateY(-1px); 
}
`}</style>


    </div>
  );
}
