import type { Section } from '../types'

interface NavItem {
  id: Section
  label: string
  icon: string
  description: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'diagnostico', label: 'Diagnóstico', icon: '🔍', description: 'Sistema y auth' },
  { id: 'nucli', label: 'Nucli / AWS', icon: '☁️', description: 'Credenciales' },
  { id: 'jamf', label: 'JAMF', icon: '🖥️', description: 'Gestión equipos' },
  { id: 'certificados', label: 'Certificados', icon: '🔐', description: 'Certs y VLANs' },
  { id: 'yubikey', label: 'Yubikey', icon: '🔑', description: 'Auth & Scopes' },
  { id: 'inventario', label: 'Inventario', icon: '📦', description: 'Activos CO' },
]

interface Props {
  active: Section
  onChange: (s: Section) => void
}

export default function Sidebar({ active, onChange }: Props) {
  return (
    <aside className="w-64 flex-shrink-0 bg-nu-dark border-r border-nu-border flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-nu-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-nu-purple flex items-center justify-center shadow-lg shadow-nu-purple/40">
            <span className="text-white font-bold text-base">N</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">IT Dashboard</p>
            <p className="text-nu-light/50 text-xs">Nubank Colombia</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                        transition-all duration-200 group
                        ${active === item.id
                          ? 'sidebar-active text-white'
                          : 'hover:bg-nu-border/30 text-nu-light/70 hover:text-white'}`}
          >
            <span className="text-lg">{item.icon}</span>
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${active === item.id ? 'text-white' : ''}`}>
                {item.label}
              </p>
              <p className={`text-xs truncate ${active === item.id ? 'text-white/70' : 'text-nu-light/40'}`}>
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-nu-border">
        <p className="text-nu-light/30 text-xs text-center">v3.0 · IT Engineering CO</p>
      </div>
    </aside>
  )
}
