// src/components/ChatOnDemand.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";

export default function ChatOnDemand(props) {
    const location = useLocation();
    const API = import.meta.env.VITE_BACKEND_URL;

    // --- Derivar datos desde props, state o query ---
    const query = new URLSearchParams(location.search);
    const courtfileId =
        props.courtfileId ??
        location.state?.courtfileId ??
        Number(query.get("courtfileId"));
    const senderRole =
        props.senderRole ?? location.state?.senderRole ?? "lawyer";
    const returnTo =
        location.state?.returnTo ??
        (courtfileId ? `/courtfiles/ViewCourtfileLawyer/${courtfileId}` : "/DashboardLawyer");

    // --- Token opcional para auth ---
    const auth = JSON.parse(sessionStorage.getItem("auth") || "null");
    const token = auth?.token;

    // --- Estado del chat ---
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const lastTsRef = useRef(null);
    const bottomRef = useRef(null);

    // Helpers de cache
    const cacheKey = courtfileId ? `chat_cache_cf_${courtfileId}` : null;
    const saveCache = (msgs, lastTs) => {
        if (!cacheKey) return;
        try {
            sessionStorage.setItem(
                cacheKey,
                JSON.stringify({ msgs, lastTs })
            );
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

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
    };

    // --- Traer últimos (por demanda o inicial) ---
    const fetchLatest = async () => {
        if (!courtfileId) return;
        try {
            setLoading(true);
            setErr("");

            const params = new URLSearchParams({ courtfile_id: String(courtfileId) });
            if (lastTsRef.current) params.set("since", lastTsRef.current);

            const resp = await fetch(`${API}/api/messages?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();

            if (Array.isArray(data) && data.length > 0) {
                setMessages(prev => {
                    const merged = [...prev, ...data];
                    const seen = new Set();
                    const dedup = merged.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
                    // actualizar cache
                    const last = data[data.length - 1];
                    lastTsRef.current = last.created_at;
                    saveCache(dedup, lastTsRef.current);
                    return dedup;
                });
            }
        } catch (e) {
            setErr(e.message || "Error al traer mensajes");
        } finally {
            setLoading(false);
            // pequeño delay para asegurar render y luego bajar
            setTimeout(scrollToBottom, 0);
        }
    };

    // --- Enviar mensaje ---
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!draft.trim() || !courtfileId) return;
        try {
            setErr("");
            const resp = await fetch(`${API}/api/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    courtfile_id: courtfileId,
                    text: draft.trim(),
                    sender_role: senderRole,
                }),
            });
            if (!resp.ok) {
                const e = await resp.json().catch(() => ({}));
                throw new Error(e.error || `HTTP ${resp.status}`);
            }
            const created = await resp.json();
            setMessages(prev => {
                const next = [...prev, created];
                lastTsRef.current = created.created_at;
                saveCache(next, lastTsRef.current);
                return next;
            });
            setDraft("");
            setTimeout(scrollToBottom, 0);
        } catch (e) {
            setErr(e.message || "Error al enviar");
        }
    };

    // --- Reset + rehidratación desde cache al cambiar expediente ---
    useEffect(() => {
        setMessages([]);
        lastTsRef.current = null;
        setErr("");

        if (!courtfileId) return;

        // 1) Rehidratar desde cache (instantáneo)
        const cached = loadCache();
        if (cached?.msgs?.length) {
            setMessages(cached.msgs);
            lastTsRef.current = cached.lastTs || null;
            // scrolleo al final del cache
            setTimeout(scrollToBottom, 0);
        }

        // 2) Traer lo nuevo del backend automáticamente
        fetchLatest();
    }, [courtfileId]);

    useEffect(() => {
        if (!courtfileId) return;
        const interval = setInterval(fetchLatest, 2000);
        return () => clearInterval(interval); 
    }, [courtfileId]);


    if (!courtfileId) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    Falta <code>courtfileId</code>. Abrí el chat desde un expediente o agregá <code>?courtfileId=123</code>.
                </div>
                <Link to={returnTo} className="btn btn-outline-secondary">
                    <i className="bi bi-arrow-left"></i> Volver
                </Link>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <strong>Chat del expediente</strong>
                <div className="d-flex gap-2">
                    {returnTo && (
                        <Link to={returnTo} className="btn btn-sm btn-outline-secondary">
                            <i className="bi bi-arrow-left" /> Volver
                        </Link>
                    )}
                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={fetchLatest}
                        disabled={loading}
                        title="Traer últimos mensajes"
                    >
                        {loading ? "Cargando..." : "Traer últimos"}
                    </button>
                </div>
            </div>

            <div className="card-body" style={{ maxHeight: 320, overflowY: "auto" }}>
                {messages.length === 0 && <p className="text-muted m-0">Sin mensajes aún.</p>}
                {messages.map(m => (
                    <div key={m.id} className="mb-2">
                        <div className="small text-secondary">
                            <span className="badge bg-light text-dark me-2">{m.sender_role}</span>
                            <span>{new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        <div>{m.text}</div>
                        <hr className="my-2" />
                    </div>
                ))}
                {err && <div className="alert alert-danger my-2">{err}</div>}
                <div ref={bottomRef} />
            </div>

            <form className="card-footer d-flex gap-2" onSubmit={sendMessage}>
                <input
                    className="form-control"
                    placeholder="Escribe un mensaje…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={!courtfileId}
                />
                <button className="btn btn-primary" type="submit" disabled={!courtfileId || !draft.trim()}>
                    Enviar
                </button>
            </form>
        </div>
    );
}
