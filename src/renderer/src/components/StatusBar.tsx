import { useState, useEffect } from 'react'
import type { CredStatus } from '../types'

function timeLeft(expires: string): string {
  if (!expires) return '?'
  const diff = new Date(expires).getTime() - Date.now()
  if (diff < 0) return 'vencido'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 23) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const STATUS_COLOR = {
  ok:      { pill: 'bg-[#0DBA6A]/10 border-[#0DBA6A]/40 text-[#0DBA6A]', dot: 'bg-[#0DBA6A]', glow: 'status-ok' },
  warn:    { pill: 'bg-[#F6AE2D]/10 border-[#F6AE2D]/40 text-[#F6AE2D]', dot: 'bg-[#F6AE2D]', glow: 'status-warn' },
  expired: { pill: 'bg-[#E04045]/10 border-[#E04045]/40 text-[#E04045]', dot: 'bg-[#E04045]', glow: 'status-dead' },
  missing: { pill: 'bg-[#4A1D7A]/20 border-[#4A1D7A]   text-[#C9B3D9]/40', dot: 'bg-[#4A1D7A]', glow: '' },
}

interface Pill { key: string; label: string; data: CredStatus }

function StatusPill({ label, data }: { label: string; data: CredStatus }) {
  const c = STATUS_COLOR[data.status]
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium ${c.pill} ${c.glow}`}
         title={data.expires ? `Expira: ${new Date(data.expires).toLocaleString('es-CO')}` : label}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot} ${data.status === 'ok' ? 'animate-pulse' : ''}`} />
      <span className="font-semibold">{label}:</span>
      <span>{timeLeft(data.expires)}</span>
    </div>
  )
}

// Groups for display
const AWS_PROFILES = [
  { key: 'aws:default', label: 'AWS' },
]
const NU_TOKENS = [
  { key: 'nu:ist/prod', label: 'nu-ist' },
  { key: 'nu:co/prod',  label: 'nu-co' },
  { key: 'nu:br/prod',  label: 'nu' },
]

export default function StatusBar() {
  const [creds, setCreds] = useState<Record<string, CredStatus>>({})
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getCredStatus()
      setCreds(data)
    } catch (_) { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 60_000)
    return () => clearInterval(t)
  }, [])

  const missing: CredStatus = { expires: '', status: 'missing' }
  const anyExpired = [...AWS_PROFILES, ...NU_TOKENS].some(p => creds[p.key]?.status === 'expired')
  const anyWarn    = [...AWS_PROFILES, ...NU_TOKENS].some(p => creds[p.key]?.status === 'warn')

  return (
    <div className="drag flex items-center justify-between px-4 py-2 bg-[#0F001E] border-b border-[#4A1D7A]/40 flex-shrink-0 min-h-[42px]">

      {/* Left — logo + title */}
      <div className="flex items-center gap-3 pl-16">
        <div className="w-6 h-6 rounded-lg bg-[#820AD1] flex items-center justify-center shadow-lg shadow-[#820AD1]/40">
          <span className="text-white font-bold text-xs">N</span>
        </div>
        <span className="text-[12px] font-semibold text-white/80">IT Dashboard</span>
        <span className="text-[#4A1D7A]">·</span>
        <span className="text-[11px] text-[#C9B3D9]/30">Nubank Colombia</span>
      </div>

      {/* Right — token status */}
      <div className="no-drag flex items-center gap-1.5">
        {loading ? (
          <span className="text-[11px] text-[#C9B3D9]/30 animate-pulse">Verificando tokens...</span>
        ) : (
          <>
            {/* Global alert */}
            {anyExpired && (
              <span className="text-[11px] text-[#E04045] font-semibold bg-[#E04045]/10 border border-[#E04045]/30 px-2 py-1 rounded-full mr-1">
                ⚠ Tokens vencidos — renueva en Nucli/AWS
              </span>
            )}

            {/* Separator label */}
            <span className="text-[10px] text-[#4A1D7A]/60 hidden lg:inline">AWS:</span>
            {AWS_PROFILES.map(p => (
              <StatusPill key={p.key} label={p.label} data={creds[p.key] ?? missing} />
            ))}

            <span className="text-[#4A1D7A] mx-0.5">|</span>

            <span className="text-[10px] text-[#4A1D7A]/60 hidden lg:inline">OAuth:</span>
            {NU_TOKENS.map(p => (
              <StatusPill key={p.key} label={p.label} data={creds[p.key] ?? missing} />
            ))}

            <button onClick={refresh} title="Actualizar" className="no-drag ml-1 text-[#C9B3D9]/30 hover:text-[#C9B3D9] transition-colors p-1 rounded text-base leading-none">
              ↻
            </button>
          </>
        )}
      </div>
    </div>
  )
}
