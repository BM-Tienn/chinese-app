// Load environment variables
require('dotenv').config();

module.exports = {
    apps: [{
        name: "chinese-ai-backend",
        script: "./server.js",
        exec_mode: "cluster",
        instances: 2,
        autorestart: true,
        watch: false,
        max_memory_restart: "1G",
        env: {
            NODE_ENV: "development",
            PORT: process.env.PORT || 3001
        },
        env_production: {
            NODE_ENV: "production",
            PORT: process.env.PORT || 3001
        },
        // Logging
        log_file: "./logs/combined.log",
        out_file: "./logs/out.log",
        error_file: "./logs/error.log",
        log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        // Performance
        node_args: "--max-old-space-size=512",
        // Health check
        health_check_grace_period: 3000,
        health_check_fatal_exceptions: true
    }]
};
