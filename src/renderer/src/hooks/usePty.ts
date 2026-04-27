import { useState, useRef, useCallback, useEffect } from 'react'
import type { Section, CommandEntry } from '../types'

let sessionCounter = 0

// Auto-response: when output matches pattern, send this text automatically
export interface AutoResponse {
  pattern: RegExp
  response: string
  label: string  // shown in terminal: "Auto-enviando: label"
  once?: boolean // default true — only respond once per session
}

export function usePty(autoResponses?: AutoResponse[], currentSection?: Section) {
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [history, setHistory] = useState<CommandEntry[]>([])
  const sessionIdRef = useRef(`pty-${++sessionCounter}`)
  const cleanupRef = useRef<(() => void) | null>(null)
  const firedRef = useRef<Set<number>>(new Set())   // tracks which autoResponses already fired
  const outputBufRef = useRef('')                    // buffer for pattern matching
  const currentSectionRef = useRef(currentSection)
  // Always-current ref so onPtyData listeners read latest autoResponses
  // even when setAutoResponses is called just before runScript in the same tick
  const autoResponsesRef = useRef(autoResponses)
  autoResponsesRef.current = autoResponses

  useEffect(() => { currentSectionRef.current = currentSection }, [currentSection])

  const startSession = useCallback((label: string) => {
    window.electronAPI.ptyKill(sessionIdRef.current)
    cleanupRef.current?.()

    sessionIdRef.current = `pty-${++sessionCounter}`
    firedRef.current = new Set()
    outputBufRef.current = ''
    setOutput('')
    setExitCode(null)
    setRunning(true)

    const id = sessionIdRef.current
    const entryId = id

    const entry: CommandEntry = {
      id: entryId,
      label,
      section: currentSectionRef.current ?? 'diagnostico',
      startedAt: new Date(),
    }
    setHistory(prev => [entry, ...prev])

    const removeData = window.electronAPI.onPtyData(id, (data) => {
      outputBufRef.current += data
      setOutput(prev => prev + data)

      // Check auto-responses (use ref so we always see the latest value,
      // even if setAutoResponses was called just before runScript in the same tick)
      const currentAutoResponses = autoResponsesRef.current
      if (currentAutoResponses) {
        currentAutoResponses.forEach((ar, idx) => {
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
      setHistory(prev => prev.map(e =>
        e.id === entryId ? { ...e, endedAt: new Date(), exitCode: code } : e
      ))
    })

    cleanupRef.current = removeData
    return id
  }, [])

  const runCommand = useCallback(async (command: string, args: string[]) => {
    const label = [command, ...args].join(' ')
    const id = startSession(label)
    await window.electronAPI.ptyStart(id, command, args)
  }, [startSession])

  const runScript = useCallback(async (script: string) => {
    const firstLine = script.split('\n').find(l => l.trim() && !l.trim().startsWith('#'))?.trim() ?? 'script'
    const label = `script: ${firstLine.slice(0, 60)}`
    const id = startSession(label)
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

  return { output, running, exitCode, history, sessionId: sessionIdRef.current, runCommand, runScript, sendInput, kill, clear }
}
