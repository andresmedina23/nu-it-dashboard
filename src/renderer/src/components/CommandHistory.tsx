import { useState } from 'react'
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

// Strip ANSI codes
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[mGKJHFABCDST]/g, '')
            .replace(/\x1b\[\?[0-9]*[hl]/g, '')
            .replace(/\x1b[=>]/g, '')
}

function processCarriageReturns(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n')
  return normalized.split('\n').map(line => {
    if (!line.includes('\r')) return line
    const parts = line.split('\r')
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i]) return parts[i]
    }
    return ''
  }).join('\n')
}

function LogLine({ line }: { line: string }) {
  const plain = stripAnsi(line)
  let cls = 'text-green-300/80'
  if (plain.match(/^\$\s/)) cls = 'text-[#A842FF] font-semibold'
  else if (plain.match(/✓|✅|OK|completad|éxito|success/i)) cls = 'text-[#0DBA6A]'
  else if (plain.match(/✗|error|falló|failed|ERR/i)) cls = 'text-[#E04045]'
  else if (plain.match(/⚠|warn|atenci/i)) cls = 'text-[#F6AE2D]'
  else if (plain.match(/→|paso|info|actualizando/i)) cls = 'text-[#3B9EFF]'
  return (
    <div className={`font-mono text-[10.5px] leading-relaxed selectable ${cls}`}>
      {plain || '\u00A0'}
    </div>
  )
}

interface Props {
  history: CommandEntry[]
}

export default function CommandHistory({ history }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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
        const exitOk = entry.exitCode === 0 || entry.exitCode === 1
        const color = SECTION_COLORS[entry.section]
        const isExpanded = expanded.has(entry.id)
        const hasOutput = !!entry.output?.trim()
        const logLines = hasOutput
          ? processCarriageReturns(entry.output!).split('\n')
          : []

        return (
          <div
            key={entry.id}
            className="rounded-lg border border-[#4A1D7A]/40 bg-[#07000f] overflow-hidden transition-colors hover:border-[#4A1D7A]/70"
          >
            {/* Header row — clickable para expandir */}
            <button
              className="w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-[#4A1D7A]/10 transition-colors"
              onClick={() => hasOutput && toggle(entry.id)}
              disabled={!hasOutput && !isRunning}
            >
              {/* Status dot */}
              {isRunning ? (
                <span className="mt-[5px] w-2 h-2 rounded-full bg-[#F6AE2D] animate-ping flex-shrink-0" />
              ) : (
                <span
                  className="mt-[5px] w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: exitOk ? '#0DBA6A' : '#E04045' }}
                />
              )}

              {/* Command label */}
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[11px] text-[#C9B3D9] break-all leading-relaxed">
                  {entry.label}
                </span>

                {/* Meta row */}
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ color, background: `${color}20` }}
                  >
                    {SECTION_LABELS[entry.section]}
                  </span>
                  <span className="text-[10px] text-[#4A1D7A]/70">{formatTime(entry.startedAt)}</span>
                  <span className="text-[10px] text-[#4A1D7A]/70">{formatDuration(entry.startedAt, entry.endedAt)}</span>
                  {!isRunning && entry.exitCode !== undefined && entry.exitCode !== null && (
                    <span className="text-[10px] font-mono" style={{ color: exitOk ? '#0DBA6A' : '#E04045' }}>
                      exit {entry.exitCode}
                    </span>
                  )}
                  {isRunning && (
                    <span className="text-[10px] text-[#F6AE2D] animate-pulse">ejecutando…</span>
                  )}
                </div>
              </div>

              {/* Expand chevron */}
              {hasOutput && (
                <span className={`flex-shrink-0 text-[#4A1D7A]/60 text-xs mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              )}
            </button>

            {/* Log output — expandible */}
            {isExpanded && hasOutput && (
              <div className="border-t border-[#4A1D7A]/30 bg-[#04000a] px-3 py-2.5 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-[#4A1D7A]/50 font-mono uppercase tracking-widest">— output —</span>
                  <span className="text-[9px] text-[#4A1D7A]/40 font-mono">{logLines.length} líneas</span>
                </div>
                {logLines.map((line, i) => (
                  <LogLine key={i} line={line} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
