import { useState, useEffect, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import Terminal from './components/Terminal'
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

  // Auto-responses that Inventario needs (location + status number pickers)
  // Updated dynamically by Inventario via callback
  const [autoResponses, setAutoResponses] = useState<AutoResponse[]>([])

  const pty = usePty(autoResponses)

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

  const sectionProps = { onRun: pty.runCommand, onScript: pty.runScript, running: pty.running }

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
            <Terminal
              output={pty.output}
              running={pty.running}
              exitCode={pty.exitCode}
              onInput={pty.sendInput}
              onClear={pty.clear}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
