import { useState, useRef, useCallback, useEffect } from 'react'

let sessionCounter = 0

// Auto-response: when output matches pattern, send this text automatically
export interface AutoResponse {
  pattern: RegExp
  response: string
  label: string  // shown in terminal: "Auto-enviando: label"
  once?: boolean // default true — only respond once per session
}

export function usePty(autoResponses?: AutoResponse[]) {
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [exitCode, setExitCode] = useState<number | null>(null)
  const sessionIdRef = useRef(`pty-${++sessionCounter}`)
  const cleanupRef = useRef<(() => void) | null>(null)
  const firedRef = useRef<Set<number>>(new Set())   // tracks which autoResponses already fired
  const outputBufRef = useRef('')                    // buffer for pattern matching

  const startSession = useCallback(() => {
    window.electronAPI.ptyKill(sessionIdRef.current)
    cleanupRef.current?.()

    sessionIdRef.current = `pty-${++sessionCounter}`
    firedRef.current = new Set()
    outputBufRef.current = ''
    setOutput('')
    setExitCode(null)
    setRunning(true)

    const id = sessionIdRef.current

    const removeData = window.electronAPI.onPtyData(id, (data) => {
      outputBufRef.current += data
      setOutput(prev => prev + data)

      // Check auto-responses
      if (autoResponses) {
        autoResponses.forEach((ar, idx) => {
          const alreadyFired = firedRef.current.has(idx)
          if (alreadyFired && ar.once !== false) return
          // once:false → check only new chunk to avoid re-triggering on old buffer
          // once:true  → check full buffer in case pattern spans chunks
          const searchIn = ar.once === false ? data : outputBufRef.current
          if (ar.pattern.test(searchIn)) {
            firedRef.current.add(idx)
            setTimeout(() => {
              window.electronAPI.ptyInput(id, ar.response + '\n')
              setOutput(prev => prev + `\n[auto → ${ar.label}]\n`)
            }, 150)
          }
        })
      }
    })

    window.electronAPI.onPtyExit(id, (code) => {
      setRunning(false)
      // Exit code 1 from `it inventory` often means success — normalize
      setExitCode(code)
      removeData()
    })

    cleanupRef.current = removeData
    return id
  }, [autoResponses])

  const runCommand = useCallback(async (command: string, args: string[]) => {
    const id = startSession()
    await window.electronAPI.ptyStart(id, command, args)
  }, [startSession])

  const runScript = useCallback(async (script: string) => {
    const id = startSession()
    await window.electronAPI.ptyScript(id, script)
  }, [startSession])

  const sendInput = useCallback((data: string) => {
    window.electronAPI.ptyInput(sessionIdRef.current, data)
  }, [])

  const kill = useCallback(() => {
    window.electronAPI.ptyKill(sessionIdRef.current)
    cleanupRef.current?.()
    setRunning(false)
  }, [])

  const clear = useCallback(() => {
    kill()
    outputBufRef.current = ''
    setOutput('')
    setExitCode(null)
  }, [kill])

  useEffect(() => () => { cleanupRef.current?.() }, [])

  return { output, running, exitCode, sessionId: sessionIdRef.current, runCommand, runScript, sendInput, kill, clear }
}
