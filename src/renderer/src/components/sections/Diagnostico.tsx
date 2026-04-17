interface Props { onScript: (s: string) => void; running: boolean }

export default function Diagnostico({ onScript, running }: Props) {
  const script = `
echo "=== Herramientas CLI ==="
for tool in it nu nu-co nu-ist git brew; do
  printf "  %-20s" "$tool"
  if command -v "$tool" > /dev/null 2>&1; then echo "✓ OK"; else echo "✗ NO ENCONTRADO"; fi
done
echo ""
echo "=== Autenticación ==="
printf "  %-20s" "nu auth"
nu auth whoami > /dev/null 2>&1 && echo "✓ OK" || echo "✗ FALLO"
printf "  %-20s" "nu-co auth"
nu-co auth whoami > /dev/null 2>&1 && echo "✓ OK" || echo "✗ FALLO"
echo ""
echo "=== SSH ==="
printf "  %-20s" "~/.ssh"
[ -d "$HOME/.ssh" ] && echo "✓ OK" || echo "✗ NO"
printf "  %-20s" "id_ed25519.pub"
[ -f "$HOME/.ssh/id_ed25519.pub" ] && echo "✓ OK" || echo "✗ NO"
echo ""
echo "=== Versiones CLI ==="
it --version 2>&1 || echo "it: sin versión"
nu --version 2>&1 || echo "nu: sin versión"
echo ""
echo "✓ Diagnóstico completado"
`
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Diagnóstico del Sistema</h2>
        <p className="text-[#C9B3D9]/50 text-sm mt-1">Verifica herramientas, auth y SSH.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {['it', 'nu', 'nu-co', 'nu-ist', 'git', 'brew'].map(tool => (
          <div key={tool} className="nu-card flex items-center gap-2 py-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#820AD1]/20 flex items-center justify-center">
              <span className="text-[#A842FF] text-[10px] font-bold font-mono">{tool[0].toUpperCase()}</span>
            </div>
            <span className="text-sm font-mono text-white">{tool}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onScript(script.trim())}
        disabled={running}
        className="nu-btn-primary w-full justify-center py-3"
      >
        {running
          ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Ejecutando...</>
          : <><span>🔍</span> Ejecutar Diagnóstico</>}
      </button>
    </div>
  )
}
