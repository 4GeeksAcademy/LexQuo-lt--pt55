from __future__ import annotations
import os, ssl, smtplib, mimetypes, re, requests
from pathlib import Path
from email.message import EmailMessage
from email.headerregistry import Address
from typing import Iterable, Optional, Tuple, Union, Any, Dict

# =========================
# Config Brevo API (HTTPS)
# =========================
BREVO_API_KEY = os.getenv("BREVO_API_KEY") or os.getenv("BREVO_LEXQUO_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@lexquo.com")
FROM_NAME = os.getenv("FROM_NAME", "LexQuo")

# =========================
# Config SMTP (fallback)
# =========================
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))      # 465=SSL, 587=STARTTLS
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "false").lower() in ("1", "true", "yes")
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
    html = _IF_BLOCK_RE.sub(lambda m: m.group(2) if _truthy(kwargs.get(m.group(1))) else "", html)
    html = _VAR_RE.sub(lambda m: str(kwargs.get(m.group(1), "")), html)
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
    if "<" in name_email and ">" in name_email:
        name, email = name_email.split("<", 1)
        email = email.strip(" >")
        name = name.strip()
        return Address(display_name=name, addr_spec=email)
    return name_email

# =========================
# Envío híbrido
# =========================
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
    timeout_seconds: int = 12,
) -> dict:
    """
    Envía un correo:
    - Si existe BREVO_API_KEY => usa API HTTP de Brevo (Render).
    - Si no => usa SMTP clásico (local).
    """

    # ---------------- Brevo API (preferido en producción) ----------------
    if BREVO_API_KEY:
        if isinstance(to_email, str):
            recipients = [to_email]
        else:
            recipients = list(to_email)

        url = "https://api.brevo.com/v3/smtp/email"
        headers_api = {
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
        }
        payload = {
            "sender": {"name": FROM_NAME, "email": FROM_EMAIL},
            "to": [{"email": r} for r in recipients],
            "subject": subject,
            "htmlContent": html_body,
        }
        if text_body:
            payload["textContent"] = text_body

        resp = requests.post(url, headers=headers_api, json=payload, timeout=timeout_seconds)
        resp.raise_for_status()
        return {"ok": True, "via": "BrevoAPI", "response": resp.json()}

    # ---------------- Fallback SMTP (ej: local dev) ----------------
    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError("SMTP_USER/SMTP_PASS no configurados y tampoco BREVO_API_KEY")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{SMTP_USER}>"

    if isinstance(to_email, str):
        recipients = [to_email]
        msg["To"] = to_email
    else:
        recipients = list(to_email)
        msg["To"] = ", ".join(recipients)

    if cc:
        cc_list = list(cc)
        msg["Cc"] = ", ".join(cc_list)
        recipients.extend(cc_list)

    if bcc:
        recipients.extend(list(bcc))

    _reply_to = reply_to or REPLY_TO
    if _reply_to:
        msg["Reply-To"] = _reply_to

    if headers:
        for k, v in headers.items():
            if v is not None:
                msg[k] = str(v)

    if not text_body:
        text_body = _fallback_text_from_html(html_body)
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    _add_attachments(msg, attachments)

    context = ssl.create_default_context()
    if SMTP_USE_TLS and SMTP_PORT == 587:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=timeout_seconds) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg, to_addrs=recipients)
    else:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=timeout_seconds) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg, to_addrs=recipients)

    return {"ok": True, "via": "SMTP"}
