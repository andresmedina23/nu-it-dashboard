import type { Section } from '../types'

const NAV_ITEMS = [
  { id: 'nucli' as Section,        label: 'Nucli / AWS',   icon: '☁️', desc: 'Credenciales' },
  { id: 'jamf' as Section,         label: 'JAMF',          icon: '🖥️', desc: 'Gestión equipos' },
  { id: 'certificados' as Section, label: 'Certificados',  icon: '🔐', desc: 'Certs y VLANs' },
  { id: 'yubikey' as Section,      label: 'Yubikey',       icon: '🔑', desc: 'Auth & Scopes' },
  { id: 'inventario' as Section,   label: 'Inventario',    icon: '📦', desc: 'Activos CO' },
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
        {!discoveredCommands ? (
          <p className="text-[10px] text-[#4A1D7A] text-center animate-pulse">Verificando CLIs...</p>
        ) : (
          <div className="flex gap-2">
            {(['it', 'nu'] as const).map(cli => {
              const found = (discoveredCommands[cli]?.length ?? 0) > 0
              return (
                <div key={cli}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold
                    ${found
                      ? 'bg-[#0DBA6A]/10 border-[#0DBA6A]/30 text-[#0DBA6A]'
                      : 'bg-[#E04045]/10 border-[#E04045]/30 text-[#E04045]'}`}>
                  <span>{found ? '✓' : '✗'}</span>
                  <span>{cli}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
