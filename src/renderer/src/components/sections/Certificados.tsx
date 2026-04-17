import { useState } from 'react'
import FormField from '../FormField'

interface Props { onRun: (cmd: string, args: string[]) => void; onScript: (s: string) => void; running: boolean }
type Tab = 'nubanker_nu' | 'network_nu' | 'nubanker_link' | 'network_link' | 'flujo'

const VLANS = [
  { id: '10', name: 'Eng' }, { id: '11', name: 'Business' }, { id: '12', name: 'People' },
  { id: '13', name: 'Finance' }, { id: '14', name: 'Board' }, { id: '15', name: 'Infosec' },
  { id: '16', name: 'ITops' }, { id: '17', name: 'Xpeer' }, { id: '23', name: 'Rasp' },
  { id: '26', name: 'Psec' }, { id: '30', name: 'Print' }, { id: '31', name: 'Zoom' },
  { id: '32', name: 'Phone' }, { id: '34', name: 'Third' },
]

const TABS = [
  { id: 'nubanker_nu' as Tab, label: 'Nubanker (nu)', icon: '🏦', needsVlan: false },
  { id: 'network_nu' as Tab, label: 'Red + VLAN (nu)', icon: '🌐', needsVlan: true },
  { id: 'nubanker_link' as Tab, label: 'Nubanker + Link', icon: '🔗', needsVlan: false },
  { id: 'network_link' as Tab, label: 'Red + Link', icon: '🔗🌐', needsVlan: true },
  { id: 'flujo' as Tab, label: 'Flujo Completo', icon: '⚡', needsVlan: true },
]

export default function Certificados({ onRun, onScript, running }: Props) {
  const [tab, setTab] = useState<Tab>('nubanker_nu')
  const [email, setEmail] = useState('')
  const [vlan, setVlan] = useState('')

  const current = TABS.find(t => t.id === tab)!

  const handleRun = () => {
    if (tab === 'nubanker_nu') onRun('nu', ['certs', 'gen', 'nubanker', 'prod', email])
    else if (tab === 'network_nu') onRun('nu', ['certs', 'gen', 'network', 'prod', email, vlan])
    else if (tab === 'nubanker_link') onScript(`nu-ist certs gen nubanker prod "${email}" --overwrite\nnu-ist certs gen-link nubanker "${email}"`)
    else if (tab === 'network_link') onScript(`nu-ist certs gen network prod "${email}" "${vlan}"\nnu-ist certs gen-link network "${email}"`)
    else if (tab === 'flujo') onScript(`echo "→ Paso 1: Certificado Nubanker"\nnu-ist certs gen nubanker prod "${email}" --overwrite\nnu-ist certs gen-link nubanker "${email}"\necho "→ Paso 2: Certificado Red"\nnu-ist certs gen network prod "${email}" "${vlan}"\nnu-ist certs gen-link network "${email}"\necho "✓ Flujo completado"`)
  }

  const isValid = () => !!(email.trim() && (!current.needsVlan || vlan))

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Certificados</h2>
        <p className="text-[#C9B3D9]/50 text-sm mt-1">Genera certificados de red y Nubanker.</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all
              ${tab === t.id ? 'bg-[#820AD1] text-white shadow-md' : 'bg-[#2C1052] border border-[#4A1D7A] text-[#C9B3D9]/60 hover:border-[#820AD1]/50'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="nu-card space-y-4">
        <FormField label="Email" id="cert-email" value={email} onChange={setEmail} placeholder="usuario@nubank.com.br" type="email" required />

        {current.needsVlan && (
          <div>
            <label className="nu-label">VLAN <span className="text-[#E04045]">*</span></label>
            <div className="grid grid-cols-5 gap-1.5">
              {VLANS.map(v => (
                <button key={v.id} onClick={() => setVlan(v.id)}
                  className={`py-1.5 rounded-lg text-[10px] font-medium text-center transition-all
                    ${vlan === v.id ? 'bg-[#820AD1] text-white' : 'bg-[#0F001E] border border-[#4A1D7A] text-[#C9B3D9]/60 hover:border-[#820AD1]/50'}`}>
                  <div className="font-mono font-bold">{v.id}</div>
                  <div className="opacity-70">{v.name}</div>
                </button>
              ))}
            </div>
            {vlan && <p className="mt-1.5 text-xs text-[#0DBA6A]">✓ VLAN {vlan} — {VLANS.find(v => v.id === vlan)?.name}</p>}
          </div>
        )}

        <button onClick={handleRun} disabled={running || !isValid()} className="nu-btn-primary w-full justify-center">
          {running ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : current.icon}
          {current.label}
        </button>
      </div>
    </div>
  )
}
