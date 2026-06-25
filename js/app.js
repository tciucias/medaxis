// Consult Ready — App Logic

(function () {
  'use strict';

  let searchQuery         = '';
  let searchMode          = 'guidelines';
  let contentIndex        = null;
  let modalHistoryPushed  = false;
  let currentCardId       = null;
  let lastFocusedCard     = null;
  let currentSystem       = null;
  let sidebarInView       = true;

  const FAVS_KEY = 'medaxis-favs';
  const HINT_KEY = 'medaxis-hint-seen';

  const ALIASES = {
    'htn':    'hypertension',       'bp':    'hypertension',
    't1dm':   'type 1 diabetes',    't2dm':  'type 2 diabetes',
    'dm':     'diabetes',           'af':    'atrial fibrillation',
    'ckd':    'chronic kidney',
    'ihd':    'ischaemic heart',    'cad':   'coronary artery',
    'hf':     'heart failure',      'chf':   'heart failure',
    'ccf':    'heart failure',      'dvt':   'deep vein thrombosis',
    'pe':     'pulmonary embolism', 'vte':   'venous thromboembolic',
    'gord':   'gastro-oesophageal reflux',
    'gerd':   'gastro-oesophageal reflux',
    'ibs':    'irritable bowel',    'ibd':   'inflammatory bowel',
    'uti':    'urinary tract infection',
    'luts':   'lower urinary tract','bph':   'benign prostatic',
    'ra':     'rheumatoid arthritis','oa':   'osteoarthritis',
    'gad':    'anxiety',            'ptsd':  'post-traumatic',
    'asd':    'autism',
    'ms':     'multiple sclerosis', 'pd':    'parkinson',
    'hrt':    'hormone replacement','cocp':  'combined oral contraceptive',
    'pop':    'progestogen',        'iud':   'intrauterine',
    'sti':    'sexually transmitted','tb':   'tuberculosis',
    'nafld':  'non-alcoholic fatty liver',
    'nash':   'non-alcoholic fatty liver',
    'pcos':   'polycystic ovary',   'pms':   'premenstrual',
    'pmdd':   'premenstrual',       'lbp':   'back pain',
    'sob':    'breathlessness',     'eol':   'end of life',
    'nsaid':  'non-steroidal anti-inflammatory',
    'ppi':    'proton pump inhibitor',
    'ssri':   'antidepressant',     'snri':  'antidepressant',
    'ace':    'ace inhibitor',      'arb':   'angiotensin receptor',
    'bmi':    'obesity',
    'mounjaro': 'tirzepatide', 'wegovy': 'semaglutide',
    'saxenda':  'liraglutide',
  };

  const CONTENT_TAB_LABELS = {
    summary: 'Consult', diagnosis: 'Diagnosis', investigations: 'Investigations',
    management: 'Management', prescribing: 'Prescribing Rules', referral: 'Referral', monitoring: 'Monitoring',
    overview: 'Overview', air: 'AIR Therapy', mart: 'MART Therapy',
    inhalers: 'Inhaler Types', insulins: 'Insulin Types', hrt: 'HRT',
    drugs: 'Oral Hypoglycaemics', types: 'Types', steroids: 'Topical Steroids',
    ftu: 'Fingertip Units', schedule: 'Schedule', specialGroups: 'Special Groups',
    atRisk: 'At-Risk', contraindications: 'Contraindications', administration: 'Administration',
    eyeDrops: 'Eye Drops',
  };

  // Maps guideline data key → HTML id suffix for panel + tab button.
  // Adding a new card type requires one entry here + matching elements in index.html.
  const TAB_REGISTRY = [
    { key: 'summary',           id: 'summary' },
    { key: 'investigations',    id: 'investigations' },
    { key: 'overview',          id: 'overview' },
    { key: 'air',               id: 'air' },
    { key: 'mart',              id: 'mart' },
    { key: 'inhalers',          id: 'inhalers' },
    { key: 'prescribing',       id: 'prescribing' },
    { key: 'insulins',          id: 'insulins' },
    { key: 'hrt',               id: 'hrt' },
    { key: 'drugs',             id: 'drugs' },
    { key: 'gad2',              id: 'gad2' },
    { key: 'gad7',              id: 'gad7' },
    { key: 'aq10',              id: 'aq10' },
    { key: 'dmard',             id: 'dmard' },
    { key: 'gpcog',             id: 'gpcog' },
    { key: 'sixcit',            id: 'sixcit' },
    { key: 'types',             id: 'types' },
    { key: 'images',            id: 'images' },
    { key: 'simonbroome',       id: 'simonbroome' },
    { key: 'steroids',          id: 'steroids' },
    { key: 'ftu',               id: 'ftu' },
    { key: 'schedule',          id: 'schedule' },
    { key: 'specialGroups',     id: 'special-groups' },
    { key: 'atRisk',            id: 'at-risk' },
    { key: 'contraindications', id: 'contraindications' },
    { key: 'administration',    id: 'administration' },
    { key: 'eyeDrops',          id: 'eye-drops' },
  ];

  function buildContentIndex() {
    const strip = html => html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() : '';
    contentIndex = GUIDELINES.map(g => ({
      summary: strip(g.summary), diagnosis: strip(g.diagnosis),
      investigations: strip(g.investigations), management: strip(g.management),
      prescribing: strip(g.prescribing), referral: strip(g.referral), monitoring: strip(g.monitoring),
      overview: strip(g.overview), air: strip(g.air), mart: strip(g.mart),
      inhalers: strip(g.inhalers), insulins: strip(g.insulins), hrt: strip(g.hrt),
      drugs: strip(g.drugs), types: strip(g.types), steroids: strip(g.steroids),
      ftu: strip(g.ftu), schedule: strip(g.schedule), specialGroups: strip(g.specialGroups),
      atRisk: strip(g.atRisk), contraindications: strip(g.contraindications),
      administration: strip(g.administration),
    }));
  }

  // ── Toast ──
  let toastTimer;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 2000);
  }

  // ── Info popup ──
  const infoPopupPanel    = document.getElementById('info-popup-panel');
  const infoPopupBackdrop = document.getElementById('info-popup-backdrop');
  const infoPopupTitle    = document.getElementById('info-popup-title');
  const infoPopupBody     = document.getElementById('info-popup-body');
  const infoPopupClose    = document.getElementById('info-popup-close');

  let popupScrollHandler = null;

  function openInfoPopup(title, html) {
    infoPopupTitle.textContent = title;
    infoPopupBody.innerHTML = html;
    infoPopupBody.scrollTop = 0;
    infoPopupBody.style.paddingTop = '';

    if (popupScrollHandler) {
      infoPopupBody.removeEventListener('scroll', popupScrollHandler);
      popupScrollHandler = null;
    }

    const thead = infoPopupBody.querySelector('thead');
    if (thead) {
      // Collapse all top spacing so thead sits at exactly y=0 within the body.
      // translateY(scrollTop) then pins it flush with no gap for content to slip through.
      infoPopupBody.style.paddingTop = '0';
      const tableWrap = infoPopupBody.querySelector('.table-wrap');
      if (tableWrap) {
        tableWrap.style.marginTop = '0';
        tableWrap.style.borderTop = 'none';
        tableWrap.style.borderTopLeftRadius = '0';
        tableWrap.style.borderTopRightRadius = '0';
      }

      popupScrollHandler = () => {
        thead.style.transform = `translateY(${infoPopupBody.scrollTop}px)`;
      };
      infoPopupBody.addEventListener('scroll', popupScrollHandler, { passive: true });
    }

    infoPopupPanel.hidden = false;
    infoPopupBackdrop.classList.add('is-open');
    infoPopupClose.focus();
  }

  function closeInfoPopup() {
    infoPopupPanel.hidden = true;
    infoPopupBackdrop.classList.remove('is-open');
    if (popupScrollHandler) {
      infoPopupBody.removeEventListener('scroll', popupScrollHandler);
      popupScrollHandler = null;
    }
    const thead = infoPopupBody.querySelector('thead');
    if (thead) thead.style.transform = '';
    infoPopupBody.style.paddingTop = '';
    const tableWrap = infoPopupBody.querySelector('.table-wrap');
    if (tableWrap) {
      tableWrap.style.marginTop = '';
      tableWrap.style.borderTop = '';
      tableWrap.style.borderTopLeftRadius = '';
      tableWrap.style.borderTopRightRadius = '';
    }
  }

  infoPopupClose.addEventListener('click', closeInfoPopup);
  infoPopupBackdrop.addEventListener('click', closeInfoPopup);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !infoPopupPanel.hidden) closeInfoPopup();
  });

  document.addEventListener('click', e => {
    const trigger = e.target.closest('.popup-trigger');
    if (!trigger) return;
    const title = trigger.dataset.popupTitle || '';
    const html  = document.getElementById(trigger.dataset.popup)?.innerHTML || '';
    openInfoPopup(title, html);
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('.jump-link');
    if (!btn) return;
    const target = document.getElementById(btn.dataset.jump);
    if (!target) return;
    const scroller = target.closest('.modal-content');
    if (!scroller) return;
    const scrollTop = scroller.scrollTop + target.getBoundingClientRect().top
                    - scroller.getBoundingClientRect().top - 12;
    scroller.scrollTo({ top: scrollTop, behavior: 'smooth' });
  });

  // ── Card HTML template ──
  function cardHTML(g, query, matchedTabs, favSet) {
    const title    = g.title;
    const subtitle = g.subtitle;
    const tabTag   = matchedTabs && matchedTabs.length
      ? `<p class="content-match-tabs">${matchedTabs.slice(0, 4).join(' · ')}${matchedTabs.length > 4 ? ' +' + (matchedTabs.length - 4) + ' more' : ''}</p>`
      : '';
    const isFav = favSet ? favSet.has(g.id) : false;
    return `
      <div class="card" data-id="${g.id}" role="button" tabindex="0" aria-label="Open ${g.title}">
        <div class="card-top">
          <span class="card-arrow">›</span>
        </div>
        <h3 class="card-title">${title}</h3>
        <p class="card-subtitle">${subtitle}</p>
        ${tabTag}
        <div class="card-bottom">
          <span class="system-chip">${Array.isArray(g.system) ? g.system.join(' · ') : g.system}</span>
          <button class="card-pin${isFav ? ' is-pinned' : ''}" data-id="${g.id}" aria-label="${isFav ? 'Unpin' : 'Pin'} guideline" tabindex="-1">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 2h8a1 1 0 0 1 1 1v11l-5-3-5 3V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // ── Attach card event listeners ──
  function attachCardListeners(container) {
    container.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => openModal(card.dataset.id));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(card.dataset.id);
        }
      });
    });
    container.querySelectorAll('.card-pin').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        toggleFavourite(btn.dataset.id);
      });
    });
  }

  // ── Render cards into a given grid element ──
  function renderCards(guidelines, gridEl, query, matchedTabsMap) {
    if (guidelines.length === 0) {
      gridEl.innerHTML = '<div class="no-results"><p class="no-results-title">No results</p><p class="no-results-body">Try a condition name, drug, or abbreviation — e.g. "t2dm", "af", "ramipril"</p></div>';
      return;
    }
    const favSet = new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'));
    gridEl.innerHTML = guidelines.map(g => cardHTML(g, query, matchedTabsMap && matchedTabsMap.get(g.id), favSet)).join('');
    attachCardListeners(gridEl);
  }

  // ── Recently Viewed ──
  const RECENT_KEY = 'medaxis-recent';
  const RECENT_MAX = 3;

  function saveRecentlyViewed(id) {
    let recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    recent = [id, ...recent.filter(r => r !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    renderRecentlyViewed();
  }

  function renderRecentlyViewed() {
    const section = document.getElementById('recently-viewed');
    if (!section) return;
    const ids = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const guidelines = ids.map(id => GUIDELINES.find(g => g.id === id)).filter(Boolean);
    if (guidelines.length === 0) { section.hidden = true; return; }
    section.hidden = false;
    renderCards(guidelines, document.getElementById('recently-viewed-grid'), '', null);
  }

  // ── Favourites ──
  function toggleFavourite(id) {
    const favs = new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'));
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    localStorage.setItem(FAVS_KEY, JSON.stringify([...favs]));
    const isFav = favs.has(id);
    document.querySelectorAll(`.card-pin[data-id="${id}"]`).forEach(btn => {
      btn.classList.toggle('is-pinned', isFav);
      btn.setAttribute('aria-label', (isFav ? 'Unpin' : 'Pin') + ' guideline');
    });
    renderFavourites();
  }

  function renderFavourites() {
    const section = document.getElementById('pinned-cards');
    if (!section) return;
    const ids = JSON.parse(localStorage.getItem(FAVS_KEY) || '[]');
    const guidelines = ids.map(id => GUIDELINES.find(g => g.id === id)).filter(Boolean);
    if (guidelines.length === 0) { section.hidden = true; return; }
    section.hidden = false;
    renderCards(guidelines, document.getElementById('pinned-cards-grid'));
  }

  // ── Onboarding hint ──
  function showOnboardingHint() {
    if (localStorage.getItem(HINT_KEY)) return;
    setTimeout(() => {
      const hint = document.getElementById('onboarding-hint');
      if (!hint) return;
      hint.hidden = false;
      const autoDismiss = setTimeout(() => dismissHint(), 9000);
      document.getElementById('hint-close').addEventListener('click', () => {
        clearTimeout(autoDismiss);
        dismissHint();
      });
    }, 1800);
  }

  function dismissHint() {
    const hint = document.getElementById('onboarding-hint');
    hint.classList.add('hint-out');
    setTimeout(() => { hint.hidden = true; }, 280);
    localStorage.setItem(HINT_KEY, '1');
  }

  // ── System accordion sections ──
  function renderSystemSections() {
    const systems   = [...new Set(GUIDELINES.flatMap(g => Array.isArray(g.system) ? g.system : [g.system]))].sort();
    const container = document.getElementById('systems-list');
    const totalEl   = document.getElementById('guidelines-total');
    if (totalEl) totalEl.textContent = GUIDELINES.length;

    container.innerHTML = `
      <div class="browse-layout">
        <aside class="system-sidebar" id="system-sidebar">
          ${systems.map((sys, i) => {
            const count = GUIDELINES.filter(g => Array.isArray(g.system) ? g.system.includes(sys) : g.system === sys).length;
            return `<button class="sidebar-item${i === 0 ? ' is-active' : ''}" data-system="${sys}">
              <span class="sidebar-name">${sys}</span>
              <span class="sidebar-count">${count}</span>
            </button>`;
          }).join('')}
        </aside>
        <div class="browse-main">
          <div class="browse-heading">
            <span class="browse-system-name" id="browse-system-name"></span>
            <span class="strip-count" id="browse-system-count"></span>
          </div>
          <div class="card-grid is-entering" id="browse-grid" role="list"></div>
        </div>
      </div>
    `;

    loadSystem(systems[0]);

    container.querySelectorAll('.sidebar-item').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        loadSystem(btn.dataset.system);
        closeSysSheet();
      });
    });

    // Populate bottom-sheet list
    const sheetList = document.getElementById('sys-sheet-list');
    if (sheetList) {
      sheetList.innerHTML = systems.map(sys => {
        const count = GUIDELINES.filter(g => Array.isArray(g.system) ? g.system.includes(sys) : g.system === sys).length;
        return `<button class="sys-sheet-item" data-system="${sys}">
          <span class="sys-sheet-name">${sys}</span>
          <span class="sys-sheet-count">${count}</span>
        </button>`;
      }).join('');
      sheetList.querySelectorAll('.sys-sheet-item').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.sidebar-item').forEach(b => b.classList.toggle('is-active', b.dataset.system === btn.dataset.system));
          loadSystem(btn.dataset.system);
          closeSysSheet();
        });
      });
    }

    setupSysFloatObserver();
  }

  function setupSysFloatObserver() {
    const sidebar = document.getElementById('system-sidebar');
    if (!sidebar) return;
    const observer = new IntersectionObserver(entries => {
      sidebarInView = entries[0].isIntersecting;
      syncSysFloatBtn();
    }, { threshold: 0 });
    observer.observe(sidebar);
  }

  function syncSysFloatBtn() {
    const floatBtn = document.getElementById('sys-float-btn');
    if (!floatBtn) return;
    const browsing = !document.getElementById('systems-section').hidden;
    floatBtn.hidden = !browsing || sidebarInView;
  }

  function openSysSheet() {
    const overlay = document.getElementById('sys-sheet-overlay');
    if (!overlay) return;
    const sheet = document.getElementById('sys-sheet');
    sheet.style.transform = '';
    sheet.style.opacity   = '';
    sheet.classList.remove('dismissing');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('active'));
    document.querySelectorAll('.sys-sheet-item').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.system === currentSystem);
    });
    const activeItem = overlay.querySelector('.sys-sheet-item.is-active');
    if (activeItem) setTimeout(() => activeItem.scrollIntoView({ block: 'nearest' }), 50);
  }

  function closeSysSheet() {
    const overlay = document.getElementById('sys-sheet-overlay');
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove('active');
    setTimeout(() => { overlay.hidden = true; }, 280);
  }

  function loadSystem(sys) {
    currentSystem = sys;
    const norm  = s => s.replace(/&amp;/g, '&');
    const items = GUIDELINES.filter(g => {
      const s = Array.isArray(g.system) ? g.system : [g.system];
      return s.some(x => norm(x) === norm(sys));
    });
    const nameEl  = document.getElementById('browse-system-name');
    const countEl = document.getElementById('browse-system-count');
    if (nameEl)  nameEl.innerHTML = sys;
    if (countEl) countEl.textContent = items.length;
    renderCards(items, document.getElementById('browse-grid'));
    const browseHeading = document.querySelector('.browse-heading');
    const controls = document.querySelector('.controls');
    if (browseHeading) {
      const offset = controls ? controls.offsetHeight : 0;
      const top = browseHeading.getBoundingClientRect().top + window.scrollY - offset - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    const floatLabel = document.getElementById('sys-float-label');
    if (floatLabel) floatLabel.textContent = norm(sys);
  }

  // ── Filter + search ──
  function fadeIn(el) {
    el.hidden = false;
    el.classList.remove('view-enter');
    void el.offsetWidth;
    el.classList.add('view-enter');
  }

  function filterAndSearch() {
    const searchResults  = document.getElementById('search-results');
    const systemsSection = document.getElementById('systems-section');

    if (!searchQuery) {
      searchResults.hidden = true;
      fadeIn(systemsSection);
      syncSysFloatBtn();
      return;
    }

    const q        = searchQuery.toLowerCase();
    const tokens   = q.split(/\s+/).filter(Boolean);
    const expanded = tokens.map(t => ALIASES[t] || t);
    const aliasNote = tokens
      .map((t, i) => expanded[i] !== t ? `"${expanded[i]}"` : null)
      .filter(Boolean).join(', ');
    // All tokens must appear across the provided field array (AND logic)
    const hit = fields => expanded.every(t => fields.some(f => f.includes(t)));

    const countEl = document.getElementById('results-count');
    const gridEl  = document.getElementById('search-grid');
    systemsSection.hidden = true;
    fadeIn(searchResults);
    syncSysFloatBtn();

    if (searchMode === 'guidelines') {
      const results = GUIDELINES.filter(g => hit([
        g.title.toLowerCase(),
        g.subtitle.toLowerCase(),
        (Array.isArray(g.system) ? g.system.join(' ') : g.system).toLowerCase(),
        g.nice_ref.toLowerCase(),
        (g.searchAliases || []).join(' ').toLowerCase()
      ]));
      const base = `${results.length} guideline${results.length !== 1 ? 's' : ''}`;
      countEl.textContent = aliasNote ? `${base} — searching ${aliasNote}` : base;
      renderCards(results, gridEl, expanded);
    } else {
      if (!contentIndex) buildContentIndex();
      const results        = [];
      const matchedTabsMap = new Map();
      GUIDELINES.forEach((g, i) => {
        const entry = contentIndex[i];
        const tabs  = Object.entries(entry)
          .filter(([, text]) => hit([text]))
          .map(([field]) => CONTENT_TAB_LABELS[field] || field);
        const titleMatch = hit([g.title.toLowerCase(), g.subtitle.toLowerCase()]);
        if (tabs.length || titleMatch) {
          results.push(g);
          matchedTabsMap.set(g.id, tabs);
        }
      });
      const base = `${results.length} guideline${results.length !== 1 ? 's' : ''}`;
      countEl.textContent = aliasNote ? `${base} — searching ${aliasNote}` : base;
      renderCards(results, gridEl, expanded, matchedTabsMap);
    }
  }

  // ── Open modal ──
  function openModal(id) {
    const g = GUIDELINES.find(g => g.id === id);
    if (!g) return;
    currentCardId   = id;
    lastFocusedCard = document.querySelector(`.card[data-id="${id}"]`);

    document.getElementById('modal-title').innerHTML = g.title;

    const modalRef = document.getElementById('modal-ref');
    if (g.overview) {
      modalRef.textContent = 'Labs';
      modalRef.removeAttribute('href');
    } else if (g.source_url) {
      modalRef.textContent = g.nice_ref;
      modalRef.href = g.source_url;
    } else if (g.nice_ref === 'CKS') {
      modalRef.textContent = 'CKS';
      modalRef.href = `https://cks.nice.org.uk/topics/${g.cks_slug}/`;
    } else {
      modalRef.textContent = g.nice_ref;
      modalRef.href = `https://www.nice.org.uk/guidance/${g.nice_ref.toLowerCase()}`;
    }
    document.getElementById('modal-updated').textContent = g.updated ? `Updated: ${g.updated}` : '';
    document.getElementById('modal-system').innerHTML = Array.isArray(g.system) ? g.system.join(' · ') : g.system;

    // Populate and show/hide registered tabs in one pass
    TAB_REGISTRY.forEach(({ key, id }) => {
      const panel = document.getElementById(`tab-${id}`);
      const btn   = document.getElementById(`modal-tab-${id}`);
      if (panel) panel.innerHTML = g[key] || '';
      if (btn)   btn.style.display = g[key] ? '' : 'none';
    });

    // Standard tabs (no explicit id — always present, hidden for lab/imm cards)
    ['diagnosis', 'management', 'referral', 'monitoring'].forEach(tab => {
      document.getElementById(`tab-${tab}`).innerHTML = g[tab] || '';
    });

    const isLabCard = !!g.overview;
    const isImmCard = !!g.schedule;
    document.querySelector('.modal-tab[data-tab="diagnosis"]').style.display  = (isLabCard || isImmCard) ? 'none' : '';
    document.querySelector('.modal-tab[data-tab="management"]').style.display = (isLabCard || isImmCard) ? 'none' : '';
    document.querySelector('.modal-tab[data-tab="referral"]').style.display   = isImmCard ? 'none' : '';
    document.querySelector('.modal-tab[data-tab="monitoring"]').style.display = isImmCard ? 'none' : '';

    const defaultTabLabels = { diagnosis: 'Diagnosis', investigations: 'Investigations', management: 'Management', referral: 'Referral', monitoring: 'Monitoring' };
    const resolvedLabels = Object.assign({}, defaultTabLabels, g.tabLabels || {});
    Object.entries(resolvedLabels).forEach(([tab, label]) => {
      const btn = document.querySelector(`.modal-tab[data-tab="${tab}"]`);
      if (btn) btn.textContent = label;
    });

    const hasLeaflet = !!g.leaflet;
    const hasPatientLinks = !!(g.patientLinks && g.patientLinks.length);
    const hasResources = hasLeaflet || hasPatientLinks;

    document.getElementById('modal-tab-resources').style.display = hasResources ? '' : 'none';

    if (hasResources) {
      const leafletHtml = hasLeaflet
        ? `<button class="patient-link patient-link--leaflet" data-leaflet-id="${g.id}">Patient Leaflet &#8599;</button>`
        : '';
      const externalLinksHtml = hasPatientLinks
        ? g.patientLinks.map(l =>
            `<a class="patient-link" href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label} &#8599;</a>`
          ).join('')
        : '';
      const resourcesTab = document.getElementById('tab-resources');
      resourcesTab.innerHTML = `<div class="resources-list">${leafletHtml}${externalLinksHtml}</div>`;

      if (hasLeaflet) {
        resourcesTab.querySelector('[data-leaflet-id]').addEventListener('click', function () {
          openLeaflet(g);
        });
      }
    }

    switchTab(g.schedule ? 'schedule' : (g.overview ? 'overview' : 'diagnosis'));

    document.querySelectorAll('.tab-panel table').forEach(table => {
      if (table.closest('.table-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });

    saveRecentlyViewed(id);

    const overlay = document.getElementById('modal-overlay');
    const mb = document.querySelector('.modal-box');
    mb.classList.remove('closing');
    mb.style.animation = 'none';
    void mb.offsetWidth; // force reflow so modal-in restarts from frame 0
    mb.style.animation = '';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    history.pushState({ medaxisModal: true, cardId: id }, '', '?card=' + id);
    modalHistoryPushed = true;
    document.title = g.title.replace(/&amp;/g, '&') + ' — Medaxis';

    requestAnimationFrame(() => {
      document.getElementById('modal-close').focus();
    });
  }

  // ── Switch tab ──
  const WIDE_TABS = ['hrt', 'inhalers', 'insulins', 'drugs', 'steroids', 'ftu'];
  function switchTab(tabName, dir) {
    document.querySelectorAll('.modal-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tabName)
    );
    document.querySelectorAll('.tab-panel').forEach(p => {
      const isActive = p.id === `tab-${tabName}`;
      p.classList.toggle('active', isActive);
      p.classList.remove('tab-dir-forward', 'tab-dir-back');
      if (isActive && dir) p.classList.add(dir === 'forward' ? 'tab-dir-forward' : 'tab-dir-back');
    });
    const modalBox = document.querySelector('.modal-box');
    if (modalBox) modalBox.classList.toggle('modal-box--wide', WIDE_TABS.includes(tabName));
    const content = document.querySelector('.modal-content');
    if (content) content.scrollTop = 0;
    const activeTabEl = document.querySelector(`.modal-tab[data-tab="${tabName}"]`);
    if (activeTabEl) {
      activeTabEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      activeTabEl.focus({ preventScroll: true });
    }
  }

  // ── Close modal ──
  function closeModal(fromPopstate) {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay.classList.contains('active')) return;
    overlay.classList.remove('active'); // backdrop fades out via CSS transition
    document.body.style.overflow = '';
    const mb = document.querySelector('.modal-box');
    const isMobileDismiss = mb && mb.classList.contains('dismissing');
    if (mb && !isMobileDismiss) mb.classList.add('closing');
    setTimeout(() => {
      if (mb) { mb.style.transform = ''; mb.style.opacity = ''; mb.classList.remove('closing', 'dragging', 'dismissing'); }
    }, isMobileDismiss ? 200 : 160);
    if (lastFocusedCard) { lastFocusedCard.focus({ preventScroll: true }); lastFocusedCard = null; }
    const findBar = document.getElementById('modal-find-bar');
    if (findBar && !findBar.hidden) document.getElementById('find-close').click();
    document.title = 'Medaxis';
    if (modalHistoryPushed && !fromPopstate) {
      modalHistoryPushed = false;
      history.back();
    } else {
      modalHistoryPushed = false;
    }
  }

  // ── CKD Staging Calculator ──
  function calcCKDStage() {
    const egfrEl   = document.getElementById('calc-egfr');
    const acrEl    = document.getElementById('calc-acr');
    const resultEl = document.getElementById('ckd-calc-result');
    if (!egfrEl || !acrEl || !resultEl) return;

    const egfr = parseFloat(egfrEl.value);
    const acr  = parseFloat(acrEl.value);
    if (isNaN(egfr) || isNaN(acr) || egfr <= 0 || acr < 0) {
      resultEl.classList.remove('ckd-result-active');
      return;
    }

    let gCat;
    if      (egfr >= 90) gCat = 'G1';
    else if (egfr >= 60) gCat = 'G2';
    else if (egfr >= 45) gCat = 'G3a';
    else if (egfr >= 30) gCat = 'G3b';
    else if (egfr >= 15) gCat = 'G4';
    else                 gCat = 'G5';

    let aCat;
    if      (acr <  3)  aCat = 'A1';
    else if (acr <= 30) aCat = 'A2';
    else                aCat = 'A3';

    const riskMap = {
      G1:  { A1: 'Low',                  A2: 'Moderately increased', A3: 'High'      },
      G2:  { A1: 'Low',                  A2: 'Moderately increased', A3: 'High'      },
      G3a: { A1: 'Moderately increased', A2: 'High',                 A3: 'Very high' },
      G3b: { A1: 'High',                 A2: 'Very high',            A3: 'Very high' },
      G4:  { A1: 'Very high',            A2: 'Very high',            A3: 'Very high' },
      G5:  { A1: 'Very high',            A2: 'Very high',            A3: 'Very high' },
    };
    const risk = riskMap[gCat][aCat];

    const riskClass = {
      'Low':                  'ckd-risk--low',
      'Moderately increased': 'ckd-risk--mod',
      'High':                 'ckd-risk--high',
      'Very high':            'ckd-risk--very-high',
    }[risk];

    const monFreq = {
      G1:  { A1: '≤1 per year', A2: '1 per year',       A3: '2 per year'       },
      G2:  { A1: '≤1 per year', A2: '1 per year',       A3: '2 per year'       },
      G3a: { A1: '1 per year',       A2: '2 per year',       A3: '3 per year'       },
      G3b: { A1: '2 per year',       A2: '3 per year',       A3: '≥3 per year' },
      G4:  { A1: '3 per year',       A2: '3 per year',       A3: '≥4 per year' },
      G5:  { A1: '≥4 per year', A2: '≥4 per year', A3: '≥4 per year' },
    }[gCat][aCat];

    const t2dm = (document.getElementById('calc-t2dm') || {}).value || '';
    const highACR = acr >= 22.6;
    const hasDM   = t2dm === 'yes';
    const dmKnown = t2dm !== '';

    let sglt2Text, sglt2Warn = false;
    if (egfr > 90 || egfr < 20) {
      sglt2Text = egfr < 20 ? 'Not recommended — eGFR <20' : 'Not recommended — eGFR >90';
      sglt2Warn = true;
    } else if (egfr < 45) {
      sglt2Text = 'Eligible — eGFR 20–<45 (no additional criteria)';
    } else {
      // eGFR 45–90: TA1075 (dapagliflozin) and TA942 (empagliflozin) both require uACR ≥22.6 OR T2DM
      if (highACR)      { sglt2Text = 'Eligible — uACR ≥22.6 mg/mmol'; }
      else if (hasDM)   { sglt2Text = 'Eligible — type 2 diabetes'; }
      else if (!dmKnown){ sglt2Text = 'Eligible if uACR ≥22.6 or T2DM'; }
      else              { sglt2Text = 'Not eligible — uACR <22.6, no T2DM'; sglt2Warn = true; }
    }

    const flags = [];
    if (acr >= 70) {
      flags.push({ cls: 'ckd-calc-flag', text: 'ACR ≥70 mg/mmol — refer to nephrology (unless diabetic on optimised ACEi/ARB)' });
    }
    if (gCat === 'G5') {
      flags.push({ cls: 'ckd-calc-flag', text: 'G5 CKD — discuss renal replacement therapy planning with nephrology' });
    }
    if (acr >= 3 && acr < 70) {
      flags.push({ cls: 'ckd-calc-note', text: acr > 30
        ? 'ACR >30 mg/mmol — offer ACEi/ARB if hypertension (titrate to highest tolerated dose)'
        : 'ACR ≥3 mg/mmol — offer ACEi/ARB if hypertension + diabetes' });
    }

    resultEl.innerHTML =
      `<div class="ckd-result-top">
        <div class="ckd-stage-badges">
          <span class="ckd-stage-badge">${gCat}</span>
          <span class="ckd-stage-sep">&nbsp;&middot;&nbsp;</span>
          <span class="ckd-stage-badge">${aCat}</span>
        </div>
        <div class="ckd-risk-pill ${riskClass}">${risk}</div>
      </div>
      <div class="ckd-meta-grid">
        <div class="ckd-meta-item">
          <span class="ckd-meta-label">eGFR checks</span>
          <span class="ckd-meta-value">${monFreq}</span>
        </div>
        <div class="ckd-meta-item">
          <span class="ckd-meta-label">SGLT2i (TA1075 / TA942)</span>
          <span class="ckd-meta-value${sglt2Warn ? ' ckd-meta-warn' : ''}">${sglt2Text}</span>
        </div>
      </div>` +
      flags.map(f => `<div class="${f.cls}">${f.text}</div>`).join('');

    resultEl.classList.add('ckd-result-active');
  }

  // ── FRAX Threshold Checker ──
  function calcFRAX() {
    const ageEl    = document.getElementById('frax-age');
    const scoreEl  = document.getElementById('frax-score');
    const resultEl = document.getElementById('frax-result');
    if (!ageEl || !resultEl) return;

    const age = parseFloat(ageEl.value);
    if (isNaN(age) || age < 40 || age > 90) {
      resultEl.classList.remove('frax-result-active');
      return;
    }

    // NOGG 2017 thresholds — women, major osteoporotic fracture, BMI 25
    const pts = [
      { age: 40, lo: 2.6, up: 7.1, iv: 5.9 },
      { age: 45, lo: 2.7, up: 7.2, iv: 6.0 },
      { age: 50, lo: 3.4, up: 8.6, iv: 7.2 },
      { age: 55, lo: 4.5, up: 11,  iv: 9.4 },
      { age: 60, lo: 5.9, up: 14,  iv: 12  },
      { age: 65, lo: 8.4, up: 19,  iv: 16  },
      { age: 70, lo: 11,  up: 24,  iv: 20  },
    ];

    let t;
    if (age <= 40) {
      t = pts[0];
    } else if (age >= 70) {
      t = pts[pts.length - 1];
    } else {
      let a, b;
      for (let i = 0; i < pts.length - 1; i++) {
        if (age >= pts[i].age && age < pts[i + 1].age) { a = pts[i]; b = pts[i + 1]; break; }
      }
      const f = (age - a.age) / (b.age - a.age);
      t = { lo: a.lo + f * (b.lo - a.lo), up: a.up + f * (b.up - a.up), iv: a.iv + f * (b.iv - a.iv) };
    }

    const fmt = v => {
      const r = Math.round(v * 10) / 10;
      return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + '%';
    };

    const thresholdsHTML =
      `<div class="frax-threshold-grid">
        <div class="frax-threshold-item">
          <span class="frax-threshold-label">Lower assessment</span>
          <span class="frax-threshold-value">${fmt(t.lo)}</span>
          <span class="frax-threshold-sub">below → reassure</span>
        </div>
        <div class="frax-threshold-item frax-threshold-item--iv">
          <span class="frax-threshold-label">Intervention (with BMD)</span>
          <span class="frax-threshold-value">${fmt(t.iv)}</span>
          <span class="frax-threshold-sub">treat if FRAX+BMD exceeds</span>
        </div>
        <div class="frax-threshold-item frax-threshold-item--up">
          <span class="frax-threshold-label">Upper assessment</span>
          <span class="frax-threshold-value">${fmt(t.up)}</span>
          <span class="frax-threshold-sub">above → treat without DXA</span>
        </div>
      </div>`;

    const score = scoreEl ? parseFloat(scoreEl.value) : NaN;
    let zoneHTML = '';
    if (!isNaN(score) && score >= 0) {
      let category, rec, cls;
      if (score >= t.up) {
        category = 'Above upper threshold';
        rec      = 'Offer drug treatment — DXA not required before starting';
        cls      = 'frax-zone--high';
      } else if (score >= t.lo) {
        category = 'Between thresholds';
        rec      = 'Measure BMD by DXA; recalculate FRAX with BMD result, then apply intervention threshold';
        cls      = 'frax-zone--mid';
      } else {
        category = 'Below lower threshold';
        rec      = 'Reassure; address modifiable risk factors; no DXA required routinely';
        cls      = 'frax-zone--low';
      }
      zoneHTML =
        `<div class="frax-zone ${cls}">
          <div class="frax-zone-top">
            <span class="frax-zone-score">${score % 1 === 0 ? score.toFixed(0) : score.toFixed(1)}%</span>
            <span class="frax-zone-sep">·</span>
            <span class="frax-zone-category">${category}</span>
          </div>
          <div class="frax-zone-rec">${rec}</div>
        </div>`;
    }

    const caveatsHTML =
      `<p class="frax-caveats">Prior hip or vertebral fracture → treat regardless of FRAX score · glucocorticoids &gt;7.5&nbsp;mg/day may cause underestimation · men have lower NOGG thresholds — use FRAX tool for individual assessment</p>`;

    resultEl.innerHTML = thresholdsHTML + zoneHTML + caveatsHTML;
    resultEl.classList.add('frax-result-active');
  }

  // ── CrCl (Cockcroft-Gault) Calculator ──
  function calcCrCl() {
    const ageEl = document.getElementById('crcl-age');
    const wtEl  = document.getElementById('crcl-weight');
    const crEl  = document.getElementById('crcl-creatinine');
    const sexEl = document.querySelector('input[name="crcl-sex"]:checked');
    const resEl = document.getElementById('crcl-result');
    if (!ageEl || !wtEl || !crEl || !resEl) return;

    const age = parseFloat(ageEl.value);
    const wt  = parseFloat(wtEl.value);
    const cr  = parseFloat(crEl.value);
    const sex = sexEl ? sexEl.value : null;

    if (!sex || isNaN(age) || isNaN(wt) || isNaN(cr) || age < 18 || age > 120 || wt <= 0 || cr <= 0) {
      resEl.classList.remove('crcl-result-active');
      return;
    }

    const context = (ageEl.closest('.crcl-calc') || {}).dataset?.context || '';
    const K     = sex === 'male' ? 1.23 : 1.04;
    const crcl  = ((140 - age) * wt * K) / cr;
    const crclR = Math.round(crcl * 10) / 10;

    let band, bandCls;
    if      (crcl >= 90) { band = 'Normal / High';          bandCls = 'crcl-band--normal';   }
    else if (crcl >= 60) { band = 'Mildly reduced';         bandCls = 'crcl-band--mild';      }
    else if (crcl >= 30) { band = 'Moderately reduced';     bandCls = 'crcl-band--moderate';  }
    else if (crcl >= 15) { band = 'Severely reduced';       bandCls = 'crcl-band--severe';    }
    else                 { band = 'Very severely reduced';   bandCls = 'crcl-band--failure';   }

    const doacs = [
      { name: 'Apixaban', fn: () => {
          if (crcl < 15) return ['Avoid (CrCl &lt;15)', 'crcl-drug--avoid'];
          const hits = [age >= 80, wt <= 60, cr >= 133].filter(Boolean).length;
          return (hits >= 2 || crcl < 30)
            ? ['2.5 mg BD &#x25bc; (dose reduced)', 'crcl-drug--reduce']
            : ['5 mg BD (standard)', ''];
      }},
      { name: 'Dabigatran', fn: () => {
          if (crcl < 30) return ['Contraindicated (CrCl &lt;30)', 'crcl-drug--avoid'];
          if (age >= 80)        return ['110 mg BD &#x25bc; (age &ge;80)', 'crcl-drug--reduce'];
          if (crcl < 50)        return ['110 mg BD &#x25bc; (CrCl 30&ndash;49)', 'crcl-drug--reduce'];
          if (age >= 75)        return ['110&ndash;150 mg BD &#x25bc; (age 75&ndash;79)', 'crcl-drug--reduce'];
          return ['150 mg BD (standard)', ''];
      }},
      { name: 'Edoxaban', fn: () => {
          if (crcl < 15) return ['Contraindicated (CrCl &lt;15)', 'crcl-drug--avoid'];
          return (crcl <= 50 || wt <= 60)
            ? ['30 mg OD &#x25bc; (CrCl 15&ndash;50 or wt &le;60 kg)', 'crcl-drug--reduce']
            : ['60 mg OD (standard)', ''];
      }},
      { name: 'Rivaroxaban', fn: () => {
          if (crcl < 15) return ['Contraindicated (CrCl &lt;15)', 'crcl-drug--avoid'];
          return crcl < 50
            ? ['15 mg OD &#x25bc; (CrCl 15&ndash;49)', 'crcl-drug--reduce']
            : ['20 mg OD with food (standard)', ''];
      }},
    ];

    const doacRows = doacs.map(d => {
      const [dose, cls] = d.fn();
      return `<tr><td><strong>${d.name}</strong></td><td class="${cls}">${dose}</td></tr>`;
    }).join('');

    const flags = [];
    if (context !== 'af') {
      if (crcl < 45) flags.push('Metformin: reduce dose if CrCl 30&ndash;44; avoid if CrCl &lt;30');
      if (crcl < 30) flags.push('Morphine / oxycodone: avoid — active metabolites accumulate');
      if (crcl < 30) flags.push('Tramadol: avoid — seizure risk from O-desmethyltramadol accumulation');
      if (crcl < 30) flags.push('Codeine: avoid — morphine metabolites accumulate');
      if (crcl < 10) flags.push('Most renally-cleared drugs require specialist dose guidance at this level');
    }

    resEl.innerHTML =
      `<div class="crcl-result-main">
        <div class="crcl-value">${crclR > 0 ? crclR : '&lt;1'}<span class="crcl-unit"> mL/min</span></div>
        <div class="crcl-band ${bandCls}">${band}</div>
      </div>
      <table class="crcl-doac-table">
        <thead><tr><th>DOAC (AF stroke prevention)</th><th>Dose at this CrCl</th></tr></thead>
        <tbody>${doacRows}</tbody>
      </table>` +
      flags.map(f => `<div class="ckd-calc-flag">${f}</div>`).join('') +
      `<p class="crcl-caveat">Cockcroft-Gault using actual body weight &middot; DOAC doses for non-valvular AF — check SPC for other indications &middot; Apixaban dose reduction based on age/weight/creatinine criteria (see DOAC Reference tab) &middot; Always verify against current BNF/SPC</p>`;

    resEl.classList.add('crcl-result-active');
  }

  // ── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    renderSystemSections();
    renderRecentlyViewed();
    renderFavourites();
    showOnboardingHint();
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');

    const deepCard = new URLSearchParams(location.search).get('card');
    if (deepCard) {
      history.replaceState(null, '', location.pathname);
      openModal(deepCard);
    }

    // Dark mode
    // Font size
    const FONT_SCALES = [0.88, 1, 1.15];
    const FONT_LABELS = ['Small', 'Default', 'Large'];
    const fontSizeBtn = document.getElementById('font-size-btn');
    function applyFontScale(idx) {
      document.documentElement.style.setProperty('--font-scale', FONT_SCALES[idx]);
      fontSizeBtn.setAttribute('aria-label', `Text size: ${FONT_LABELS[idx]}`);
      fontSizeBtn.dataset.scale = idx;
      localStorage.setItem('medaxis-font-scale', idx);
    }
    applyFontScale(parseInt(localStorage.getItem('medaxis-font-scale') ?? '1'));
    fontSizeBtn.addEventListener('click', () => {
      applyFontScale((parseInt(fontSizeBtn.dataset.scale) + 1) % FONT_SCALES.length);
    });

    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (dark) => {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.querySelector('.theme-icon--moon').style.display = dark ? 'none' : '';
      themeToggle.querySelector('.theme-icon--sun').style.display  = dark ? '' : 'none';
    };
    const savedDark = localStorage.getItem('medaxis-theme') === 'dark';
    applyTheme(savedDark);
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      localStorage.setItem('medaxis-theme', isDark ? 'light' : 'dark');
      applyTheme(!isDark);
    });

    // Floating system picker
    document.getElementById('sys-float-btn').addEventListener('click', openSysSheet);
    document.getElementById('sys-sheet-close').addEventListener('click', closeSysSheet);
    document.getElementById('sys-sheet-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeSysSheet();
    });

    // Drag-to-dismiss for system sheet (header zone only)
    const sysSheet = document.getElementById('sys-sheet');
    let sysDragZone   = false;
    let sysDragActive = false;
    let sysStartY     = 0;
    let sysLastY      = 0;
    let sysLastT      = 0;
    let sysVelY       = 0;

    sysSheet.addEventListener('touchstart', e => {
      sysStartY     = e.touches[0].clientY;
      sysLastY      = sysStartY;
      sysLastT      = Date.now();
      sysVelY       = 0;
      sysDragActive = false;
      sysDragZone   = !!e.target.closest('.sys-sheet-handle, .sys-sheet-header');
    }, { passive: true });

    sysSheet.addEventListener('touchmove', e => {
      const dy  = e.touches[0].clientY - sysStartY;
      const now = Date.now();
      const dt  = now - sysLastT;
      if (dt > 0) sysVelY = (e.touches[0].clientY - sysLastY) / dt;
      sysLastY = e.touches[0].clientY;
      sysLastT = now;

      if (sysDragActive) {
        e.preventDefault();
        const clamped = Math.max(0, dy);
        sysSheet.style.transform = `translateY(${clamped}px)`;
        sysSheet.style.opacity   = Math.max(0, 1 - clamped / 300).toFixed(3);
        return;
      }
      if (!sysDragZone) return;
      if (dy > 10) {
        e.preventDefault();
        sysDragActive = true;
        sysSheet.classList.add('dragging');
        sysSheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
      }
    }, { passive: false });

    sysSheet.addEventListener('touchend', e => {
      if (!sysDragActive) return;
      sysSheet.classList.remove('dragging');
      const dy           = e.changedTouches[0].clientY - sysStartY;
      const shouldDismiss = dy > 80 || (dy > 20 && sysVelY > 0.4);
      if (shouldDismiss) {
        sysSheet.classList.add('dismissing');
        sysSheet.style.transform = 'translateY(105%)';
        sysSheet.style.opacity   = '0';
        setTimeout(closeSysSheet, 220);
      } else {
        sysSheet.style.transform = '';
        sysSheet.style.opacity   = '';
      }
      sysDragActive = false;
    }, { passive: true });



    // Search mode toggle
    const modeIndicator = document.querySelector('.mode-indicator');
    function positionModeIndicator(activeBtn) {
      modeIndicator.style.width     = activeBtn.offsetWidth  + 'px';
      modeIndicator.style.transform = 'translateX(' + activeBtn.offsetLeft + 'px)';
    }
    positionModeIndicator(document.querySelector('.mode-btn--active'));

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        searchMode = btn.dataset.mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('mode-btn--active', b === btn));
        positionModeIndicator(btn);
        const input = document.getElementById('search-input');
        input.placeholder = searchMode === 'guidelines' ? 'Search guidelines…' : 'Search card content…';
        input.setAttribute('aria-label', searchMode === 'guidelines' ? 'Search guidelines' : 'Search card content');
        if (searchQuery) filterAndSearch();
      });
    });

    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      e.target.closest('.search-wrap').classList.toggle('has-value', !!e.target.value);
      filterAndSearch();
    });

    document.getElementById('search-clear').addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      searchInput.closest('.search-wrap').classList.remove('has-value');
      searchInput.focus();
      filterAndSearch();
    });

    // Guideline modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Swipe (tabs) + drag-to-dismiss on mobile
    let swipeStartX       = 0;
    let swipeStartY       = 0;
    let swipeFired        = false;
    let dragDismiss       = false;
    let dragZone          = false;
    let inScrollableTable = false;
    let touchLastY        = 0;
    let touchLastT        = 0;
    let touchVelY         = 0;
    const DISMISS_PX  = 72;
    const DISMISS_VEL = 0.35; // px/ms — flick threshold
    const modalBox     = document.querySelector('.modal-box');
    const modalContent = document.querySelector('.modal-content');
    const modalOverlay = document.getElementById('modal-overlay');

    modalBox.addEventListener('touchstart', e => {
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
      touchLastY  = swipeStartY;
      touchLastT  = Date.now();
      touchVelY   = 0;
      swipeFired  = false;
      dragDismiss = false;
      // Drag zone: handle/header always; content area when scrolled to top
      dragZone = !!e.target.closest('.modal-drag-handle, .modal-header') ||
                 (!e.target.closest('.modal-content') || modalContent.scrollTop === 0);
      const wrap = e.target.closest('.table-wrap');
      inScrollableTable = !!wrap && wrap.scrollWidth > wrap.clientWidth;
      if (dragZone) modalBox.style.animation = 'none';
    }, { passive: true });

    modalBox.addEventListener('touchmove', e => {
      const dx  = e.touches[0].clientX - swipeStartX;
      const dy  = e.touches[0].clientY - swipeStartY;
      const now = Date.now();
      const dt  = now - touchLastT;
      if (dt > 0) touchVelY = (e.touches[0].clientY - touchLastY) / dt;
      touchLastY = e.touches[0].clientY;
      touchLastT = now;

      if (dragDismiss) {
        e.preventDefault();
        const clamped = Math.max(0, dy);
        modalBox.style.transform = `translateY(${clamped}px)`;
        modalBox.style.opacity   = Math.max(0, 1 - clamped / 320).toFixed(3);
        // Fade overlay proportionally
        const progress = Math.min(1, clamped / 300);
        modalOverlay.style.background = `rgba(15, 23, 42, ${(0.35 * (1 - progress * 0.85)).toFixed(3)})`;
        return;
      }
      if (swipeFired) return;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

      if (dy > 0 && dy > Math.abs(dx) * 1.2 && dragZone) {
        e.preventDefault();
        dragDismiss = true;
        modalBox.classList.add('dragging');
        modalBox.style.transform = `translateY(${Math.max(0, dy)}px)`;
      } else if (!inScrollableTable && Math.abs(dx) >= 40 && Math.abs(dx) >= Math.abs(dy) * 1.5) {
        swipeFired = true;
        const visibleTabs = Array.from(document.querySelectorAll('.modal-tab'))
          .filter(t => t.style.display !== 'none');
        const activeTab = document.querySelector('.modal-tab.active');
        const idx = visibleTabs.indexOf(activeTab);
        if (dx < 0 && idx < visibleTabs.length - 1) switchTab(visibleTabs[idx + 1].dataset.tab, 'forward');
        else if (dx > 0 && idx > 0) switchTab(visibleTabs[idx - 1].dataset.tab, 'back');
      }
    }, { passive: false });

    modalBox.addEventListener('touchend', e => {
      if (!dragDismiss) return;
      modalBox.classList.remove('dragging');
      const dy = e.changedTouches[0].clientY - swipeStartY;
      const shouldDismiss = dy > DISMISS_PX || (dy > 24 && touchVelY > DISMISS_VEL);
      if (shouldDismiss) {
        modalBox.classList.add('dismissing');
        modalBox.style.transform = `translateY(105%)`;
        modalBox.style.opacity   = '0';
        modalOverlay.style.background = '';
        setTimeout(() => closeModal(), 240);
      } else {
        // Spring snap-back
        modalBox.classList.add('snapping-back');
        modalBox.style.transform = '';
        modalBox.style.opacity   = '';
        modalOverlay.style.background = '';
        modalBox.addEventListener('transitionend', () => modalBox.classList.remove('snapping-back'), { once: true });
      }
      dragDismiss = false;
    }, { passive: true });

    // CKD staging calculator (event delegation)
    document.getElementById('modal-overlay').addEventListener('input', e => {
      if (e.target.id === 'calc-egfr' || e.target.id === 'calc-acr' || e.target.id === 'calc-t2dm') calcCKDStage();
      if (e.target.id === 'frax-age'  || e.target.id === 'frax-score') calcFRAX();
      if (e.target.closest('.crcl-calc')) calcCrCl();
    });

    // In-tab anchor list scroll handler
    document.getElementById('modal-overlay').addEventListener('click', e => {
      const link = e.target.closest('.anchor-link');
      if (!link) return;
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      const body   = document.querySelector('.modal-content');
      if (!target || !body) return;
      body.scrollTo({ top: target.offsetTop - body.offsetTop - 12, behavior: 'smooth' });
    });

    // Wells score calculators (event delegation)
    document.getElementById('modal-overlay').addEventListener('click', e => {
      const row = e.target.closest('.wells-item');
      if (!row) return;
      const group = row.dataset.group;
      if (group) {
        const wasSelected = row.classList.contains('selected');
        document.querySelectorAll(`.wells-item[data-group="${group}"]`).forEach(r => r.classList.remove('selected'));
        if (!wasSelected) row.classList.add('selected');
      } else {
        row.classList.toggle('selected');
      }
      const calcId = row.dataset.calc;
      const rows   = document.querySelectorAll(`.wells-item[data-calc="${calcId}"]`);
      const score  = Array.from(rows).reduce((sum, r) =>
        r.classList.contains('selected') ? sum + parseFloat(r.dataset.score) : sum, 0
      );
      const valueEl = document.getElementById(`${calcId}-score-value`);
      const riskEl  = document.getElementById(`${calcId}-score-risk`);
      if (!valueEl || !riskEl) return;

      if (calcId === 'gad2') {
        const q1 = document.querySelector('.wells-item[data-group="gad2-q1"].selected');
        const q2 = document.querySelector('.wells-item[data-group="gad2-q2"].selected');
        if (!q1 || !q2) {
          valueEl.textContent = '–';
          riskEl.textContent  = 'Answer both questions';
          riskEl.className    = 'wells-risk';
        } else {
          valueEl.textContent = score;
          if (score >= 3) {
            riskEl.textContent = 'Positive screen — proceed to GAD-7';
            riskEl.className   = 'wells-risk risk-high';
          } else {
            riskEl.textContent = 'Below threshold — GAD unlikely';
            riskEl.className   = 'wells-risk risk-low';
          }
        }
        return;
      }

      if (calcId === 'gad7') {
        const allAnswered = [1,2,3,4,5,6,7].every(n =>
          document.querySelector(`.wells-item[data-group="gad7-q${n}"].selected`)
        );
        if (!allAnswered) {
          valueEl.textContent = '–';
          riskEl.textContent  = 'Answer all 7 questions';
          riskEl.className    = 'wells-risk';
        } else {
          valueEl.textContent = score;
          if      (score >= 15) { riskEl.textContent = 'Severe anxiety — consider Step 3–4, medication'; riskEl.className = 'wells-risk risk-high'; }
          else if (score >= 10) { riskEl.textContent = 'Moderate anxiety — consider Step 2–3 interventions'; riskEl.className = 'wells-risk risk-high'; }
          else if (score >= 5)  { riskEl.textContent = 'Mild anxiety — consider Step 2, self-help'; riskEl.className = 'wells-risk risk-low'; }
          else                  { riskEl.textContent = 'Minimal anxiety'; riskEl.className = 'wells-risk risk-low'; }
        }
        return;
      }

      if (calcId === 'aq10') {
        const allAnswered = [1,2,3,4,5,6,7,8,9,10].every(n =>
          document.querySelector(`.wells-item[data-group="aq10-q${n}"].selected`)
        );
        if (!allAnswered) {
          valueEl.textContent = '–';
          riskEl.textContent  = 'Answer all 10 questions';
          riskEl.className    = 'wells-risk';
        } else {
          valueEl.textContent = score;
          if (score >= 6) {
            riskEl.textContent = 'Positive screen — refer for comprehensive autism assessment';
            riskEl.className   = 'wells-risk risk-high';
          } else {
            riskEl.textContent = 'Below threshold — autism less likely';
            riskEl.className   = 'wells-risk risk-low';
          }
        }
        return;
      }

      if (calcId === 'puqe') {
        const allAnswered = [1,2,3].every(n =>
          document.querySelector(`.wells-item[data-group="puqe-q${n}"].selected`)
        );
        if (!allAnswered) {
          valueEl.textContent = '–';
          riskEl.textContent  = 'Answer all 3 questions';
          riskEl.className    = 'wells-risk';
        } else {
          valueEl.textContent = score;
          if      (score >= 13) { riskEl.textContent = 'Severe — hospital admission threshold'; riskEl.className = 'wells-risk risk-high'; }
          else if (score >= 7)  { riskEl.textContent = 'Moderate — optimise treatment; consider obstetric day unit'; riskEl.className = 'wells-risk risk-high'; }
          else                  { riskEl.textContent = 'Mild — manage in primary care'; riskEl.className = 'wells-risk risk-low'; }
        }
        return;
      }

      valueEl.textContent = score;

      if (calcId === 'dvt-wells') {
        const likely = score >= 2;
        riskEl.textContent = likely ? 'DVT likely' : 'DVT unlikely';
        riskEl.className   = 'wells-risk ' + (likely ? 'risk-high' : 'risk-low');
        const pLikely   = document.getElementById('dvt-pathway-likely');
        const pUnlikely = document.getElementById('dvt-pathway-unlikely');
        if (pLikely && pUnlikely) {
          pLikely.className   = 'pathway-step' + (likely  ? ' pathway-alert'  : '');
          pUnlikely.className = 'pathway-step' + (!likely ? ' pathway-active' : '');
        }
      } else if (calcId === 'pe-wells') {
        const likely = score > 4;
        riskEl.textContent = likely ? 'PE likely' : 'PE unlikely';
        riskEl.className   = 'wells-risk ' + (likely ? 'risk-high' : 'risk-low');
        const pLikely   = document.getElementById('pe-pathway-likely');
        const pUnlikely = document.getElementById('pe-pathway-unlikely');
        if (pLikely && pUnlikely) {
          pLikely.className   = 'pathway-step' + (likely  ? ' pathway-alert'  : '');
          pUnlikely.className = 'pathway-step' + (!likely ? ' pathway-active' : '');
        }
      } else if (calcId === 'chads') {
        if      (score >= 2)  { riskEl.textContent = 'Offer anticoagulation';    riskEl.className = 'wells-risk risk-high'; }
        else if (score === 1) { riskEl.textContent = 'Consider anticoagulation (men) · No treatment (women)'; riskEl.className = 'wells-risk risk-high'; }
        else                  { riskEl.textContent = 'No anticoagulation';       riskEl.className = 'wells-risk risk-low'; }
      } else if (calcId === 'orbit') {
        if      (score >= 4) { riskEl.textContent = 'High risk — correct modifiable factors; do not withhold anticoagulation'; riskEl.className = 'wells-risk risk-high'; }
        else if (score === 3) { riskEl.textContent = 'Medium risk — review and address modifiable risk factors'; riskEl.className = 'wells-risk risk-high'; }
        else                  { riskEl.textContent = 'Low risk'; riskEl.className = 'wells-risk risk-low'; }
      } else if (calcId === 'simon-broome') {
        const cholMet     = !!document.querySelector('.wells-item[data-group="sb-chol"].selected');
        const definiteMet = !!document.querySelector('.wells-item[data-item^="sb-definite"].selected');
        const possibleMet = !!document.querySelector('.wells-item[data-item^="sb-possible"].selected');
        if (!cholMet) {
          valueEl.textContent = '–';
          riskEl.textContent  = 'Cholesterol criteria not met — FH diagnosis not supported by these criteria';
          riskEl.className    = 'wells-risk';
        } else if (definiteMet) {
          valueEl.textContent = 'Definite FH';
          riskEl.textContent  = 'Refer to FH specialist · initiate cascade testing · start high-intensity statin';
          riskEl.className    = 'wells-risk risk-high';
        } else if (possibleMet) {
          valueEl.textContent = 'Possible FH';
          riskEl.textContent  = 'Refer to FH specialist for DNA testing · consider statin';
          riskEl.className    = 'wells-risk risk-high';
        } else {
          valueEl.textContent = '–';
          riskEl.textContent  = 'Cholesterol criteria met — select additional criteria to classify';
          riskEl.className    = 'wells-risk';
        }
        return;
      } else if (calcId === 'centor') {
        const ageRow = document.querySelector('.wells-item[data-group="centor-age"].selected');
        if (!ageRow) {
          valueEl.textContent = '–';
          riskEl.textContent  = 'Select age group to complete the McIsaac score';
          riskEl.className    = 'wells-risk';
          return;
        }
        const prob = score <= 0  ? '~2%'
                   : score === 1 ? '~6%'
                   : score === 2 ? '~12%'
                   : score === 3 ? '~29%'
                   :               '~51%';
        if (score >= 4) {
          riskEl.textContent = `High probability (${prob}) — immediate or back-up antibiotic`;
          riskEl.className   = 'wells-risk risk-high';
        } else if (score === 3) {
          riskEl.textContent = `Moderate probability (${prob}) — consider back-up prescription`;
          riskEl.className   = 'wells-risk risk-high';
        } else {
          riskEl.textContent = `Low probability (${prob}) — no antibiotic`;
          riskEl.className   = 'wells-risk risk-low';
        }
      }
    });

    // ── In-modal find ──
    let findMatches = [];
    let findIndex  = -1;

    function clearFindHighlights() {
      document.querySelectorAll('.tab-panel .find-hl').forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      });
    }

    function highlightInEl(el, query) {
      const marks = [];
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'gi');
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: n => n.parentElement.closest('input,textarea,script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      });
      const textNodes = [];
      let n;
      while ((n = walker.nextNode())) textNodes.push(n);
      textNodes.forEach(node => {
        const text = node.textContent;
        if (!re.test(text)) return;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0, m;
        while ((m = re.exec(text)) !== null) {
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          const mark = document.createElement('mark');
          mark.className = 'find-hl';
          mark.textContent = m[0];
          frag.appendChild(mark);
          marks.push(mark);
          last = re.lastIndex;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
      return marks;
    }

    function runFind(query) {
      clearFindHighlights();
      findMatches = [];
      findIndex   = -1;
      document.getElementById('find-count').textContent = '';
      if (query.length < 2) return;

      document.querySelectorAll('.tab-panel').forEach(panel => {
        const marks = highlightInEl(panel, query);
        marks.forEach(m => m.dataset.tab = panel.id.replace('tab-', ''));
        findMatches.push(...marks);
      });

      if (findMatches.length) {
        stepFind(1);
      } else {
        document.getElementById('find-count').textContent = 'No results';
      }
    }

    function stepFind(dir) {
      if (!findMatches.length) return;
      if (findIndex >= 0) findMatches[findIndex].classList.remove('find-hl--active');
      findIndex = (findIndex + dir + findMatches.length) % findMatches.length;
      const match = findMatches[findIndex];
      match.classList.add('find-hl--active');
      document.getElementById('find-count').textContent = `${findIndex + 1} / ${findMatches.length}`;
      const tabName = match.dataset.tab;
      const activePanel = document.querySelector('.tab-panel.active');
      if (!activePanel || activePanel.id !== `tab-${tabName}`) switchTab(tabName);
      setTimeout(() => match.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
    }

    function openFindBar() {
      document.getElementById('modal-find-bar').hidden = false;
      document.getElementById('modal-find-btn').classList.add('active');
      document.getElementById('find-input').focus();
    }

    function closeFindBar() {
      clearFindHighlights();
      findMatches = [];
      findIndex   = -1;
      document.getElementById('modal-find-bar').hidden = true;
      document.getElementById('modal-find-btn').classList.remove('active');
      document.getElementById('find-input').value = '';
      document.getElementById('find-count').textContent = '';
    }

    document.getElementById('modal-find-btn').addEventListener('click', () => {
      document.getElementById('modal-find-bar').hidden ? openFindBar() : closeFindBar();
    });
    document.getElementById('find-close').addEventListener('click', closeFindBar);
    document.getElementById('find-input').addEventListener('input', e => runFind(e.target.value.trim()));
    document.getElementById('find-prev').addEventListener('click', () => stepFind(-1));
    document.getElementById('find-next').addEventListener('click', () => stepFind(1));
    document.getElementById('find-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); }
      if (e.key === 'Escape') closeFindBar();
    });

    // Cross-card links — <a data-open-card="card-id"> inside any tab panel
    document.querySelector('.modal-content').addEventListener('click', e => {
      const link = e.target.closest('[data-open-card]');
      if (!link) return;
      e.preventDefault();
      openModal(link.dataset.openCard);
    });

    // Back button closes modal instead of navigating away
    window.addEventListener('popstate', () => {
      if (document.getElementById('modal-overlay').classList.contains('active')) {
        modalHistoryPushed = false;
        closeModal(true);
      }
    });

    // Copy link button
    document.getElementById('modal-copy').addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('card', currentCardId);
      const shareUrl = url.toString();

      if (navigator.share && navigator.maxTouchPoints > 0) {
        const title = document.getElementById('modal-title').textContent;
        navigator.share({ title, text: `Medaxis · ${title}`, url: shareUrl })
          .catch(() => {}); // user dismissed share sheet — ignore
        return;
      }

      navigator.clipboard.writeText(shareUrl)
        .then(() => showToast('Link copied'))
        .catch(() => showToast('Copy failed'));
    });

    // Shortcuts overlay (no button — triggered by ? key)
    const shortcutsOverlay = document.getElementById('shortcuts-overlay');
    function openShortcuts()  { shortcutsOverlay.hidden = false; }
    function closeShortcuts() { shortcutsOverlay.hidden = true;  }
    document.getElementById('shortcuts-close').addEventListener('click', closeShortcuts);
    shortcutsOverlay.addEventListener('click', e => { if (e.target === shortcutsOverlay) closeShortcuts(); });

    // Changelog overlay
    const changelogOverlay = document.getElementById('changelog-overlay');
    const changelogSearchWrap  = document.getElementById('changelog-search-wrap');
    const changelogSearchInput = document.getElementById('changelog-search-input');
    const changelogEmpty       = document.getElementById('changelog-empty');

    function openChangelog() {
      const list = document.getElementById('changelog-list');
      list.innerHTML = CHANGELOG.map(entry => {
        const searchText = (entry.date + ' ' + entry.title.replace(/&[^;]+;/g, ' ') + ' ' + (entry.note || '')).toLowerCase();
        return `
        <div class="changelog-entry" data-id="${entry.id}" data-search-text="${searchText.replace(/"/g, '&quot;')}">
          <div class="changelog-row">
            <span class="changelog-date">${entry.date}</span>
            <span class="changelog-card-title" role="button" tabindex="0" title="Open card">${entry.title}</span>
            <button class="changelog-expand" aria-label="Show update details" aria-expanded="false">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div class="changelog-note-wrap">
            <div class="changelog-note-inner">
              <p class="changelog-note">${entry.note}</p>
            </div>
          </div>
        </div>`;
      }).join('');
      list.prepend(changelogEmpty);
      list.querySelectorAll('.changelog-card-title').forEach(el => {
        const open = () => { closeChangelog(); openModal(el.closest('.changelog-entry').dataset.id); };
        el.addEventListener('click', e => { e.stopPropagation(); open(); });
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      });
      list.querySelectorAll('.changelog-expand').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const entry = btn.closest('.changelog-entry');
          const open = entry.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', open);
        });
      });
      changelogSearchWrap.hidden = true;
      changelogSearchInput.value = '';
      changelogEmpty.hidden = true;
      changelogOverlay.hidden = false;
    }

    function closeChangelog() {
      changelogOverlay.hidden = true;
      changelogSearchWrap.hidden = true;
      changelogSearchInput.value = '';
      changelogEmpty.hidden = true;
      document.getElementById('changelog-list').querySelectorAll('.changelog-entry').forEach(el => el.hidden = false);
    }

    function filterChangelog(q) {
      const entries = document.getElementById('changelog-list').querySelectorAll('.changelog-entry');
      let visibleCount = 0;
      entries.forEach(el => {
        const match = !q || el.dataset.searchText.includes(q);
        el.hidden = !match;
        if (match) visibleCount++;
      });
      changelogEmpty.hidden = visibleCount > 0;
    }

    changelogSearchInput.addEventListener('input', () => {
      filterChangelog(changelogSearchInput.value.toLowerCase().trim());
    });

    changelogSearchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (changelogSearchInput.value) {
          changelogSearchInput.value = '';
          filterChangelog('');
        } else {
          changelogSearchWrap.hidden = true;
        }
      }
    });
    document.getElementById('changelog-btn').addEventListener('click', openChangelog);
    document.getElementById('changelog-close').addEventListener('click', closeChangelog);
    changelogOverlay.addEventListener('click', e => { if (e.target === changelogOverlay) closeChangelog(); });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!changelogOverlay.hidden) {
          if (!changelogSearchWrap.hidden && changelogSearchInput.value) {
            changelogSearchInput.value = '';
            filterChangelog('');
          } else {
            closeChangelog();
          }
          return;
        }
        if (!shortcutsOverlay.hidden)  { closeShortcuts();  return; }
        if (!document.getElementById('modal-find-bar').hidden) { closeFindBar(); return; }
        closeModal();
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        shortcutsOverlay.hidden ? openShortcuts() : closeShortcuts();
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        const modalOpen = document.getElementById('modal-overlay').classList.contains('active');
        if (modalOpen) {
          document.getElementById('modal-find-bar').hidden ? openFindBar() : closeFindBar();
        } else if (!changelogOverlay.hidden) {
          changelogSearchWrap.hidden = false;
          changelogSearchInput.focus();
        } else {
          const input = document.getElementById('search-input');
          input.focus();
          input.select();
        }
      }
      if (e.key === 'Tab') {
        const overlay = document.getElementById('modal-overlay');
        if (!overlay.classList.contains('active')) return;
        const box = document.querySelector('.modal-box');
        const focusable = Array.from(box.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => {
          const s = getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden';
        });
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const overlay = document.getElementById('modal-overlay');
        if (!overlay.classList.contains('active')) return;
        const tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const visibleTabs = Array.from(document.querySelectorAll('.modal-tab'))
          .filter(t => t.style.display !== 'none');
        const activeTab = document.querySelector('.modal-tab.active');
        const idx = visibleTabs.indexOf(activeTab);
        if (e.key === 'ArrowRight' && idx < visibleTabs.length - 1) switchTab(visibleTabs[idx + 1].dataset.tab, 'forward');
        if (e.key === 'ArrowLeft'  && idx > 0)                      switchTab(visibleTabs[idx - 1].dataset.tab, 'back');
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const overlay = document.getElementById('modal-overlay');
        if (!overlay.classList.contains('active')) return;
        const tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        const content = document.querySelector('.modal-content');
        if (content) content.scrollBy({ top: e.key === 'ArrowDown' ? 120 : -120, behavior: 'smooth' });
      }
    });

    window.addEventListener('scroll', () => {
      document.body.classList.toggle('is-scrolled', window.scrollY > 8);
    }, { passive: true });
  });

  function openLeaflet(g) {
    const base = window.location.href.replace(/\/[^\/]*$/, '/');
    const cssUrl = base + 'css/leaflet.css';
    const fontsUrl = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Lato:wght@300;400;700;900&display=swap';

    const printSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${g.title} — Patient Information</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontsUrl}" rel="stylesheet">
  <link rel="stylesheet" href="${cssUrl}">
</head>
<body>
  <div class="screen-controls">
    <button class="ctrl-btn ctrl-btn--print" onclick="window.print()">${printSvg} Print / Save as PDF</button>
    <button class="ctrl-btn ctrl-btn--back" onclick="window.close()">Close</button>
  </div>
  <div class="leaflet-page">
    <header class="leaflet-header">
      <div class="leaflet-brand">
        <span class="brand-name"><span class="brand-med">Med</span><span class="brand-axis">axis</span></span>
        <span class="brand-tag">Patient Information</span>
      </div>
      <div class="leaflet-meta">
        <span class="leaflet-ref">${g.nice_ref || ''}</span>
        <span class="leaflet-updated">Updated: ${g.updated || ''}</span>
      </div>
    </header>
    <h1 class="leaflet-title">${g.title}</h1>
    <p class="leaflet-subtitle">${g.subtitle || ''}</p>
    <div class="leaflet-body">${g.leaflet}</div>
    <footer class="leaflet-footer">
      <p>This leaflet provides general information only and is not a substitute for professional medical advice. Always follow the guidance of your GP or healthcare team. Content is based on NICE guidelines and NHS resources. Produced by Medaxis &mdash; for educational use.</p>
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

})();
