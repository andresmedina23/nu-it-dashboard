/**
 * googleWorkspace.ts — Google Sheets integration via Gemini CLI auth
 *
 * Reutiliza el token OAuth del Google Workspace MCP (Gemini CLI / Claude Code)
 * almacenado en el keychain de macOS. No requiere Google Cloud Console.
 *
 * El token tiene scope "drive" que incluye acceso de escritura a Sheets.
 */

import { ipcMain } from 'electron'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

// ─── Keychain / Cloud Function constants ──────────────────────────────────────
const KEYCHAIN_SERVICE     = 'gemini-cli-workspace-oauth'
const KEYCHAIN_ACCOUNT     = 'main-account'
const GEMINI_CLIENT_ID     = '338689075775-o75k922vn5fdl18qergr96rp8g63e4d7.apps.googleusercontent.com'
const CLOUD_FUNCTION_URL   = 'https://google-workspace-extension.geminicli.com'
const TOKEN_EXPIRY_BUFFER  = 5 * 60 * 1000  // 5 minutos

// ─── Config persistence ───────────────────────────────────────────────────────
const CONFIG_DIR      = path.join(os.homedir(), '.config', 'nu-it-dashboard')
const SHEETS_CFG_PATH = path.join(CONFIG_DIR, 'gw-sheets.json')

// ─── Sheet structure (MAC sheet) ──────────────────────────────────────────────
// 8 bloques: [SERIAL, TIPO, ESTATUS, DISPONIBLE, FECHA] separados por columna vacía
// Offsets: 0, 6, 12, 18, 24, 30, 36, 42
const MAC_BLOCK_OFFSETS  = [0, 6, 12, 18, 24, 30, 36, 42]
const MAC_HEADER_ROW     = 0
const DISPONIBLE_OFFSET  = 3

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GwSheetsConfig {
  spreadsheetId: string
  sheetName: string
}

export interface GwStatus {
  authenticated: boolean
  hasCredentials: boolean
  email?: string
  name?: string
}

export interface GwSheetsUpdatePayload {
  serial: string
  action: 'checkout' | 'checkin' | 'updatestatus'
  status?: string
}

export interface GwSheetsUpdateResult {
  ok: boolean
  serial?: string
  row?: number
  block?: number
  blockCol?: string
  error?: string
}

// ─── Keychain token shape (Gemini CLI format) ─────────────────────────────────

interface StoredToken {
  serverName: string
  token: {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    tokenType: string
    scope?: string
  }
  updatedAt: number
}

// ─── In-memory token cache ────────────────────────────────────────────────────

let cachedAccessToken: string | null = null
let cachedExpiresAt: number = 0

// ─── Keychain read ────────────────────────────────────────────────────────────

function readKeychainToken(): StoredToken | null {
  try {
    const raw = execSync(
      `security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim()
    if (!raw) return null
    return JSON.parse(raw) as StoredToken
  } catch {
    return null
  }
}

// ─── Token refresh via Cloud Function ────────────────────────────────────────

async function doRefreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  const response = await fetch(`${CLOUD_FUNCTION_URL}/refreshToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token refresh failed: ${response.status} ${text}`)
  }
  const data = await response.json() as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

// ─── Get valid access token ───────────────────────────────────────────────────

async function getMcpAccessToken(): Promise<string> {
  // Return in-memory cached token if still valid
  if (cachedAccessToken && Date.now() < cachedExpiresAt - TOKEN_EXPIRY_BUFFER) {
    return cachedAccessToken
  }

  const stored = readKeychainToken()
  if (!stored?.token) {
    throw new Error(
      'No hay token de Google. Autentica primero con el Google Workspace MCP en Claude Code.',
    )
  }

  const { accessToken, refreshToken, expiresAt } = stored.token

  // Use keychain token if still valid
  if (accessToken && expiresAt && expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER) {
    cachedAccessToken = accessToken
    cachedExpiresAt = expiresAt
    return accessToken
  }

  // Refresh via Cloud Function
  if (!refreshToken) {
    throw new Error('Token expirado y sin refresh_token. Vuelve a autenticar en Claude Code.')
  }

  const refreshed = await doRefreshToken(refreshToken)
  cachedAccessToken = refreshed.accessToken
  cachedExpiresAt = refreshed.expiresAt
  return refreshed.accessToken
}

// ─── Authenticated googleapis client ─────────────────────────────────────────

async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const accessToken = await getMcpAccessToken()
  const oAuth2Client = new google.auth.OAuth2({ clientId: GEMINI_CLIENT_ID })
  oAuth2Client.setCredentials({ access_token: accessToken, token_type: 'Bearer' })
  return oAuth2Client
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function getStatus(): Promise<GwStatus> {
  const stored = readKeychainToken()
  if (!stored?.token?.accessToken && !stored?.token?.refreshToken) {
    return { authenticated: false, hasCredentials: false }
  }
  // Token exists — consider authenticated (actual API errors surface on use)
  return {
    authenticated: true,
    hasCredentials: true,
    name: 'Gemini CLI / Claude Code',
  }
}

// ─── Config persistence ───────────────────────────────────────────────────────

export function loadSheetsConfig(): GwSheetsConfig {
  try {
    const raw = fs.readFileSync(SHEETS_CFG_PATH, 'utf-8')
    const p = JSON.parse(raw)
    return {
      spreadsheetId: typeof p.spreadsheetId === 'string' ? p.spreadsheetId : '',
      sheetName: typeof p.sheetName === 'string' ? p.sheetName : 'MAC',
    }
  } catch {
    return { spreadsheetId: '', sheetName: 'MAC' }
  }
}

function saveSheetsConfig(cfg: GwSheetsConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(SHEETS_CFG_PATH, JSON.stringify(cfg, null, 2), 'utf-8')
}

// ─── Column helpers ───────────────────────────────────────────────────────────

function colToLetter(col: number): string {
  let letter = ''
  let n = col + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    letter = String.fromCharCode(65 + rem) + letter
    n = Math.floor((n - 1) / 26)
  }
  return letter
}

function mapStatus(action: string, status?: string): { disponible: string } {
  if (action === 'checkout') return { disponible: 'NO' }
  if (action === 'checkin') return { disponible: 'SI' }
  const lower = (status ?? '').toLowerCase()
  if (lower.includes('stock') || lower.includes('in stock')) return { disponible: 'SI' }
  return { disponible: 'NO' }
}

// ─── Sheets: find serial ──────────────────────────────────────────────────────

interface SerialLocation {
  rowIndex: number
  sheetRow: number
  blockIndex: number
  blockOffset: number
  serialColLetter: string
  disponibleColLetter: string
}

async function findSerialInSheet(
  client: OAuth2Client,
  spreadsheetId: string,
  sheetName: string,
  serial: string,
): Promise<SerialLocation | null> {
  const sheets = google.sheets({ version: 'v4', auth: client })

  const serialCols = MAC_BLOCK_OFFSETS.map(o => colToLetter(o))
  const ranges = serialCols.map(col => `${sheetName}!${col}:${col}`)

  const res = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges })
  const valueRanges = res.data.valueRanges ?? []
  const normalSerial = serial.trim().toUpperCase()

  for (let blockIdx = 0; blockIdx < MAC_BLOCK_OFFSETS.length; blockIdx++) {
    const blockOffset = MAC_BLOCK_OFFSETS[blockIdx]
    const colValues = valueRanges[blockIdx]?.values ?? []

    for (let rowIdx = MAC_HEADER_ROW + 1; rowIdx < colValues.length; rowIdx++) {
      const cellVal = String(colValues[rowIdx]?.[0] ?? '').trim().toUpperCase()
      if (cellVal === normalSerial) {
        return {
          rowIndex: rowIdx,
          sheetRow: rowIdx + 1,
          blockIndex: blockIdx,
          blockOffset,
          serialColLetter: colToLetter(blockOffset),
          disponibleColLetter: colToLetter(blockOffset + DISPONIBLE_OFFSET),
        }
      }
    }
  }

  return null
}

// ─── Sheets: update serial ────────────────────────────────────────────────────

export async function updateSerialInSheet(
  payload: GwSheetsUpdatePayload,
  cfg: GwSheetsConfig,
): Promise<GwSheetsUpdateResult> {
  if (!cfg.spreadsheetId) return { ok: false, error: 'no_spreadsheet_id' }

  let client: OAuth2Client
  try {
    client = await getAuthenticatedClient()
  } catch (err) {
    return { ok: false, error: String(err) }
  }

  const serial = payload.serial.trim().replace(/^CO-/i, '')

  let location: SerialLocation | null
  try {
    location = await findSerialInSheet(client, cfg.spreadsheetId, cfg.sheetName, serial)
  } catch (err) {
    return { ok: false, error: `find_error: ${String(err)}` }
  }

  if (!location) return { ok: false, serial, error: 'serial_not_found' }

  const { disponible } = mapStatus(payload.action, payload.status)
  const sheets = google.sheets({ version: 'v4', auth: client })
  const row = location.sheetRow

  const today = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const fechaColLetter = colToLetter(location.blockOffset + 4)

  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: cfg.spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `${cfg.sheetName}!${location.disponibleColLetter}${row}`, values: [[disponible]] },
          { range: `${cfg.sheetName}!${fechaColLetter}${row}`, values: [[today]] },
        ],
      },
    })
  } catch (err) {
    return { ok: false, serial, error: `update_error: ${String(err)}` }
  }

  return {
    ok: true,
    serial,
    row,
    block: location.blockIndex + 1,
    blockCol: location.serialColLetter,
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

export function registerHandlers(_getWin: () => unknown): void {
  ipcMain.handle('gw:status', async () => getStatus())

  // Legacy handlers (kept for type compatibility, now no-ops or passthrough)
  ipcMain.handle('gw:credentials:save', async () => ({ ok: true }))
  ipcMain.handle('gw:auth', async () => ({ ok: true }))
  ipcMain.handle('gw:signout', async () => {
    cachedAccessToken = null
    cachedExpiresAt = 0
    return { ok: true }
  })

  ipcMain.handle('gw:sheets:config:get', () => loadSheetsConfig())

  ipcMain.handle('gw:sheets:config:set', (_, cfg: GwSheetsConfig) => {
    if (!cfg?.spreadsheetId) return { ok: false, error: 'missing_spreadsheet_id' }
    saveSheetsConfig({
      spreadsheetId: cfg.spreadsheetId.trim(),
      sheetName: (cfg.sheetName ?? 'MAC').trim(),
    })
    return { ok: true }
  })

  ipcMain.handle('gw:sheets:update-serial', async (_, payload: GwSheetsUpdatePayload) => {
    if (!payload?.serial) return { ok: false, error: 'missing_serial' }
    const cfg = loadSheetsConfig()
    return updateSerialInSheet(payload, cfg)
  })
}
