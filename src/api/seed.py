# src/api/seed.py
# -----------------------------------------------------------------------------
# Seed extendido e idempotente: inserta datos base + relaciones, sin borrar nada.
# Usa campos únicos (email, case_number, etc.) para evitar duplicados.
# -----------------------------------------------------------------------------
from datetime import date, time, datetime, timedelta
import random
from io import BytesIO
import os
import re
import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.exceptions import NotFound as CloudinaryNotFound
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

from api.models import (
    db,
    Lawyer, Client, Courtfile,
    Appointment, Deadlines, Document,
    Payment, PaymentStatus, AdminUser,
    ClientCourtfile, LawyerCourtfile, DeadlineCourtfile,
    AppointmentCourtfile, CourtfileDocument, PaymentCourtfile
)

# ===== Categorías de documentos (deben coincidir con el frontend) =====
DOC_CATEGORIES = [
    "Resolution / Ruling",
    "Party Filing",
    "Evidence",
    "Precautionary Measure / Urgent Request",
    "Public Prosecutor's Office Action",
    "Relevant Judicial Proceeding",
    "Official Letter / Communication",
    "Judgment",
    "Costs and Fees",
    "Internal Note / Reminder",
    "Others"
]

# ===== Tipos de deadlines (alineados a tu UI) =====
DEADLINE_TYPES = [
    "Contestación de demanda",
    "Traslado / Vista",
    "Ofrecimiento de prueba",
    "Producción de prueba",
    "Audiencia",
    "Recurso / Apelación",
    "Ejecución / Cumplimiento",
    "Caducidad de instancia",
    "Plazo penal (excarcelación, preventiva, etc.)",
    "Mediación obligatoria",
    "Vencimiento de contrato",
    "Pago de tasa de justicia / aportes",
    "Vencimiento administrativo (AFIP, IGJ, etc.)",
    "Documentación del cliente",
    "Recordatorio interno / reunión con cliente",
    "Otros"
]

# =============================== utilidades =============================== #


def get_or_create(session, model, unique_fields: dict, defaults: dict | None = None):
    """
    Busca por unique_fields. Si existe, devuelve (obj, False).
    Si no, crea con defaults + unique_fields y devuelve (obj, True).
    """
    inst = session.query(model).filter_by(**unique_fields).first()
    if inst:
        return inst, False
    payload = {**(defaults or {}), **unique_fields}
    inst = model(**payload)
    session.add(inst)
    session.commit()
    return inst, True


def _time(h, m=0):
    return time(h, m)

# -------- Helpers relaciones (pivots) con dedupe -------- #


def get_or_create_lawyer_courtfile(session, lawyer_id: int, courtfile_id: int):
    inst = session.query(LawyerCourtfile).filter_by(
        lawyer_id=lawyer_id, courtfile_id=courtfile_id).first()
    if inst:
        return inst, False
    inst = LawyerCourtfile(lawyer_id=lawyer_id, courtfile_id=courtfile_id)
    session.add(inst)
    session.commit()
    return inst, True


def get_or_create_client_courtfile(session, client_id: int, courtfile_id: int):
    inst = session.query(ClientCourtfile).filter_by(
        client_id=client_id, courtfile_id=courtfile_id).first()
    if inst:
        return inst, False
    inst = ClientCourtfile(client_id=client_id, courtfile_id=courtfile_id)
    session.add(inst)
    session.commit()
    return inst, True


def get_or_create_deadline_courtfile(session, deadline_id: int, courtfile_id: int):
    inst = session.query(DeadlineCourtfile).filter_by(
        deadline_id=deadline_id, courtfile_id=courtfile_id).first()
    if inst:
        return inst, False
    inst = DeadlineCourtfile(deadline_id=deadline_id,
                             courtfile_id=courtfile_id)
    session.add(inst)
    session.commit()
    return inst, True


def get_or_create_appointment_courtfile(session, appointment_id: int, courtfile_id: int):
    inst = session.query(AppointmentCourtfile).filter_by(
        appointment_id=appointment_id, courtfile_id=courtfile_id).first()
    if inst:
        return inst, False
    inst = AppointmentCourtfile(
        appointment_id=appointment_id, courtfile_id=courtfile_id)
    session.add(inst)
    session.commit()
    return inst, True


def get_or_create_courtfile_document(session, courtfile_id: int, document_id: int):
    inst = session.query(CourtfileDocument).filter_by(
        courtfile_id=courtfile_id, document_id=document_id).first()
    if inst:
        return inst, False
    inst = CourtfileDocument(courtfile_id=courtfile_id,
                             document_id=document_id)
    session.add(inst)
    session.commit()
    return inst, True


def get_or_create_payment_courtfile(session, payment_id: int, courtfile_id: int):
    inst = session.query(PaymentCourtfile).filter_by(
        payment_id=payment_id, courtfile_id=courtfile_id).first()
    if inst:
        return inst, False
    inst = PaymentCourtfile(payment_id=payment_id, courtfile_id=courtfile_id)
    session.add(inst)
    session.commit()
    return inst, True

# ========================= generadores de contenido ======================== #


_random = random.Random(42)  # determinista para repetir resultados

JURIS = [
    ("PJN - CABA", "Juzgado Nacional en lo Criminal y Correccional N° {n}"),
    ("PJN - Prov. Buenos Aires",
     "Tribunal Oral en lo Criminal N° {n} de La Plata"),
    ("Justicia Federal - Mendoza", "Juzgado Federal N° {n} de Mendoza"),
    ("Justicia Federal - Córdoba", "Juzgado Federal N° {n} de Córdoba"),
    ("PJN - San Martín", "Juzgado de Garantías N° {n} de San Martín"),
]

TEMATICAS = [
    ("Estafa reiterada", "Se investigan maniobras defraudatorias vinculadas a operaciones financieras y contratos simulados."),
    ("Robo agravado", "Hecho ocurrido con uso de arma, con intervención de múltiples partícipes y vehículos de apoyo."),
    ("Lesiones leves", "Conflicto interpersonal donde se denuncian lesiones compatibles con agresión doméstica."),
    ("Amenazas coactivas",
     "Mensajes intimidatorios con exigencias económicas para cesar conductas."),
    ("Abuso de autoridad",
     "Actos presuntamente contrarios a deberes funcionales cometidos por agente público."),
    ("Lavado de activos",
     "Movimientos sospechosos, transferencias fraccionadas y uso de cuentas de terceros."),
    ("Falsificación de documento",
     "Instrumentos presuntamente adulterados con perjuicio patrimonial."),
    ("Narcotráfico", "Transporte y guarda de estupefacientes, pericias de pureza en trámite."),
    ("Violencia de género",
     "Medidas de protección vigentes, evaluación de riesgo y seguimiento de dispositivos."),
    ("Hurto simple", "Sustracción sin violencia, registro fílmico y testigos presenciales."),
    ("Daño y usurpación", "Ocupación no autorizada de inmueble y deterioro de instalaciones."),
    ("Delitos informáticos", "Acceso indebido a sistemas y apropiación de credenciales."),
]


def legal_paragraphs(topic: str):
    return (
        f"{topic}.\n\n"
        "Síntesis fáctica: Se describen los hechos denunciados con precisión temporal y espacial, "
        "identificando a las personas intervinientes, los bienes afectados y las medidas urgentes realizadas. "
        "Se reseñan las actuaciones preliminares, el análisis de evidencia digital, y las diligencias ordenadas "
        "por la fiscalía.\n\n"
        "Marco jurídico: Se individualizan tipos penales presuntamente aplicables, estándares probatorios en "
        "etapa de investigación y criterios de necesidad, idoneidad y proporcionalidad en la adopción de medidas "
        "restrictivas.\n\n"
        "Estado actual: Restan producirse informes bancarios, pericias sobre dispositivos y testimoniales. "
        "Se evalúa la incorporación de prueba documental complementaria y la eventual ampliación del objeto procesal."
    )


# 👉 Listas para títulos estilo judicial
APELLIDOS = ["Romero", "Pérez", "Gómez", "Fernández", "López", "Torres",
             "Suárez", "Rossi", "Martínez", "Castro", "Domínguez", "Vega"]
INICIALES = ["H. A.", "J. M.", "A. L.",
             "V. R.", "M. C.", "S. D.", "C. E.", "F. G."]

# ===================== Avatares demo estables =====================
AVATARS = [
    "https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343431/3_quriso.png",
    "https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343423/1_jaqjtf.png",
    "https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343431/4_kjzfgd.png",
    "https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343430/2_lye0ni.png",
    "https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343788/8_f7dke3.png",
    "https://i.pravatar.cc/300?img=6",
    "https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343781/7_sw6hik.png",
    "https://i.pravatar.cc/300?img=8",
    "https://i.pravatar.cc/300?img=9",
]

# ============================== seeders base =============================== #


def seed_admins(session):
    rows = [
        dict(firstname="Carlos", lastname="Ramirez",
             email="carlos.r@example.com", password="12345678", is_active=True),
        dict(firstname="Laura",  lastname="Mendez",
             email="laura.m@example.com",  password="12345678", is_active=True),
    ]
    created = 0
    for r in rows:
        unique = {"email": r["email"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, AdminUser, unique, defaults)
        if was_created:
            created += 1
    print(f"Admins: agregados {created}")


def seed_lawyers(session):
    rows = [
        dict(firstname="María", lastname="González", email="maria.g@example.com",
             phone="+54 11 5555-1001", password="12345678", is_active=True,
             url_img=AVATARS[0]),
        dict(firstname="Juan",  lastname="Pérez",    email="juan.p@example.com",
             phone="+54 11 5555-1002", password="12345678", is_active=True,
             url_img=AVATARS[1]),
        dict(firstname="Lucía", lastname="Martínez", email="lucia.m@example.com",
             phone="+54 11 5555-1003", password="12345678", is_active=True,
             url_img=AVATARS[2]),
    ]
    created = 0
    for r in rows:
        unique = {"email": r["email"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Lawyer, unique, defaults)
        if was_created:
            created += 1
    print(f"Lawyers: agregados {created}")


def seed_clients(session):
    rows = [
        dict(firstname="Ana",    lastname="Suarez",    email="ana.s@example.com",
             phone="+54 11 5555-2001", password="12345678", is_active=True, url_img=AVATARS[3]),
        dict(firstname="Pedro",  lastname="Lopez",     email="pedro.l@example.com",
             phone="+54 11 5555-2002", password="12345678", is_active=True, url_img=AVATARS[4]),
        dict(firstname="Sofía",  lastname="Diaz",      email="sofia.d@example.com",
             phone="+54 11 5555-2003", password="12345678", is_active=True, url_img=AVATARS[5]),
        dict(firstname="Diego",  lastname="Ruiz",      email="diego.r@example.com",
             phone="+54 11 5555-2004", password="12345678", is_active=True, url_img=AVATARS[6]),
        dict(firstname="Camila", lastname="Fernández", email="camila.f@example.com",
             phone="+54 11 5555-2005", password="12345678", is_active=True, url_img=AVATARS[7]),
        dict(firstname="Martin", lastname="Rossi",     email="martin.r@example.com",
             phone="+54 11 5555-2006", password="12345678", is_active=True, url_img=AVATARS[8]),
    ]
    created = 0
    for r in rows:
        unique = {"email": r["email"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Client, unique, defaults)
        if was_created:
            created += 1
    print(f"Clients: agregados {created}")


def seed_courtfiles(session):
    rows = []
    base_num = 1001
    for i in range(12):  # 12 expedientes
        case_number = f"CF-2025-{base_num + i}"
        (tema_titulo, tema_desc) = TEMATICAS[i % len(TEMATICAS)]
        tema_materia = tema_titulo.lower()  # materia en minúsculas para estilo judicial
        juris, court_tpl = JURIS[i % len(JURIS)]
        court = court_tpl.format(n=(i % 20) + 1)

        apellido = _random.choice(APELLIDOS)
        iniciales = _random.choice(INICIALES)
        sufijo = _random.choice(
            ["", " y otro", " y otros"])  # 0/1/2 pluralidad

        # 🔹 Título estilo judicial: "Apellido, Iniciales [y otro/os] s/ materia"
        title = f"{apellido}, {iniciales}{sufijo} s/ {tema_materia}"

        description = (
            f"Expediente {case_number}. {tema_desc} "
            f"{legal_paragraphs('Descripción ampliada del caso')}"
        )

        rows.append(dict(
            case_number=case_number,
            title=title,
            description=description,
            jurisdiction=juris,
            court=court,
            status=True if i % 3 != 2 else False  # algunos inactivos
        ))

    created = 0
    for r in rows:
        unique = {"case_number": r["case_number"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Courtfile, unique, defaults)
        if was_created:
            created += 1
    print(f"Courtfiles: agregados {created} (total deseado: {len(rows)})")


def seed_appointments(session):
    today = date.today()
    templates = [
        ("Audiencia preliminar", "Talcahuano 550, CABA", "Presentación de prueba"),
        ("Mediación", "Cerrito 760, CABA", "Mediación obligatoria"),
        ("Reunión con cliente", "Estudio Jurídico", "Estrategia de defensa"),
        ("Audiencia testimonial", "Lavalle 1220, CABA", "Declaraciones de testigos"),
    ]
    rows = []
    for i in range(8):  # 8 citas
        t = templates[i % len(templates)]
        rows.append(dict(
            title=t[0],
            date=today + timedelta(days=1 + (i % 14)),
            location=t[1],
            details=t[2],
            starts_at=_time(9 + (i % 4), 0 if i % 2 == 0 else 30),
            ends_at=_time(10 + (i % 4), 0 if i % 2 == 0 else 30),
            latitud=-34.60 + (i * 0.001),
            longitud=-58.38 - (i * 0.001),
        ))

    created = 0
    for r in rows:
        unique = {"title": r["title"], "date": r["date"],
                  "starts_at": r["starts_at"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Appointment, unique, defaults)
        if was_created:
            created += 1
    print(f"Appointments: agregados {created} (total deseado: {len(rows)})")


def seed_deadlines(session):
    today = date.today()
    # 12 deadlines variados, usando exclusivamente los tipos de DEADLINE_TYPES
    templates = [
        # (tipo, días_desde_hoy, hh, mm, prioridad)
        ("Contestación de demanda",                         5,  12,  0, "alta"),
        ("Traslado / Vista",                               12,  13,  0, "media"),
        ("Ofrecimiento de prueba",                         20,  10, 30, "baja"),
        ("Producción de prueba",                           15,  11,  0, "media"),
        ("Audiencia",                                       7,   9, 30, "alta"),
        ("Recurso / Apelación",                            22,  12, 30, "alta"),
        ("Mediación obligatoria",                           9,  10,  0, "alta"),
        ("Documentación del cliente",                      18,  14,  0, "media"),
        ("Vencimiento administrativo (AFIP, IGJ, etc.)",   25,   9,  0, "media"),
        ("Pago de tasa de justicia / aportes",              3,   8, 30, "alta"),
        ("Recordatorio interno / reunión con cliente",     10,  16,  0, "baja"),
        ("Otros",                                          28,  12,  0, "baja"),
    ]
    created = 0
    for title, dplus, hh, mm, prio in templates:
        unique = {
            "deadline_type": title,
            "deadline_date": today + timedelta(days=dplus),
            "deadline_hour": time(hh, mm),
        }
        defaults = {"priority": prio}
        _, was_created = get_or_create(session, Deadlines, unique, defaults)
        if was_created:
            created += 1
    print(f"Deadlines: agregados {created} (total deseado: {len(templates)})")


def seed_documents(session):
    today = date.today()

    # ============== helpers locales (idempotentes) ==============

    def _cloudinary_setup():
        url = os.getenv("CLOUDINARY_URL")
        if url:
            cloudinary.config(cloudinary_url=url, secure=True)
        else:
            cloudinary.config(
                cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
                api_key=os.getenv("CLOUDINARY_API_KEY"),
                api_secret=os.getenv("CLOUDINARY_API_SECRET"),
                secure=True,
            )

    def _slug(s: str) -> str:
        s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE).strip().lower()
        s = re.sub(r"[\s_-]+", "-", s)
        return s

    def _pdf_bytes(text: str, title: str | None = None) -> bytes:
        """Genera un PDF en memoria respetando saltos de línea."""
        buf = BytesIO()
        styles = getSampleStyleSheet()
        normal = styles["Normal"]
        normal.leading = 14
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            leftMargin=22*mm, rightMargin=22*mm,
            topMargin=25*mm, bottomMargin=25*mm,
            title=title or "Documento"
        )
        story = []
        if title:
            story.append(Paragraph(f"<b>{title}</b>", styles["Heading2"]))
            story.append(Spacer(1, 6))
        story.append(Paragraph((text or "").replace("\n", "<br/>"), normal))
        doc.build(story)
        buf.seek(0)
        return buf.read()

    def _ensure_pdf_in_cloudinary(public_id: str, pdf_data: bytes, *, tags=None) -> str:
        """Devuelve secure_url; sube si no existe (resource_type='raw')."""
        _cloudinary_setup()
        try:
            res = cloudinary.api.resource(public_id, resource_type="raw")
            return res["secure_url"]
        except CloudinaryNotFound:
            up = cloudinary.uploader.upload(
                pdf_data,
                resource_type="raw",
                public_id=public_id,
                overwrite=False,
                tags=tags or ["lexquo", "seed", "pdf"],
                filename=public_id.split("/")[-1] + ".pdf",
            )
            return up["secure_url"]

    # ============== plantillas (texto largo + resumen 2 líneas) ==============


    def tpl_demanda_inicial(case_number: str, actor: str, demandado: str):
        long = (
            f"DEMANDA INICIAL\n\n"
            f"Carátula: {actor} c/ {demandado} s/ Cumplimiento contractual\n"
            f"Expediente: {case_number}\n\n"
            "I) PERSONERÍA Y DOMICILIOS\n"
            "Que vengo por mi propio derecho, constituyendo domicilio procesal en Talcahuano 550, CABA, "
            "y domicilio electrónico en …, a promover demanda contra la parte demandada conforme se indicará.\n\n"
            "II) OBJETO\n"
            "Iniciar demanda por incumplimiento contractual por la suma de $ 4.500.000, con más intereses y costas, "
            "en virtud del contrato de prestación de servicios celebrado el 05/04/2023.\n\n"
            "III) HECHOS\n"
            "Se celebró contrato escrito en la fecha indicada, obligándose la demandada a realizar desarrollos técnicos "
            "conforme alcance y plazos establecidos en Anexo I. Pese a múltiples intimaciones (CD 41234/23 y 52711/24), "
            "incumplió hitos críticos, generando severos perjuicios económicos y paralizando etapas de producción.\n\n"
            "IV) DERECHO\n"
            "Fundo en los arts. 730, 731, 768 y ccdtes. del CCyCN (responsabilidad por incumplimiento), y doctrina "
            "y jurisprudencia aplicables. Se solicita resarcimiento integral por daños directos, lucro cesante e "
            "intereses compensatorios y punitorios.\n\n"
            "V) PRUEBA\n"
            "Documental: contrato, anexos, cartas documento, facturas, informes técnicos. Informativa: AFIP y Bancos "
            "sobre capacidad de pago. Pericial contable y técnica para cuantificación de perjuicios. Testimonial de "
            "profesionales y representantes.\n\n"
            "VI) MEDIDA CAUTELAR (en subsidio)\n"
            "Embargo preventivo sobre cuentas y bienes registrables hasta cubrir el monto reclamado, en razón de la "
            "verosimilitud del derecho y peligro en la demora acreditados.\n\n"
            "VII) PETITORIO\n"
            "a) Téngase por presentada la demanda; b) Traslado; c) Oportunamente se haga lugar con costas.\n"
        )
        summary = (
            "Demanda contractual por $4.500.000 con prueba documental, informativa y pericial.\n"
            "Solicita embargo preventivo y resarcimiento integral por incumplimiento."
        )
        return long, summary, "Party Filing"


    def tpl_contestacion(case_number: str, demandado: str, actor: str):
        long = (
            f"CONTESTACIÓN DE DEMANDA\n\n"
            f"Carátula: {actor} c/ {demandado} s/ Cumplimiento contractual\n"
            f"Expediente: {case_number}\n\n"
            "I) NEGATIVAS GENERALES\n"
            "Se niega en forma expresa y categórica todos y cada uno de los hechos, daños y montos reclamados "
            "que no fueren objeto de reconocimiento expreso, destacando la falta de sustento documental en varios rubros.\n\n"
            "II) DEFENSAS\n"
            "Excepción de incumplimiento del actor (art. 1031 CCyCN): el actor omitió entregar especificaciones técnicas "
            "esenciales, demoró aprobaciones y modificó unilateralmente plazos, lo cual tornó imposible el cumplimiento "
            "en tiempo y forma. Se plantea también pluspetición inexcusable.\n\n"
            "III) PRUEBA\n"
            "Documental: intercambio de correos electrónicos, actas de avance, tickets técnicos con registros de fecha. "
            "Pericial informática: reconstrucción de cronograma de hitos y dependencias. Informativa a proveedores y "
            "áreas de soporte técnico. Testimoniales de coordinadores de proyecto.\n\n"
            "IV) PETITORIO\n"
            "Se rechace la demanda en todas sus partes, con costas al actor, reservando acciones de daños y perjuicios.\n"
        )
        summary = (
            "Contesta negando hechos, alega incumplimiento del actor (art. 1031 CCyCN).\n"
            "Ofrece prueba documental, pericial e informática; pide rechazo con costas."
        )
        return long, summary, "Party Filing"


    def tpl_oficio_bancario(banco: str):
        long = (
            "OFICIO BANCARIO\n\n"
            f"Al {banco} se solicita, en el marco de las actuaciones en trámite: a) titularidades vigentes e históricas "
            "de cuentas y tarjetas; b) movimientos desde 01/01/2024 a la fecha actual, discriminados por origen y destino; "
            "c) saldos al cierre de cada mes; d) legajos KYC, domicilios declarados y registros de firmas autorizadas.\n\n"
            "Se advierte que la información solicitada será utilizada exclusivamente dentro del presente proceso, "
            "con sujeción a las normas de confidencialidad y protección de datos personales, bajo apercibimiento legal.\n"
        )
        summary = (
            "Oficio bancario: se requieren titularidades, movimientos, saldos y legajos KYC.\n"
            "La información será confidencial y de uso exclusivo del proceso."
        )
        return long, summary, "Official Letter / Communication"


    def tpl_resolucion():
        long = (
            "RESOLUCIÓN INTERLOCUTORIA\n\n"
            "I) VISTOS: Las presentaciones efectuadas por las partes con fechas 10/08/2025 y 15/08/2025, "
            "junto con la documentación acompañada.\n\n"
            "II) CONSIDERANDO: De la compulsa surge que corresponde admitir parcialmente la prueba ofrecida "
            "por la actora, en tanto resulta útil y conducente para el esclarecimiento de la cuestión litigiosa, "
            "rechazándose la restante por resultar impertinente e innecesaria.\n\n"
            "III) RESUELVO: 1) Líbrese oficio a la entidad bancaria a efectos de obtener información de movimientos; "
            "2) Fíjase audiencia de vista de causa para el día 22/10/2025 a las 10:00 hs; 3) Costas por su orden, "
            "atento el resultado parcial de la incidencia.\n"
        )
        summary = (
            "Resolución: admite parcialmente prueba ofrecida, libra oficio bancario y fija audiencia.\n"
            "Dispone costas por su orden."
        )
        return long, summary, "Resolution / Ruling"


    def tpl_pericia():
        long = (
            "INFORME PERICIAL INFORMÁTICO\n\n"
            "Objeto: Analizar los dispositivos y repositorios digitales aportados al proceso, verificando "
            "integridad de la información y eventuales manipulaciones.\n\n"
            "Metodología: adquisición forense mediante write-blocker, cálculo de hashes SHA-256, extracción lógica "
            "de directorios, parsing de metadatos y reconstrucción de cronología de accesos y modificaciones.\n\n"
            "Conclusiones: Se verifican cambios en ramas principales de repositorios sin aprobación formal, "
            "alteración de logs en fechas críticas y tickets en estado 'blocked' por falta de requisitos. "
            "Correlación temporal directa con cartas documento enviadas por la actora.\n"
        )
        summary = (
            "Pericia informática: adquisición forense, hashes, reconstrucción cronológica.\n"
            "Conclusión: cambios sin autorización y tickets bloqueados correlacionados."
        )
        return long, summary, "Evidence"


    def tpl_mediacion():
        long = (
            "ACTA DE MEDIACIÓN\n\n"
            "En la Ciudad Autónoma de Buenos Aires, a los 12 días del mes de septiembre de 2025, comparecen las partes "
            "con sus respectivos letrados patrocinantes. Se intercambian propuestas parciales de pago, incluyendo "
            "plan de cuotas y entregables parciales de servicio, sin arribar a acuerdo definitivo. Se establece nueva "
            "reunión para dentro de 10 días. Sin perjuicio, las partes dejan constancia de reservas de derechos y "
            "facultades procesales.\n"
        )
        summary = (
            "Acta de mediación: propuestas parciales de pago y entregables; nueva reunión en 10 días.\n"
            "Se dejan reservas expresas de derechos y acciones."
        )
        return long, summary, "Relevant Judicial Proceeding"

    # ============== orquestación ==============

    # (nombre_base, generador)
    plantillas = [
        ("Demanda inicial", lambda: tpl_demanda_inicial(
            "CF-2025-1001", "Romero H. A.", "Pérez J. M.")),
        ("Contestación de demanda", lambda: tpl_contestacion(
            "CF-2025-1001", "Pérez J. M.", "Romero H. A.")),
        ("Oficio bancario", lambda: tpl_oficio_bancario(
            "Banco de la Ciudad de Buenos Aires")),
        ("Resolución interlocutoria",   tpl_resolucion),
        ("Informe pericial informático", tpl_pericia),
        ("Acta de mediación",           tpl_mediacion),
    ]

    rows, created = [], 0

    for i in range(24):  # 6 plantillas * 4
        name_base, fn = plantillas[i % len(plantillas)]
        long_text, summary_2lines, category = fn()

        # Validación defensiva de categoría
        category = category if category in DOC_CATEGORIES else "Others"

        name = f"{name_base} #{i+1}"
        slug = _slug(f"{name_base}-{i+1}")
        public_id = f"lexquo/seed/{slug}"

        # PDF en memoria y subida (idempotente)
        pdf = _pdf_bytes(long_text, title=name_base)
        secure_url = _ensure_pdf_in_cloudinary(
            public_id, pdf, tags=["lexquo", "seed", "pdf"])

        payload = dict(
            name=name,
            type="pdf",
            url_route=secure_url,          # URL de Cloudinary (raw)
            description=summary_2lines,    # resumen en 2 líneas
            category=category,
            document_date=today - timedelta(days=(i % 15)),
        )
        rows.append(payload)

    for r in rows:
        unique = {"name": r["name"], "url_route": r["url_route"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Document, unique, defaults)
        if was_created:
            created += 1

    print(
        f"Documents: agregados {created} (total deseado: {len(rows)}). Subidos a Cloudinary (raw).")


def seed_payments(session):
    # Usá naive UTC para ser consistente con tus columnas DateTime (sin tz)
    now = datetime.utcnow()

    # Helper: “x días atrás” pero SIN salir del mes actual
    def days_back_same_month(days: int) -> datetime:
        target = now - timedelta(days=days)
        if target.year != now.year or target.month != now.month:
            # clamp al primer día del mes actual (mediodía para evitar edge de 00:00)
            target = now.replace(day=1, hour=12, minute=0,
                                 second=0, microsecond=0)
        else:
            target = target.replace(hour=12, minute=0, second=0, microsecond=0)
        return target

    # Fechas “pagadas” dentro del mes actual
    paid_1d = days_back_same_month(1)
    paid_3d = days_back_same_month(3)
    paid_7d = days_back_same_month(7)

    rows = [
        # === approved (en el mes actual) ===
        dict(amount=5000.0,  currency="ARS", status=PaymentStatus.approved,  paid_at=paid_1d, means="Credit Card",
             stripe_payment_intent_id="pi_appr_001", updated_at=paid_1d, created_at=paid_1d),
        dict(amount=12000.0, currency="ARS", status=PaymentStatus.approved,  paid_at=paid_3d,
             means="Credit Card", stripe_payment_intent_id="pi_appr_002", updated_at=paid_3d, created_at=paid_3d),
        dict(amount=3500.0,  currency="USD", status=PaymentStatus.approved,  paid_at=paid_7d, means="Credit Card",
             stripe_payment_intent_id="pi_appr_003", updated_at=paid_7d, created_at=paid_7d),

        # === pending ===
        dict(amount=7500.0,  currency="USD", status=PaymentStatus.pending,   paid_at=None,   means="Credit Card",
             stripe_payment_intent_id=None,           created_at=now - timedelta(days=2)),
        dict(amount=8900.0,  currency="ARS", status=PaymentStatus.pending,   paid_at=None,
             means="Credit Card",  stripe_payment_intent_id=None,           created_at=now - timedelta(days=5)),
        dict(amount=4200.0,  currency="EUR", status=PaymentStatus.pending,   paid_at=None,   means="Credit Card",
             stripe_payment_intent_id=None,           created_at=now - timedelta(days=8)),

        # === processing ===
        dict(amount=8500.0,  currency="EUR", status=PaymentStatus.processing, paid_at=None,  means="Credit Card",
             stripe_payment_intent_id="pi_proc_001",  created_at=now - timedelta(days=4)),
        dict(amount=6000.0,  currency="COP", status=PaymentStatus.processing, paid_at=None,  means="Credit Card",
             stripe_payment_intent_id="pi_proc_002",  created_at=now - timedelta(days=6)),

        # === rejected ===
        dict(amount=12000.0, currency="ARS", status=PaymentStatus.rejected,  paid_at=None,   means="Credit Card",
             stripe_payment_intent_id="pi_rej_001",   created_at=now - timedelta(days=9)),
        dict(amount=3000.0,  currency="USD", status=PaymentStatus.rejected,  paid_at=None,
             means="Credit Card", stripe_payment_intent_id="pi_rej_002",   created_at=now - timedelta(days=10)),
    ]

    created = 0
    for r in rows:
        unique = {
            # Usá el intent_id como “casi-único” para evitar duplicados si re-seedeás
            "stripe_payment_intent_id": r.get("stripe_payment_intent_id"),
            "amount": r["amount"],
            "currency": r["currency"],
            "status": r["status"],
            "paid_at": r["paid_at"],
        }
        defaults = {
            "means": r.get("means"),
            # Si pasás created_at/updated_at explícitos, respetalos; si no, que aplique default
            "created_at": r.get("created_at"),
            "updated_at": r.get("updated_at") or r.get("created_at"),
        }
        obj, was_created = get_or_create(session, Payment, unique, defaults)
        if was_created:
            created += 1
        else:
            # Si ya existía, actualizá created/updated si los agregaste ahora
            if r.get("created_at"):
                obj.created_at = r["created_at"]
            if r.get("updated_at") or r.get("created_at"):
                obj.updated_at = r.get("updated_at") or r.get("created_at")
            if r.get("paid_at") is not None:
                obj.paid_at = r["paid_at"]
            session.add(obj)
            session.commit()

    print(f"Payments: agregados {created} (total deseado: {len(rows)})")

# =============================== relaciones =============================== #


def seed_relations(session):
    """
    Conecta:
      - CF-2025-1001 (María + Juan): 5 pagos
      - CF-2025-1002 (Lucía): 3 pagos
      - CF-2025-1003 (Lucía): 1 pago
      - CF-2025-1004 (Juan): 1 pago
      - Resto: sin pagos (para no contaminar el conteo)
    """
    # Courtfiles
    cfs = {cf.case_number: cf for cf in session.query(Courtfile).all()}
    cf1 = cfs.get("CF-2025-1001")
    cf2 = cfs.get("CF-2025-1002")
    cf3 = cfs.get("CF-2025-1003")
    cf4 = cfs.get("CF-2025-1004")

    # Lawyers
    maria = session.query(Lawyer).filter_by(
        email="maria.g@example.com").first()
    juan = session.query(Lawyer).filter_by(email="juan.p@example.com").first()
    lucia = session.query(Lawyer).filter_by(
        email="lucia.m@example.com").first()

    # Clients
    ana = session.query(Client).filter_by(email="ana.s@example.com").first()
    pedro = session.query(Client).filter_by(
        email="pedro.l@example.com").first()
    sofia = session.query(Client).filter_by(
        email="sofia.d@example.com").first()
    diego = session.query(Client).filter_by(
        email="diego.r@example.com").first()
    camila = session.query(Client).filter_by(
        email="camila.f@example.com").first()
    martin = session.query(Client).filter_by(
        email="martin.r@example.com").first()

    today = date.today()

    # ------------ CF1: fuerte (María + Juan) ------------
    if cf1:
        if maria:
            get_or_create_lawyer_courtfile(session, maria.id, cf1.id)
        if juan:
            get_or_create_lawyer_courtfile(session, juan.id,  cf1.id)
        if ana:
            get_or_create_client_courtfile(session, ana.id,   cf1.id)
        if pedro:
            get_or_create_client_courtfile(session, pedro.id, cf1.id)

        # deadlines clave (ajustados a tu nueva taxonomía)
        for dtype, dplus, hh, mm in [
            ("Contestación de demanda", 5, 12, 0),
            ("Ofrecimiento de prueba",  12, 13, 0),
            ("Recurso / Apelación",      9, 10, 0),
        ]:
            dl = session.query(Deadlines).filter_by(
                deadline_type=dtype,
                deadline_date=today + timedelta(days=dplus),
                deadline_hour=time(hh, mm)
            ).first()
            if dl:
                get_or_create_deadline_courtfile(session, dl.id, cf1.id)

        # citas
        for title, dplus, hh, mm in [
            ("Audiencia preliminar", 3, 10, 0),
            ("Reunión con cliente",  1, 16, 0),
            ("Audiencia testimonial", 8, 9, 30),
        ]:
            ap = session.query(Appointment).filter_by(
                title=title,
                date=today + timedelta(days=dplus),
                starts_at=time(hh, mm)
            ).first()
            if ap:
                get_or_create_appointment_courtfile(session, ap.id, cf1.id)

        # documentos (primeros 6)
        docs = session.query(Document).order_by(Document.id.asc()).all()
        for doc in docs[:6]:
            get_or_create_courtfile_document(session, cf1.id, doc.id)

    # ------------ CF2: medio (Lucía) ------------
    if cf2:
        if lucia:
            get_or_create_lawyer_courtfile(session, lucia.id, cf2.id)
        if sofia:
            get_or_create_client_courtfile(session, sofia.id, cf2.id)
        if diego:
            get_or_create_client_courtfile(session, diego.id, cf2.id)

        # 1 deadline (ajustado: "Documentación del cliente")
        dl = session.query(Deadlines).filter_by(
            deadline_type="Documentación del cliente",
            deadline_date=today + timedelta(days=20),
            deadline_hour=time(10, 30)
        ).first()
        if dl:
            get_or_create_deadline_courtfile(session, dl.id, cf2.id)

        # 1 appointment
        ap = session.query(Appointment).filter_by(
            title="Mediación",
            date=today + timedelta(days=7),
            starts_at=time(9, 30)
        ).first()
        if ap:
            get_or_create_appointment_courtfile(session, ap.id, cf2.id)

        # 3 documentos específicos (si existen)
        pick_names = ["Acta de mediación #1",
                      "Demanda inicial #2", "Oficio bancario #3"]
        for nm in pick_names:
            doc = session.query(Document).filter_by(name=nm).first()
            if doc:
                get_or_create_courtfile_document(session, cf2.id, doc.id)

    # ------------ CF3: ligero (Lucía) ------------
    if cf3:
        if lucia:
            get_or_create_lawyer_courtfile(session, lucia.id, cf3.id)
        if camila:
            get_or_create_client_courtfile(session, camila.id, cf3.id)
        if martin:
            get_or_create_client_courtfile(session, martin.id, cf3.id)

    # ------------ Resto: distribución liviana (sin pagos) ------------
    all_cfs = session.query(Courtfile).order_by(Courtfile.id.asc()).all()
    all_docs = session.query(Document).order_by(Document.id.asc()).all()
    all_apps = session.query(Appointment).all()
    all_dls = session.query(Deadlines).all()
    law_pool = [l for l in (maria, juan, lucia) if l]
    cli_pool = [c for c in (ana, pedro, sofia, diego, camila, martin) if c]

    for idx, cf in enumerate(all_cfs[3:], start=4):
        # 1 lawyer + 1 client
        if law_pool:
            get_or_create_lawyer_courtfile(
                session, law_pool[idx % len(law_pool)].id, cf.id)
        if cli_pool:
            get_or_create_client_courtfile(
                session, cli_pool[idx % len(cli_pool)].id, cf.id)
        # 1 doc
        if all_docs:
            get_or_create_courtfile_document(
                session, cf.id, all_docs[idx % len(all_docs)].id)
        # 1 appt / 1 deadline (si hay)
        if all_apps:
            get_or_create_appointment_courtfile(
                session, all_apps[idx % len(all_apps)].id, cf.id)
        if all_dls:
            get_or_create_deadline_courtfile(
                session, all_dls[idx % len(all_dls)].id, cf.id)
        # ❌ no asignamos pagos aquí para no contaminar el conteo de cada lawyer

    # --------- Asignación controlada de pagos (10 en total) ----------
    pays = session.query(Payment).order_by(Payment.id.asc()).all()
    if len(pays) >= 10:
        # María (CF1) → 5 pagos: indices 0..4
        if cf1:
            for p in pays[0:5]:
                get_or_create_payment_courtfile(session, p.id, cf1.id)

        # Lucía (CF2) → 3 pagos: indices 5..7
        if cf2:
            for p in pays[5:8]:
                get_or_create_payment_courtfile(session, p.id, cf2.id)

        # Lucía (CF3) → 1 pago: index 8
        if cf3:
            get_or_create_payment_courtfile(session, pays[8].id, cf3.id)

        # Juan (CF4) → 1 pago: index 9
        if cf4:
            # aseguramos que CF4 tenga a Juan (si no lo tiene, lo agregamos)
            if juan:
                get_or_create_lawyer_courtfile(session, juan.id, cf4.id)
            get_or_create_payment_courtfile(session, pays[9].id, cf4.id)

    print("Relaciones: listas (pagos distribuidos 5-3-1-1).")


# ================================ runner ================================ #

def run(session):
    print(">> Seed base: insertando sin borrar ni relacionar…")
    seed_admins(session)
    seed_lawyers(session)
    seed_clients(session)
    seed_courtfiles(session)
    seed_appointments(session)
    seed_deadlines(session)
    seed_documents(session)
    seed_payments(session)

    # 🔗 Relaciones
    seed_relations(session)

    # Resumen actual
    print("\n== Totales actuales ==")
    print(f"Admins:       {session.query(AdminUser).count()}")
    print(f"Lawyers:      {session.query(Lawyer).count()}")
    print(f"Clients:      {session.query(Client).count()}")
    print(f"Courtfiles:   {session.query(Courtfile).count()}")
    print(f"Appointments: {session.query(Appointment).count()}")
    print(f"Deadlines:    {session.query(Deadlines).count()}")
    print(f"Documents:    {session.query(Document).count()}")
    print(f"Payments:     {session.query(Payment).count()}")

    # Extras útiles para validar en consola
    print("\n== Relaciones ==")
    print(f"Lawyer↔Courtfile:   {db.session.query(LawyerCourtfile).count()}")
    print(f"Client↔Courtfile:   {db.session.query(ClientCourtfile).count()}")
    print(f"Deadline↔Courtfile: {db.session.query(DeadlineCourtfile).count()}")
    print(
        f"Appt↔Courtfile:     {db.session.query(AppointmentCourtfile).count()}")
    print(f"Doc↔Courtfile:      {db.session.query(CourtfileDocument).count()}")
    print(f"Payment↔Courtfile:  {db.session.query(PaymentCourtfile).count()}")
