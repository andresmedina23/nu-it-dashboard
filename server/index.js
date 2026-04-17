const express = require('express')
const cors = require('cors')
const { spawn } = require('child_process')
const path = require('path')
const os = require('os')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// ============================================================
// COMMAND DEFINITIONS — maps each action to shell args
// ============================================================

const COMMANDS = {
  // DIAGNÓSTICO
  'diagnostico': () => ({
    script: true,
    lines: [
      'echo "=== Verificando herramientas CLI ==="',
      'for tool in it nu nu-co nu-ist git brew; do',
      '  printf "  %-20s" "$tool"',
      '  if command -v "$tool" > /dev/null 2>&1; then',
      '    echo "[OK]"',
      '  else',
      '    echo "[NO ENCONTRADO]"',
      '  fi',
      'done',
      'echo ""',
      'echo "=== Verificando autenticación ==="',
      'printf "  %-20s" "nu auth"',
      'if nu auth whoami > /dev/null 2>&1; then echo "[OK]"; else echo "[FALLO]"; fi',
      'printf "  %-20s" "nu-co auth"',
      'if nu-co auth whoami > /dev/null 2>&1; then echo "[OK]"; else echo "[FALLO]"; fi',
      'echo ""',
      'echo "=== Verificando SSH ==="',
      'printf "  %-20s" "~/.ssh"',
      'if [ -d "$HOME/.ssh" ]; then echo "[OK]"; else echo "[NO]"; fi',
      'printf "  %-20s" "id_ed25519.pub"',
      'if [ -f "$HOME/.ssh/id_ed25519.pub" ]; then echo "[OK]"; else echo "[NO]"; fi',
      'echo ""',
      'echo "✓ Diagnóstico completado"',
    ]
  }),

  // NUCLI / AWS
  'nucli.refresh': () => ({ cmd: 'nu-ist', args: ['aws', 'credentials', 'refresh'] }),
  'nucli.login_completo': () => ({
    script: true,
    lines: [
      'echo "→ Actualizando nu..."',
      'nu update || echo "⚠ Falló nu update"',
      'echo "→ Actualizando it..."',
      'it update || echo "⚠ Falló it update"',
      'echo "→ Refresh AWS nu..."',
      'nu aws credentials refresh || echo "⚠ Falló"',
      'echo "→ Refresh token nu..."',
      'nu auth get-refresh-token || echo "⚠ Falló"',
      'echo "→ Access token nu..."',
      'nu auth get-access-token || echo "⚠ Falló"',
      'echo "→ Actualizando nu-co..."',
      'nu-co update || echo "⚠ Falló nu-co update"',
      'echo "→ Refresh AWS nu-co..."',
      'nu-co aws credentials refresh || echo "⚠ Falló"',
      'echo "→ Refresh token nu-co..."',
      'nu-co auth get-refresh-token || echo "⚠ Falló"',
      'echo "→ Access token nu-co..."',
      'nu-co auth get-access-token || echo "⚠ Falló"',
      'echo "→ Access token PROD CO..."',
      'nu-co auth get-access-token --env prod --country co || echo "⚠ Falló"',
      'echo ""',
      'echo "✓ Actualización completada"',
    ]
  }),
  'nucli.toolio': ({ nombre }) => ({ cmd: 'nu-co', args: ['toolio', 'add', nombre] }),

  // JAMF
  'jamf.recovery_key': ({ serial, motivo }) => ({
    cmd: 'it', args: ['jamf', 'computer', 'get', 'recovery-key', serial, motivo || 'Soporte Técnico']
  }),
  'jamf.ztd_enroll': ({ serial, motivo }) => ({
    cmd: 'it', args: ['jamf', 'computer', 'update', 'prestage-enrollment', 'ztd', serial, motivo || 'Testing CO ZTD']
  }),
  'jamf.ztd_remove': ({ serial }) => ({
    cmd: 'it', args: ['jamf', 'computer', 'update', 'prestage-enrollment', 'nubank', serial, 'failure']
  }),
  'jamf.send_cert': ({ username }) => ({
    cmd: 'it', args: ['send', 'cert', 'ztd', username]
  }),
  'jamf.admin_temp': ({ serial, tiempo }) => ({
    cmd: 'it', args: ['jamf', 'group', 'add', serial, '--localadmin', '--time', tiempo || '60']
  }),
  'jamf.unlock': ({ serial, username, motivo }) => ({
    cmd: 'it', args: ['jamf', 'computer', 'unlock', serial, username, motivo || 'unlock']
  }),

  // CERTIFICADOS
  'certs.nubanker_nu': ({ email }) => ({
    cmd: 'nu', args: ['certs', 'gen', 'nubanker', 'prod', email]
  }),
  'certs.network_nu': ({ email, vlan }) => ({
    cmd: 'nu', args: ['certs', 'gen', 'network', 'prod', email, vlan]
  }),
  'certs.nubanker_link': ({ email }) => ({
    script: true,
    lines: [
      `nu-ist certs gen nubanker prod "${email}" --overwrite`,
      `nu-ist certs gen-link nubanker "${email}"`,
    ]
  }),
  'certs.network_link': ({ email, vlan }) => ({
    script: true,
    lines: [
      `nu-ist certs gen network prod "${email}" "${vlan}"`,
      `nu-ist certs gen-link network "${email}"`,
    ]
  }),
  'certs.flujo_completo': ({ email, vlan }) => ({
    script: true,
    lines: [
      `echo "→ Paso 1: Certificado Nubanker"`,
      `nu-ist certs gen nubanker prod "${email}" --overwrite`,
      `nu-ist certs gen-link nubanker "${email}"`,
      `echo "→ Paso 2: Certificado Red"`,
      `nu-ist certs gen network prod "${email}" "${vlan}"`,
      `nu-ist certs gen-link network "${email}"`,
      `echo "✓ Flujo completado"`,
    ]
  }),

  // YUBIKEY
  'yubikey.configurar': ({ email }) => ({
    script: true,
    lines: [
      'echo "→ Instalando dependencias brew..."',
      'brew install yubico-piv-tool yubikey-personalization libyubikey || echo "⚠ Algunos paquetes fallaron"',
      'echo "→ Instalando dependencias pip..."',
      'pip3 install diceware pandas boto3 XlsxWriter || echo "⚠ Algunos paquetes fallaron"',
      `it yubikey configure "${email}" --country co`,
    ]
  }),
  'yubikey.scopes_co': ({ email }) => ({ cmd: 'nu-co', args: ['sec', 'scope', 'show', email] }),
  'yubikey.scopes_nu': ({ email }) => ({ cmd: 'nu', args: ['sec', 'scope', 'show', email] }),

  // INVENTARIO
  'inv.checkout': ({ email, tag }) => ({
    cmd: 'it', args: ['inventory', 'asset', 'checkout', email, `CO-${tag}`]
  }),
  'inv.checkin': ({ tag }) => ({
    cmd: 'it', args: ['inventory', 'asset', 'checkin', `CO-${tag}`]
  }),
  'inv.checkin_update': ({ tag }) => ({
    script: true,
    lines: [
      `echo "→ Paso 1: Checkin"`,
      `it inventory asset checkin "CO-${tag}"`,
      `echo "→ Paso 2: Update Status"`,
      `it inventory asset updatestatus "CO-${tag}"`,
      `echo "✓ Flujo completado"`,
    ]
  }),
  'inv.update_status': ({ tag }) => ({
    cmd: 'it', args: ['inventory', 'asset', 'updatestatus', `CO-${tag}`]
  }),
  'inv.update_multiple': ({ tags }) => ({
    script: true,
    lines: tags.map(tag => [
      `echo "→ Procesando CO-${tag}..."`,
      `it inventory asset updatestatus "CO-${tag}" --country co`,
    ]).flat().concat(['echo "✓ Proceso completado"'])
  }),
  'inv.crear_usuario': ({ email, country }) => ({
    cmd: 'it', args: ['inventory', 'user', 'create', email, '--country', country || 'co']
  }),
}

// ============================================================
// SSE ENDPOINT — streams command output
// ============================================================

app.get('/sse/run', (req, res) => {
  const { action, params: rawParams } = req.query
  let params = {}
  try { params = JSON.parse(rawParams || '{}') } catch (_) {}

  if (!COMMANDS[action]) {
    res.status(400).json({ error: `Unknown action: ${action}` })
    return
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`)
  }

  const def = COMMANDS[action](params)
  const shell = process.env.SHELL || '/bin/zsh'
  const nurcPath = path.join(os.homedir(), '.nurc')

  let shellArgs, shellScript

  if (def.script) {
    // Multi-line script
    shellScript = [
      `source "${nurcPath}" 2>/dev/null || true`,
      ...def.lines
    ].join('\n')
    shellArgs = ['-c', shellScript]
  } else {
    // Single command — source .nurc first
    const cmdStr = [def.cmd, ...def.args.map(a => `"${a.replace(/"/g, '\\"')}"`)]
      .join(' ')
    shellScript = `source "${nurcPath}" 2>/dev/null || true\n${cmdStr}`
    shellArgs = ['-c', shellScript]
  }

  send('start', `$ ${def.script ? def.lines.join(' && ') : [def.cmd, ...def.args].join(' ')}`)

  const child = spawn(shell, shellArgs, {
    env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  child.stdout.on('data', data => send('stdout', data.toString()))
  child.stderr.on('data', data => send('stderr', data.toString()))

  child.on('close', code => {
    send('exit', code)
    res.end()
  })

  child.on('error', err => {
    send('error', err.message)
    res.end()
  })

  req.on('close', () => child.kill())
})

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`\n  IT Dashboard Backend — http://localhost:${PORT}\n`)
})
