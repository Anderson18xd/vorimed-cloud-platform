# VoriMed Cloud Platform — Telemedicine Triage System

Plataforma web de triaje médico diseñada para **Vori Health**, desplegada en **AWS** bajo prácticas **DevSecOps**. El sistema separa el frontend estático serverless del backend contenerizado, aplicando políticas de mínimo privilegio con IAM, imágenes Docker endurecidas (multi-stage) y auditoría automatizada de infraestructura con Python y Boto3.

---

## Executive Summary (English)

**VoriMed Cloud Platform** is a cloud-native medical triage application built to manage telemedicine patient queues (Musculoskeletal symptoms, urgency levels, and clinical discharge). 

* **Serverless Frontend:** Hosted on **Amazon S3** as a static website for low latency and zero server-memory overhead, communicating with the backend via strict **CORS** policies.
* **Containerized Backend & Database:** Built with **Node.js (Express)** and **PostgreSQL 15**, orchestrated via **Docker Compose** on **Amazon EC2**.
* **Zero-Trust & DevSecOps:** The API Docker image is built locally using a **multi-stage `Dockerfile`**, runs as a non-root user (`node`), and is pushed to **Amazon ECR**. The EC2 instance pulls the image using a native **IAM Instance Profile** (no hardcoded AWS credentials in production).
* **Automated Cloud Auditing:** Includes a local **Python (Boto3)** script (`auditor_vori.py`) that inspects running EC2 instances, verifies IAM role attachment, and alerts on overly permissive Security Group rules (such as open SSH `22` or PostgreSQL `5432` ports).

---

## Arquitectura del Sistema

```text
[ Médico / Navegador ]
         │
         ├── 1. Carga interfaz estática (HTML/CSS/JS)
         ▼
[ Amazon S3 Bucket ] (Static Website Hosting)
         │
         ├── 2. Peticiones REST API (GET, POST, DELETE) + Validación CORS estricta
         ▼
[ AWS EC2 Instance ] (Security Group: Puerto 5000 / SSH restringido)
   ├── IAM Instance Profile (Permiso nativo de lectura hacia AWS ECR)
   ├── Linux Hardening (SSH sin root + Firewall activo)
   └── Docker Compose (Red aislada: Vorimed_net)
         ├── Contenedor API (Node.js/Express - Imagen desde AWS ECR)
         └── Contenedor DB (PostgreSQL 15 Alpine + Volumen Vorimed_pgdata + Healthcheck)
```

---

## Tecnologías Utilizadas

* **Cloud (AWS):** Amazon S3, Amazon EC2, Amazon ECR, AWS IAM (Roles & Instance Profiles), Security Groups.
* **Contenedores:** Docker (Multi-stage builds) y Docker Compose V2.
* **Backend:** Node.js 20 Alpine, Express.js, `pg` (node-postgres), `cors`.
* **Base de Datos:** PostgreSQL 15 Alpine con persistencia de datos y `pg_isready` healthcheck.
* **Frontend:** HTML5, CSS3 y Vanilla JavaScript (`fetch` API).
* **Seguridad y Automatización:** Bash Scripting (Linux Hardening) y Python 3 (`boto3`) para auditoría Cloud.

---

## Estructura del Repositorio

```text
vorimed-cloud-platform/
├── backend/
│   ├── Dockerfile           # Construcción Multi-stage, sin npm en producción y usuario non-root
│   ├── package.json         # Dependencias del servidor Express
│   └── server.js            # API REST (/health, /patients) y conexión a PostgreSQL
├── frontend/
│   ├── index.html           # Interfaz de triaje médico VoriMed
│   ├── styles.css           # Estilos del portal clínico
│   └── app.js               # Consumo de la API REST en EC2
├── docker-compose.yml       # Orquestación de producción (ECR Image + Postgres + Healthcheck)
├── hardering.sh             # Script idempotente de aseguramiento del servidor (Firewall + SSH)
├── auditor_vori.py          # Script DevSecOps en Boto3 para auditar EC2 y Security Groups
├── .env.example             # Plantilla de variables de entorno (sin secretos reales)
└── .gitignore               # Exclusión de .env, node_modules, llaves .pem y archivos temporales
```

---

## Decisiones de Seguridad (DevSecOps)

1. **CORS Estricto:** El backend en Express rechaza orígenes desconocidos y autoriza únicamente el endpoint del bucket de Amazon S3 (`ALLOWED_ORIGIN`), evitando el uso del comodín `*`.
2. **Contenedor Endurecido (Zero HIGH/CRITICAL CVEs):**
   * Uso de `node:20-alpine` con actualización de paquetes del sistema (`apk update && apk upgrade`).
   * Etapa `runner` limpia sin gestores de paquetes (`npm`/`npx` eliminados) para reducir la superficie de ataque.
   * Ejecución bajo el usuario sin privilegios `USER node`.
3. **Identidad Nativa en AWS (Sin credenciales en EC2):** La instancia EC2 utiliza un `Instance Profile` con una política de IAM asociada para autenticarse contra Amazon ECR, evitando almacenar `AWS_ACCESS_KEY_ID` en el servidor.
4. **Aislamiento de Base de Datos:** PostgreSQL corre únicamente dentro de la red interna de Docker (`Vorimed_net`) sin exponer el puerto `5432` al exterior, validando su estado mediante `healthcheck` antes de iniciar la API.
5. **Hardening del Sistema Operativo:** Script automatizado que deshabilita el acceso root por SSH (`PermitRootLogin no`) y restringe los puertos entrantes en el servidor.

---

## Despliegue y Uso

### 1. Compilación y subida de la imagen a Amazon ECR (Entorno Local)
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker build -t vorimed-ecr:1.0.0 ./backend
docker tag vorimed-ecr:1.0.0 <AWS_ACCOUNT_ID>[.dkr.ecr.us-east-1.amazonaws.com/vorimed-ecr:1.0.0](https://.dkr.ecr.us-east-1.amazonaws.com/vorimed-ecr:1.0.0)
docker push <AWS_ACCOUNT_ID>[.dkr.ecr.us-east-1.amazonaws.com/vorimed-ecr:1.0.0](https://.dkr.ecr.us-east-1.amazonaws.com/vorimed-ecr:1.0.0)
```

### 2. Ejecución en Producción (Servidor EC2)
```bash
# Aplicar hardening del servidor
chmod +x hardering.sh && ./hardering.sh

# Autenticar con ECR mediante IAM Role y levantar servicios
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker compose pull
docker compose up -d
```

### 3. Despliegue del Frontend en Amazon S3
```bash
aws s3 sync ./frontend/ s3://mi-bucket-s3-ander-18857/ --cache-control "no-cache"
```

### 4. Ejecución de la Auditoría DevSecOps (Boto3)
Desde el entorno local, ejecutar el script de inspección de infraestructura:
```bash
pip install boto3
python3 auditor_vori.py
```

---

## Endpoints de la API

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/health` | Verifica la conectividad activa entre la API y PostgreSQL (`200 OK`). |
| `GET` | `/patients` | Lista