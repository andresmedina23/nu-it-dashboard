import { useState } from 'react'
import FormField from '../FormField'
import type { RunParams } from '../../types'

interface Props {
  onRun: (p: RunParams) => void
  running: boolean
}

type Tab = 'checkout' | 'checkin' | 'checkin_update' | 'update_status' | 'update_multiple' | 'crear_usuario'

const TABS = [
  { id: 'checkout' as Tab, label: 'Checkout', icon: '📤', desc: 'Asignar activo' },
  { id: 'checkin' as Tab, label: 'Checkin', icon: '📥', desc: 'Desasignar activo' },
  { id: 'checkin_update' as Tab, label: 'Checkin + Update', icon: '🔄', desc: 'Flujo completo' },
  { id: 'update_status' as Tab, label: 'Update Status', icon: '📊', desc: 'Individual' },
  { id: 'update_multiple' as Tab, label: 'Update Múltiple', icon: '📦', desc: 'Varios assets' },
  { id: 'crear_usuario' as Tab, label: 'Crear Usuario', icon: '👤', desc: 'Nuevo usuario' },
]

export default function Inventario({ onRun, running }: Props) {
  const [tab, setTab] = useState<Tab>('checkout')
  const [email, setEmail] = useState('')
  const [tag, setTag] = useState('')
  const [country, setCountry] = useState('co')
  const [multiTags, setMultiTags] = useState('')

  const handleRun = () => {
    const tags = multiTags
      .split(/[\n,\s]+/)
      .map(t => t.trim().replace(/^CO-/i, ''))
      .filter(Boolean)

    const map: Record<Tab, RunParams> = {
      checkout: { action: 'inv.checkout', params: { email, tag } },
      checkin: { action: 'inv.checkin', params: { tag } },
      checkin_update: { action: 'inv.checkin_update', params: { tag } },
      update_status: { action: 'inv.update_status', params: { tag } },
      update_multiple: { action: 'inv.update_multiple', params: { tags } },
      crear_usuario: { action: 'inv.crear_usuario', params: { email, country } },
    }
    onRun(map[tab])
  }

  const isValid = () => {
    if (tab === 'checkout') return !!email.trim() && !!tag.trim()
    if (tab === 'crear_usuario') return !!email.trim()
    if (tab === 'update_multiple') return !!multiTags.trim()
    return !!tag.trim()
  }

  const currentTab = TABS.find(t => t.id === tab)!

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Inventario</h2>
        <p className="text-nu-light/60 text-sm mt-1">Gestión de activos IT — Colombia.</p>
      </div>

      {/* Tab grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200
              ${tab === t.id
                ? 'bg-nu-purple text-white shadow-lg shadow-nu-purple/30'
                : 'nu-card hover:border-nu-purple/50 text-nu-light/70 hover:text-white'}`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-xs font-medium text-center">{t.label}</span>
            <span className={`text-[10px] ${tab === t.id ? 'text-white/60' : 'text-nu-light/40'}`}>{t.desc}</span>
          </button>
        ))}
      </div>

      <div className="nu-card space-y-4">
        {/* Email field */}
        {(tab === 'checkout' || tab === 'crear_usuario') && (
          <FormField
            label="Email usuario"
            id="inv-email"
            value={email}
            onChange={setEmail}
            placeholder="usuario@nubank.com.br"
            type="email"
            required
          />
        )}

        {/* Single tag field */}
        {(tab === 'checkout' || tab === 'checkin' || tab === 'checkin_update' || tab === 'update_status') && (
          <div>
            <label className="nu-label">Asset Tag <span className="text-nu-error">*</span></label>
            <div className="flex items-center gap-2">
              <span className="text-nu-light/50 text-sm font-mono bg-nu-deeper border border-nu-border rounded-lg px-3 py-2.5 flex-shrink-0">
                CO-
              </span>
              <input
                value={tag}
                onChange={e => setTag(e.target.value)}
                placeholder="0012345"
                className="nu-input flex-1"
              />
            </div>
            {tag && (
              <p className="mt-1 text-xs text-nu-success font-mono">→ CO-{tag}</p>
            )}
          </div>
        )}

        {/* Multiple tags */}
        {tab === 'update_multiple' && (
          <div>
            <label className="nu-label">Asset Tags (uno por línea) <span className="text-nu-error">*</span></label>
            <textarea
              value={multiTags}
              onChange={e => setMultiTags(e.target.value)}
              placeholder={"0012345\n0012346\nCO-0012347"}
              rows={6}
              className="nu-input font-mono resize-none"
            />
            <p className="mt-1 text-xs text-nu-light/40">
              Puedes pegar con o sin el prefijo CO-. Se procesan {multiTags.split(/[\n,\s]+/).filter(t => t.trim()).length} asset(s).
            </p>
          </div>
        )}

        {/* Country field */}
        {tab === 'crear_usuario' && (
          <div>
            <label className="nu-label">País</label>
            <div className="flex gap-2">
              {['co', 'br', 'mx', 'ar'].map(c => (
                <button
                  key={c}
                  onClick={() => setCountry(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-mono font-bold uppercase transition-all
                    ${country === c
                      ? 'bg-nu-purple text-white'
                      : 'bg-nu-deeper border border-nu-border text-nu-light/60 hover:border-nu-purple/50'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'checkin_update' && (
          <div className="bg-nu-purple/10 border border-nu-purple/30 rounded-lg p-3">
            <p className="text-xs text-nu-accent">
              ⚡ Ejecutará <strong>checkin</strong> seguido de <strong>updatestatus</strong> en secuencia.
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
