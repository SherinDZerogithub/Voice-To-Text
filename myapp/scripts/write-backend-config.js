const fs = require('fs');
const path = require('path');

const backendUrl = (
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  ''
)
  .trim()
  .replace(/\/$/, '');

if (!/^https:\/\//i.test(backendUrl)) {
  throw new Error(
    'A production backend URL is required. Set EXPO_PUBLIC_BACKEND_URL to an https:// Azure App Service URL.',
  );
}

const outputPath = path.join(__dirname, '..', 'generated', 'backendConfig.js');
const escapedUrl = JSON.stringify(backendUrl);
fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(
  outputPath,
  `// Generated file. Do not edit manually.\nexport default {backendUrl: ${escapedUrl}};\n`,
);
console.log(`Configured backend URL: ${backendUrl}`);
