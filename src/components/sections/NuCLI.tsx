import { useState } from 'react'
import FormField from '../FormField'
import type { RunParams } from '../../types'

interface Props {
  onRun: (p: RunParams) => void
  running: boolean
}

type Tab = 'refresh' | 'login' | 'toolio'

export default function NuCLI({ onRun, running }: Props) {
  const [tab, setTab] = useState<Tab>('refresh')
  const [nombre, setNombre] = useState('')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'refresh', label: 'Refresh AWS', icon: '🔄' },
    { id: 'login', label: 'Login Completo', icon: '⚡' },
    { id: 'toolio', label: 'Toolio', icon: '👤' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Nucli / AWS</h2>
        <p className="text-nu-light/60 text-sm mt-1">Gestión de credenciales y autenticación AWS.</p>
      </div>

      <div className="flex gap-1 p-1 bg-nu-deeper rounded-xl mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id ? 'bg-nu-purple text-white shadow-lg' : 'text-nu-light/60 hover:text-white'}`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'refresh' && (
        <div className="space-y-4">
          <div className="nu-card">
            <p className="text-sm text-nu-light/70 mb-4">
              Refresca las credenciales AWS para <span className="text-nu-accent font-mono">nu-ist</span>.
              Útil cuando los tokens expiran.
            </p>
            <div className="font-mono text-xs bg-nu-deeper rounded-lg p-3 text-nu-light/60 mb-4">
              $ nu-ist aws credentials refresh
            </div>
            <button
              onClick={() => onRun({ action: 'nucli.refresh', params: {} })}
              disabled={running}
              className="nu-btn-primary w-full justify-center"
            >
              {running ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔄'}
              Refresh Credenciales
            </button>
          </div>
        </div>
      )}

      {tab === 'login' && (
        <div className="space-y-4">
          <div className="nu-card">
            <p className="text-sm text-nu-light/70 mb-4">
              Ejecuta el flujo completo de actualización: <span className="text-nu-accent">nu</span>,{' '}
              <span className="text-nu-accent">it</span>, <span className="text-nu-accent">nu-co</span> y todos sus tokens.
            </p>
            <div className="space-y-1 font-mono text-xs bg-nu-deeper rounded-lg p-3 text-nu-light/50 mb-4 max-h-32 overflow-y-auto">
              <div>$ nu update && it update</div>
              <div>$ nu aws credentials refresh</div>
              <div>$ nu auth get-refresh-token</div>
              <div>$ nu-co update && nu-co aws credentials refresh</div>
              <div>$ nu-co auth get-access-token --env prod --country co</div>
            </div>
            <button
              onClick={() => onRun({ action: 'nucli.login_completo', params: {} })}
              disabled={running}
              className="nu-btn-primary w-full justify-center"
            >
              {running ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '⚡'}
              Login & Actualización Completa
            </button>
          </div>
        </div>
      )}

      {tab === 'toolio' && (
        <div className="space-y-4">
          <div className="nu-card space-y-4">
            <FormField
              label="Nombre completo"
              id="toolio-nombre"
              value={nombre}
              onChange={setNombre}
              placeholder="NOMBRE_APELLIDO"
              hint="Formato: NOMBRE_APELLIDO (ej: WILMAR_MEDINA)"
              required
            />
            <button
              onClick={() => onRun({ action: 'nucli.toolio', params: { nombre } })}
              disabled={running || !nombre.trim()}
              className="nu-btn-primary w-full justify-center"
            >
              {running ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '👤'}
              Añadir a Toolio
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
