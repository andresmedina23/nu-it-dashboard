import { useState } from 'react'
import FormField from '../FormField'
import type { RunParams } from '../../types'

interface Props {
  onRun: (p: RunParams) => void
  running: boolean
}

type Tab = 'configurar' | 'scopes_co' | 'scopes_nu'

export default function Yubikey({ onRun, running }: Props) {
  const [tab, setTab] = useState<Tab>('configurar')
  const [email, setEmail] = useState('')

  const ACTION_MAP: Record<Tab, string> = {
    configurar: 'yubikey.configurar',
    scopes_co: 'yubikey.scopes_co',
    scopes_nu: 'yubikey.scopes_nu',
  }

  const TABS = [
    { id: 'configurar' as Tab, label: 'Configurar Yubikey', icon: '🔑', desc: 'Setup completo' },
    { id: 'scopes_co' as Tab, label: 'Scopes nu-co', icon: '🇨🇴', desc: 'Colombia' },
    { id: 'scopes_nu' as Tab, label: 'Scopes nu', icon: '🇧🇷', desc: 'Brasil' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Yubikey / Scopes</h2>
        <p className="text-nu-light/60 text-sm mt-1">Configuración de llaves físicas y permisos.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl text-sm font-medium transition-all duration-200
              ${tab === t.id
                ? 'bg-nu-purple text-white shadow-lg shadow-nu-purple/30'
                : 'nu-card hover:border-nu-purple/50 text-nu-light/70 hover:text-white'}`}
          >
            <span className="text-2xl">{t.icon}</span>
            <span className="text-center text-xs">{t.label}</span>
            <span className={`text-[10px] ${tab === t.id ? 'text-white/60' : 'text-nu-light/40'}`}>{t.desc}</span>
          </button>
        ))}
      </div>

      <div className="nu-card space-y-4">
        {tab === 'configurar' && (
          <div className="bg-nu-info/10 border border-nu-info/30 rounded-lg p-3 mb-2">
            <p className="text-xs text-nu-info">
              ℹ️ Este proceso instalará dependencias via <strong>brew</strong> y <strong>pip3</strong> antes de configurar la Yubikey.
            </p>
          </div>
        )}

        <FormField
          label="Email"
          id="yubikey-email"
          value={email}
          onChange={setEmail}
          placeholder="usuario@nubank.com.br"
          type="email"
          required
        />

        <button
          onClick={() => onRun({ action: ACTION_MAP[tab], params: { email } })}
          disabled={running || !email.trim()}
          className="nu-btn-primary w-full justify-center"
        >
          {running ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : TABS.find(t => t.id === tab)?.icon}
          {TABS.find(t => t.id === tab)?.label}
        </button>
      </div>
    </div>
  )
}
