import { BrowserWindow, session } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// ─── Config ─────────────────────────────────────────────────

export interface SheetsConfig {
  webAppUrl: string
  enabled: boolean
  autoSync: boolean
}

const CONFIG_DIR  = path.join(os.homedir(), '.config', 'nu-it-dashboard')
const CONFIG_PATH = path.join(CONFIG_DIR, 'sheets-config.json')

const DEFAULT_CONFIG: SheetsConfig = {
  webAppUrl: '',
  enabled: false,
  autoSync: false,
}

export function getConfig(): SheetsConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(cfg: Partial<SheetsConfig>): SheetsConfig {
  const merged = { ...getConfig(), ...cfg }
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8')
  } catch (err) {
    console.error('[sheetsSync] Error saving config:', err)
  }
  return merged
}

// ─── Google Sign-In (ventana interna) ───────────────────────
// Abre una ventana con User-Agent de Chrome real para evitar el bloqueo
// de Google a browsers embebidos. Resuelve cuando el usuario cierra la ventana.

export function openGoogleSignIn(parentWin: BrowserWindow, targetUrl?: string): Promise<void> {
  return new Promise((resolve) => {
    const { width: pw, height: ph, x: px, y: py } = parentWin.getBounds()
    const w = 520, h = 700
    const authWin = new BrowserWindow({
      width: w, height: h,
      x: Math.round(px + (pw - w) / 2),
      y: Math.round(py + (ph - h) / 2),
      title: targetUrl
        ? 'Autenticando con Google Workspace — cierra esta ventana al terminar'
        : 'Inicia sesión con Google — cierra esta ventana al terminar',
      alwaysOnTop: true,
      resizable: true,
      webPreferences: {
        session: session.defaultSession,
        nodeIntegration: false,
        contextIsolation: true,
      },
    })
    authWin.setMenuBarVisibility(false)
    authWin.webContents.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    )
    // Si tenemos la URL del Apps Script, la cargamos directamente.
    // Google redirige al login si no hay sesión → al completar, vuelve al script
    // y quedan todas las cookies de Google Workspace en session.defaultSession.
    const startUrl = targetUrl || 'https://accounts.google.com/signin/v2/identifier?hl=es'
    authWin.loadURL(startUrl)
    authWin.on('closed', () => resolve())
  })
}

// ─── Verifica que la URL del Apps Script responde correctamente ──

// ─── Verifica que la URL del Apps Script responde correctamente ──
// Usa session.fetch() que maneja cookies y SSO de Google Workspace igual que Chrome.

export async function checkConnection(webAppUrl: string): Promise<boolean> {
  if (!webAppUrl) return false
  try {
    const testUrl = `${webAppUrl}?after=${encodeURIComponent(new Date(0).toISOString())}&check=1`
    const res = await session.defaultSession.fetch(testUrl)
    if (!res.ok) return false
    const data = await res.json() as Record<string, unknown>
    return 'serverTime' in data || 'changes' in data
  } catch {
    return false
  }
}

// ─── Fetch con sesión Electron ───────────────────────────────
// session.fetch() maneja automáticamente cookies, redirects y auth de Google Workspace.

async function netFetch(url: string, options?: { method?: string; body?: string }): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  const res = await session.defaultSession.fetch(url, {
    method: options?.method ?? 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body,
  })
  return {
    ok: res.ok,
    status: res.status,
    json: () => res.json(),
  }
}

// ─── Polling ─────────────────────────────────────────────────

let pollInterval: ReturnType<typeof setInterval> | null = null
let lastPollTime = new Date(0).toISOString()

export interface SheetChange {
  timestamp: string
  serial: string
  field: 'ESTATUS' | 'DISPONIBLE'
  newValue: string
  oldValue: string
  row: number
  col: number
  block: string
  by: string
}

export function startSync(config: SheetsConfig, win: BrowserWindow): void {
  stopSync()
  lastPollTime = new Date(0).toISOString()

  if (!config.webAppUrl || !config.enabled) return

  const poll = async () => {
    try {
      const url = `${config.webAppUrl}?after=${encodeURIComponent(lastPollTime)}`
      const res = await netFetch(url)
      if (!res.ok) return

      const data = await res.json() as { changes?: SheetChange[]; serverTime?: string }

      if (data.serverTime) lastPollTime = data.serverTime
      if (data.changes && data.changes.length > 0) {
        win.webContents.send('sheets:change', data.changes)
      }
    } catch {
      // Silently retry
    }
  }

  poll()
  pollInterval = setInterval(poll, 3000)
}

export function stopSync(): void {
  if (pollInterval !== null) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// ─── App → Sheet ─────────────────────────────────────────────

export type UpdateAction = 'checkout' | 'checkin' | 'updatestatus'

export interface UpdatePayload {
  serial: string
  action: UpdateAction
  status?: string
}

export interface UpdateResult {
  ok: boolean
  row?: number
  block?: string
  error?: string
}

export async function updateSheet(
  config: SheetsConfig,
  payload: UpdatePayload,
): Promise<UpdateResult> {
  if (!config.webAppUrl) return { ok: false, error: 'no_url' }

  try {
    const res = await netFetch(config.webAppUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (!res.ok) return { ok: false, error: `http_${res.status}` }

    const data = await res.json() as UpdateResult
    return data
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
