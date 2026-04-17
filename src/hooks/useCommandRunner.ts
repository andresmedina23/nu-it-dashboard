import { useState, useRef, useCallback } from 'react'
import type { TerminalLine, RunParams } from '../types'

let lineCounter = 0

export function useCommandRunner() {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [running, setRunning] = useState(false)
  const [exitCode, setExitCode] = useState<number | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const run = useCallback(({ action, params }: RunParams) => {
    // Close previous connection
    esRef.current?.close()
    setLines([])
    setExitCode(null)
    setRunning(true)

    const qs = new URLSearchParams({
      action,
      params: JSON.stringify(params),
    })

    const es = new EventSource(`/sse/run?${qs}`)
    esRef.current = es

    es.onmessage = (e) => {
      const { type, data } = JSON.parse(e.data)

      if (type === 'exit') {
        setExitCode(data)
        setRunning(false)
        es.close()
        return
      }

      const text = String(data)
      if (!text.trim() && type !== 'start') return

      setLines(prev => [
        ...prev,
        { id: ++lineCounter, type, text: text.replace(/\n$/, '') }
      ])
    }

    es.onerror = () => {
      setLines(prev => [
        ...prev,
        { id: ++lineCounter, type: 'error', text: 'Conexión perdida con el servidor' }
      ])
      setRunning(false)
      es.close()
    }
  }, [])

  const clear = useCallback(() => {
    esRef.current?.close()
    setLines([])
    setExitCode(null)
    setRunning(false)
  }, [])

  return { lines, running, exitCode, run, clear }
}
