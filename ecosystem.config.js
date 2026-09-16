module.exports = {
  apps: [
    {
      name: 'dattingcoffe',
      script: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
      },
      max_memory_restart: '400M',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
