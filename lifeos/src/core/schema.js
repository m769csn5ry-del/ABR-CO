/* ==========================================================================
   LifeOS — modèle de données
   Un seul endroit décrit la forme des objets, leurs valeurs par défaut et
   les listes fermées (statuts, priorités). Les écrans n'inventent rien.
   ========================================================================== */
(function (L) {
  'use strict';

  var uid = L.util.uid;

  var SCHEMA_VERSION = 1;

  /* --- listes fermées --- */
  var PRIORITIES = [
    { id: 0, label: 'Urgent',    short: 'P0', weight: 30 },
    { id: 1, label: 'Important', short: 'P1', weight: 20 },
    { id: 2, label: 'Normal',    short: 'P2', weight: 10 },
    { id: 3, label: 'Plus tard', short: 'P3', weight: 3 }
  ];

  var TASK_STATUS = [
    { id: 'todo',      label: 'À faire' },
    { id: 'doing',     label: 'En cours' },
    { id: 'done',      label: 'Terminée' },
    { id: 'postponed', label: 'Reportée' },
    { id: 'cancelled', label: 'Annulée' }
  ];

  var PROJECT_STATUS = [
    { id: 'idea',      label: 'Idée' },
    { id: 'planned',   label: 'Planifié' },
    { id: 'active',    label: 'En cours' },
    { id: 'paused',    label: 'En pause' },
    { id: 'done',      label: 'Terminé' },
    { id: 'abandoned', label: 'Abandonné' }
  ];

  var GOAL_STATUS = [
    { id: 'active',   label: 'En cours' },
    { id: 'done',     label: 'Atteint' },
    { id: 'paused',   label: 'En pause' },
    { id: 'archived', label: 'Archivé' }
  ];

  var ENERGY = [
    { id: 'high',   label: 'Haute' },
    { id: 'medium', label: 'Moyenne' },
    { id: 'low',    label: 'Basse' }
  ];

  var TX_TYPES = [
    { id: 'income',   label: 'Revenu',        sign: 1 },
    { id: 'expense',  label: 'Dépense',       sign: -1 },
    { id: 'saving',   label: 'Épargne',       sign: -1 },
    { id: 'invest',   label: 'Investissement', sign: -1 },
    { id: 'transfer', label: 'Transfert',     sign: 0 }
  ];

  var HABIT_KINDS = [
    { id: 'check',    label: 'Fait / pas fait' },
    { id: 'quantity', label: 'Quantité' },
    { id: 'duration', label: 'Durée (min)' },
    { id: 'time',     label: 'Heure' }
  ];

  /* Sections de la navigation. « hideable:false » : l'écran reste toujours
     accessible, sinon on pourrait se verrouiller dehors de ses réglages. */
  var SECTIONS = [
    { id: 'home',      label: 'Accueil',     icon: 'home',      hideable: false, mobile: true },
    { id: 'today',     label: "Aujourd'hui", icon: 'sun',       hideable: true,  mobile: true },
    { id: 'planning',  label: 'Planning',    icon: 'layout',    hideable: true,  mobile: false },
    { id: 'calendar',  label: 'Calendrier',  icon: 'calendar',  hideable: true,  mobile: true },
    { id: 'tasks',     label: 'Tâches',      icon: 'check',     hideable: true,  mobile: true },
    { id: 'projects',  label: 'Projets',     icon: 'folder',    hideable: true,  mobile: false },
    { id: 'goals',     label: 'Objectifs',   icon: 'target',    hideable: true,  mobile: false },
    { id: 'finance',   label: 'Finances',    icon: 'wallet',    hideable: true,  mobile: false },
    { id: 'habits',    label: 'Habitudes',   icon: 'repeat',    hideable: true,  mobile: false },
    { id: 'stats',     label: 'Statistiques', icon: 'chart',    hideable: true,  mobile: false },
    { id: 'notes',     label: 'Notes',       icon: 'note',      hideable: true,  mobile: false },
    { id: 'assistant', label: 'Assistant',   icon: 'sparkle',   hideable: true,  mobile: true },
    { id: 'settings',  label: 'Paramètres',  icon: 'settings',  hideable: false, mobile: false }
  ];

  /* --- fabriques ---
     Chaque fabrique renvoie un objet complet : aucun écran n'a besoin de
     tester l'absence d'un champ. */
  var make = {
    domain: function (p) {
      p = p || {};
      return {
        id: p.id || uid('dom'), name: p.name || 'Domaine',
        icon: p.icon || 'circle', color: p.color || '#8A8F98',
        order: p.order === undefined ? 0 : p.order,
        createdAt: p.createdAt || Date.now()
      };
    },

    task: function (p) {
      p = p || {};
      return {
        id: p.id || uid('tsk'),
        title: p.title || '',
        notes: p.notes || '',
        domainId: p.domainId || null,
        projectId: p.projectId || null,
        goalId: p.goalId || null,
        priority: p.priority === undefined ? 2 : p.priority,
        date: p.date || null,          // jour où la tâche est posée
        time: p.time || null,          // heure fixe éventuelle
        due: p.due || null,            // date limite
        estimate: p.estimate === undefined ? 30 : p.estimate,   // minutes
        actual: p.actual || 0,
        energy: p.energy || 'medium',
        subtasks: p.subtasks || [],    // [{id,title,done}]
        recurrence: p.recurrence || null,
        status: p.status || 'todo',
        tags: p.tags || [],
        attachments: p.attachments || [],   // [{id,name,type,size,kind:'link'|'file',url}]
        reminders: p.reminders || [],       // [{id,offset:minutes avant, at:'HH:MM'}]
        order: p.order === undefined ? Date.now() : p.order,
        seriesId: p.seriesId || null,       // tâches nées d'une même récurrence
        createdAt: p.createdAt || Date.now(),
        updatedAt: p.updatedAt || Date.now(),
        completedAt: p.completedAt || null
      };
    },

    subtask: function (title) { return { id: uid('sub'), title: title || '', done: false }; },

    project: function (p) {
      p = p || {};
      return {
        id: p.id || uid('prj'),
        name: p.name || 'Projet',
        description: p.description || '',
        domainId: p.domainId || null,
        goalId: p.goalId || null,
        objective: p.objective || '',
        milestones: p.milestones || [],  // [{id,title,due,done}]
        budget: p.budget === undefined ? null : p.budget,
        notes: p.notes || '',
        attachments: p.attachments || [],
        status: p.status || 'active',
        start: p.start || null,
        due: p.due || null,
        color: p.color || null,
        order: p.order === undefined ? Date.now() : p.order,
        createdAt: p.createdAt || Date.now(),
        updatedAt: p.updatedAt || Date.now()
      };
    },

    goal: function (p) {
      p = p || {};
      return {
        id: p.id || uid('gol'),
        name: p.name || 'Objectif',
        description: p.description || '',
        category: p.category || 'Personnel',
        domainId: p.domainId || null,
        start: p.start === undefined ? 0 : p.start,       // valeur de départ
        current: p.current === undefined ? 0 : p.current, // valeur saisie à la main
        target: p.target === undefined ? 100 : p.target,
        unit: p.unit || '',
        startDate: p.startDate || L.date.today(),
        targetDate: p.targetDate || null,
        /* Source de la valeur courante :
           manual · savings (transactions d'épargne) · tasks (tâches liées)
           · habit (cumul d'une habitude) · project (avancement d'un projet) */
        source: p.source || { type: 'manual' },
        projectIds: p.projectIds || [],
        status: p.status || 'active',
        checkpoints: p.checkpoints || [],  // [{date,value}] historique
        createdAt: p.createdAt || Date.now(),
        updatedAt: p.updatedAt || Date.now()
      };
    },

    account: function (p) {
      p = p || {};
      return {
        id: p.id || uid('acc'), name: p.name || 'Compte',
        kind: p.kind || 'courant',     // courant · épargne · espèces · investissement
        opening: p.opening === undefined ? 0 : p.opening,
        color: p.color || '#8A8F98',
        archived: !!p.archived,
        createdAt: p.createdAt || Date.now()
      };
    },

    category: function (p) {
      p = p || {};
      return {
        id: p.id || uid('cat'), name: p.name || 'Catégorie',
        type: p.type || 'expense',      // expense · income · saving
        icon: p.icon || '•', color: p.color || '#8A8F98',
        budget: p.budget === undefined ? null : p.budget,  // budget mensuel
        order: p.order === undefined ? 0 : p.order
      };
    },

    transaction: function (p) {
      p = p || {};
      return {
        id: p.id || uid('trx'),
        amount: Math.abs(Number(p.amount) || 0),
        type: p.type || 'expense',
        categoryId: p.categoryId || null,
        accountId: p.accountId || null,
        toAccountId: p.toAccountId || null,   // transferts
        date: p.date || L.date.today(),
        description: p.description || '',
        projectId: p.projectId || null,
        goalId: p.goalId || null,
        recurrence: p.recurrence || null,
        fixed: !!p.fixed,                     // dépense fixe (loyer, abonnement)
        createdAt: p.createdAt || Date.now()
      };
    },

    habit: function (p) {
      p = p || {};
      return {
        id: p.id || uid('hab'),
        name: p.name || 'Habitude',
        icon: p.icon || 'repeat',
        color: p.color || null,
        domainId: p.domainId || null,
        kind: p.kind || 'check',
        target: p.target === undefined ? 1 : p.target,
        unit: p.unit || '',
        direction: p.direction || 'at_least',   // at_least · at_most
        days: p.days || [0, 1, 2, 3, 4, 5, 6],  // jours concernés
        perWeek: p.perWeek === undefined ? null : p.perWeek,   // ou « n fois par semaine »
        reminder: p.reminder || null,           // 'HH:MM'
        slot: p.slot || null,                   // moment visé dans la journée
        duration: p.duration === undefined ? 30 : p.duration,  // minutes réservées au planning
        goalId: p.goalId || null,
        archived: !!p.archived,
        order: p.order === undefined ? Date.now() : p.order,
        createdAt: p.createdAt || Date.now()
      };
    },

    event: function (p) {
      p = p || {};
      return {
        id: p.id || uid('evt'),
        title: p.title || 'Événement',
        date: p.date || L.date.today(),
        start: p.start || '09:00',
        end: p.end || '10:00',
        allDay: !!p.allDay,
        location: p.location || '',
        notes: p.notes || '',
        domainId: p.domainId || null,
        projectId: p.projectId || null,
        recurrence: p.recurrence || null,
        reminders: p.reminders || [],
        source: p.source || 'local',   // local · ics
        uid: p.uid || null,            // identifiant d'origine (import .ics)
        createdAt: p.createdAt || Date.now()
      };
    },

    note: function (p) {
      p = p || {};
      return {
        id: p.id || uid('not'),
        title: p.title || '',
        body: p.body || '',
        folderId: p.folderId || null,
        tags: p.tags || [],
        checklist: p.checklist || [],     // [{id,title,done}]
        links: p.links || { taskIds: [], projectIds: [], goalIds: [] },
        attachments: p.attachments || [],
        pinned: !!p.pinned,
        createdAt: p.createdAt || Date.now(),
        updatedAt: p.updatedAt || Date.now()
      };
    },

    folder: function (p) {
      p = p || {};
      return {
        id: p.id || uid('fld'), name: p.name || 'Dossier',
        parentId: p.parentId || null, order: p.order === undefined ? 0 : p.order
      };
    }
  };

  /* --- réglages par défaut --- */
  function defaultSettings() {
    return {
      theme: 'auto',                 // auto · light · dark
      accent: 'encre',               // encre · bleu · violet · vert · ambre · rouge · rose
      density: 'confort',            // confort · compact
      locale: 'fr-FR',
      currency: 'EUR',
      firstDayOfWeek: 1,
      sections: SECTIONS.map(function (s) { return { id: s.id, hidden: false }; }),
      home: {
        widgets: ['planning', 'tasks', 'next', 'goals', 'habits', 'finance', 'time', 'week'],
        hidden: []
      },
      day: {
        start: '08:00',
        end: '22:30',
        breakMinutes: 10,
        maxFocus: 90,
        minBlock: 15,
        /* Courbe d'énergie : utilisée pour placer les tâches exigeantes
           au bon moment de la journée. */
        energy: { morning: 'high', afternoon: 'medium', evening: 'low' },
        workDays: [1, 2, 3, 4, 5]
      },
      notifications: {
        enabled: false,
        tasks: true,
        deadlines: true,
        events: true,
        habits: true,
        goals: true,
        dailyPlan: { on: true, time: '07:30' },
        weeklyPlan: { on: true, day: 0, time: '10:00' },
        leadMinutes: 10
      },
      ai: {
        provider: 'local',           // local · anthropic
        model: 'claude-sonnet-5',
        apiKey: '',
        allowActions: true,
        shareFinance: true
      },
      finance: { monthlyBudget: null, alertAt: 0.8, salaryDay: 1 },
      auth: { googleClientId: '', appleClientId: '', appleRedirect: '' },
      privacy: { lockOnStart: false },
      updatedAt: Date.now()
    };
  }

  function emptyState() {
    return {
      schema: SCHEMA_VERSION,
      settings: defaultSettings(),
      domains: [],
      tasks: [],
      projects: [],
      goals: [],
      accounts: [],
      categories: [],
      transactions: [],
      habits: [],
      habitLogs: {},         // { habitId: { 'AAAA-MM-JJ': valeur } }
      events: [],
      notes: [],
      folders: [],
      plans: {},             // { 'AAAA-MM-JJ': {blocks, status, createdAt} }
      weekPlans: {},         // { 'AAAA-Snn': {...} }
      chat: [],
      timer: null,           // { taskId, startedAt, accumulated, goal }
      meta: { createdAt: Date.now(), updatedAt: Date.now(), seeded: false }
    };
  }

  /* Complète un état venu du stockage : une version plus ancienne ne doit
     jamais faire tomber l'app, seulement récupérer les champs manquants. */
  function migrate(state) {
    var base = emptyState();
    if (!state || typeof state !== 'object') return base;
    var out = Object.assign(base, state);

    out.settings = deepDefaults(state.settings || {}, base.settings);
    /* Une section ajoutée par une mise à jour doit apparaître dans la
       navigation sans que l'utilisateur ait à la rétablir. */
    var known = {};
    out.settings.sections = (out.settings.sections || []).filter(function (s) {
      if (!s || !s.id || known[s.id]) return false;
      if (!SECTIONS.some(function (d) { return d.id === s.id; })) return false;
      known[s.id] = 1; return true;
    });
    SECTIONS.forEach(function (s) {
      if (!known[s.id]) out.settings.sections.push({ id: s.id, hidden: false });
    });

    ['domains', 'tasks', 'projects', 'goals', 'accounts', 'categories',
     'transactions', 'habits', 'events', 'notes', 'folders', 'chat'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    ['habitLogs', 'plans', 'weekPlans'].forEach(function (k) {
      if (!out[k] || typeof out[k] !== 'object') out[k] = {};
    });

    out.tasks = out.tasks.map(function (t) { return make.task(t); });
    out.projects = out.projects.map(function (p) { return make.project(p); });
    out.goals = out.goals.map(function (g) { return make.goal(g); });
    out.habits = out.habits.map(function (h) { return make.habit(h); });
    out.events = out.events.map(function (e) { return make.event(e); });
    out.notes = out.notes.map(function (n) { return make.note(n); });
    out.transactions = out.transactions.map(function (t) { return make.transaction(t); });
    out.schema = SCHEMA_VERSION;
    return out;
  }

  function deepDefaults(value, defaults) {
    if (Array.isArray(defaults)) return Array.isArray(value) ? value : defaults;
    if (defaults && typeof defaults === 'object') {
      var out = {};
      Object.keys(defaults).forEach(function (k) { out[k] = deepDefaults(value ? value[k] : undefined, defaults[k]); });
      if (value && typeof value === 'object') {
        Object.keys(value).forEach(function (k) { if (!(k in out)) out[k] = value[k]; });
      }
      return out;
    }
    return value === undefined ? defaults : value;
  }

  L.schema = {
    VERSION: SCHEMA_VERSION,
    PRIORITIES: PRIORITIES,
    TASK_STATUS: TASK_STATUS,
    PROJECT_STATUS: PROJECT_STATUS,
    GOAL_STATUS: GOAL_STATUS,
    ENERGY: ENERGY,
    TX_TYPES: TX_TYPES,
    HABIT_KINDS: HABIT_KINDS,
    SECTIONS: SECTIONS,
    make: make,
    emptyState: emptyState,
    defaultSettings: defaultSettings,
    migrate: migrate,
    deepDefaults: deepDefaults,
    priority: function (id) { return PRIORITIES[id] || PRIORITIES[2]; },
    label: function (list, id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].label;
      return '';
    }
  };
})(window.LifeOS = window.LifeOS || {});
