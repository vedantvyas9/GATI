// Consolidated Analytics API - handles all analytics endpoints via routing
const pool = require('./db');

// Import handler functions from lib directory (outside api/ to avoid function count)
const handleTimeseries = require('../../lib/analytics-handlers/timeseries');
const handleEngagement = require('../../lib/analytics-handlers/engagement');
const handleUsers = require('../../lib/analytics-handlers/users');
const handleFeatures = require('../../lib/analytics-handlers/features');
const handleRetention = require('../../lib/analytics-handlers/retention');
const handleInfrastructure = require('../../lib/analytics-handlers/infrastructure');

module.exports = async function handler(request, response) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Extract endpoint from Vercel dynamic route parameter
  // The endpoint comes from the [endpoint] in the filename
  const endpoint = request.query?.endpoint || null;

  // Route to appropriate handler
  switch (endpoint) {
    case 'timeseries':
      return await handleTimeseries(request, response);
    case 'engagement':
      return await handleEngagement(request, response);
    case 'users':
      return await handleUsers(request, response);
    case 'features':
      return await handleFeatures(request, response);
    case 'retention':
      return await handleRetention(request, response);
    case 'infrastructure':
      return await handleInfrastructure(request, response);
    default:
      return response.status(404).json({ 
        error: 'Analytics endpoint not found',
        available_endpoints: ['timeseries', 'engagement', 'users', 'features', 'retention', 'infrastructure']
      });
  }
};

