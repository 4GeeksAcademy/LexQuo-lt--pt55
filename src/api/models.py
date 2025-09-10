from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Text, Date, Time, DateTime
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, validates
from werkzeug.security import generate_password_hash


db = SQLAlchemy()


class Lawyer(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    firstname: Mapped[str] = mapped_column(String(50), nullable=False)
    lastname: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)
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
            "phone": self.phone,
            "is_active": self.is_active,
        }

class Client(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    firstname: Mapped[str] = mapped_column(String(50), nullable=False)
    lastname: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)
    password: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), default=True, nullable=False)
    
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
            "phone": self.phone,
            "is_active": self.is_active,
        }


class AdminUser(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    firstname: Mapped[str] = mapped_column(String(50), nullable=False)
    lastname: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), default=True, nullable=False)

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
    starts_at: Mapped[Time] = mapped_column(Time, nullable=False)
    ends_at: Mapped[Time] = mapped_column(Time, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def serialize(self):
        date_str = self.date.strftime('%Y-%m-%d')
        starts_str = self.starts_at.strftime('%H:%M')
        ends_str = self.ends_at.strftime('%H:%M')
        
        return {
            "id": self.id,
            "title": self.title,
            "date": date_str,
            "location": self.location,
            "starts_at": starts_str,
            "ends_at": ends_str,
            "created_at": self.created_at.isoformat()
        }