import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import * as os from 'os'
import * as fs from 'fs'
import * as pty from 'node-pty'
import { autoUpdater } from 'electron-updater'

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
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

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
              autoUpdater['_manualCheck'] = true
              autoUpdater.checkForUpdates()
            } else {
              dialog.showMessageBox({ type: 'info', title: 'Dev mode', message: 'Auto-updater solo funciona en producción.', buttons: ['OK'] })
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

app.whenReady().then(() => {
  createWindow()
  buildMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Auto-updater — solo en producción
  if (!process.env['ELECTRON_RENDERER_URL']) {
    autoUpdater.checkForUpdates()

    autoUpdater.on('update-available', ({ version }) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Actualización disponible',
        message: `Nueva versión ${version} disponible`,
        detail: 'Se descargará en segundo plano. Te avisaremos cuando esté lista.',
        buttons: ['OK'],
      })
    })

    autoUpdater.on('update-not-available', () => {
      // Solo mostrar si el usuario lo pidió manualmente (via menú)
      if (autoUpdater['_manualCheck']) {
        autoUpdater['_manualCheck'] = false
        dialog.showMessageBox({
          type: 'info',
          title: 'Sin actualizaciones',
          message: 'Ya tienes la versión más reciente.',
          buttons: ['OK'],
        })
      }
    })

    autoUpdater.on('update-downloaded', ({ version }) => {
      dialog.showMessageBox({
        type: 'info',
        title: '¡Actualización lista!',
        message: `IT Dashboard ${version} está listo para instalar`,
        detail: 'La app se reiniciará para aplicar la actualización.',
        buttons: ['Reiniciar ahora', 'Más tarde'],
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── PTY Sessions ──────────────────────────────────────────
const ptyMap = new Map<string, pty.IPty>()

// ─── Credential Status (no commands needed) ─────────────────
type TokenStatus = { expires: string; status: 'ok' | 'warn' | 'expired' | 'missing' }

function calcStatus(expires: Date): 'ok' | 'warn' | 'expired' {
  const diffMs = expires.getTime() - Date.now()
  if (diffMs < 0) return 'expired'
  if (diffMs < 3_600_000) return 'warn'   // < 1 hour
  return 'ok'
}

function parseCredentialStatus(): Record<string, TokenStatus> {
  const results: Record<string, TokenStatus> = {}

  // ── AWS credentials ───────────────────────────────────────
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
  } catch (_) { /* no aws credentials file */ }

  // ── nu OAuth tokens (~/.nu/tokens/<env>/<stage>/before) ───
  const nuTokenBase = join(os.homedir(), 'dev', 'nu', '.nu', 'tokens')
  const nuEnvs: Array<{ key: string; path: string }> = [
    { key: 'nu:ist/prod',  path: join(nuTokenBase, 'ist', 'prod', 'before') },
    { key: 'nu:co/prod',   path: join(nuTokenBase, 'co', 'prod', 'before') },
    { key: 'nu:br/prod',   path: join(nuTokenBase, 'br', 'prod', 'before') },
  ]
  for (const { key, path } of nuEnvs) {
    try {
      const raw = fs.readFileSync(path, 'utf-8').trim()
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
  const nurcPath = join(os.homedir(), '.nurc')
  const shell = process.env.SHELL || '/bin/zsh'

  const run = (cmd: string): Promise<string> =>
    new Promise((resolve) => {
      let out = ''
      const p = spawn(shell, ['-c', `source "${nurcPath}" 2>/dev/null || true; ${cmd}`], {
        env: { ...process.env },
      })
      p.stdout?.on('data', (d) => (out += d))
      p.stderr?.on('data', (d) => (out += d))
      p.on('close', () => resolve(out))
      p.on('error', () => resolve(''))
      setTimeout(() => { p.kill(); resolve(out) }, 8000)
    })

  const [itOut, nuOut] = await Promise.all([
    run('it --available-commands 2>&1'),
    run('nu --available-commands 2>&1'),
  ])

  const parseTree = (raw: string) =>
    raw
      .split('\n')
      .map((l) => l.replace(/[|\\-]/g, '').trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'))

  return {
    it: parseTree(itOut),
    nu: parseTree(nuOut),
  }
}

// ─── IPC Handlers ──────────────────────────────────────────

// Get credential status (reads files, no commands)
ipcMain.handle('creds:status', () => parseCredentialStatus())

// Discover available CLI commands
ipcMain.handle('cli:discover', () => discoverCommands())

// Start a PTY session
ipcMain.handle('pty:start', (event, { id, command, args }: { id: string; command: string; args: string[] }) => {
  // Kill existing session with same id
  const existing = ptyMap.get(id)
  if (existing) {
    try { existing.kill() } catch (_) { /* ignore */ }
    ptyMap.delete(id)
  }

  const nurcPath = join(os.homedir(), '.nurc')
  const shellPath = process.env.SHELL || '/bin/zsh'
  const cmdStr = `source "${nurcPath}" 2>/dev/null || true\n${command} ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`

  const term = pty.spawn(shellPath, ['-c', cmdStr], {
    name: 'xterm-256color',
    cols: 120,
    rows: 40,
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1' },
  })

  ptyMap.set(id, term)

  term.onData((data) => {
    win?.webContents.send(`pty:data:${id}`, data)
  })

  term.onExit(({ exitCode }) => {
    win?.webContents.send(`pty:exit:${id}`, exitCode)
    ptyMap.delete(id)
  })

  return true
})

// Start a PTY shell script session
ipcMain.handle('pty:script', (event, { id, script }: { id: string; script: string }) => {
  const existing = ptyMap.get(id)
  if (existing) {
    try { existing.kill() } catch (_) { /* ignore */ }
    ptyMap.delete(id)
  }

  const nurcPath = join(os.homedir(), '.nurc')
  const shellPath = process.env.SHELL || '/bin/zsh'
  const fullScript = `source "${nurcPath}" 2>/dev/null || true\n${script}`

  const term = pty.spawn(shellPath, ['-c', fullScript], {
    name: 'xterm-256color',
    cols: 120,
    rows: 40,
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1' },
  })

  ptyMap.set(id, term)

  term.onData((data) => {
    win?.webContents.send(`pty:data:${id}`, data)
  })

  term.onExit(({ exitCode }) => {
    win?.webContents.send(`pty:exit:${id}`, exitCode)
    ptyMap.delete(id)
  })

  return true
})

// Send input to PTY (y/n/Enter)
ipcMain.on('pty:input', (_, { id, data }: { id: string; data: string }) => {
  ptyMap.get(id)?.write(data)
})

// Kill a PTY session
ipcMain.on('pty:kill', (_, id: string) => {
  const term = ptyMap.get(id)
  if (term) {
    try { term.kill() } catch (_) { /* ignore */ }
    ptyMap.delete(id)
  }
})

// Resize PTY
ipcMain.on('pty:resize', (_, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
  ptyMap.get(id)?.resize(cols, rows)
})

// Open external links
ipcMain.on('shell:open', (_, url: string) => {
  shell.openExternal(url)
})
