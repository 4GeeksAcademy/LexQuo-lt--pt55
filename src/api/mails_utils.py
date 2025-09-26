# api/mail_utils.py
from __future__ import annotations
import os, ssl, smtplib, mimetypes, re
from pathlib import Path
from email.message import EmailMessage
from email.headerregistry import Address
from typing import Iterable, Optional, Tuple, Union, Any, Dict

# =========================
# Config SMTP (ENV VARS)
# =========================
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))      # 465=SSL, 587=STARTTLS
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "false").lower() in ("1", "true", "yes")
FROM_NAME = os.getenv("FROM_NAME", "LexQuo")
REPLY_TO = os.getenv("REPLY_TO")  # opcional

# =========================
# Templates
# =========================
_TEMPLATES_DIR = Path(__file__).parent / "email_templates"
_IF_BLOCK_RE = re.compile(r"\{\{#if\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}(.+?)\{\{\/if\}\}", re.S)
_VAR_RE     = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")

def _truthy(val: Any) -> bool:
    if val is None: return False
    if isinstance(val, (list, dict, set, tuple, str)): return len(val) > 0
    if isinstance(val, (int, float, bool)): return bool(val)
    return True

def render_email_template(filename: str, **kwargs: Dict[str, Any]) -> str:
    """
    Lee api/email_templates/<filename> (HTML compilado desde MJML)
    y reemplaza placeholders {{var}} y bloques {{#if var}} ... {{/if}}.
    """
    path = _TEMPLATES_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"No se encontró la plantilla: {path}")

    html = path.read_text(encoding="utf-8")

    # 1) Condicionales simples
    def _if_repl(m: re.Match) -> str:
        var = m.group(1)
        body = m.group(2)
        val = kwargs.get(var)
        return body if _truthy(val) else ""
    html = _IF_BLOCK_RE.sub(_if_repl, html)

    # 2) Variables
    def _var_repl(m: re.Match) -> str:
        var = m.group(1)
        val = kwargs.get(var)
        return "" if val is None else str(val)
    html = _VAR_RE.sub(_var_repl, html)

    return html

# =========================
# Email helpers
# =========================
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE  = re.compile(r"[ \t]+\n")

def _fallback_text_from_html(html: str) -> str:
    """Fallback básico: remueve tags → texto plano."""
    if not html: return ""
    text = _TAG_RE.sub("", html)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&")
    text = _WS_RE.sub("\n", text)
    return text.strip()

def _add_attachments(msg: EmailMessage, attachments: Iterable[Tuple[str, bytes]] | None):
    if not attachments: return
    for filename, content in attachments:
        ctype, _ = mimetypes.guess_type(filename)
        if ctype is None:
            ctype = "application/octet-stream"
        maintype, subtype = ctype.split("/", 1)
        msg.add_attachment(content, maintype=maintype, subtype=subtype, filename=filename)

def _format_addr(name_email: str) -> Union[str, Address]:
    # Soporte "Nombre <email@dominio>" o "email@dominio"
    if "<" in name_email and ">" in name_email:
        name, email = name_email.split("<", 1)
        email = email.strip(" >")
        name = name.strip()
        return Address(display_name=name, addr_spec=email)
    return name_email

def send_email(
    to_email: Union[str, Iterable[str]],
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    *,
    cc: Optional[Iterable[str]] = None,
    bcc: Optional[Iterable[str]] = None,
    reply_to: Optional[str] = None,
    headers: Optional[dict] = None,
    attachments: Optional[Iterable[Tuple[str, bytes]]] = None,
) -> None:
    """
    Envía un correo multipart/alternative (texto + HTML).
    - to_email: string o iterable
    - attachments: iterable de (filename, bytes)
    """
    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError("SMTP_USER/SMTP_PASS no configurados")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{SMTP_USER}>"

    # Destinatarios
    if isinstance(to_email, str):
        msg["To"] = to_email
        recipients = [to_email]
    else:
        to_list = list(to_email)
        msg["To"] = ", ".join(to_list)
        recipients = to_list

    if cc:
        cc_list = list(cc)
        msg["Cc"] = ", ".join(cc_list)
        recipients.extend(cc_list)

    if bcc:
        recipients.extend(list(bcc))  # BCC no va en headers

    # Reply-To
    _reply_to = reply_to or REPLY_TO
    if _reply_to:
        msg["Reply-To"] = _reply_to

    # Headers opcionales (List-Unsubscribe, etc.)
    if headers:
        for k, v in headers.items():
            if v is not None:
                msg[k] = str(v)

    # Cuerpo: siempre texto + HTML
    if not text_body:
        text_body = _fallback_text_from_html(html_body)
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    # Adjuntos
    _add_attachments(msg, attachments)

    # SMTP
    if SMTP_USE_TLS and SMTP_PORT == 587:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg, to_addrs=recipients)
    else:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg, to_addrs=recipients)
