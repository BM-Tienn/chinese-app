module.exports = {
    apps: [{
        name: "chinese-ai-backend",
        script: "./server.js",
        exec_mode: "cluster",
        instances: 1,                 // Có thể tăng lên 'max' để dùng hết CPU cores
        autorestart: true,
        watch: false,                 // Production tắt watch
        max_memory_restart: "500M",   // Restart nếu vượt quá 500MB RAM
        env: {
            NODE_ENV: "development",
            PORT: 3001
        },
        env_production: {
            NODE_ENV: "production",
            PORT: 3001                  // KHỚP với CloudPanel Application Port
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
