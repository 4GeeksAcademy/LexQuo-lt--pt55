from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Text, Date, Time, DateTime, ForeignKey, Time
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from typing import List
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

    courtfiles: Mapped[List["LawyerCourtfile"]] = relationship(back_populates="lawyer")

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
    is_active: Mapped[bool] = mapped_column(Boolean(), default=True, nullable=False)
    courtfiles: Mapped[List["ClientCourtfile"]] = relationship(back_populates="client")    

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

    clients: Mapped[List["ClientCourtfile"]] = relationship(back_populates="courtfile")
    deadlines: Mapped[List["DeadlineCourtfile"]] = relationship(back_populates="courtfile")
    lawyers: Mapped[List["LawyerCourtfile"]] = relationship(back_populates="courtfile")

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

class Deadlines(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    deadline_type: Mapped[str] = mapped_column(String(120), nullable=False)
    deadline_date: Mapped[date] = mapped_column(Date, nullable=False)
    deadline_hour: Mapped[time] = mapped_column(Time, nullable=False)
    priority: Mapped[str] = mapped_column(String(120), nullable=False)

    courtfiles: Mapped[List["DeadlineCourtfile"]] = relationship(back_populates="deadlines")

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

class ClientCourtfile(db.Model):
    __tablename__ = 'client_courtfile'

    id: Mapped[int] = mapped_column(primary_key=True)

    client_id: Mapped[int] = mapped_column(ForeignKey("client.id"), nullable=False, index=True)
    client: Mapped["Client"] = relationship(back_populates="courtfiles")

    courtfile_id: Mapped[int] = mapped_column(ForeignKey("courtfile.id"), nullable=False, index=True)
    courtfile: Mapped["Courtfile"] = relationship(back_populates="clients")


class DeadlineCourtfile(db.Model):
    __tablename__ = 'deadline_courtfile'

    id: Mapped[int] = mapped_column(primary_key=True)

    deadline_id: Mapped[int] = mapped_column(ForeignKey("deadlines.id"), nullable=False, index=True)
    deadlines: Mapped["Deadlines"] = relationship(back_populates="courtfiles")

    courtfile_id: Mapped[int] = mapped_column(ForeignKey("courtfile.id"), nullable=False, index=True)
    courtfile: Mapped["Courtfile"] = relationship(back_populates="deadlines")


class LawyerCourtfile(db.Model):
    __tablename__ = 'lawyer_courtfile'

    id: Mapped[int] = mapped_column(primary_key=True)

    lawyer_id: Mapped[int] = mapped_column(ForeignKey("lawyer.id"), nullable=False, index=True)
    lawyer: Mapped["Lawyer"] = relationship(back_populates="courtfiles")

    courtfile_id: Mapped[int] = mapped_column(ForeignKey("courtfile.id"), nullable=False, index=True)
    courtfile: Mapped["Courtfile"] = relationship(back_populates="lawyers")


