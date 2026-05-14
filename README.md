# IT Dashboard — Nubank Colombia

App de escritorio para el equipo de IT Support de Nubank Colombia. Centraliza los comandos del CLI (`it`, `nu`, `nu-co`, `nu-ist`) en una interfaz visual con terminal real integrada.

**Versión:** `1.0.18` · **Autor:** @will

---

## Requisitos

- macOS (Apple Silicon o Intel)
- CLIs instalados y funcionando: `it`, `nu`, `nu-co`, `nu-ist`
- `~/.nurc` configurado
- Tokens activos (AWS + nu OAuth)

---

## Instalación

1. Descarga el `.dmg` desde [Releases](https://github.com/nubank/nu-it-dashboard/releases)
2. Abre el DMG y arrastra **IT Dashboard** a Aplicaciones
3. Primera vez: **clic derecho → Abrir** para aceptar en macOS

La app revisa actualizaciones al iniciar y avisa cuando hay una versión nueva disponible.

---

## Secciones

### Diagnóstico
Verifica CLIs (`it`, `nu`, `nu-co`, `nu-ist`, `git`, `brew`), autenticación (`nu auth`, `nu-co auth`) y SSH.

### NuCLI / AWS
| Tab | Comando |
|---|---|
| Refresh AWS | `nu-ist aws credentials refresh` |
| Login Completo | Actualiza `it`/`nu`/`nu-co`, renueva tokens AWS y OAuth |
| Toolio | `nu-co toolio add <email>` |

### JAMF
| Tab | Qué hace |
|---|---|
| Recovery Key | Obtiene llave de recuperación del disco |
| ZTD Enroll | Inscribe el equipo en Zero Touch Deployment |
| ZTD Remove | Remueve el equipo del ZTD |
| Admin Temporal | Permisos de admin local por tiempo limitado (default 60 min) |
| Unlock | Desbloquea un equipo bloqueado por MDM |

### Certificados
| Tab | Qué hace |
|---|---|
| Nubanker | Certificado Nubanker producción |
| Red + VLAN | Certificado de red con VLAN |
| Nubanker + Link | Certificado + enlace compartible |
| Red + Link | Certificado de red + enlace |
| Flujo Completo | Los 4 pasos anteriores en secuencia |

VLANs: Eng (10), Business (11), People (12), Finance (13), Board (14), Infosec (15), ITops (16), Xpeer (17), Rasp (23), Psec (26), Print (30), Zoom (31), Phone (32), Third (34).

### YubiKey
Configura YubiKey (`it yubikey configure`) y consulta scopes `nu` / `nu-co`.

### Inventario
| Tab | Qué hace |
|---|---|
| Checkout | Asigna activo a usuario |
| Checkin | Devuelve activo al inventario |
| Checkin + Update | Checkin y actualiza status en secuencia |
| Update Status | Cambia status de un activo |
| Update Múltiple | Cambia status de varios activos a la vez |
| Crear Usuario | Crea usuario en inventario |

> El asset tag acepta `FVFKDC8C1WFV` o `CO-FVFKDC8C1WFV` — el prefijo `CO-` se agrega automáticamente.

---

## Barra de estado

Muestra el estado de credenciales en tiempo real leyendo archivos locales (sin ejecutar comandos):

| Indicador | Fuente |
|---|---|
| AWS | `~/.aws/credentials` → `x_security_token_expires` |
| nu-ist | `~/dev/nu/.nu/tokens/ist/prod/before` |
| nu-co | `~/dev/nu/.nu/tokens/co/prod/before` |
| nu | `~/dev/nu/.nu/tokens/br/prod/before` |

🟢 Válido · 🟡 Expira pronto · 🔴 Vencido · ⚫ No encontrado · Se actualiza cada 60 s.

---

## Seguridad

- **PTY:** allowlist de comandos (`it`, `nu`, `nu-co`, `nu-ist`, etc.), validación por segmento (`&&`, `||`, `;`, `|`), límite 32 KB por script
- **Backend Express:** bind exclusivo `127.0.0.1:3001`, CORS solo localhost, `SESSION_TOKEN` por sesión (`crypto.randomBytes`), rate limit 5 req/10 s
- **Shell injection:** `shellEscape()` + sanitizadores por tipo (`safeEmail`, `safeSerial`, `safeTag`, `safeMotivo`, `safeVlan`, `safeTime`)
- **Electron:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP estricto (`script-src 'self'`), `will-navigate` y popups restringidos
- **SSRF:** validación hostname + regex antes de cualquier llamada a Google Sheets
- **Auto-updater:** `autoDownload: false`, repositorio `nubank/nu-it-dashboard`

---

## Desarrollo

```bash
cd ~/dev/nu-it-dashboard
npm install
npm run dev

# Si actualizas Electron o node-pty:
npm run rebuild-pty
```

## Publicar nueva versión

1. Actualiza la versión en `package.json`
2. Haz commit
3. Ejecuta:

```bash
export GH_TOKEN=$(gh auth token)
npm run release
```

Genera DMG para arm64 e x64 y lo publica en GitHub Releases. Para empaquetar sin publicar:

```bash
npm run pack
# release/IT-Dashboard-X.X.X-arm64.dmg
```

---

## Stack

Electron 41 · React 18 · TypeScript · electron-vite · Tailwind CSS · node-pty · electron-updater
