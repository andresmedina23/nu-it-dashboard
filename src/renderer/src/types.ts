export type Section = 'diagnostico' | 'nucli' | 'jamf' | 'certificados' | 'yubikey' | 'inventario'

export interface CommandEntry {
  id: string
  label: string
  section: Section
  startedAt: Date
  endedAt?: Date
  exitCode?: number | null
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
    }
  }
}
