# src/api/seed.py
# -----------------------------------------------------------------------------
# Seed extendido: inserta datos base + relaciones, sin borrar nada.
# Idempotente por campos únicos (email, case_number, etc.) y combinaciones.
# -----------------------------------------------------------------------------
from datetime import date, time, datetime, timedelta
from api.models import (
    db,
    Lawyer, Client, Courtfile,
    Appointment, Deadlines, Document,
    Payment, PaymentStatus, AdminUser,
    ClientCourtfile, LawyerCourtfile, DeadlineCourtfile,
    AppointmentCourtfile, CourtfileDocument, PaymentCourtfile
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

def _time(h, m=0):
    return time(h, m)

# -------- Helpers relaciones (pivots) con dedupe -------- #

def get_or_create_lawyer_courtfile(session, lawyer_id: int, courtfile_id: int):
    inst = session.query(LawyerCourtfile).filter_by(lawyer_id=lawyer_id, courtfile_id=courtfile_id).first()
    if inst: return inst, False
    inst = LawyerCourtfile(lawyer_id=lawyer_id, courtfile_id=courtfile_id)
    session.add(inst); session.commit()
    return inst, True

def get_or_create_client_courtfile(session, client_id: int, courtfile_id: int):
    inst = session.query(ClientCourtfile).filter_by(client_id=client_id, courtfile_id=courtfile_id).first()
    if inst: return inst, False
    inst = ClientCourtfile(client_id=client_id, courtfile_id=courtfile_id)
    session.add(inst); session.commit()
    return inst, True

def get_or_create_deadline_courtfile(session, deadline_id: int, courtfile_id: int):
    inst = session.query(DeadlineCourtfile).filter_by(deadline_id=deadline_id, courtfile_id=courtfile_id).first()
    if inst: return inst, False
    inst = DeadlineCourtfile(deadline_id=deadline_id, courtfile_id=courtfile_id)
    session.add(inst); session.commit()
    return inst, True

def get_or_create_appointment_courtfile(session, appointment_id: int, courtfile_id: int):
    inst = session.query(AppointmentCourtfile).filter_by(appointment_id=appointment_id, courtfile_id=courtfile_id).first()
    if inst: return inst, False
    inst = AppointmentCourtfile(appointment_id=appointment_id, courtfile_id=courtfile_id)
    session.add(inst); session.commit()
    return inst, True

def get_or_create_courtfile_document(session, courtfile_id: int, document_id: int):
    inst = session.query(CourtfileDocument).filter_by(courtfile_id=courtfile_id, document_id=document_id).first()
    if inst: return inst, False
    inst = CourtfileDocument(courtfile_id=courtfile_id, document_id=document_id)
    session.add(inst); session.commit()
    return inst, True

def get_or_create_payment_courtfile(session, payment_id: int, courtfile_id: int):
    inst = session.query(PaymentCourtfile).filter_by(payment_id=payment_id, courtfile_id=courtfile_id).first()
    if inst: return inst, False
    inst = PaymentCourtfile(payment_id=payment_id, courtfile_id=courtfile_id)
    session.add(inst); session.commit()
    return inst, True

# --------------------------- seeders base --------------------------- #

def seed_admins(session):
    rows = [
        dict(firstname="Carlos", lastname="Ramirez", email="carlos.r@example.com", password="1234", is_active=True),
        dict(firstname="Laura",  lastname="Mendez",  email="laura.m@example.com",  password="1234", is_active=True),
    ]
    created = 0
    for r in rows:
        unique = {"email": r["email"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, AdminUser, unique, defaults)
        if was_created: created += 1
    print(f"Admins: agregados {created}")

def seed_lawyers(session):
    rows = [
        dict(firstname="María", lastname="González", email="maria.g@example.com",
             phone="+54 11 5555-1001", password="1234", is_active=True,
             url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758559963/nmqqsbodsdldg45po6mj.png"),
        dict(firstname="Juan",  lastname="Pérez",    email="juan.p@example.com",
             phone="+54 11 5555-1002", password="1234", is_active=True,
             url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758559963/nmqqsbodsdldg45po6mj.png"),
        dict(firstname="Lucía", lastname="Martínez", email="lucia.m@example.com",
             phone="+54 11 5555-1003", password="1234", is_active=True,
             url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758559963/nmqqsbodsdldg45po6mj.png"),
    ]
    created = 0
    for r in rows:
        unique = {"email": r["email"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Lawyer, unique, defaults)
        if was_created: created += 1
    print(f"Lawyers: agregados {created}")

def seed_clients(session):
    rows = [
        dict(firstname="Ana",    lastname="Suarez",    email="ana.s@example.com",
             phone="+54 11 5555-2001", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758559963/nmqqsbodsdldg45po6mj.png"),
        dict(firstname="Pedro",  lastname="Lopez",     email="pedro.l@example.com",
             phone="+54 11 5555-2002", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758559963/nmqqsbodsdldg45po6mj.png"),
        dict(firstname="Sofía",  lastname="Diaz",      email="sofia.d@example.com",
             phone="+54 11 5555-2003", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758559963/nmqqsbodsdldg45po6mj.png"),
        dict(firstname="Diego",  lastname="Ruiz",      email="diego.r@example.com",
             phone="+54 11 5555-2004", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758559963/nmqqsbodsdldg45po6mj.png"),
        dict(firstname="Camila", lastname="Fernández", email="camila.f@example.com",
             phone="+54 11 5555-2005", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758559963/nmqqsbodsdldg45po6mj.png"),
        dict(firstname="Martin", lastname="Rossi",     email="martin.r@example.com",
             phone="+54 11 5555-2006", password="1234", is_active=True, url_img="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758559963/nmqqsbodsdldg45po6mj.png"),
    ]
    created = 0
    for r in rows:
        unique = {"email": r["email"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Client, unique, defaults)
        if was_created: created += 1
    print(f"Clients: agregados {created}")

def seed_courtfiles(session):
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
        if was_created: created += 1
    print(f"Courtfiles: agregados {created}")

def seed_appointments(session):
    today = date.today()
    rows = [
        dict(title="Audiencia preliminar", date=today + timedelta(days=3),
             location="Talcahuano 550, CABA", details="Presentación de prueba",
             starts_at=_time(10,0), ends_at=_time(11,0),
             latitud=-34.6037, longitud=-58.3816),
        dict(title="Mediación", date=today + timedelta(days=7),
             location="Cerrito 760, CABA", details="Mediación obligatoria",
             starts_at=_time(9,30), ends_at=_time(10,30),
             latitud=-34.5990, longitud=-58.3810),
        dict(title="Reunión con cliente", date=today + timedelta(days=1),
             location="Estudio Jurídico", details="Estrategia de defensa",
             starts_at=_time(16,0), ends_at=_time(17,0),
             latitud=None, longitud=None),
    ]
    created = 0
    for r in rows:
        unique = {"title": r["title"], "date": r["date"], "starts_at": r["starts_at"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Appointment, unique, defaults)
        if was_created: created += 1
    print(f"Appointments: agregados {created}")

def seed_deadlines(session):
    today = date.today()
    rows = [
        dict(deadline_type="Presentación de descargo", deadline_date=today + timedelta(days=5),
             deadline_hour=_time(12,0), priority="alta"),
        dict(deadline_type="Oferta de prueba", deadline_date=today + timedelta(days=12),
             deadline_hour=_time(13,0), priority="media"),
        dict(deadline_type="Acompañar documental", deadline_date=today + timedelta(days=20),
             deadline_hour=_time(10,30), priority="baja"),
    ]
    created = 0
    for r in rows:
        unique = {"deadline_type": r["deadline_type"], "deadline_date": r["deadline_date"], "deadline_hour": r["deadline_hour"]}
        defaults = {"priority": r["priority"]}
        _, was_created = get_or_create(session, Deadlines, unique, defaults)
        if was_created: created += 1
    print(f"Deadlines: agregados {created}")

def seed_documents(session):
    today = date.today()
    rows = [
        dict(name="Demanda inicial (PDF)", type="pdf", url_route="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758256377/documents/file_yndlpo.pdf",
             description="Demanda base", category="presentaciones", document_date=today - timedelta(days=10)),
        dict(name="Convenio de mediación (Word)", type="docx", url_route="https://res.cloudinary.com/doxdmmj1o/raw/upload/v1758256496/documents/LEXQUO_hvi7g2.docx?fl_attachment=LEXQUO.docx",
             description="Acta de mediación", category="mediación", document_date=today - timedelta(days=3)),
        dict(name="Oficio a banco (Img)", type="docx", url_route="https://res.cloudinary.com/doxdmmj1o/image/upload/v1758256779/documents/profile_jprfp2.png",
             description="Oficio solicitando informes", category="oficios", document_date=today),
    ]
    created = 0
    for r in rows:
        unique = {"name": r["name"], "url_route": r["url_route"]}
        defaults = {k: v for k, v in r.items() if k not in unique}
        _, was_created = get_or_create(session, Document, unique, defaults)
        if was_created: created += 1
    print(f"Documents: agregados {created}")

def seed_payments(session):
    now = datetime.utcnow()
    rows = [
        dict(amount=5000.0, currency="ARS", status=PaymentStatus.approved,
             paid_at=now - timedelta(days=2), means="TDC", stripe_payment_intent_id="pi_approved_123456"),
        dict(amount=7500.0, currency="USD", status=PaymentStatus.pending,
             paid_at=None, means="TDC", stripe_payment_intent_id=None),
        dict(amount=12000.0, currency="ARS", status=PaymentStatus.rejected,
             paid_at=None, means="TDC", stripe_payment_intent_id="pi_rejected_789012"),
        dict(amount=8500.0, currency="EUR", status=PaymentStatus.processing,
             paid_at=None, means="TDC", stripe_payment_intent_id="pi_processing_345678"),
        dict(amount=6000.0, currency="COP", status=PaymentStatus.processing,
             paid_at=None, means="TDC", stripe_payment_intent_id="pi_processing_901234")
    ]
    created = 0
    for r in rows:
        unique = {
            "amount": r["amount"], "currency": r["currency"], "status": r["status"],
            "paid_at": r["paid_at"], "stripe_payment_intent_id": r["stripe_payment_intent_id"]
        }
        defaults = {"means": r.get("means")}
        _, was_created = get_or_create(session, Payment, unique, defaults)
        if was_created: created += 1
    print(f"Payments: agregados {created}")

# --------------------------- relaciones --------------------------- #

def seed_relations(session):
    """
    Conecta:
      - CF-2025-1001 con María/Juan y Ana/Pedro + deadlines/appointments/docs/payments
      - CF-2025-1002 con Lucía y Sofía/Diego + recursos
      - CF-2025-1003 con Camila/Martin (ejemplo 'vacío')
    """
    cf1 = session.query(Courtfile).filter_by(case_number="CF-2025-1001").first()
    cf2 = session.query(Courtfile).filter_by(case_number="CF-2025-1002").first()
    cf3 = session.query(Courtfile).filter_by(case_number="CF-2025-1003").first()

    maria = session.query(Lawyer).filter_by(email="maria.g@example.com").first()
    juan  = session.query(Lawyer).filter_by(email="juan.p@example.com").first()
    lucia = session.query(Lawyer).filter_by(email="lucia.m@example.com").first()

    ana   = session.query(Client).filter_by(email="ana.s@example.com").first()
    pedro = session.query(Client).filter_by(email="pedro.l@example.com").first()
    sofia = session.query(Client).filter_by(email="sofia.d@example.com").first()
    diego = session.query(Client).filter_by(email="diego.r@example.com").first()
    camila= session.query(Client).filter_by(email="camila.f@example.com").first()
    martin= session.query(Client).filter_by(email="martin.r@example.com").first()

    today = date.today()

    # ------------ CF1 ------------
    if cf1:
        if maria: get_or_create_lawyer_courtfile(session, maria.id, cf1.id)
        if juan:  get_or_create_lawyer_courtfile(session, juan.id,  cf1.id)
        if ana:   get_or_create_client_courtfile(session, ana.id,   cf1.id)
        if pedro: get_or_create_client_courtfile(session, pedro.id, cf1.id)

        # deadlines
        for dtype, dplus, hh, mm in [
            ("Presentación de descargo", 5, 12, 0),
            ("Oferta de prueba",         12, 13, 0)
        ]:
            dl = session.query(Deadlines).filter_by(
                deadline_type=dtype,
                deadline_date=today + timedelta(days=dplus),
                deadline_hour=time(hh, mm)
            ).first()
            if dl: get_or_create_deadline_courtfile(session, dl.id, cf1.id)

        # appointments
        for title, dplus, hh, mm in [
            ("Audiencia preliminar", 3, 10, 0),
            ("Reunión con cliente",  1, 16, 0)
        ]:
            ap = session.query(Appointment).filter_by(
                title=title,
                date=today + timedelta(days=dplus),
                starts_at=time(hh, mm)
            ).first()
            if ap: get_or_create_appointment_courtfile(session, ap.id, cf1.id)

        # documents (dos primeros)
        docs = session.query(Document).order_by(Document.id.asc()).all()
        for doc in docs[:2]:
            get_or_create_courtfile_document(session, cf1.id, doc.id)

        # payments (approved o processing)
        pays = session.query(Payment).all()
        for p in pays:
            if p.status in (PaymentStatus.approved, PaymentStatus.processing):
                get_or_create_payment_courtfile(session, p.id, cf1.id)

    # ------------ CF2 ------------
    if cf2:
        if lucia: get_or_create_lawyer_courtfile(session, lucia.id, cf2.id)
        if sofia: get_or_create_client_courtfile(session, sofia.id, cf2.id)
        if diego: get_or_create_client_courtfile(session, diego.id, cf2.id)

        # 1 deadline
        dl = session.query(Deadlines).filter_by(
            deadline_type="Acompañar documental",
            deadline_date=today + timedelta(days=20),
            deadline_hour=time(10, 30)
        ).first()
        if dl: get_or_create_deadline_courtfile(session, dl.id, cf2.id)

        # 1 appointment
        ap = session.query(Appointment).filter_by(
            title="Mediación",
            date=today + timedelta(days=7),
            starts_at=time(9, 30)
        ).first()
        if ap: get_or_create_appointment_courtfile(session, ap.id, cf2.id)

        # 1 document específico
        doc = session.query(Document).filter_by(name="Convenio de mediación (Word)").first()
        if doc: get_or_create_courtfile_document(session, cf2.id, doc.id)

        # 1 payment pending si existe
        pend = session.query(Payment).filter_by(status=PaymentStatus.pending).first()
        if pend: get_or_create_payment_courtfile(session, pend.id, cf2.id)

    # ------------ CF3 ------------
    if cf3:
        if camila: get_or_create_client_courtfile(session, camila.id, cf3.id)
        if martin: get_or_create_client_courtfile(session, martin.id, cf3.id)
        # sin lawyers ni recursos: caso "vacío"
    print("Relaciones: listas (sin IA ni mensajes).")

# ----------------------------- runner ----------------------------- #

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
    print(f"Admins:      {session.query(AdminUser).count()}")
    print(f"Lawyers:     {session.query(Lawyer).count()}")
    print(f"Clients:     {session.query(Client).count()}")
    print(f"Courtfiles:  {session.query(Courtfile).count()}")
    print(f"Appointments:{session.query(Appointment).count()}")
    print(f"Deadlines:   {session.query(Deadlines).count()}")
    print(f"Documents:   {session.query(Document).count()}")
    print(f"Payments:    {session.query(Payment).count()}")

    # Extras útiles para validar en consola
    print("\n== Relaciones ==")
    print(f"Lawyer↔Courtfile:   {db.session.query(LawyerCourtfile).count()}")
    print(f"Client↔Courtfile:   {db.session.query(ClientCourtfile).count()}")
    print(f"Deadline↔Courtfile: {db.session.query(DeadlineCourtfile).count()}")
    print(f"Appt↔Courtfile:     {db.session.query(AppointmentCourtfile).count()}")
    print(f"Doc↔Courtfile:      {db.session.query(CourtfileDocument).count()}")
    print(f"Payment↔Courtfile:  {db.session.query(PaymentCourtfile).count()}")

# if __name__ == "__main__":
#     with app.app_context():
#         run(db.session)
