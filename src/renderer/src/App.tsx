import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import Terminal from './components/Terminal'
import CommandHistory from './components/CommandHistory'
import NuCLI from './components/sections/NuCLI'
import JAMF from './components/sections/JAMF'
import Certificados from './components/sections/Certificados'
import Yubikey from './components/sections/Yubikey'
import Inventario from './components/sections/Inventario'
import SetupScreen, { loadConfig, type AppConfig } from './components/SetupScreen'
import { usePty, type AutoResponse } from './hooks/usePty'
import type { Section } from './types'

const SECTION_STORAGE_KEY = 'nu-it-dash:lastSection'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
  dying: boolean
}

let toastCounter = 0

export default function App() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(() => loadConfig())

  // Mostrar setup si no está configurado
  if (!appConfig) {
    return <SetupScreen onDone={setAppConfig} />
  }

  return <AppInner appConfig={appConfig} onResetConfig={() => setAppConfig(null)} />
}

function AppInner({ appConfig, onResetConfig: _onResetConfig }: { appConfig: AppConfig; onResetConfig: () => void }) {
  const [section, setSection] = useState<Section>(() => {
    const saved = localStorage.getItem(SECTION_STORAGE_KEY) as Section | null
    const valid: Section[] = ['nucli', 'jamf', 'certificados', 'yubikey', 'inventario']
    return saved && valid.includes(saved) ? saved : 'inventario'
  })
  const [discoveredCommands, setDiscoveredCommands] = useState<Record<string, string[]> | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'terminal' | 'historial'>('terminal')
  const [autoResponses, setAutoResponses] = useState<AutoResponse[]>([])
  const [credRefreshKey, setCredRefreshKey] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [runningSection, setRunningSection] = useState<Section | null>(null)
  const prevRunningRef = useRef(false)

  const pty = usePty(autoResponses, section)

  useEffect(() => {
    window.electronAPI.discoverCLI()
      .then(cmds => setDiscoveredCommands(cmds))
      .catch(() => {})
  }, [])

  const handleSectionChange = (s: Section) => {
    setSection(s)
    localStorage.setItem(SECTION_STORAGE_KEY, s)
    if (!pty.running) setAutoResponses([])
  }

  // Detectar fin de comando: auto-refresh de credenciales + toast
  useEffect(() => {
    if (pty.running) {
      setActiveTab('terminal')
      prevRunningRef.current = true
      setRunningSection(section)
    } else if (prevRunningRef.current) {
      prevRunningRef.current = false
      setRunningSection(null)
      // Auto-refresh credenciales
      setCredRefreshKey(k => k + 1)
      // Mostrar toast
      const code = pty.exitCode
      const success = code === 0 || code === 1  // exit 1 = success en some commands
      const id = ++toastCounter
      const toast: Toast = {
        id,
        message: success ? '✓ Comando completado' : `✗ Error (exit ${code})`,
        type: success ? 'success' : 'error',
        dying: false,
      }
      setToasts(prev => [...prev, toast])
      // Iniciar salida a los 2.5s
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, dying: true } : t))
        // Eliminar a los 2.75s
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id))
        }, 250)
      }, 2500)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pty.running])

  const SECTION_LABELS: Record<Section, string> = {
    nucli: 'Nucli/AWS', jamf: 'JAMF',
    certificados: 'Certificados', yubikey: 'Yubikey', inventario: 'Inventario',
  }

  const navigateTo = (s: Section) => {
    setSection(s)
    localStorage.setItem(SECTION_STORAGE_KEY, s)
    setActiveTab('terminal')
  }

  const sectionProps = { onRun: pty.runCommand, onScript: pty.runScript, running: pty.running }
  const historyCount = pty.history.length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0F001E]">
      <StatusBar refreshKey={credRefreshKey} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={section} onChange={handleSectionChange} discoveredCommands={discoveredCommands} runningSection={runningSection} />
        <main className="flex-1 flex overflow-hidden">
          {/* Left panel — forms, con animación al cambiar sección */}
          <div className="w-[390px] flex-shrink-0 overflow-y-auto p-5 border-r border-[#4A1D7A]/40">
            {/* Banner: comando corriendo en otra sección */}
            {pty.running && runningSection && runningSection !== section && (
              <div className="mb-4 rounded-xl border border-[#F6AE2D]/40 bg-[#F6AE2D]/8 px-3 py-2.5 flex items-center gap-2.5 section-in">
                <span className="w-2 h-2 rounded-full bg-[#F6AE2D] animate-ping flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#F6AE2D]">Comando ejecutándose</p>
                  <p className="text-[10px] text-[#F6AE2D]/60 truncate">en {SECTION_LABELS[runningSection]}</p>
                </div>
                <button
                  onClick={() => navigateTo(runningSection)}
                  className="text-[10px] font-medium text-[#F6AE2D] bg-[#F6AE2D]/15 hover:bg-[#F6AE2D]/25 border border-[#F6AE2D]/30 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                >
                  Ver →
                </button>
              </div>
            )}
            <div key={section} className="section-in">
              {section === 'nucli'        && <NuCLI {...sectionProps} />}
              {section === 'jamf'         && <JAMF onRun={pty.runCommand} running={pty.running} />}
              {section === 'certificados' && <Certificados {...sectionProps} />}
              {section === 'yubikey'      && <Yubikey {...sectionProps} onAutoResponses={setAutoResponses} appConfig={appConfig} />}
              {section === 'inventario'   && (
                <Inventario {...sectionProps} onAutoResponses={setAutoResponses} />
              )}
            </div>
          </div>

          {/* Right panel — terminal / history */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-3 flex-shrink-0">
              <button
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeTab === 'terminal'
                    ? 'bg-[#820AD1]/30 text-white border border-[#820AD1]/60'
                    : 'text-[#C9B3D9]/40 hover:text-[#C9B3D9]/70 border border-transparent'
                }`}
              >
                <span>⌨</span> Terminal
                {pty.running && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F6AE2D] animate-ping" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeTab === 'historial'
                    ? 'bg-[#820AD1]/30 text-white border border-[#820AD1]/60'
                    : 'text-[#C9B3D9]/40 hover:text-[#C9B3D9]/70 border border-transparent'
                }`}
              >
                <span>📋</span> Historial
                {historyCount > 0 && (
                  <span className="bg-[#4A1D7A] text-[#C9B3D9] text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                    {historyCount}
                  </span>
                )}
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'terminal' ? (
                <div key="terminal" className="tab-in h-full">
                  <Terminal
                    output={pty.output}
                    running={pty.running}
                    exitCode={pty.exitCode}
                    onInput={pty.sendInput}
                    onKill={pty.kill}
                    onClear={pty.clear}
                  />
                </div>
              ) : (
                <div key="historial" className="tab-in h-full rounded-xl overflow-hidden border border-[#4A1D7A]/60 bg-[#07000f]">
                  <div className="flex items-center px-4 py-2 bg-[#0a0014] border-b border-[#4A1D7A]/40 flex-shrink-0">
                    <span className="text-[11px] text-[#C9B3D9]/40 font-mono">— Historial de comandos —</span>
                  </div>
                  <div className="h-[calc(100%-37px)] overflow-hidden">
                    <CommandHistory history={pty.history} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 pointer-events-none z-50">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
              border backdrop-blur-sm shadow-xl
              ${toast.type === 'success'
                ? 'bg-[#0DBA6A]/15 border-[#0DBA6A]/40 text-[#0DBA6A] shadow-[#0DBA6A]/20'
                : 'bg-[#E04045]/15 border-[#E04045]/40 text-[#E04045] shadow-[#E04045]/20'}
              ${toast.dying ? 'toast-out' : 'toast-in'}
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
