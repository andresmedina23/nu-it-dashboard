import type { CommandEntry, Section } from '../types'

const SECTION_LABELS: Record<Section, string> = {
  diagnostico: 'Diagnóstico',
  nucli: 'NuCLI/AWS',
  jamf: 'JAMF',
  certificados: 'Certificados',
  yubikey: 'Yubikey',
  inventario: 'Inventario',
}

const SECTION_COLORS: Record<Section, string> = {
  diagnostico: '#3B9EFF',
  nucli: '#F6AE2D',
  jamf: '#0DBA6A',
  certificados: '#820AD1',
  yubikey: '#FF6B6B',
  inventario: '#C9B3D9',
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(start: Date, end?: Date): string {
  if (!end) return '…'
  const ms = end.getTime() - start.getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

interface Props {
  history: CommandEntry[]
}

export default function CommandHistory({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[#4A1D7A]/60">
        <span className="text-3xl mb-3">📋</span>
        <p className="text-sm">No hay comandos en el historial aún.</p>
        <p className="text-xs mt-1 text-[#4A1D7A]/40">Los comandos ejecutados aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-2">
      <p className="text-[10px] text-[#4A1D7A]/50 px-1 pb-1 border-b border-[#4A1D7A]/20">
        {history.length} comando{history.length !== 1 ? 's' : ''} — más recientes primero
      </p>
      {history.map((entry) => {
        const isRunning = !entry.endedAt
        const exitOk = entry.exitCode === 0 || entry.exitCode === 1  // it inventory returns 1 on success
        const color = SECTION_COLORS[entry.section]

        return (
          <div
            key={entry.id}
            className="rounded-lg border border-[#4A1D7A]/40 bg-[#07000f] px-3 py-2.5 hover:border-[#4A1D7A]/70 transition-colors"
          >
            {/* Label row */}
            <div className="flex items-start gap-2">
              {isRunning ? (
                <span className="mt-[5px] w-2 h-2 rounded-full bg-[#F6AE2D] animate-ping flex-shrink-0" />
              ) : (
                <span
                  className="mt-[5px] w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: exitOk ? '#0DBA6A' : '#E04045' }}
                />
              )}
              <span className="font-mono text-[11px] text-[#C9B3D9] break-all leading-relaxed">
                {entry.label}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5 ml-4">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ color, background: `${color}20` }}
              >
                {SECTION_LABELS[entry.section]}
              </span>
              <span className="text-[10px] text-[#4A1D7A]/70">
                {formatTime(entry.startedAt)}
              </span>
              <span className="text-[10px] text-[#4A1D7A]/70">
                {formatDuration(entry.startedAt, entry.endedAt)}
              </span>
              {!isRunning && entry.exitCode !== undefined && entry.exitCode !== null && (
                <span
                  className="text-[10px] font-mono"
                  style={{ color: exitOk ? '#0DBA6A' : '#E04045' }}
                >
                  exit {entry.exitCode}
                </span>
              )}
              {isRunning && (
                <span className="text-[10px] text-[#F6AE2D] animate-pulse">ejecutando…</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
