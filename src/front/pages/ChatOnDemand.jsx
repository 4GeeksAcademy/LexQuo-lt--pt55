// src/components/ChatOnDemand.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
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
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // === Refs ===
  const socketRef = useRef(null);
  const lastTsRef = useRef(null);
  const bottomRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // === Cache por expediente ===
  const cacheKey = courtfileId ? `chat_cache_cf_${courtfileId}` : null;

  const saveCache = useCallback((msgs, lastTs) => {
    if (!cacheKey) return;
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ msgs, lastTs }));
    } catch (error) {
      console.warn("Error guardando en cache:", error);
    }
  }, [cacheKey]);

  const loadCache = useCallback(() => {
    if (!cacheKey) return null;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Error leyendo cache:", error);
      return null;
    }
  }, [cacheKey]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // === Enviar mensaje por Socket.IO ===
  const sendMessage = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !courtfileId || !socketRef.current?.connected || !isValidRole) return;

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      courtfile_id: courtfileId,
      text: text,
      sender_role: senderRole,
      sender_id: currentUserId,
      sender_name: `${auth?.user?.firstname || ""} ${auth?.user?.lastname || ""}`.trim(),
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setDraft("");
    setTimeout(scrollToBottom, 100);

    // Emitimos al backend
    socketRef.current.emit("message", {
      courtfile_id: courtfileId,
      text,
      sender_role: senderRole,
      sender_id: currentUserId,
      sender_name: `${auth?.user?.firstname || ""} ${auth?.user?.lastname || ""}`.trim()
    }, (ack) => {
      if (ack?.error) {
        setErr(`Error al enviar: ${ack.error}`);
        // Remover mensaje optimista en caso de error
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    });
  };

  // === Reset + rehidratación cuando cambia el expediente ===
  useEffect(() => {
    setMessages([]);
    lastTsRef.current = null;
    setErr("");
    setSocketOk(false);
    setConnectionStatus("disconnected");
    reconnectAttemptsRef.current = 0;

    if (!courtfileId) return;

    const cached = loadCache();
    if (cached?.msgs?.length) {
      setMessages(cached.msgs);
      lastTsRef.current = cached.lastTs || null;
      setTimeout(scrollToBottom, 0);
    }
  }, [courtfileId, loadCache, scrollToBottom]);

  // === Conectar Socket.IO, unirse a sala y escuchar eventos ===
  useEffect(() => {
    if (!courtfileId || !API) return;

    // Configuración mejorada de Socket.IO
    const s = io(API, {
      path: "/socket.io",
      transports: ["polling"],
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    socketRef.current = s;
    setConnectionStatus("connecting");

    // Manejadores de eventos
    const handleConnect = () => {
      setSocketOk(true);
      setConnectionStatus("connected");
      setErr("");
      s.emit("join", { courtfile_id: courtfileId });
      reconnectAttemptsRef.current = 0;
    };

    const handleConnectError = (error) => {
      console.error("Error de conexión:", error);
      setSocketOk(false);
      setConnectionStatus("disconnected");
      setErr(error?.message || "No se pudo conectar al chat");
    };

    const handleDisconnect = (reason) => {
      setSocketOk(false);
      setConnectionStatus("disconnected");

      if (reason === "io server disconnect") {
        setTimeout(() => s.connect(), 2000);
      }
    };

    const handleReconnecting = (attempt) => {
      setConnectionStatus("reconnecting");
      setErr(`Reconectando... (intento ${attempt})`);
      reconnectAttemptsRef.current = attempt;
    };

    const handleReconnect = (attempt) => {
      setSocketOk(true);
      setConnectionStatus("connected");
      setErr("");
    };

    const handleReconnectFailed = () => {
      console.error("Reconexión fallida");
      setConnectionStatus("disconnected");
      setErr("No se pudo reconectar. Recarga la página para intentar nuevamente.");
    };

    const handleHistory = (arr) => {
      if (Array.isArray(arr) && arr.length) {
        const last = arr[arr.length - 1];
        lastTsRef.current = last.created_at;

        // Filtrar mensajes optimistas y combinar con historial
        setMessages(prev => {
          const optimisticMessages = prev.filter(m => m.isOptimistic);
          const newMessages = [...arr, ...optimisticMessages];
          // Ordenar por fecha
          newMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          return newMessages;
        });

        saveCache(arr, lastTsRef.current);
        setTimeout(scrollToBottom, 0);
      } else {
        // Mantener mensajes optimistas si no hay historial
        setMessages(prev => prev.filter(m => m.isOptimistic));
        lastTsRef.current = null;
      }
    };

    const handleNewMessage = (msg) => {
      setMessages((prev) => {
        // Evitar duplicados y reemplazar mensajes optimistas
        const filteredPrev = prev.filter(m =>
          !m.isOptimistic && m.id !== msg.id
        );

        const newMessages = [...filteredPrev, msg];
        // Ordenar por fecha
        newMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        lastTsRef.current = msg.created_at;
        saveCache(newMessages.filter(m => !m.isOptimistic), lastTsRef.current);
        return newMessages;
      });
      setTimeout(scrollToBottom, 0);
    };

    const handleError = (error) => {
      console.error("Error del socket:", error);
      setErr(error?.message || "Error en la conexión del chat");
    };

    // Registrar todos los event listeners
    s.on("connect", handleConnect);
    s.on("connect_error", handleConnectError);
    s.on("disconnect", handleDisconnect);
    s.on("reconnecting", handleReconnecting);
    s.on("reconnect", handleReconnect);
    s.on("reconnect_failed", handleReconnectFailed);
    s.on("history", handleHistory);
    s.on("new_message", handleNewMessage);
    s.on("error", handleError);

    // Cleanup function - Remover todos los listeners específicos
    return () => {
      s.off("connect", handleConnect);
      s.off("connect_error", handleConnectError);
      s.off("disconnect", handleDisconnect);
      s.off("reconnecting", handleReconnecting);
      s.off("reconnect", handleReconnect);
      s.off("reconnect_failed", handleReconnectFailed);
      s.off("history", handleHistory);
      s.off("new_message", handleNewMessage);
      s.off("error", handleError);

      s.disconnect();
    };
  }, [courtfileId, API, saveCache, scrollToBottom]);

  // Efecto para scroll automático cuando hay nuevos mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  // Determinar badge class según estado de conexión
  const getStatusBadgeClass = () => {
    switch (connectionStatus) {
      case "connected": return "bg-success";
      case "connecting": return "bg-info";
      case "reconnecting": return "bg-warning";
      default: return "bg-secondary";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected": return "EN LÍNEA";
      case "connecting": return "CONECTANDO";
      case "reconnecting": return `RECONECTANDO (${reconnectAttemptsRef.current})`;
      default: return "DESCONECTADO";
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-3">
        {`Chat for Courtfile`}
        {courtfileNumber ? ` #${courtfileNumber}` : ""}
        {courtfileTitle ? ` — ${courtfileTitle}` : ""}
      </h1>

      <div className="card">
        <div className="card-header d-flex align-items-center">
          <div className="d-flex gap-3 align-items-center ms-auto">
            <span
              className={`badge ${getStatusBadgeClass()}`}
              title={connectionStatus}
            >
              {getStatusText()}
            </span>
            {returnTo && (
              <Link to={returnTo} className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-arrow-left" /> Volver
              </Link>
            )}
          </div>
        </div>

        <div className="card-body" style={{ maxHeight: 360, overflowY: "auto" }}>
          {messages.length === 0 && !err && (
            <p className="text-muted m-0">Sin mensajes aún. Sé el primero en enviar un mensaje.</p>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`mb-2 ${m.isOptimistic ? 'opacity-75' : ''}`}
            >
              <div className="small text-secondary">
                <span className="badge bg-light text-dark me-2">
                  {m.sender_name || m.sender_role}
                  {m.isOptimistic && " (enviando...)"}
                </span>
                <span>{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <div>{m.text}</div>
              <hr className="my-2" />
            </div>
          ))}

          {err && (
            <div className={`alert ${connectionStatus === "reconnecting" ? "alert-warning" : "alert-danger"} my-2`}>
              {err}
              {connectionStatus === "disconnected" && (
                <button
                  className="btn btn-sm btn-outline-primary ms-2"
                  onClick={() => socketRef.current?.connect()}
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

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
            disabled={!courtfileId || connectionStatus !== "connected" || !isValidRole}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!courtfileId || !draft.trim() || connectionStatus !== "connected" || !isValidRole}
          >
            {connectionStatus === "connected" ? "Enviar" : "Conectando..."}
          </button>
        </form>
      </div>
    </div>
  );
}