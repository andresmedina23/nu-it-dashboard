interface Props { onScript: (s: string) => void; running: boolean }

const diagScript = `
echo "=== Herramientas CLI ==="
for tool in it nu nu-co nu-ist git brew; do
  printf "  %-20s" "$tool"
  if command -v "$tool" > /dev/null 2>&1; then echo "✓ OK"; else echo "✗ NO ENCONTRADO"; fi
done
echo ""
echo "=== Dependencias nucli ==="
printf "  %-20s" "bash version"
bash_ver=$(bash --version | head -1 | grep -o '[0-9]*\.[0-9]*' | head -1)
bash_major=$(echo $bash_ver | cut -d. -f1)
if [ "$bash_major" -ge 4 ] 2>/dev/null; then echo "✓ $bash_ver"; else echo "✗ $bash_ver (necesita 4+)"; fi
printf "  %-20s" "gawk"
if command -v gawk > /dev/null 2>&1 || (command -v awk > /dev/null 2>&1 && awk --version 2>&1 | grep -q GNU); then echo "✓ OK"; else echo "✗ NO ENCONTRADO (necesita GNU awk)"; fi
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

const fixDepsScript = `
echo "=== Instalando dependencias nucli ==="
echo ""
echo "→ Instalando bash 5 (brew)..."
brew install bash
echo ""
echo "→ Instalando gawk (brew)..."
brew install gawk
echo ""
echo "→ Versiones instaladas:"
/opt/homebrew/bin/bash --version | head -1
gawk --version | head -1
echo ""
echo "✓ Listo. Cierra y vuelve a abrir la terminal para que tome efecto."
`

export default function Diagnostico({ onScript, running }: Props) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Diagnóstico del Sistema</h2>
        <p className="text-[#C9B3D9]/50 text-sm mt-1">Verifica herramientas, auth y SSH.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
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
        onClick={() => onScript(diagScript.trim())}
        disabled={running}
        className="nu-btn-primary w-full justify-center py-3 mb-3"
      >
        {running
          ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Ejecutando...</>
          : <><span>🔍</span> Ejecutar Diagnóstico</>}
      </button>

      {/* Fix dependencias nucli */}
      <div className="nu-card space-y-3">
        <div>
          <p className="text-sm font-semibold text-white">Reparar dependencias nucli</p>
          <p className="text-[11px] text-[#C9B3D9]/50 mt-0.5">
            Instala <span className="font-mono text-[#A842FF]">bash 5</span> y <span className="font-mono text-[#A842FF]">gawk</span> via Homebrew.
            Necesario si ves errores de "Bash version is ancient" o "GNU awk not found".
          </p>
        </div>
        <button
          onClick={() => onScript(fixDepsScript.trim())}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
                     bg-[#F6AE2D]/10 border border-[#F6AE2D]/40 text-[#F6AE2D]
                     hover:bg-[#F6AE2D]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <span>🔧</span> Instalar bash 5 + gawk
        </button>
      </div>
    </div>
  )
}
