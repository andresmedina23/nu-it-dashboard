import { useEffect, useRef } from 'react'
import type { TerminalLine } from '../types'

interface Props {
  lines: TerminalLine[]
  running: boolean
  exitCode: number | null
  onClear: () => void
}

const lineColor: Record<string, string> = {
  start: 'text-nu-purple font-semibold',
  stdout: 'text-green-300',
  stderr: 'text-nu-warning',
  error: 'text-nu-error',
  exit: 'text-nu-light/60',
  info: 'text-nu-info',
}

function ansiToHtml(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
}

export default function Terminal({ lines, running, exitCode, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-nu-deeper border-b border-nu-border rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-nu-error" />
          <span className="w-3 h-3 rounded-full bg-nu-warning" />
          <span className="w-3 h-3 rounded-full bg-nu-success" />
          <span className="ml-3 text-xs text-nu-light/50 font-mono">bash — IT Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          {running && (
            <span className="flex items-center gap-1.5 text-xs text-nu-warning">
              <span className="w-1.5 h-1.5 rounded-full bg-nu-warning animate-pulse" />
              Ejecutando...
            </span>
          )}
          {exitCode !== null && (
            <span className={`text-xs font-mono ${exitCode === 0 ? 'text-nu-success' : 'text-nu-error'}`}>
              exit {exitCode}
            </span>
          )}
          <button
            onClick={onClear}
            className="text-xs text-nu-light/40 hover:text-nu-light transition-colors px-2 py-1 rounded hover:bg-nu-border/30"
          >
            limpiar
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto bg-[#0a0014] rounded-b-xl p-4 terminal-glow min-h-[300px] max-h-[500px]">
        {lines.length === 0 && !running ? (
          <p className="text-nu-light/25 font-mono text-xs text-center mt-8">
            La salida del comando aparecerá aquí...
          </p>
        ) : (
          <div className="space-y-0.5">
            {lines.map(line => (
              <div key={line.id} className={`terminal-line ${lineColor[line.type] ?? 'text-white'}`}>
                {line.type === 'start' && <span className="text-nu-border mr-1">$</span>}
                {ansiToHtml(line.text)}
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-nu-purple animate-ping" />
                <span className="terminal-line text-nu-light/40">procesando</span>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
