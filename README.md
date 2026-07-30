# 💳 Ahorro Cuota de Manejo TC - Suscripción Automatizada PayPal

Servicio web en Node.js + Express con integración de PayPal Subscriptions para automatizar 12 microcompras diarias de **$0.50 USD** entre el día 2 y 14 de cada mes.

Ideal para tarjetahabientes que requieren realizar un mínimo de compras mensuales en su tarjeta de crédito para **exonerar el pago de la cuota de manejo**.

---

## 🚀 Características

- **Ahorro Automatizado:** Programe sus 12 microcompras de $0.50 USD ($6.00 USD/mes total) directamente a su tarjeta de crédito a través de PayPal.
- **Días Personalizables:** Automatización activa del 2 al 14 de cada mes.
- **Seguridad en Credenciales:** El frontend interactúa con un backend seguro en Node.js sin exponer jamás llaves secretas o tokens de PayPal.
- **Checkout Seguro:** Integración con PayPal Smart Payment Buttons & Billing Plans API.

---

## 🛠️ Requisitos Previos

- **Node.js** (v18 o superior)
- Cuenta de **PayPal Developer** (para obtener `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET`).

---

## ⚙️ Configuración e Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/paypal-DaviBank.git
cd paypal-DaviBank
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```env
PORT=3000
PAYPAL_CLIENT_ID=tu_paypal_client_id
PAYPAL_CLIENT_SECRET=tu_paypal_client_secret

# Para ambiente Sandbox (pruebas):
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com

# Para ambiente Live (producción):
# PAYPAL_API_BASE=https://api-m.paypal.com
```

> ⚠️ **IMPORTANTE DE SEGURIDAD**: Nunca incluyas tu archivo `.env` en el control de versiones (Git). El archivo `.gitignore` ya está configurado para ignorarlo.

---

## 🏃 Ejecución de la Aplicación

### Modo Desarrollo (auto-reload):
```bash
npm run dev
```

### Modo Producción:
```bash
npm start
```

Abre tu navegador en `http://localhost:3000`.

---

## 🔒 Estructura del Proyecto y Seguridad

```text
.
├── .env.example       # Plantilla de variables de entorno (sin secretos)
├── .gitignore         # Exclusión de secretos (.env, node_modules, etc.)
├── server.js          # Servidor Node.js (OAuth2 PayPal token, Plans & API logic)
├── public/            # Interfaz de usuario (HTML, CSS y cliente JS)
│   ├── index.html
│   ├── app.js
│   └── style.css
└── package.json
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.