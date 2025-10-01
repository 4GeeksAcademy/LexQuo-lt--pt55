// components/calendar/DashboardCalendarWidget.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

// ⬇️ Ajustá las rutas según tu árbol:
import CalendarModal from "../pages/CalendarModal";
import CalendarModalAdd from "../pages/CalendarModalAdd";

// FullCalendar
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";


export default function DashboardCalendarWidget({
  apiBase,
  authToken,
  height = 420,
  contentHeight = 420,
}) {
  // ---------------- Config ----------------
  const API = apiBase || import.meta.env.VITE_BACKEND_URL || "";

  const token =
    authToken ||
    (() => {
      const tryGet = (k) => {
        try {
          const v = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (!v) return null;
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

  // ---------------- UI state ----------------
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewName, setViewName] = useState("dayGridMonth"); // "dayGridMonth" | "timeGridWeek"
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const calRef = useRef(null);

  // ---------------- Data state ----------------
  const [deadlines, setDeadlines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ---------------- Quick-create modal ----------------
  const [showNewPicker, setShowNewPicker] = useState(false);
  const [newDateISO, setNewDateISO] = useState("");
  const toYMD = (d) => {
    const pad2 = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const handleDateClick = (arg) => {
    const iso = arg.dateStr || toYMD(arg.date);
    setNewDateISO(iso);
    setShowNewPicker(true);
  };

  // ---------------- Fetch ----------------
  const fetchDeadlines = async () => {
    const resp = await fetch(`${API}/api/deadlines-courtfiles`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.map((d) => ({ relation_id: d.id, ...d }));
  };

  const fetchAppointments = async () => {
    const resp = await fetch(`${API}/api/appointments-courtfiles`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.map((a) => ({ relation_id: a.id, ...a }));
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const [dl, ap] = await Promise.all([fetchDeadlines(), fetchAppointments()]);
        if (!mounted) return;
        setDeadlines(dl);
        setAppointments(ap);
      } catch (e) {
        if (!mounted) return;
        setErr(e.message || "Error fetching events");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [API, token]);

  // ---------------- Helpers ----------------
  const pad2 = (n) => String(n).padStart(2, "0");
  const parseDateTimeLocal = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const [y, m, d] = String(dateStr).split("-").map(Number);
    let hh = 0, mm = 0, ss = 0;
    if (timeStr) {
      const parts = String(timeStr).split(":").map(Number);
      hh = parts[0] ?? 0;
      mm = parts[1] ?? 0;
      ss = parts[2] ?? 0;
    }
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh, mm, ss);
    return isNaN(dt) ? null : dt;
  };

  // ---------------- Modal handlers ----------------
  const handleEventClick = (info) => {
    info.jsEvent.preventDefault();
    setSelectedEvent(info.event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    const { type, relationId } = selectedEvent.extendedProps;
    const endpoint = type === "deadline" ? "deadlines-courtfiles" : "appointments-courtfiles";

    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      const response = await fetch(`${API}/api/${endpoint}/${relationId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const [dl, ap] = await Promise.all([fetchDeadlines(), fetchAppointments()]);
        setDeadlines(dl);
        setAppointments(ap);
        handleCloseModal();
      } else {
        throw new Error("Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Error deleting event");
    }
  };

  // ---------------- Normalización → FullCalendar events (igual que Calendar) ----------------
  const fcEvents = useMemo(() => {
    const normD = (deadlines || [])
      .map((rel) => {
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
          title: rel.deadline_type || rel.type || rel.title || rel.name || "Deadline",
          start: date,
          end,
          allDay,
          className: "lxq-deadline",
          extendedProps: {
            type: "deadline",
            relationId,
            recordId: rel.deadline_id ?? null,
            time: timeStr ? String(timeStr).slice(0, 5) : "",
            priority: rel.priority || rel.deadline_priority || "",
            courtfileId: rel.courtfile_id ?? null,
            courtfileTitle: rel.courtfile_title || "",
            courtfileNumber: rel.courtfile_number || "",
          },
        };
      })
      .filter(Boolean);

    const normA = (appointments || [])
      .map((rel) => {
        const relationId = rel.relation_id ?? rel.id ?? null;

        const apptDate = rel.appointment_date || rel.date || null;
        const startsAt = rel.starts_at || rel.start_time || rel.time || null;
        const endsAt = rel.ends_at || rel.end_time || null;

        const date = parseDateTimeLocal(apptDate, startsAt);
        if (!date) return null;

        const end = endsAt
          ? parseDateTimeLocal(apptDate, endsAt)
          : new Date(date.getTime() + 60 * 60 * 1000);
        const allDay = !startsAt && !endsAt;

        return {
          id: `appt-${rel.appointment_id ?? relationId ?? Math.random()}`,
          title: rel.appointment_title || rel.title || rel.subject || "Appointment",
          start: date,
          end,
          allDay,
          className: "lxq-appointment",
          extendedProps: {
            type: "appointment",
            relationId,
            recordId: rel.appointment_id ?? null,
            time: (startsAt || endsAt)
              ? `${(startsAt || "").slice(0, 5)}${endsAt ? "–" + String(endsAt).slice(0, 5) : ""}`
              : "",
            courtfileId: rel.courtfile_id ?? null,
            courtfileTitle: rel.courtfile_title || "",
            courtfileNumber: rel.courtfile_number || "",
            location: rel.appointment_location || "",
            details: rel.appointment_details || "",
          },
        };
      })
      .filter(Boolean);

    const all = [...normD, ...normA];
    all.sort((a, b) => a.start - b.start);
    return all;
  }, [deadlines, appointments]);

  // ---------------- Derived labels ----------------
  const dayName = useMemo(() => format(currentDate, "EEEE", { locale: enUS }), [currentDate]);
  const dayStamp = useMemo(() => format(currentDate, "dd MMM, yyyy", { locale: enUS }), [currentDate]);
  const monthTitle = useMemo(() => format(currentDate, "LLLL yyyy", { locale: enUS }), [currentDate]);
  // ---------------- Calendar API helpers ----------------
  const api = () => calRef.current?.getApi();
  const goToday = () => {
    api()?.today();
    setCurrentDate(api()?.getDate() ?? new Date());
  };
  const goPrev = () => {
    api()?.prev();
    setCurrentDate(api()?.getDate() ?? new Date());
  };
  const goNext = () => {
    api()?.next();
    setCurrentDate(api()?.getDate() ?? new Date());
  };
  const changeView = (v) => {
    setViewName(v);
    api()?.changeView(v);
    setCurrentDate(api()?.getDate() ?? new Date());
  };

  return (
    <div className="card border-0">
      <div className="card-body">
        {/* Mini topbar (compacta para dashboard) */}
        <div className="row g-0 align-items-center mb-3">
          <div className="col-12 col-md-6">
            <h4 className="mb-0 text-body-emphasis fw-bold fs-6">
              <span className="calendar-day d-block d-md-inline mb-1">{dayName}</span>
              <span className="px-3 fw-thin text-body-quaternary d-none d-md-inline">|</span>
              <span className="d-inline-block">{' '}{dayStamp}</span>
            </h4>
          </div>

          <div className="col-12 col-md-6 d-flex justify-content-end gap-2 mt-2 mt-md-0">
            <p className="fs-9">Add appointments and deadlines in just one click</p>
          </div>
        </div>

        {/* Sub-toolbar "phoenix-like" compacta */}
        <div className="mx-n3 px-3 border-y border-translucent">
          <div className="row gy-2 gx-0 justify-content-between py-2 align-items-center">
            {/* Left: Today */}
            <div className="col-6 col-md-auto d-flex align-items-center">
              <button type="button" className="btn btn-phoenix-primary btn-sm px-4" onClick={goToday}>
                Today
              </button>
            </div>

            {/* Center: prev | Month YYYY | next */}
            <div className="col-12 col-md-auto d-flex align-items-center justify-content-center">
              <button type="button" className="btn btn-icon" onClick={goPrev} aria-label="Previous">
                <i className="fa-solid fa-chevron-left" />
              </button>

              <h3 className="month-title mb-0 px-2 fw-bold fs-6">{monthTitle}</h3>

              <button type="button" className="btn btn-icon" onClick={goNext} aria-label="Next">
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>

            {/* Right: Month | Week */}
            <div className="col-6 col-md-auto d-flex justify-content-end">
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn btn-phoenix-secondary ${viewName === "dayGridMonth" ? "active" : ""}`}
                  onClick={() => changeView("dayGridMonth")}
                >
                  Month
                </button>
                <button
                  type="button"
                  className={`btn btn-phoenix-secondary ${viewName === "timeGridWeek" ? "active" : ""}`}
                  onClick={() => changeView("timeGridWeek")}
                >
                  Week
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Estado */}
        {loading && <div className="small text-muted mb-2">Cargando eventos…</div>}
        {err && !loading && <div className="alert alert-warning py-2">{err}</div>}

        {/* Calendar (compacto) */}
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={viewName}
          headerToolbar={false}
          height={height}
          contentHeight={contentHeight}
          firstDay={1}
          nowIndicator={true}
          editable={false}
          selectable={false}
          navLinks={false}
          dayHeaderFormat={{ weekday: "short" }}
          timeZone="local"
          events={fcEvents}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          datesSet={(arg) => setCurrentDate(arg.start ?? new Date())}
          eventDisplay="list-item"
          eventClick={handleEventClick}
          eventClassNames={(arg) => (arg.event.className ? [arg.event.className] : [])}
          eventDidMount={(info) => {
            const ep = info.event.extendedProps || {};
            const cf = ep.courtfileNumber ? ` · #${ep.courtfileNumber}` : "";
            info.el.title = `${info.event.title} (${ep.type || "event"})${cf}`;
          }}
          dateClick={handleDateClick}
        />

        {/* Modal detalle */}
        <CalendarModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          event={selectedEvent}
          onDelete={handleDeleteEvent}
        />
        {/* Modal quick create */}
        <CalendarModalAdd
          isOpen={showNewPicker}
          onClose={() => setShowNewPicker(false)}
          dateISO={newDateISO}
        />
      </div>
    </div>
  );
}

