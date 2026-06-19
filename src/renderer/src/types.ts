export type Section = 'nucli' | 'jamf' | 'certificados' | 'yubikey' | 'inventario'

export interface CommandEntry {
  id: string
  label: string
  section: Section
  startedAt: Date
  endedAt?: Date
  exitCode?: number | null
  output?: string
}

export interface CredStatus {
  expires: string
  status: 'ok' | 'warn' | 'expired' | 'missing'
}

export interface RunConfig {
  command: string
  args: string[]
  script?: string  // if set, use pty:script instead
}

// ─── Google Workspace / Sheets types ────────────────────────

export interface GwStatus {
  authenticated: boolean
  hasCredentials: boolean
  email?: string
  name?: string
}

export interface GwSheetsConfig {
  spreadsheetId: string
  sheetName: string
}

export interface GwSheetsResult {
  ok: boolean
  serial?: string
  row?: number
  block?: number
  blockCol?: string
  error?: string
}

declare global {
  interface Window {
    electronAPI: {
      getCredStatus: () => Promise<Record<string, CredStatus>>
      discoverCLI: () => Promise<Record<string, string[]>>
      ptyStart: (id: string, command: string, args: string[]) => Promise<boolean>
      ptyScript: (id: string, script: string) => Promise<boolean>
      ptyInput: (id: string, data: string) => void
      ptyKill: (id: string) => void
      ptyResize: (id: string, cols: number, rows: number) => void
      onPtyData: (id: string, cb: (data: string) => void) => () => void
      onPtyExit: (id: string, cb: (code: number) => void) => void
      openExternal: (url: string) => void
      // Google Sheets Sync (Apps Script)
      sheetsConfigGet: () => Promise<{ webAppUrl: string; enabled: boolean; autoSync: boolean }>
      sheetsConfigSet: (cfg: object) => Promise<{ webAppUrl: string; enabled: boolean; autoSync: boolean }>
      sheetsStart: () => Promise<{ webAppUrl: string; enabled: boolean; autoSync: boolean }>
      sheetsStop: () => void
      sheetsUpdate: (payload: { serial: string; action: string; status?: string }) => Promise<{ ok: boolean; row?: number; block?: string; error?: string }>
      onSheetsChange: (cb: (changes: unknown[]) => void) => () => void
      sheetsCheckConnection: (webAppUrl: string) => Promise<boolean>
      sheetsSignIn: () => Promise<void>
      sheetsQuery: (serial: string) => Promise<unknown>
      // Google Workspace — OAuth + Sheets API directa
      gwStatus: () => Promise<GwStatus>
      gwCredentialsSave: (creds: { clientId: string; clientSecret: string }) => Promise<{ ok: boolean; error?: string }>
      gwAuth: () => Promise<{ ok: boolean; error?: string }>
      gwSignOut: () => Promise<{ ok: boolean }>
      gwSheetsConfigGet: () => Promise<GwSheetsConfig>
      gwSheetsConfigSet: (cfg: GwSheetsConfig) => Promise<{ ok: boolean; error?: string }>
      gwSheetsUpdateSerial: (payload: { serial: string; action: string; status?: string }) => Promise<GwSheetsResult>
    }
  }
}
