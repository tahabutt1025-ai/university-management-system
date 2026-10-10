let app;
let initError = null;

try {
  app = require('../server');
} catch (err) {
  initError = err;
  console.error('Error initializing server in api/index.js:', err);
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      success: false,
      error: 'Init Error: ' + initError.message,
      stack: initError.stack
    });
  }

  try {
    return app(req, res);
  } catch (err) {
    console.error('Error handling request in api/index.js:', err);
    return res.status(500).json({
      success: false,
      error: 'Runtime Error: ' + err.message,
      stack: err.stack
    });
  }
};
