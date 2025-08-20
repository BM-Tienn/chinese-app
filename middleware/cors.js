const cors = require('cors');
const config = require('../config/config');

const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép tất cả origins trong môi trường development
    if (config.nodeEnv === 'development') {
      callback(null, true);
    } else {
      // Trong production, chỉ cho phép origins được cấu hình
      const allowedOrigins = [config.corsOrigin];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Không được phép bởi CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
