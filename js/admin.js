/* =========================================================
   JOMION-SPORT — admin.js
   Authentification (Supabase Auth) + gestion des contenus
   (compétitions, pronostics, analyses, articles).
   Nécessite que js/supabase-client.js soit chargé avant ce
   fichier, avec l'URL et la clé Supabase déjà renseignées.
   ========================================================= */

let currentUser = null;
let allSports = [];
let allCompetitions = [];
let allEquipes = [];

const PAYS_FOOTBALL = [
  "Afrique du Sud", "Algérie", "Allemagne", "Angleterre", "Angola", "Arabie Saoudite",
  "Argentine", "Autriche", "Belgique", "Bénin", "Brésil", "Burkina Faso", "Cameroun",
  "Cap-Vert", "Chili", "Chine", "Colombie", "Corée du Sud", "Côte d'Ivoire", "Croatie",
  "Danemark", "Égypte", "Équateur", "Espagne", "États-Unis", "Éthiopie", "France",
  "Gabon", "Ghana", "Guinée", "Italie", "Japon", "Kenya", "Mali", "Maroc", "Mexique",
  "Mozambique", "Niger", "Nigeria", "Norvège", "Pays-Bas", "Pérou", "Pologne",
  "Portugal", "République Démocratique du Congo", "Congo", "Roumanie", "Royaume-Uni",
  "Russie", "Sénégal", "Serbie", "Suède", "Suisse", "Tanzanie", "Togo", "Tunisie",
  "Turquie", "Uruguay", "Zambie"
].sort((a, b) => a.localeCompare(b, "fr"));

/* ---------------------------------------------------------
   UTILITAIRES
   --------------------------------------------------------- */

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

function showToast(message, isError) {
  const toast = document.getElementById("admin-toast");
  toast.textContent = message;
  toast.classList.toggle("is-error", !!isError);
  toast.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 3500);
}

function sportNom(sportId) {
  const s = allSports.find((x) => x.id === sportId);
  return s ? s.nom : "—";
}

function competitionNom(competitionId) {
  const c = allCompetitions.find((x) => x.id === competitionId);
  return c ? c.nom : "—";
}

/* ---------------------------------------------------------
   AUTHENTIFICATION
   --------------------------------------------------------- */

async function checkIsAdmin(userId) {
  const { data, error } = await supabaseClient
    .from("profils_admin")
    .select("id, role, nom_affichage")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session && session.user) {
    await handleSignedIn(session.user);
  } else {
    showLogin();
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      showLogin();
    }
  });
}

async function handleSignedIn(user) {
  const profil = await checkIsAdmin(user.id);
  if (!profil) {
    showLoginError("Ce compte n'est pas autorisé à accéder à l'administration.");
    await supabaseClient.auth.signOut();
    return;
  }
  currentUser = user;
  document.getElementById("admin-user-email").textContent =
    (profil.nom_affichage || user.email) + " · " + profil.role;
  showDashboard();
  await loadEverything();
}

function showLogin() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("dashboard").style.display = "none";
}

function showDashboard() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
}

function showLoginError(message) {
  const el = document.getElementById("login-error");
  el.textContent = message;
  el.classList.add("is-visible");
}

function initLoginForm() {
  const form = document.getElementById("login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const submitBtn = document.getElementById("login-submit");
    const errorEl = document.getElementById("login-error");
    errorEl.classList.remove("is-visible");
    submitBtn.disabled = true;
    submitBtn.textContent = "Connexion…";

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    submitBtn.disabled = false;
    submitBtn.textContent = "Se connecter";

    if (error) {
      showLoginError("E-mail ou mot de passe incorrect.");
      return;
    }
    await handleSignedIn(data.user);
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
  });
}

/* ---------------------------------------------------------
   ONGLETS
   --------------------------------------------------------- */

function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      document.querySelectorAll(".admin-panel").forEach((panel) => {
        panel.classList.toggle("is-active", panel.id === "panel-" + btn.dataset.tab);
      });
    });
  });
}

/* ---------------------------------------------------------
   CHARGEMENT INITIAL
   --------------------------------------------------------- */

async function loadEverything() {
  await loadSports();
  await loadCompetitions();
  await loadEquipes();
  populateSportSelects();
  populatePaysSelects();
  populateCompetitionSelects();
  initFormCascade("matchs", true);
  initFormCascade("pronostics", true);
  await loadPronostics();
  await loadAnalyses();
  await loadArticles();
  await loadMatchs();
  await loadScoresPanel();
  renderSportsList();
  await loadPartenaires();
}

async function loadSports() {
  const { data, error } = await supabaseClient.from("sports").select("*").order("ordre_affichage");
  if (error) { console.error(error); return; }
  allSports = data || [];
}

function populateSportSelects() {
  const options = allSports.map((s) => `<option value="${s.id}">${escapeHTML(s.icone || "")} ${escapeHTML(s.nom)}</option>`).join("");
  ["competitions-sport", "pronostics-sport", "analyses-sport", "matchs-sport", "equipes-sport"].forEach((id) => {
    document.getElementById(id).innerHTML = options;
  });
  // Le sport est facultatif pour un article
  document.getElementById("articles-sport").innerHTML = `<option value="">— Aucun —</option>` + options;
}

function populatePaysSelects() {
  const options = `<option value="">— Aucun —</option>` +
    PAYS_FOOTBALL.map((p) => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`).join("");
  document.querySelectorAll("select.pays-select").forEach((sel) => {
    sel.innerHTML = options;
  });
}

/* ---------------------------------------------------------
   COMPÉTITIONS
   --------------------------------------------------------- */

async function loadCompetitions() {
  const { data, error } = await supabaseClient.from("competitions").select("*").order("ordre_affichage");
  if (error) { console.error(error); return; }
  allCompetitions = data || [];
  renderCompetitionsList();
}

// Utilisé pour les listes "simples" (Analyses, Équipes) qui ne filtrent
// que par sport. Les formulaires Matchs/Pronostics utilisent plutôt
// initFormCascade() ci-dessous, qui ajoute le filtre par pays.
function populateCompetitionSelects() {
  ["analyses-competition", "equipes-competition"].forEach((id) => {
    const select = document.getElementById(id);
    const sportSelectId = id.replace("competition", "sport");
    const sportSelect = document.getElementById(sportSelectId);
    fillCompetitionSelect(select, sportSelect.value);
    sportSelect.addEventListener("change", () => fillCompetitionSelect(select, sportSelect.value));
  });
}

function fillCompetitionSelect(selectEl, sportId, selectedId, pays) {
  let filtered = sportId ? allCompetitions.filter((c) => c.sport_id === sportId) : allCompetitions;
  if (pays) filtered = filtered.filter((c) => c.pays === pays);
  selectEl.innerHTML = `<option value="">— Aucune —</option>` +
    filtered.map((c) => `<option value="${c.id}">${escapeHTML(c.nom)}${c.pays ? " (" + escapeHTML(c.pays) + ")" : ""}</option>`).join("");
  if (selectedId && filtered.some((c) => c.id === selectedId)) {
    selectEl.value = selectedId;
  }
}

/* ---------------------------------------------------------
   ÉQUIPES (liste de sélection pour Matchs / Pronostics)
   --------------------------------------------------------- */

async function loadEquipes() {
  const { data, error } = await supabaseClient.from("equipes").select("*").order("nom");
  if (error) { console.error(error); return; }
  allEquipes = data || [];
  renderEquipesList();
}

// Remplit un <select> d'équipes filtré par sport, et si possible par
// compétition ou par pays (extra = { competitionId, pays }). Si le filtre
// le plus précis (compétition) ne donne aucun résultat, on retombe sur le
// pays, puis sur le sport seul — pour ne jamais afficher une liste vide.
function fillEquipeSelect(selectEl, sportId, selectedNom, extra) {
  extra = extra || {};
  let filtered = sportId ? allEquipes.filter((e) => e.sport_id === sportId) : allEquipes.slice();

  if (extra.competitionId) {
    const parCompetition = filtered.filter((e) => e.competition_id === extra.competitionId);
    if (parCompetition.length) {
      filtered = parCompetition;
    } else if (extra.pays) {
      const parPays = filtered.filter((e) => e.pays === extra.pays);
      if (parPays.length) filtered = parPays;
    }
  } else if (extra.pays) {
    const parPays = filtered.filter((e) => e.pays === extra.pays);
    if (parPays.length) filtered = parPays;
  }

  selectEl.innerHTML = `<option value="">— Choisir dans la liste —</option>` +
    filtered.map((e) => `<option value="${escapeHTML(e.nom)}">${escapeHTML(e.nom)}${e.pays ? " (" + escapeHTML(e.pays) + ")" : ""}</option>`).join("");
  if (selectedNom && filtered.some((e) => e.nom === selectedNom)) {
    selectEl.value = selectedNom;
  }
}

// Met en place le filtrage croisé Sport ↔ Compétition ↔ Pays ↔ Équipes
// pour un formulaire donné ("matchs" ou "pronostics") :
//   - changer le sport   → filtre la compétition et les équipes
//   - changer la compétition → renseigne automatiquement le pays (s'il est
//     connu) et filtre les équipes sur cette compétition
//   - changer le pays    → filtre la compétition sur ce pays et les
//     équipes sur ce pays
function initFormCascade(prefix, hasPays) {
  const sportSel = document.getElementById(prefix + "-sport");
  const compSel = document.getElementById(prefix + "-competition");
  const paysSel = hasPays ? document.getElementById(prefix + "-pays") : null;
  const eq1 = document.getElementById(prefix + "-equipe1");
  const eq2 = document.getElementById(prefix + "-equipe2");

  function refreshEquipes() {
    const extra = {
      competitionId: compSel.value || null,
      pays: paysSel ? paysSel.value : ""
    };
    fillEquipeSelect(eq1, sportSel.value, eq1.value, extra);
    fillEquipeSelect(eq2, sportSel.value, eq2.value, extra);
  }

  // Remplissage initial
  fillCompetitionSelect(compSel, sportSel.value);
  refreshEquipes();

  sportSel.addEventListener("change", () => {
    fillCompetitionSelect(compSel, sportSel.value);
    if (paysSel) paysSel.value = "";
    refreshEquipes();
  });

  compSel.addEventListener("change", () => {
    const comp = allCompetitions.find((c) => c.id === compSel.value);
    if (paysSel && comp && comp.pays) {
      const optionExiste = Array.from(paysSel.options).some((o) => o.value === comp.pays);
      if (optionExiste) paysSel.value = comp.pays;
    }
    refreshEquipes();
  });

  if (paysSel) {
    paysSel.addEventListener("change", () => {
      fillCompetitionSelect(compSel, sportSel.value, compSel.value, paysSel.value);
      refreshEquipes();
    });
  }
}

// Place la bonne valeur dans un select d'équipe en mode "modification" :
// si le nom existe dans la liste (compte tenu du sport/compétition/pays
// déjà sélectionnés), on le sélectionne ; sinon on le met dans le champ de
// saisie libre (cas d'un nom entré manuellement).
function setEquipeFieldValue(selectId, autreId, sportId, nom, extra) {
  const select = document.getElementById(selectId);
  const autre = document.getElementById(autreId);
  fillEquipeSelect(select, sportId, nom, extra);
  if (nom && select.value === nom) {
    autre.value = "";
  } else {
    select.value = "";
    autre.value = nom || "";
  }
}

// Renvoie le nom d'équipe à enregistrer : la saisie libre prime sur le select.
function readEquipeFieldValue(selectId, autreId) {
  const autre = document.getElementById(autreId).value.trim();
  if (autre) return autre;
  return document.getElementById(selectId).value;
}

function renderEquipesList() {
  const mount = document.getElementById("list-equipes");
  if (!allEquipes.length) {
    mount.innerHTML = `<div class="admin-empty">Aucune équipe pour le moment.</div>`;
    return;
  }
  mount.innerHTML = allEquipes.map((e) => `
    <div class="admin-list-item">
      <div class="admin-list-item__main">
        <div class="admin-list-item__title">${e.logo_url ? `<img src="${escapeHTML(e.logo_url)}" alt="" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:6px;">` : ""}${escapeHTML(e.nom)}</div>
        <div class="admin-list-item__meta">
          ${sportNom(e.sport_id)}${e.pays ? " · " + escapeHTML(e.pays) : ""}${e.competition_id ? " · " + competitionNom(e.competition_id) : ""}
        </div>
      </div>
      <div class="admin-list-item__actions">
        <button type="button" data-edit="${e.id}">Modifier</button>
        <button type="button" class="is-danger" data-delete="${e.id}">Supprimer</button>
      </div>
    </div>`).join("");

  mount.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editEquipe(btn.dataset.edit)));
  mount.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteEquipe(btn.dataset.delete)));
}

function editEquipe(id) {
  const e = allEquipes.find((x) => x.id === id);
  if (!e) return;
  document.getElementById("equipes-id").value = e.id;
  document.getElementById("equipes-nom").value = e.nom;
  document.getElementById("equipes-sport").value = e.sport_id;
  document.getElementById("equipes-pays").value = e.pays || "";
  document.getElementById("equipes-logo").value = e.logo_url || "";
  fillCompetitionSelect(document.getElementById("equipes-competition"), e.sport_id, e.competition_id);
  document.getElementById("form-equipes-title").textContent = "Modifier l'équipe";
  document.getElementById("equipes-cancel").style.display = "inline-flex";
  document.getElementById("form-equipes").scrollIntoView({ behavior: "smooth" });
}

function resetEquipeForm() {
  document.getElementById("form-equipes").reset();
  document.getElementById("equipes-id").value = "";
  document.getElementById("form-equipes-title").textContent = "Ajouter une équipe / un joueur";
  document.getElementById("equipes-cancel").style.display = "none";
}

async function deleteEquipe(id) {
  if (!confirm("Supprimer définitivement cette équipe de la liste ?")) return;
  const { error } = await supabaseClient.from("equipes").delete().eq("id", id);
  if (error) { showToast("Erreur : " + error.message, true); return; }
  showToast("Équipe supprimée.");
  await loadEquipes();
  refreshAllEquipeSelects();
}

function initEquipesForm() {
  document.getElementById("form-equipes").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("equipes-id").value;
    const payload = {
      nom: document.getElementById("equipes-nom").value.trim(),
      sport_id: document.getElementById("equipes-sport").value,
      pays: document.getElementById("equipes-pays").value || null,
      competition_id: document.getElementById("equipes-competition").value || null,
      logo_url: document.getElementById("equipes-logo").value.trim() || null
    };
    const query = id
      ? supabaseClient.from("equipes").update(payload).eq("id", id)
      : supabaseClient.from("equipes").insert(payload);
    const { error } = await query;
    if (error) { showToast("Erreur : " + error.message, true); return; }
    showToast(id ? "Équipe modifiée." : "Équipe ajoutée.");
    resetEquipeForm();
    await loadEquipes();
    refreshAllEquipeSelects();
  });
  document.getElementById("equipes-cancel").addEventListener("click", resetEquipeForm);
}

// Rafraîchit les 4 listes déroulantes d'équipes (Matchs + Pronostics)
// après un ajout/modification/suppression dans l'onglet Équipes.
function refreshAllEquipeSelects() {
  ["matchs", "pronostics"].forEach((prefix) => {
    const sportSel = document.getElementById(prefix + "-sport");
    const compSel = document.getElementById(prefix + "-competition");
    const paysSel = document.getElementById(prefix + "-pays");
    const extra = { competitionId: compSel.value || null, pays: paysSel ? paysSel.value : "" };
    fillEquipeSelect(document.getElementById(prefix + "-equipe1"), sportSel.value, document.getElementById(prefix + "-equipe1").value, extra);
    fillEquipeSelect(document.getElementById(prefix + "-equipe2"), sportSel.value, document.getElementById(prefix + "-equipe2").value, extra);
  });
}

function renderCompetitionsList() {
  const mount = document.getElementById("list-competitions");
  if (!allCompetitions.length) {
    mount.innerHTML = `<div class="admin-empty">Aucune compétition pour le moment.</div>`;
    return;
  }
  mount.innerHTML = allCompetitions.map((c) => `
    <div class="admin-list-item">
      <div class="admin-list-item__main">
        <div class="admin-list-item__title">${escapeHTML(c.nom)}</div>
        <div class="admin-list-item__meta">
          <span class="badge ${c.actif ? "is-actif" : "is-inactif"}">${c.actif ? "Activée" : "Désactivée"}</span>
          ${sportNom(c.sport_id)}${c.pays ? " · " + escapeHTML(c.pays) : ""} · ordre ${c.ordre_affichage}
        </div>
      </div>
      <div class="admin-list-item__actions">
        <button type="button" data-edit="${c.id}">Modifier</button>
        <button type="button" class="is-danger" data-delete="${c.id}">Supprimer</button>
      </div>
    </div>`).join("");

  mount.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editCompetition(btn.dataset.edit)));
  mount.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteCompetition(btn.dataset.delete)));
}

function editCompetition(id) {
  const c = allCompetitions.find((x) => x.id === id);
  if (!c) return;
  document.getElementById("competitions-id").value = c.id;
  document.getElementById("competitions-nom").value = c.nom;
  document.getElementById("competitions-sport").value = c.sport_id;
  document.getElementById("competitions-pays").value = c.pays || "";
  document.getElementById("competitions-logo").value = c.logo_url || "";
  document.getElementById("competitions-ordre").value = c.ordre_affichage;
  document.getElementById("competitions-actif").value = String(c.actif);
  document.getElementById("form-competitions-title").textContent = "Modifier la compétition";
  document.getElementById("competitions-cancel").style.display = "inline-flex";
  document.getElementById("form-competitions").scrollIntoView({ behavior: "smooth" });
}

function resetCompetitionForm() {
  document.getElementById("form-competitions").reset();
  document.getElementById("competitions-id").value = "";
  document.getElementById("form-competitions-title").textContent = "Ajouter une compétition";
  document.getElementById("competitions-cancel").style.display = "none";
}

// Après un ajout/modification/suppression de compétition, on rafraîchit
// aussi les selects "compétition" de Matchs/Pronostics (pilotés par
// initFormCascade), en conservant le filtre pays éventuellement actif.
function refreshCascadeCompetitions() {
  ["matchs", "pronostics"].forEach((prefix) => {
    const sportSel = document.getElementById(prefix + "-sport");
    const compSel = document.getElementById(prefix + "-competition");
    const paysSel = document.getElementById(prefix + "-pays");
    fillCompetitionSelect(compSel, sportSel.value, compSel.value, paysSel ? paysSel.value : "");
  });
}

async function deleteCompetition(id) {
  if (!confirm("Supprimer définitivement cette compétition ?")) return;
  const { error } = await supabaseClient.from("competitions").delete().eq("id", id);
  if (error) { showToast("Erreur : " + error.message, true); return; }
  showToast("Compétition supprimée.");
  await loadCompetitions();
  populateCompetitionSelects();
  refreshCascadeCompetitions();
}

function initCompetitionsForm() {
  document.getElementById("form-competitions").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("competitions-id").value;
    const payload = {
      nom: document.getElementById("competitions-nom").value.trim(),
      sport_id: document.getElementById("competitions-sport").value,
      pays: document.getElementById("competitions-pays").value.trim() || null,
      logo_url: document.getElementById("competitions-logo").value.trim() || null,
      ordre_affichage: Number(document.getElementById("competitions-ordre").value) || 0,
      actif: document.getElementById("competitions-actif").value === "true"
    };
    const query = id
      ? supabaseClient.from("competitions").update(payload).eq("id", id)
      : supabaseClient.from("competitions").insert(payload);
    const { error } = await query;
    if (error) { showToast("Erreur : " + error.message, true); return; }
    showToast(id ? "Compétition modifiée." : "Compétition ajoutée.");
    resetCompetitionForm();
    await loadCompetitions();
    populateCompetitionSelects();
    refreshCascadeCompetitions();
  });
  document.getElementById("competitions-cancel").addEventListener("click", resetCompetitionForm);
}

/* ---------------------------------------------------------
   PRONOSTICS
   --------------------------------------------------------- */

let allPronostics = [];

async function loadPronostics() {
  const { data, error } = await supabaseClient.from("pronostics").select("*").order("date_match", { ascending: false });
  if (error) { console.error(error); return; }
  allPronostics = data || [];
  renderPronosticsList();
}

function renderPronosticsList() {
  const mount = document.getElementById("list-pronostics");
  if (!allPronostics.length) {
    mount.innerHTML = `<div class="admin-empty">Aucun pronostic pour le moment.</div>`;
    return;
  }
  mount.innerHTML = allPronostics.map((p) => `
    <div class="admin-list-item">
      <div class="admin-list-item__main">
        <div class="admin-list-item__title">${escapeHTML(p.equipe1)} vs ${escapeHTML(p.equipe2)}</div>
        <div class="admin-list-item__meta">
          <span class="badge ${p.publie ? "is-publie" : "is-brouillon"}">${p.publie ? "Publié" : "Brouillon"}</span>
          ${sportNom(p.sport_id)} · ${competitionNom(p.competition_id)} · ${escapeHTML(p.date_match)}${p.heure_match ? " " + escapeHTML(p.heure_match) : ""} · confiance ${p.confiance}%
        </div>
      </div>
      <div class="admin-list-item__actions">
        <button type="button" data-edit="${p.id}">Modifier</button>
        <button type="button" class="is-danger" data-delete="${p.id}">Supprimer</button>
      </div>
    </div>`).join("");

  mount.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editPronostic(btn.dataset.edit)));
  mount.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deletePronostic(btn.dataset.delete)));
}

function editPronostic(id) {
  const p = allPronostics.find((x) => x.id === id);
  if (!p) return;
  const comp = allCompetitions.find((c) => c.id === p.competition_id);
  document.getElementById("pronostics-id").value = p.id;
  document.getElementById("pronostics-sport").value = p.sport_id;
  fillCompetitionSelect(document.getElementById("pronostics-competition"), p.sport_id, p.competition_id);
  document.getElementById("pronostics-pays").value = (comp && comp.pays) || "";
  setEquipeFieldValue("pronostics-equipe1", "pronostics-equipe1-autre", p.sport_id, p.equipe1, { competitionId: p.competition_id, pays: (comp && comp.pays) || "" });
  setEquipeFieldValue("pronostics-equipe2", "pronostics-equipe2-autre", p.sport_id, p.equipe2, { competitionId: p.competition_id, pays: (comp && comp.pays) || "" });
  document.getElementById("pronostics-date").value = p.date_match;
  document.getElementById("pronostics-heure").value = p.heure_match || "";
  document.getElementById("pronostics-pick").value = p.pronostic;
  document.getElementById("pronostics-cote").value = p.cote || "";
  document.getElementById("pronostics-confiance").value = p.confiance;
  document.getElementById("pronostics-statut").value = p.statut;
  document.getElementById("pronostics-publie").value = String(p.publie);
  document.getElementById("pronostics-analyse").value = p.texte_analyse || "";
  document.getElementById("form-pronostics-title").textContent = "Modifier le pronostic";
  document.getElementById("pronostics-cancel").style.display = "inline-flex";
  document.getElementById("form-pronostics").scrollIntoView({ behavior: "smooth" });
}

function resetPronosticForm() {
  document.getElementById("form-pronostics").reset();
  document.getElementById("pronostics-id").value = "";
  fillCompetitionSelect(document.getElementById("pronostics-competition"), document.getElementById("pronostics-sport").value);
  fillEquipeSelect(document.getElementById("pronostics-equipe1"), document.getElementById("pronostics-sport").value);
  fillEquipeSelect(document.getElementById("pronostics-equipe2"), document.getElementById("pronostics-sport").value);
  document.getElementById("form-pronostics-title").textContent = "Ajouter un pronostic";
  document.getElementById("pronostics-cancel").style.display = "none";
}

async function deletePronostic(id) {
  if (!confirm("Supprimer définitivement ce pronostic ?")) return;
  const { error } = await supabaseClient.from("pronostics").delete().eq("id", id);
  if (error) { showToast("Erreur : " + error.message, true); return; }
  showToast("Pronostic supprimé.");
  await loadPronostics();
}

function initPronosticsForm() {
  document.getElementById("form-pronostics").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("pronostics-id").value;
    const payload = {
      sport_id: document.getElementById("pronostics-sport").value,
      competition_id: document.getElementById("pronostics-competition").value || null,
      equipe1: readEquipeFieldValue("pronostics-equipe1", "pronostics-equipe1-autre"),
      equipe2: readEquipeFieldValue("pronostics-equipe2", "pronostics-equipe2-autre"),
      date_match: document.getElementById("pronostics-date").value,
      heure_match: document.getElementById("pronostics-heure").value || null,
      pronostic: document.getElementById("pronostics-pick").value.trim(),
      cote: document.getElementById("pronostics-cote").value.trim() || null,
      confiance: Number(document.getElementById("pronostics-confiance").value) || 0,
      texte_analyse: document.getElementById("pronostics-analyse").value.trim() || null,
      statut: document.getElementById("pronostics-statut").value,
      publie: document.getElementById("pronostics-publie").value === "true",
      auteur_id: currentUser.id
    };
    if (!payload.equipe1 || !payload.equipe2) {
      showToast("Choisissez ou saisissez les deux équipes/joueurs.", true);
      return;
    }
    const query = id
      ? supabaseClient.from("pronostics").update(payload).eq("id", id)
      : supabaseClient.from("pronostics").insert(payload);
    const { error } = await query;
    if (error) { showToast("Erreur : " + error.message, true); return; }
    showToast(id ? "Pronostic modifié." : "Pronostic ajouté.");
    resetPronosticForm();
    await loadPronostics();
  });
  document.getElementById("pronostics-cancel").addEventListener("click", resetPronosticForm);
}

/* ---------------------------------------------------------
   ANALYSES
   --------------------------------------------------------- */

let allAnalyses = [];

async function loadAnalyses() {
  const { data, error } = await supabaseClient.from("analyses").select("*").order("date_publication", { ascending: false });
  if (error) { console.error(error); return; }
  allAnalyses = data || [];
  renderAnalysesList();
}

function renderAnalysesList() {
  const mount = document.getElementById("list-analyses");
  if (!allAnalyses.length) {
    mount.innerHTML = `<div class="admin-empty">Aucune analyse pour le moment.</div>`;
    return;
  }
  mount.innerHTML = allAnalyses.map((a) => `
    <div class="admin-list-item">
      <div class="admin-list-item__main">
        <div class="admin-list-item__title">${escapeHTML(a.titre)}</div>
        <div class="admin-list-item__meta">
          <span class="badge ${a.statut === "publié" ? "is-publie" : "is-brouillon"}">${escapeHTML(a.statut)}</span>
          ${sportNom(a.sport_id)} · ${competitionNom(a.competition_id)} · ${escapeHTML(a.date_publication || "")}
        </div>
      </div>
      <div class="admin-list-item__actions">
        <button type="button" data-edit="${a.id}">Modifier</button>
        <button type="button" class="is-danger" data-delete="${a.id}">Supprimer</button>
      </div>
    </div>`).join("");

  mount.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editAnalyse(btn.dataset.edit)));
  mount.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteAnalyse(btn.dataset.delete)));
}

function editAnalyse(id) {
  const a = allAnalyses.find((x) => x.id === id);
  if (!a) return;
  document.getElementById("analyses-id").value = a.id;
  document.getElementById("analyses-titre").value = a.titre;
  document.getElementById("analyses-sport").value = a.sport_id;
  fillCompetitionSelect(document.getElementById("analyses-competition"), a.sport_id, a.competition_id);
  document.getElementById("analyses-date").value = a.date_publication || "";
  document.getElementById("analyses-statut").value = a.statut;
  document.getElementById("analyses-texte").value = a.texte_analyse || "";
  document.getElementById("analyses-conclusion").value = a.conclusion || "";
  document.getElementById("form-analyses-title").textContent = "Modifier l'analyse";
  document.getElementById("analyses-cancel").style.display = "inline-flex";
  document.getElementById("form-analyses").scrollIntoView({ behavior: "smooth" });
}

function resetAnalyseForm() {
  document.getElementById("form-analyses").reset();
  document.getElementById("analyses-id").value = "";
  document.getElementById("form-analyses-title").textContent = "Ajouter une analyse";
  document.getElementById("analyses-cancel").style.display = "none";
}

async function deleteAnalyse(id) {
  if (!confirm("Supprimer définitivement cette analyse ?")) return;
  const { error } = await supabaseClient.from("analyses").delete().eq("id", id);
  if (error) { showToast("Erreur : " + error.message, true); return; }
  showToast("Analyse supprimée.");
  await loadAnalyses();
}

function initAnalysesForm() {
  document.getElementById("form-analyses").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("analyses-id").value;
    const payload = {
      titre: document.getElementById("analyses-titre").value.trim(),
      sport_id: document.getElementById("analyses-sport").value,
      competition_id: document.getElementById("analyses-competition").value || null,
      date_publication: document.getElementById("analyses-date").value || null,
      statut: document.getElementById("analyses-statut").value,
      texte_analyse: document.getElementById("analyses-texte").value.trim() || null,
      conclusion: document.getElementById("analyses-conclusion").value.trim() || null,
      auteur_id: currentUser.id
    };
    const query = id
      ? supabaseClient.from("analyses").update(payload).eq("id", id)
      : supabaseClient.from("analyses").insert(payload);
    const { error } = await query;
    if (error) { showToast("Erreur : " + error.message, true); return; }
    showToast(id ? "Analyse modifiée." : "Analyse ajoutée.");
    resetAnalyseForm();
    await loadAnalyses();
  });
  document.getElementById("analyses-cancel").addEventListener("click", resetAnalyseForm);
}

/* ---------------------------------------------------------
   ARTICLES
   --------------------------------------------------------- */

let allArticles = [];

async function loadArticles() {
  const { data, error } = await supabaseClient.from("articles").select("*").order("date_publication", { ascending: false });
  if (error) { console.error(error); return; }
  allArticles = data || [];
  renderArticlesList();
}

function renderArticlesList() {
  const mount = document.getElementById("list-articles");
  if (!allArticles.length) {
    mount.innerHTML = `<div class="admin-empty">Aucun article pour le moment.</div>`;
    return;
  }
  mount.innerHTML = allArticles.map((a) => `
    <div class="admin-list-item">
      <div class="admin-list-item__main">
        <div class="admin-list-item__title">${escapeHTML(a.titre)}</div>
        <div class="admin-list-item__meta">
          <span class="badge ${a.statut === "publié" ? "is-publie" : "is-brouillon"}">${escapeHTML(a.statut)}</span>
          ${a.sport_id ? sportNom(a.sport_id) + " · " : ""}${escapeHTML(a.categorie || "")} · ${escapeHTML(a.date_publication || "")}
        </div>
      </div>
      <div class="admin-list-item__actions">
        <button type="button" data-edit="${a.id}">Modifier</button>
        <button type="button" class="is-danger" data-delete="${a.id}">Supprimer</button>
      </div>
    </div>`).join("");

  mount.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editArticle(btn.dataset.edit)));
  mount.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteArticle(btn.dataset.delete)));
}

function editArticle(id) {
  const a = allArticles.find((x) => x.id === id);
  if (!a) return;
  document.getElementById("articles-id").value = a.id;
  document.getElementById("articles-titre").value = a.titre;
  document.getElementById("articles-sport").value = a.sport_id || "";
  document.getElementById("articles-categorie").value = a.categorie || "";
  document.getElementById("articles-date").value = a.date_publication || "";
  document.getElementById("articles-image").value = a.image_url || "";
  document.getElementById("articles-auteur").value = a.auteur || "";
  document.getElementById("articles-statut").value = a.statut;
  document.getElementById("articles-resume").value = a.resume || "";
  document.getElementById("articles-contenu").value = a.contenu || "";
  document.getElementById("form-articles-title").textContent = "Modifier l'article";
  document.getElementById("articles-cancel").style.display = "inline-flex";
  document.getElementById("form-articles").scrollIntoView({ behavior: "smooth" });
}

function resetArticleForm() {
  document.getElementById("form-articles").reset();
  document.getElementById("articles-id").value = "";
  document.getElementById("form-articles-title").textContent = "Ajouter un article";
  document.getElementById("articles-cancel").style.display = "none";
}

async function deleteArticle(id) {
  if (!confirm("Supprimer définitivement cet article ?")) return;
  const { error } = await supabaseClient.from("articles").delete().eq("id", id);
  if (error) { showToast("Erreur : " + error.message, true); return; }
  showToast("Article supprimé.");
  await loadArticles();
}

function initArticlesForm() {
  document.getElementById("form-articles").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("articles-id").value;
    const payload = {
      titre: document.getElementById("articles-titre").value.trim(),
      sport_id: document.getElementById("articles-sport").value || null,
      categorie: document.getElementById("articles-categorie").value.trim() || null,
      date_publication: document.getElementById("articles-date").value || null,
      image_url: document.getElementById("articles-image").value.trim() || null,
      auteur: document.getElementById("articles-auteur").value.trim() || null,
      statut: document.getElementById("articles-statut").value,
      resume: document.getElementById("articles-resume").value.trim() || null,
      contenu: document.getElementById("articles-contenu").value.trim() || null
    };
    const query = id
      ? supabaseClient.from("articles").update(payload).eq("id", id)
      : supabaseClient.from("articles").insert(payload);
    const { error } = await query;
    if (error) { showToast("Erreur : " + error.message, true); return; }
    showToast(id ? "Article modifié." : "Article ajouté.");
    resetArticleForm();
    await loadArticles();
  });
  document.getElementById("articles-cancel").addEventListener("click", resetArticleForm);
}

/* ---------------------------------------------------------
   MATCHS
   --------------------------------------------------------- */

let allMatchs = [];

async function loadMatchs() {
  const { data, error } = await supabaseClient.from("matchs").select("*").order("date_match", { ascending: false });
  if (error) { console.error(error); return; }
  allMatchs = data || [];
  renderMatchsList();
}

function renderMatchsList() {
  const mount = document.getElementById("list-matchs");
  if (!allMatchs.length) {
    mount.innerHTML = `<div class="admin-empty">Aucun match pour le moment.</div>`;
    return;
  }
  mount.innerHTML = allMatchs.map((m) => `
    <div class="admin-list-item">
      <div class="admin-list-item__main">
        <div class="admin-list-item__title">${escapeHTML(m.equipe1)} vs ${escapeHTML(m.equipe2)}</div>
        <div class="admin-list-item__meta">
          <span class="badge ${m.statut === "terminé" ? "is-publie" : "is-inactif"}">${escapeHTML(m.statut)}</span>
          ${sportNom(m.sport_id)} · ${competitionNom(m.competition_id)}${m.pays ? " · " + escapeHTML(m.pays) : ""} · ${escapeHTML(m.date_match)}${m.heure_match ? " " + escapeHTML(m.heure_match) : ""}
        </div>
      </div>
      <div class="admin-list-item__actions">
        <button type="button" data-edit="${m.id}">Modifier</button>
        <button type="button" class="is-danger" data-delete="${m.id}">Supprimer</button>
      </div>
    </div>`).join("");

  mount.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editMatch(btn.dataset.edit)));
  mount.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteMatch(btn.dataset.delete)));
}

function editMatch(id) {
  const m = allMatchs.find((x) => x.id === id);
  if (!m) return;
  document.getElementById("matchs-id").value = m.id;
  document.getElementById("matchs-sport").value = m.sport_id;
  fillCompetitionSelect(document.getElementById("matchs-competition"), m.sport_id, m.competition_id);
  document.getElementById("matchs-pays").value = m.pays || "";
  setEquipeFieldValue("matchs-equipe1", "matchs-equipe1-autre", m.sport_id, m.equipe1, { competitionId: m.competition_id, pays: m.pays || "" });
  setEquipeFieldValue("matchs-equipe2", "matchs-equipe2-autre", m.sport_id, m.equipe2, { competitionId: m.competition_id, pays: m.pays || "" });
  document.getElementById("matchs-date").value = m.date_match;
  document.getElementById("matchs-heure").value = m.heure_match || "";
  document.getElementById("matchs-statut").value = m.statut;
  document.getElementById("matchs-cote1").value = m.cote_1 || "";
  document.getElementById("matchs-cotex").value = m.cote_x || "";
  document.getElementById("matchs-cote2").value = m.cote_2 || "";
  document.getElementById("form-matchs-title").textContent = "Modifier le match";
  document.getElementById("matchs-cancel").style.display = "inline-flex";
  document.getElementById("form-matchs").scrollIntoView({ behavior: "smooth" });
}

function resetMatchForm() {
  document.getElementById("form-matchs").reset();
  document.getElementById("matchs-id").value = "";
  fillCompetitionSelect(document.getElementById("matchs-competition"), document.getElementById("matchs-sport").value);
  fillEquipeSelect(document.getElementById("matchs-equipe1"), document.getElementById("matchs-sport").value);
  fillEquipeSelect(document.getElementById("matchs-equipe2"), document.getElementById("matchs-sport").value);
  document.getElementById("form-matchs-title").textContent = "Ajouter un match";
  document.getElementById("matchs-cancel").style.display = "none";
}

async function deleteMatch(id) {
  if (!confirm("Supprimer définitivement ce match ? Son score éventuel sera supprimé aussi.")) return;
  const { error } = await supabaseClient.from("matchs").delete().eq("id", id);
  if (error) { showToast("Erreur : " + error.message, true); return; }
  showToast("Match supprimé.");
  await loadMatchs();
  await loadScoresPanel();
}

function initMatchsForm() {
  document.getElementById("form-matchs").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("matchs-id").value;
    const payload = {
      sport_id: document.getElementById("matchs-sport").value,
      competition_id: document.getElementById("matchs-competition").value || null,
      pays: document.getElementById("matchs-pays").value || null,
      equipe1: readEquipeFieldValue("matchs-equipe1", "matchs-equipe1-autre"),
      equipe2: readEquipeFieldValue("matchs-equipe2", "matchs-equipe2-autre"),
      date_match: document.getElementById("matchs-date").value,
      heure_match: document.getElementById("matchs-heure").value || null,
      statut: document.getElementById("matchs-statut").value,
      cote_1: document.getElementById("matchs-cote1").value.trim() || null,
      cote_x: document.getElementById("matchs-cotex").value.trim() || null,
      cote_2: document.getElementById("matchs-cote2").value.trim() || null
    };
    if (!payload.equipe1 || !payload.equipe2) {
      showToast("Choisissez ou saisissez les deux équipes/joueurs.", true);
      return;
    }
    const query = id
      ? supabaseClient.from("matchs").update(payload).eq("id", id)
      : supabaseClient.from("matchs").insert(payload);
    const { error } = await query;
    if (error) { showToast("Erreur : " + error.message, true); return; }
    showToast(id ? "Match modifié." : "Match ajouté.");
    resetMatchForm();
    await loadMatchs();
    await loadScoresPanel();
  });
  document.getElementById("matchs-cancel").addEventListener("click", resetMatchForm);
}

/* ---------------------------------------------------------
   SCORES
   -----------------------------------------------------------
   Pas de formulaire d'ajout séparé : un score se rattache
   toujours à un match existant passé en statut "terminé".
   La liste ci-dessous permet de saisir/modifier le score de
   chacun de ces matchs directement, sans changer de page.
   --------------------------------------------------------- */

let allScores = [];

async function loadScoresPanel() {
  const { data, error } = await supabaseClient.from("scores").select("*");
  if (error) { console.error(error); return; }
  allScores = data || [];
  renderScoresPanelList();
}

function scoreForMatch(matchId) {
  return allScores.find((s) => s.match_id === matchId) || null;
}

function renderScoresPanelList() {
  const mount = document.getElementById("list-scores");
  const matchsTermines = allMatchs.filter((m) => m.statut === "terminé");
  if (!matchsTermines.length) {
    mount.innerHTML = `<div class="admin-empty">Aucun match terminé pour le moment. Passez un match en statut « Terminé » dans l'onglet Matchs pour lui ajouter un score ici.</div>`;
    return;
  }
  mount.innerHTML = matchsTermines.map((m) => {
    const s = scoreForMatch(m.id);
    return `
    <div class="admin-list-item" style="align-items:center;">
      <div class="admin-list-item__main">
        <div class="admin-list-item__title">${escapeHTML(m.equipe1)} vs ${escapeHTML(m.equipe2)}</div>
        <div class="admin-list-item__meta">${sportNom(m.sport_id)} · ${competitionNom(m.competition_id)} · ${escapeHTML(m.date_match)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;">
          <input type="number" min="0" style="width:64px;" data-score-field="score_equipe1" data-match="${m.id}" value="${s && s.score_equipe1 != null ? s.score_equipe1 : ""}" placeholder="${escapeHTML(m.equipe1)}" aria-label="Score de ${escapeHTML(m.equipe1)}">
          <span>—</span>
          <input type="number" min="0" style="width:64px;" data-score-field="score_equipe2" data-match="${m.id}" value="${s && s.score_equipe2 != null ? s.score_equipe2 : ""}" placeholder="${escapeHTML(m.equipe2)}" aria-label="Score de ${escapeHTML(m.equipe2)}">
          <span style="color:var(--gray-500);font-size:0.82rem;margin-left:8px;">Mi-temps (facultatif) :</span>
          <input type="number" min="0" style="width:64px;" data-score-field="score_mt_equipe1" data-match="${m.id}" value="${s && s.score_mt_equipe1 != null ? s.score_mt_equipe1 : ""}" aria-label="Score mi-temps ${escapeHTML(m.equipe1)}">
          <span>—</span>
          <input type="number" min="0" style="width:64px;" data-score-field="score_mt_equipe2" data-match="${m.id}" value="${s && s.score_mt_equipe2 != null ? s.score_mt_equipe2 : ""}" aria-label="Score mi-temps ${escapeHTML(m.equipe2)}">
        </div>
      </div>
      <div class="admin-list-item__actions">
        <button type="button" data-save-score="${m.id}">Enregistrer le score</button>
      </div>
    </div>`;
  }).join("");

  mount.querySelectorAll("[data-save-score]").forEach((btn) => {
    btn.addEventListener("click", () => saveScore(btn.dataset.saveScore));
  });
}

async function saveScore(matchId) {
  const readField = (field) => {
    const el = document.querySelector(`[data-score-field="${field}"][data-match="${matchId}"]`);
    return el && el.value !== "" ? Number(el.value) : null;
  };
  const payload = {
    match_id: matchId,
    score_equipe1: readField("score_equipe1"),
    score_equipe2: readField("score_equipe2"),
    score_mt_equipe1: readField("score_mt_equipe1"),
    score_mt_equipe2: readField("score_mt_equipe2")
  };
  const existing = scoreForMatch(matchId);
  const query = existing
    ? supabaseClient.from("scores").update(payload).eq("match_id", matchId)
    : supabaseClient.from("scores").insert(payload);
  const { error } = await query;
  if (error) { showToast("Erreur : " + error.message, true); return; }
  showToast("Score enregistré.");
  await loadScoresPanel();
}

/* ---------------------------------------------------------
   SPORTS
   --------------------------------------------------------- */

function renderSportsList() {
  const mount = document.getElementById("list-sports");
  if (!allSports.length) {
    mount.innerHTML = `<div class="admin-empty">Aucun sport pour le moment.</div>`;
    return;
  }
  mount.innerHTML = allSports.map((s) => `
    <div class="admin-list-item">
      <div class="admin-list-item__main">
        <div class="admin-list-item__title">${escapeHTML(s.icone || "")} ${escapeHTML(s.nom)}</div>
        <div class="admin-list-item__meta">
          <span class="badge ${s.actif ? "is-actif" : "is-inactif"}">${s.actif ? "Activé" : "Désactivé"}</span>
          slug : ${escapeHTML(s.slug)} · ordre ${s.ordre_affichage}
        </div>
      </div>
      <div class="admin-list-item__actions">
        <button type="button" data-edit="${s.id}">Modifier</button>
        <button type="button" class="is-danger" data-delete="${s.id}">Supprimer</button>
      </div>
    </div>`).join("");

  mount.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editSport(btn.dataset.edit)));
  mount.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deleteSport(btn.dataset.delete)));
}

function editSport(id) {
  const s = allSports.find((x) => x.id === id);
  if (!s) return;
  document.getElementById("sports-id").value = s.id;
  document.getElementById("sports-nom").value = s.nom;
  document.getElementById("sports-slug").value = s.slug;
  document.getElementById("sports-icone").value = s.icone || "";
  document.getElementById("sports-ordre").value = s.ordre_affichage;
  document.getElementById("sports-actif").value = String(s.actif);
  document.getElementById("form-sports-title").textContent = "Modifier le sport";
  document.getElementById("sports-cancel").style.display = "inline-flex";
  document.getElementById("form-sports").scrollIntoView({ behavior: "smooth" });
}

function resetSportForm() {
  document.getElementById("form-sports").reset();
  document.getElementById("sports-id").value = "";
  document.getElementById("form-sports-title").textContent = "Ajouter un sport";
  document.getElementById("sports-cancel").style.display = "none";
}

async function deleteSport(id) {
  if (!confirm("Supprimer définitivement ce sport ? Cela peut échouer s'il est encore utilisé par des compétitions, matchs, pronostics, analyses ou articles.")) return;
  const { error } = await supabaseClient.from("sports").delete().eq("id", id);
  if (error) { showToast("Erreur : " + error.message, true); return; }
  showToast("Sport supprimé.");
  await loadSports();
  populateSportSelects();
  renderSportsList();
}

function initSportsForm() {
  document.getElementById("form-sports").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("sports-id").value;
    const payload = {
      nom: document.getElementById("sports-nom").value.trim(),
      slug: document.getElementById("sports-slug").value.trim().toLowerCase(),
      icone: document.getElementById("sports-icone").value.trim() || null,
      ordre_affichage: Number(document.getElementById("sports-ordre").value) || 0,
      actif: document.getElementById("sports-actif").value === "true"
    };
    const query = id
      ? supabaseClient.from("sports").update(payload).eq("id", id)
      : supabaseClient.from("sports").insert(payload);
    const { error } = await query;
    if (error) { showToast("Erreur : " + error.message, true); return; }
    showToast(id ? "Sport modifié." : "Sport ajouté.");
    resetSportForm();
    await loadSports();
    populateSportSelects();
    renderSportsList();
  });
  document.getElementById("sports-cancel").addEventListener("click", resetSportForm);
}

/* ---------------------------------------------------------
   PARTENAIRES (affiliation)
   --------------------------------------------------------- */

let allPartenaires = [];

async function loadPartenaires() {
  const { data, error } = await supabaseClient.from("partenaires").select("*").order("ordre_affichage");
  if (error) { console.error(error); return; }
  allPartenaires = data || [];
  renderPartenairesList();
}

function renderPartenairesList() {
  const mount = document.getElementById("list-partenaires");
  if (!allPartenaires.length) {
    mount.innerHTML = `<div class="admin-empty">Aucun partenaire pour le moment.</div>`;
    return;
  }
  mount.innerHTML = allPartenaires.map((p) => `
    <div class="admin-list-item">
      <div class="admin-list-item__main">
        <div class="admin-list-item__title">${escapeHTML(p.nom)}</div>
        <div class="admin-list-item__meta">
          <span class="badge ${p.actif ? "is-actif" : "is-inactif"}">${p.actif ? "Actif" : "Inactif"}</span>
          ordre ${p.ordre_affichage}${p.url_affiliee ? " · " + escapeHTML(p.url_affiliee) : ""}
        </div>
      </div>
      <div class="admin-list-item__actions">
        <button type="button" data-edit="${p.id}">Modifier</button>
        <button type="button" class="is-danger" data-delete="${p.id}">Supprimer</button>
      </div>
    </div>`).join("");

  mount.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editPartenaire(btn.dataset.edit)));
  mount.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => deletePartenaire(btn.dataset.delete)));
}

function editPartenaire(id) {
  const p = allPartenaires.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("partenaires-id").value = p.id;
  document.getElementById("partenaires-nom").value = p.nom;
  document.getElementById("partenaires-logo").value = p.logo_url || "";
  document.getElementById("partenaires-url").value = p.url_affiliee || "";
  document.getElementById("partenaires-ordre").value = p.ordre_affichage;
  document.getElementById("partenaires-actif").value = String(p.actif);
  document.getElementById("form-partenaires-title").textContent = "Modifier le partenaire";
  document.getElementById("partenaires-cancel").style.display = "inline-flex";
  document.getElementById("form-partenaires").scrollIntoView({ behavior: "smooth" });
}

function resetPartenaireForm() {
  document.getElementById("form-partenaires").reset();
  document.getElementById("partenaires-id").value = "";
  document.getElementById("form-partenaires-title").textContent = "Ajouter un partenaire";
  document.getElementById("partenaires-cancel").style.display = "none";
}

async function deletePartenaire(id) {
  if (!confirm("Supprimer définitivement ce partenaire ?")) return;
  const { error } = await supabaseClient.from("partenaires").delete().eq("id", id);
  if (error) { showToast("Erreur : " + error.message, true); return; }
  showToast("Partenaire supprimé.");
  await loadPartenaires();
}

function initPartenairesForm() {
  document.getElementById("form-partenaires").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("partenaires-id").value;
    const payload = {
      nom: document.getElementById("partenaires-nom").value.trim(),
      logo_url: document.getElementById("partenaires-logo").value.trim() || null,
      url_affiliee: document.getElementById("partenaires-url").value.trim() || null,
      ordre_affichage: Number(document.getElementById("partenaires-ordre").value) || 0,
      actif: document.getElementById("partenaires-actif").value === "true"
    };
    const query = id
      ? supabaseClient.from("partenaires").update(payload).eq("id", id)
      : supabaseClient.from("partenaires").insert(payload);
    const { error } = await query;
    if (error) { showToast("Erreur : " + error.message, true); return; }
    showToast(id ? "Partenaire modifié." : "Partenaire ajouté.");
    resetPartenaireForm();
    await loadPartenaires();
  });
  document.getElementById("partenaires-cancel").addEventListener("click", resetPartenaireForm);
}

/* ---------------------------------------------------------
   INITIALISATION GÉNÉRALE
   --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initTabs();
  initCompetitionsForm();
  initPronosticsForm();
  initAnalysesForm();
  initArticlesForm();
  initMatchsForm();
  initEquipesForm();
  initSportsForm();
  initPartenairesForm();
  initAuth();
});
