// src/components/ChatOnDemand.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { io } from "socket.io-client";

export default function ChatOnDemand(props) {
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;

  // === Auth (para rol y sender_id) ===
  const auth = JSON.parse(sessionStorage.getItem("auth") || "null");
  const currentUserId = auth?.user?.id;
  const role = (auth?.role || "").toLowerCase();

  // === Derivar datos desde props, state o query ===
  const query = new URLSearchParams(location.search);
  const courtfileId =
    props.courtfileId ??
    location.state?.courtfileId ??
    Number(query.get("courtfileId"));

  const courtfileNumber = location.state?.courtfileNumber;
  const courtfileTitle = location.state?.courtfileTitle;

  // rol: props -> state -> auth.role (sin default hardcodeado)
  const senderRole = (
    props.senderRole ??
    location.state?.senderRole ??
    auth?.role
  )?.toLowerCase();

  // === ReturnTo ===
  let returnTo = location.state?.returnTo;
  if (!returnTo) {
    if (courtfileId) {
      if (role === "lawyer") {
        returnTo = `/courtfiles/ViewCourtfileLawyer/${courtfileId}`;
      } else if (role === "client") {
        returnTo = `/courtfiles/ViewCourtfileClient/${courtfileId}`;
      } else {
        returnTo = `/`;
      }
    } else {
      returnTo = `/`;
    }
  }
  // Validación de rol
  const allowedRoles = new Set(["lawyer", "client", "admin_user"]);
  const isValidRole = allowedRoles.has(senderRole);

  // === Estado UI ===
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [socketOk, setSocketOk] = useState(false);

  // === Refs ===
  const socketRef = useRef(null);
  const lastTsRef = useRef(null);
  const bottomRef = useRef(null);

  // === Cache por expediente ===
  const cacheKey = courtfileId ? `chat_cache_cf_${courtfileId}` : null;
  const saveCache = (msgs, lastTs) => {
    if (!cacheKey) return;
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ msgs, lastTs }));
    } catch { }
  };
  const loadCache = () => {
    if (!cacheKey) return null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "auto" });

  // === Enviar mensaje por Socket.IO ===
  const sendMessage = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !courtfileId || !socketRef.current?.connected || !isValidRole) return;

    // Emitimos al backend: el handler @socketio.on("message") debe guardar y re-emitir
    socketRef.current.emit("message", {
      courtfile_id: courtfileId,
      text,
      sender_role: senderRole,
      sender_id: currentUserId, // opcional
      sender_name: `${auth?.user?.firstname || ""} ${auth?.user?.lastname || ""}`.trim()
    });

    // Limpiar input (el servidor enviará el mensaje real via "new_message")
    setDraft("");
  };

  // === Reset + rehidratación cuando cambia el expediente ===
  useEffect(() => {
    setMessages([]);
    lastTsRef.current = null;
    setErr("");
    setSocketOk(false);
    if (!courtfileId) return;

    const cached = loadCache();
    if (cached?.msgs?.length) {
      setMessages(cached.msgs);
      lastTsRef.current = cached.lastTs || null;
      setTimeout(scrollToBottom, 0);
    }
  }, [courtfileId]);

  // === Conectar Socket.IO, unirse a sala y escuchar eventos ===
  useEffect(() => {
    if (!courtfileId || !API) return;

    // Conectar una sola vez por cambio de expediente
    const s = io(API, {
      path: "/socket.io/",
      transports: ["polling"],
      withCredentials: false,
      
    });
    socketRef.current = s;

    s.on("connect", () => {
      setSocketOk(true);
      setErr("");
      // Unirse a la sala del expediente
      s.emit("join", { courtfile_id: courtfileId });
    });

    s.on("connect_error", (e) => {
      setSocketOk(false);
      setErr(e?.message || "No se pudo conectar al chat");
    });

    s.on("disconnect", () => {
      setSocketOk(false);
    });


    s.on("history", (arr) => {
      if (Array.isArray(arr) && arr.length) {
        const last = arr[arr.length - 1];
        lastTsRef.current = last.created_at;
        setMessages(arr);
        saveCache(arr, lastTsRef.current);
        setTimeout(scrollToBottom, 0);
      } else {
        // si no hay mensajes, al menos vaciamos/confirmamos estado
        setMessages([]);
        lastTsRef.current = null;
      }
    });

    // Mensajes en tiempo real
    s.on("new_message", (msg) => {
      setMessages((prev) => {
        const merged = [...prev, msg];
        // deduplicar por id
        const seen = new Set();
        const dedup = merged.filter((m) =>
          seen.has(m.id) ? false : (seen.add(m.id), true)
        );
        lastTsRef.current = msg.created_at;
        saveCache(dedup, lastTsRef.current);
        return dedup;
      });
      setTimeout(scrollToBottom, 0);
    });

    return () => {
      s.disconnect();
    };
  }, [courtfileId, API]);

  if (!courtfileId) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          Falta <code>courtfileId</code>. Abrí el chat desde un expediente o agregá{" "}
          <code>?courtfileId=123</code>.
        </div>
        <Link to={returnTo} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left" /> Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <strong>
          {`Chat for Courtfile`}
          {courtfileNumber ? ` #${courtfileNumber}` : ""}
          {courtfileTitle ? ` — ${courtfileTitle}` : ""}
        </strong>
        <div className="d-flex gap-2 align-items-center">
          <span className={`badge ${socketOk ? "bg-success" : "bg-secondary"}`} title={socketOk ? "Conectado en tiempo real" : "Desconectado"}>
            {socketOk ? "LIVE" : "OFF"}
          </span>
          {returnTo && (
            <Link to={returnTo} className="btn btn-sm btn-outline-secondary">
              <i className="bi bi-arrow-left" /> Volver
            </Link>
          )}
        </div>
      </div>

      <div className="card-body" style={{ maxHeight: 360, overflowY: "auto" }}>
        {messages.length === 0 && <p className="text-muted m-0">Sin mensajes aún.</p>}
        {messages.map((m) => (
          <div key={m.id} className="mb-2">
            <div className="small text-secondary">
              <span className="badge bg-light text-dark me-2">
                {m.sender_name || m.sender_role}
              </span>
              <span>{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <div>{m.text}</div>
            <hr className="my-2" />
          </div>
        ))}
        {err && <div className="alert alert-danger my-2">{err}</div>}
        {!isValidRole && (
          <div className="alert alert-warning my-2">
            No pude detectar tu rol. Asegurate de tener <code>auth.role</code> en sessionStorage
            o de pasar <code>senderRole</code> por props/state.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="card-footer d-flex gap-2" onSubmit={sendMessage}>
        <input
          className="form-control"
          placeholder="Escribe un mensaje…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!courtfileId || !socketOk || !isValidRole}
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!courtfileId || !draft.trim() || !socketOk || !isValidRole}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
