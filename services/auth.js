const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);

module.exports = { oauth2Client };
