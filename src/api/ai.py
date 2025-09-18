import os
from flask import Blueprint, request, jsonify
from openai import OpenAI

bp_ai = Blueprint("ai", __name__, url_prefix="/api/ai")

# Crea cliente una sola vez
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
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
        {"role": "user", "content": build_user_prompt(description, jurisdiction, court)}
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
