import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const Icon = ({ name, size = 18, className = '' }) => {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    leaf: <><path d="M19.5 4.5C12.1 4.6 6.3 7.2 5.6 12.5c-.4 3.1 1.8 5.3 4.6 5.3 5.1 0 8.6-5.6 9.3-13.3Z"/><path d="M4.5 20c2.2-4.8 6-8.2 10.7-10.4"/></>,
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.7"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.7"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.7"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.7"/></>,
    lots: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    recipe: <><path d="M4 6.5h16M4 12h16M4 17.5h10"/><circle cx="7" cy="6.5" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="17.5" r="2"/></>,
    requests: <><path d="M6 4.5h12a2 2 0 0 1 2 2v12l-3.5-2.5H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><path d="M8 9h8M8 12.5h5"/></>,
    team: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.3A4.7 4.7 0 0 1 8.2 13h1.6a4.7 4.7 0 0 1 4.7 4.7V19M16 5.5a3 3 0 0 1 0 5.8M17 13.2a4.7 4.7 0 0 1 3.5 4.5V19"/></>,
    shield: <><path d="M12 3 19 6v5.2c0 4.4-2.8 7.7-7 9.8-4.2-2.1-7-5.4-7-9.8V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3m9-9h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    temp: <><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"/><path d="M12 11v6"/></>,
    drop: <><path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2"/></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name] || paths.activity}</svg>;
};

const format = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—';
const shortDate = value => value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—';
const fullDate = value => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
const initials = name => (name || 'BS').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();

function LoginView({ onLogin, error, busy }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = event => { event.preventDefault(); onLogin({ email, password }); };
  return <main className="login-screen">
    <div className="login-card">
      <section className="login-story" aria-label="Présentation de BioSynX">
        <a className="brand login-brand" href="#connexion" aria-label="BioSynX, espace équipe">
          <span className="brand-mark"><Icon name="leaf" size={23}/></span>
          <span className="brand-lockup"><strong>BioSynX</strong><small>ESPACE ÉQUIPE</small></span>
        </a>
        <div className="login-story-copy">
          <span className="eyebrow pale">BIOÉNERGIE · PROJET COLLABORATIF</span>
          <h1>Le travail d’équipe.<br/>Une validation claire.</h1>
          <p>Suivez les lots, le séchage solaire et les essais de formulation dans un même espace.</p>
        </div>
        <div className="login-principles">
          <div><span className="principle-index">01</span><span><strong>Un espace pour l’équipe</strong><small>Chaque membre utilise son propre compte.</small></span></div>
          <div><span className="principle-index">02</span><span><strong>Le manager garde la décision</strong><small>Les propositions ne changent rien avant approbation.</small></span></div>
        </div>
        <div className="login-story-foot"><span className="online-dot"/>Procédé suivi · données locales au serveur</div>
      </section>
      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-form-wrap">
          <span className="eyebrow">ACCÈS SÉCURISÉ</span>
          <h2 id="login-heading">Bon retour.</h2>
          <p className="login-intro">Connectez-vous avec les identifiants fournis par le manager.</p>
          <form onSubmit={submit}>
            <label htmlFor="login-email">Adresse e-mail</label>
            <input id="login-email" type="email" autoComplete="username" inputMode="email" maxLength={254} placeholder="nom@equipe.fr" value={email} onChange={e => setEmail(e.target.value)} required/>
            <label htmlFor="login-password">Mot de passe</label>
            <input id="login-password" type="password" autoComplete="current-password" maxLength={512} value={password} onChange={e => setPassword(e.target.value)} required/>
            <p className="form-error" role="alert" aria-live="polite">{error || ''}</p>
            <button className="button primary login-submit" type="submit" disabled={busy}><span>{busy ? 'Connexion…' : 'Se connecter'}</span><Icon name="arrow" size={19}/></button>
          </form>
          <p className="login-help">Pas encore de compte ? Demandez au manager de créer votre accès.</p>
        </div>
        <div className="login-panel-foot"><strong>BioSynX</strong><span>Le manager valide les modifications.</span></div>
      </section>
    </div>
  </main>;
}

function NavItem({ icon, label, active, badge, onClick }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} type="button">
    <Icon name={icon}/><span>{label}</span>{badge > 0 && <span className="nav-badge">{badge}</span>}
  </button>;
}

function Sidebar({ user, page, setPage, pendingCount, onLogout, mobileOpen, closeMobile }) {
  const items = [
    ['overview', 'overview', 'Vue d’ensemble'],
    ['lots', 'lots', 'Lots de production'],
    ['sun', 'dryer', 'Séchage solaire'],
    ['recipe', 'recipe', 'Formulation'],
    ['requests', 'requests', user.role === 'manager' ? 'Validations' : 'Mes demandes'],
    ...(user.role === 'manager' ? [['team', 'team', 'Équipe']] : []),
    ['shield', 'security', 'Sécurité'],
  ];
  return <>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-top">
        <a className="brand" href="#overview" onClick={e => { e.preventDefault(); setPage('overview'); closeMobile(); }}>
          <span className="brand-mark"><Icon name="leaf" size={22}/></span><span className="brand-lockup"><strong>BioSynX</strong><small>BIOÉNERGIE</small></span>
        </a>
        <div className="sidebar-label">ESPACE PROJET</div>
        <nav className="sidebar-nav" aria-label="Navigation principale">
          {items.map(([icon, key, label]) => <NavItem key={key} icon={icon} label={label} active={page === key} badge={key === 'requests' && user.role === 'manager' ? pendingCount : 0} onClick={() => { setPage(key); closeMobile(); }}/>) }
        </nav>
      </div>
      <div className="sidebar-bottom">
        <div className="project-mini"><span className="project-mini-label">PHASE ACTUELLE</span><strong>Prototype MVP</strong><small>Séchage solaire · valorisation biomasse</small></div>
        <div className="sidebar-user">
          <span className="avatar">{initials(user.name)}</span>
          <span className="user-copy"><strong>{user.name}</strong><small>{user.role === 'manager' ? 'Manager BioSynX' : 'Membre de l’équipe'}</small></span>
          <button className="icon-button signout" onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter"><Icon name="logout" size={17}/></button>
        </div>
      </div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" aria-label="Fermer le menu" onClick={closeMobile}/>}
  </>;
}

function Topbar({ title, user, onMenu, onLogout, updatedAt }) {
  return <header className="topbar">
    <div className="topbar-left"><button className="icon-button menu-trigger" onClick={onMenu} aria-label="Ouvrir le menu"><span className="menu-lines"><i/><i/><i/></span></button><div><div className="breadcrumbs">BioSynX <span>/</span> <strong>{title}</strong></div><div className="mobile-greeting">{user.name}</div></div></div>
    <div className="topbar-actions"><span className="live-pill"><span className="live-dot"/>Simulation active</span><span className="updated-note">Mis à jour {updatedAt ? shortDate(updatedAt) : 'maintenant'}</span><button className="mobile-signout icon-button" onClick={onLogout} aria-label="Se déconnecter"><Icon name="logout" size={17}/></button></div>
  </header>;
}

function MetricCard({ icon, label, value, unit, note, tone = '' }) {
  return <article className="metric-card surface-card">
    <div className="metric-top"><span className={`metric-icon ${tone}`}><Icon name={icon} size={18}/></span><span className="metric-note">{note}</span></div>
    <div className="metric-label">{label}</div><div className="metric-value">{value}<small>{unit}</small></div>
  </article>;
}

function MoistureChart({ rows }) {
  const values = [...(rows || [])].reverse();
  const width = 620, height = 220, left = 42, right = 15, top = 16, bottom = 28;
  const points = values.map((item, i) => ({
    x: left + (width - left - right) * (values.length <= 1 ? 1 : i / (values.length - 1)),
    y: top + (70 - Number(item.moisturePct)) / 60 * (height - top - bottom),
  }));
  const line = points.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = points.length ? `${line} L${points.at(-1).x} ${height - bottom} L${points[0].x} ${height - bottom} Z` : '';
  return <div className="chart-box">
    {values.length ? <svg className="moisture-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Courbe d’évolution de l’humidité du séchoir">
      <defs><linearGradient id="moisture-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--chart-line)" stopOpacity=".22"/><stop offset="1" stopColor="var(--chart-line)" stopOpacity="0"/></linearGradient></defs>
      {[10, 30, 50, 70].map(v => { const y = top + (70 - v) / 60 * (height - top - bottom); return <g key={v}><line x1={left} x2={width - right} y1={y} y2={y} className="chart-grid"/><text x="2" y={y + 4} className="chart-axis">{v}%</text></g>; })}
      <path d={area} fill="url(#moisture-fill)"/><path d={line} fill="none" stroke="var(--chart-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {points.filter((_, i) => i === points.length - 1 || i === Math.floor(points.length * .52)).map((point, i) => <circle key={i} cx={point.x} cy={point.y} r="5" className="chart-marker"/>)}
    </svg> : <div className="chart-empty"><span className="metric-icon"><Icon name="activity"/></span><strong>En attente de mesures</strong><span>Les valeurs apparaîtront ici dès le démarrage du cycle.</span></div>}
    <div className="chart-legend"><span><i/>Humidité mesurée</span><span className="legend-target"><i/>Seuil de fin indicatif</span></div>
  </div>;
}

function CycleCard({ dashboard }) {
  const lot = dashboard?.activeLot;
  const progress = Math.max(0, Math.min(100, Number(dashboard?.progressPct || 0)));
  return <article className="cycle-card surface-card">
    <div className="card-heading"><div><span className="eyebrow">CYCLE EN COURS</span><h3>{lot ? lot.material : 'Aucun cycle actif'}</h3><p>{lot ? `${lot.code} · ${lot.stage}` : 'Créez ou demandez un lot pour démarrer.'}</p></div><span className="cycle-live"><i/>{lot ? lot.status : 'À lancer'}</span></div>
    <div className="cycle-progress-label"><span>Avancement estimé</span><strong>{progress}%</strong></div>
    <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label="Avancement du cycle"><span style={{ width: `${progress}%` }}/></div>
    <div className="cycle-stats"><div><span className="mini-stat-icon"><Icon name="drop" size={16}/></span><span><small>Humidité actuelle</small><strong>{format(dashboard?.moisturePct)} %</strong></span></div><div><span className="mini-stat-icon warm"><Icon name="temp" size={16}/></span><span><small>Température</small><strong>{format(dashboard?.temperatureC)} °C</strong></span></div></div>
    <div className="cycle-foot"><span><Icon name="clock" size={14}/>Valeurs simulées</span><span>Cycle non connecté au matériel</span></div>
  </article>;
}

function ProcessFlow() {
  const steps = [
    { n: '01', title: 'Résidus de riz', text: 'Préparation avant pyrolyse', icon: 'lots' },
    { n: '02', title: 'Biochar', text: 'Carbonisation & broyage', icon: 'activity' },
    { n: '03', title: 'Bouse séchée', text: 'Pré-séchage solaire', icon: 'sun', accent: true },
    { n: '04', title: 'Briquettes', text: 'Mélange & pressage', icon: 'recipe' },
  ];
  return <article className="surface-card process-card">
    <div className="section-heading"><div><span className="eyebrow">FLUX DE PRODUCTION</span><h2>Deux voies, un même objectif.</h2><p>Les flux se rejoignent avant l’étape de pressage.</p></div><span className="soft-tag"><span className="soft-dot"/>Architecture MVP</span></div>
    <div className="process-flow">{steps.map((step, i) => <React.Fragment key={step.n}><div className={`process-node ${step.accent ? 'accent' : ''}`}><div className="node-top"><span className="node-icon"><Icon name={step.icon} size={18}/></span><span className="node-number">{step.n}</span></div><strong>{step.title}</strong><small>{step.text}</small></div>{i < steps.length - 1 && <span className="flow-arrow"><Icon name="arrow" size={17}/></span>}</React.Fragment>)}</div>
    <div className="process-note"><Icon name="shield" size={17}/><span><strong>Point de convergence</strong> — formulation bouse sèche / poudre de charbon avant pressage.</span></div>
  </article>;
}

function OverviewPage({ user, data, openLot, openRecipe, goTo }) {
  const active = data.dashboard?.activeLot;
  return <div className="page-stack">
    <section className="welcome-row"><div><span className="eyebrow">ESPACE DE PILOTAGE · MVP</span><h1>Bonjour, {user.name.split(' ')[0]}.</h1><p>Suivez les matières, les cycles et les décisions de l’équipe au même endroit.</p></div><button className="button primary" onClick={openLot}><Icon name="plus" size={17}/>{user.role === 'manager' ? 'Nouveau lot' : 'Demander un lot'}</button></section>
    <div className="notice-strip"><span className="notice-symbol"><Icon name="activity" size={17}/></span><span><strong>Mode démonstration.</strong> Les mesures sont simulées ; aucun ESP32, moteur ou relais n’est piloté par cette plateforme.</span><button onClick={() => goTo('security')}>En savoir plus <Icon name="arrow" size={14}/></button></div>
    <section className="metrics-grid" aria-label="Indicateurs de l’atelier">
      <MetricCard icon="lots" label="Lots actifs" value={active ? 1 : 0} unit="" note="Cycle actuel" tone="green"/>
      <MetricCard icon="temp" label="Température" value={format(data.dashboard?.temperatureC)} unit="°C" note="Séchoir solaire" tone="warm"/>
      <MetricCard icon="drop" label="Humidité mesurée" value={format(data.dashboard?.moisturePct)} unit="%" note="Intrant en cours" tone="blue"/>
      <MetricCard icon="recipe" label="Flux suivis" value={String(data.dashboard?.fluxCount ?? 0).padStart(2,'0')} unit="" note="Matières actives" tone="violet"/>
    </section>
    <section className="dashboard-grid">
      <article className="surface-card chart-card">
        <div className="section-heading"><div><span className="eyebrow">SÉCHAGE SOLAIRE</span><h2>Évolution de l’humidité</h2><p>Tendance de mesure simulée sur le dernier cycle.</p></div><span className="chart-range">24 dernières mesures</span></div>
        <MoistureChart rows={data.measurements}/>
      </article>
      <CycleCard dashboard={data.dashboard}/>
    </section>
    <ProcessFlow/>
    <section className="bottom-grid">
      <article className="surface-card recipe-preview">
        <div className="card-heading"><div><span className="eyebrow">ESSAI EN COURS</span><h2>Formulation de référence</h2></div><button className="text-button" onClick={() => goTo('recipe')}>Voir le détail <Icon name="arrow" size={15}/></button></div>
        <div className="ratio-display"><div><span className="ratio-symbol manure">B</span><span><strong>Bouse séchée</strong><small>Liant organique · à valider</small></span><b>{data.recipe?.testManurePct ?? 40}<small> %</small></b></div><div><span className="ratio-symbol charcoal">C</span><span><strong>Poudre de charbon</strong><small>Fraction carbonisée</small></span><b>{data.recipe?.testCharcoalPct ?? 60}<small> %</small></b></div></div>
        <div className="recipe-preview-foot"><span>Ratio en masse sèche</span><button className="button secondary small" onClick={openRecipe}>{user.role === 'manager' ? 'Modifier l’essai' : 'Proposer un ratio'}</button></div>
      </article>
      <article className="surface-card attention-card">
        <span className="eyebrow">À SURVEILLER</span><h2>Points de contrôle</h2>
        <div className="attention-list"><div><span className="attention-icon warm"><Icon name="drop"/></span><span><strong>Charge d’humidité</strong><small>Mesurer avant de dimensionner le cycle de séchage.</small></span></div><div><span className="attention-icon green"><Icon name="sun"/></span><span><strong>Capacité des claies</strong><small>Valider la charge et l’épaisseur de couche.</small></span></div><div><span className="attention-icon blue"><Icon name="shield"/></span><span><strong>Hygiène & stockage</strong><small>Prévoir un séchage complet et une zone propre.</small></span></div></div>
      </article>
    </section>
  </div>;
}

function LotsPage({ user, lots, onCreate, onStatus, onArchive }) {
  return <div className="page-stack">
    <PageIntro eyebrow="SUIVI DE PRODUCTION" title="Lots de production" description="Consultez les intrants et suivez leur progression dans le procédé." action={<button className="button primary" onClick={onCreate}><Icon name="plus"/>{user.role === 'manager' ? 'Créer un lot' : 'Demander un lot'}</button>}/>
    <div className="table-toolbar"><div><strong>{lots.length} lot{lots.length > 1 ? 's' : ''}</strong><span> enregistrés</span></div><span className="soft-tag"><span className="soft-dot"/>Suivi local</span></div>
    <div className="surface-card table-card"><div className="table-scroll"><table className="data-table lots-table"><thead><tr><th>Lot</th><th>Intrant</th><th>Masse</th><th>Humidité</th><th>Étape</th><th>Statut</th><th>Action</th></tr></thead><tbody>
      {lots.length ? lots.map(lot => <tr key={lot.id}><td><strong>{lot.code}</strong><small>{shortDate(lot.createdAt)}</small></td><td><span className="material-cell"><span className="table-material-icon"><Icon name={lot.material?.includes('Bouse') ? 'sun' : 'lots'} size={15}/></span>{lot.material}</span></td><td>{format(lot.massKg)} kg</td><td>{lot.moisturePct == null ? '—' : `${format(lot.moisturePct)} %`}</td><td>{lot.stage}</td><td><StatusTag status={lot.status}/></td><td><div className="lot-action-cell"><select value={lot.status === 'Archivé' ? 'À préparer' : lot.status} aria-label={`${user.role === 'manager' ? 'Modifier' : 'Proposer une modification du'} statut du lot ${lot.code}`} onChange={e => onStatus(lot.id, e.target.value)}><option>À préparer</option><option>En cours</option><option>Terminé</option></select><button className="button danger-quiet small" onClick={() => onArchive(lot)}>{user.role === 'manager' ? 'Archiver' : 'Demander l’archivage'}</button></div></td></tr>) : <tr><td colSpan="7" className="empty-cell">Aucun lot enregistré. Créez une demande pour commencer.</td></tr>}
    </tbody></table></div></div>
    <div className="info-banner"><Icon name="shield"/><span>Les membres peuvent proposer un changement de statut ou d’archivage. Le manager doit l’approuver pour l’appliquer.</span></div>
  </div>;
}

function RecipePage({ recipe, user, onEdit }) {
  return <div className="page-stack">
    <PageIntro eyebrow="ESSAIS DE PRODUCTION" title="Formulation & points de contrôle" description="Les pourcentages sont exprimés en masse sèche. Confirmez chaque ratio par essais de pressage, séchage et combustion." action={<button className="button primary" onClick={onEdit}><Icon name="recipe"/>{user.role === 'manager' ? 'Modifier l’essai' : 'Proposer une modification'}</button>}/>
    <section className="recipe-layout">
      <article className="surface-card recipe-main-card"><span className="eyebrow">RATIO D’ESSAI ACTUEL</span><h2>Un mélange à documenter sur le terrain.</h2><p className="body-copy">La bouse séchée joue le rôle de liant ; la poudre de charbon apporte l’énergie. Les valeurs restent indicatives tant qu’elles ne sont pas confirmées sur les équipements du MVP.</p>
        <div className="ratio-bars"><div className="ratio-line"><div><span className="ratio-symbol manure">B</span><span><strong>Bouse séchée</strong><small>Plage indicative : {recipe?.manureMin ?? 30}–{recipe?.manureMax ?? 50} %</small></span><b>{recipe?.testManurePct ?? 40}%</b></div><div className="ratio-track"><span className="manure-fill" style={{width:`${recipe?.testManurePct ?? 40}%`}}/></div></div><div className="ratio-line"><div><span className="ratio-symbol charcoal">C</span><span><strong>Poudre de charbon</strong><small>Plage indicative : {recipe?.charcoalMin ?? 50}–{recipe?.charcoalMax ?? 70} %</small></span><b>{recipe?.testCharcoalPct ?? 60}%</b></div><div className="ratio-track"><span className="charcoal-fill" style={{width:`${recipe?.testCharcoalPct ?? 60}%`}}/></div></div></div>
        <div className="ratio-total"><span>Total du mélange</span><strong>{(recipe?.testManurePct ?? 40) + (recipe?.testCharcoalPct ?? 60)}%</strong></div>
      </article>
      <article className="surface-card checklist-card"><span className="eyebrow">AVANT VALIDATION</span><h2>À vérifier sur échantillons</h2><div className="checklist"><div><span className="check-number">01</span><span><strong>Humidité de la bouse</strong><small>Documenter la teneur après séchage.</small></span></div><div><span className="check-number">02</span><span><strong>Granulométrie du charbon</strong><small>Vérifier la finesse et l’homogénéité.</small></span></div><div><span className="check-number">03</span><span><strong>Tenue de la briquette</strong><small>Comparer pressage, séchage et combustion.</small></span></div></div></article>
    </section>
    <div className="info-banner"><Icon name="requests"/><span>{user.role === 'manager' ? 'Vous pouvez modifier le ratio directement. Les propositions des membres apparaissent dans Validations.' : 'Votre proposition de ratio restera en attente ; la formulation active ne changera qu’après validation du manager.'}</span></div>
  </div>;
}

function StatusTag({ status }) {
  const cls = status === 'Terminé' || status === 'approved' ? 'success' : status === 'En cours' || status === 'pending' ? 'warning' : status === 'rejected' || status === 'Archivé' ? 'muted' : 'neutral';
  const label = ({ pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée' })[status] || status;
  return <span className={`status-tag ${cls}`}><i/>{label}</span>;
}

function RequestDetails({ request }) {
  const p = request.payload || {};
  if (request.type === 'lot_create') return <>{p.material} · {format(p.massKg)} kg{p.moisturePct == null ? '' : ` · humidité ${format(p.moisturePct)} %`}</>;
  if (request.type === 'lot_update') return <>Lot #{p.lotId}{p.status ? ` · statut : ${p.status}` : ''}{p.moisturePct !== undefined ? ` · humidité : ${p.moisturePct == null ? 'non renseignée' : `${format(p.moisturePct)} %`}` : ''}</>;
  if (request.type === 'lot_archive') return <>Demande d’archivage du lot #{p.lotId}.</>;
  if (request.type === 'recipe_update') return <>{p.testManurePct} % bouse séchée / {p.testCharcoalPct} % poudre de charbon</>;
  return <>Modification proposée</>;
}
const requestLabels = { lot_create: 'Création de lot', lot_update: 'Modification de lot', lot_archive: 'Archivage de lot', recipe_update: 'Formulation' };

function RequestsPage({ user, requests, onReview }) {
  const pending = requests.filter(item => item.status === 'pending').length;
  return <div className="page-stack">
    <PageIntro eyebrow={user.role === 'manager' ? 'DÉCISIONS DE L’ÉQUIPE' : 'SUIVI PERSONNEL'} title={user.role === 'manager' ? 'Validations' : 'Mes demandes'} description={user.role === 'manager' ? 'Les changements restent en attente jusqu’à votre décision.' : 'Suivez l’état des propositions envoyées au manager.'} action={<span className={`status-tag ${pending ? 'warning' : 'success'}`}><i/>{pending} en attente</span>}/>
    {requests.length ? <div className="request-list">{requests.map(request => <article className="surface-card request-card" key={request.id}>
      <div className="request-card-heading"><div><span className="request-kind">{requestLabels[request.type] || 'Demande'} · #{request.id}</span><p>{user.role === 'manager' ? `Par ${request.requester?.name} · ${request.requester?.email}` : 'Soumise'} · {fullDate(request.createdAt)}</p></div><StatusTag status={request.status}/></div>
      <div className="request-description"><RequestDetails request={request}/></div>
      {request.reviewNote && <div className="review-note"><span>Note du manager</span>{request.reviewNote}</div>}
      {user.role === 'manager' && request.status === 'pending' && <div className="request-buttons"><button className="button primary" onClick={() => onReview(request, 'approved')}><Icon name="check"/>Approuver</button><button className="button secondary" onClick={() => onReview(request, 'rejected')}>Refuser</button></div>}
    </article>)}</div> : <EmptyState icon="requests" title="Aucune demande pour le moment" description={user.role === 'manager' ? 'Les propositions de l’équipe apparaîtront ici pour validation.' : 'Vos demandes et leurs décisions apparaîtront ici.'}/ >}
  </div>;
}

function TeamPage({ team, onCreate, onToggle, onReset }) {
  return <div className="page-stack">
    <PageIntro eyebrow="ACCÈS & RÔLES" title="Équipe BioSynX" description="Le manager gère les comptes. Les membres disposent d’un accès individuel, sans droit d’approbation."/>
    <section className="surface-card invite-card"><div><span className="eyebrow">NOUVEL ACCÈS</span><h2>Inviter un membre</h2><p>Créez le compte et transmettez son mot de passe provisoire par un canal sûr.</p></div><form className="invite-form" onSubmit={onCreate}><label>Nom complet<input name="name" autoComplete="name" minLength="2" maxLength="80" placeholder="Nom du membre" required/></label><label>Adresse e-mail<input name="email" type="email" autoComplete="email" maxLength="254" placeholder="nom@equipe.fr" required/></label><label>Mot de passe provisoire<input name="password" type="password" autoComplete="new-password" minLength="12" maxLength="512" placeholder="12 caractères minimum" required/></label><button className="button primary" type="submit"><Icon name="plus"/>Créer le compte</button></form></section>
    <section className="surface-card team-table-card"><div className="section-heading"><div><span className="eyebrow">COMPTES</span><h2>{team.length} personne{team.length === 1 ? '' : 's'}</h2></div><span className="soft-tag">{team.filter(person => person.active).length} actif{team.filter(person => person.active).length === 1 ? '' : 's'}</span></div><div className="table-scroll"><table className="data-table team-table"><thead><tr><th>Personne</th><th>Rôle</th><th>État</th><th>Gestion</th></tr></thead><tbody>{team.map(person => <tr key={person.id}><td><div className="team-person"><strong>{person.name}</strong><small>{person.email}</small></div></td><td><span className={`role-tag ${person.role}`}>{person.role === 'manager' ? 'Manager' : 'Membre'}</span></td><td><StatusTag status={person.active ? 'Actif' : 'Suspendu'}/></td><td>{person.role === 'manager' ? <span className="subtle">Compte principal</span> : <div className="team-actions"><button className="button secondary small" onClick={() => onToggle(person)}>{person.active ? 'Suspendre' : 'Réactiver'}</button><button className="button ghost small" onClick={() => onReset(person)}>Réinitialiser le mot de passe</button></div>}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function SecurityPage() {
  return <div className="page-stack"><PageIntro eyebrow="PÉRIMÈTRE DU PROTOTYPE" title="Sécurité & limites" description="BioSynX suit les données du projet ; cette version ne pilote aucun équipement physique."/><div className="security-grid"><article className="surface-card security-card"><span className="security-icon"><Icon name="shield" size={20}/></span><h2>Comptes et validations</h2><p>Comptes individuels, rôle manager/membre, sessions avec cookie HttpOnly, protection CSRF, limitation des tentatives et demandes enregistrées dans SQLite.</p></article><article className="surface-card security-card"><span className="security-icon warm"><Icon name="activity" size={20}/></span><h2>Pas de commande matérielle</h2><p>Les mesures affichées sont simulées. Aucun ESP32, relais, moteur ou circuit 220 V n’est connecté ou commandé depuis le navigateur.</p></article><article className="surface-card security-card"><span className="security-icon blue"><Icon name="sun" size={20}/></span><h2>Déploiement d’équipe</h2><p>Le serveur écoute en local par défaut. Pour un accès sur plusieurs appareils, prévoir un déploiement HTTPS, des sauvegardes et une revue de sécurité.</p></article></div></div>;
}

function PageIntro({ eyebrow, title, description, action }) {
  return <section className="page-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div className="intro-action">{action}</div>}</section>;
}

function EmptyState({ icon, title, description }) {
  return <div className="surface-card empty-state"><span className="empty-icon"><Icon name={icon} size={22}/></span><strong>{title}</strong><span>{description}</span></div>;
}

function Dialog({ title, eyebrow, description, onClose, children, wide = false }) {
  useEffect(() => { const close = event => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className={`modal-card ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="icon-button modal-close" onClick={onClose} aria-label="Fermer"><Icon name="close"/></button><span className="eyebrow">{eyebrow}</span><h2 id="modal-title">{title}</h2>{description && <p className="modal-description">{description}</p>}{children}</section></div>;
}

function LotDialog({ onClose, onSubmit, role }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async event => { event.preventDefault(); setError(''); setBusy(true); const form = new FormData(event.currentTarget); try { await onSubmit({ material: form.get('material'), massKg: Number(form.get('massKg')), moisturePct: form.get('moisturePct') === '' ? null : Number(form.get('moisturePct')) }); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <Dialog eyebrow="SUIVI DE PRODUCTION" title={role === 'manager' ? 'Créer un lot' : 'Demander un lot'} description="Renseignez l’intrant et les premières mesures connues." onClose={onClose}>
    <form className="modal-form" onSubmit={submit}><label>Intrant principal<select name="material" required><option>Bouse fraîche</option><option>Bouse pré-séchée</option><option>Résidus de riz</option><option>Poudre de charbon</option><option>Briquettes</option></select></label><label>Masse (kg)<input name="massKg" type="number" min="0.1" max="10000" step="0.1" defaultValue="10" required/></label><label>Humidité mesurée (%) <span className="optional">optionnel</span><input name="moisturePct" type="number" min="0" max="100" step="0.1" placeholder="ex. 35"/></label><p className="form-error" role="alert">{error}</p><div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Annuler</button><button className="button primary" disabled={busy}>{busy ? 'Envoi…' : role === 'manager' ? 'Enregistrer le lot' : 'Envoyer au manager'}</button></div></form>
  </Dialog>;
}

function RecipeDialog({ recipe, role, onClose, onSubmit }) {
  const [manure, setManure] = useState(recipe?.testManurePct ?? 40);
  const [charcoal, setCharcoal] = useState(recipe?.testCharcoalPct ?? 60);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async event => { event.preventDefault(); setError(''); if (Number(manure) + Number(charcoal) !== 100) { setError('Les deux valeurs doivent totaliser 100 %.'); return; } setBusy(true); try { await onSubmit({ testManurePct: Number(manure), testCharcoalPct: Number(charcoal) }); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <Dialog eyebrow="ESSAI DE FORMULATION" title={role === 'manager' ? 'Définir le ratio test' : 'Proposer un ratio'} description="Les pourcentages sont en masse sèche et doivent totaliser 100 %." onClose={onClose}>
    <form className="modal-form" onSubmit={submit}><label>Bouse séchée (%)<input type="number" min="30" max="50" step="1" value={manure} onChange={e => { const val = e.target.value; setManure(val); if (val !== '') setCharcoal(100 - Number(val)); }} required/></label><label>Poudre de charbon (%)<input type="number" min="50" max="70" step="1" value={charcoal} onChange={e => setCharcoal(e.target.value)} required/></label><div className="ratio-helper"><span>Total</span><strong>{(Number(manure) || 0) + (Number(charcoal) || 0)} %</strong></div><p className="form-error" role="alert">{error}</p><div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Annuler</button><button className="button primary" disabled={busy}>{busy ? 'Envoi…' : role === 'manager' ? 'Enregistrer' : 'Soumettre'}</button></div></form>
  </Dialog>;
}

function ReviewDialog({ item, decision, onClose, onSubmit }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async event => { event.preventDefault(); setBusy(true); setError(''); try { await onSubmit(item, decision, note); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <Dialog eyebrow="DÉCISION MANAGER" title={decision === 'approved' ? 'Approuver la demande ?' : 'Refuser la demande ?'} description={<><strong>{requestLabels[item.type]}</strong> · <RequestDetails request={item}/></>} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}><label>Note au membre <span className="optional">facultatif</span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Ajoutez un contexte ou un motif."/></label><p className="form-error" role="alert">{error}</p><div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Annuler</button><button className={`button ${decision === 'approved' ? 'primary' : 'danger'}`} disabled={busy}>{busy ? 'Traitement…' : decision === 'approved' ? 'Approuver' : 'Refuser'}</button></div></form>
  </Dialog>;
}

function App() {
  const [user, setUser] = useState(null);
  const [csrf, setCsrf] = useState('');
  const [booting, setBooting] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [page, setPage] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [data, setData] = useState({ dashboard: null, lots: [], measurements: [], recipe: null, requests: [], team: [] });

  const api = useCallback(async (url, options = {}) => {
    const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
    const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    let body = {}; try { body = await response.json(); } catch {}
    if (!response.ok) {
      if (response.status === 401 && url !== '/api/login') { setUser(null); setPage('overview'); }
      throw new Error(body.error || 'Erreur de communication avec le serveur.');
    }
    if (body.csrf) setCsrf(body.csrf);
    return body;
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const promises = [api('/api/dashboard'), api('/api/lots'), api('/api/measurements?limit=24'), api('/api/recipe'), api('/api/requests')];
      if (user.role === 'manager') promises.push(api('/api/team'));
      const [dashboard, lots, measurements, recipe, requests, team] = await Promise.all(promises);
      setData({ dashboard, lots: lots.items, measurements: measurements.items, recipe, requests: requests.items, team: team?.items || [] });
      setUpdatedAt(new Date().toISOString());
    } catch (error) { if (!/Authentification requise/.test(error.message)) showToast('Données momentanément indisponibles.'); }
  }, [api, user]);

  useEffect(() => {
    let alive = true;
    fetch('/api/session', { credentials: 'same-origin' }).then(response => response.json()).then(session => {
      if (!alive) return;
      setCsrf(session.csrf || '');
      if (session.authenticated && session.user) setUser(session.user);
    }).catch(() => {}).finally(() => { if (alive) setBooting(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (!user) return undefined; refresh(); const timer = window.setInterval(refresh, 15000); return () => window.clearInterval(timer); }, [user, refresh]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer); }, [toast]);

  function showToast(message) { setToast(message); }
  async function handleLogin(credentials) {
    setLoginBusy(true); setLoginError('');
    try { const result = await api('/api/login', { method: 'POST', body: JSON.stringify(credentials) }); setCsrf(result.csrf); setUser(result.user); setPage('overview'); setData({ dashboard: null, lots: [], measurements: [], recipe: null, requests: [], team: [] }); showToast('Connexion réussie.'); }
    catch (error) { setLoginError(error.message); }
    finally { setLoginBusy(false); }
  }
  async function handleLogout() {
    try { await api('/api/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: '{}' }); } catch {}
    setUser(null); setCsrf(''); setPage('overview'); setMobileOpen(false); setLoginError('');
  }
  async function saveLot(payload) {
    const result = await api('/api/lots', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) });
    setModal(null); showToast(result.pending ? 'Demande envoyée au manager.' : 'Lot créé et enregistré.'); await refresh();
  }
  async function saveRecipe(payload) {
    const result = await api('/api/recipe', { method: 'PUT', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) });
    setModal(null); showToast(result.pending ? 'Proposition envoyée au manager.' : 'Formulation mise à jour.'); await refresh();
  }
  async function changeLot(id, status) {
    try { const result = await api(`/api/lots/${id}`, { method: 'PATCH', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ status }) }); showToast(result.pending ? 'Demande transmise au manager.' : 'Statut du lot mis à jour.'); await refresh(); }
    catch (error) { showToast(error.message); await refresh(); }
  }
  async function archiveLot(lot) {
    const message = user.role === 'manager' ? `Archiver le lot ${lot.code} ?` : `Envoyer une demande d’archivage pour ${lot.code} ?`;
    if (!window.confirm(message)) return;
    try { const result = await api(`/api/lots/${lot.id}/archive`, { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: '{}' }); showToast(result.pending ? 'Demande d’archivage transmise.' : 'Lot archivé.'); await refresh(); }
    catch (error) { showToast(error.message); }
  }
  async function reviewRequest(item, decision, note = '') {
    const result = await api(`/api/requests/${item.id}/review`, { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ decision, note }) });
    setModal(null); showToast(decision === 'approved' ? 'Demande approuvée et appliquée.' : 'Demande refusée.'); await refresh(); return result;
  }
  async function createMember(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try { await api('/api/team', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password') }) }); event.currentTarget.reset(); showToast('Compte membre créé.'); await refresh(); }
    catch (error) { showToast(error.message); }
  }
  async function toggleMember(person) {
    try { await api(`/api/team/${person.id}`, { method: 'PATCH', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ active: !person.active }) }); showToast(person.active ? 'Compte suspendu.' : 'Compte réactivé.'); await refresh(); }
    catch (error) { showToast(error.message); }
  }
  async function resetMember(person) {
    const password = window.prompt(`Nouveau mot de passe provisoire pour ${person.name} (12 caractères minimum) :`);
    if (password === null) return;
    try { await api(`/api/team/${person.id}`, { method: 'PATCH', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ password }) }); showToast('Mot de passe réinitialisé.'); }
    catch (error) { showToast(error.message); }
  }

  if (booting) return <div className="boot-screen"><span className="brand-mark"><Icon name="leaf" size={23}/></span><strong>BioSynX</strong><span className="boot-loader"/></div>;
  if (!user) return <><LoginView onLogin={handleLogin} error={loginError} busy={loginBusy}/><Toast message={toast}/></>;

  const pendingCount = data.requests.filter(item => item.status === 'pending').length;
  const title = ({ overview: 'Vue d’ensemble', lots: 'Lots de production', dryer: 'Séchage solaire', recipe: 'Formulation', requests: user.role === 'manager' ? 'Validations' : 'Mes demandes', team: 'Équipe BioSynX', security: 'Sécurité' })[page] || 'BioSynX';
  const openReview = (item, decision) => setModal({ type: 'review', item, decision });
  return <div className="app-shell">
    <Sidebar user={user} page={page} setPage={setPage} pendingCount={pendingCount} onLogout={handleLogout} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)}/>
    <main className="main-area">
      <Topbar title={title} user={user} onMenu={() => setMobileOpen(true)} onLogout={handleLogout} updatedAt={updatedAt}/>
      <div className="page-content">
        {page === 'overview' && <OverviewPage user={user} data={data} openLot={() => setModal({ type: 'lot' })} openRecipe={() => setModal({ type: 'recipe' })} goTo={setPage}/>}
        {page === 'lots' && <LotsPage user={user} lots={data.lots} onCreate={() => setModal({ type: 'lot' })} onStatus={changeLot} onArchive={archiveLot}/>}
        {page === 'dryer' && <div className="page-stack"><PageIntro eyebrow="MESURES & CYCLES" title="Séchage solaire" description="Suivez les mesures disponibles pour le cycle actif. Les données actuelles sont simulées."/><div className="dashboard-grid"><article className="surface-card chart-card"><div className="section-heading"><div><span className="eyebrow">TENDANCE</span><h2>Humidité au fil du cycle</h2></div><span className="soft-tag">Simulation</span></div><MoistureChart rows={data.measurements}/></article><CycleCard dashboard={data.dashboard}/></div><div className="info-banner"><Icon name="shield"/><span>Ce tableau ne commande pas le séchoir, les ventilateurs ni les équipements électriques.</span></div></div>}
        {page === 'recipe' && <RecipePage recipe={data.recipe} user={user} onEdit={() => setModal({ type: 'recipe' })}/>}
        {page === 'requests' && <RequestsPage user={user} requests={data.requests} onReview={openReview}/>}
        {page === 'team' && user.role === 'manager' && <TeamPage team={data.team} onCreate={createMember} onToggle={toggleMember} onReset={resetMember}/>}
        {page === 'security' && <SecurityPage/>}
      </div>
    </main>
    <Toast message={toast}/>
    {modal?.type === 'lot' && <LotDialog role={user.role} onClose={() => setModal(null)} onSubmit={saveLot}/>}
    {modal?.type === 'recipe' && <RecipeDialog role={user.role} recipe={data.recipe} onClose={() => setModal(null)} onSubmit={saveRecipe}/>}
    {modal?.type === 'review' && <ReviewDialog item={modal.item} decision={modal.decision} onClose={() => setModal(null)} onSubmit={reviewRequest}/>}
  </div>;
}

function Toast({ message }) { return <div className={`toast ${message ? 'visible' : ''}`} role="status" aria-live="polite">{message}</div>; }

createRoot(document.getElementById('root')).render(<App/>);
