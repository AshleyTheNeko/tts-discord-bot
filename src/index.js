require('dotenv').config({ path: ['.env', ...process.env.NODE_ENV ? [`.env.${process.env.NODE_ENV}`] : []] })
const { getClient } = require('./discord/client');
const { startPredictionService } = require('./services/predictions');

getClient();
startPredictionService();