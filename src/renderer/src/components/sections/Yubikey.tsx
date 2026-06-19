import { useState, useEffect } from 'react'
import FormField from '../FormField'
import type { AutoResponse } from '../../hooks/usePty'
import type { AppConfig } from '../SetupScreen'

interface Props {
  onRun: (cmd: string, args: string[]) => void
  onScript: (s: string) => void
  running: boolean
  onAutoResponses: (responses: AutoResponse[]) => void
  appConfig: AppConfig
}

type Tab = 'configurar' | 'scopes_co' | 'scopes_nu' | 'scopes_mx'
type Country = 'co' | 'br' | 'mx'

function safeEmail(e: string) { return e.replace(/[^a-zA-Z0-9._%+\-@]/g, '') }

// Números reales según la lista del CLI (verificados con la salida del terminal)
const ALL_COUNTRIES: { id: Country; label: string; flag: string; locationNum: string; locationLabel: string }[] = [
  { id: 'co', label: 'Colombia', flag: '🇨🇴', locationNum: '43', locationLabel: 'COL-HQ1-03' },
  { id: 'br', label: 'Brazil',   flag: '🇧🇷', locationNum: '52', locationLabel: 'BR-HQ1'     },
  { id: 'mx', label: 'México',   flag: '🇲🇽', locationNum: '42', locationLabel: 'MX-HQ1'     },
]

const ALL_TABS = [
  { id: 'configurar' as Tab, label: 'Configurar Yubikey', icon: '🔑', countries: ['co','br','mx'] as Country[] },
  { id: 'scopes_co'  as Tab, label: 'Scopes nu-co 🇨🇴',  icon: '🔑', countries: ['co'] as Country[] },
  { id: 'scopes_nu'  as Tab, label: 'Scopes nu 🇧🇷',      icon: '🔑', countries: ['br'] as Country[] },
  { id: 'scopes_mx'  as Tab, label: 'Scopes nu-mx 🇲🇽',  icon: '🔑', countries: ['mx'] as Country[] },
]

export default function Yubikey({ onRun, onScript, running, onAutoResponses, appConfig }: Props) {
  // Filtrar países y tabs según configuración
  const availableCountries = ALL_COUNTRIES.filter(c => appConfig.countries.includes(c.id))
  const TABS = ALL_TABS.filter(t =>
    t.countries.some(c => appConfig.countries.includes(c))
  )

  const [tab, setTab]         = useState<Tab>(TABS[0]?.id ?? 'configurar')
  const [email, setEmail]     = useState('')
  const [country, setCountry] = useState<Country>(appConfig.primaryCountry)

  const selectedCountry = availableCountries.find(c => c.id === country) ?? availableCountries[0]

  // Registrar auto-responses cada vez que cambia el tab o el país
  useEffect(() => {
    if (tab !== 'configurar') {
      onAutoResponses([])
      return
    }
    onAutoResponses([
      {
        // "Please disconnect your yubikey... Is it in? (y/n)"
        pattern: /Is it in\? \(y\/n\)/i,
        response: 'y',
        label: 'yubikey conectada → y',
        once: true,
      },
      {
        // El Python de inventory.py pide la ubicación como lista numerada
        pattern: /Enter the number corresponding to the location/i,
        response: selectedCountry.locationNum,
        label: `location → ${selectedCountry.locationNum} (${selectedCountry.label})`,
        once: true,
      },
    ])
  }, [tab, country, selectedCountry.locationNum, selectedCountry.label, onAutoResponses])

  const handleRun = () => {
    const e = safeEmail(email)
    if (tab === 'configurar') {
      onScript(
        `echo "→ Instalando brew deps..."\n` +
        `brew install yubico-piv-tool yubikey-personalization libyubikey || echo "⚠ Algunos paquetes fallaron"\n` +
        `echo "→ Instalando pip deps..."\n` +
        `pip3 install diceware pandas boto3 XlsxWriter || echo "⚠ Algunos paquetes fallaron"\n` +
        `echo "→ Configurando Yubikey para ${selectedCountry.label} (--country ${country})..."\n` +
        `it yubikey configure '${e}' --country ${country}`
      )
    } else if (tab === 'scopes_co') {
      onRun('nu-co', ['sec', 'scope', 'show', e])
    } else if (tab === 'scopes_mx') {
      onRun('nu-mx', ['sec', 'scope', 'show', e])
    } else {
      onRun('nu', ['sec', 'scope', 'show', e])
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Yubikey / Scopes</h2>
        <p className="text-[#C9B3D9]/50 text-sm mt-1">Configuración de llaves y permisos.</p>
      </div>

      <div className="space-y-2 mb-5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left
              ${tab === t.id
                ? 'sidebar-active text-white'
                : 'nu-card text-[#C9B3D9]/60 hover:text-white hover:border-[#820AD1]/50'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="nu-card space-y-4">

        {/* Selector de país — solo en configurar */}
        {tab === 'configurar' && (
          <>
            <div>
              <label className="nu-label">País / Región</label>
              <div className="flex gap-2">
                {availableCountries.map(c => (
                  <button key={c.id} onClick={() => setCountry(c.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all border
                      ${country === c.id
                        ? 'bg-[#820AD1]/20 border-[#820AD1] text-white'
                        : 'bg-[#0F001E] border-[#820AD1]/20 text-[#C9B3D9]/50 hover:border-[#820AD1]/50 hover:text-white'}`}>
                    <span className="text-xl">{c.flag}</span>
                    <span>{c.label}</span>
                    {c.id === appConfig.primaryCountry && <span className="text-[9px] text-[#820AD1] font-semibold">DEFAULT</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0DBA6A]/10 border border-[#0DBA6A]/30 rounded-lg p-3 text-xs text-[#0DBA6A] space-y-1">
              <p className="font-medium">✓ Respuestas automáticas activas:</p>
              <p>· <code className="bg-[#0DBA6A]/10 px-1 rounded">Is it in? (y/n)</code> → <strong>y</strong></p>
              <p>· <code className="bg-[#0DBA6A]/10 px-1 rounded">Enter the number… location</code> → <strong>{selectedCountry.locationNum}</strong> ({selectedCountry.label})</p>
            </div>

            <div className="bg-[#3B9EFF]/10 border border-[#3B9EFF]/30 rounded-lg p-3 text-xs text-[#3B9EFF]">
              ℹ️ Cuando el CLI pregunte la ubicación o confirme la Yubikey, la app responde automáticamente. Solo presiona el botón.
            </div>
          </>
        )}

        <FormField
          label="Email"
          id="yubi-email"
          value={email}
          onChange={setEmail}
          placeholder="usuario@nubank.com.br"
          type="email"
          required
        />

        <button
          onClick={handleRun}
          disabled={running || !email.trim()}
          className="nu-btn-primary w-full justify-center">
          {running
            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : '🔑'}
          {tab === 'configurar'
            ? `Configurar Yubikey — ${selectedCountry.flag} ${country.toUpperCase()}`
            : TABS.find(t => t.id === tab)?.label}
        </button>
      </div>
    </div>
  )
}
