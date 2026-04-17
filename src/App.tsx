import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Terminal from './components/Terminal'
import Diagnostico from './components/sections/Diagnostico'
import NuCLI from './components/sections/NuCLI'
import JAMF from './components/sections/JAMF'
import Certificados from './components/sections/Certificados'
import Yubikey from './components/sections/Yubikey'
import Inventario from './components/sections/Inventario'
import { useCommandRunner } from './hooks/useCommandRunner'
import type { Section } from './types'

const SECTION_LABELS: Record<Section, string> = {
  diagnostico: 'Diagnóstico del Sistema',
  nucli: 'Nucli / AWS',
  jamf: 'JAMF',
  certificados: 'Certificados',
  yubikey: 'Yubikey / Scopes',
  inventario: 'Inventario',
}

export default function App() {
  const [section, setSection] = useState<Section>('inventario')
  const { lines, running, exitCode, run, clear } = useCommandRunner()

  const handleSectionChange = (s: Section) => {
    setSection(s)
    clear()
  }

  const sectionProps = { onRun: run, running }

  return (
    <div className="flex h-screen overflow-hidden bg-nu-deeper">
      <Sidebar active={section} onChange={handleSectionChange} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-nu-dark border-b border-nu-border flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-white">{SECTION_LABELS[section]}</h1>
            <p className="text-xs text-nu-light/40 mt-0.5">IT Engineering · Nubank Colombia</p>
          </div>
          <div className="flex items-center gap-3">
            {running && (
              <div className="flex items-center gap-2 bg-nu-purple/20 border border-nu-purple/40 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-nu-purple animate-ping" />
                <span className="text-xs text-nu-accent font-medium">Ejecutando</span>
              </div>
            )}
            {exitCode !== null && !running && (
              <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium
                ${exitCode === 0
                  ? 'bg-nu-success/20 border border-nu-success/40 text-nu-success'
                  : 'bg-nu-error/20 border border-nu-error/40 text-nu-error'}`}>
                {exitCode === 0 ? '✓ Completado' : `✗ Error (${exitCode})`}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex gap-0 overflow-hidden">
          {/* Left panel — forms */}
          <div className="w-[400px] flex-shrink-0 overflow-y-auto p-6 border-r border-nu-border">
            {section === 'diagnostico' && <Diagnostico {...sectionProps} />}
            {section === 'nucli' && <NuCLI {...sectionProps} />}
            {section === 'jamf' && <JAMF {...sectionProps} />}
            {section === 'certificados' && <Certificados {...sectionProps} />}
            {section === 'yubikey' && <Yubikey {...sectionProps} />}
            {section === 'inventario' && <Inventario {...sectionProps} />}
          </div>

          {/* Right panel — terminal */}
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            <Terminal lines={lines} running={running} exitCode={exitCode} onClear={clear} />
          </div>
        </div>
      </main>
    </div>
  )
}
