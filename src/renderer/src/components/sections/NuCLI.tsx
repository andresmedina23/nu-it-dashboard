import { useState } from 'react'
import FormField from '../FormField'

interface Props { onRun: (cmd: string, args: string[]) => void; onScript: (s: string) => void; running: boolean }
type Tab = 'refresh' | 'login' | 'toolio'
type RefreshCountry = 'co' | 'mx' | 'br'

// Actualiza CLIs primero, luego refresca tokens — orden crítico
const buildRefreshScript = (country: RefreshCountry): string => {
  const isCo = country === 'co'
  const isMx = country === 'mx'
  const cliName = isCo ? 'nu-co' : isMx ? 'nu-mx' : 'nu'
  const countryFlag = isCo ? '--country co' : isMx ? '--country mx' : ''
  const accountAlias = isCo ? 'co' : isMx ? 'mx' : 'nubank'

  return [
    `echo "→ Actualizando nu..."`,
    `nu update || echo "⚠ Falló nu update"`,
    ...(country !== 'br' ? [
      `echo "→ Actualizando ${cliName}..."`,
      `${cliName} update || echo "⚠ Falló ${cliName} update"`,
    ] : []),
    `echo "→ Actualizando it..."`,
    `it update || echo "⚠ Falló it update"`,
    `echo ""`,
    `echo "→ Refresh token nu-ist..."`,
    `nu-ist auth get-refresh-token --env prod || echo "⚠ Falló nu-ist refresh"`,
    `echo "→ Access token nu-ist..."`,
    `nu-ist auth get-access-token --env prod || echo "⚠ Falló nu-ist access"`,
    `echo "→ Refresh AWS (${accountAlias})..."`,
    `nu aws shared-role-credentials refresh --account-alias=${accountAlias} || echo "⚠ Falló aws refresh"`,
    ...(country !== 'br' ? [
      `echo "→ Refresh token ${cliName}..."`,
      `${cliName} auth get-refresh-token --env prod ${countryFlag} || echo "⚠ Falló ${cliName} refresh"`,
      `echo "→ Access token ${cliName}..."`,
      `${cliName} auth get-access-token --env prod ${countryFlag} || echo "⚠ Falló ${cliName} access"`,
    ] : [
      `echo "→ Refresh token nu..."`,
      `nu auth get-refresh-token --env prod || echo "⚠ Falló nu refresh"`,
      `echo "→ Access token nu..."`,
      `nu auth get-access-token --env prod || echo "⚠ Falló nu access"`,
    ]),
    `echo ""`,
    `echo "✓ Credenciales actualizadas para ${country.toUpperCase()}"`,
  ].join('\n')
}

const LOGIN_SCRIPT = [
  `echo "→ Actualizando nu..."`,
  `nu update || echo "⚠ Falló nu update"`,
  `echo "→ Actualizando nu-co..."`,
  `nu-co update || echo "⚠ Falló nu-co update"`,
  `echo "→ Actualizando it..."`,
  `it update || echo "⚠ Falló it update"`,
  `echo ""`,
  `echo "→ Refresh token nu-ist..."`,
  `nu-ist auth get-refresh-token --env prod || echo "⚠ Falló nu-ist refresh"`,
  `echo "→ Access token nu-ist..."`,
  `nu-ist auth get-access-token --env prod || echo "⚠ Falló nu-ist access"`,
  `echo "→ Refresh AWS CO..."`,
  `nu aws shared-role-credentials refresh --account-alias=co || echo "⚠ Falló aws CO"`,
  `echo "→ Refresh token nu-co..."`,
  `nu-co auth get-refresh-token --env prod --country co || echo "⚠ Falló nu-co refresh"`,
  `echo "→ Access token nu-co..."`,
  `nu-co auth get-access-token --env prod --country co || echo "⚠ Falló nu-co access"`,
  `echo ""`,
  `echo "✓ Login completo"`,
].join('\n')

const REFRESH_COUNTRIES = [
  { id: 'co' as RefreshCountry, label: 'Colombia', flag: '🇨🇴', cli: 'nu-co' },
  { id: 'mx' as RefreshCountry, label: 'México',   flag: '🇲🇽', cli: 'nu-mx' },
  { id: 'br' as RefreshCountry, label: 'Brazil',   flag: '🇧🇷', cli: 'nu'    },
]

export default function NuCLI({ onRun, onScript, running }: Props) {
  const [tab, setTab]               = useState<Tab>('refresh')
  const [nombre, setNombre]         = useState('')
  const [country, setCountry]       = useState<RefreshCountry>('co')

  const tabs = [
    { id: 'refresh' as Tab, label: 'Refresh Tokens', icon: '🔄' },
    { id: 'login'   as Tab, label: 'Login Completo', icon: '⚡' },
    { id: 'toolio'  as Tab, label: 'Toolio',         icon: '👤' },
  ]

  const selectedCountry = REFRESH_COUNTRIES.find(c => c.id === country)!
  const refreshScript   = buildRefreshScript(country)

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
          {/* Selector de país */}
          <div>
            <label className="block text-xs font-medium text-[#C9B3D9]/70 mb-2">País</label>
            <div className="flex gap-2">
              {REFRESH_COUNTRIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCountry(c.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-all border
                    ${country === c.id
                      ? 'bg-[#820AD1]/20 border-[#820AD1] text-white'
                      : 'bg-[#0F001E] border-[#820AD1]/20 text-[#C9B3D9]/50 hover:border-[#820AD1]/50 hover:text-white'}`}>
                  <span className="text-lg">{c.flag}</span>
                  <span>{c.label}</span>
                  <code className="text-[9px] opacity-60">{c.cli}</code>
                </button>
              ))}
            </div>
          </div>

          {/* Preview de comandos */}
          <div className="bg-[#0F001E] rounded-lg p-3 max-h-36 overflow-y-auto">
            {refreshScript.split('\n').map((l, i) => (
              <div key={i} className={`text-[11px] font-mono ${l.startsWith('echo "→') ? 'text-[#A842FF]' : l.startsWith('echo "✓') ? 'text-green-400' : 'text-[#C9B3D9]/40'}`}>
                {l || ' '}
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-400">
            ⚡ Actualiza <strong>nu</strong>, <strong>{selectedCountry.cli}</strong> e <strong>it</strong> primero, luego refresca los tokens — orden correcto para evitar fallos.
          </div>

          <button
            onClick={() => onScript(refreshScript)}
            disabled={running}
            className="nu-btn-primary w-full justify-center">
            {running
              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : '🔄'}
            Refresh {selectedCountry.flag} {selectedCountry.label}
          </button>
        </div>
      )}

      {tab === 'login' && (
        <div className="nu-card space-y-4">
          <p className="text-sm text-[#C9B3D9]/60">
            Flujo completo: actualiza <code className="text-[#A842FF] bg-[#820AD1]/10 px-1 rounded">nu</code>,{' '}
            <code className="text-[#A842FF] bg-[#820AD1]/10 px-1 rounded">nu-co</code> e{' '}
            <code className="text-[#A842FF] bg-[#820AD1]/10 px-1 rounded">it</code> antes de refrescar tokens.
          </p>
          <div className="bg-[#0F001E] rounded-lg p-3 max-h-36 overflow-y-auto">
            {LOGIN_SCRIPT.split('\n').map((l, i) => (
              <div key={i} className={`text-[11px] font-mono ${l.startsWith('echo "→') ? 'text-[#A842FF]' : l.startsWith('echo "✓') ? 'text-green-400' : 'text-[#C9B3D9]/40'}`}>
                {l || ' '}
              </div>
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
          <button
            onClick={() => onRun('nu-co', ['toolio', 'add', nombre.replace(/[^a-zA-Z0-9_\-]/g, '')])}
            disabled={running || !nombre.trim()}
            className="nu-btn-primary w-full justify-center">
            {running ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '👤'}
            Añadir a Toolio
          </button>
        </div>
      )}
    </div>
  )
}
