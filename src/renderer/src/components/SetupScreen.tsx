import { useState } from 'react'

export type SupportedCountry = 'co' | 'br' | 'mx'

export interface AppConfig {
  countries: SupportedCountry[]
  primaryCountry: SupportedCountry
  setupDone: boolean
}

const STORAGE_KEY = 'nu-it-dash:config'

export function loadConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as AppConfig
    if (!cfg.setupDone || !cfg.countries?.length) return null
    return cfg
  } catch {
    return null
  }
}

export function saveConfig(cfg: AppConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export function resetConfig() {
  localStorage.removeItem(STORAGE_KEY)
}

// ─── Data ──────────────────────────────────────────────────────────────────

const COUNTRIES: {
  id: SupportedCountry
  label: string
  flag: string
  locationNum: string
  locationLabel: string
  desc: string
}[] = [
  {
    id: 'co',
    label: 'Colombia',
    flag: '🇨🇴',
    locationNum: '43',
    locationLabel: 'COL-HQ1-03',
    desc: 'Oficina Bogotá',
  },
  {
    id: 'br',
    label: 'Brazil',
    flag: '🇧🇷',
    locationNum: '52',
    locationLabel: 'BR-HQ1',
    desc: 'São Paulo HQ',
  },
  {
    id: 'mx',
    label: 'México',
    flag: '🇲🇽',
    locationNum: '42',
    locationLabel: 'MX-HQ1',
    desc: 'CDMX HQ',
  },
]

// ─── Component ─────────────────────────────────────────────────────────────

interface Props {
  onDone: (cfg: AppConfig) => void
}

export default function SetupScreen({ onDone }: Props) {
  const [selected, setSelected]   = useState<SupportedCountry[]>(['co'])
  const [primary, setPrimary]     = useState<SupportedCountry>('co')
  const [step, setStep]           = useState<1 | 2>(1)

  const toggle = (id: SupportedCountry) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        // Evitar deseleccionar el último
        if (prev.length === 1) return prev
        const next = prev.filter(c => c !== id)
        // Si el primary queda afuera, reasignar
        if (primary === id) setPrimary(next[0])
        return next
      }
      return [...prev, id]
    })
  }

  const handleNext = () => {
    if (selected.length === 1) {
      // Solo un país → es el primario directamente, saltar paso 2
      const cfg: AppConfig = { countries: selected, primaryCountry: selected[0], setupDone: true }
      saveConfig(cfg)
      onDone(cfg)
    } else {
      setStep(2)
    }
  }

  const handleFinish = () => {
    const cfg: AppConfig = { countries: selected, primaryCountry: primary, setupDone: true }
    saveConfig(cfg)
    onDone(cfg)
  }

  return (
    <div className="fixed inset-0 bg-[#0F001E] flex flex-col items-center justify-center p-8 z-50">
      {/* Glow decorativo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#820AD1]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">

        {/* Logo / título */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{
              background: 'linear-gradient(135deg, #820AD1 0%, #4A0088 100%)',
              boxShadow: '0 0 0 1px rgba(130,10,209,0.5), 0 8px 32px rgba(130,10,209,0.4), 0 1px 0 rgba(255,255,255,0.12) inset',
            }}>
            <span className="text-3xl">🛠️</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">IT Dashboard</h1>
          <p className="text-[#C9B3D9]/50 text-sm mt-1.5">Configuración inicial</p>
        </div>

        {/* Paso 1 — Selección de países */}
        {step === 1 && (
          <div
            className="animate-in fade-in slide-in-from-bottom-3"
            style={{ '--tw-enter-duration': '300ms' } as React.CSSProperties}
          >
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-1">
                ¿Para qué países necesitas soporte?
              </h2>
              <p className="text-[#C9B3D9]/40 text-xs">
                Puedes seleccionar varios. Las opciones del dashboard se filtrarán automáticamente.
              </p>
            </div>

            <div className="space-y-2.5 mb-8">
              {COUNTRIES.map(c => {
                const isOn = selected.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all"
                    style={{
                      background: isOn
                        ? 'linear-gradient(135deg, rgba(130,10,209,0.25) 0%, rgba(74,0,136,0.25) 100%)'
                        : 'rgba(44,16,82,0.4)',
                      boxShadow: isOn
                        ? '0 0 0 1.5px rgba(155,20,245,0.7), 0 2px 12px rgba(130,10,209,0.2)'
                        : '0 0 0 1px rgba(74,29,122,0.6)',
                      transform: isOn ? 'scale(1)' : 'scale(1)',
                    }}
                  >
                    <span className="text-3xl leading-none">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{c.label}</p>
                      <p className="text-xs text-[#C9B3D9]/40">{c.desc}</p>
                    </div>
                    {/* Checkbox premium */}
                    <div
                      className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
                      style={{
                        background: isOn
                          ? 'linear-gradient(180deg, #9B14F5 0%, #6B0AAD 100%)'
                          : 'rgba(74,29,122,0.4)',
                        boxShadow: isOn
                          ? '0 0 0 1px rgba(155,20,245,0.6), 0 1px 0 rgba(255,255,255,0.1) inset'
                          : '0 0 0 1px rgba(74,29,122,0.8)',
                      }}
                    >
                      {isOn && (
                        <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                          <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleNext}
              disabled={selected.length === 0}
              className="nu-btn-primary w-full justify-center py-3 text-base"
            >
              {selected.length === 1 ? 'Comenzar' : 'Siguiente'}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-70">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Paso 2 — País primario (solo si hay varios) */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-3">
            <div className="mb-6">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs text-[#C9B3D9]/40 hover:text-[#C9B3D9]/70 mb-4 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 7H3M3 7L7 3M3 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Volver
              </button>
              <h2 className="text-base font-semibold text-white mb-1">
                ¿Cuál es tu país principal?
              </h2>
              <p className="text-[#C9B3D9]/40 text-xs">
                Se usará por defecto en todos los formularios.
              </p>
            </div>

            <div className="space-y-2.5 mb-8">
              {COUNTRIES.filter(c => selected.includes(c.id)).map(c => {
                const isOn = primary === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setPrimary(c.id)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all"
                    style={{
                      background: isOn
                        ? 'linear-gradient(135deg, rgba(130,10,209,0.25) 0%, rgba(74,0,136,0.25) 100%)'
                        : 'rgba(44,16,82,0.4)',
                      boxShadow: isOn
                        ? '0 0 0 1.5px rgba(155,20,245,0.7), 0 2px 12px rgba(130,10,209,0.2)'
                        : '0 0 0 1px rgba(74,29,122,0.6)',
                    }}
                  >
                    <span className="text-3xl leading-none">{c.flag}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{c.label}</p>
                      <p className="text-xs text-[#C9B3D9]/40">{c.locationLabel}</p>
                    </div>
                    {/* Radio premium */}
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                      style={{
                        background: isOn
                          ? 'linear-gradient(180deg, #9B14F5 0%, #6B0AAD 100%)'
                          : 'rgba(74,29,122,0.4)',
                        boxShadow: isOn
                          ? '0 0 0 1px rgba(155,20,245,0.6)'
                          : '0 0 0 1px rgba(74,29,122,0.8)',
                      }}
                    >
                      {isOn && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleFinish}
              className="nu-btn-primary w-full justify-center py-3 text-base"
            >
              Comenzar
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-70">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        <p className="text-center text-[10px] text-[#C9B3D9]/20 mt-6">
          Puedes cambiar esto después en ⚙️ Configuración
        </p>
      </div>
    </div>
  )
}
