import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT) || 3000;
const apiKey = process.env.HIBP_API_KEY;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../dist');

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '16kb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Trop de demandes. Réessayez dans une minute.' } }
});
app.use('/api', apiLimiter);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BATCH_SIZE = 10;

function validateEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim());
}

async function lookupBreaches(email) {
  if (!apiKey) {
    const error = new Error('Le service de vérification n’est pas encore configuré. Ajoutez HIBP_API_KEY au serveur.');
    error.status = 503;
    error.code = 'SERVICE_NOT_CONFIGURED';
    throw error;
  }

  const url = new URL(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`);
  url.searchParams.set('truncateResponse', 'false');
  const response = await fetch(url, {
    headers: {
      'hibp-api-key': apiKey,
      'user-agent': 'Email-Security-Checker/1.0 (privacy-first breach lookup)',
      accept: 'application/json'
    },
    signal: AbortSignal.timeout(12_000)
  });

  if (response.status === 404) return [];
  if (response.status === 429) {
    const error = new Error('Le fournisseur limite temporairement les vérifications. Réessayez plus tard.');
    error.status = 503;
    error.code = 'PROVIDER_RATE_LIMITED';
    throw error;
  }
  if (response.status === 401 || response.status === 403) {
    const error = new Error('La configuration du fournisseur de vérification est invalide.');
    error.status = 502;
    error.code = 'PROVIDER_AUTH_ERROR';
    throw error;
  }
  if (!response.ok) {
    const error = new Error('Le fournisseur de vérification est momentanément indisponible.');
    error.status = 502;
    error.code = 'PROVIDER_ERROR';
    throw error;
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error('Réponse inattendue du fournisseur.');
  return payload.map((breach) => ({
    name: breach.Name,
    title: breach.Title,
    domain: breach.Domain || null,
    breachDate: breach.BreachDate || null,
    addedDate: breach.AddedDate || null,
    dataClasses: Array.isArray(breach.DataClasses) ? breach.DataClasses : [],
    isVerified: Boolean(breach.IsVerified)
  }));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'email-security-checker', providerConfigured: Boolean(apiKey) });
});

app.post('/api/check', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!validateEmail(email)) {
    return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Saisissez une adresse e-mail valide.' } });
  }

  try {
    const breaches = await lookupBreaches(email);
    return res.json({ email, compromised: breaches.length > 0, breachCount: breaches.length, breaches });
  } catch (error) {
    console.error('Breach lookup failed:', error.code || error.name || 'UNKNOWN');
    return res.status(error.status || 502).json({
      error: { code: error.code || 'LOOKUP_FAILED', message: error.message || 'La vérification a échoué.' }
    });
  }
});

app.post('/api/check/batch', async (req, res) => {
  const input = req.body?.emails;
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_BATCH_SIZE) {
    return res.status(400).json({
      error: { code: 'INVALID_BATCH', message: `Fournissez entre 1 et ${MAX_BATCH_SIZE} adresses e-mail.` }
    });
  }
  if (input.some((email) => !validateEmail(email))) {
    return res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Chaque adresse doit être valide.' } });
  }

  const results = [];
  for (const rawEmail of input) {
    const email = rawEmail.trim();
    try {
      const breaches = await lookupBreaches(email);
      results.push({ email, compromised: breaches.length > 0, breachCount: breaches.length, breaches });
    } catch (error) {
      console.error('Batch breach lookup failed:', error.code || error.name || 'UNKNOWN');
      return res.status(error.status || 502).json({
        error: { code: error.code || 'LOOKUP_FAILED', message: error.message || 'La vérification a échoué.' }
      });
    }
  }
  return res.json({ checked: results.length, results });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route API introuvable.' } });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(port, () => console.log(`Email Security Checker listening on port ${port}`));
