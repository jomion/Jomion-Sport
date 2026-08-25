/* =========================================================
   JOMION-SPORT — script.js
   JavaScript vanilla, sans dépendance externe.
   ========================================================= */

/* ===========================================================
   1. PRONOSTICS DE SECOURS (utilisés uniquement si Supabase est indisponible)
   -----------------------------------------------------------
   Depuis le branchement sur Supabase, les pronostics affichés
   sur le site proviennent normalement de la table "pronostics"
   de votre projet Supabase (gérée depuis admin.html). Ce
   tableau PRONOSTICS ne sert donc plus qu'en secours : si la
   connexion à Supabase échoue pour une raison ou une autre, le
   site l'utilise automatiquement pour continuer à fonctionner.

   Vous pouvez laisser ce tableau vide, ou y garder quelques
   pronostics de secours. Le format reste le même :

   MODÈLE (à copier-coller) :
   {
     sport: "Football",              // "Football", "Basketball", "Tennis" ou un autre sport
     competition: "Premier League",
     equipe1: "Équipe ou joueur A",
     equipe2: "Équipe ou joueur B",
     date: "13 août 2026",
     heure: "20:00",
     pronostic: "Plus de 2,5 buts",
     cote: "",                        // facultatif, ex. "1,85" — laissez "" si inconnu
     confiance: 75,                   // un nombre entre 0 et 100
     analyse: "Analyse courte du match ou de la rencontre.",
     statut: "À venir"                // "À venir", "Terminé" ou "Annulé"
   }
   =========================================================== */

const PRONOSTICS = [
  // Exemple désactivé — décommentez et modifiez pour vous en servir de modèle :
  // {
  //   sport: "Football",
  //   competition: "Premier League",
  //   equipe1: "Équipe A",
  //   equipe2: "Équipe B",
  //   date: "13 août 2026",
  //   heure: "20:00",
  //   pronostic: "Plus de 2,5 buts",
  //   cote: "1,85",
  //   confiance: 75,
  //   analyse: "Analyse du match...",
  //   statut: "À venir"
  // },
];

/* ===========================================================
   2. ARTICLES DE SECOURS (utilisés uniquement si Supabase est indisponible)
   -----------------------------------------------------------
   Même principe que pour les pronostics : les articles publiés
   proviennent normalement de la table "articles" de Supabase
   (gérée depuis admin.html). Ce tableau ARTICLES ne sert qu'en
   secours si Supabase est injoignable.

   MODÈLE (à copier-coller) :
   {
     titre: "Titre de l'article",
     sport: "Football",
     categorie: "Actualité",          // ex. "Actualité", "Guide", "Analyse"
     date: "12 août 2026",
     image: "",                        // chemin vers une image, ex. "assets/articles/mon-image.jpg" — laissez "" pour un visuel par défaut
     resume: "Résumé court affiché sur la carte de l'article.",
     contenu: "Texte complet de l'article (facultatif pour l'instant).",
     auteur: "Nom de l'auteur"
   }
   =========================================================== */

const ARTICLES = [
  // Exemple désactivé — décommentez et modifiez pour vous en servir de modèle :
  // {
  //   titre: "Titre de l'article",
  //   sport: "Football",
  //   categorie: "Actualité",
  //   date: "12 août 2026",
  //   image: "",
  //   resume: "Résumé court affiché sur la carte de l'article.",
  //   contenu: "Texte complet de l'article (facultatif pour l'instant).",
  //   auteur: "Rédaction Jomion-Sport"
  // },
];

/* ===========================================================
   1 bis. ANALYSES DE SECOURS (utilisées uniquement si Supabase est indisponible)
   -----------------------------------------------------------
   Même principe que pour les pronostics/articles : les analyses
   publiées proviennent normalement de la table "analyses" de
   Supabase (gérée depuis admin.html). Ce tableau ne sert qu'en
   secours si Supabase est injoignable.

   MODÈLE (à copier-coller) :
   {
     titre: "Sénégal — Maroc",
     sport: "Football",
     competition: "CAN 2026",
     date: "14 août 2026",
     texte_analyse: "Analyse détaillée du match...",
     conclusion: "Conclusion de l'analyse..."
   }
   =========================================================== */

const ANALYSES_SECOURS = [
  // Exemple désactivé — décommentez et modifiez pour vous en servir de modèle :
  // {
  //   titre: "Sénégal — Maroc",
  //   sport: "Football",
  //   competition: "CAN 2026",
  //   date: "14 août 2026",
  //   texte_analyse: "Analyse détaillée du match...",
  //   conclusion: "Conclusion de l'analyse..."
  // },
];

/* ---------------------------------------------------------
   3. UTILITAIRES
   --------------------------------------------------------- */

const SPORT_ICONS = {
  football: "⚽",
  basketball: "🏀",
  tennis: "🎾"
};

function sportSlug(sport) {
  return (sport || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sportIcon(sport) {
  return SPORT_ICONS[sportSlug(sport)] || "🏅";
}

function confidenceLevel(value) {
  const n = Number(value) || 0;
  if (n >= 70) return "high";
  if (n >= 40) return "medium";
  return "low";
}

const CONFIDENCE_TEXT = {
  high: "Confiance élevée",
  medium: "Confiance moyenne",
  low: "Confiance faible"
};

function confidenceSegments(value) {
  const n = Math.max(0, Math.min(100, Number(value) || 0));
  const filled = Math.round(n / 20); // 5 segments
  let html = '<div class="confidence__bar">';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="confidence__seg${i <= filled ? " is-filled" : ""}"></span>`;
  }
  html += "</div>";
  return html;
}

function statutClass(statut) {
  const s = sportSlug(statut);
  if (s.includes("termine")) return "is-termine";
  if (s.includes("annule")) return "is-annule";
  if (s.includes("encours")) return "is-encours";
  return "is-avenir";
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

/* Comme escapeHTML, mais convertit aussi les retours à la ligne
   (saisis dans un <textarea> de admin.html) en balises <br>. */
function escapeHTMLMultiline(str) {
  return escapeHTML(str).replace(/\n/g, "<br>");
}

/* Simplifie un nom pour le comparer sans se soucier des accents/
   majuscules/espaces (ex. "Atlético Madrid" ↔ "atletico-madrid"). */
function normaliserNom(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/* ---------------------------------------------------------
   LOGOS D'ÉQUIPES (table "equipes" de Supabase)
   -----------------------------------------------------------
   Les pronostics/matchs/scores stockent les noms d'équipes en
   texte libre (pas de lien direct vers la table "equipes"), donc
   on récupère une seule fois la liste "nom → logo" et on la
   réutilise pour retrouver le bon logo par correspondance de nom.
   --------------------------------------------------------- */

let _equipesLogosCache = null;

async function fetchEquipesLogos() {
  if (_equipesLogosCache) return _equipesLogosCache;
  _equipesLogosCache = new Map();
  if (typeof supabaseClient === "undefined") return _equipesLogosCache;
  try {
    const { data, error } = await supabaseClient
      .from("equipes")
      .select("nom, logo_url")
      .not("logo_url", "is", null);
    if (error) throw error;
    (data || []).forEach((e) => {
      if (e.logo_url) _equipesLogosCache.set(normaliserNom(e.nom), e.logo_url);
    });
  } catch (err) {
    console.warn("Supabase indisponible pour les logos d'équipes.", err);
  }
  return _equipesLogosCache;
}

/* ---------------------------------------------------------
   4. GÉNÉRATION DES CARTES "BILLET DE MATCH"
   --------------------------------------------------------- */

function renderTicketCard(p) {
  const level = confidenceLevel(p.confiance);
  return `
    <article class="ticket-card" data-sport="${sportSlug(p.sport)}">
      <div class="ticket-card__top">
        <span class="ticket-card__competition">${p.competitionLogo ? `<img src="${escapeHTML(p.competitionLogo)}" alt="" class="competition-logo" loading="lazy">` : ""}${escapeHTML(p.competition)}</span>
        <span>${escapeHTML(p.date)} · ${escapeHTML(p.heure)}</span>
      </div>
      <div class="ticket-card__body">
        <div class="ticket-card__badges">
          <span class="sport-badge">${sportIcon(p.sport)} ${escapeHTML(p.sport)}</span>
          ${p.statut ? `<span class="status-badge ${statutClass(p.statut)}">${escapeHTML(p.statut)}</span>` : ""}
        </div>
        <div class="ticket-card__teams">
          <span>${p.equipe1Logo ? `<img src="${escapeHTML(p.equipe1Logo)}" alt="" class="team-logo" loading="lazy">` : ""}${escapeHTML(p.equipe1)}</span>
          <span class="vs">vs</span>
          <span>${p.equipe2Logo ? `<img src="${escapeHTML(p.equipe2Logo)}" alt="" class="team-logo" loading="lazy">` : ""}${escapeHTML(p.equipe2)}</span>
        </div>
        <div class="ticket-card__pick">
          <strong>Pronostic :</strong> ${escapeHTML(p.pronostic)}
          ${p.cote ? `<div class="ticket-card__odds">Cote indicative : ${escapeHTML(p.cote)}</div>` : ""}
        </div>
        <p class="ticket-card__analysis">${escapeHTML(p.analyse)}</p>
      </div>
      <div class="ticket-card__perf"></div>
      <div class="confidence confidence--${level}">
        <div class="confidence__label">
          <span>${CONFIDENCE_TEXT[level]}</span>
          <strong>${escapeHTML(p.confiance)}%</strong>
        </div>
        ${confidenceSegments(p.confiance)}
      </div>
    </article>`;
}

function renderArticleCard(a) {
  return `
    <article class="article-card" data-sport="${sportSlug(a.sport)}">
      <div class="article-card__media" aria-hidden="true">
        ${a.image ? `<img src="${escapeHTML(a.image)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">` : `${sportIcon(a.sport)} ${escapeHTML(a.categorie || a.sport || "")}`}
      </div>
      <div class="article-card__body">
        <span class="article-card__date">${escapeHTML(a.date)} · ${escapeHTML(a.sport)}${a.auteur ? " · " + escapeHTML(a.auteur) : ""}</span>
        <h3 class="article-card__title">${escapeHTML(a.titre)}</h3>
        <p class="article-card__excerpt">${escapeHTML(a.resume)}</p>
        <a href="actualites.html" class="btn btn--outline" style="align-self:flex-start;">Lire l'article</a>
      </div>
    </article>`;
}

function emptyState(message) {
  return `<div class="empty-state"><strong>Rien à afficher pour le moment</strong>${escapeHTML(message)}</div>`;
}

function renderAnalysisCard(a) {
  return `
    <article class="analysis-card">
      <h3>${escapeHTML(a.titre)}</h3>
      <p class="analysis-card__meta">${escapeHTML(a.sport)}${a.competition ? " · " + escapeHTML(a.competition) : ""}${a.date ? " · " + escapeHTML(a.date) : ""}</p>
      ${a.texte_analyse ? `<p>${escapeHTMLMultiline(a.texte_analyse)}</p>` : ""}
      ${a.conclusion ? `<p><strong>Conclusion :</strong> ${escapeHTMLMultiline(a.conclusion)}</p>` : ""}
    </article>`;
}

/* ---------------------------------------------------------
   3 bis. CONNEXION AU SITE PUBLIC ↔ SUPABASE
   -----------------------------------------------------------
   Ces fonctions vont chercher les pronostics/articles publiés
   dans Supabase. Si Supabase n'est pas configuré sur cette page
   (fichier js/supabase-client.js absent) ou injoignable, elles
   renvoient "null" : mountLists() bascule alors automatiquement
   sur les tableaux PRONOSTICS / ARTICLES de secours définis plus
   haut, pour que le site continue de fonctionner dans tous les cas.
   --------------------------------------------------------- */

function formatDateFr(isoDate) {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch (e) {
    return isoDate;
  }
}

function formatHeure(heure) {
  return heure ? heure.slice(0, 5) : "";
}

function mapPronosticFromSupabase(row, logos) {
  return {
    sport: (row.sports && row.sports.nom) || "",
    competition: (row.competitions && row.competitions.nom) || "",
    competitionLogo: (row.competitions && row.competitions.logo_url) || "",
    equipe1: row.equipe1,
    equipe1Logo: (logos && logos.get(normaliserNom(row.equipe1))) || "",
    equipe2: row.equipe2,
    equipe2Logo: (logos && logos.get(normaliserNom(row.equipe2))) || "",
    date: formatDateFr(row.date_match),
    heure: formatHeure(row.heure_match),
    pronostic: row.pronostic,
    cote: row.cote || "",
    confiance: row.confiance,
    analyse: row.texte_analyse || "",
    statut: row.statut
  };
}

function mapArticleFromSupabase(row) {
  return {
    titre: row.titre,
    sport: (row.sports && row.sports.nom) || "",
    categorie: row.categorie || "",
    date: formatDateFr(row.date_publication),
    image: row.image_url || "",
    resume: row.resume || "",
    contenu: row.contenu || "",
    auteur: row.auteur || ""
  };
}

async function fetchPronosticsFromSupabase(limit) {
  if (typeof supabaseClient === "undefined") return null;
  try {
    const logos = await fetchEquipesLogos();
    let query = supabaseClient
      .from("pronostics")
      .select("*, sports(nom, icone), competitions(nom, logo_url)")
      .eq("publie", true)
      .order("date_match", { ascending: true });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => mapPronosticFromSupabase(row, logos));
  } catch (err) {
    console.warn("Supabase indisponible pour les pronostics, utilisation des données de secours.", err);
    return null;
  }
}

async function fetchArticlesFromSupabase(limit) {
  if (typeof supabaseClient === "undefined") return null;
  try {
    let query = supabaseClient
      .from("articles")
      .select("*, sports(nom, icone)")
      .eq("statut", "publié")
      .order("date_publication", { ascending: false });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapArticleFromSupabase);
  } catch (err) {
    console.warn("Supabase indisponible pour les articles, utilisation des données de secours.", err);
    return null;
  }
}

function mapAnalyseFromSupabase(row) {
  return {
    titre: row.titre,
    sport: (row.sports && row.sports.nom) || "",
    competition: (row.competitions && row.competitions.nom) || "",
    date: formatDateFr(row.date_publication),
    texte_analyse: row.texte_analyse || "",
    conclusion: row.conclusion || ""
  };
}

async function fetchAnalysesFromSupabase(limit) {
  if (typeof supabaseClient === "undefined") return null;
  try {
    let query = supabaseClient
      .from("analyses")
      .select("*, sports(nom, icone), competitions(nom)")
      .eq("statut", "publié")
      .order("date_publication", { ascending: false });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapAnalyseFromSupabase);
  } catch (err) {
    console.warn("Supabase indisponible pour les analyses, utilisation des données de secours.", err);
    return null;
  }
}

async function mountLists() {
  // Une page peut afficher plusieurs blocs de pronostics (ex. l'accueil :
  // un aperçu dans le bandeau "hero" + la liste complète plus bas) : on
  // récupère les données une seule fois, puis on découpe pour chaque bloc.
  const pronosMounts = document.querySelectorAll("[data-mount='pronostics']");
  if (pronosMounts.length) {
    const limits = Array.from(pronosMounts).map((el) => Number(el.dataset.limit) || 0);
    const maxLimit = limits.includes(0) ? null : Math.max(...limits);
    let source = await fetchPronosticsFromSupabase(maxLimit);
    if (!source) source = PRONOSTICS;
    pronosMounts.forEach((mount) => {
      const limit = Number(mount.dataset.limit) || source.length;
      const items = source.slice(0, limit);
      mount.innerHTML = items.length
        ? items.map(renderTicketCard).join("")
        : emptyState("Aucun pronostic publié pour le moment.");
    });
  }

  const articlesMounts = document.querySelectorAll("[data-mount='articles']");
  if (articlesMounts.length) {
    const limits = Array.from(articlesMounts).map((el) => Number(el.dataset.limit) || 0);
    const maxLimit = limits.includes(0) ? null : Math.max(...limits);
    let source = await fetchArticlesFromSupabase(maxLimit);
    if (!source) source = ARTICLES;
    articlesMounts.forEach((mount) => {
      const limit = Number(mount.dataset.limit) || source.length;
      const items = source.slice(0, limit);
      mount.innerHTML = items.length
        ? items.map(renderArticleCard).join("")
        : emptyState("Aucun article publié pour le moment.");
    });
  }

  const analysesMounts = document.querySelectorAll("[data-mount='analyses']");
  if (analysesMounts.length) {
    const limits = Array.from(analysesMounts).map((el) => Number(el.dataset.limit) || 0);
    const maxLimit = limits.includes(0) ? null : Math.max(...limits);
    let source = await fetchAnalysesFromSupabase(maxLimit);
    if (!source) source = ANALYSES_SECOURS;
    analysesMounts.forEach((mount) => {
      const limit = Number(mount.dataset.limit) || source.length;
      const items = source.slice(0, limit);
      mount.innerHTML = items.length
        ? items.map(renderAnalysisCard).join("")
        : emptyState("Aucune analyse publiée pour le moment.");
    });
  }
}

/* ---------------------------------------------------------
   BANDEAU DE COMPÉTITIONS (ticker) ↔ SUPABASE
   -----------------------------------------------------------
   Le bandeau qui défile en haut de chaque page affiche les
   compétitions ACTIVES de la table "competitions" de Supabase,
   dans l'ordre défini par leur "ordre_affichage" — le tout se
   gère désormais entièrement depuis l'onglet "Compétitions" de
   admin.html (ajouter, modifier, activer/désactiver, réordonner).

   Si Supabase est injoignable (page hors-ligne, clé pas encore
   configurée...), la liste de secours ci-dessous s'affiche à la
   place pour que le bandeau ne soit jamais vide.
   --------------------------------------------------------- */

const COMPETITIONS_SECOURS = [
  "Football", "Basketball", "Tennis", "CAN 2026",
  "Premier League", "NBA", "ATP / WTA", "Ligue 1"
];

async function fetchCompetitionsForTicker() {
  if (typeof supabaseClient === "undefined") return null;
  try {
    const { data, error } = await supabaseClient
      .from("competitions")
      .select("nom")
      .eq("actif", true)
      .order("ordre_affichage", { ascending: true });
    if (error) throw error;
    return (data || []).map((c) => c.nom);
  } catch (err) {
    console.warn("Supabase indisponible pour le bandeau de compétitions, utilisation de la liste de secours.", err);
    return null;
  }
}

async function renderTicker() {
  const track = document.querySelector(".ticker__track");
  if (!track) return;
  let noms = await fetchCompetitionsForTicker();
  if (!noms || !noms.length) noms = COMPETITIONS_SECOURS;
  const itemsHTML = noms.map((nom) => `<span>${escapeHTML(nom)}</span>`).join("");
  // Dupliqué pour un défilement infini sans coupure
  // (l'animation CSS déplace le bandeau de -50%, voir css/style.css).
  track.innerHTML = itemsHTML + itemsHTML;
}

/* ---------------------------------------------------------
   PAGE MATCHS — liste des matchs à venir / en cours
   -----------------------------------------------------------
   Les matchs sont gérés directement dans Supabase (table
   "matchs") — un onglet dédié dans admin.html arrivera dans une
   prochaine étape ; en attendant, ils peuvent être ajoutés via
   Supabase → Table Editor ou SQL Editor.
   --------------------------------------------------------- */

function mapMatchFromSupabase(row, logos) {
  const s = Array.isArray(row.scores) ? row.scores[0] : row.scores;
  return {
    id: row.id,
    sport: (row.sports && row.sports.nom) || "",
    competition: (row.competitions && row.competitions.nom) || "",
    competitionLogo: (row.competitions && row.competitions.logo_url) || "",
    pays: row.pays || "",
    equipe1: row.equipe1,
    equipe1Logo: (logos && logos.get(normaliserNom(row.equipe1))) || "",
    equipe2: row.equipe2,
    equipe2Logo: (logos && logos.get(normaliserNom(row.equipe2))) || "",
    date: formatDateFr(row.date_match),
    dateIso: row.date_match,
    heure: formatHeure(row.heure_match),
    statut: row.statut,
    cote1: row.cote_1 || "",
    coteX: row.cote_x || "",
    cote2: row.cote_2 || "",
    score1: s ? s.score_equipe1 : null,
    score2: s ? s.score_equipe2 : null
  };
}

async function fetchMatchsAVenir() {
  if (typeof supabaseClient === "undefined") return [];
  try {
    const logos = await fetchEquipesLogos();
    const { data, error } = await supabaseClient
      .from("matchs")
      .select("*, sports(nom, icone), competitions(nom, logo_url), scores(score_equipe1, score_equipe2)")
      .in("statut", ["à venir", "en cours"])
      .order("date_match", { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => mapMatchFromSupabase(row, logos));
  } catch (err) {
    console.warn("Supabase indisponible pour les matchs.", err);
    return [];
  }
}

/* Petit bloc réutilisable pour afficher les cotes 1-X-2, uniquement si
   au moins une des trois est renseignée (saisie manuelle dans admin.html —
   ces valeurs ne sont pas fournies automatiquement par football-data.org). */
function renderOddsRow(m) {
  if (!m.cote1 && !m.coteX && !m.cote2) return "";
  return `
    <div class="odds-row">
      <div class="odds-pill"><span class="odds-pill__label">1</span><span class="odds-pill__value">${escapeHTML(m.cote1 || "—")}</span></div>
      <div class="odds-pill"><span class="odds-pill__label">X</span><span class="odds-pill__value">${escapeHTML(m.coteX || "—")}</span></div>
      <div class="odds-pill"><span class="odds-pill__label">2</span><span class="odds-pill__value">${escapeHTML(m.cote2 || "—")}</span></div>
    </div>`;
}

function renderMatchCard(m) {
  return `
    <article class="match-card" data-id="${m.id}" data-sport="${sportSlug(m.sport)}" data-pays="${escapeHTML(m.pays)}" data-competition="${escapeHTML(m.competition)}" data-date="${escapeHTML(m.dateIso)}">
      <div class="match-card__top">
        <span class="sport-badge">${sportIcon(m.sport)} ${escapeHTML(m.sport)}</span>
        <span class="status-badge ${statutClass(m.statut)}">${escapeHTML(m.statut)}</span>
      </div>
      <div class="match-card__body">
        <div class="match-card__competition">${m.competitionLogo ? `<img src="${escapeHTML(m.competitionLogo)}" alt="" class="competition-logo" loading="lazy">` : ""}${escapeHTML(m.competition)}${m.pays ? " · " + escapeHTML(m.pays) : ""}</div>
        <div class="match-card__teams">
          <span>${m.equipe1Logo ? `<img src="${escapeHTML(m.equipe1Logo)}" alt="" class="team-logo" loading="lazy">` : ""}${escapeHTML(m.equipe1)}</span><span class="vs">${m.score1 != null ? escapeHTML(m.score1) + " – " + escapeHTML(m.score2) : "vs"}</span><span>${m.equipe2Logo ? `<img src="${escapeHTML(m.equipe2Logo)}" alt="" class="team-logo" loading="lazy">` : ""}${escapeHTML(m.equipe2)}</span>
        </div>
        <div class="match-card__meta">${escapeHTML(m.date)}${m.heure ? " · " + escapeHTML(m.heure) : ""}</div>
        ${renderOddsRow(m)}
      </div>
    </article>`;
}

/* Sélectionne le match à mettre en avant sur matchs.html : en priorité un
   match "en cours", sinon le tout premier match à venir de la liste. */
function renderMatchVedette(m) {
  const enDirect = m.statut === "en cours";
  return `
    <div class="match-vedette">
      <div class="match-vedette__eyebrow">
        <span>${sportIcon(m.sport)} ${escapeHTML(m.competition)}</span>
        ${enDirect ? `<span class="match-vedette__live">EN DIRECT</span>` : `<span>${escapeHTML(m.statut)}</span>`}
      </div>
      <div class="match-vedette__teams">
        <span>${m.equipe1Logo ? `<img src="${escapeHTML(m.equipe1Logo)}" alt="" class="team-logo" loading="lazy">` : ""}${escapeHTML(m.equipe1)}</span>
        <span class="match-vedette__score">${m.score1 != null ? escapeHTML(m.score1) + " – " + escapeHTML(m.score2) : "vs"}</span>
        <span>${m.equipe2Logo ? `<img src="${escapeHTML(m.equipe2Logo)}" alt="" class="team-logo" loading="lazy">` : ""}${escapeHTML(m.equipe2)}</span>
      </div>
      <div class="match-vedette__meta">${escapeHTML(m.date)}${m.heure ? " · " + escapeHTML(m.heure) : ""}</div>
      ${renderOddsRow(m)}
      <div class="match-vedette__cta" style="margin-top:14px;">
        <a class="btn btn--primary" href="match.html?id=${m.id}">Voir la fiche</a>
      </div>
    </div>`;
}

function afficherMatchVedette(matchs) {
  const zone = document.getElementById("match-vedette");
  if (!zone) return;
  const vedette = matchs.find((m) => m.statut === "en cours") || matchs[0];
  zone.innerHTML = vedette ? renderMatchVedette(vedette) : "";
}

/* Recherche instantanée par nom d'équipe (barre de recherche de matchs.html) */
function initRechercheEquipe(inputId, mountId) {
  const input = document.getElementById(inputId);
  const mount = document.getElementById(mountId);
  if (!input || !mount) return;
  input.addEventListener("input", () => {
    const terme = normaliserNom(input.value);
    mount.querySelectorAll(":scope > article[data-sport]").forEach((carte) => {
      const texte = normaliserNom(carte.textContent);
      carte.style.display = !terme || texte.includes(terme) ? "" : "none";
    });
  });
}

/* Remplit un <select> avec les valeurs distinctes trouvées dans une liste,
   en conservant l'ordre d'apparition. */
function fillFilterSelect(selectEl, values, placeholder) {
  const uniques = [...new Set(values.filter(Boolean))];
  selectEl.innerHTML = `<option value="">${escapeHTML(placeholder)}</option>` +
    uniques.map((v) => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
}

/* Active le bon onglet sport au chargement, selon l'ancre de l'URL
   (ex. matchs.html#basketball), pour rester cohérent avec le
   fonctionnement de pronostics.html / actualites.html. */
function setActiveTabFromHash(tabs) {
  if (!tabs) return;
  const initial = window.location.hash.replace("#", "") || "tous";
  const match = tabs.querySelector(`[data-sport-filter="${initial}"]`);
  tabs.querySelectorAll(".sport-tab").forEach((btn) => {
    const active = match ? btn === match : btn.dataset.sportFilter === "tous";
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });
}

function applyCardFilters(mount, tabs) {
  const activeSport = tabs ? tabs.querySelector(".sport-tab.is-active").dataset.sportFilter : "tous";
  const pays = document.getElementById("filtre-pays");
  const competition = document.getElementById("filtre-competition");
  const date = document.getElementById("filtre-date");
  const cards = mount.querySelectorAll(":scope > article[data-sport]");
  let visible = 0;
  cards.forEach((card) => {
    const okSport = activeSport === "tous" || card.dataset.sport === activeSport;
    const okPays = !pays || !pays.value || card.dataset.pays === pays.value;
    const okCompetition = !competition || !competition.value || card.dataset.competition === competition.value;
    const okDate = !date || !date.value || card.dataset.date === date.value;
    const match = okSport && okPays && okCompetition && okDate;
    card.style.display = match ? "" : "none";
    if (match) visible++;
  });
  let empty = mount.querySelector(".empty-state[data-filter-empty]");
  if (visible === 0 && cards.length > 0) {
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "empty-state";
      empty.setAttribute("data-filter-empty", "true");
      empty.innerHTML = "<strong>Aucun résultat</strong>Aucun contenu ne correspond à ces filtres.";
      mount.appendChild(empty);
    }
  } else if (empty) {
    empty.remove();
  }
}

async function initMatchsPage() {
  const mount = document.getElementById("matchs-liste");
  if (!mount) return;

  const matchs = await fetchMatchsAVenir();
  mount.innerHTML = matchs.length
    ? matchs.map(renderMatchCard).join("")
    : emptyState("Aucun match à venir pour le moment.");

  afficherMatchVedette(matchs);
  initRechercheEquipe("recherche-equipe", "matchs-liste");

  const tabs = document.querySelector(".sport-tabs");
  const paysSelect = document.getElementById("filtre-pays");
  const competitionSelect = document.getElementById("filtre-competition");
  const dateSelect = document.getElementById("filtre-date");

  fillFilterSelect(paysSelect, matchs.map((m) => m.pays), "Tous les pays");
  fillFilterSelect(competitionSelect, matchs.map((m) => m.competition), "Toutes les compétitions");
  fillFilterSelect(dateSelect, matchs.map((m) => m.dateIso), "Toutes les dates");

  [paysSelect, competitionSelect, dateSelect].forEach((sel) => {
    sel.addEventListener("change", () => applyCardFilters(mount, tabs));
  });
  if (tabs) {
    tabs.querySelectorAll(".sport-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.querySelectorAll(".sport-tab").forEach((b) => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-selected", String(b === btn));
        });
        history.replaceState(null, "", "#" + btn.dataset.sportFilter);
        applyCardFilters(mount, tabs);
      });
    });
  }
  setActiveTabFromHash(tabs);
  applyCardFilters(mount, tabs);
}

/* ---------------------------------------------------------
   PAGE SCORES — liste des matchs terminés avec résultat
   --------------------------------------------------------- */

function mapScoreFromSupabase(row, logos) {
  const s = Array.isArray(row.scores) ? row.scores[0] : row.scores;
  return {
    id: row.id,
    sport: (row.sports && row.sports.nom) || "",
    competition: (row.competitions && row.competitions.nom) || "",
    competitionLogo: (row.competitions && row.competitions.logo_url) || "",
    pays: row.pays || "",
    equipe1: row.equipe1,
    equipe1Logo: (logos && logos.get(normaliserNom(row.equipe1))) || "",
    equipe2: row.equipe2,
    equipe2Logo: (logos && logos.get(normaliserNom(row.equipe2))) || "",
    date: formatDateFr(row.date_match),
    dateIso: row.date_match,
    score1: s ? s.score_equipe1 : null,
    score2: s ? s.score_equipe2 : null,
    mt1: s ? s.score_mt_equipe1 : null,
    mt2: s ? s.score_mt_equipe2 : null,
    cote1: row.cote_1 || "",
    coteX: row.cote_x || "",
    cote2: row.cote_2 || ""
  };
}

async function fetchScoresTermines() {
  if (typeof supabaseClient === "undefined") return [];
  try {
    const logos = await fetchEquipesLogos();
    const { data, error } = await supabaseClient
      .from("matchs")
      .select("*, sports(nom, icone), competitions(nom, logo_url), scores(score_equipe1, score_equipe2, score_mt_equipe1, score_mt_equipe2)")
      .eq("statut", "terminé")
      .order("date_match", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => mapScoreFromSupabase(row, logos));
  } catch (err) {
    console.warn("Supabase indisponible pour les scores.", err);
    return [];
  }
}

function renderScoreCard(m) {
  const aScore = m.score1 !== null && m.score1 !== undefined;
  return `
    <article class="match-card score-card" data-id="${m.id}" data-sport="${sportSlug(m.sport)}" data-pays="${escapeHTML(m.pays)}" data-competition="${escapeHTML(m.competition)}" data-date="${escapeHTML(m.dateIso)}">
      <div class="match-card__top">
        <span class="sport-badge">${sportIcon(m.sport)} ${escapeHTML(m.sport)}</span>
        <span class="status-badge is-termine">Terminé</span>
      </div>
      <div class="match-card__body">
        <div class="match-card__competition">${m.competitionLogo ? `<img src="${escapeHTML(m.competitionLogo)}" alt="" class="competition-logo" loading="lazy">` : ""}${escapeHTML(m.competition)}${m.pays ? " · " + escapeHTML(m.pays) : ""}</div>
        <div class="match-card__teams">
          <span>${m.equipe1Logo ? `<img src="${escapeHTML(m.equipe1Logo)}" alt="" class="team-logo" loading="lazy">` : ""}${escapeHTML(m.equipe1)}</span><span class="vs">vs</span><span>${m.equipe2Logo ? `<img src="${escapeHTML(m.equipe2Logo)}" alt="" class="team-logo" loading="lazy">` : ""}${escapeHTML(m.equipe2)}</span>
        </div>
        ${aScore ? `
        <div class="score-card__score">
          <span>${escapeHTML(m.score1)}</span><span class="separateur">–</span><span>${escapeHTML(m.score2)}</span>
        </div>
        ${m.mt1 !== null && m.mt1 !== undefined ? `<div class="score-card__mt">Mi-temps : ${escapeHTML(m.mt1)} – ${escapeHTML(m.mt2)}</div>` : ""}
        ` : `<p class="match-card__meta">Score non renseigné.</p>`}
        <div class="match-card__meta">${escapeHTML(m.date)}</div>
        ${renderOddsRow(m)}
      </div>
    </article>`;
}

async function initScoresPage() {
  const mount = document.getElementById("scores-liste");
  if (!mount) return;

  const scores = await fetchScoresTermines();
  mount.innerHTML = scores.length
    ? scores.map(renderScoreCard).join("")
    : emptyState("Aucun résultat pour le moment.");

  const tabs = document.querySelector(".sport-tabs");
  const paysSelect = document.getElementById("filtre-pays");
  const competitionSelect = document.getElementById("filtre-competition");
  const dateSelect = document.getElementById("filtre-date");

  fillFilterSelect(paysSelect, scores.map((m) => m.pays), "Tous les pays");
  fillFilterSelect(competitionSelect, scores.map((m) => m.competition), "Toutes les compétitions");
  fillFilterSelect(dateSelect, scores.map((m) => m.dateIso), "Toutes les dates");

  [paysSelect, competitionSelect, dateSelect].forEach((sel) => {
    sel.addEventListener("change", () => applyCardFilters(mount, tabs));
  });
  if (tabs) {
    tabs.querySelectorAll(".sport-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.querySelectorAll(".sport-tab").forEach((b) => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-selected", String(b === btn));
        });
        history.replaceState(null, "", "#" + btn.dataset.sportFilter);
        applyCardFilters(mount, tabs);
      });
    });
  }
  setActiveTabFromHash(tabs);
  applyCardFilters(mount, tabs);
}

/* ---------------------------------------------------------
   PAGE COMPÉTITIONS — liste publique des compétitions actives
   --------------------------------------------------------- */

function mapCompetitionFromSupabase(row) {
  return {
    nom: row.nom,
    logo: row.logo_url || "",
    sport: (row.sports && row.sports.nom) || "",
    pays: row.pays || ""
  };
}

async function fetchCompetitionsPublic() {
  if (typeof supabaseClient === "undefined") return [];
  try {
    const { data, error } = await supabaseClient
      .from("competitions")
      .select("*, sports(nom, icone)")
      .eq("actif", true)
      .order("ordre_affichage", { ascending: true });
    if (error) throw error;
    return (data || []).map(mapCompetitionFromSupabase);
  } catch (err) {
    console.warn("Supabase indisponible pour les compétitions.", err);
    return [];
  }
}

function renderCompetitionCard(c) {
  return `
    <article class="match-card" data-sport="${sportSlug(c.sport)}" data-pays="${escapeHTML(c.pays)}">
      <div class="match-card__top">
        <span class="sport-badge">${sportIcon(c.sport)} ${escapeHTML(c.sport)}</span>
      </div>
      <div class="match-card__body">
        <div class="match-card__teams" style="font-size:1.1rem;">${c.logo ? `<img src="${escapeHTML(c.logo)}" alt="" class="competition-logo" loading="lazy">` : ""}${escapeHTML(c.nom)}</div>
        ${c.pays ? `<div class="match-card__meta">${escapeHTML(c.pays)}</div>` : ""}
      </div>
    </article>`;
}

async function initCompetitionsPage() {
  const mount = document.getElementById("competitions-liste");
  if (!mount) return;

  const competitions = await fetchCompetitionsPublic();
  mount.innerHTML = competitions.length
    ? competitions.map(renderCompetitionCard).join("")
    : emptyState("Aucune compétition pour le moment.");

  const tabs = document.querySelector(".sport-tabs");
  const paysSelect = document.getElementById("filtre-pays");
  if (paysSelect) {
    fillFilterSelect(paysSelect, competitions.map((c) => c.pays), "Tous les pays");
    paysSelect.addEventListener("change", () => applyCardFilters(mount, tabs));
  }
  if (tabs) {
    tabs.querySelectorAll(".sport-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.querySelectorAll(".sport-tab").forEach((b) => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-selected", String(b === btn));
        });
        history.replaceState(null, "", "#" + btn.dataset.sportFilter);
        applyCardFilters(mount, tabs);
      });
    });
  }
  setActiveTabFromHash(tabs);
  applyCardFilters(mount, tabs);
}

/* ---------------------------------------------------------
   5. FILTRES PAR SPORT (onglets "Tous / Football / Basketball / Tennis")
   --------------------------------------------------------- */

function applySportFilter(mount, sport) {
  const cards = mount.querySelectorAll(":scope > article[data-sport]");
  let visibleCount = 0;
  cards.forEach((card) => {
    const match = sport === "tous" || card.dataset.sport === sport;
    card.style.display = match ? "" : "none";
    if (match) visibleCount++;
  });
  let empty = mount.querySelector(".empty-state[data-filter-empty]");
  if (visibleCount === 0 && cards.length > 0) {
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "empty-state";
      empty.setAttribute("data-filter-empty", "true");
      empty.innerHTML = "<strong>Aucun résultat</strong>Aucun contenu pour ce sport pour le moment.";
      mount.appendChild(empty);
    }
  } else if (empty) {
    empty.remove();
  }
}

function initSportTabs() {
  const tabsContainers = document.querySelectorAll(".sport-tabs");
  if (!tabsContainers.length) return;

  tabsContainers.forEach((tabs) => {
    const section = tabs.closest("section");
    const mount = section ? section.querySelector("[data-mount][data-filterable]") : null;
    if (!mount) return;

    function selectSport(sport) {
      tabs.querySelectorAll(".sport-tab").forEach((btn) => {
        const isActive = btn.dataset.sportFilter === sport;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", String(isActive));
      });
      applySportFilter(mount, sport);
    }

    tabs.querySelectorAll(".sport-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectSport(btn.dataset.sportFilter);
        history.replaceState(null, "", "#" + btn.dataset.sportFilter);
      });
    });

    // Permet d'arriver directement filtré via un lien du type pronostics.html#basketball
    const initial = window.location.hash.replace("#", "") || "tous";
    const validInitial = tabs.querySelector(`[data-sport-filter="${initial}"]`) ? initial : "tous";
    selectSport(validInitial);
  });
}

/* ---------------------------------------------------------
   6. NAVIGATION MOBILE
   --------------------------------------------------------- */

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  const backdrop = document.querySelector(".nav-backdrop");
  if (!toggle || !nav) return;

  function closeNav() {
    nav.classList.remove("is-open");
    backdrop && backdrop.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  function openNav() {
    nav.classList.add("is-open");
    backdrop && backdrop.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.contains("is-open");
    isOpen ? closeNav() : openNav();
  });
  backdrop && backdrop.addEventListener("click", closeNav);
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
}

/* ---------------------------------------------------------
   7. ACCORDÉON (page Guide)
   --------------------------------------------------------- */

function initAccordion() {
  document.querySelectorAll(".accordion__trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      if (!panel) return;
      panel.style.maxHeight = expanded ? null : panel.scrollHeight + "px";
    });
  });
}

/* ---------------------------------------------------------
   8. FORMULAIRE DE CONTACT (visuel uniquement)
   -----------------------------------------------------------
   GitHub Pages n'exécute pas de code côté serveur : ce
   formulaire ne peut donc pas envoyer réellement de message.
   Pour le rendre fonctionnel plus tard, deux options simples :
     1) un service comme Formspree ou Getform (gratuit, sans
        serveur à gérer) : il suffit de remplacer l'attribut
        "action" du <form> par l'URL fournie par le service ;
     2) un lien "mailto:" classique si vous préférez rester
        très simple.
   --------------------------------------------------------- */

function initContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const note = document.querySelector("#contact-form-note");
    if (note) {
      note.textContent = "Ce formulaire est une démonstration visuelle : aucun message n'est envoyé pour l'instant. Connectez un service comme Formspree pour l'activer.";
    }
  });
}

/* ---------------------------------------------------------
   9. ANNÉE COURANTE DANS LE PIED DE PAGE
   --------------------------------------------------------- */

function initFooterYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

/* ---------------------------------------------------------
   9 bis. THÈME SOMBRE / CLAIR
   -----------------------------------------------------------
   Sombre par défaut. Le choix de l'utilisateur est mémorisé dans
   le navigateur (localStorage) et réappliqué à chaque visite.
   --------------------------------------------------------- */

function initThemeToggle() {
  const CLE = "jomion-theme";
  const bouton = document.querySelector(".theme-toggle");

  function appliquer(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    if (bouton) bouton.textContent = theme === "light" ? "🌙" : "☀️";
  }

  let theme = "dark";
  try { theme = localStorage.getItem(CLE) || "dark"; } catch (e) {}
  appliquer(theme);

  if (!bouton) return;
  bouton.addEventListener("click", () => {
    theme = theme === "light" ? "dark" : "light";
    try { localStorage.setItem(CLE, theme); } catch (e) {}
    appliquer(theme);
  });
}

/* ---------------------------------------------------------
   ACTUALISATION AUTOMATIQUE DES MATCHS "EN DIRECT"
   -----------------------------------------------------------
   Toutes les 60 secondes, si une carte "en cours" est affichée
   à l'écran, on relit les données pour rafraîchir le score.
   --------------------------------------------------------- */

function initAutoRefreshLive() {
  const mount = document.getElementById("matchs-liste") || document.getElementById("scores-liste");
  if (!mount) return;
  setInterval(async () => {
    const aUnMatchEnCours = mount.querySelector(".status-badge.is-encours");
    if (!aUnMatchEnCours) return;
    if (document.getElementById("matchs-liste")) await initMatchsPage();
    if (document.getElementById("scores-liste")) await initScoresPage();
  }, 60000);
}

/* ---------------------------------------------------------
   PAGE CLASSEMENT
   --------------------------------------------------------- */

async function fetchCompetitionsAvecClassement() {
  if (typeof supabaseClient === "undefined") return [];
  const { data } = await supabaseClient
    .from("classements")
    .select("competition_id, competitions(nom)")
    .order("competition_id");
  const vues = new Map();
  (data || []).forEach((l) => {
    if (l.competitions?.nom) vues.set(l.competition_id, l.competitions.nom);
  });
  return Array.from(vues, ([id, nom]) => ({ id, nom }));
}

async function fetchClassement(competitionId) {
  if (typeof supabaseClient === "undefined") return [];
  const { data } = await supabaseClient
    .from("classements")
    .select("*")
    .eq("competition_id", competitionId)
    .order("position", { ascending: true });
  return data || [];
}

function renderClassementTable(lignes) {
  if (!lignes.length) return emptyState("Classement non disponible pour le moment.");
  return `
    <table class="classement-table">
      <thead>
        <tr>
          <th>#</th><th>Équipe</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Diff</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>
        ${lignes.map((l) => `
          <tr>
            <td>${escapeHTML(l.position)}</td>
            <td>${escapeHTML(l.equipe)}</td>
            <td>${escapeHTML(l.joues)}</td>
            <td>${escapeHTML(l.victoires)}</td>
            <td>${escapeHTML(l.nuls)}</td>
            <td>${escapeHTML(l.defaites)}</td>
            <td>${escapeHTML(l.buts_pour)}</td>
            <td>${escapeHTML(l.buts_contre)}</td>
            <td>${escapeHTML(l.difference)}</td>
            <td class="points">${escapeHTML(l.points)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

async function initClassementPage() {
  const select = document.getElementById("classement-competition");
  const contenu = document.getElementById("classement-contenu");
  if (!select || !contenu) return;

  const competitions = await fetchCompetitionsAvecClassement();
  if (!competitions.length) {
    contenu.innerHTML = emptyState("Aucun classement disponible pour le moment.");
    return;
  }

  select.innerHTML = competitions.map((c) => `<option value="${c.id}">${escapeHTML(c.nom)}</option>`).join("");

  const competitionDemandee = new URLSearchParams(window.location.search).get("competition");
  if (competitionDemandee && competitions.some((c) => c.id === competitionDemandee)) {
    select.value = competitionDemandee;
  }

  async function afficherClassement(competitionId) {
    contenu.innerHTML = `<div class="empty-state">Chargement…</div>`;
    const lignes = await fetchClassement(competitionId);
    contenu.innerHTML = renderClassementTable(lignes);
  }

  select.addEventListener("change", () => afficherClassement(select.value));
  afficherClassement(select.value);
}

/* ---------------------------------------------------------
   NAVIGATION VERS LA FICHE MATCH AU CLIC SUR UNE CARTE
   --------------------------------------------------------- */

function initClicsVersFicheMatch(mountId) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.addEventListener("click", (e) => {
    const carte = e.target.closest("article[data-id]");
    if (!carte) return;
    window.location.href = "match.html?id=" + encodeURIComponent(carte.dataset.id);
  });
}

/* ---------------------------------------------------------
   FICHE MATCH (match.html)
   --------------------------------------------------------- */

async function initFicheMatch() {
  const contenu = document.getElementById("fiche-match-contenu");
  if (!contenu) return;

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id || typeof supabaseClient === "undefined") {
    contenu.innerHTML = emptyState("Match introuvable.");
    return;
  }

  const { data: m, error } = await supabaseClient
    .from("matchs")
    .select("*, sports(nom, icone), competitions(nom, logo_url), scores(score_equipe1, score_equipe2, score_mt_equipe1, score_mt_equipe2)")
    .eq("id", id)
    .maybeSingle();

  if (error || !m) {
    contenu.innerHTML = emptyState("Match introuvable.");
    return;
  }

  const logos = await fetchEquipesLogos();
  const logo1 = logos.get(normaliserNom(m.equipe1)) || "";
  const logo2 = logos.get(normaliserNom(m.equipe2)) || "";
  const score = Array.isArray(m.scores) ? m.scores[0] : m.scores;
  const competitionNom = m.competitions?.nom || "";
  const competitionLogo = m.competitions?.logo_url || "";

  let html = `
    <div class="fiche-match">
      <div class="fiche-match__meta">
        ${competitionLogo ? `<img src="${escapeHTML(competitionLogo)}" alt="" class="competition-logo" loading="lazy">` : ""}
        ${escapeHTML(competitionNom)}${m.pays ? " · " + escapeHTML(m.pays) : ""}
      </div>
      <div class="fiche-match__teams">
        <span>${logo1 ? `<img src="${escapeHTML(logo1)}" alt="">` : ""}${escapeHTML(m.equipe1)}</span>
        ${score ? `<span class="fiche-match__score">${escapeHTML(score.score_equipe1)} – ${escapeHTML(score.score_equipe2)}</span>` : `<span>vs</span>`}
        <span>${logo2 ? `<img src="${escapeHTML(logo2)}" alt="">` : ""}${escapeHTML(m.equipe2)}</span>
      </div>
      <div class="fiche-match__meta">
        <span class="status-badge ${statutClass(m.statut)}">${escapeHTML(m.statut)}</span>
        &nbsp;·&nbsp;${escapeHTML(formatDateFr(m.date_match))}${m.heure_match ? " · " + escapeHTML(formatHeure(m.heure_match)) : ""}
      </div>
      <div class="fiche-liens">
        ${m.competition_id ? `<a class="btn btn--outline" href="classement.html?competition=${m.competition_id}">Voir le classement</a>` : ""}
        <a class="btn btn--outline" href="matchs.html">Tous les matchs</a>
      </div>
    </div>`;

  const { data: prono } = await supabaseClient
    .from("pronostics")
    .select("*, sports(nom, icone), competitions(nom, logo_url)")
    .eq("match_id", id)
    .eq("publie", true)
    .maybeSingle();
  if (prono) {
    html += `<div class="fiche-section"><h2>Pronostic</h2>${renderTicketCard(mapPronosticFromSupabase(prono, logos))}</div>`;
  }

  const { data: analyse } = await supabaseClient
    .from("analyses")
    .select("*, sports(nom, icone), competitions(nom)")
    .eq("match_id", id)
    .eq("statut", "publié")
    .maybeSingle();
  if (analyse) {
    html += `<div class="fiche-section"><h2>Analyse</h2>${renderAnalysisCard(mapAnalyseFromSupabase(analyse))}</div>`;
  }

  contenu.innerHTML = html;
}

/* ---------------------------------------------------------
   INITIALISATION
   --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  initThemeToggle();
  await Promise.all([mountLists(), renderTicker()]);
  initSportTabs();
  await initMatchsPage();
  await initScoresPage();
  await initCompetitionsPage();
  await initClassementPage();
  await initFicheMatch();
  initClicsVersFicheMatch("matchs-liste");
  initClicsVersFicheMatch("scores-liste");
  initNav();
  initAccordion();
  initContactForm();
  initFooterYear();
  initAutoRefreshLive();
});
