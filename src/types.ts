export type Section =
  | 'diagnostico'
  | 'nucli'
  | 'jamf'
  | 'certificados'
  | 'yubikey'
  | 'inventario'

export interface TerminalLine {
  id: number
  type: 'stdout' | 'stderr' | 'start' | 'exit' | 'error' | 'info'
  text: string
}

export interface RunParams {
  action: string
  params: Record<string, string | string[]>
}
