import { useState } from 'react'
import FormField from '../FormField'

interface Props { onRun: (cmd: string, args: string[]) => void; running: boolean }
type Tab = 'recovery' | 'ztd_enroll' | 'ztd_remove' | 'admin' | 'unlock'

// NOTE: 'it send cert ztd' fue ELIMINADO del CLI — ya no existe
const TABS = [
  { id: 'recovery' as Tab, label: 'Recovery Key', icon: '🔓' },
  { id: 'ztd_enroll' as Tab, label: 'ZTD Enroll', icon: '✅' },
  { id: 'ztd_remove' as Tab, label: 'ZTD Remove', icon: '❌' },
  { id: 'admin' as Tab, label: 'Admin Temp', icon: '🛡️' },
  { id: 'unlock' as Tab, label: 'Unlock', icon: '🔐' },
]

export default function JAMF({ onRun, running }: Props) {
  const [tab, setTab] = useState<Tab>('recovery')
  const [serial, setSerial] = useState('')
  const [motivo, setMotivo] = useState('')
  const [username, setUsername] = useState('')
  const [tiempo, setTiempo] = useState('60')

  const handleRun = () => {
    const map: Record<Tab, [string, string[]]> = {
      recovery: ['it', ['jamf', 'computer', 'get', 'recovery-key', serial, motivo || 'Soporte Técnico']],
      ztd_enroll: ['it', ['jamf', 'computer', 'update', 'prestage-enrollment', 'ztd', serial, motivo || 'Testing CO ZTD']],
      ztd_remove: ['it', ['jamf', 'computer', 'update', 'prestage-enrollment', 'nubank', serial, 'failure']],
      admin: ['it', ['jamf', 'group', 'add', serial, '--localadmin', '--time', tiempo]],
      unlock: ['it', ['jamf', 'computer', 'unlock', serial, username, motivo || 'unlock']],
    }
    onRun(...map[tab])
  }

  const isValid = () => {
    if (tab === 'unlock') return !!serial.trim() && !!username.trim()
    return !!serial.trim()
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">JAMF</h2>
        <p className="text-[#C9B3D9]/50 text-sm mt-1">Gestión de equipos macOS.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-medium transition-all
              ${tab === t.id ? 'bg-[#820AD1] text-white shadow-lg shadow-[#820AD1]/30' : 'nu-card hover:border-[#820AD1]/50 text-[#C9B3D9]/60 hover:text-white'}`}>
            <span className="text-xl">{t.icon}</span>
            <span className="text-center">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="nu-card space-y-4">
        <FormField label="Serial Mac" id="jamf-serial" value={serial} onChange={setSerial} placeholder="C02XYZ1234AB" required />

        {(tab === 'recovery' || tab === 'ztd_enroll' || tab === 'unlock') && (
          <FormField label="Motivo" id="jamf-motivo" value={motivo} onChange={setMotivo}
            placeholder={tab === 'ztd_enroll' ? 'Testing CO ZTD' : tab === 'unlock' ? 'unlock' : 'Soporte Técnico'} />
        )}

        {tab === 'unlock' && (
          <FormField label="Username / Email" id="jamf-username" value={username} onChange={setUsername}
            placeholder="usuario@nubank.com.br" required />
        )}

        {tab === 'admin' && (
          <>
            <FormField label="Tiempo (minutos)" id="jamf-tiempo" value={tiempo} onChange={setTiempo} type="number" hint="Recomendado: 60 min" />
            <div className="bg-[#F6AE2D]/10 border border-[#F6AE2D]/30 rounded-lg p-3 text-xs text-[#F6AE2D]">
              ⚠️ El usuario debe abrir <strong>ITENG Self Service → "Make me an admin"</strong>
            </div>
          </>
        )}

        <button onClick={handleRun} disabled={running || !isValid()} className="nu-btn-primary w-full justify-center">
          {running ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : TABS.find(t => t.id === tab)?.icon}
          {TABS.find(t => t.id === tab)?.label}
        </button>
      </div>
    </div>
  )
}
