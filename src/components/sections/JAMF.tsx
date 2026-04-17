import { useState } from 'react'
import FormField from '../FormField'
import type { RunParams } from '../../types'

interface Props {
  onRun: (p: RunParams) => void
  running: boolean
}

type Tab = 'recovery' | 'ztd_enroll' | 'ztd_remove' | 'cert' | 'admin' | 'unlock'

const TABS = [
  { id: 'recovery' as Tab, label: 'Recovery Key', icon: '🔓', color: 'text-yellow-400' },
  { id: 'ztd_enroll' as Tab, label: 'ZTD Enroll', icon: '✅', color: 'text-green-400' },
  { id: 'ztd_remove' as Tab, label: 'ZTD Remove', icon: '❌', color: 'text-red-400' },
  { id: 'cert' as Tab, label: 'Cert ZTD', icon: '📜', color: 'text-blue-400' },
  { id: 'admin' as Tab, label: 'Admin Temp', icon: '🛡️', color: 'text-purple-400' },
  { id: 'unlock' as Tab, label: 'Unlock', icon: '🔐', color: 'text-nu-accent' },
]

export default function JAMF({ onRun, running }: Props) {
  const [tab, setTab] = useState<Tab>('recovery')
  const [serial, setSerial] = useState('')
  const [motivo, setMotivo] = useState('')
  const [username, setUsername] = useState('')
  const [tiempo, setTiempo] = useState('60')

  const handleRun = () => {
    const map: Record<Tab, () => RunParams> = {
      recovery: () => ({ action: 'jamf.recovery_key', params: { serial, motivo: motivo || 'Soporte Técnico' } }),
      ztd_enroll: () => ({ action: 'jamf.ztd_enroll', params: { serial, motivo: motivo || 'Testing CO ZTD' } }),
      ztd_remove: () => ({ action: 'jamf.ztd_remove', params: { serial } }),
      cert: () => ({ action: 'jamf.send_cert', params: { username } }),
      admin: () => ({ action: 'jamf.admin_temp', params: { serial, tiempo } }),
      unlock: () => ({ action: 'jamf.unlock', params: { serial, username, motivo: motivo || 'unlock' } }),
    }
    onRun(map[tab]())
  }

  const isValid = () => {
    if (tab === 'cert') return !!username.trim()
    if (tab === 'unlock') return !!serial.trim() && !!username.trim()
    return !!serial.trim()
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">JAMF</h2>
        <p className="text-nu-light/60 text-sm mt-1">Gestión de equipos macOS.</p>
      </div>

      {/* Tab grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all duration-200
              ${tab === t.id
                ? 'bg-nu-purple text-white shadow-lg shadow-nu-purple/30'
                : 'bg-nu-card border border-nu-border text-nu-light/70 hover:border-nu-purple/50 hover:text-white'}`}
          >
            <span className="text-xl">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="nu-card space-y-4">
        {/* Serial field — most tabs need it */}
        {tab !== 'cert' && (
          <FormField
            label="Serial Mac"
            id="jamf-serial"
            value={serial}
            onChange={setSerial}
            placeholder="C02XYZ1234AB"
            required
          />
        )}

        {/* Tab-specific fields */}
        {(tab === 'recovery' || tab === 'ztd_enroll' || tab === 'unlock') && (
          <FormField
            label={tab === 'unlock' ? 'Motivo' : 'Motivo'}
            id="jamf-motivo"
            value={motivo}
            onChange={setMotivo}
            placeholder={tab === 'ztd_enroll' ? 'Testing CO ZTD' : tab === 'unlock' ? 'unlock' : 'Soporte Técnico'}
          />
        )}

        {(tab === 'cert' || tab === 'unlock') && (
          <FormField
            label="Username / Email"
            id="jamf-username"
            value={username}
            onChange={setUsername}
            placeholder="usuario@nubank.com.br"
            required
          />
        )}

        {tab === 'admin' && (
          <FormField
            label="Tiempo (minutos)"
            id="jamf-tiempo"
            value={tiempo}
            onChange={setTiempo}
            placeholder="60"
            type="number"
            hint="Recomendado: 60 minutos"
          />
        )}

        {tab === 'admin' && (
          <div className="bg-nu-warning/10 border border-nu-warning/30 rounded-lg p-3">
            <p className="text-xs text-nu-warning">
              ⚠️ Después de ejecutar, el usuario debe abrir <strong>ITENG Self Service → "Make me an admin"</strong>
            </p>
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={running || !isValid()}
          className="nu-btn-primary w-full justify-center"
        >
          {running ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : TABS.find(t => t.id === tab)?.icon}
          {TABS.find(t => t.id === tab)?.label}
        </button>
      </div>
    </div>
  )
}
