const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const http = require("http");

const config = getDefaultConfig(__dirname);

// Forward /api and /socket.io requests from web preview to Express backend on port 5000
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    return (req, res, next) => {
      const url = req.url || '';
      if (url.startsWith('/api') || url.startsWith('/socket.io')) {
        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port: 5000,
            path: url,
            method: req.method,
            headers: {
              ...req.headers,
              host: '127.0.0.1:5000',
            },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          }
        );

        proxyReq.on('error', (err) => {
          console.error('[Metro API Proxy Error]', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Backend API service temporarily unavailable.' }));
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  configPath: path.resolve(__dirname, "tailwind.config.js"),
});
