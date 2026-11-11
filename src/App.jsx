import { useState } from 'react';

const Shield = ({ small = false }) => (
  <span className={`shield-icon${small ? ' small' : ''}`} aria-hidden="true">✓</span>
);

function formatDate(value) {
  if (!value) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function App() {
  const [mode, setMode] = useState('single');
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState('');
  const [result, setResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setResult(null);
    setBatchResult(null);
    setLoading(true);
    try {
      const isBatch = mode === 'batch';
      const list = emails.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
      const response = await fetch(isBatch ? '/api/check/batch' : '/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isBatch ? { emails: list } : { email: email.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Impossible de terminer la vérification.');
      if (isBatch) setBatchResult(data.results);
      else setResult(data);
    } catch (err) {
      setError(err.message || 'Une erreur réseau est survenue. Vérifiez que le serveur est démarré.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Email Security Checker, accueil">
          <span className="brand-mark"><Shield /></span>
          <span>Email<span className="brand-light">Security</span><span className="brand-check">Checker</span></span>
        </a>
        <div className="topbar-right"><span className="status-dot" /> Vérification sécurisée <span className="top-divider" /> <a href="#how">Comment ça marche</a></div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow-icon">✳</span> VOTRE SÉCURITÉ NUMÉRIQUE, EN UN CLIN D’ŒIL</div>
          <h1>Votre e-mail a-t-il<br /><span>été exposé&nbsp;?</span></h1>
          <p className="hero-copy">Découvrez si vos informations apparaissent dans des violations de données connues. Une vérification rapide, confidentielle et sans inscription.</p>

          <div className="checker-card">
            <div className="tabs" role="tablist" aria-label="Mode de vérification">
              <button type="button" className={`tab${mode === 'single' ? ' active' : ''}`} onClick={() => { setMode('single'); setError(''); setResult(null); setBatchResult(null); }} role="tab" aria-selected={mode === 'single'}><span>◎</span> Une adresse</button>
              <button type="button" className={`tab${mode === 'batch' ? ' active' : ''}`} onClick={() => { setMode('batch'); setError(''); setResult(null); setBatchResult(null); }} role="tab" aria-selected={mode === 'batch'}><span>▤</span> Plusieurs adresses</button>
            </div>
            <form onSubmit={submit}>
              {mode === 'single' ? (
                <label className="input-wrap"><span className="input-icon" aria-hidden="true">✉</span><input type="email" required maxLength="254" autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Adresse e-mail à vérifier" /><span className="input-lock" aria-hidden="true">♧</span></label>
              ) : (
                <label className="batch-label"><span className="sr-only">Adresses e-mail à vérifier, une par ligne</span><textarea required placeholder={'vous@exemple.com\ncollegue@exemple.com'} value={emails} onChange={(event) => setEmails(event.target.value)} rows="3" /><span className="batch-hint">Une adresse par ligne · 10 maximum</span></label>
              )}
              <button className="submit-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Vérification en cours…</> : <>Vérifier mon adresse <span aria-hidden="true">→</span></>}</button>
            </form>
            <div className="privacy-note"><span aria-hidden="true">♧</span> Vos recherches ne sont ni enregistrées ni partagées.</div>
          </div>

          {error && <div className="error-box" role="alert"><span>!</span><p>{error}</p></div>}
          {result && <ResultCard result={result} />}
          {batchResult && <div className="batch-results"><div className="batch-heading"><strong>Résultats de la vérification</strong><span>{batchResult.length} adresse{batchResult.length > 1 ? 's' : ''}</span></div>{batchResult.map((item) => <div className="batch-row" key={item.email}><span className={`mini-status ${item.compromised ? 'found' : 'safe'}`}>{item.compromised ? '!' : '✓'}</span><span className="batch-email">{item.email}</span><span className={item.compromised ? 'batch-count found-text' : 'batch-count'}>{item.compromised ? `${item.breachCount} fuite${item.breachCount > 1 ? 's' : ''}` : 'Aucune fuite trouvée'}</span></div>)}</div>}

          <div className="trust-row"><div><span className="trust-icon purple">⌁</span><span><strong>Confidentiel</strong><small>Aucune donnée conservée</small></span></div><i /><div><span className="trust-icon green">✓</span><span><strong>Fiable</strong><small>Sources reconnues</small></span></div><i /><div><span className="trust-icon blue">◷</span><span><strong>Instantané</strong><small>Résultats en quelques secondes</small></span></div></div>
        </section>

        <section className="how-section" id="how"><div className="section-label">SIMPLE ET TRANSPARENT</div><h2>Comment ça marche&nbsp;?</h2><p className="section-intro">Un processus simple pour vous aider à reprendre le contrôle de votre sécurité numérique.</p><div className="steps"><article><span className="step-number">01</span><div className="step-icon lilac">⌕</div><h3>Entrez votre e-mail</h3><p>Saisissez l’adresse que vous souhaitez vérifier. Aucune inscription n’est nécessaire.</p></article><article><span className="step-number">02</span><div className="step-icon mint">◈</div><h3>Nous vérifions</h3><p>Votre adresse est comparée aux incidents de sécurité rendus publics.</p></article><article><span className="step-number">03</span><div className="step-icon sky">↗</div><h3>Agissez si besoin</h3><p>Consultez les expositions détectées et les conseils pour sécuriser vos comptes.</p></article></div></section>

        <section className="safety-banner"><div className="safety-mark"><Shield /></div><div><h2>La prévention est votre meilleure protection.</h2><p>Utilisez un mot de passe unique pour chaque service et activez la double authentification.</p></div><span className="safety-spark" aria-hidden="true">✳</span></section>
      </main>
      <footer><a className="footer-brand" href="#top"><span className="brand-mark"><Shield small /></span> Email Security Checker</a><span>Un outil de sensibilisation à la sécurité numérique.</span><a href="#how">Confidentialité &nbsp;·&nbsp; À propos</a></footer>
    </div>
  );
}

function ResultCard({ result }) {
  return (
    <section className={`result-card ${result.compromised ? 'result-found' : 'result-safe'}`} aria-live="polite">
      <div className="result-top"><span className={`result-symbol ${result.compromised ? 'warn' : 'ok'}`}>{result.compromised ? '!' : '✓'}</span><div><div className="result-kicker">RÉSULTAT POUR</div><h2>{result.email}</h2></div><span className={`result-pill ${result.compromised ? 'pill-warn' : 'pill-ok'}`}>{result.compromised ? `${result.breachCount} exposition${result.breachCount > 1 ? 's' : ''}` : 'Aucune fuite trouvée'}</span></div>
      {result.compromised ? <><p className="result-summary">Cette adresse apparaît dans des violations de données connues. Changez les mots de passe concernés et activez la double authentification.</p><div className="breach-list">{result.breaches.map((breach) => <article className="breach-item" key={`${breach.name}-${breach.breachDate}`}><div className="breach-heading"><strong>{breach.title || breach.name}</strong><span>{formatDate(breach.breachDate)}</span></div><p>{breach.domain || 'Service en ligne'}{breach.isVerified ? ' · Violation vérifiée' : ''}</p><div className="data-tags">{breach.dataClasses.map((item) => <span key={item}>{item}</span>)}</div></article>)}</div></> : <p className="result-summary">Aucune exposition n’a été trouvée pour cette adresse dans les violations de données vérifiées consultées.</p>}
      <p className="result-disclaimer">L’absence de résultat ne garantit pas qu’un compte n’a jamais été exposé.</p>
    </section>
  );
}

export default App;
