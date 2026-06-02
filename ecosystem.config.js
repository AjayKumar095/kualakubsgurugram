module.exports = {
  apps: [
    {
      name: 'kualakubs-gurugram',
      script: 'app.js',
      // Note: We use 1 instance (fork mode) because the application uses 
      // in-memory session storage. Running multiple clustered instances 
      // would cause sessions to drop across different processes.
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
