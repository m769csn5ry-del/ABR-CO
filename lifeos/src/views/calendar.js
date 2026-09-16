/* ==========================================================================
   LifeOS — Calendrier
   Mois, semaine, jour. Les tâches datées et les échéances y apparaissent au
   même titre que les rendez-vous : c'est la seule façon de voir si une
   journée tient debout.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  function pillClass(kind) {
    return kind === 'event' ? '.cal-pill--event' : kind === 'due' ? '.cal-pill--due' : '.cal-pill--task';
  }

  /* ---------------- mois ---------------- */
  function monthView(anchor, selected) {
    var matrix = L.calendar.monthMatrix(anchor);
    var first = L.store.state.settings.firstDayOfWeek;
    var dows = [];
    for (var i = 0; i < 7; i++) dows.push(D.DAYS_SHORT[(first + i) % 7]);

    return h('div.card', { style: { padding: '0', overflow: 'hidden' } }, [
      h('div.cal-month', dows.map(function (d) { return h('div.cal-dow', d); })
        .concat(matrix.map(function (cell) {
          var items = cell.items.slice().sort(function (a, b) {
            var da = a.kind === 'task' && a.ref && a.ref.status === 'done' ? 1 : 0;
            var db = b.kind === 'task' && b.ref && b.ref.status === 'done' ? 1 : 0;
            return da - db;
          });
          var shown = items.slice(0, 3);
          return h('button.cal-day' +
            (cell.inMonth ? '' : '.cal-day--out') +
            (cell.today ? '.cal-day--today' : '') +
            (cell.date === selected ? '.cal-day--sel' : ''), {
            onclick: function () { L.router.setParams({ date: cell.date }); },
            ondblclick: function () { L.forms.event(null, { date: cell.date }); }
          }, [
            h('span.cal-day__n', String(+cell.date.slice(8, 10))),
            h('div.col', { style: { gap: '2px' } }, shown.map(function (item) {
              var domain = item.domainId ? L.domains.get(item.domainId) : null;
              var done = item.kind === 'task' && item.ref && item.ref.status === 'done';
              return h('span.cal-pill' + pillClass(item.kind) + (done ? '.cal-pill--done' : ''), {
                style: domain && item.kind === 'event' ? { color: domain.color } : null,
                title: item.title
              }, [
                item.allDay ? null : h('span.num', { style: { opacity: '.7' } }, D.toTime(item.start).replace(':00', 'h') + ' '),
                item.title
              ]);
            })),
            items.length > shown.length ? h('span.cal-more', '+' + (items.length - shown.length)) : null
          ]);
        })))
    ]);
  }

  /* ---------------- semaine ---------------- */
  function weekView(anchor, selected) {
    var days = L.calendar.weekDays(anchor);
    var settings = L.store.state.settings.day;
    var startH = Math.max(0, Math.floor((D.toMinutes(settings.start) || 480) / 60) - 1);
    var endH = Math.min(24, Math.ceil((D.toMinutes(settings.end) || 1350) / 60) + 1);
    var hours = [];
    for (var hh = startH; hh < endH; hh++) hours.push(hh);
    var rowH = 44;

    var gutter = h('div', [h('div.cal-week__head', '')].concat(hours.map(function (hr) {
      return h('div.cal-gutter', hr + ' h');
    })));

    var cols = days.map(function (day) {
      var items = L.calendar.agenda(day, { habits: true }).filter(function (i) { return !i.allDay; });
      var allDay = L.calendar.agenda(day, { habits: false }).filter(function (i) { return i.allDay; });
      var blocks = items.map(function (item) {
        var top = ((item.start - startH * 60) / 60) * rowH;
        var height = Math.max(16, ((item.end - item.start) / 60) * rowH - 2);
        var cls = item.kind === 'event' ? '.cal-ev--event' : item.kind === 'habit' ? '.cal-ev--habit' : '';
        return h('button.cal-ev' + cls, {
          style: { top: top + 'px', height: height + 'px' },
          title: item.title,
          onclick: function () {
            if (item.kind === 'event') L.forms.event(item.ref);
            else if (item.kind === 'habit') L.router.go('habits', { id: item.id });
            else L.views.taskDetail(item.id);
          }
        }, [
          h('div', { style: { fontWeight: '600' } }, item.title),
          height > 30 ? h('div', { style: { opacity: '.75' } }, D.toTime(item.start)) : null
        ]);
      });

      if (day === D.today()) {
        var now = D.nowMinutes();
        if (now >= startH * 60 && now <= endH * 60) {
          blocks.push(h('div.cal-now', { style: { top: (((now - startH * 60) / 60) * rowH) + 'px' } }));
        }
      }

      return h('div', [
        h('button.cal-week__head' + (day === selected ? '' : ''), {
          onclick: function () { L.router.setParams({ date: day, mode: 'day' }); },
          style: day === D.today() ? { fontWeight: '700' } : null
        }, [
          h('div.t-xs.faint', { style: { textTransform: 'capitalize' } }, D.DAYS_SHORT[D.dow(day)]),
          h('div.t-s.w-600.num', String(+day.slice(8, 10))),
          allDay.length ? h('div.t-xs.accent', '+' + allDay.length) : null
        ]),
        h('div.cal-week__col', { style: { height: (hours.length * rowH) + 'px' } },
          hours.map(function () { return h('div.cal-hour'); }).concat(blocks))
      ]);
    });

    return h('div.card.cal-scroll', { style: { padding: '0', overflow: 'auto' } }, [
      h('div.cal-week', [gutter].concat(cols))
    ]);
  }

  /* ---------------- jour ---------------- */
  function dayView(day) {
    var agenda = L.calendar.agenda(day, { habits: true });
    var plan = L.planner.get(day);
    var slots = L.calendar.freeSlots(day, { fromNow: day === D.today() });

    return h('div.grid', { style: { gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 'var(--sp-4)' } }, [
      h('div.card', [
        h('div.card__head', [
          h('div.card__title', 'Déroulé'),
          h('button.btn.btn--s', { onclick: function () { L.forms.event(null, { date: day }); } }, [L.icon('plus'), 'Événement'])
        ]),
        plan && plan.blocks.length
          ? L.views.planTimeline(plan, { editable: true })
          : agenda.length
            ? h('div.list', agenda.map(function (i) { return L.views.agendaItem(i); }))
            : L.dom.empty('calendar', 'Journée vide', 'Aucun événement, aucune tâche datée.')
      ]),
      h('div.col', [
        h('div.card', [
          h('div.card__title', { style: { marginBottom: '12px' } }, 'Créneaux libres'),
          slots.length
            ? h('div.col', { style: { gap: '8px' } }, slots.map(function (s) {
                return h('div.between.t-s', [
                  h('span.num', D.toTime(s.start) + ' – ' + D.toTime(s.end)),
                  h('span.chip', D.duration(s.minutes))
                ]);
              }))
            : h('p.t-s.muted', 'Aucun créneau libre sur cette journée.'),
          h('button.btn.btn--s.btn--full', {
            style: { marginTop: 'var(--sp-4)' },
            onclick: function () { L.router.go('planning', { date: day, generate: 'day' }); }
          }, [L.icon('sparkle'), 'Organiser'])
        ]),
        h('div.card', [
          h('div.card__title', { style: { marginBottom: '12px' } }, 'Charge'),
          (function () {
            var load = L.calendar.load(day);
            return h('div.col', { style: { gap: '10px' } }, [
              L.dom.bar(L.util.clamp(load.ratio, 0, 1), load.overloaded ? 'danger' : load.ratio > 0.8 ? 'warning' : null),
              h('div.t-xs.muted', D.duration(load.planned) + ' engagés sur ' + D.duration(load.window)),
              h('div.t-xs.faint', load.overloaded ? 'Journée en surcharge — reporte quelque chose.' : 'Marge : ' + D.duration(load.free))
            ]);
          })()
        ])
      ])
    ]);
  }

  /* ---------------- sélection d'un jour sous le mois ---------------- */
  function dayPanel(day) {
    var agenda = L.calendar.agenda(day, { habits: false });
    return h('div.card', [
      h('div.card__head', [
        h('div.card__title', D.caps(D.format(day, 'long'))),
        h('div.row', [
          h('button.btn.btn--s', { onclick: function () { L.forms.event(null, { date: day }); } }, [L.icon('plus'), 'Événement']),
          h('button.btn.btn--s', { onclick: function () { L.forms.task(null, { date: day }); } }, [L.icon('plus'), 'Tâche'])
        ])
      ]),
      agenda.length
        ? h('div.list', agenda.map(function (i) { return L.views.agendaItem(i); }))
        : h('p.t-s.muted', 'Rien de prévu ce jour-là.'),
      h('div.card__foot.row.wrap', { style: { gap: '8px' } }, [
        h('span.chip', D.duration(L.calendar.availableMinutes(day, { fromNow: day === D.today() })) + ' de libre'),
        h('button.btn.btn--s.btn--ghost', { onclick: function () { L.router.go('today', { date: day }); } }, 'Ouvrir la journée')
      ])
    ]);
  }

  L.views.calendar = function (params) {
    var mode = params.mode || 'month';
    var day = params.date || D.today();

    function shift(delta) {
      var next = mode === 'month' ? D.addMonths(day, delta)
        : mode === 'week' ? D.addDays(day, delta * 7)
        : D.addDays(day, delta);
      L.router.setParams({ date: next });
    }

    var title = mode === 'month' ? D.format(day, 'month')
      : mode === 'week' ? 'Semaine du ' + D.format(D.startOfWeek(day, L.store.state.settings.firstDayOfWeek), 'short')
      : D.format(day, 'long');

    return h('div.view.view--wide', [
      h('div.view__head', [
        h('div.between.wrap', { style: { gap: 'var(--sp-4)' } }, [
          h('div', [
            h('h1.view__title', { style: { fontSize: 'var(--fs-2xl)' } }, D.caps(title)),
            h('p.view__lead', 'Événements, tâches datées et échéances au même endroit.')
          ]),
          h('div.row.wrap', [
            L.dom.segmented([
              { id: 'month', label: 'Mois' },
              { id: 'week', label: 'Semaine' },
              { id: 'day', label: 'Jour' }
            ], mode, function (id) { L.router.setParams({ mode: id }); }),
            h('div.row', { style: { gap: '2px' } }, [
              h('button.iconbtn', { 'aria-label': 'Précédent', onclick: function () { shift(-1); } }, L.icon('chevron-left')),
              h('button.btn.btn--s', { onclick: function () { L.router.setParams({ date: D.today() }); } }, "Aujourd'hui"),
              h('button.iconbtn', { 'aria-label': 'Suivant', onclick: function () { shift(1); } }, L.icon('chevron-right'))
            ]),
            h('button.iconbtn', {
              'aria-label': 'Options du calendrier',
              onclick: function (e) {
                L.menu(e.currentTarget, [
                  { icon: 'plus', label: 'Nouvel événement', run: function () { L.forms.event(null, { date: day }); } },
                  '-',
                  { icon: 'download', label: 'Exporter en .ics', run: function () { L.ics.download(); L.toast.show('Calendrier exporté'); } },
                  { icon: 'upload', label: 'Importer un fichier .ics', run: function () {
                    L.ics.importFile().then(function (res) {
                      if (!res) return;
                      L.toast.show(res.added + ' événements importés' + (res.skipped ? ', ' + res.skipped + ' déjà présents' : ''));
                    }, function (err) { L.toast.error('Import impossible : ' + err.message); });
                  } },
                  { icon: 'link', label: 'Importer depuis une adresse…', run: function () {
                    L.modal.prompt({
                      title: 'Abonnement calendrier',
                      label: 'Adresse .ics',
                      hint: 'Google Agenda : « adresse secrète au format iCal ». Apple : calendrier public.',
                      placeholder: 'https://…'
                    }).then(function (url) {
                      if (!url) return;
                      L.ics.importURL(url).then(function (res) {
                        L.toast.show(res.added + ' événements importés');
                      }, function (err) {
                        L.toast.error('Lecture impossible : ' + err.message + ' — le fournisseur doit autoriser l\'accès direct.');
                      });
                    });
                  } }
                ], { align: 'right' });
              }
            }, L.icon('more'))
          ])
        ])
      ]),

      mode === 'month' ? h('div.col', [monthView(day, day), dayPanel(day)]) : null,
      mode === 'week' ? weekView(day, day) : null,
      mode === 'day' ? dayView(day) : null
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
