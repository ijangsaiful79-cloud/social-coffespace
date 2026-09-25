// Next.js standalone server.js calls listen() on require() — not cluster-compatible.
// Two fork processes on separate ports; nginx load-balances between them.
const fs = require('fs')
const path = require('path')

function loadEnvLocal() {
  try {
    const content = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8')
    const vars = {}
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
      if (m) vars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
    return vars
  } catch {
    return {}
  }
}

const envLocal = loadEnvLocal()

const BASE = {
  script: '.next/standalone/server.js',
  exec_mode: 'fork',
  instances: 1,
  max_memory_restart: '350M',
  min_uptime: '5s',
  max_restarts: 15,
  restart_delay: 2000,
  kill_timeout: 5000,
  listen_timeout: 10000,
}

module.exports = {
  apps: [
    {
      ...BASE,
      name: 'dattingcoffe-1',
      env: { ...envLocal, NODE_ENV: 'production', PORT: 3002, HOSTNAME: '0.0.0.0' },
    },
    {
      ...BASE,
      name: 'dattingcoffe-2',
      env: { ...envLocal, NODE_ENV: 'production', PORT: 3003, HOSTNAME: '0.0.0.0' },
    },
  ],
}
