import { useState, useEffect, useRef, useCallback } from 'react'
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

// ─── Sheets Sync Types ──────────────────────────────────────

interface SheetsConfig {
  webAppUrl: string
  enabled: boolean
  autoSync: boolean
}

interface SheetChange {
  timestamp: string
  serial: string
  field: 'ESTATUS' | 'DISPONIBLE'
  newValue: string
  oldValue: string
  row: number
  col: number
  block: string
  by: string
}

type SyncStatus = 'idle' | 'connecting' | 'connected' | 'error'

// Status number → label
const STATUS_NUM_TO_LABEL: Record<string, string> = {
  '6': 'In Use', '11': 'In Stock', '4': 'Assessment',
  '10': 'Maintenance', '1': 'Ready to Return', '5': 'In Transit', '2': 'Retired',
}

// Mapping: valor en DISPONIBLE del sheet → número de status en CLI
// needsCheckin: true → correr checkin antes de updatestatus
const SHEET_STATUS_MAP: Record<string, { num: string; needsCheckin?: boolean }> = {
  'in stock':        { num: '11', needsCheckin: true },
  'in use':          { num: '6'  },
  'assessment':      { num: '4'  },
  'maintenance':     { num: '10' },
  'ready to return': { num: '1'  },
  'retired':         { num: '2'  },
}

// ─── Component ──────────────────────────────────────────────

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

  // Estado del asset desde el sheet (lookup por serial)
  const [assetStatus, setAssetStatus] = useState<{ disponible: string; fecha?: string } | null>(null)
  const [assetStatusLoading, setAssetStatusLoading] = useState(false)

  useEffect(() => {
    const serial = tagCode.replace(/^CO-/i, '')
    if (!serial || serial.length < 8) { setAssetStatus(null); return }
    const timer = setTimeout(async () => {
      setAssetStatusLoading(true)
      try {
        const api = (window as any).electronAPI
        const res = await api.sheetsQuery(serial)
        setAssetStatus(res.ok ? { disponible: res.disponible, fecha: res.fecha } : null)
      } catch {
        setAssetStatus(null)
      } finally {
        setAssetStatusLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [tagCode])

  // Effective numbers sent to PTY
  const locationNum = locationPreset !== '' ? locationPreset : locationManual.trim()
  const statusNum   = statusPreset   !== '' ? statusPreset   : statusManual.trim()

  // ─── Google Sheets Sync state ──────────────────────────────
  const [sheetsCfg, setSheetsCfg]         = useState<SheetsConfig | null>(null)
  const [syncStatus, setSyncStatus]       = useState<SyncStatus>('idle')
  const [recentChanges, setRecentChanges] = useState<SheetChange[]>([])
  const [lastSyncAt, setLastSyncAt]       = useState<Date | null>(null)
  const [syncExpanded, setSyncExpanded]   = useState(false)
  const [urlDraft, setUrlDraft]           = useState('')
  const [syncResult, setSyncResult]       = useState<string | null>(null)
  const [googleOk, setGoogleOk]           = useState(false)
  const [connOk, setConnOk]               = useState<boolean | null>(null)
  const [checking, setChecking]           = useState(false)
  const [signingIn, setSigningIn]         = useState(false)

  // Log de operaciones auto-sync (manual + automático)
  interface SyncLogEntry {
    time: Date
    serial: string
    action: string
    ok: boolean
    block?: string
  }
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([])

  // Track running → false to auto-sync
  const prevRunning = useRef(false)
  const lastRunRef  = useRef<{ serial: string; action: 'checkout' | 'checkin' | 'updatestatus'; status?: string } | null>(null)

  const checkConnection = useCallback(async (url: string) => {
    if (!url) { setConnOk(null); return }
    setChecking(true)
    const api = (window as any).electronAPI
    const ok = await api.sheetsCheckConnection(url)
    setConnOk(ok)
    setChecking(false)
  }, [])

  const handleSignIn = useCallback(async () => {
    setSigningIn(true)
    try {
      await (window as any).electronAPI.sheetsSignIn()
      // La ventana se cerró → el usuario completó (o canceló) el login.
      // Marcar sesión como activa — las cookies quedaron en session.defaultSession.
      setGoogleOk(true)
    } finally {
      setSigningIn(false)
    }
    // Si hay URL guardada, verificar conexión con las nuevas cookies
    if (urlDraft) checkConnection(urlDraft)
  }, [urlDraft, checkConnection])

  // Load config on mount
  useEffect(() => {
    const api = (window as any).electronAPI
    api.sheetsConfigGet().then((cfg: SheetsConfig) => {
      setSheetsCfg(cfg)
      setUrlDraft(cfg.webAppUrl)
      if (cfg.enabled && cfg.webAppUrl) {
        setSyncStatus('connecting')
        api.sheetsStart().then(() => setSyncStatus('connected'))
        checkConnection(cfg.webAppUrl)
      }
    })
  }, [checkConnection])

  // Ref para acceder a valores actuales dentro del closure del listener
  const sheetsCfgRef = useRef<SheetsConfig | null>(null)
  useEffect(() => { sheetsCfgRef.current = sheetsCfg }, [sheetsCfg])

  const runningRef = useRef(false)
  useEffect(() => { runningRef.current = running }, [running])

  // Subscribe to sheet changes from main process
  useEffect(() => {
    const api = (window as any).electronAPI
    const unsub = api.onSheetsChange((changes: SheetChange[]) => {
      setLastSyncAt(new Date())
      setSyncStatus('connected')
      setRecentChanges(prev => [...changes.slice().reverse(), ...prev].slice(0, 8))

      const cfg = sheetsCfgRef.current
      if (!cfg?.autoSync) return

      // Solo procesar cambios en DISPONIBLE (es el campo que determina In Stock / In Use)
      const dispChange = changes.find(c => c.field === 'DISPONIBLE')
      if (!dispChange) return

      if (runningRef.current) {
        setSyncResult(`⏳ Cambio recibido (${dispChange.serial}) — espera a que termine el comando actual`)
        setTimeout(() => setSyncResult(null), 5000)
        return
      }

      const serialTag = `CO-${dispChange.serial}`
      const mapped = SHEET_STATUS_MAP[dispChange.newValue.toLowerCase().trim()]
      if (!mapped) return  // valor desconocido → ignorar

      if (mapped.needsCheckin) {
        // In Stock → checkin primero, luego updatestatus
        onAutoResponses([
          {
            pattern: /Enter the number corresponding to the location/i,
            response: '40',
            label: 'sheet→snipe location',
            once: true,
          },
          {
            pattern: /Enter the number corresponding to the status you want to update/i,
            response: mapped.num,
            label: `sheet→snipe ${dispChange.newValue}`,
            once: true,
          },
        ])
        lastRunRef.current = { serial: dispChange.serial, action: 'checkin' }
        onScript(
          `echo "→ Checkin ${serialTag}"\n` +
          `it inventory asset checkin "${serialTag}" --country co\n` +
          `echo "→ Actualizando a ${dispChange.newValue}..."\n` +
          `it inventory asset updatestatus "${serialTag}" --country co\n` +
          `echo "✓ Completado"`
        )
      } else {
        // Otros estados → solo updatestatus
        onAutoResponses([{
          pattern: /Enter the number corresponding to the status you want to update/i,
          response: mapped.num,
          label: `sheet→snipe ${dispChange.newValue}`,
          once: true,
        }])
        lastRunRef.current = { serial: dispChange.serial, action: 'updatestatus', status: dispChange.newValue }
        onRun('it', ['inventory', 'asset', 'updatestatus', serialTag, '--country', 'co'])
      }
      setSyncResult(`▶ ${serialTag} → ${dispChange.newValue}...`)
      setTimeout(() => setSyncResult(null), 6000)
    })
    return unsub
  }, [onAutoResponses, onRun, onScript])

  // Auto-sync when command finishes
  useEffect(() => {
    if (prevRunning.current && !running) {
      const run = lastRunRef.current
      if (run && sheetsCfg?.enabled && sheetsCfg.webAppUrl && run.serial) {
        const api = (window as any).electronAPI
        api.sheetsUpdate({ serial: run.serial, action: run.action, status: run.status })
          .then((result: { ok: boolean; block?: string }) => {
            const label = result.block ? `bloque ${result.block}` : ''
            setSyncResult(result.ok
              ? `✓ Sheet actualizado: ${run.serial} ${label}`.trim()
              : `⚠ No se encontró ${run.serial} en el sheet`)
            setTimeout(() => setSyncResult(null), 4000)
            // Agregar al log
            const actionLabel = run.action === 'checkin' ? 'Checkin + In Stock'
              : run.action === 'checkout' ? 'Checkout'
              : `Update → ${run.status ?? run.action}`
            setSyncLog(prev => [{
              time: new Date(),
              serial: run.serial,
              action: actionLabel,
              ok: result.ok,
              block: result.block,
            }, ...prev].slice(0, 30))
          })
      }
    }
    prevRunning.current = running
  }, [running, sheetsCfg])

  const handleToggleSync = useCallback(async (enabled: boolean) => {
    const api = (window as any).electronAPI
    // Solo guardar el campo enabled — no sobrescribir la URL guardada con el draft
    const updated = await api.sheetsConfigSet({ enabled })
    setSheetsCfg(updated)
    if (enabled && updated.webAppUrl) {
      setSyncStatus('connecting')
      try {
        await api.sheetsStart()
        setSyncStatus('connected')
      } catch {
        setSyncStatus('error')
      }
    } else {
      api.sheetsStop()
      setSyncStatus('idle')
    }
  }, [])

  const handleSaveCfg = useCallback(async () => {
    const api = (window as any).electronAPI
    const updated = await api.sheetsConfigSet({ webAppUrl: urlDraft })
    setSheetsCfg(updated)
    if (urlDraft) checkConnection(urlDraft)
    if (updated.enabled && urlDraft) {
      setSyncStatus('connecting')
      try {
        await api.sheetsStart()
        setSyncStatus('connected')
      } catch {
        setSyncStatus('error')
      }
    }
  }, [urlDraft, checkConnection])

  // Update auto-responses whenever tab, location, or status changes
  useEffect(() => {
    const responses: AutoResponse[] = []

    const needsLocation = ['checkout_completo', 'checkin', 'checkin_update', 'update_multiple'].includes(tab)
    const needsStatus   = ['update_status', 'checkin_update', 'update_multiple'].includes(tab)

    // Auto-respuestas específicas del checkout completo
    if (tab === 'checkout_completo') {
      responses.push({
        pattern: /\(y or n\)/i,
        response: 'y',
        label: 'confirmar → y',
        once: true,
      })
      // Después del checkout también corre updatestatus → responder "6" (In Use)
      responses.push({
        pattern: /Enter the number corresponding to the status/i,
        response: '6',
        label: 'status → In Use',
        once: true,
      })
    }

    if (needsLocation && locationNum) {
      responses.push({
        pattern: /Enter the number corresponding to the location/i,
        response: locationNum,
        label: `location ${locationNum}`,
        once: tab !== 'update_multiple',
      })
    }

    if (needsStatus && statusNum) {
      responses.push({
        pattern: /Enter the number corresponding to the status you want to update/i,
        response: statusNum,
        label: `status ${statusNum}`,
        once: tab !== 'update_multiple',
      })
    }

    onAutoResponses(responses)
  }, [tab, locationNum, statusNum, onAutoResponses])

  const handleRun = () => {
    // Capture serial + action for auto-sync (serial = tagCode sin prefijo CO-)
    const rawSerial = tagCode.replace(/^CO-/i, '')
    const statusLabel = STATUS_NUM_TO_LABEL[statusNum] || statusNum
    if (tab === 'checkout_completo') {
      lastRunRef.current = { serial: rawSerial, action: 'checkout' }
    } else if (tab === 'checkin') {
      lastRunRef.current = { serial: rawSerial, action: 'checkin' }
    } else if (tab === 'checkin_update') {
      lastRunRef.current = { serial: rawSerial, action: 'updatestatus', status: statusLabel }
    } else if (tab === 'update_status') {
      lastRunRef.current = { serial: rawSerial, action: 'updatestatus', status: statusLabel }
    } else if (tab === 'update_multiple') {
      // No hay un solo serial — sync individual no aplica
      lastRunRef.current = null
    } else {
      lastRunRef.current = null
    }

    if (tab === 'checkout_completo') {
      onScript(
        `it inventory asset checkout "${username}" "${tagCode}"\n` +
        `echo "→ Actualizando status a In Use..."\n` +
        `it inventory asset updatestatus "${tagCode}" --country ${country}\n` +
        `echo "✓ Checkout completo"`
      )
    }

    else if (tab === 'checkin')
      onRun('it', ['inventory', 'asset', 'checkin', tagCode])
    else if (tab === 'checkin_update')
      onScript(
`echo "→ Checkin"
it inventory asset checkin "${tagCode}" --country ${country}
echo "→ Update Status"
it inventory asset updatestatus "${tagCode}" --country ${country}
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
  const needsLocation = ['checkout_completo', 'checkin', 'checkin_update', 'update_multiple'].includes(tab)
  const needsStatus   = ['update_status', 'checkin_update', 'update_multiple'].includes(tab)

  const syncEnabled = sheetsCfg?.enabled && !!sheetsCfg.webAppUrl

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Inventario</h2>
        <p className="text-[#C9B3D9]/50 text-sm mt-1">Gestión de activos IT — Colombia.</p>
      </div>

      {/* ─── Google Sheets Sync Panel ───────────────────────── */}
      <div className={`mb-4 rounded-xl border transition-all
        ${syncEnabled
          ? 'bg-[#0A1A10] border-[#0DBA6A]/30'
          : 'bg-[#0F001E] border-[#4A1D7A]/50'}`}>

        {/* Header */}
        <button
          onClick={() => setSyncExpanded(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm">📊</span>
            <span className="text-[12px] font-medium text-[#C9B3D9]/80">Google Sheets Sync</span>
            {running && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0DBA6A] animate-pulse flex-shrink-0" title="Ejecutando comando..." />
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
              ${syncStatus === 'connected' ? 'bg-[#0DBA6A]/20 text-[#0DBA6A]'
                : syncStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400'
                : syncStatus === 'error' ? 'bg-red-500/20 text-red-400'
                : !sheetsCfg?.webAppUrl ? 'bg-[#C9B3D9]/10 text-[#C9B3D9]/30'
                : 'bg-[#C9B3D9]/10 text-[#C9B3D9]/50'}`}>
              {syncStatus === 'connected' ? '● activo'
                : syncStatus === 'connecting' ? '◌ conectando...'
                : syncStatus === 'error' ? '● error'
                : !sheetsCfg?.webAppUrl ? '○ sin configurar'
                : '○ inactivo'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle */}
            <div
              onClick={e => { e.stopPropagation(); handleToggleSync(!syncEnabled) }}
              className={`w-9 h-5 rounded-full transition-all cursor-pointer relative flex-shrink-0
                ${syncEnabled ? 'bg-[#820AD1]' : 'bg-[#4A1D7A]/60'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all
                ${syncEnabled ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            <span className={`text-[10px] transition-all ${syncExpanded ? 'rotate-180' : ''} text-[#C9B3D9]/40`}>▾</span>
          </div>
        </button>

        {/* Last sync + quick change feed */}
        {syncEnabled && !syncExpanded && (
          <div className="px-3 pb-2.5">
            {lastSyncAt && (
              <p className="text-[10px] text-[#C9B3D9]/30 mb-1.5">
                Último sync: {lastSyncAt.toLocaleTimeString()}
              </p>
            )}
            {recentChanges.length > 0 && (
              <div className="space-y-1">
                {recentChanges.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-[#0DBA6A]/60">↓</span>
                    <span className="font-mono text-[#C9B3D9]/70">{c.serial}</span>
                    <span className="text-[#C9B3D9]/30">→</span>
                    <span className="font-medium text-white/80">{c.newValue}</span>
                    <span className="text-[#C9B3D9]/20 ml-auto">{new Date(c.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
            {recentChanges.length === 0 && (
              <p className="text-[10px] text-[#C9B3D9]/30">Sin cambios recientes desde el sheet.</p>
            )}
          </div>
        )}

        {/* Expanded: config + full change log */}
        {syncExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-[#4A1D7A]/30 pt-3">

            {/* Google Sign-In */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all
              ${googleOk ? 'bg-[#0DBA6A]/10 border-[#0DBA6A]/30' : 'bg-[#0F001E] border-[#4A1D7A]/40'}`}>
              <div>
                <p className="text-[11px] font-medium text-white">Sesión Google</p>
                <p className={`text-[10px] mt-0.5 ${googleOk ? 'text-[#0DBA6A]' : 'text-[#C9B3D9]/40'}`}>
                  {signingIn
                    ? '◌ Abre la ventana de Google y ciérrala al terminar...'
                    : googleOk
                      ? '● Sesión activa — cookies guardadas en la app'
                      : '○ Sin sesión — inicia sesión con tu cuenta Nubank'}
                </p>
              </div>
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                style={{ cursor: signingIn ? 'wait' : 'pointer' }}
                className={`ml-3 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all select-none flex-shrink-0
                  ${signingIn
                    ? 'opacity-50'
                    : googleOk
                      ? 'bg-[#0DBA6A]/20 text-[#0DBA6A] hover:bg-[#0DBA6A]/30 active:scale-95'
                      : 'bg-[#820AD1] text-white hover:bg-[#9B14F5] active:scale-95'}`}>
                {signingIn ? '⏳' : googleOk ? 'Reconectar' : 'Conectar con Google'}
              </button>
            </div>

            {/* URL config + estado de conexión */}
            <div>
              <label className="nu-label text-[11px]">Apps Script Web App URL</label>
              <div className="flex gap-1.5">
                <input
                  value={urlDraft}
                  onChange={e => { setUrlDraft(e.target.value); setConnOk(null) }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="nu-input text-[11px] font-mono flex-1"
                />
                <button
                  onClick={() => handleSaveCfg()}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] bg-[#820AD1] text-white hover:bg-[#9B14F5] active:scale-95 cursor-pointer transition-all flex-shrink-0 select-none">
                  Guardar
                </button>
              </div>
              {/* Estado conexión */}
              {urlDraft && (
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    onClick={() => checkConnection(urlDraft)}
                    disabled={checking}
                    className="text-[10px] text-[#A842FF] hover:text-[#C9B3D9] cursor-pointer transition-colors select-none">
                    {checking ? '◌ Verificando...' : '↺ Probar conexión'}
                  </button>
                  {connOk === true  && <span className="text-[10px] text-[#0DBA6A]">● Conectado</span>}
                  {connOk === false && <span className="text-[10px] text-[#E04045]">● Sin conexión — verifica la URL y el acceso del script</span>}
                </div>
              )}
            </div>

            {/* Auto-sync toggle */}
            {sheetsCfg && (
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all
                ${sheetsCfg.autoSync
                  ? 'bg-[#0DBA6A]/10 border-[#0DBA6A]/30'
                  : 'bg-[#0F001E] border-[#4A1D7A]/40'}`}>
                <div>
                  <p className="text-[11px] font-medium text-white">Auto-sync Sheet → Snipe-IT</p>
                  <p className="text-[10px] text-[#C9B3D9]/40 mt-0.5">
                    <strong>SI</strong> → <code className="bg-[#820AD1]/20 px-1 rounded">checkin + In Stock</code> &nbsp;|&nbsp; <strong>No</strong> → <code className="bg-[#820AD1]/20 px-1 rounded">In Use</code>
                  </p>
                </div>
                <div
                  onClick={async () => {
                    const updated = await (window as any).electronAPI.sheetsConfigSet({ autoSync: !sheetsCfg.autoSync })
                    setSheetsCfg(updated)
                  }}
                  className={`ml-3 w-9 h-5 rounded-full transition-all cursor-pointer relative flex-shrink-0
                    ${sheetsCfg.autoSync ? 'bg-[#0DBA6A]' : 'bg-[#4A1D7A]/60'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all
                    ${sheetsCfg.autoSync ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </div>
            )}

            {/* Recent changes — expanded */}
            {recentChanges.length > 0 && (
              <div>
                <p className="text-[10px] text-[#C9B3D9]/40 mb-1.5">Cambios recientes desde el Sheet:</p>
                <div className="space-y-1.5">
                  {recentChanges.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px] bg-[#0F001E]/60 rounded-lg px-2 py-1.5">
                      <span className="text-[#0DBA6A]/70 mt-0.5">↓</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[#C9B3D9]/80">{c.serial}</span>
                        <span className="text-[#A842FF]/60 ml-1 text-[9px]">[{c.field}]</span>
                        <span className="text-[#C9B3D9]/30 mx-1">→</span>
                        <span className={`font-medium ${c.newValue === 'SI' ? 'text-[#0DBA6A]' : c.newValue === 'No' ? 'text-[#E04045]' : 'text-white'}`}>{c.newValue}</span>
                        {c.oldValue && <span className="text-[#C9B3D9]/30 ml-1">(antes: {c.oldValue})</span>}
                        <span className="text-[#C9B3D9]/30 ml-1">· {c.block}</span>
                      </div>
                      <div className="text-right text-[#C9B3D9]/30 flex-shrink-0">
                        <div>{new Date(c.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Log de operaciones */}
            {syncLog.length > 0 && (
              <div>
                <p className="text-[10px] text-[#C9B3D9]/40 mb-1.5">Log de operaciones Snipe-IT ↔ Sheet:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {syncLog.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] bg-[#0F001E]/60 rounded-lg px-2 py-1.5">
                      <span className={entry.ok ? 'text-[#0DBA6A]' : 'text-[#E04045]'}>
                        {entry.ok ? '✓' : '✗'}
                      </span>
                      <span className="font-mono text-[#C9B3D9]/80">{entry.serial}</span>
                      <span className="text-[#A842FF]/70 flex-1">{entry.action}</span>
                      {entry.block && <span className="text-[#C9B3D9]/30">{entry.block}</span>}
                      <span className="text-[#C9B3D9]/30 flex-shrink-0">
                        {entry.time.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-[#820AD1]/10 border border-[#820AD1]/20 rounded-lg p-2.5 text-[10px] text-[#A842FF]/80 space-y-1">
              <p className="font-medium">Configuración en Google Sheet:</p>
              <p>1. Extensiones → Apps Script → pega el código del script</p>
              <p>2. Desplegar → Web App → <span className="text-white font-medium">"Ejecutar como: yo"</span>, <span className="text-[#0DBA6A] font-medium">"Acceso: Cualquier persona"</span></p>
              <p>3. Agrega trigger: <code className="bg-[#820AD1]/20 px-1 rounded">onEditTrigger</code> → Al editar</p>
              <p>4. Copia la URL de despliegue y pégala arriba → Guardar → Probar conexión</p>
            </div>
          </div>
        )}
      </div>

      {/* Auto-sync result toast */}
      {syncResult && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-[11px] border transition-all
          ${syncResult.startsWith('✓')
            ? 'bg-[#0DBA6A]/10 border-[#0DBA6A]/30 text-[#0DBA6A]'
            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
          {syncResult}
        </div>
      )}

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
            {assetStatusLoading && (
              <p className="mt-1 text-[10px] text-[#C9B3D9]/30">◌ consultando sheet...</p>
            )}
            {!assetStatusLoading && assetStatus && (
              <div className="mt-1.5 flex items-center gap-2 px-2 py-1 rounded-lg bg-[#0F001E] border border-[#4A1D7A]/50">
                <span className="text-[10px] text-[#C9B3D9]/40">Sheet:</span>
                <span className={`text-[11px] font-medium ${
                  assetStatus.disponible === 'In Stock' ? 'text-[#0DBA6A]'
                  : assetStatus.disponible === 'Retired' ? 'text-[#E04045]'
                  : 'text-[#F6AE2D]'
                }`}>{assetStatus.disponible}</span>
                {assetStatus.fecha && (
                  <span className="text-[10px] text-[#C9B3D9]/30 ml-auto">{assetStatus.fecha}</span>
                )}
              </div>
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
