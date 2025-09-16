# src/api/seed.py
import sys
from datetime import datetime, date, time, timedelta

# 1) Cargar la app de Flask (con factory o app directa)
app = None
try:
    # Si usás factory
    from api.app import create_app
    app = create_app()
except Exception:
    try:
        # Si exponés "app" directamente
        from api.app import app as _app
        app = _app
    except Exception as e:
        print("No pude importar tu Flask app (create_app() o app).")
        print("Error:", e)
        sys.exit(1)

# 2) Importar tus modelos EXACTOS
try:
    from api.models import (
        db,
        AdminUser, Lawyer, Client,
        Courtfile, Appointment, Deadlines, Document, Payment, PaymentStatus,
        LawyerClient, LawyerCourtfile, ClientCourtfile,
        AppointmentCourtfile, DeadlineCourtfile, CourtfileDocument
    )
except Exception as e:
    print("No pude importar api.models. Revisá la ruta/nombre del módulo.")
    print("Error:", e)
    sys.exit(1)

# --------------------------------------------------------------------
# Config: si querés limpiar todo antes de insertar (drop & create)
REBUILD = True
# --------------------------------------------------------------------


def run():
    with app.app_context():
        if REBUILD:
            print(">> Dropeando y creando tablas…")
            db.drop_all()
            db.create_all()

        print(">> Insertando AdminUser…")
        admin = AdminUser(
            firstname="María",
            lastname="Admin",
            email="admin@lexquo.test",
            password="admin123",   # se hashea por @validates
            is_active=True
        )
        db.session.add(admin)

        print(">> Insertando Lawyers…")
        lawyers = [
            Lawyer(
                firstname="Ana", lastname="Pérez",
                email="ana.lawyer@lexquo.test", phone="11-2222-3333",
                password="test123", is_active=True
            ),
            Lawyer(
                firstname="Diego", lastname="López",
                email="diego.lawyer@lexquo.test", phone="11-4444-5555",
                password="test123", is_active=True
            ),
        ]
        db.session.add_all(lawyers)

        print(">> Insertando Clients…")
        clients = [
            Client(
                firstname="Sofía", lastname="García",
                email="sofia.client@lexquo.test", phone="11-6666-7777",
                password="test123", is_active=True
            ),
            Client(
                firstname="Martín", lastname="Rossi",
                email="martin.client@lexquo.test", phone="11-8888-9999",
                password="test123", is_active=True
            ),
        ]
        db.session.add_all(clients)

        print(">> Insertando Courtfiles…")
        courtfiles = [
            Courtfile(
                case_number="CF-0001/2025",
                title="Estafa",
                description="Investigación por estafa simple.",
                jurisdiction="FMZ - Justicia Federal de Mendoza",
                court="Juzgado Federal de Mendoza N° 1",
                status=True  # tu modelo usa Boolean
            ),
            Courtfile(
                case_number="CF-0002/2025",
                title="Robo simple",
                description="Causa por robo simple.",
                jurisdiction="FLP - Justicia Federal de La Plata",
                court="Juzgado Federal de La Plata N° 3",
                status=False
            ),
        ]
        db.session.add_all(courtfiles)

        db.session.commit()  # IDs disponibles
        print(">> Commit intermedio ✅")

        # ---------------- Relaciones N:N ----------------
        print(">> Relacionando Lawyer ↔ Client…")
        lc_rels = [
            LawyerClient(lawyer_id=lawyers[0].id, client_id=clients[0].id),
            LawyerClient(lawyer_id=lawyers[0].id, client_id=clients[1].id),
            LawyerClient(lawyer_id=lawyers[1].id, client_id=clients[1].id),
        ]
        db.session.add_all(lc_rels)

        print(">> Relacionando Lawyer ↔ Courtfile…")
        lcf_rels = [
            LawyerCourtfile(lawyer_id=lawyers[0].id, courtfile_id=courtfiles[0].id),
            LawyerCourtfile(lawyer_id=lawyers[1].id, courtfile_id=courtfiles[1].id),
        ]
        db.session.add_all(lcf_rels)

        print(">> Relacionando Client ↔ Courtfile…")
        ccf_rels = [
            ClientCourtfile(client_id=clients[0].id, courtfile_id=courtfiles[0].id),
            ClientCourtfile(client_id=clients[1].id, courtfile_id=courtfiles[1].id),
        ]
        db.session.add_all(ccf_rels)

        # ---------------- Appointments + relación ----------------
        print(">> Insertando Appointments…")
        today = date.today()
        appts = [
            Appointment(
                title="Reunión con clienta",
                date=today + timedelta(days=1),
                location="Estudio",
                starts_at=time(10, 0),
                ends_at=time(11, 0),
                # created_at: default datetime.utcnow
            ),
            Appointment(
                title="Audiencia preliminar",
                date=today + timedelta(days=3),
                location="Juzgado",
                starts_at=time(9, 30),
                ends_at=time(10, 15),
            ),
        ]
        db.session.add_all(appts)
        db.session.commit()

        print(">> Relacionando Appointment ↔ Courtfile…")
        appt_cf = [
            AppointmentCourtfile(appointment_id=appts[0].id, courtfile_id=courtfiles[0].id),
            AppointmentCourtfile(appointment_id=appts[1].id, courtfile_id=courtfiles[1].id),
        ]
        db.session.add_all(appt_cf)

        # ---------------- Deadlines + relación ----------------
        print(">> Insertando Deadlines…")
        dls = [
            Deadlines(
                deadline_type="Presentar escrito",
                deadline_date=today + timedelta(days=7),
                deadline_hour=time(13, 0),
                priority="alta",
            ),
            Deadlines(
                deadline_type="Control de expediente",
                deadline_date=today + timedelta(days=14),
                deadline_hour=time(12, 0),
                priority="media",
            ),
        ]
        db.session.add_all(dls)
        db.session.commit()

        print(">> Relacionando Deadlines ↔ Courtfile…")
        dl_cf = [
            DeadlineCourtfile(deadline_id=dls[0].id, courtfile_id=courtfiles[0].id),
            DeadlineCourtfile(deadline_id=dls[1].id, courtfile_id=courtfiles[1].id),
        ]
        db.session.add_all(dl_cf)

        # ---------------- Documents + relación ----------------
        print(">> Insertando Documents…")
        docs = [
            Document(
                name="poder.pdf",
                type="pdf",
                url_route="/uploads/poder.pdf",
                description="Poder del cliente",
                category="poderes",
                # create_at default utcnow
                document_date=today - timedelta(days=2),
            ),
            Document(
                name="demanda.pdf",
                type="pdf",
                url_route="/uploads/demanda.pdf",
                description="Demanda inicial",
                category="presentaciones",
                document_date=today - timedelta(days=1),
            ),
        ]
        db.session.add_all(docs)
        db.session.commit()

        print(">> Relacionando Document ↔ Courtfile…")
        doc_cf = [
            CourtfileDocument(document_id=docs[0].id, courtfile_id=courtfiles[0].id),
            CourtfileDocument(document_id=docs[1].id, courtfile_id=courtfiles[1].id),
        ]
        db.session.add_all(doc_cf)

        # ---------------- Payments ----------------
        print(">> Insertando Payments…")
        pays = [
            Payment(
                amount=50000.0,
                currency="ARS",
                status=PaymentStatus.approved,
                paid_at=datetime.utcnow() - timedelta(days=1),
                means="transferencia",
            ),
            Payment(
                amount=75000.0,
                currency="ARS",
                status=PaymentStatus.pending,
                paid_at=None,
                means="efectivo",
            ),
        ]
        db.session.add_all(pays)

        db.session.commit()
        print(">> Listo. Seed cargado ✅")


if __name__ == "__main__":
    run()
