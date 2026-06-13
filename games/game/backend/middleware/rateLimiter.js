const ipCache = {};

function rateLimiter(limitCount = 100, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    if (!ipCache[ip]) {
      ipCache[ip] = [];
    }

    // Filter requests outside the current time window
    ipCache[ip] = ipCache[ip].filter(timestamp => now - timestamp < windowMs);

    if (ipCache[ip].length >= limitCount) {
      return res.status(429).json({
        error: `Too many requests from this IP. Please try again in a few minutes.`
      });
    }

    ipCache[ip].push(now);
    next();
  };
}

module.exports = rateLimiter;
