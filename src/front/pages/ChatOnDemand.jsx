// src/components/ChatOnDemand.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, Link, useParams, } from "react-router-dom";
import { io } from "socket.io-client";
import { setLastRead, getLastRead } from "../hooks/chatUnread.jsx";
import { markNow } from "../hooks/chatUnread";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import EmojiPicker from 'emoji-picker-react';

export default function ChatOnDemand(props) {
  const { embed = false } = props;
  const location = useLocation();
  const API = import.meta.env.VITE_BACKEND_URL;
  const { courtfileId: paramCourtfileId } = useParams()

  // === Auth desde el store (Private ya rehidrata) ===
  const { store } = useGlobalReducer();
  const token = store?.auth?.token || null; // si lo necesitás para fetch/emit
  const me = store?.me || null;
  const role = (me?.role || "").toLowerCase();
  const currentUserId = me?.id || null;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Función para agregar emoji
  const addEmoji = (emojiData) => {
    setDraft(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // === Derivar datos desde props, state o query ===
  const query = new URLSearchParams(location.search);
  const courtfileIdRaw =
    props.courtfileId ??
    location.state?.courtfileId ??
    query.get("courtfileId") ??
    paramCourtfileId;

  const courtfileId = courtfileIdRaw ? Number(courtfileIdRaw) : null;

  const courtfileNumber = location.state?.courtfileNumber;
  const courtfileTitle = location.state?.courtfileTitle;

  // rol: props -> state -> auth.role (sin default hardcodeado)
  const senderRole = (
    props.senderRole ??
    location.state?.senderRole ??
    role
  )?.toLowerCase();

  // === ReturnTo ===
  let returnTo = location.state?.returnTo;
  if (!returnTo) {
    if (courtfileId) {
      returnTo =
        role === "lawyer"
          ? `/courtfiles/ViewCourtfileLawyer/${courtfileId}`
          : role === "client"
            ? `/courtfiles/Viewclient/${courtfileId}`
            : `/`;
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
      localStorage.setItem(cacheKey, JSON.stringify({ msgs, lastTs }));
    } catch (error) {
      console.warn("Error guardando en cache:", error);
    }
  }, [cacheKey]);

  const loadCache = useCallback(() => {
    if (!cacheKey) return null;
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Error leyendo cache:", error);
      return null;
    }
  }, [cacheKey]);

  // Agrega este ref
  const chatContainerRef = useRef(null);

  // Y modifica el scrollToBottom
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
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
      sender_name: `${me?.firstname || ""} ${me?.lastname || ""}`.trim(),
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
      sender_name: `${me?.firstname || ""} ${me?.lastname || ""}`.trim()
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
      upgrade: false,
      rememberUpgrade: false,
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000,
      auth: { token }
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
        if (currentUserId && courtfileId && lastTsRef.current) {
          setLastRead(currentUserId, courtfileId, lastTsRef.current);
        }
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
      if (currentUserId && courtfileId && msg?.created_at) {
        setLastRead(currentUserId, courtfileId, msg.created_at);
      }
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
  }, [courtfileId, API, token, saveCache, scrollToBottom]);

  // Efecto para scroll automático cuando hay nuevos mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (currentUserId && courtfileId && lastTsRef.current) {
        setLastRead(currentUserId, courtfileId, lastTsRef.current);
      }
    };
  }, [courtfileId, currentUserId]);

  useEffect(() => {
    const uid = me?.id;
    const cfid = Number(courtfileId);
    if (!uid || !cfid) return;

    markNow(uid, cfid);
  }, [me?.id, courtfileId]);

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
    <div className={embed ? "" : "container mt-4"}>
      {!embed && (
        <h1 className="mb-3">
          {`Chat for Courtfile`}
          {courtfileNumber ? ` #${courtfileNumber}` : ""}
          {courtfileTitle ? ` — ${courtfileTitle}` : ""}
        </h1>
      )}

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h4 className="mb-0 fw-normal">
            {`Chat for Courtfile`}
            {courtfileNumber ? ` #${courtfileNumber}` : ""}
            {courtfileTitle ? ` — ${courtfileTitle}` : ""}
          </h4>

          {returnTo && (
            <Link to={returnTo} className="btn btn-phoenix-primary d-flex align-items-center gap-2 fs-10">
              <i className="bi bi-folder2-open"></i>
              View case
            </Link>

          )}
        </div>

        <div className="card-body" style={{ maxHeight: 200, overflowY: "auto" }} ref={chatContainerRef}>
          {messages.length === 0 && !err && (
            <p className="text-muted m-0">Sin mensajes aún. Sé el primero en enviar un mensaje.</p>
          )}

          {/* Código burbujas  */}
          {messages.map((m) => {
            const isMine = m.sender_role === senderRole;
            return (
              <div
                key={m.id}
                className={`d-flex mb-4 ${m.isOptimistic ? 'opacity-75' : ''} ${isMine ? 'justify-content-end' : 'justify-content-start'}`}
              >
                {/* Avatar solo para mensajes del otro */}
                {!isMine && (
                  <div className="d-flex align-items-end me-2 mb-6" style={{ width: '32px' }}>
                    <img
                      src={m.avatar}
                      alt="Avatar"
                      className="rounded-circle"
                      style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div className={`position-relative ${isMine ? 'order-2' : 'order-1'}`} style={{ maxWidth: '70%' }}>
                  {/* Nombre solo para mensajes ajenos */}
                  {!isMine && (
                    <div className="small text-secondary fw-bold mb-1 ms-3">
                      <span>{m.sender_name || m.sender_role}</span>
                      {m.isOptimistic && " (enviando...)"}
                    </div>
                  )}

                  {/* Contenedor de la burbuja + pico (desde CSS) */}
                  <div className="chat-bubble-wrap">
                    <div
                      className={`p-3 bubble ${isMine ? 'bubble--right' : 'bubble--left text-dark'}`}
                    >
                      <div>{m.text}</div>
                    </div>
                  </div>

                  {/* Fecha y check */}
                  <div className={`small text-muted mt-1 fs-10 ${isMine ? 'text-end' : ''}`}>
                    {new Date(m.created_at).toLocaleString([], {
                      year: "2-digit",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
              </div>
            );
          })}



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
              No pude detectar tu rol. Asegurate de tener <code>auth.role</code> en localStorage
              o de pasar <code>senderRole</code> por props/state.
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form className="card-footer bg-white border-top d-flex" onSubmit={sendMessage} style={{ minHeight: '197px' }}>
          <div className="d-flex flex-column w-100">

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="mb-2">
                <EmojiPicker onEmojiClick={addEmoji} />
              </div>
            )}

            {/* Fila superior: textarea SOLO */}
            <div className="flex-grow-1">
              <textarea
                className="chat-textarea w-100"
                placeholder="Type your message..."
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                disabled={!courtfileId || connectionStatus !== "connected" || !isValidRole}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                rows={1}
                style={{
                  minHeight: '42px',
                  maxHeight: '100px',
                  overflowY: 'auto'
                }}
              />
            </div>

            {/* Fila inferior: botón emoji a la izquierda y enviar a la derecha */}
            <div className="d-flex justify-content-between align-items-center mt-2">
              {/* Botón emoji a la izquierda */}
              <button
                type="button"
                className="btn btn-link text-dark p-0 border-0 ms-3"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{ background: 'none' }}
              >
                <i className="bi bi-emoji-smile fs-9"></i>
              </button>

              {/* Botón enviar a la derecha */}
              <button
                className="btn btn-primary d-flex gap-2"
                type="submit"
                disabled={!courtfileId || !draft.trim() || connectionStatus !== "connected" || !isValidRole}
              >
                {connectionStatus === "connected" ? "Send" : "Conectando..."}
                <i className="bi bi-send-fill"></i>
              </button>
            </div>
          </div>
        </form>


      </div>
    </div>
  );
}