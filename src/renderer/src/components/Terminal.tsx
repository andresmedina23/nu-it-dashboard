import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  output: string
  running: boolean
  exitCode: number | null
  onInput: (data: string) => void
  onKill: () => void
  onClear: () => void
}

// Strip ANSI codes for display (basic)
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[mGKJHFABCDST]/g, '')
            .replace(/\x1b\[\?[0-9]*[hl]/g, '')
            .replace(/\x1b[=>]/g, '')
}

// Simula el comportamiento de un terminal real con \r
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

// Colorize known patterns
function colorizeOutput(text: string, newFrom: number): JSX.Element[] {
  const lines = processCarriageReturns(text).split('\n')
  return lines.map((line, i) => {
    const plain = stripAnsi(line)
    let cls = 'text-green-300'
    if (plain.match(/^\$\s/)) cls = 'text-[#820AD1] font-semibold'
    else if (plain.match(/✓|✅|OK|completad|éxito|success/i)) cls = 'text-[#0DBA6A]'
    else if (plain.match(/✗|error|falló|failed|ERR/i)) cls = 'text-[#E04045]'
    else if (plain.match(/⚠|warn|atenci/i)) cls = 'text-[#F6AE2D]'
    else if (plain.match(/→|paso|info|actualizando/i)) cls = 'text-[#3B9EFF]'
    else if (plain.match(/\[y\/n\]|\(y\/n\)|confirm/i)) cls = 'text-[#F6AE2D] font-semibold animate-pulse'

    const isNew = i >= newFrom
    return (
      <div
        key={i}
        className={`terminal-out leading-relaxed selectable ${cls} ${isNew ? 'line-in' : ''}`}
      >
        {plain || '\u00A0'}
      </div>
    )
  })
}

export default function Terminal({ output, running, exitCode, onInput, onKill, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputVal, setInputVal] = useState('')
  const prevLineCountRef = useRef(0)

  const lines = processCarriageReturns(output).split('\n')
  const newFrom = prevLineCountRef.current

  // Update line count ref after each render (after output changes)
  useEffect(() => {
    prevLineCountRef.current = lines.length
  })

  // Reset line counter when a new session starts
  useEffect(() => {
    if (running) prevLineCountRef.current = 0
  }, [running])

  const lastLines = processCarriageReturns(output).split('\n').filter(l => l.trim()).slice(-3).join(' ').toLowerCase()
  const isPrompting = running && lastLines.match(/\[y\/n\]|\(y\/n\)|password:|confirm|continuar|proceed/)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output])

  useEffect(() => {
    if (isPrompting) inputRef.current?.focus()
  }, [isPrompting])

  const sendInput = useCallback((val: string) => {
    onInput(val + '\n')
    setInputVal('')
  }, [onInput])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendInput(inputVal)
    if (e.key === 'c' && e.ctrlKey) onInput('\x03')
  }

  const quickSend = (val: string) => onInput(val + '\n')

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-[#4A1D7A]/60">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0014] border-b border-[#4A1D7A]/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#E04045]" />
          <span className="w-3 h-3 rounded-full bg-[#F6AE2D]" />
          <span className="w-3 h-3 rounded-full bg-[#0DBA6A]" />
          <span className="ml-2 text-[11px] text-[#C9B3D9]/40 font-mono">— IT Dashboard Terminal —</span>
        </div>
        <div className="flex items-center gap-2">
          {running && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#F6AE2D]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F6AE2D] animate-ping" />
              ejecutando
            </span>
          )}
          {exitCode !== null && !running && (
            <span className={`text-[11px] font-mono ${exitCode === 0 ? 'text-[#0DBA6A]' : 'text-[#E04045]'}`}>
              exit {exitCode}
            </span>
          )}
          {running && (
            <button
              onClick={onKill}
              title="Terminar proceso (Ctrl+C)"
              className="text-[11px] text-[#E04045]/60 hover:text-[#E04045] hover:bg-[#E04045]/10 transition-all px-2 py-0.5 rounded border border-[#E04045]/20 hover:border-[#E04045]/50"
            >
              ✕ kill
            </button>
          )}
          <button
            onClick={onClear}
            className="text-[11px] text-[#C9B3D9]/30 hover:text-[#C9B3D9] transition-colors px-2 py-0.5 rounded hover:bg-[#4A1D7A]/30"
          >
            limpiar
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto bg-[#07000f] p-4 selectable">
        {output ? (
          <div className="space-y-0">
            {colorizeOutput(output, newFrom)}
            {running && (
              <span className="terminal-out text-[#820AD1] cursor-blink">█</span>
            )}
          </div>
        ) : (
          <p className="terminal-out text-[#4A1D7A]/60 text-center mt-12">
            La salida del comando aparecerá aquí...
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Interactive input */}
      {running && (
        <div className="flex-shrink-0 border-t border-[#4A1D7A]/40 bg-[#0a0014] p-3">
          {isPrompting ? (
            <div className="space-y-2">
              <p className="text-[11px] text-[#F6AE2D] font-medium">El comando espera una respuesta:</p>
              <div className="flex items-center gap-2">
                <button onClick={() => quickSend('y')} className="px-4 py-1.5 rounded-lg bg-[#0DBA6A]/20 border border-[#0DBA6A]/50 text-[#0DBA6A] text-sm font-bold hover:bg-[#0DBA6A]/30 transition-all">
                  Y — Sí
                </button>
                <button onClick={() => quickSend('n')} className="px-4 py-1.5 rounded-lg bg-[#E04045]/20 border border-[#E04045]/50 text-[#E04045] text-sm font-bold hover:bg-[#E04045]/30 transition-all">
                  N — No
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe y presiona Enter..."
                    className="flex-1 bg-[#1C0035] border border-[#4A1D7A] rounded-lg px-3 py-1.5 text-sm text-white font-mono outline-none focus:border-[#820AD1] selectable"
                    autoFocus
                  />
                  <button onClick={() => sendInput(inputVal)} className="nu-btn-primary py-1.5 px-3 text-xs">↵</button>
                </div>
                <button onClick={() => onInput('\x03')} className="px-3 py-1.5 rounded-lg bg-[#4A1D7A]/30 border border-[#4A1D7A] text-[#C9B3D9]/60 text-xs hover:text-white">
                  Ctrl+C
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#C9B3D9]/30 font-mono">stdin:</span>
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enviar input al proceso..."
                className="flex-1 bg-transparent text-sm text-[#C9B3D9]/60 font-mono outline-none placeholder-[#4A1D7A]/50 selectable"
              />
              <button onClick={() => onInput('\x03')} className="text-[11px] text-[#C9B3D9]/30 hover:text-[#E04045] transition-colors px-1">
                ×
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
