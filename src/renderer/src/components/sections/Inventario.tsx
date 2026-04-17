import { useState, useEffect } from 'react'
import type { AutoResponse } from '../../hooks/usePty'

interface Props {
  onRun: (cmd: string, args: string[]) => void
  onScript: (s: string) => void
  running: boolean
  onAutoResponses: (responses: AutoResponse[]) => void
}

type Tab = 'checkout_completo' | 'checkin' | 'checkin_update' | 'update_status' | 'update_multiple' | 'crear_usuario'

const TABS = [
  { id: 'checkout_completo' as Tab, label: 'Checkout',          icon: '📤', desc: 'Asignar activo', highlight: true },
  { id: 'checkin' as Tab,           label: 'Checkin',           icon: '📥', desc: 'Devolver activo' },
  { id: 'checkin_update' as Tab,    label: 'Checkin + Update',  icon: '🔄', desc: 'Flujo completo' },
  { id: 'update_status' as Tab,     label: 'Update Status',     icon: '📊', desc: 'Individual' },
  { id: 'update_multiple' as Tab,   label: 'Update Multiple',   icon: '📦', desc: 'Varios assets' },
  { id: 'crear_usuario' as Tab,     label: 'Crear Usuario',     icon: '👤', desc: 'Nuevo usuario' },
]

// Known Colombia office locations with their list numbers in the `it` CLI
const CO_LOCATIONS = [
  { label: 'COL-HQ1-03',    num: '40' },
  { label: 'Otro (manual)', num: ''   },
]

// Known status options with their list numbers in the `it` CLI
const STATUSES = [
  { label: 'In Use',           num: '6'  },
  { label: 'In Stock',         num: '11' },
  { label: 'Assessment',       num: '4'  },
  { label: 'Maintenance',      num: '10' },
  { label: 'Ready to Return',  num: '1'  },
  { label: 'In Transit',       num: '5'  },
  { label: 'Retired',          num: '2'  },
  { label: 'Otro (manual)',    num: ''   },
]

/** Extrae el username del campo: acepta "sou.goku" o "sou.goku@nubank.com.br" */
function toUsername(raw: string): string {
  return raw.trim().split('@')[0].trim()
}

/** Normaliza el tag a formato CO-XXXX: acepta "CO-FVFKDC8C1WFV" o "FVFKDC8C1WFV" */
function toTag(raw: string): string {
  const clean = raw.trim().replace(/^CO-/i, '').trim().toUpperCase()
  return clean ? `CO-${clean}` : ''
}

export default function Inventario({ onRun, onScript, running, onAutoResponses }: Props) {
  const [tab, setTab]           = useState<Tab>('checkout_completo')
  const [userRaw, setUserRaw]   = useState('')
  const [tagRaw, setTagRaw]     = useState('')
  const [country, setCountry]   = useState('co')
  const [multiTags, setMultiTags] = useState('')

  // Location picker for checkin / checkin_update
  const [locationPreset, setLocationPreset] = useState(CO_LOCATIONS[0].num)
  const [locationManual, setLocationManual] = useState('')

  // Status picker for update_status / update_multiple / checkin_update
  const [statusPreset, setStatusPreset] = useState(STATUSES[0].num)
  const [statusManual, setStatusManual]  = useState('')

  const username = toUsername(userRaw)
  const tagCode  = toTag(tagRaw)

  // Effective numbers sent to PTY
  const locationNum = locationPreset !== '' ? locationPreset : locationManual.trim()
  const statusNum   = statusPreset   !== '' ? statusPreset   : statusManual.trim()

  // Update auto-responses whenever tab, location, or status changes
  useEffect(() => {
    const responses: AutoResponse[] = []

    const needsLocation = ['checkin', 'checkin_update', 'update_multiple'].includes(tab)
    const needsStatus   = ['update_status', 'checkin_update', 'update_multiple'].includes(tab)

    if (needsLocation && locationNum) {
      responses.push({
        pattern: /Enter the number corresponding to the location/i,
        response: locationNum,
        label: `location ${locationNum}`,
        once: tab !== 'update_multiple',  // fire every time for batch
      })
    }

    if (needsStatus && statusNum) {
      responses.push({
        pattern: /Enter the number corresponding to the status you want to update/i,
        response: statusNum,
        label: `status ${statusNum}`,
        once: tab !== 'update_multiple',  // fire every time for batch
      })
    }

    onAutoResponses(responses)
  }, [tab, locationNum, statusNum, onAutoResponses])

  const handleRun = () => {
    if (tab === 'checkout_completo') {
      onRun('it', ['inventory', 'asset', 'checkout', username, tagCode])
    }

    else if (tab === 'checkin')
      onRun('it', ['inventory', 'asset', 'checkin', tagCode])
    else if (tab === 'checkin_update')
      onScript(
`echo "→ Checkin"
it inventory asset checkin "${tagCode}"
echo "→ Update Status"
it inventory asset updatestatus "${tagCode}"
echo "✓ Flujo completado"`
      )
    else if (tab === 'update_status')
      onRun('it', ['inventory', 'asset', 'updatestatus', tagCode])
    else if (tab === 'update_multiple') {
      const tags = multiTags.split(/[\n,\s]+/).map(toTag).filter(Boolean)
      const lines = tags.map(t => `echo "→ ${t}..."\nit inventory asset updatestatus "${t}" --country co`).join('\n')
      onScript(`${lines}\necho "✓ Procesados: ${tags.length} assets"`)
    }
    else if (tab === 'crear_usuario')
      onRun('it', ['inventory', 'user', 'create', username, '--country', country])
  }

  const isValid = () => {
    const needsUser = ['checkout_completo','crear_usuario'].includes(tab)
    const needsTag  = ['checkout_completo','checkin','checkin_update','update_status'].includes(tab)
    if (needsUser && !username) return false
    if (needsTag  && !tagCode)  return false
    if (tab === 'update_multiple' && !multiTags.trim()) return false
    return true
  }

  const current      = TABS.find(t => t.id === tab)!
  const needsUser    = ['checkout_completo','crear_usuario'].includes(tab)
  const needsTag     = ['checkout_completo','checkin','checkin_update','update_status'].includes(tab)
  const needsCountry = ['checkout_completo','crear_usuario'].includes(tab)
  const needsLocation = ['checkin', 'checkin_update', 'update_multiple'].includes(tab)
  const needsStatus   = ['update_status', 'checkin_update', 'update_multiple'].includes(tab)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Inventario</h2>
        <p className="text-[#C9B3D9]/50 text-sm mt-1">Gestión de activos IT — Colombia.</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 mb-5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl text-center transition-all
              ${tab === t.id
                ? 'bg-[#820AD1] text-white shadow-lg shadow-[#820AD1]/30'
                : t.highlight
                  ? 'bg-[#820AD1]/10 border border-[#820AD1]/50 text-[#A842FF] hover:bg-[#820AD1]/20'
                  : 'nu-card text-[#C9B3D9]/60 hover:text-white hover:border-[#820AD1]/50'}`}>
            <span className="text-lg">{t.icon}</span>
            <span className="text-[11px] font-medium leading-tight">{t.label}</span>
            <span className={`text-[10px] leading-tight ${tab === t.id ? 'text-white/60' : 'text-[#C9B3D9]/30'}`}>{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Checkout completo info */}

      <div className="nu-card space-y-4">

        {/* Username field */}
        {needsUser && (
          <div>
            <label className="nu-label">
              Username <span className="text-[#E04045]">*</span>
            </label>
            <input
              value={userRaw}
              onChange={e => setUserRaw(e.target.value)}
              placeholder="sou.goku  o  sou.goku@nubank.com.br"
              className="nu-input"
            />
            {username && (
              <p className="mt-1 text-[11px] font-mono">
                <span className="text-[#C9B3D9]/40">→ se usará: </span>
                <span className="text-[#0DBA6A]">{username}</span>
              </p>
            )}
          </div>
        )}

        {/* Asset tag field */}
        {needsTag && (
          <div>
            <label className="nu-label">
              Asset Tag <span className="text-[#E04045]">*</span>
            </label>
            <input
              value={tagRaw}
              onChange={e => setTagRaw(e.target.value)}
              placeholder="FVFKDC8C1WFV  o  CO-FVFKDC8C1WFV"
              className="nu-input font-mono"
            />
            {tagCode && (
              <p className="mt-1 text-[11px] font-mono">
                <span className="text-[#C9B3D9]/40">→ se usará: </span>
                <span className="text-[#0DBA6A]">{tagCode}</span>
              </p>
            )}
          </div>
        )}

        {/* Multiple tags */}
        {tab === 'update_multiple' && (
          <div>
            <label className="nu-label">Asset Tags — uno por línea <span className="text-[#E04045]">*</span></label>
            <textarea
              value={multiTags}
              onChange={e => setMultiTags(e.target.value)}
              placeholder={'JYG734HQ6K\nABC123\nCO-XYZ789'}
              rows={5}
              className="nu-input font-mono resize-none selectable"
            />
            <p className="mt-1 text-[11px] text-[#C9B3D9]/40">
              {multiTags.split(/[\n,\s]+/).filter(t => t.trim()).length} asset(s) · CO- se extrae automáticamente
            </p>
          </div>
        )}

        {/* Country */}
        {needsCountry && (
          <div>
            <label className="nu-label">País</label>
            <div className="flex gap-2">
              {['co', 'br', 'mx', 'ar'].map(c => (
                <button key={c} onClick={() => setCountry(c)}
                  className={`flex-1 py-2 rounded-lg text-sm font-mono font-bold uppercase transition-all
                    ${country === c
                      ? 'bg-[#820AD1] text-white'
                      : 'bg-[#0F001E] border border-[#4A1D7A] text-[#C9B3D9]/60 hover:border-[#820AD1]/50'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Location picker — for checkin / checkin_update / update_multiple */}
        {needsLocation && (
          <div>
            <label className="nu-label">
              Ubicación <span className="text-[11px] text-[#C9B3D9]/30">(auto-enviada al CLI)</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {CO_LOCATIONS.map(loc => (
                <button key={loc.label} onClick={() => { setLocationPreset(loc.num); if (loc.num) setLocationManual('') }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] text-left transition-all leading-tight
                    ${locationPreset === loc.num && loc.num !== ''
                      ? 'bg-[#820AD1] text-white'
                      : 'bg-[#0F001E] border border-[#4A1D7A] text-[#C9B3D9]/60 hover:border-[#820AD1]/50'}`}>
                  {loc.label}
                </button>
              ))}
            </div>
            {/* Manual number input when "Otro" selected */}
            {locationPreset === '' && (
              <input
                value={locationManual}
                onChange={e => setLocationManual(e.target.value)}
                placeholder="Número de lista (ej: 55)"
                className="nu-input font-mono"
              />
            )}
            {locationNum && (
              <p className="mt-1 text-[11px] font-mono text-[#C9B3D9]/40">
                → auto-enviará: <span className="text-[#0DBA6A]">{locationNum}</span>
              </p>
            )}
          </div>
        )}

        {/* Status picker — for update_status / checkin_update / update_multiple */}
        {needsStatus && (
          <div>
            <label className="nu-label">
              Status <span className="text-[11px] text-[#C9B3D9]/30">(auto-enviado al CLI)</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {STATUSES.map(s => (
                <button key={s.label} onClick={() => { setStatusPreset(s.num); if (s.num) setStatusManual('') }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] text-left transition-all leading-tight
                    ${statusPreset === s.num && s.num !== ''
                      ? 'bg-[#820AD1] text-white'
                      : 'bg-[#0F001E] border border-[#4A1D7A] text-[#C9B3D9]/60 hover:border-[#820AD1]/50'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {statusPreset === '' && (
              <input
                value={statusManual}
                onChange={e => setStatusManual(e.target.value)}
                placeholder="Número de lista (ej: 5)"
                className="nu-input font-mono"
              />
            )}
            {statusNum && (
              <p className="mt-1 text-[11px] font-mono text-[#C9B3D9]/40">
                → auto-enviará: <span className="text-[#0DBA6A]">{statusNum}</span>
              </p>
            )}
          </div>
        )}

        {tab === 'checkin_update' && (
          <div className="bg-[#820AD1]/10 border border-[#820AD1]/30 rounded-lg p-3 text-xs text-[#A842FF]">
            ⚡ Ejecuta <strong>checkin</strong> → <strong>updatestatus</strong> en secuencia.
          </div>
        )}

        <button onClick={handleRun} disabled={running || !isValid()} className="nu-btn-primary w-full justify-center py-3">
          {running
            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <span>{current.icon}</span>}
          {current.label}
        </button>
      </div>
    </div>
  )
}
