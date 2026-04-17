import { useState } from 'react'
import FormField from '../FormField'

interface Props { onRun: (cmd: string, args: string[]) => void; onScript: (s: string) => void; running: boolean }
type Tab = 'configurar' | 'scopes_co' | 'scopes_nu'

export default function Yubikey({ onRun, onScript, running }: Props) {
  const [tab, setTab] = useState<Tab>('configurar')
  const [email, setEmail] = useState('')

  const TABS = [
    { id: 'configurar' as Tab, label: 'Configurar Yubikey', icon: '🔑' },
    { id: 'scopes_co' as Tab, label: 'Scopes nu-co 🇨🇴', icon: '🔑' },
    { id: 'scopes_nu' as Tab, label: 'Scopes nu 🇧🇷', icon: '🔑' },
  ]

  const handleRun = () => {
    if (tab === 'configurar') {
      onScript(`echo "→ Instalando brew deps..."\nbrew install yubico-piv-tool yubikey-personalization libyubikey || echo "⚠ Algunos paquetes fallaron"\necho "→ Instalando pip deps..."\npip3 install diceware pandas boto3 XlsxWriter || echo "⚠ Algunos paquetes fallaron"\nit yubikey configure "${email}" --country co`)
    } else if (tab === 'scopes_co') {
      onRun('nu-co', ['sec', 'scope', 'show', email])
    } else {
      onRun('nu', ['sec', 'scope', 'show', email])
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
              ${tab === t.id ? 'sidebar-active text-white' : 'nu-card text-[#C9B3D9]/60 hover:text-white hover:border-[#820AD1]/50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="nu-card space-y-4">
        {tab === 'configurar' && (
          <div className="bg-[#3B9EFF]/10 border border-[#3B9EFF]/30 rounded-lg p-3 text-xs text-[#3B9EFF]">
            ℹ️ Instalará dependencias via <strong>brew</strong> y <strong>pip3</strong> antes de configurar la Yubikey.
          </div>
        )}
        <FormField label="Email" id="yubi-email" value={email} onChange={setEmail} placeholder="usuario@nubank.com.br" type="email" required />
        <button onClick={handleRun} disabled={running || !email.trim()} className="nu-btn-primary w-full justify-center">
          {running ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔑'}
          {TABS.find(t => t.id === tab)?.label}
        </button>
      </div>
    </div>
  )
}
