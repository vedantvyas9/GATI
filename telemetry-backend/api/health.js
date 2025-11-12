// Health check endpoint
module.exports = async function handler(request, response) {
  return response.status(200).json({ status: 'healthy' });
};
