import { readFileSync } from 'fs';
import { resolve } from 'path';

const html = readFileSync(resolve('../api_hunt/portal_bundles/live_search_output.html'), 'utf8');
const alerts = [...html.matchAll(/<div[^>]*class="[^"]*(?:alert|validation|error)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)].map(m => m[1].replace(/<[^>]+>/g, ' ').trim());
console.log('Alerts:', alerts.filter(Boolean));

const fieldErrors = [...html.matchAll(/class="[^"]*(?:field-validation-error|error)[^"]*"[^>]*>([\s\S]*?)<\//gi)].map(m => m[1].replace(/<[^>]+>/g, ' ').trim());
console.log('Field errors:', fieldErrors.filter(Boolean));

const inputs = [...html.matchAll(/<input[^>]+name="([^"]+)"[^>]*value="([^"]*)"/gi)].map(m => [m[1], m[2]]);
console.log('Inputs after post:', inputs.filter(([k]) => !k.includes('Token')));
