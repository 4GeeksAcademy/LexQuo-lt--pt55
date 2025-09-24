from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Text, Date, Time, DateTime, ForeignKey, Time, Float, Enum, func, UniqueConstraint, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from typing import List
from werkzeug.security import generate_password_hash
from datetime import date, time, datetime
import enum


db = SQLAlchemy()


class Message(db.Model):
    __tablename__ = "message"

    id: Mapped[int] = mapped_column(primary_key=True)

    # <- TU NOMBRE DE COLUMNA
    id_courtfile: Mapped[int] = mapped_column(
        ForeignKey("courtfile.id"), index=True, nullable=False
    )

    # 'lawyer' | 'client' | 'admin'
    sender: Mapped[str] = mapped_column(String(20), nullable=False)

    # <- TUS CAMPOS
    client_id: Mapped[int] = mapped_column(
        ForeignKey("client.id"), nullable=True)
    lawyer_id: Mapped[int] = mapped_column(
        ForeignKey("lawyer.id"), nullable=True)

    # <- TU NOMBRE DE COLUMNA
    texto: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped["datetime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones (las FK client/lawyer son opcionales)
    courtfile: Mapped["Courtfile"] = relationship(
        "Courtfile", back_populates="messages", lazy="joined")
    client = relationship("Client", lazy="joined", foreign_keys=[client_id])
    lawyer = relationship("Lawyer", lazy="joined", foreign_keys=[lawyer_id])

    # ------ Helpers para serializar como lo espera el FRONT ------
    def to_front_dict(self):
        """Devuelve el shape que ya usa tu ChatOnDemand.jsx"""
        if self.sender == "lawyer" and self.lawyer:
            name = f"{self.lawyer.firstname} {self.lawyer.lastname}".strip()
        elif self.sender == "client" and self.client:
            name = f"{self.client.firstname} {self.client.lastname}".strip()
        else:
            name = self.sender

        return {
            "id": self.id,
            "courtfile_id": self.id_courtfile,          # <- mapeo
            "sender_role": self.sender,                 # <- mapeo
            "sender_id": self.lawyer_id if self.sender == "lawyer" else (
                self.client_id if self.sender == "client" else None
            ),
            "sender_name": name, 
            "text": self.texto,                         # <- mapeo
            "created_at": (self.created_at.isoformat() if self.created_at else None)
        }
    
    __table_args__ = (
        db.Index("ix_message_cf_created", "id_courtfile", "created_at"),
    )

class ChatRead(db.Model):
    __tablename__ = "chat_read"

    id: Mapped[int] = mapped_column(primary_key=True)
    # mismo nombre de columna que usás en Message
    id_courtfile: Mapped[int] = mapped_column(
        ForeignKey("courtfile.id"), index=True, nullable=False
    )

    role: Mapped[str] = mapped_column(String(20), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    last_read_at: Mapped["datetime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    courtfile: Mapped["Courtfile"] = relationship("Courtfile", lazy="joined")

    __table_args__ = (
        UniqueConstraint("id_courtfile", "role", "user_id", name="uq_chatread_cfid_role_user"),
        db.Index("ix_chatread_role_user", "role", "user_id"),
        db.Index("ix_chatread_cfid_lastread", "id_courtfile", "last_read_at"),
    )

class Lawyer(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    firstname: Mapped[str] = mapped_column(String(50), nullable=False)
    lastname: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)
    password: Mapped[str] = mapped_column(String(500), nullable=False)
    url_img: Mapped[str] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean(), default=True, nullable=False)

    courtfiles: Mapped[List["LawyerCourtfile"]
                       ] = relationship(back_populates="lawyer")
    client: Mapped[List["LawyerClient"]] = relationship(
        back_populates="lawyer")

    @validates("password")
    def _hash_password(self, key, value):
        if value and not str(value).startswith(("pbkdf2:", "scrypt:")):
            return generate_password_hash(value)
        return value

    def __str__(self):
        return f"{self.firstname} {self.lastname}"

    def serialize(self):
        return {
            "id": self.id,
            "firstname": self.firstname,
            "lastname": self.lastname,
            "email": self.email,
            "phone": self.phone,
            "url_img": self.url_img,
            "is_active": self.is_active,
            "role": "lawyer",
        }


class Client(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    firstname: Mapped[str] = mapped_column(String(50), nullable=False)
    lastname: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)
    password: Mapped[str] = mapped_column(String(500), nullable=False)
    url_img: Mapped[str] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean(), default=True, nullable=False)

    courtfiles: Mapped[List["ClientCourtfile"]
                       ] = relationship(back_populates="client")
    lawyer: Mapped[List["LawyerClient"]] = relationship(
        back_populates="client")

    @validates("password")
    def _hash_password(self, key, value):
        if value and not str(value).startswith(("pbkdf2:", "scrypt:")):
            return generate_password_hash(value)
        return value

    def __str__(self):
        return f"{self.firstname} {self.lastname}"

    def serialize(self):
        return {
            "id": self.id,
            "firstname": self.firstname,
            "lastname": self.lastname,
            "email": self.email,
            "phone": self.phone,
            "url_img": self.url_img,
            "is_active": self.is_active,
            "role": "client",
        }


class AdminUser(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    firstname: Mapped[str] = mapped_column(String(50), nullable=False)
    lastname: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean(), default=True, nullable=False)

    @validates("password")
    def _hash_password(self, key, value):
        if value and not str(value).startswith(("pbkdf2:", "scrypt:")):
            return generate_password_hash(value)
        return value

    def serialize(self):
        return {
            "id": self.id,
            "firstname": self.firstname,
            "lastname": self.lastname,
            "email": self.email,
            "is_active": self.is_active,
        }


class Courtfile(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    case_number: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(255), nullable=False)
    court: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[bool] = mapped_column(Boolean, nullable=False)

    clients: Mapped[List["ClientCourtfile"]] = relationship(
        back_populates="courtfile")
    deadlines: Mapped[List["DeadlineCourtfile"]
                      ] = relationship(back_populates="courtfile")
    lawyers: Mapped[List["LawyerCourtfile"]] = relationship(
        back_populates="courtfile")
    appointment: Mapped[List["AppointmentCourtfile"]
                        ] = relationship(back_populates="courtfile")
    document: Mapped[List["CourtfileDocument"]
                     ] = relationship(back_populates="courtfile")
    payment_courtfiles: Mapped[List["PaymentCourtfile"]
                               ] = relationship(back_populates="courtfile")
    messages = relationship(
        "Message",
        back_populates="courtfile",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __str__(self):
        return self.case_number

    def serialize(self):
        return {
            "id": self.id,
            "case_number": self.case_number,
            "title": self.title,
            "description": self.description,
            "jurisdiction": self.jurisdiction,
            "court": self.court,
            "status": self.status,
        }


class Appointment(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    location: Mapped[str] = mapped_column(String(500), nullable=True)
    details: Mapped[str] = mapped_column(String(255), nullable=False)
    starts_at: Mapped[Time] = mapped_column(Time, nullable=False)
    ends_at: Mapped[Time] = mapped_column(Time, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow)
    latitud: Mapped[float] = mapped_column(Float, nullable=True)
    longitud: Mapped[float] = mapped_column(Float, nullable=True)

    courtfiles: Mapped[List["AppointmentCourtfile"]
                       ] = relationship(back_populates="appointment")

    def __str__(self):
        return f"{self.title} - {self.date}"

    def serialize(self):
        date_str = self.date.strftime('%Y-%m-%d')
        starts_str = self.starts_at.strftime('%H:%M')
        ends_str = self.ends_at.strftime('%H:%M')

        return {
            "id": self.id,
            "title": self.title,
            "date": date_str,
            "location": self.location,
            "details": self.details,
            "starts_at": starts_str,
            "ends_at": ends_str,
            "created_at": self.created_at.isoformat(),
            "latitud": self.latitud,
            "longitud": self.longitud
        }


class Deadlines(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    deadline_type: Mapped[str] = mapped_column(String(120), nullable=False)
    deadline_date: Mapped[date] = mapped_column(Date, nullable=False)
    deadline_hour: Mapped[time] = mapped_column(Time, nullable=False)
    priority: Mapped[str] = mapped_column(String(120), nullable=False)

    courtfiles: Mapped[List["DeadlineCourtfile"]
                       ] = relationship(back_populates="deadlines")

    def __str__(self):
        return f"{self.deadline_type} ({self.priority}) - {self.deadline_date}"

    def serialize(self):
        return {
            "id": self.id,
            "deadline_type": self.deadline_type,
            "deadline_date": self.deadline_date.isoformat() if self.deadline_date else None,
            "deadline_hour": self.deadline_hour.strftime('%H:%M') if self.deadline_hour else None,
            "priority": self.priority,
        }


class Document(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    url_route: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True)
    create_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow)
    document_date: Mapped[date] = mapped_column(Date, nullable=True)

    courtfile: Mapped[List["CourtfileDocument"]
                      ] = relationship(back_populates="document")

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "url_route": self.url_route,
            "description": self.description,
            "category": self.category,
            "create_at": self.create_at.isoformat(),
            "document_date": self.document_date.isoformat()
        }


class ClientCourtfile(db.Model):
    __tablename__ = 'client_courtfile'

    id: Mapped[int] = mapped_column(primary_key=True)

    client_id: Mapped[int] = mapped_column(
        ForeignKey("client.id"), nullable=False, index=True)
    client: Mapped["Client"] = relationship(back_populates="courtfiles")

    courtfile_id: Mapped[int] = mapped_column(
        ForeignKey("courtfile.id"), nullable=False, index=True)
    courtfile: Mapped["Courtfile"] = relationship(back_populates="clients")


class DeadlineCourtfile(db.Model):
    __tablename__ = 'deadline_courtfile'

    id: Mapped[int] = mapped_column(primary_key=True)

    deadline_id: Mapped[int] = mapped_column(
        ForeignKey("deadlines.id"), nullable=False, index=True)
    deadlines: Mapped["Deadlines"] = relationship(back_populates="courtfiles")

    courtfile_id: Mapped[int] = mapped_column(
        ForeignKey("courtfile.id"), nullable=False, index=True)
    courtfile: Mapped["Courtfile"] = relationship(back_populates="deadlines")


class LawyerCourtfile(db.Model):
    __tablename__ = 'lawyer_courtfile'

    id: Mapped[int] = mapped_column(primary_key=True)

    lawyer_id: Mapped[int] = mapped_column(
        ForeignKey("lawyer.id"), nullable=False, index=True)
    lawyer: Mapped["Lawyer"] = relationship(back_populates="courtfiles")

    courtfile_id: Mapped[int] = mapped_column(
        ForeignKey("courtfile.id"), nullable=False, index=True)
    courtfile: Mapped["Courtfile"] = relationship(back_populates="lawyers")


class AppointmentCourtfile(db.Model):
    __tablename__ = 'appointment_courtfile'

    id: Mapped[int] = mapped_column(primary_key=True)

    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointment.id"), nullable=False, index=True)
    appointment: Mapped["Appointment"] = relationship(
        back_populates="courtfiles")

    courtfile_id: Mapped[int] = mapped_column(
        ForeignKey("courtfile.id"), nullable=False, index=True)
    courtfile: Mapped["Courtfile"] = relationship(back_populates="appointment")


class LawyerClient(db.Model):
    __tablename__ = 'lawyer_client'

    id: Mapped[int] = mapped_column(primary_key=True)

    lawyer_id: Mapped[int] = mapped_column(
        ForeignKey("lawyer.id"), nullable=False, index=True)
    lawyer: Mapped["Lawyer"] = relationship(back_populates="client")

    client_id: Mapped[int] = mapped_column(
        ForeignKey("client.id"), nullable=False, index=True)
    client: Mapped["Client"] = relationship(back_populates="lawyer")


class CourtfileDocument(db.Model):
    __tablename__ = 'courtfile_document'

    id: Mapped[int] = mapped_column(primary_key=True)

    courtfile_id: Mapped[int] = mapped_column(
        ForeignKey("courtfile.id"), nullable=False, index=True)
    courtfile: Mapped["Courtfile"] = relationship(back_populates="document")

    document_id: Mapped[int] = mapped_column(
        ForeignKey("document.id"), nullable=False, index=True)
    document: Mapped["Document"] = relationship(back_populates="courtfile")


class PaymentStatus(enum.Enum):
    pending = "pending"
    processing = "processing"
    approved = "approved"
    rejected = "rejected"


class Payment(db.Model):
    __tablename__ = 'payment'

    id: Mapped[int] = mapped_column(primary_key=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[enum.Enum] = mapped_column(
        Enum(PaymentStatus), nullable=False, default=PaymentStatus.pending)
    paid_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    means: Mapped[str] = mapped_column(String(50), nullable=True)
    stripe_payment_intent_id = db.Column(db.String(100))

    payment_courtfiles: Mapped[List["PaymentCourtfile"]
                               ] = relationship(back_populates="payment")

    def serialize(self):
        return {
            "id": self.id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status.value,
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "means": self.means
        }


class PaymentCourtfile(db.Model):
    __tablename__ = 'payment_courtfile'

    id: Mapped[int] = mapped_column(primary_key=True)

    payment_id: Mapped[int] = mapped_column(
        ForeignKey("payment.id"), nullable=False, index=True)
    payment: Mapped["Payment"] = relationship(
        back_populates="payment_courtfiles")

    courtfile_id: Mapped[int] = mapped_column(
        ForeignKey("courtfile.id"), nullable=False, index=True)
    courtfile: Mapped["Courtfile"] = relationship(
        back_populates="payment_courtfiles")

    def serialize(self):
        return {
            "id": self.id,
            "payment_id": self.payment_id,
            "courtfile_id": self.courtfile_id
        }
