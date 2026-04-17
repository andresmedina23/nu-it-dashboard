import { useState } from 'react'
import FormField from '../FormField'
import type { RunParams } from '../../types'

interface Props {
  onRun: (p: RunParams) => void
  running: boolean
}

type Tab = 'nubanker_nu' | 'network_nu' | 'nubanker_link' | 'network_link' | 'flujo'

const VLANS = [
  { id: '10', name: 'Eng' },
  { id: '11', name: 'Business' },
  { id: '12', name: 'People' },
  { id: '13', name: 'Finance' },
  { id: '14', name: 'Board' },
  { id: '15', name: 'Infosec' },
  { id: '16', name: 'ITops' },
  { id: '17', name: 'Xpeer' },
  { id: '23', name: 'Rasp' },
  { id: '26', name: 'Psec' },
  { id: '30', name: 'Print' },
  { id: '31', name: 'Zoom' },
  { id: '32', name: 'Phone' },
  { id: '34', name: 'Third' },
]

const TABS = [
  { id: 'nubanker_nu' as Tab, label: 'Nubanker (nu)', icon: '🏦', needsVlan: false },
  { id: 'network_nu' as Tab, label: 'Red + VLAN (nu)', icon: '🌐', needsVlan: true },
  { id: 'nubanker_link' as Tab, label: 'Nubanker + Link (nu-ist)', icon: '🔗', needsVlan: false },
  { id: 'network_link' as Tab, label: 'Red + Link (nu-ist)', icon: '🔗🌐', needsVlan: true },
  { id: 'flujo' as Tab, label: 'Flujo Completo', icon: '⚡', needsVlan: true },
]

export default function Certificados({ onRun, running }: Props) {
  const [tab, setTab] = useState<Tab>('nubanker_nu')
  const [email, setEmail] = useState('')
  const [vlan, setVlan] = useState('')

  const currentTab = TABS.find(t => t.id === tab)!

  const ACTION_MAP: Record<Tab, string> = {
    nubanker_nu: 'certs.nubanker_nu',
    network_nu: 'certs.network_nu',
    nubanker_link: 'certs.nubanker_link',
    network_link: 'certs.network_link',
    flujo: 'certs.flujo_completo',
  }

  const handleRun = () => {
    onRun({
      action: ACTION_MAP[tab],
      params: { email, ...(currentTab.needsVlan ? { vlan } : {}) },
    })
  }

  const isValid = () => {
    if (!email.trim()) return false
    if (currentTab.needsVlan && !vlan) return false
    return true
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Certificados</h2>
        <p className="text-nu-light/60 text-sm mt-1">Genera certificados de red y Nubanker.</p>
      </div>

      {/* Tab pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
              ${tab === t.id
                ? 'bg-nu-purple text-white shadow-md shadow-nu-purple/30'
                : 'bg-nu-card border border-nu-border text-nu-light/70 hover:border-nu-purple/50'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="nu-card space-y-4">
        <FormField
          label="Email"
          id="cert-email"
          value={email}
          onChange={setEmail}
          placeholder="usuario@nubank.com.br"
          type="email"
          required
        />

        {currentTab.needsVlan && (
          <div>
            <label className="nu-label">VLAN <span className="text-nu-error">*</span></label>
            <div className="grid grid-cols-4 gap-2">
              {VLANS.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVlan(v.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 text-center
                    ${vlan === v.id
                      ? 'bg-nu-purple text-white shadow-md'
                      : 'bg-nu-deeper border border-nu-border text-nu-light/70 hover:border-nu-purple/50 hover:text-white'}`}
                >
                  <div className="font-mono font-bold">{v.id}</div>
                  <div className="text-[10px] opacity-75">{v.name}</div>
                </button>
              ))}
            </div>
            {vlan && (
              <p className="mt-2 text-xs text-nu-success">
                ✓ VLAN {vlan} — {VLANS.find(v => v.id === vlan)?.name} seleccionada
              </p>
            )}
          </div>
        )}

        {tab === 'flujo' && (
          <div className="bg-nu-purple/10 border border-nu-purple/30 rounded-lg p-3">
            <p className="text-xs text-nu-accent">
              ⚡ El flujo completo generará el cert Nubanker + Red con su link de descarga.
            </p>
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={running || !isValid()}
          className="nu-btn-primary w-full justify-center"
        >
          {running ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : currentTab.icon}
          {currentTab.label}
        </button>
      </div>
    </div>
  )
}
