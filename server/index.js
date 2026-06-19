const express = require('express')
const cors = require('cors')
const { spawn } = require('child_process')
const path = require('path')
const os = require('os')
const crypto = require('crypto')

const app = express()
const PORT = 3001

// Token de sesión generado en arranque — solo válido mientras el proceso vive
const SESSION_TOKEN = crypto.randomBytes(32).toString('hex')

// Solo acepta orígenes de localhost — file:// eliminado (ALTO-02: cualquier HTML local podría acceder)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      cb(null, true)
    } else {
      cb(new Error('CORS bloqueado'))
    }
  }
}))
app.use(express.json())

// ─── Middleware de autenticación por token de sesión ────────────────────
app.use((req, res, next) => {
  // Health check no requiere auth
  if (req.path === '/api/health') return next()
  // Solo header — query string excluido (ALTO-01: token en query aparece en logs de Express)
  const token = req.headers['x-session-token']
  if (token !== SESSION_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
})

// VUL-06: token recibido por env var desde el proceso principal — no se imprime en stdout

// ─── Shell escaping: envuelve en comillas simples y escapa ' internos ───
function shellEscape(val) {
  return "'" + String(val ?? '').replace(/'/g, "'\\''") + "'"
}

// ─── Validadores básicos de parámetros ──────────────────────────────────
function safeEmail(e) { return String(e ?? '').replace(/[^a-zA-Z0-9._%+\-@]/g, '') }
function safeSerial(s) { return String(s ?? '').replace(/[^a-zA-Z0-9\-]/g, '') }
function safeTag(t) { return String(t ?? '').replace(/[^a-zA-Z0-9\-]/g, '') }
function safeTime(t) { return String(t ?? '60').replace(/[^0-9]/g, '') || '60' }
function safeVlan(v) { return String(v ?? '').replace(/[^0-9]/g, '') }
function safeMotivo(m) { return String(m ?? '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ .,_\-]/g, '').slice(0, 120) }
// VUL-09: allowlist de países — previene flag injection (ej: --admin)
const ALLOWED_COUNTRIES = new Set(['co', 'br', 'mx', 'ar', 'cl', 'pe'])
function safeCountry(c) { return ALLOWED_COUNTRIES.has(String(c)) ? String(c) : 'co' }
// VUL-07: nurcPath con comillas simples — soporta homedir con espacios o caracteres especiales
function safeNurcPath(p) { return "'" + p.replace(/'/g, "'\\''") + "'" }

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
  'nucli.toolio': ({ nombre }) => ({ cmd: 'nu-co', args: ['toolio', 'add', safeEmail(nombre)] }),

  // JAMF
  'jamf.recovery_key': ({ serial, motivo }) => ({
    cmd: 'it', args: ['jamf', 'computer', 'get', 'recovery-key', safeSerial(serial), safeMotivo(motivo) || 'Soporte Técnico']
  }),
  'jamf.ztd_enroll': ({ serial, motivo }) => ({
    cmd: 'it', args: ['jamf', 'computer', 'update', 'prestage-enrollment', 'ztd', safeSerial(serial), safeMotivo(motivo) || 'Testing CO ZTD']
  }),
  'jamf.ztd_remove': ({ serial }) => ({
    cmd: 'it', args: ['jamf', 'computer', 'update', 'prestage-enrollment', 'nubank', safeSerial(serial), 'failure']
  }),
  'jamf.send_cert': ({ username }) => ({
    cmd: 'it', args: ['send', 'cert', 'ztd', safeEmail(username)]
  }),
  'jamf.admin_temp': ({ serial, tiempo }) => ({
    cmd: 'it', args: ['jamf', 'group', 'add', safeSerial(serial), '--localadmin', '--time', safeTime(tiempo)]
  }),
  'jamf.unlock': ({ serial, username, motivo }) => ({
    cmd: 'it', args: ['jamf', 'computer', 'unlock', safeSerial(serial), safeEmail(username), safeMotivo(motivo) || 'unlock']
  }),

  // CERTIFICADOS
  'certs.nubanker_nu': ({ email }) => ({
    cmd: 'nu', args: ['certs', 'gen', 'nubanker', 'prod', safeEmail(email)]
  }),
  'certs.network_nu': ({ email, vlan }) => ({
    cmd: 'nu', args: ['certs', 'gen', 'network', 'prod', safeEmail(email), safeVlan(vlan)]
  }),
  'certs.nubanker_link': ({ email }) => ({
    script: true,
    lines: [
      `nu-ist certs gen nubanker prod ${shellEscape(safeEmail(email))} --overwrite`,
      `nu-ist certs gen-link nubanker ${shellEscape(safeEmail(email))}`,
    ]
  }),
  'certs.network_link': ({ email, vlan }) => ({
    script: true,
    lines: [
      `nu-ist certs gen network prod ${shellEscape(safeEmail(email))} ${shellEscape(safeVlan(vlan))}`,
      `nu-ist certs gen-link network ${shellEscape(safeEmail(email))}`,
    ]
  }),
  'certs.flujo_completo': ({ email, vlan }) => ({
    script: true,
    lines: [
      `echo '→ Paso 1: Certificado Nubanker'`,
      `nu-ist certs gen nubanker prod ${shellEscape(safeEmail(email))} --overwrite`,
      `nu-ist certs gen-link nubanker ${shellEscape(safeEmail(email))}`,
      `echo '→ Paso 2: Certificado Red'`,
      `nu-ist certs gen network prod ${shellEscape(safeEmail(email))} ${shellEscape(safeVlan(vlan))}`,
      `nu-ist certs gen-link network ${shellEscape(safeEmail(email))}`,
      `echo '✓ Flujo completado'`,
    ]
  }),

  // YUBIKEY
  'yubikey.configurar': ({ email }) => ({
    script: true,
    lines: [
      `echo '→ Instalando dependencias brew...'`,
      `brew install yubico-piv-tool yubikey-personalization libyubikey || echo '⚠ Algunos paquetes fallaron'`,
      `echo '→ Instalando dependencias pip...'`,
      `pip3 install diceware pandas boto3 XlsxWriter || echo '⚠ Algunos paquetes fallaron'`,
      `it yubikey configure ${shellEscape(safeEmail(email))} --country co`,
    ]
  }),
  'yubikey.scopes_co': ({ email }) => ({ cmd: 'nu-co', args: ['sec', 'scope', 'show', safeEmail(email)] }),
  'yubikey.scopes_nu': ({ email }) => ({ cmd: 'nu', args: ['sec', 'scope', 'show', safeEmail(email)] }),

  // INVENTARIO
  'inv.checkout': ({ email, tag }) => ({
    cmd: 'it', args: ['inventory', 'asset', 'checkout', safeEmail(email), `CO-${safeTag(tag)}`]
  }),
  'inv.checkin': ({ tag }) => ({
    cmd: 'it', args: ['inventory', 'asset', 'checkin', `CO-${safeTag(tag)}`]
  }),
  'inv.checkin_update': ({ tag }) => {
    const t = safeTag(tag)
    return {
      script: true,
      lines: [
        `echo '→ Paso 1: Checkin'`,
        `it inventory asset checkin ${shellEscape('CO-' + t)}`,
        `echo '→ Paso 2: Update Status'`,
        `it inventory asset updatestatus ${shellEscape('CO-' + t)}`,
        `echo '✓ Flujo completado'`,
      ]
    }
  },
  'inv.update_status': ({ tag }) => ({
    cmd: 'it', args: ['inventory', 'asset', 'updatestatus', `CO-${safeTag(tag)}`]
  }),
  'inv.update_multiple': ({ tags }) => ({
    script: true,
    lines: (Array.isArray(tags) ? tags : []).map(tag => {
      const t = safeTag(tag)
      return [
        `echo ${shellEscape('→ Procesando CO-' + t + '...')}`,
        `it inventory asset updatestatus ${shellEscape('CO-' + t)} --country co`,
      ]
    }).flat().concat([`echo '✓ Proceso completado'`])
  }),
  'inv.crear_usuario': ({ email, country }) => ({
    cmd: 'it', args: ['inventory', 'user', 'create', safeEmail(email), '--country', safeCountry(country)]
  }),
}

// ─── Rate limiter simple — máx 5 peticiones cada 10 segundos ───
const rlCounts = new Map()
function rateLimited(key) {
  const now = Date.now()
  const entry = rlCounts.get(key) || { count: 0, reset: now + 10_000 }
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 10_000 }
  entry.count++
  rlCounts.set(key, entry)
  return entry.count > 5
}

// ============================================================
// SSE ENDPOINT — streams command output
// ============================================================

app.get('/sse/run', (req, res) => {
  if (rateLimited(req.ip)) {
    res.status(429).json({ error: 'Too many requests — espera 10 segundos' })
    return
  }
  const { action, params: rawParams } = req.query
  let params = {}
  try {
    const parsed = JSON.parse(rawParams || '{}')
    // Prevenir prototype pollution — filtrar keys peligrosas
    const BLOCKED = new Set(['__proto__', 'constructor', 'prototype'])
    params = Object.fromEntries(
      Object.entries(parsed).filter(([k]) => !BLOCKED.has(k))
    )
  } catch (_) {}

  if (!Object.prototype.hasOwnProperty.call(COMMANDS, action)) {
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

  const def = Object.prototype.hasOwnProperty.call(COMMANDS, action) ? COMMANDS[action](params) : null
  if (!def) { res.status(400).json({ error: 'Invalid action' }); return }
  const shell = process.env.SHELL || '/bin/zsh'
  // VUL-07: nurcPath con comillas simples — soporta homedir con espacios o caracteres especiales
  const nurcPath = safeNurcPath(path.join(os.homedir(), '.nurc'))

  let shellArgs, shellScript

  if (def.script) {
    shellScript = [
      `source ${nurcPath} 2>/dev/null || true`,
      ...def.lines
    ].join('\n')
    shellArgs = ['-c', shellScript]
  } else {
    const cmdStr = [def.cmd, ...def.args.map(a => shellEscape(a))].join(' ')
    shellScript = `source ${nurcPath} 2>/dev/null || true\n${cmdStr}`
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

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  IT Dashboard Backend — http://localhost:${PORT}\n`)
})
