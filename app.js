/**
 * app.js — Hostinger Production Entry Point
 * 
 * Hostinger's Node.js Selector defaults to using `app.js` as the application 
 * startup file. This wrapper ensures environment variables are loaded and 
 * the main server starts seamlessly without requiring manual configuration.
 */

// Load environment variables from .env file
require('dotenv').config();

// Start the server
require('./server.js');
