<p align="center">
  <img src="https://img.shields.io/badge/IT%20Dashboard-Nubank%20Colombia-820AD1?style=for-the-badge&labelColor=1C0035" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.19-820AD1?style=for-the-badge" />
  <img src="https://img.shields.io/badge/platform-Apple%20Silicon-lightgrey?style=for-the-badge&logo=apple" />
  <img src="https://img.shields.io/badge/electron-41-47848F?style=for-the-badge&logo=electron" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/security-audited-0DBA6A?style=for-the-badge&logo=shield" />
</p>

<p align="center">
  Herramienta interna de IT Support para Nubank Colombia.<br/>
  Centraliza los comandos de los CLIs corporativos en una interfaz visual con terminal real integrada.
</p>

---

## Tabla de contenidos

- [Instalación](#instalación)
- [Requisitos](#requisitos)
- [Funcionalidades](#funcionalidades)
- [Barra de estado](#barra-de-estado)
- [Arquitectura](#arquitectura)
- [Seguridad](#seguridad)
- [Desarrollo](#desarrollo)
- [Publicar una versión](#publicar-una-versión)
- [Stack tecnológico](#stack-tecnológico)

---

## Instalación

1. Descarga el instalador desde [**GitHub Releases**](https://github.com/andresmedina23/nu-it-dashboard/releases/latest):

   ```
   IT-Dashboard-1.0.19-arm64.dmg   →   Apple Silicon (M1 / M2 / M3 / M4)
   ```

2. Abre el `.dmg` y arrastra **IT Dashboard** a la carpeta **Aplicaciones**
3. Primera vez: **clic derecho → Abrir** para pasar el aviso de Gatekeeper
4. La app verifica actualizaciones automáticamente al iniciar

> Solo se distribuye para Apple Silicon. No hay versión Intel.

---

## Requisitos

| Requisito | Detalle |
|---|---|
| macOS | Apple Silicon — M1, M2, M3 o M4 |
| `it` | CLI de IT Engineering |
| `nu` / `nu-co` / `nu-ist` | CLIs de Nubank por entorno |
| `~/.nurc` | Archivo de configuración Nubank (sourcéado antes de cada comando) |
| Tokens activos | AWS + OAuth de nu vigentes |

---

## Funcionalidades

### Diagnóstico

Verifica el estado completo del entorno con un solo clic:

| Verificación | Detalle |
|---|---|
| CLIs disponibles | `it`, `nu`, `nu-co`, `nu-ist`, `git`, `brew` |
| Dependencias nucli | versión de `bash` (requiere 4+) y `gawk` |
| Autenticación | `nu auth whoami`, `nu-co auth whoami` |
| SSH | presencia de claves en `~/.ssh` |
| Versiones | `it --version`, `nu --version` |

También incluye acceso guiado para instalar **Homebrew**, **bash 5** y **gawk** si no están disponibles.

---

### NuCLI / AWS

| Tab | Descripción |
|---|---|
| **Refresh AWS** | Ejecuta `nu-ist aws credentials refresh` |
| **Login Completo** | Actualiza `it`, `nu` y `nu-co`; renueva tokens AWS y OAuth para todos los entornos |
| **Toolio** | Agrega un usuario a Toolio vía `nu-co toolio add` |

---

### JAMF

Gestión de equipos macOS vía número de serie.

| Tab | Descripción |
|---|---|
| **Recovery Key** | Obtiene la llave de recuperación del disco cifrado FileVault |
| **ZTD Enroll** | Inscribe el equipo en Zero Touch Deployment |
| **ZTD Remove** | Remueve el equipo del prestage de ZTD |
| **Admin Temporal** | Otorga permisos de administrador local por tiempo limitado (default: 60 min) |
| **Unlock** | Desbloquea un equipo bloqueado por MDM |

---

### Certificados

Generación de certificados Nubanker y de red para colaboradores.

| Tab | Descripción |
|---|---|
| **Nubanker (nu)** | Certificado Nubanker en producción |
| **Red + VLAN (nu)** | Certificado de red con VLAN seleccionada |
| **Nubanker + Link** | Certificado + enlace compartible |
| **Red + Link** | Certificado de red + enlace compartible |
| **Flujo Completo** | Los 4 pasos anteriores en secuencia automática |

<details>
<summary>VLANs disponibles</summary>

| ID | VLAN | ID | VLAN |
|---|---|---|---|
| 10 | Eng | 23 | Rasp |
| 11 | Business | 26 | Psec |
| 12 | People | 30 | Print |
| 13 | Finance | 31 | Zoom |
| 14 | Board | 32 | Phone |
| 15 | Infosec | 34 | Third |
| 16 | ITops | | |
| 17 | Xpeer | | |

</details>

---

### YubiKey

| Tab | Descripción |
|---|---|
| **Configurar** | Instala dependencias `brew`/`pip` y configura la YubiKey vía `it yubikey configure` |
| **Scopes nu-co** | Muestra los scopes del usuario en el entorno Colombia |
| **Scopes nu** | Muestra los scopes del usuario en el entorno Brasil |

---

### Inventario

Gestión de activos IT Colombia (Snipe-IT vía CLI `it`), con sincronización opcional a Google Sheets.

| Tab | Descripción |
|---|---|
| **Checkout** | Asigna un activo a un usuario |
| **Checkin** | Devuelve un activo al inventario |
| **Checkin + Update** | Checkin y actualiza el estado en una sola operación |
| **Update Status** | Cambia el estado de un activo individual |
| **Update Múltiple** | Cambia el estado de varios activos simultáneamente (uno por línea) |
| **Crear Usuario** | Crea un usuario nuevo en el inventario |

> El asset tag acepta `FVFKDC8C1WFV` o `CO-FVFKDC8C1WFV` — el prefijo `CO-` se agrega automáticamente.

<details>
<summary>Estados de inventario disponibles</summary>

| # | Estado | # | Estado |
|---|---|---|---|
| 1 | Ready to Return | 7 | Lost |
| 2 | Retired | 8 | Donated |
| 3 | Ready to Disposed | 9 | Stolen |
| 4 | Assessment | 10 | Maintenance |
| 5 | In Transit | 11 | In Stock |
| 6 | In Use | | |

</details>

---

## Barra de estado

La barra superior muestra el estado de credenciales en tiempo real. Lee archivos locales directamente, sin ejecutar ningún comando.

| Indicador | Fuente |
|---|---|
| **AWS** | `~/.aws/credentials` → campo `x_security_token_expires` |
| **nu-ist** | `~/dev/nu/.nu/tokens/ist/prod/before` |
| **nu-co** | `~/dev/nu/.nu/tokens/co/prod/before` |
| **nu** | `~/dev/nu/.nu/tokens/br/prod/before` |

| Color | Significado |
|---|---|
| 🟢 Verde | Token válido — más de 1 hora restante |
| 🟡 Amarillo | Expira en menos de 1 hora |
| 🔴 Rojo | Token vencido — renovar credenciales |
| ⚫ Gris | Archivo no encontrado |

Se actualiza cada 60 segundos. El botón `↻` permite refrescar manualmente.

---

## Arquitectura

```
nu-it-dashboard/
├── src/
│   ├── main/
│   │   ├── index.ts          ← Proceso principal: ventana, IPC, PTY, auto-updater
│   │   └── sheetsSync.ts     ← Sincronización Google Sheets (inventario)
│   ├── preload/
│   │   └── index.ts          ← Bridge seguro renderer ↔ main (contextBridge)
│   └── renderer/
│       └── src/              ← React 18 + Tailwind CSS
│           ├── App.tsx
│           ├── components/
│           │   └── sections/ ← Diagnostico, NuCLI, JAMF, Certificados, Yubikey, Inventario
│           └── hooks/
├── server/
│   └── index.js              ← Express embebido (127.0.0.1:3001, autenticado por token)
└── build/
    └── entitlements.mac.plist ← Entitlements mínimos para macOS
```

**Flujo de ejecución:**

```
Electron (main)
  └── spawn → server/index.js (proceso hijo)
                └── genera SESSION_TOKEN → stdout
  └── captura SESSION_TOKEN (nunca llega al renderer)
  └── crea BrowserWindow → carga renderer
        └── IPC (contextBridge) → main process
              └── node-pty → shell real con PTY interactivo
```

---

## Seguridad

La aplicación fue sometida a múltiples rondas de auditoría de seguridad. A continuación se documentan las mitigaciones implementadas por área.

### Modelo de amenazas

- **Renderer comprometido** → no puede ejecutar comandos arbitrarios ni acceder a APIs de Node directamente
- **Proceso externo en la red** → no puede alcanzar el backend Express (bind exclusivo a `127.0.0.1`)
- **HTML malicioso local** → no puede consultar el backend (CORS restringido a `localhost` HTTP/S, `file://` bloqueado)
- **Inyección de shell** → bloqueada por allowlist, sanitizadores de parámetros y comillas simples en todos los scripts

### Controles implementados

| Área | Control |
|---|---|
| **Single instance** | `app.requestSingleInstanceLock()` — previene ventanas infinitas al relanzar |
| **PTY / Shell injection** | Allowlist de comandos (`ALLOWED_COMMANDS`), validación por segmento (`&&`, `\|\|`, `;`, `\|`), bloqueo de `source`/`.`, rechazo de path traversal (`/`, `..`) |
| **Sanitización de parámetros** | `safeEmail`, `safeSerial`, `safeTag`, `safeMotivo`, `safeUser`, `safeTime` aplicados en renderer y backend |
| **Comillas en scripts** | Todos los argumentos de usuario se envuelven en comillas simples — previene expansión `$()` y backticks |
| **Rate limiting IPC** | Máximo 10 llamadas PTY por segundo |
| **Backend Express** | Bind exclusivo `127.0.0.1`, CORS solo `localhost`, `SESSION_TOKEN` aleatorio por sesión (`crypto.randomBytes(32)`), token exclusivo por header `x-session-token` |
| **Prototype pollution** | `Object.prototype.hasOwnProperty.call()`, filtro de keys `__proto__`/`constructor`/`prototype` |
| **Electron hardening** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `setPermissionRequestHandler`, `will-navigate` y `setWindowOpenHandler` restringidos |
| **CSP** | `script-src 'self'`, `connect-src 'self'`, sin `unsafe-inline`, sin fuentes externas |
| **ATS / Transport Security** | `NSAllowsArbitraryLoads: false` — solo `localhost` HTTP permitido, resto requiere HTTPS |
| **SSRF** | `isValidGoogleScriptUrl()` valida hostname y regex antes de cualquier llamada a Google Sheets |
| **Google Sign-In** | Navegación restringida a `*.google.com`, `targetUrl` validado con `isValidGoogleScriptUrl()` antes de `loadURL` |
| **Auto-updater** | `autoDownload: false` — requiere confirmación del usuario antes de descargar |

---

## Desarrollo

### Requisitos previos

- Node.js 20+
- npm 10+
- macOS con Apple Silicon

### Configuración inicial

```bash
git clone https://github.com/andresmedina23/nu-it-dashboard.git
cd nu-it-dashboard
npm install
```

### Iniciar en modo desarrollo

```bash
npm run dev
```

La app se abre con hot-reload activado. Los cambios en el renderer se reflejan instantáneamente.

### Recompilar `node-pty`

Necesario al actualizar Electron o la versión de Node:

```bash
npm run rebuild-pty
npm run dev
```

---

## Publicar una versión

1. Actualiza `version` en `package.json`
2. Haz commit y push de los cambios
3. Ejecuta:

```bash
export GH_TOKEN=$(gh auth token)
npm run release
```

Genera `IT-Dashboard-X.X.X-arm64.dmg` y lo publica en GitHub Releases.
Los usuarios con la app instalada reciben una notificación de actualización al iniciar la app.

Para generar el DMG localmente sin publicar:

```bash
npm run pack
# → release/IT-Dashboard-X.X.X-arm64.dmg
```

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Electron | 41 | Runtime de escritorio nativo para macOS |
| React | 18 | Interfaz de usuario |
| TypeScript | 5 | Tipado estático en main, preload y renderer |
| electron-vite | 5 | Build tooling y hot-reload |
| Tailwind CSS | 3 | Estilos con paleta corporativa Nubank |
| node-pty | 1.1 | Terminal PTY real — interactividad completa con CLIs |
| Express | 4 | Backend embebido para ejecución de comandos |
| electron-updater | 6 | Auto-actualizaciones vía GitHub Releases |
| Google Sheets API | — | Sincronización opcional de inventario (Apps Script) |

---

<p align="center">
  <sub>Desarrollado por el equipo de IT Support · Nubank Colombia</sub>
</p>
