require('dotenv').config();
console.log("Without expand:", process.env.EXPO_PUBLIC_API_URL);
const expand = require('dotenv-expand');
expand.expand({ parsed: require('dotenv').parse(require('fs').readFileSync('.env')) });
console.log("With expand:", process.env.EXPO_PUBLIC_API_URL);
