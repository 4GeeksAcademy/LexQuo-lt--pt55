# src/api/seed.py
# -----------------------------------------------------------------------------
# Seed minimalista: SOLO inserta datos base, sin borrar ni crear relaciones.
# Idempotente por campos únicos (email, case_number, name+url_route).
# -----------------------------------------------------------------------------
from datetime import date, time, datetime, timedelta
from app import app
from api.models import (
    db,
    Lawyer, Client, Courtfile,
    Appointment, Deadlines, Document,
    Payment, PaymentStatus
)

# ------------------------- utilidades ------------------------- #
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

# --------------------------- seeders --------------------------- #
def seed_lawyers(session):
    # password: se hashea automáticamente por @validates en tu modelo
    rows = [
        dict(firstname="María",  lastname="González", email="maria.g@example.com",
             phone="+54 11 5555-1001", password="1234", is_active=True,
             url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png"),
        dict(firstname="Juan",   lastname="Pérez",     email="juan.p@example.com",
             phone="+54 11 5555-1002", password="1234", is_active=True,
             url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png"),
        dict(firstname="Lucía",  lastname="Martínez",  email="lucia.m@example.com",
             phone="+54 11 5555-1003", password="1234", is_active=True,
             url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png"),
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
             phone="+54 11 5555-2001", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png"),
        dict(firstname="Pedro",  lastname="Lopez",     email="pedro.l@example.com",
             phone="+54 11 5555-2002", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png"),
        dict(firstname="Sofía",  lastname="Diaz",      email="sofia.d@example.com",
             phone="+54 11 5555-2003", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png"),
        dict(firstname="Diego",  lastname="Ruiz",      email="diego.r@example.com",
             phone="+54 11 5555-2004", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png"),
        dict(firstname="Camila", lastname="Fernández", email="camila.f@example.com",
             phone="+54 11 5555-2005", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png"),
        dict(firstname="Martin", lastname="Rossi",     email="martin.r@example.com",
             phone="+54 11 5555-2006", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758082452/tqwaum1f1i2fso5kwhms.png"),
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
    # status es Boolean requerido en tu modelo
    rows = [
        dict(case_number="CF-2025-1001", title="Expediente de prueba 1",
             description="Descripción 1", jurisdiction="PJN - CABA",
             court="Juzgado Nacional en lo Criminal y Correccional N° 5",
             status=True),
        dict(case_number="CF-2025-1002", title="Expediente de prueba 2",
             description="Descripción 2", jurisdiction="PJN - Provincia de Buenos Aires",
             court="Tribunal Oral en lo Criminal N° 2 de La Plata",
             status=True),
        dict(case_number="CF-2025-1003", title="Expediente de prueba 3",
             description="Descripción 3", jurisdiction="Justicia Federal - Mendoza",
             court="Juzgado Federal N° 1 de Mendoza",
             status=False),
    ]
    created = 0
    for r in rows:
        unique = {"case_number": r["case_number"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Courtfile, unique, defaults)
        if was_created:
            created += 1
    print(f"Courtfiles: agregados {created}")

def seed_appointments(session):
    # Campos NOT NULL: title, date, details, starts_at, ends_at
    today = date.today()
    now = datetime.utcnow()
    rows = [
        dict(
            title="Audiencia preliminar",
            date=today + timedelta(days=3),
            location="Talcahuano 550, CABA",
            details="Presentación de prueba",
            starts_at=time(10, 0),
            ends_at=time(11, 0),
            latitud=-34.6037, longitud=-58.3816
        ),
        dict(
            title="Mediación",
            date=today + timedelta(days=7),
            location="Cerrito 760, CABA",
            details="Mediación obligatoria",
            starts_at=time(9, 30),
            ends_at=time(10, 30),
            latitud=-34.5990, longitud=-58.3810
        ),
        dict(
            title="Reunión con cliente",
            date=today + timedelta(days=1),
            location="Estudio Jurídico",
            details="Estrategia de defensa",
            starts_at=time(16, 0),
            ends_at=time(17, 0),
            latitud=None, longitud=None
        ),
    ]
    created = 0
    for r in rows:
        # No hay campo único → intentamos deduplicar por (title, date, starts_at)
        unique = {"title": r["title"], "date": r["date"], "starts_at": r["starts_at"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Appointment, unique, defaults)
        if was_created:
            created += 1
    print(f"Appointments: agregados {created}")

def seed_deadlines(session):
    # Modelo: Deadlines (plural)
    # Campos NOT NULL: deadline_type, deadline_date, deadline_hour, priority
    today = date.today()
    rows = [
        dict(deadline_type="Presentación de descargo", deadline_date=today + timedelta(days=5),
             deadline_hour=time(12, 0), priority="alta"),
        dict(deadline_type="Oferta de prueba",         deadline_date=today + timedelta(days=12),
             deadline_hour=time(13, 0), priority="media"),
        dict(deadline_type="Acompañar documental",     deadline_date=today + timedelta(days=20),
             deadline_hour=time(10, 30), priority="baja"),
    ]
    created = 0
    for r in rows:
        # No hay campo único → deduplicar por (type, date, hour)
        unique = {
            "deadline_type": r["deadline_type"],
            "deadline_date": r["deadline_date"],
            "deadline_hour": r["deadline_hour"],
        }
        defaults = {"priority": r["priority"]}
        _, was_created = get_or_create(session, Deadlines, unique, defaults)
        if was_created:
            created += 1
    print(f"Deadlines: agregados {created}")

def seed_documents(session):
    # Campos NOT NULL: name, type, url_route
    today = date.today()
    rows = [
        dict(name="Demanda inicial",   type="pdf", url_route="/uploads/docs/demanda_inicial.pdf",
             description="Demanda base", category="presentaciones",
             document_date=today - timedelta(days=10)),
        dict(name="Convenio de mediación", type="pdf", url_route="/uploads/docs/convenio_mediacion.pdf",
             description="Acta de mediación", category="mediación",
             document_date=today - timedelta(days=3)),
        dict(name="Oficio a banco",    type="docx", url_route="/uploads/docs/oficio_banco.docx",
             description="Oficio solicitando informes", category="oficios",
             document_date=today),
    ]
    created = 0
    for r in rows:
        # Deduplicar por (name, url_route) para evitar repetidos obvios
        unique = {"name": r["name"], "url_route": r["url_route"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Document, unique, defaults)
        if was_created:
            created += 1
    print(f"Documents: agregados {created}")

def seed_payments(session):
    # Campos NOT NULL: amount, currency, status (tiene default PaymentStatus.pending)
    now = datetime.utcnow()
    rows = [
        dict(amount=50000.0, currency="ARS", status=PaymentStatus.approved, paid_at=now - timedelta(days=2), means="transferencia"),
        dict(amount=75000.0, currency="ARS", status=PaymentStatus.pending,  paid_at=None,                     means="mercadopago"),
        dict(amount=120000.0, currency="ARS", status=PaymentStatus.rejected, paid_at=None,                    means="efectivo"),
    ]
    created = 0
    for r in rows:
        # No hay campo único → heurística: (amount, currency, status, paid_at)
        unique = {
            "amount": r["amount"],
            "currency": r["currency"],
            "status": r["status"],
            "paid_at": r["paid_at"],
        }
        defaults = {"means": r.get("means")}
        _, was_created = get_or_create(session, Payment, unique, defaults)
        if was_created:
            created += 1
    print(f"Payments: agregados {created}")

# ----------------------------- runner ----------------------------- #
def run():
    with app.app_context():
        session = db.session
        print(">> Seed base: insertando sin borrar ni relacionar…")
        seed_lawyers(session)
        seed_clients(session)
        seed_courtfiles(session)
        seed_appointments(session)
        seed_deadlines(session)
        seed_documents(session)
        seed_payments(session)

        # Resumen actual
        print("\n== Totales actuales ==")
        print(f"Lawyers:     {session.query(Lawyer).count()}")
        print(f"Clients:     {session.query(Client).count()}")
        print(f"Courtfiles:  {session.query(Courtfile).count()}")
        print(f"Appointments:{session.query(Appointment).count()}")
        print(f"Deadlines:   {session.query(Deadlines).count()}")
        print(f"Documents:   {session.query(Document).count()}")
        print(f"Payments:    {session.query(Payment).count()}")

if __name__ == "__main__":
    run()
