module.exports = {
  apps: [
    {
      name: 'dattingcoffe',
      script: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        HOSTNAME: '0.0.0.0',
      },
      // Cluster: jika 1 instance crash, instance lain tetap melayani
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '350M',

      // Crash recovery
      min_uptime: '5s',
      max_restarts: 15,
      restart_delay: 2000,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
}
