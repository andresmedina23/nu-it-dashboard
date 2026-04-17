import type { RunParams } from '../../types'

interface Props {
  onRun: (p: RunParams) => void
  running: boolean
}

export default function Diagnostico({ onRun, running }: Props) {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Diagnóstico del Sistema</h2>
        <p className="text-nu-light/60 text-sm mt-1">
          Verifica herramientas CLI, autenticación y SSH en un solo click.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { tool: 'it', desc: 'CLI principal IT' },
          { tool: 'nu', desc: 'Nubank CLI BR' },
          { tool: 'nu-co', desc: 'Nubank CLI CO' },
          { tool: 'nu-ist', desc: 'Nubank CLI IST' },
          { tool: 'git', desc: 'Control de versiones' },
          { tool: 'brew', desc: 'Package manager' },
        ].map(({ tool, desc }) => (
          <div key={tool} className="nu-card flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-nu-purple/20 flex items-center justify-center flex-shrink-0">
              <span className="text-nu-accent text-xs font-mono font-bold">{tool[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white font-mono">{tool}</p>
              <p className="text-xs text-nu-light/50">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onRun({ action: 'diagnostico', params: {} })}
        disabled={running}
        className="nu-btn-primary w-full justify-center py-3 text-base"
      >
        {running ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Ejecutando diagnóstico...
          </>
        ) : (
          <>
            <span>🔍</span> Ejecutar Diagnóstico Completo
          </>
        )}
      </button>
    </div>
  )
}
