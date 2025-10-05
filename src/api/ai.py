import os
import requests
import io
import PyPDF2
from flask import Blueprint, request, jsonify
from openai import OpenAI
import google.generativeai as genai
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from api.models import Courtfile, PaymentCourtfile, PaymentStatus, db, Lawyer, Client, AdminUser, Deadlines, Appointment, Document, ClientCourtfile, DeadlineCourtfile, LawyerCourtfile, AppointmentCourtfile, LawyerClient, CourtfileDocument, Payment, Message, ChatRead, AISuggestion
# api_ai_routes.py (o en tu mismo bp_ai)
from hashlib import sha256
from sqlalchemy import and_

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# Modelos candidatos (podés forzar con GEMINI_MODEL en env)
GEMINI_CANDIDATES = [
    os.getenv("GEMINI_MODEL"),   # ej: "gemini-1.5-flash-001"
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-latest",
]

def _pick_gemini_model():
    """
    Devuelve el primer modelo disponible que soporte generateContent.
    Si falla el listado, cae a GEMINI_MODEL o 'gemini-1.5-flash-001'.
    """
    try:
        models = list(genai.list_models())
        usable = {
            (m.name.split("/", 1)[-1])  # convierte 'models/xxx' -> 'xxx'
            for m in models
            if "generateContent" in getattr(m, "supported_generation_methods", [])
        }
        for cand in GEMINI_CANDIDATES:
            if cand and cand in usable:
                return cand
        # fallback al primero usable
        return next(iter(usable), None)
    except Exception as e:
        print(f"[Gemini] list_models failed: {e}")
        return os.getenv("GEMINI_MODEL") or "gemini-1.5-flash-001"


bp_ai = Blueprint("ai", __name__, url_prefix="/api/ai")

# Crea cliente una sola vez
client = OpenAI()
MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

SYSTEM = """Eres un asistente jurídico para Argentina. 
Dado un expediente con 'descripción' y 'jurisdicción', sugiere medidas procesales concretas.
Responde en JSON con un array 'suggestions'. 
Cada ítem: 
- title (string, breve y accionable),
- reasoning (string, 1-3 frases),
- urgency (one of: low|medium|high|urgent),
- next_steps (array de strings, 1-5),
- legal_basis (string opcional con norma/orientación),
- confidence (float 0-1).
No inventes hechos; si falta info, agrega un 'next_steps' que pida ese dato.
Evita lenguaje definitivo; sugiere.
Contexto: fueros federal/provincial, CNPP/CPr., CPP locales, amparos, medidas cautelares, oficios, pedidos de copias, vistas al MPF, etc.
"""


def build_user_prompt(description: str, jurisdiction: str, court: str | None):
    j = jurisdiction or "No especificada"
    c = court or "No especificado"
    return f"""Expediente:
- Jurisdicción: {j}
- Juzgado/Tribunal: {c}
- Descripción: {description}

Tarea: sugiere hasta 5 medidas útiles y realistas para el próximo paso procesal, adecuadas a esa jurisdicción.
"""
def _get_role_and_identity():
    try:
        claims = get_jwt()
        return claims.get("role"), get_jwt_identity()
    except Exception:
        return None, None

def _role():
    claims = get_jwt() or {}
    return (claims.get("role") or "").lower()

def _is_admin():
    return _role() == "admin_user"

@bp_ai.route("/suggest-actions", methods=["POST"])
def suggest_actions():
    data = request.get_json(silent=True) or {}
    description = (data.get("description") or "").strip()
    jurisdiction = (data.get("jurisdiction") or "").strip()
    court = (data.get("court") or "").strip()

    if not description:
        return jsonify({"error": "description is required"}), 400

    try:
        # Responses API con salida JSON “forzada”
        resp = client.chat.completions.create(
            model=MODEL,  # ideal: gpt-4o-mini
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": build_user_prompt(
                    description, jurisdiction, court)}
            ]
        )
        content = resp.choices[0].message.content

        # Validación mínima: asegurar campo suggestions
        import json
        parsed = json.loads(content)
        suggestions = parsed.get("suggestions", [])
        if not isinstance(suggestions, list):
            suggestions = []

        # recortar a 5 por las dudas
        suggestions = suggestions[:5]

        return jsonify({"suggestions": suggestions})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# //========== GEMINI AI ==========


@bp_ai.route('/analyze-document', methods=['POST'])
def analyze_document():
    try:
        data = request.get_json()

        if not data.get('document_url'):
            return jsonify({'error': 'URL del documento requerida'}), 400

        document_url = data['document_url']
        document_name = data.get('document_name', 'Documento')
        case_description = data.get('case_description', '')

        pdf_text = download_and_extract_pdf(document_url)

        if not pdf_text.strip():
            return jsonify({'error': 'No se pudo extraer texto del PDF'}), 400

        analysis_result = call_gemini_api(
            pdf_text, case_description, document_name)

        return jsonify({
            'analysis': analysis_result,
            'document_name': document_name
        })

    except Exception as e:
        print(f"Error en análisis de documento: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500


def download_and_extract_pdf(document_url):
    """Descarga y extrae texto de PDF"""
    try:
        response = requests.get(document_url, timeout=30)
        response.raise_for_status()

        pdf_file = io.BytesIO(response.content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

        return text[:60000]

    except Exception as e:
        print(f"Error procesando PDF: {str(e)}")
        return ""


def call_gemini_api(pdf_text, case_description, doc_name):
    """Llama a la API de Gemini y devuelve análisis estructurado"""
    try:
        prompt = f"""
Eres un abogado experto en derecho argentino. Analiza el siguiente documento y proporciona un análisis estructurado en formato JSON.

DOCUMENTO: {doc_name}
DESCRIPCIÓN DEL CASO: {case_description}

TEXTO DEL DOCUMENTO:
{pdf_text}

INSTRUCCIONES:
- Analiza el documento en el contexto del caso
- Identifica puntos clave relevantes para la legislación argentina
- Sugiere acciones concretas
- Devuelve el análisis en formato JSON con esta estructura:

{{
  "analysis": [
    {{
      "title": "Título del punto principal",
      "content": "Descripción concisa del hallazgo mencionando el artículo del documento",
      "urgency": "high/medium/low",
      "actions": "Acciones específicas sugeridas"
    }}
  ]
}}

Sé conciso y enfocado en aspectos prácticos. Máximo 5 puntos principales.
"""

        model_name = _pick_gemini_model()
        print(f"[Gemini] usando modelo: {model_name}")
        if not model_name:
            raise RuntimeError("No hay modelo Gemini disponible para generateContent. Revisá tu cuenta/API key.")

        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={"temperature": 0.3, "max_output_tokens": 2000},
        )
        resp = model.generate_content(prompt)
        result_text = resp.text or ""

        import json
        i, j = result_text.find("{"), result_text.rfind("}") + 1
        if i != -1 and j != -1:
            parsed = json.loads(result_text[i:j])
            return parsed.get("analysis", [])

        return [{
            "title": "Análisis del documento",
            "content": (result_text[:500] + "...") if result_text else "Sin salida del modelo",
            "urgency": "medium",
            "actions": "Revisar documento completo"
        }]

    except Exception as e:
        print(f"[Gemini] error: {e}")
        return [{
            "title": "Error en el análisis",
            "content": f"No se pudo completar el análisis: {str(e)}",
            "urgency": "medium",
            "actions": "Verificar GEMINI_API_KEY y volver a intentar"
        }]

def _hash_source(description, jurisdiction, court):
    base = f"{(description or '').strip()}|{(jurisdiction or '').strip()}|{(court or '').strip()}".lower()
    return sha256(base.encode("utf-8")).hexdigest()

@bp_ai.route("/suggestions", methods=["GET"])
@jwt_required()
def list_saved_suggestions():
    role, current_id = _get_role_and_identity()
    courtfile_id = int(request.args.get("courtfile_id") or 0)
    if courtfile_id <= 0:
        return jsonify({"error": "courtfile_id is required"}), 400

    # permiso: admin o lawyer vinculado
    if not _is_admin():
        if role != "lawyer":
            return jsonify({"error": "forbidden"}), 403
        linked = LawyerCourtfile.query.filter_by(lawyer_id=int(current_id), courtfile_id=courtfile_id).first()
        if not linked:
            return jsonify({"error": "forbidden"}), 403

    rows = AISuggestion.query.filter_by(courtfile_id=courtfile_id, is_archived=False)\
            .order_by(AISuggestion.created_at.desc()).all()

    return jsonify([{
        "id": r.id,
        "courtfile_id": r.courtfile_id,
        "title": r.title,
        "reasoning": r.reasoning,
        "urgency": getattr(r.urgency, "value", r.urgency) or "medium",
        "next_steps": r.next_steps or [],
        "legal_basis": r.legal_basis,
        "confidence": r.confidence,
        "created_at": r.created_at.isoformat(),
        "model": r.model
    } for r in rows])


@bp_ai.route("/suggestions/<int:sug_id>/archive", methods=["POST"])
@jwt_required()
def archive_suggestion(sug_id):
    role, current_id = _get_role_and_identity()
    row = AISuggestion.query.get_or_404(sug_id)

    # permiso
    if not _is_admin():
        if role != "lawyer":
            return jsonify({"error": "forbidden"}), 403
        linked = LawyerCourtfile.query.filter_by(lawyer_id=int(current_id), courtfile_id=row.courtfile_id).first()
        if not linked:
            return jsonify({"error": "forbidden"}), 403

    row.is_archived = True
    db.session.commit()
    return jsonify({"ok": True})

@bp_ai.route("/suggestions/replace", methods=["POST"])
@jwt_required()
def replace_suggestions():
    role, current_id = _get_role_and_identity()
    data = request.get_json() or {}
    courtfile_id = int(data.get("courtfile_id") or 0)
    suggestions = data.get("suggestions") or []
    description = (data.get("source_description") or "")
    jurisdiction = (data.get("source_jurisdiction") or "")
    court = (data.get("source_court") or "")

    if courtfile_id <= 0 or not isinstance(suggestions, list):
        return jsonify({"error": "courtfile_id and suggestions[] are required"}), 400

    # permiso
    if not _is_admin():
        if role != "lawyer":
            return jsonify({"error": "forbidden"}), 403
        linked = LawyerCourtfile.query.filter_by(
            lawyer_id=int(current_id), courtfile_id=courtfile_id
        ).first()
        if not linked:
            return jsonify({"error": "forbidden"}), 403

    # Archivar todas las anteriores
    AISuggestion.query.filter_by(courtfile_id=courtfile_id, is_archived=False).update(
        {"is_archived": True}
    )

    shash = _hash_source(description, jurisdiction, court) if description else None
    created = []
    for s in suggestions[:5]:
        row = AISuggestion(
            courtfile_id=courtfile_id,
            created_by_id=int(current_id) if role == "lawyer" else None,
            title=(s.get("title") or "Sugerencia").strip()[:255],
            reasoning=s.get("reasoning") or None,
            urgency=(s.get("urgency") or "medium"),
            next_steps=s.get("next_steps") if isinstance(s.get("next_steps"), list) else None,
            legal_basis=s.get("legal_basis") or None,
            confidence=float(s.get("confidence")) if s.get("confidence") is not None else None,
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            raw=s,
            source_hash=shash,
        )
        db.session.add(row)
        created.append(row)

    db.session.commit()

    return jsonify({
        "saved": [c.id for c in created],
        "count": len(created)
    }), 201
