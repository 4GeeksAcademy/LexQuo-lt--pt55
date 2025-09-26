# Comandos importantes para LexQuo

### 🔄 Reseteo de base de datos
```sh
pipenv run reset_db
```

## 📦 Instalación de librerías


#### 📌 FRONTEND
```sh
# Instalar dependencias
npm install

# Correr servidor de desarrollo
npm run start
``` 
**Dependencias principales utilizadas:**

- `react`, `react-dom`, `react-router-dom` → núcleo de React y navegación
- `bootstrap-icons` → íconos
- `date-fns` → manejo de fechas
- `react-datepicker` → selector de fechas
- `leaflet` + `@vis.gl/react-google-maps` + `@googlemaps/js-api-loader` → mapas
- `cloudinary`, `multer`, `multer-storage-cloudinary` → manejo y almacenamiento de archivos en la nube
- `firebase` → autenticación / notificaciones en tiempo real (según configuración)
- `socket.io-client` → comunicación en tiempo real (chat, notificaciones)
- `prop-types` → validación de props en componentes React

#### 📌 BACKEND
```sh
# Instalar dependencias (usa pipenv)
pipenv install

# Migraciones de base de datos
pipenv run init      # solo la primera vez
pipenv run migrate   # genera migraciones
pipenv run upgrade   # aplica migraciones

# Iniciar servidor
pipenv run start
```

**Dependencias principales utilizadas:**

- **flask**  
- **flask-cors**  
- **flask-jwt-extended**  
- **flask-migrate**  
- **flask-sqlalchemy**  
- **psycopg2-binary** (para PostgreSQL)  
- **cloudinary**  
- **stripe**  
- **python-dotenv**

## 🔑 Variables de entorno
```sh
DATABASE_URL=*********************
FLASK_APP_KEY=*********************
FLASK_APP=*********************
FLASK_DEBUG=*********************
DEBUG=*********************

# Front-End Variables
VITE_BASENAME=/
VITE_BACKEND_URL=*********************

# Front en Codespaces (puerto 3000)
FRONTEND_ORIGIN=*********************

CLOUDINARY_CLOUD_NAME=*********************
CLOUDINARY_API_KEY=*********************
CLOUDINARY_API_SECRET=*********************

OPENAI_API_KEY=*********************
OPENAI_MODEL=*********************

EMAIL_USER=lexquotech@gmail.com
EMAIL_PASS=*********************

STRIPE_SECRET_KEY=*********************
STRIPE_WEBHOOK_SECRET=*********************

SMTP_USER="lexquotech@gmail.com"
SMTP_PASS=*********************
SMTP_HOST=*********************
SMTP_PORT=*********************          
FROM_NAME=*********************

GEMINI_API_KEY=*********************
```

## 🌱 Seed de datos básicos
```sh
PYTHONPATH=./src pipenv run python -m api.seed
pipenv run insert-seed
```  
⚠️ Importante: un cambio en los modelos puede generar error en el seed.
Por ejemplo, si Lawyer empieza a requerir url_img, hay que agregarlo al seed.
(Salvo que el campo sea opcional).

## 📧 Comandos para actualización de plantillas de correo
(Ya están instalados en package.json)

```sh
npm run mjml:build ---> Una sola vez

npm run mjml:watch ---> Luego, abrir nueva terminal y dejar corriendo el watch
```  
# ...............................................................................................................................................................

# 🏛 LexQuo: Plataforma Legal para Abogados y Clientes
**LexQuo** es una plataforma web diseñada para conectar abogados y clientes, facilitando la gestión de casos, tareas, documentos y comunicaciones legales de forma centralizada y segura.
-----------------------------------------------------------------------------------------------------------------
[![React](https://img.shields.io/badge/Frontend-React-61dafb?logo=react&logoColor=222)](https://react.dev)
[![Vite](https://img.shields.io/badge/Build-Vite-646cff?logo=vite&logoColor=fff)](https://vitejs.dev)
[![Flask](https://img.shields.io/badge/Backend-Flask-000?logo=flask)](https://flask.palletsprojects.com)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791?logo=postgresql&logoColor=fff)](https://www.postgresql.org)
[![SQLAlchemy](https://img.shields.io/badge/ORM-SQLAlchemy-D71F00?logo=python&logoColor=fff)](https://www.sqlalchemy.org)
[![JWT](https://img.shields.io/badge/Security-JWT-000?logo=jsonwebtokens&logoColor=fff)](https://jwt.io)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?logo=socket.io&logoColor=fff)](https://socket.io)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-635bff?logo=stripe&logoColor=fff)](https://stripe.com)
[![Cloudinary](https://img.shields.io/badge/Storage-Cloudinary-3448C5?logo=cloudinary&logoColor=fff)](https://cloudinary.com)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI-412991?logo=openai&logoColor=fff)](https://platform.openai.com)
[![Gemini](https://img.shields.io/badge/AI-Gemini-4285f4?logo=google&logoColor=fff)](https://ai.google.dev)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=000)](https://render.com)
[![Gmail SMTP](https://img.shields.io/badge/Emails-Google%20SMTP-EA4335?logo=gmail&logoColor=fff)](https://developers.google.com/gmail)

---

## 🚀 Funcionalidades principales

### Para abogados  
- **Dashboard de vista general** con acceso rápido a expedientes, tareas y notificaciones.  
- **Gestión integral de expedientes**: creación, edición y administración de casos jurídicos.  
- **Vinculación de expedientes** con clientes y/o colegas abogados para trabajo colaborativo.  
- **Chat en vivo** con clientes y abogados vinculados al caso.  
- **Pasarela de pagos integrada** para recibir honorarios de manera segura.  
- **Gestión documental**: carga, organización y compartición de documentos legales.  
- **Asistencia con IA**: generación de resúmenes automáticos de archivos y sugerencias de medidas procesales.  
- **Calendario de plazos y citas**: registro de deadlines y appointments, con posibilidad de asignar nivel de urgencia.  
- **Integración con mapas** para visualizar ubicaciones relevantes a los casos o audiencias.   
- **Notificaciones por email**: invitaciones a clientes y abogados mediante notificaciones automáticas con Google SMTP (Gmail). 

### Para clientes  
- **Acceso exclusivo a sus propios casos** con detalle del estado y avance de cada expediente.  
- **Visualización y descarga de documentos** compartidos por su abogado.  
- **Notificaciones automáticas** sobre próximas citas (appointments).  
- **Chat en vivo** con su abogado para una comunicación directa y segura.   
- **Pagos en línea** de honorarios a través de la pasarela integrada.  

### Para admins
- Acceso amplio con logs y visión transversal.
---

## ✨ Por qué LexQuo destaca

**Todo recurso relevante existe dentro de un expediente (courtfile).**
- Courtfile‑First: Todo vive dentro de un expediente. Documentos, chat, pagos, plazos y citas deben estar vinculados a un courtfile_id válido. Esto simplifica permisos, auditoría y trazabilidad.

- RBAC sólido: Accesos por rol y por vínculo al expediente (Lawyer/Client/Admin). Filtrado de datos por courtfile_id siempre.

- Tiempo real: Notificaciones y chat con Socket.IO.

- Pagos integrados: Stripe Checkout con control de estados y protección ante reintentos.

- Gestión documental: Subida y entrega de archivos con Cloudinary.

- Asistencia con IA: Resúmenes de documentos y sugerencias procesales (OpenAI/Gemini).

- Arquitectura limpia: Capas claras (routes ⇢ services ⇢ models), validadores y utilidades reusables.


## 🧰 Tecnologías utilizadas

| Capa             | Tecnología                              | Rol / Uso principal                                   |
|------------------|-----------------------------------------|------------------------------------------------------|
| **Frontend**     | React, React Router, Vite               | UI dinámica, routing, consumo de API                 |
| **Backend**      | Flask (Python)                          | API REST, lógica de negocio, autenticación/autorización |
| **ORM / DB**     | SQLAlchemy + Alembic (Flask-Migrate)    | Modelos, mapeo objeto-relacional, migraciones        |
| **Base de datos**| PostgreSQL (SQLite opcional en dev)     | Almacenamiento relacional de datos                   |
| **Seguridad**    | JWT, Guards (PrivateRoute), RBAC        | Protección de datos, control de roles y permisos     |
| **Tiempo real**  | Socket.IO                               | Chat en vivo, notificaciones instantáneas            |
| **Archivos**     | Cloudinary API, Multer                  | Subida, almacenamiento y descarga de documentos      |
| **Inteligencia Artificial** | OpenAI API, Gemini API        | Resumen de documentos, sugerencia de medidas legales |
| **Pagos**        | Stripe                                  | Procesamiento seguro de pagos en línea               |
| **Infraestructura / Dev** | Pipenv, Docker/Devcontainer, Render | Entorno reproducible y despliegue                    |
| **Emails**       | Google SMTP (Gmail)                     | Invitaciones, notificaciones automáticas por correo  |


## 🛠 Instalación y puesta en marcha

### Requisitos previos

- Python (versión 3.10 o superior)  
- Node.js (versión compatible, por ejemplo 20.x)  
- Base de datos (PostgreSQL preferido, o SQLite local para desarrollo)  
- pipenv (o manejo de entornos virtuales)  
- Git  


## 🗂️ Estructura del proyecto
```mermaid
LexQuo/
├── README.md
├── .env.example
├── Pipfile / Pipfile.lock
├── requirements.txt              # (opcional si exportás desde Pipenv)
├── devcontainer/                 # (si usan Codespaces)
├── migrations/                   # Alembic (Flask-Migrate)
├── src/
│   ├── api/                      # Backend (Flask)
│   │   ├── __init__.py           # create_app, CORS, JWT, blueprints
│   │   ├── models.py             # SQLAlchemy models (User/Lawyer/Client/... Courtfile, Document, Payment, etc.)
│   │   ├── routes/               # Blueprints organizados por dominio
│   │   │   ├── auth.py           # login, refresh, me
│   │   │   ├── courtfiles.py     # CRUD expedientes + vínculos (cliente/abogado)
│   │   │   ├── documents.py      # upload/download (Cloudinary)
│   │   │   ├── appointments.py   # citas (appointments)
│   │   │   ├── deadlines.py      # plazos (deadlines)  ✅ *siempre linkeados a un courtfile*
│   │   │   ├── payments.py       # Stripe
│   │   │   ├── chats.py          # mensajes / chat
│   │   │   └── emails.py         # envíos (invitaciones, notifs)
│   │   ├── services/             # Lógica de negocio (capas de servicio)
│   │   │   ├── payments_service.py
│   │   │   ├── documents_service.py
│   │   │   └── ai_service.py     # OpenAI / Gemini (resúmenes, sugerencias)
│   │   ├── validators/           # validaciones y parsing (fechas, horarios, etc.)
│   │   │   └── __init__.py
│   │   ├── mails_utils.py        # utilidades de e-mail (SMTP)
│   │   ├── utils.py              # helpers generales (APIException, paginate, etc.)
│   │   ├── seed.py               # seed de datos base
│   │   └── commands.py           # comandos CLI (insert-seed, reset_db, etc.)
│   └── frontend/                 # Frontend (React)
│       ├── index.html
│       └── src/
│           ├── main.jsx
│           ├── router.jsx        # React Router (rutas públicas/privadas)
│           ├── pages/            # páginas de alto nivel (Dashboards, Listados, etc.)
│           │   ├── DashboardLawyer.jsx
│           │   ├── DashboardClient.jsx
│           │   ├── Login.jsx
│           │   └── NotFound.jsx
│           ├── views/            # vistas por dominio (Courtfiles, Documents, Chats, Payments, ...)
│           │   ├── courtfiles/
│           │   │   ├── ListCourtfiles.jsx
│           │   │   ├── ViewCourtfileLawyer.jsx
│           │   │   └── ViewCourtfileClient.jsx
│           │   ├── documents/
│           │   │   └── ViewDocument.jsx
│           │   ├── chats/
│           │   │   ├── ChatsOverview.jsx
│           │   │   └── ChatRoom.jsx
│           │   ├── payments/
│           │   │   └── Checkout.jsx
│           │   ├── deadlines/
│           │   │   └── DeadlinesBoard.jsx
│           │   └── appointments/
│           │       └── AppointmentsBoard.jsx
│           ├── components/       # UI reutilizable (modals, tables, forms, map, etc.)
│           ├── hooks/            # custom hooks (useGlobalReducer, useUnreadBadges, etc.)
│           ├── store/            # contexto global + reducer (auth, me, colecciones)
│           │   ├── StoreProvider.jsx
│           │   ├── reducer.js
│           │   └── actions.js
│           ├── services/         # llamadas a API (fetch/axios), socket.io client
│           │   ├── api.js
│           │   └── socket.js
│           ├── utils/            # helpers (date-fns, formatters)
│           ├── assets/           # imágenes, íconos
│           └── styles/           # estilos (Bootstrap + custom)
└── tests/                        # (opcional) unit/integration (API y UI)
```



## 🔐 Reglas y Principios

- **Courtfile-First**: todo recurso relevante (Documents, Deadlines, Appointments, Payments, Messages) debe estar vinculado a un `courtfile_id` válido.  
- **Autorización** = rol + vínculo al expediente:  
  - **Lawyer** → acceso solo si está vinculado en `LawyerCourtfile`.  
  - **Client** → acceso solo si está vinculado en `ClientCourtfile`.  
  - **Admin** → acceso amplio, con logs y auditoría.  
- **Visibilidad**: siempre se filtra por `courtfile_id` + vínculo. Nunca se listan recursos globales sin scope.  
- **Guards en frontend**: protección con `PrivateRoute` según token + rol en el store.  
- **Protección en backend**: decoradores `@jwt_required` y validación de vínculos.  
- **Estados de pago confiables**: manejo de reintentos, timeouts e idempotencia en webhooks de Stripe.  
- **No eliminación en cascada** de pagos/documentos: preferir *soft delete* o validación de estado.  
- **Validadores centralizados**: fechas (ISO/24h) y parsing seguro.  
- **Logs y auditoría**: registro de acciones administrativas y eventos críticos.  
- **Notificaciones**: chats, vencimientos y cobros se disparan siempre en contexto de expediente.  

## 🧭 Arquitectura
```mermaid
flowchart LR
  subgraph Frontend [React + Vite]
    UI[UI/Router/Store] -->|JWT| API
    UI -->|Socket.IO Client| WS[(Realtime)]
  end

  subgraph Backend [Flask API]
    API[/Blueprints: auth, courtfiles, documents, deadlines, appointments, payments, chats, emails/]
    SRV[Services]
    VAL[Validators]
    API --> SRV --> DB[(PostgreSQL)]
    API --> CLD[Cloudinary]
    API --> STR[Stripe]
    API <-->|events| WS
  end

  ```

  ## 🔌 Endpoints (muestra rápida)

> Todos los endpoints sensibles requieren **JWT** y respetan el **scope por `courtfile_id`**.  
> La protección se aplica tanto en el **frontend (guards con React Router)** como en el **backend (decoradores JWT y validación de vínculos)**.

```http
POST   /api/auth/login
GET    /api/me

GET    /api/courtfiles
POST   /api/courtfiles
GET    /api/courtfiles/:id

GET    /api/documents?courtfileId=...
POST   /api/documents (multipart)

GET    /api/deadlines?courtfileId=...
POST   /api/deadlines

GET    /api/appointments?courtfileId=...
POST   /api/appointments

POST   /api/payments/:paymentId/create-checkout-session
POST   /api/stripe/webhook

GET    /api/chats/:courtfileId/messages
POST   /api/chats/:courtfileId/messages

POST   /api/emails/invite
POST   /api/emails/linked
```

## 🧪 Calidad y DX

- **Estructura por dominios** (`courtfiles`, `documents`, `chats`, `payments`…).  
- **Hooks y Store global** (React Context + Reducer) para mantener `auth.token`, `me` y colecciones cacheadas.  
- **Guards de rutas** en el **frontend** (PrivateRoute) basados en token + rol del store.  
- **Protecciones en backend** con **JWT** (`@jwt_required`) y validación de vínculos a `courtfile_id`.  
- **Validadores centralizados** (ej. fechas ISO/24h, parsing seguro).  

---

