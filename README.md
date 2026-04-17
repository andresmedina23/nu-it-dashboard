# IT Dashboard — Nubank Colombia

App de escritorio para el equipo de IT Colombia. Centraliza los comandos del CLI `it` y `nu` en una interfaz gráfica con terminal integrada.

Hecho por **@will**

---

## Qué hace

- Corre comandos del CLI `it` y `nu` con un click, sin tener que escribirlos en terminal
- Terminal integrada con PTY real (soporta prompts interactivos, y/n, listas numeradas)
- Auto-responde prompts del CLI automáticamente (ubicación, status, etc.)
- Muestra el estado de tus tokens AWS y nu en tiempo real sin correr comandos
- Detecta si los comandos del CLI cambiaron o están desactualizados

---

## Requisitos

Antes de instalar, asegúrate de tener:

- macOS (Apple Silicon o Intel)
- Los CLIs de Nubank instalados y funcionando:
  - `it` — CLI de IT Engineering
  - `nu`, `nu-co`, `nu-ist` — CLIs por entorno
- `~/.nurc` configurado (la app lo sourcéa antes de cada comando)
- Tokens vigentes (AWS + nu OAuth)

---

## Instalación

1. Descarga el archivo `.dmg` desde [Releases](https://github.com/andresmedina23/nu-it-dashboard/releases)
2. Abre el DMG y arrastra **IT Dashboard** a tu carpeta de Aplicaciones
3. La primera vez que abras la app, macOS puede bloquearla — haz **clic derecho → Abrir** para aceptarla
4. Listo

---

## Actualizaciones

La app revisa si hay una versión nueva cada vez que la abres. Si hay una actualización disponible, te avisa y la descarga en segundo plano. Cuando está lista, puedes reiniciar para instalarla.

---

## Secciones

### Diagnóstico
Verifica el estado del sistema con un click. Revisa:
- CLIs disponibles: `it`, `nu`, `nu-co`, `nu-ist`, `git`, `brew`
- Autenticación: `nu auth whoami`, `nu-co auth whoami`
- SSH: presencia de claves en `~/.ssh`
- Versiones de `it` y `nu`

---

### Nucli / AWS
Renovación de credenciales y tokens.

| Tab | Qué hace |
|-----|----------|
| **Refresh AWS** | `nu-ist aws credentials refresh` |
| **Login Completo** | Actualiza `it` y `nu`, renueva tokens AWS y OAuth para `nu` y `nu-co` |
| **Toolio** | Agrega un empleado a Toolio (`nu-co toolio add Nombre Apellido`) |

---

### JAMF
Gestión de equipos macOS por número de serie.

| Tab | Qué hace |
|-----|----------|
| **Recovery Key** | Obtiene la llave de recuperación del disco |
| **ZTD Enroll** | Inscribe el equipo en Zero Touch Deployment |
| **ZTD Remove** | Remueve el equipo del ZTD |
| **Admin Temporal** | Da permisos de administrador local por tiempo limitado (default 60 min) |
| **Unlock** | Desbloquea un equipo bloqueado por MDM |

---

### Certificados
Generación de certificados de red y Nubanker.

| Tab | Qué hace |
|-----|----------|
| **Nubanker** | Genera certificado Nubanker en producción |
| **Red + VLAN** | Genera certificado de red con VLAN seleccionada |
| **Nubanker + Link** | Genera certificado y enlace para compartir |
| **Red + Link** | Genera certificado de red y enlace |
| **Flujo Completo** | Ejecuta los 4 pasos anteriores en secuencia |

VLANs disponibles: Eng (10), Business (11), People (12), Finance (13), Board (14), Infosec (15), ITops (16), Xpeer (17), Rasp (23), Psec (26), Print (30), Zoom (31), Phone (32), Third (34).

---

### Yubikey
Configuración de Yubikeys y consulta de scopes.

| Tab | Qué hace |
|-----|----------|
| **Configurar Yubikey** | Instala dependencias y configura la Yubikey para el usuario |
| **Scopes nu-co** | Muestra los scopes del usuario en nu-co |
| **Scopes nu** | Muestra los scopes del usuario en nu |

---

### Inventario
Gestión de activos IT — Colombia. Usa Snipe-IT via el CLI `it`.

| Tab | Qué hace |
|-----|----------|
| **Checkout** | Asigna un activo a un usuario |
| **Checkin** | Devuelve un activo al inventario |
| **Checkin + Update** | Hace checkin y actualiza el status en secuencia |
| **Update Status** | Cambia el status de un activo individual |
| **Update Múltiple** | Cambia el status de varios activos a la vez |
| **Crear Usuario** | Crea un usuario nuevo en el inventario |

**Tips:**
- El username acepta `sou.goku` o `sou.goku@nubank.com.br` — se normaliza automáticamente
- El asset tag acepta `FVFKDC8C1WFV` o `CO-FVFKDC8C1WFV` — el prefijo `CO-` se agrega solo
- La app responde automáticamente a los prompts de ubicación y status del CLI

**Estados disponibles en inventario:**

| # | Estado |
|---|--------|
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

**Ubicaciones Colombia:**

| # | Ubicación |
|---|-----------|
| 40 | COL-HQ1-03 |

---

## Barra de estado (tokens)

La barra superior muestra el estado de tus credenciales en tiempo real, leyendo los archivos locales sin ejecutar ningún comando:

| Indicador | Fuente |
|-----------|--------|
| **AWS** | `~/.aws/credentials` → campo `x_security_token_expires` |
| **nu-ist** | `~/dev/nu/.nu/tokens/ist/prod/before` |
| **nu-co** | `~/dev/nu/.nu/tokens/co/prod/before` |
| **nu** | `~/dev/nu/.nu/tokens/br/prod/before` |

- 🟢 **Verde** — token válido (más de 1 hora)
- 🟡 **Amarillo** — expira en menos de 1 hora
- 🔴 **Rojo** — token vencido, hay que renovar
- ⚫ **Gris** — archivo no encontrado

Se actualiza automáticamente cada 60 segundos. El botón `↻` permite refrescar manualmente.

---

## Stack técnico

- **Electron 41** — app de escritorio nativa macOS
- **React 18 + TypeScript** — interfaz de usuario
- **electron-vite** — build y hot-reload en desarrollo
- **Tailwind CSS** — estilos con paleta Nubank
- **node-pty** — terminal PTY real (permite interactividad completa con el CLI)
- **electron-updater** — auto-actualizaciones via GitHub Releases

---

## Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo (con hot-reload)
npm run dev

# Si instalas una versión nueva de Electron, recompila node-pty
npm run rebuild-pty
```

---

## Publicar una nueva versión

1. Actualiza la versión en `package.json` (ej: `1.0.0` → `1.1.0`)
2. Haz commit de los cambios
3. Publica:

```bash
export GH_TOKEN=$(gh auth token)
npm run release
```

Esto compila la app, genera el DMG para Apple Silicon y Intel, y lo publica en GitHub Releases. Los usuarios que ya tienen la app recibirán la notificación de actualización automáticamente.

Para generar el DMG sin publicar (para pruebas):

```bash
npm run pack
# El DMG queda en: release/IT Dashboard-X.X.X-arm64.dmg
```
