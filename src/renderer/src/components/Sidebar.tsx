import type { Section } from '../types'

const NAV_ITEMS = [
  { id: 'diagnostico' as Section, label: 'Diagnóstico', icon: '🔍', desc: 'Sistema y auth' },
  { id: 'nucli' as Section, label: 'Nucli / AWS', icon: '☁️', desc: 'Credenciales' },
  { id: 'jamf' as Section, label: 'JAMF', icon: '🖥️', desc: 'Gestión equipos' },
  { id: 'certificados' as Section, label: 'Certificados', icon: '🔐', desc: 'Certs y VLANs' },
  { id: 'yubikey' as Section, label: 'Yubikey', icon: '🔑', desc: 'Auth & Scopes' },
  { id: 'inventario' as Section, label: 'Inventario', icon: '📦', desc: 'Activos CO' },
]

interface Props {
  active: Section
  onChange: (s: Section) => void
  discoveredCommands?: Record<string, string[]>
  runningSection?: Section | null
}

export default function Sidebar({ active, onChange, discoveredCommands, runningSection }: Props) {
  const itCommands = discoveredCommands?.it ?? []

  const checkSection = (section: Section): 'ok' | 'warn' | null => {
    if (!discoveredCommands) return null
    const checks: Record<Section, string[]> = {
      diagnostico: [],
      nucli: ['aws'],
      jamf: ['jamf', 'computer'],
      certificados: ['certs'],
      yubikey: ['yubikey'],
      inventario: ['inventory', 'asset'],
    }
    const needed = checks[section]
    if (needed.length === 0) return 'ok'
    const allFound = needed.every(kw => itCommands.some(cmd => cmd.includes(kw)))
    return allFound ? 'ok' : 'warn'
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-[#1C0035] border-r border-[#4A1D7A]/50 flex flex-col">
      {/* Nav */}
      <nav className="flex-1 px-2 pt-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const health = checkSection(item.id)
          const isActive = active === item.id
          const isRunning = runningSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`no-drag w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left
                          transition-all duration-200
                          ${isActive
                            ? 'sidebar-active text-white'
                            : 'hover:bg-[#4A1D7A]/20 text-[#C9B3D9]/60 hover:text-white hover:translate-x-0.5'}`}
            >
              <span className={`text-base flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{item.label}</p>
                <p className={`text-[11px] truncate transition-colors duration-200 ${isActive ? 'text-white/60' : 'text-[#C9B3D9]/30'}`}>
                  {isRunning && !isActive ? (
                    <span className="text-[#F6AE2D]">ejecutando…</span>
                  ) : item.desc}
                </p>
              </div>
              {isRunning && (
                <span className="w-2 h-2 rounded-full bg-[#F6AE2D] animate-ping flex-shrink-0" />
              )}
              {!isRunning && health === 'warn' && (
                <span title="Comando posiblemente cambiado" className="text-[#F6AE2D] text-xs flex-shrink-0">!</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* CLI health footer */}
      <div className="px-3 py-3 border-t border-[#4A1D7A]/40">
        {discoveredCommands ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#C9B3D9]/40 font-mono">it</span>
              <span className="text-[10px] text-[#0DBA6A]">{discoveredCommands.it?.length ?? 0} cmds</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#C9B3D9]/40 font-mono">nu</span>
              <span className="text-[10px] text-[#0DBA6A]">{discoveredCommands.nu?.length ?? 0} cmds</span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-[#4A1D7A] text-center animate-pulse">Cargando CLIs...</p>
        )}
        <p className="text-[10px] text-[#4A1D7A]/60 text-center mt-2">v1.0.18 · IT Engineering CO</p>
        <p className="text-[10px] text-[#C9B3D9]/20 text-center mt-1">hecho por <span className="text-[#820AD1]/60">@will</span></p>
      </div>
    </aside>
  )
}
