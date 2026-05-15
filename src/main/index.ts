import { app, BrowserWindow, ipcMain, shell, dialog, Menu, session } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import * as os from 'os'
import * as fs from 'fs'
import * as pty from 'node-pty'
import { autoUpdater } from 'electron-updater'
import * as sheetsSync from './sheetsSync'

// ─── Window ────────────────────────────────────────────────
let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0F001E',
    ...(process.platform === 'darwin' ? { vibrancy: 'under-window', visualEffectState: 'active' } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // VUL-08: CSP via webRequest — solo en producción (en dev Vite necesita unsafe-eval)
  if (!process.env['ELECTRON_RENDERER_URL']) {
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3001"
          ]
        }
      })
    })
  }

  // Bloquea permisos no necesarios (micrófono, cámara, notificaciones, etc.)
  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    const ALLOWED_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write'])
    callback(ALLOWED_PERMISSIONS.has(permission))
  })

  // Bloquea navegación fuera del renderer local
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = process.env['ELECTRON_RENDERER_URL'] ?? `file://${join(__dirname, '../renderer/')}`
    if (!url.startsWith(allowed)) {
      event.preventDefault()
    }
  })

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── Auto-updater ───────────────────────────────────────────
let isManualUpdateCheck = false
let updateReadyToInstall = false

autoUpdater.autoDownload = false  // requiere confirmación del usuario antes de descargar
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.logger = null // evitar logs que confunden

autoUpdater.on('update-available', (info) => {
  isManualUpdateCheck = false // ya no es manual — el proceso continúa solo
  dialog.showMessageBox({
    type: 'info',
    title: '¡Actualización disponible!',
    message: `IT Dashboard ${info.version} está disponible`,
    detail: 'Descargando en segundo plano... Te avisamos cuando esté lista.',
    buttons: ['OK'],
  })
})

autoUpdater.on('update-downloaded', (info) => {
  updateReadyToInstall = true
  isManualUpdateCheck = false
  dialog.showMessageBox({
    type: 'info',
    title: '¡Actualización lista!',
    message: `IT Dashboard ${info.version} descargado.`,
    detail: 'Cierra la app y vuelve a abrirla para instalar la nueva versión.\n\nO descarga el instalador manualmente desde GitHub.',
    buttons: ['Reiniciar ahora', 'Descargar desde GitHub', 'Más tarde'],
  }).then(({ response }) => {
    if (response === 0) {
      // Intento 1: quitAndInstall estándar
      try {
        autoUpdater.quitAndInstall(true, true)
      } catch (_) {}
      // Intento 2: relaunch + exit (funciona aunque quitAndInstall falle)
      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 500)
    } else if (response === 1) {
      shell.openExternal('https://github.com/andresmedina23/nu-it-dashboard/releases/latest')
    }
  })
})

autoUpdater.on('update-not-available', () => {
  if (isManualUpdateCheck) {
    isManualUpdateCheck = false
    dialog.showMessageBox({
      type: 'info',
      title: 'Sin actualizaciones',
      message: `IT Dashboard ${app.getVersion()} es la versión más reciente.`,
      buttons: ['OK'],
    })
  }
})

autoUpdater.on('error', (err) => {
  // No mostrar error si ya descargamos la actualización exitosamente
  if (updateReadyToInstall) return
  if (isManualUpdateCheck) {
    isManualUpdateCheck = false
    dialog.showMessageBox({
      type: 'warning',
      title: 'No se pudo actualizar',
      message: 'Hubo un error al descargar la actualización.',
      detail: `Descarga la última versión manualmente desde GitHub.\n\nDetalle: ${err?.message ?? String(err)}`,
      buttons: ['Abrir GitHub', 'Cerrar'],
    }).then(({ response: btn }) => {
      if (btn === 0) shell.openExternal('https://github.com/andresmedina23/nu-it-dashboard/releases/latest')
    })
  }
})

function checkForUpdates(manual = false) {
  isManualUpdateCheck = manual
  updateReadyToInstall = false
  autoUpdater.checkForUpdates().catch(() => {
    if (manual) {
      isManualUpdateCheck = false
      dialog.showMessageBox({
        type: 'warning',
        title: 'Sin conexión',
        message: 'No se pudo verificar actualizaciones.',
        detail: 'Verifica tu conexión a internet e intenta de nuevo.',
        buttons: ['OK'],
      })
    }
  })
}

// ─── Menú ────────────────────────────────────────────────────
function buildMenu() {
  const isProd = !process.env['ELECTRON_RENDERER_URL']
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { label: `IT Dashboard v${app.getVersion()}`, enabled: false },
        { type: 'separator' },
        {
          label: 'Buscar actualizaciones...',
          click: () => {
            if (isProd) {
              checkForUpdates(true)
            } else {
              dialog.showMessageBox({ type: 'info', title: 'Dev mode', message: 'Verificación de updates solo funciona en producción.', buttons: ['OK'] })
            }
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Cerrar IT Dashboard' },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        { type: 'separator' },
        { role: 'front', label: 'Traer al frente' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ─── Servidor Express embebido (server/index.js) ─────────────
let serverToken: string | null = null
let serverProc: ReturnType<typeof spawn> | null = null

function startEmbeddedServer() {
  const serverPath = join(__dirname, '../../server/index.js')
  if (!fs.existsSync(serverPath)) return

  // VUL-06: token generado aquí y pasado por env var — nunca por stdout
  const token = require('crypto').randomBytes(32).toString('hex')
  serverToken = token

  serverProc = spawn(process.execPath, [serverPath], {
    env: { ...process.env, SESSION_TOKEN: token },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  // stdout ya no lleva el token — solo se loguea para debug
  serverProc.stdout?.on('data', (_chunk: Buffer) => { /* no-op */ })

  serverProc.on('exit', (code) => {
    console.log(`[server] proceso terminó con código ${code}`)
    serverProc = null
    serverToken = null
  })
}

// ─── Single instance lock ───────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    startEmbeddedServer()
    createWindow()
    buildMenu()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    // Verificar actualizaciones al iniciar (solo producción)
    if (!process.env['ELECTRON_RENDERER_URL']) {
      setTimeout(() => checkForUpdates(false), 5000)
    }
  })
}

app.on('window-all-closed', () => {
  serverProc?.kill()
  if (process.platform !== 'darwin') app.quit()
})

// ─── PTY Sessions ──────────────────────────────────────────
const ptyMap = new Map<string, pty.IPty>()

// PATH robusto: incluye Homebrew (Apple Silicon + Intel) y paths comunes
function buildPtyEnv() {
  const home = os.homedir()
  const extraPaths = [
    `${home}/.local/bin`,
    `${home}/bin`,
    // Nubank CLIs — rutas estándar del equipo
    `${home}/dev/nu/it-engineering/itcli`,
    `${home}/dev/nu/nucli`,
    `${home}/dev/nu/ios-cli`,
    `${home}/dev/nu/go/bin`,
    `${home}/.local/node/bin`,
    `${home}/.pyenv/shims`,
    `${home}/.pyenv/bin`,
    '/opt/homebrew/bin',        // Homebrew Apple Silicon
    '/opt/homebrew/sbin',
    '/usr/local/bin',           // Homebrew Intel + herramientas comunes
    '/usr/local/sbin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ]
  const currentPath = process.env.PATH || ''
  // Combinar: paths extra primero, luego el PATH del proceso (sin duplicados)
  const seen = new Set<string>()
  const merged = [...extraPaths, ...currentPath.split(':')]
    .filter(p => p && !seen.has(p) && seen.add(p))
    .join(':')
  return { ...process.env, PATH: merged, TERM: 'xterm-256color', FORCE_COLOR: '1' }
}

// Busca el archivo ~/.nurc — valida que esté dentro del home y sin caracteres especiales
function findNurc(): string {
  const home = os.homedir()
  const candidates = [
    join(home, '.nurc'),
    join(home, '.nurc.backup'),
  ]
  const found = candidates.find(p => {
    try { fs.accessSync(p); return true } catch { return false }
  }) ?? candidates[0]

  // Seguridad: asegura que el path esté dentro del home y no tenga chars problemáticos en shell
  if (!found.startsWith(home) || /[`$\\!;|&<>]/.test(found)) {
    return join(home, '.nurc')  // fallback seguro
  }
  return found
}

// ─── Credential Status ──────────────────────────────────────
type TokenStatus = { expires: string; status: 'ok' | 'warn' | 'expired' | 'missing' }

function calcStatus(expires: Date): 'ok' | 'warn' | 'expired' {
  const diffMs = expires.getTime() - Date.now()
  if (diffMs < 0) return 'expired'
  if (diffMs < 3_600_000) return 'warn'
  return 'ok'
}

function parseCredentialStatus(): Record<string, TokenStatus> {
  const results: Record<string, TokenStatus> = {}

  // ── AWS ─────────────────────────────────────────────────
  try {
    const raw = fs.readFileSync(join(os.homedir(), '.aws', 'credentials'), 'utf-8')
    const sections = raw.split(/\[([^\]]+)\]/).filter(Boolean)
    let currentProfile = ''
    for (const chunk of sections) {
      if (!chunk.includes('=')) { currentProfile = chunk.trim(); continue }
      const m = chunk.match(/x_security_token_expires\s*=\s*(.+)/)
      if (currentProfile && m) {
        const expires = new Date(m[1].trim())
        results[`aws:${currentProfile}`] = { expires: expires.toISOString(), status: calcStatus(expires) }
      }
    }
  } catch (_) { /* no credentials file */ }

  // ── nu OAuth tokens — busca en múltiples ubicaciones posibles ──
  const home = os.homedir()
  const tokenBaseCandidates = [
    join(home, 'dev', 'nu', '.nu', 'tokens'),       // ubicación estándar
    join(home, 'projects', 'nu', '.nu', 'tokens'),
    join(home, 'workspace', 'nu', '.nu', 'tokens'),
    join(home, '.nu', 'tokens'),                    // sin subcarpeta dev
  ]

  const nuTokenBase = tokenBaseCandidates.find(p => {
    try { fs.accessSync(p); return true } catch { return false }
  })

  const nuEnvs = [
    { key: 'nu:ist/prod', sub: join('ist', 'prod', 'before') },
    { key: 'nu:co/prod',  sub: join('co', 'prod', 'before') },
    { key: 'nu:br/prod',  sub: join('br', 'prod', 'before') },
  ]

  for (const { key, sub } of nuEnvs) {
    const tokenPath = nuTokenBase ? join(nuTokenBase, sub) : null
    try {
      if (!tokenPath) throw new Error('not found')
      const raw = fs.readFileSync(tokenPath, 'utf-8').trim()
      const expires = new Date(raw)
      results[key] = { expires: expires.toISOString(), status: calcStatus(expires) }
    } catch (_) {
      results[key] = { expires: '', status: 'missing' }
    }
  }

  return results
}

// ─── Command Discovery ──────────────────────────────────────
async function discoverCommands(): Promise<Record<string, string[]>> {
  const nurcPath = findNurc()
  const shellPath = process.env.SHELL || '/bin/zsh'

  const run = (cmd: string): Promise<string> =>
    new Promise((resolve) => {
      let out = ''
      const p = spawn(shellPath, ['-c', `source "${nurcPath}" 2>/dev/null || true; ${cmd}`], {
        env: buildPtyEnv(),
      })
      p.stdout?.on('data', (d) => (out += d))
      p.stderr?.on('data', (d) => (out += d))
      p.on('close', () => resolve(out))
      p.on('error', () => resolve(''))
      setTimeout(() => { try { p.kill() } catch (_) {} ; resolve(out) }, 5000)
    })

  const [itOut, nuOut] = await Promise.all([
    run('it --available-commands 2>&1'),
    run('nu --available-commands 2>&1'),
  ])

  const parseTree = (raw: string) =>
    raw.split('\n').map(l => l.replace(/[|\\-]/g, '').trim()).filter(l => l.length > 0 && !l.startsWith('#'))

  return { it: parseTree(itOut), nu: parseTree(nuOut) }
}

// ─── Allowlist de comandos permitidos ──────────────────────
const ALLOWED_COMMANDS = /^(it|nu|nu-ist|nu-co|jamf|security|networksetup|system_profiler|diskutil|softwareupdate|defaults|scutil|sw_vers|uname|whoami|id|hostname|uptime|df|du|top|ps|netstat|ping|traceroute|nslookup|dig|curl|brew|pip3?|python3?|node|npm|git|ssh|openssl|certutil|security)$/

// ─── IPC Handlers ──────────────────────────────────────────
ipcMain.handle('creds:status', () => parseCredentialStatus())
ipcMain.handle('cli:discover', () => discoverCommands())

// Rate limiter IPC: máximo 10 llamadas por segundo por sesión
const ptyStartTimes: number[] = []
function ptyRateAllow(): boolean {
  const now = Date.now()
  while (ptyStartTimes.length && ptyStartTimes[0] < now - 1000) ptyStartTimes.shift()
  if (ptyStartTimes.length >= 10) return false
  ptyStartTimes.push(now)
  return true
}

ipcMain.handle('pty:start', (_event, { id, command, args }: { id: string; command: string; args: string[] }) => {
  if (!ptyRateAllow()) return false

  // Rechazar si command contiene separadores de path (path traversal)
  if (typeof command !== 'string' || command.includes('/') || command.includes('..')) return false
  if (!ALLOWED_COMMANDS.test(command)) return false
  if (!Array.isArray(args) || args.some(a => typeof a !== 'string')) return false

  const existing = ptyMap.get(id)
  if (existing) { try { existing.kill() } catch (_) {} ; ptyMap.delete(id) }

  const nurcPath = findNurc()
  const shellPath = process.env.SHELL || '/bin/zsh'
  // command ya validado contra allowlist — se pasa entre comillas simples para evitar expansión
  const quotedCmd = `'${command}'`
  const cmdStr = `source "${nurcPath}" 2>/dev/null || true\n${quotedCmd} ${args.map(a => `'${a.replace(/'/g, "'\\''")}'`).join(' ')}`

  const term = pty.spawn(shellPath, ['-c', cmdStr], {
    name: 'xterm-256color', cols: 120, rows: 40, cwd: os.homedir(), env: buildPtyEnv(),
  })
  ptyMap.set(id, term)
  term.onData((data) => { win?.webContents.send(`pty:data:${id}`, data) })
  term.onExit(({ exitCode }) => { win?.webContents.send(`pty:exit:${id}`, exitCode); ptyMap.delete(id) })
  return true
})

// Valida que cada segmento de comando (separado por &&, ||, ;, |) use comandos permitidos
function isScriptSafe(script: string): boolean {
  // 'source' eliminado del SKIP — era un bypass crítico que permitía RCE desde renderer
  const SKIP = /^(echo|printf|export|:|true|false|for|if|fi|then|else|elif|do|done|while|case|esac|read)(\s|$)/
  const lines = script.split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    // Bloquear 'source' y '.' explícitamente (evita cargar scripts arbitrarios)
    if (/^(source|\.)(\s|$)/.test(line)) return false
    // Dividir por operadores de control para validar cada segmento individualmente
    const segments = line.split(/&&|\|\||;|\|/)
    for (const seg of segments) {
      const token = seg.trim()
      if (!token || SKIP.test(token)) continue
      // Rechazar path traversal en cada segmento
      const cmdToken = token.split(/\s+/)[0]
      if (cmdToken.includes('/') || cmdToken.includes('..')) return false
      const baseCmd = cmdToken.split('/').pop() ?? ''
      if (!ALLOWED_COMMANDS.test(baseCmd)) return false
    }
  }
  return true
}

ipcMain.handle('pty:script', (_event, { id, script }: { id: string; script: string }) => {
  if (!ptyRateAllow()) return false   // VUL-05: rate limit igual que pty:start
  if (typeof script !== 'string' || script.length > 32_000) return false
  if (!isScriptSafe(script)) return false

  const existing = ptyMap.get(id)
  if (existing) { try { existing.kill() } catch (_) {} ; ptyMap.delete(id) }

  const nurcPath = findNurc()
  const shellPath = process.env.SHELL || '/bin/zsh'
  const fullScript = `source "${nurcPath}" 2>/dev/null || true\n${script}`

  const term = pty.spawn(shellPath, ['-c', fullScript], {
    name: 'xterm-256color', cols: 120, rows: 40, cwd: os.homedir(), env: buildPtyEnv(),
  })
  ptyMap.set(id, term)
  term.onData((data) => { win?.webContents.send(`pty:data:${id}`, data) })
  term.onExit(({ exitCode }) => { win?.webContents.send(`pty:exit:${id}`, exitCode); ptyMap.delete(id) })
  return true
})

ipcMain.on('pty:input', (_, { id, data }: { id: string; data: string }) => {
  if (typeof data !== 'string' || data.length > 4096) return
  ptyMap.get(id)?.write(data)
})
ipcMain.on('pty:kill', (_, id: string) => {
  const term = ptyMap.get(id)
  if (term) { try { term.kill() } catch (_) {} ; ptyMap.delete(id) }
})
ipcMain.on('pty:resize', (_, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
  if (typeof cols !== 'number' || typeof rows !== 'number') return
  if (cols < 10 || cols > 500 || rows < 5 || rows > 300) return
  ptyMap.get(id)?.resize(cols, rows)
})
const ALLOWED_EXTERNAL = /^https:\/\/(github\.com|nubank\.com)\//
ipcMain.on('shell:open', (_, url: string) => {
  if (typeof url === 'string' && ALLOWED_EXTERNAL.test(url)) {
    shell.openExternal(url)
  }
})

// ─── Google Sheets Sync ─────────────────────────────────────
ipcMain.handle('sheets:config:get', () => sheetsSync.getConfig())

ipcMain.handle('sheets:config:set', (_event, cfg: Partial<sheetsSync.SheetsConfig>) => {
  return sheetsSync.saveConfig(cfg)
})

ipcMain.handle('sheets:start', () => {
  const config = sheetsSync.getConfig()
  if (win) sheetsSync.startSync(config, win)
  return config
})

ipcMain.on('sheets:stop', () => sheetsSync.stopSync())

ipcMain.handle('sheets:update', (_event, payload: sheetsSync.UpdatePayload) => {
  const config = sheetsSync.getConfig()
  return sheetsSync.updateSheet(config, payload)
})

ipcMain.handle('sheets:connection:check', (_event, webAppUrl: string) => {
  return sheetsSync.checkConnection(webAppUrl)
})

ipcMain.handle('sheets:query', async (_event, serial: string) => {
  const config = sheetsSync.getConfig()
  if (!config.webAppUrl || !sheetsSync.isValidGoogleScriptUrl(config.webAppUrl)) return { ok: false, error: 'invalid_url' }
  try {
    const url = `${config.webAppUrl}?serial=${encodeURIComponent(serial)}`
    const res = await session.defaultSession.fetch(url)
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    return res.json()
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('sheets:signin', async () => {
  if (!win) return
  // Cargamos la URL del Apps Script directamente en la ventana de auth.
  // Si no hay sesión, Google redirige al login; al terminar, redirige de vuelta
  // y quedan las cookies de Workspace en session.defaultSession.
  const config = sheetsSync.getConfig()
  const targetUrl = config.webAppUrl || undefined
  try { await sheetsSync.openGoogleSignIn(win, targetUrl) } catch { /* ventana cerrada */ }
})
