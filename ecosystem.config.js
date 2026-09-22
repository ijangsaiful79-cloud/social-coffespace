// Next.js standalone server.js calls listen() on require() — not cluster-compatible.
// Two fork processes on separate ports; nginx load-balances between them.
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
      env: { NODE_ENV: 'production', PORT: 3002, HOSTNAME: '0.0.0.0' },
    },
    {
      ...BASE,
      name: 'dattingcoffe-2',
      env: { NODE_ENV: 'production', PORT: 3003, HOSTNAME: '0.0.0.0' },
    },
  ],
}
