const appName = 'pearls-migrator';
const appRoot = '/home/appuser/apps/pearls-migrator';
const appPort = 3021;
const sourceRepo = 'git@github.com:RaufERK/SOURCE_PEARLS.git';
const sourceRoot = `${appRoot}/SOURCE_PERALS`;

const postDeploySteps = [
  'export NODE_ENV=production',
  `export PEARLS_SOURCE_ROOT=${sourceRoot}`,
  'source ~/.nvm/nvm.sh && nvm install && nvm use',
  `mkdir -p ${appRoot}/shared`,
  `if [ -d ${sourceRoot}/.git ]; then git -C ${sourceRoot} pull --ff-only; else git clone ${sourceRepo} ${sourceRoot}; fi`,
  'mkdir -p /home/appuser/logs',
  `ln -sfn ${appRoot}/shared/.env ./.env`,
  `ln -sfn ${appRoot}/shared/.env ./.env.production`,
  `ln -sfn ${appRoot}/shared/.env ./web/.env`,
  `ln -sfn ${appRoot}/shared/.env ./web/.env.production`,
  'npm ci --include=dev',
  'npm --prefix web ci --include=dev',
  'npm run db:generate',
  'npm run db:deploy',
  'npm run db:seed',
  'npm run generate:downloads',
  'npm run build:web',
  'pm2 startOrReload ecosystem.config.cjs --env production',
  'pm2 save',
].join(' && ');

module.exports = {
  apps: [
    {
      name: appName,
      cwd: './web',
      script: 'node_modules/next/dist/bin/next',
      args: `start -p ${appPort}`,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '768M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_file: `/home/appuser/logs/${appName}-combined.log`,
      out_file: `/home/appuser/logs/${appName}-out.log`,
      error_file: `/home/appuser/logs/${appName}-error.log`,
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],

  deploy: {
    production: {
      user: 'appuser',
      host: '155.212.174.133',
      ref: 'origin/main',
      repo: 'git@github.com:RaufERK/pearls-migrator.git',
      path: appRoot,
      'pre-deploy-local': '',
      'post-deploy': postDeploySteps,
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
