import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import Terminal from './components/Terminal'
import CommandHistory from './components/CommandHistory'
import Diagnostico from './components/sections/Diagnostico'
import NuCLI from './components/sections/NuCLI'
import JAMF from './components/sections/JAMF'
import Certificados from './components/sections/Certificados'
import Yubikey from './components/sections/Yubikey'
import Inventario from './components/sections/Inventario'
import { usePty, type AutoResponse } from './hooks/usePty'
import type { Section } from './types'

export default function App() {
  const [section, setSection] = useState<Section>('inventario')
  const [discoveredCommands, setDiscoveredCommands] = useState<Record<string, string[]> | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'terminal' | 'historial'>('terminal')

  // Auto-responses that Inventario needs (location + status number pickers)
  // Updated dynamically by Inventario via callback
  const [autoResponses, setAutoResponses] = useState<AutoResponse[]>([])

  const pty = usePty(autoResponses, section)

  useEffect(() => {
    window.electronAPI.discoverCLI()
      .then(cmds => setDiscoveredCommands(cmds))
      .catch(() => {})
  }, [])

  const handleSectionChange = (s: Section) => {
    setSection(s)
    setAutoResponses([])
    pty.clear()
  }

  // Switch to terminal tab automatically when a command starts
  useEffect(() => {
    if (pty.running) setActiveTab('terminal')
  }, [pty.running])

  const sectionProps = { onRun: pty.runCommand, onScript: pty.runScript, running: pty.running }

  const historyCount = pty.history.length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0F001E]">
      <StatusBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={section} onChange={handleSectionChange} discoveredCommands={discoveredCommands} />
        <main className="flex-1 flex overflow-hidden">
          <div className="w-[390px] flex-shrink-0 overflow-y-auto p-5 border-r border-[#4A1D7A]/40">
            {section === 'diagnostico'  && <Diagnostico onScript={pty.runScript} running={pty.running} />}
            {section === 'nucli'        && <NuCLI {...sectionProps} />}
            {section === 'jamf'         && <JAMF onRun={pty.runCommand} running={pty.running} />}
            {section === 'certificados' && <Certificados {...sectionProps} />}
            {section === 'yubikey'      && <Yubikey {...sectionProps} />}
            {section === 'inventario'   && (
              <Inventario
                {...sectionProps}
                onAutoResponses={setAutoResponses}
              />
            )}
          </div>
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-3 flex-shrink-0">
              <button
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                <Terminal
                  output={pty.output}
                  running={pty.running}
                  exitCode={pty.exitCode}
                  onInput={pty.sendInput}
                  onClear={pty.clear}
                />
              ) : (
                <div className="h-full rounded-xl overflow-hidden border border-[#4A1D7A]/60 bg-[#07000f]">
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
    </div>
  )
}
