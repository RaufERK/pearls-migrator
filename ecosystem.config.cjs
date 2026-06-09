module.exports = {
  apps: [
    {
      name: 'pearls-migrator',
      cwd: './web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3020',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
