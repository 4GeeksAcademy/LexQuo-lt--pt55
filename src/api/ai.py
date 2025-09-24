import os
import requests
import io
import PyPDF2
from flask import Blueprint, request, jsonify
from openai import OpenAI
from google import genai
from google.genai import types

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
        client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))

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
      "content": "Descripción concisa del hallazgo mencionando el articulo del documento",
      "urgency": "high/medium/low",
      "actions": "Acciones específicas sugeridas"
    }}
  ]
}}

Sé conciso y enfocado en aspectos prácticos. Máximo 5 puntos principales.
"""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=2000,
            )
        )

        result_text = response.text
        json_start = result_text.find('{')
        json_end = result_text.rfind('}') + 1

        if json_start != -1 and json_end != -1:
            json_str = result_text[json_start:json_end]
            import json
            parsed_result = json.loads(json_str)
            return parsed_result.get('analysis', [])
        else:
            return [{
                "title": "Análisis del documento",
                "content": result_text[:500] + "...",
                "urgency": "medium",
                "actions": "Revisar documento completo"
            }]

    except Exception as e:
        print(f"Error con Gemini API: {str(e)}")
        return [{
            "title": "Error en el análisis",
            "content": f"No se pudo completar el análisis: {str(e)}",
            "urgency": "medium",
            "actions": "Intentar nuevamente más tarde"
        }]
