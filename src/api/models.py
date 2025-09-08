from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Text, Date, Time
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import Mapped, mapped_column, validates
from werkzeug.security import generate_password_hash
from datetime import date, time


db = SQLAlchemy()


class Lawyer(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    firstname: Mapped[str] = mapped_column(String(50), nullable=False)
    lastname: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
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
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
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


class Deadlines(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    deadline_type: Mapped[str] = mapped_column(String(120), nullable=False)
    deadline_date: Mapped[date] = mapped_column(Date, nullable=False)
    deadline_hour: Mapped[time] = mapped_column(Time, nullable=False)
    priority: Mapped[str] = mapped_column(String(120), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "deadline_type": self.deadline_type,
            "deadline_date": self.deadline_date.isoformat() if self.deadline_date else None,  
            "deadline_hour": self.deadline_hour.strftime('%H:%M') if self.deadline_hour else None,  
            "priority": self.priority,
        }
