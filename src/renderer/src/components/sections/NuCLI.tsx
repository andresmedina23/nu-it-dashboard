import { useState } from 'react'
import FormField from '../FormField'

interface Props { onRun: (cmd: string, args: string[]) => void; onScript: (s: string) => void; running: boolean }
type Tab = 'refresh' | 'login' | 'toolio'

const LOGIN_SCRIPT = `
echo "→ Actualizando nu..."
nu update || echo "⚠ Falló nu update"
echo "→ Actualizando it..."
it update || echo "⚠ Falló it update"
echo "→ Refresh AWS nu..."
nu aws credentials refresh || echo "⚠ Falló"
echo "→ Refresh token nu..."
nu auth get-refresh-token || echo "⚠ Falló"
echo "→ Access token nu..."
nu auth get-access-token || echo "⚠ Falló"
echo "→ Actualizando nu-co..."
nu-co update || echo "⚠ Falló nu-co update"
echo "→ Refresh AWS nu-co..."
nu-co aws credentials refresh || echo "⚠ Falló"
echo "→ Refresh token nu-co..."
nu-co auth get-refresh-token || echo "⚠ Falló"
echo "→ Access token nu-co..."
nu-co auth get-access-token || echo "⚠ Falló"
echo "→ Access token PROD CO..."
nu-co auth get-access-token --env prod --country co || echo "⚠ Falló"
echo ""
echo "✓ Actualización completada"
`.trim()

export default function NuCLI({ onRun, onScript, running }: Props) {
  const [tab, setTab] = useState<Tab>('refresh')
  const [nombre, setNombre] = useState('')

  const tabs = [
    { id: 'refresh' as Tab, label: 'Refresh AWS', icon: '🔄' },
    { id: 'login' as Tab, label: 'Login Completo', icon: '⚡' },
    { id: 'toolio' as Tab, label: 'Toolio', icon: '👤' },
  ]

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Nucli / AWS</h2>
        <p className="text-[#C9B3D9]/50 text-sm mt-1">Credenciales y autenticación AWS.</p>
      </div>

      <div className="flex p-1 bg-[#0F001E] rounded-xl mb-5 gap-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all
              ${tab === t.id ? 'bg-[#820AD1] text-white' : 'text-[#C9B3D9]/50 hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'refresh' && (
        <div className="nu-card space-y-4">
          <p className="text-sm text-[#C9B3D9]/60">Refresca credenciales AWS para <code className="text-[#A842FF] bg-[#820AD1]/10 px-1 rounded">nu-ist</code>.</p>
          <code className="block text-[11px] text-[#C9B3D9]/50 bg-[#0F001E] rounded-lg p-3 font-mono">
            $ nu-ist aws credentials refresh
          </code>
          <button onClick={() => onRun('nu-ist', ['aws', 'credentials', 'refresh'])} disabled={running} className="nu-btn-primary w-full justify-center">
            {running ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔄'}
            Refresh Credenciales
          </button>
        </div>
      )}

      {tab === 'login' && (
        <div className="nu-card space-y-4">
          <p className="text-sm text-[#C9B3D9]/60">Flujo completo: actualiza <code className="text-[#A842FF] bg-[#820AD1]/10 px-1 rounded">nu</code>, <code className="text-[#A842FF] bg-[#820AD1]/10 px-1 rounded">it</code> y <code className="text-[#A842FF] bg-[#820AD1]/10 px-1 rounded">nu-co</code>.</p>
          <div className="bg-[#0F001E] rounded-lg p-3 max-h-28 overflow-y-auto">
            {LOGIN_SCRIPT.split('\n').map((l, i) => (
              <div key={i} className="text-[11px] font-mono text-[#C9B3D9]/40">{l || '\u00A0'}</div>
            ))}
          </div>
          <button onClick={() => onScript(LOGIN_SCRIPT)} disabled={running} className="nu-btn-primary w-full justify-center">
            {running ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '⚡'}
            Login & Actualización Completa
          </button>
        </div>
      )}

      {tab === 'toolio' && (
        <div className="nu-card space-y-4">
          <FormField label="Nombre completo" id="toolio-nombre" value={nombre} onChange={setNombre}
            placeholder="NOMBRE_APELLIDO" hint="Ej: WILMAR_MEDINA" required />
          <button onClick={() => onRun('nu-co', ['toolio', 'add', nombre])} disabled={running || !nombre.trim()} className="nu-btn-primary w-full justify-center">
            {running ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '👤'}
            Añadir a Toolio
          </button>
        </div>
      )}
    </div>
  )
}
