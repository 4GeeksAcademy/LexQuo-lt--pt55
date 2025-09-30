// views/Calendar/CalendarDashboard.jsx
import React, { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import AppNavsShell from "../components/AppNavsShell";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

// FullCalendar
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function Calendar() {
  const { store } = useGlobalReducer();

  const role = (store?.me?.role || "").toLowerCase();
  const allowed = role === "admin_user" || role === "lawyer";
  if (!allowed) return <Navigate to="/403" replace />;

  // ---------------- UI state ----------------
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewName, setViewName] = useState("dayGridMonth"); // "dayGridMonth" | "timeGridWeek"
  const calRef = useRef(null);

  // ---------------- Derived labels ----------------
  const dayName = useMemo(
    () => format(currentDate, "EEEE", { locale: enUS }),
    [currentDate]
  );
  const dayStamp = useMemo(
    () => format(currentDate, "dd MMM, yyyy", { locale: enUS }),
    [currentDate]
  );
  const monthTitle = useMemo(
    () => format(currentDate, "LLLL yyyy", { locale: enUS }),
    [currentDate]
  );

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

  // ---------------- Demo events (reemplazá por tus datos) ----------------
  const events = [
    { title: "Boot Camp", start: "2025-09-01T10:00:00", classNames: ["text-success"] },
    { title: "Meeting", start: "2025-09-07T10:00:00", classNames: ["text-info"] },
    { title: "Crain's New York Business", start: "2025-09-11", classNames: ["text-primary"] },
    { title: "Competition", start: "2025-09-26", classNames: ["text-danger"] },
    { title: "Conference", start: "2025-09-29", classNames: ["text-success"] },
    { title: "Event With Url", start: "2025-09-23", url: "https://google.com", classNames: ["text-success"] },
  ];

  return (
    <AppNavsShell>
      <div className="container add-page">
        {/* Top: Day | Date + actions */}
        <div className="row g-0 align-items-center mb-4">
          <div className="col-5 col-md-6">
            <h4 className="mb-0 text-body-emphasis fw-bold fs-md-6">
              <span className="calendar-day d-block d-md-inline mb-1">{dayName}</span>
              <span className="px-3 fw-thin text-body-quaternary d-none d-md-inline">|</span>
              <span className="d-inline-block"> {dayStamp}</span>
            </h4>
          </div>

          <div className="col-7 col-md-6 d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-link text-body px-0 me-2 me-md-4"
              onClick={() => window.location.reload()}
            >
              <i className="fa-solid fa-arrows-rotate fs-10 me-2 me-1" aria-hidden="true" />
              <span className="d-none d-md-inline">Sync Now</span>
            </button>

            <button type="button" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-plus fs-10 me-2 me-1" aria-hidden="true" />
              Add new task
            </button>
          </div>
        </div>

        {/* Sub-toolbar “phoenix-like” */}
        <div className="mx-n4 px-4 mx-lg-n6 px-lg-6 border-y border-translucent">
          <div className="row gy-3 gx-0 justify-content-between py-3">
            <div className="col-6 col-md-auto order-1 d-flex align-items-center">
              <button type="button" className="btn btn-phoenix-primary btn-sm px-4" onClick={goToday}>
                Today
              </button>
            </div>

            <div className="col-12 col-md-auto order-md-1 d-flex align-items-center justify-content-center">
              <button
                type="button"
                className="btn icon-item icon-item-sm shadow-none text-body-emphasis p-0"
                onClick={goPrev}
              >
                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              </button>

              <h3 className="px-3 text-body-emphasis fw-semibold mb-0">{monthTitle}</h3>

              <button
                type="button"
                className="btn icon-item icon-item-sm shadow-none text-body-emphasis p-0"
                onClick={goNext}
              >
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </div>

            <div className="col-6 col-md-auto order-1 d-flex justify-content-end">
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

        {/* Calendar */}
        <div className="mt-6 mb-9">
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={viewName}
            initialDate={currentDate}
            headerToolbar={false}
            height={800}
            contentHeight={800}
            firstDay={0} // domingo
            events={events}
            dayMaxEvents={2}
            nowIndicator={true}
            editable={false}
            selectable={false}
            eventClick={(info) => {
              // si tiene url, abrí en nueva pestaña
              if (info.event.url) {
                info.jsEvent.preventDefault();
                window.open(info.event.url, "_blank", "noopener,noreferrer");
              }
            }}
            eventClassNames={(arg) => arg.event.extendedProps.classNames || []}
          />
        </div>
      </div>
    </AppNavsShell>
  );
}
