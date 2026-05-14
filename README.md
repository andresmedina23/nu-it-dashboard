# IT Dashboard — Nubank Colombia

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.19-820AD1?style=for-the-badge" />
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey?style=for-the-badge&logo=apple" />
  <img src="https://img.shields.io/badge/electron-41-47848F?style=for-the-badge&logo=electron" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=for-the-badge&logo=react" />
</p>

App de escritorio para el equipo de IT Support de Nubank Colombia. Centraliza los comandos del CLI (`it`, `nu`, `nu-co`, `nu-ist`) en una interfaz visual con terminal real integrada, sin tener que recordar ni escribir comandos manualmente.

**Autor:** @will

---

## Instalación

1. Descarga el `.dmg` desde [**Releases**](https://github.com/andresmedina23/nu-it-dashboard/releases/latest)
   - `IT-Dashboard-1.0.19-arm64.dmg` → Apple Silicon (M1/M2/M3/M4)
2. Abre el DMG y arrastra **IT Dashboard** a tu carpeta de Aplicaciones
3. Primera vez: **clic derecho → Abrir** para aceptar en macOS Gatekeeper
4. Listo — la app detecta actualizaciones automáticamente al iniciar

---

## Requisitos

| Requisito | Detalle |
|---|---|
| macOS | Apple Silicon (M1/M2/M3/M4) |
| `it` | CLI de IT Engineering |
| `nu`, `nu-co`, `nu-ist` | CLIs de Nubank por entorno |
| `~/.nurc` | Configurado (la app lo sourcéa antes de cada comando) |
| Tokens activos | AWS + nu OAuth vigentes |

---

## Secciones

### Diagnóstico
Verifica el estado del entorno con un click:
- CLIs disponibles: `it`, `nu`, `nu-co`, `nu-ist`, `git`, `brew`
- Autenticación: `nu auth whoami`, `nu-co auth whoami`
- SSH: presencia de claves en `~/.ssh`

### NuCLI / AWS

| Tab | Comando que ejecuta |
|---|---|
| **Refresh AWS** | `nu-ist aws credentials refresh` |
| **Login Completo** | Actualiza `it`/`nu`/`nu-co`, renueva tokens AWS y OAuth para todos los entornos |
| **Toolio** | `nu-co toolio add <email>` |

### JAMF
Gestión de equipos macOS vía número de serie.

| Tab | Qué hace |
|---|---|
| **Recovery Key** | Obtiene la llave de recuperación del disco cifrado |
| **ZTD Enroll** | Inscribe el equipo en Zero Touch Deployment |
| **ZTD Remove** | Remueve el equipo del ZTD |
| **Admin Temporal** | Permisos de administrador local por tiempo limitado (default 60 min) |
| **Unlock** | Desbloquea un equipo bloqueado por MDM |

### Certificados
Generación de certificados Nubanker y de red.

| Tab | Qué hace |
|---|---|
| **Nubanker** | Certificado Nubanker en producción |
| **Red + VLAN** | Certificado de red con VLAN seleccionada |
| **Nubanker + Link** | Certificado + enlace compartible |
| **Red + Link** | Certificado de red + enlace compartible |
| **Flujo Completo** | Los 4 pasos anteriores en secuencia automática |

VLANs disponibles: Eng (10), Business (11), People (12), Finance (13), Board (14), Infosec (15), ITops (16), Xpeer (17), Rasp (23), Psec (26), Print (30), Zoom (31), Phone (32), Third (34).

### YubiKey

| Tab | Qué hace |
|---|---|
| **Configurar** | Instala dependencias brew/pip y configura la YubiKey (`it yubikey configure`) |
| **Scopes nu-co** | Muestra scopes del usuario en nu-co |
| **Scopes nu** | Muestra scopes del usuario en nu |

### Inventario
Gestión de activos IT Colombia (Snipe-IT vía CLI `it`).

| Tab | Qué hace |
|---|---|
| **Checkout** | Asigna un activo a un usuario |
| **Checkin** | Devuelve un activo al inventario |
| **Checkin + Update** | Checkin y actualiza el status en secuencia |
| **Update Status** | Cambia el status de un activo individual |
| **Update Múltiple** | Cambia el status de varios activos a la vez (uno por línea) |
| **Crear Usuario** | Crea un usuario nuevo en el inventario |

> El asset tag acepta `FVFKDC8C1WFV` o `CO-FVFKDC8C1WFV` — el prefijo `CO-` se agrega automáticamente.

<details>
<summary>Estados de inventario disponibles</summary>

| # | Estado |
|---|---|
| 1 | Ready to Return |
| 2 | Retired |
| 3 | Ready to Disposed |
| 4 | Assessment |
| 5 | In Transit |
| 6 | In Use |
| 7 | Lost |
| 8 | Donated |
| 9 | Stolen |
| 10 | Maintenance |
| 11 | In Stock |

</details>

---

## Barra de estado (tokens)

La barra superior muestra el estado de credenciales en tiempo real, leyendo archivos locales sin ejecutar ningún comando:

| Indicador | Fuente |
|---|---|
| **AWS** | `~/.aws/credentials` → campo `x_security_token_expires` |
| **nu-ist** | `~/dev/nu/.nu/tokens/ist/prod/before` |
| **nu-co** | `~/dev/nu/.nu/tokens/co/prod/before` |
| **nu** | `~/dev/nu/.nu/tokens/br/prod/before` |

- 🟢 **Verde** — válido (más de 1 hora)
- 🟡 **Amarillo** — expira en menos de 1 hora
- 🔴 **Rojo** — vencido, hay que renovar
- ⚫ **Gris** — archivo no encontrado

Se actualiza cada 60 segundos. El botón `↻` permite refrescar manualmente.

---

## Arquitectura

```
nu-it-dashboard/
├── src/
│   ├── main/           ← Proceso principal Electron (IPC, PTY, Sheets sync)
│   │   ├── index.ts    ← Ventana, handlers IPC, PTY allowlist, auto-updater
│   │   └── sheetsSync.ts ← Sincronización Google Sheets (inventario)
│   ├── preload/
│   │   └── index.ts    ← Bridge seguro renderer ↔ main (contextBridge)
│   └── renderer/
│       └── src/        ← React 18 + Tailwind (UI completa)
│           ├── App.tsx
│           ├── components/
│           │   └── sections/   ← Diagnostico, NuCLI, JAMF, Certificados, Yubikey, Inventario
│           └── hooks/
└── server/
    └── index.js        ← Express backend embebido (puerto 3001, solo localhost)
```

**Flujo de ejecución:**
1. Electron arranca `server/index.js` como proceso hijo
2. El backend genera un `SESSION_TOKEN` aleatorio y lo imprime en stdout
3. El proceso principal captura el token (nunca llega al renderer)
4. Los comandos se ejecutan vía PTY real (`node-pty`) con terminal completamente interactiva

---

## Seguridad

El proyecto pasó 7 rondas de auditoría de seguridad. Mitigaciones implementadas:

| Área | Mitigación |
|---|---|
| **PTY / Shell injection** | Allowlist de comandos, validación por segmento (`&&`, `\|\|`, `;`, `\|`), `shellEscape()`, sanitizadores por tipo (`safeEmail`, `safeSerial`, `safeTag`, `safeMotivo`...) |
| **Backend Express** | Bind exclusivo `127.0.0.1`, CORS solo localhost, `SESSION_TOKEN` por sesión vía `crypto.randomBytes`, rate limit 5 req/10 s |
| **Prototype pollution** | `Object.prototype.hasOwnProperty.call()`, filtro de keys `__proto__`/`constructor`/`prototype` |
| **Electron** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `setPermissionRequestHandler`, `will-navigate` y popups restringidos |
| **CSP** | `script-src 'self'`, `connect-src 'self'`, sin `unsafe-inline` en scripts, sin fuentes externas |
| **SSRF** | `isValidGoogleScriptUrl()` valida hostname + regex antes de llamadas a Google Sheets |
| **Auto-updater** | `autoDownload: false`, repositorio `nubank/nu-it-dashboard` |

---

## Desarrollo

```bash
# Clonar e instalar
git clone https://github.com/andresmedina23/nu-it-dashboard.git
cd nu-it-dashboard
npm install

# Iniciar en modo desarrollo (hot-reload)
npm run dev

# Si actualizas Electron o node-pty, recompilar:
npm run rebuild-pty
```

## Publicar nueva versión

1. Actualiza la versión en `package.json`
2. Haz commit y push
3. Ejecuta:

```bash
export GH_TOKEN=$(gh auth token)
npm run release
```

Genera el DMG para Apple Silicon (arm64) y lo publica en GitHub Releases. Los usuarios con la app instalada reciben notificación de actualización automáticamente.

Para empaquetar sin publicar (pruebas locales):

```bash
npm run pack
# → release/IT-Dashboard-X.X.X-arm64.dmg
```

---

## Stack

| Tecnología | Uso |
|---|---|
| Electron 41 | App de escritorio nativa macOS |
| React 18 + TypeScript | Interfaz de usuario |
| electron-vite | Build y hot-reload |
| Tailwind CSS | Estilos (paleta Nubank purple) |
| node-pty | Terminal PTY real (interactividad completa con CLIs) |
| Express | Backend embebido para comandos SSE |
| electron-updater | Auto-actualizaciones vía GitHub Releases |
| Google Sheets API | Sincronización opcional de inventario |
