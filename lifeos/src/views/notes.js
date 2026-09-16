/* ==========================================================================
   LifeOS — Notes
   Dossiers, étiquettes, listes à cocher et liens vers les tâches, projets
   et objectifs. La recherche remonte aussi le contenu, pas seulement les
   titres.
   ========================================================================== */
(function (L) {
  'use strict';

  var h = L.h, D = L.date;

  function treeNode(entry, current, depth) {
    var children = entry.children || [];
    return h('div', [
      h('button.tree__item', {
        style: { paddingLeft: (9 + depth * 14) + 'px' },
        'aria-current': current === entry.folder.id ? 'true' : null,
        onclick: function () { L.router.setParams({ folder: current === entry.folder.id ? '' : entry.folder.id }); },
        oncontextmenu: function (e) {
          e.preventDefault();
          L.menu(e.currentTarget, [
            { icon: 'edit', label: 'Renommer', run: function () {
              L.modal.prompt({ title: 'Renommer', value: entry.folder.name }).then(function (v) {
                if (v) L.notes.saveFolder(entry.folder.id, { name: v });
              });
            } },
            { icon: 'plus', label: 'Sous-dossier', run: function () {
              L.modal.prompt({ title: 'Nouveau sous-dossier', label: 'Nom' }).then(function (v) {
                if (v) L.notes.createFolder(v, entry.folder.id);
              });
            } },
            { icon: 'trash', label: 'Supprimer', danger: true, run: function () {
              L.modal.confirm({ title: 'Supprimer le dossier', text: 'Les notes seront conservées, sans dossier.', danger: true, confirm: 'Supprimer' })
                .then(function (ok) { if (ok) L.notes.removeFolder(entry.folder.id); });
            } }
          ]);
        }
      }, [
        L.icon('folder'),
        h('span.grow.truncate', entry.folder.name),
        h('span.tree__count', String(entry.count))
      ]),
      children.map(function (child) { return treeNode(child, current, depth + 1); })
    ]);
  }

  L.views.notes = function (params) {
    var folder = params.folder || 'all';
    var tag = params.tag || '';
    var query = params.q || '';
    var list = L.notes.filter({ folderId: folder, tag: tag || null, query: query });
    var tags = L.notes.tags();
    var tree = L.notes.tree(null);
    var all = L.notes.all();

    var aside = h('div.col', { style: { gap: '2px' } }, [
      h('div.between', { style: { padding: '0 var(--sp-3) var(--sp-2)' } }, [
        h('span.eyebrow', 'Dossiers'),
        h('button.iconbtn', {
          'aria-label': 'Nouveau dossier',
          style: { width: '22px', height: '22px' },
          onclick: function () {
            L.modal.prompt({ title: 'Nouveau dossier', label: 'Nom' }).then(function (v) { if (v) L.notes.createFolder(v); });
          }
        }, L.icon('plus'))
      ]),
      h('button.tree__item', {
        'aria-current': folder === 'all' ? 'true' : null,
        onclick: function () { L.router.setParams({ folder: '' }); }
      }, [L.icon('note'), h('span.grow', 'Toutes les notes'), h('span.tree__count', String(all.length))]),
      h('button.tree__item', {
        'aria-current': folder === 'none' ? 'true' : null,
        onclick: function () { L.router.setParams({ folder: 'none' }); }
      }, [L.icon('inbox'), h('span.grow', 'Sans dossier'),
        h('span.tree__count', String(all.filter(function (n) { return !n.folderId; }).length))]),
      tree.map(function (entry) { return treeNode(entry, folder, 0); }),
      tags.length ? h('div', [
        h('div.eyebrow', { style: { padding: 'var(--sp-5) var(--sp-3) var(--sp-2)' } }, 'Étiquettes'),
        h('div.row.wrap', { style: { gap: '5px', padding: '0 var(--sp-3)' } }, tags.map(function (t) {
          return h('button.chip.chip--tap' + (tag === t ? '.chip--accent' : ''), {
            onclick: function () { L.router.setParams({ tag: tag === t ? '' : t }); }
          }, '#' + t);
        }))
      ]) : null
    ]);

    var grid = list.length
      ? h('div.grid.grid--auto', list.map(function (note) {
          var checks = (note.checklist || []).length;
          var checksDone = (note.checklist || []).filter(function (c) { return c.done; }).length;
          var links = (note.links || {});
          var linkCount = (links.taskIds || []).length + (links.projectIds || []).length + (links.goalIds || []).length;
          return h('button.note-card', { onclick: function () { L.forms.note(note); } }, [
            h('div.between', [
              h('div.t-s.w-600.truncate.grow', note.title || 'Sans titre'),
              note.pinned ? L.icon('flag', 13) : null
            ]),
            h('div.note-card__body.clamp-3', L.notes.excerpt(note, 180) || '—'),
            h('div.row.wrap.t-xs.faint', { style: { marginTop: 'auto', gap: '8px', paddingTop: '8px' } }, [
              h('span', D.relative(D.iso(new Date(note.updatedAt)))),
              checks ? h('span', checksDone + '/' + checks + ' cochés') : null,
              linkCount ? h('span.row', { style: { gap: '3px' } }, [L.icon('link', 11), String(linkCount)]) : null,
              (note.tags || []).length ? h('span.truncate', note.tags.map(function (t) { return '#' + t; }).join(' ')) : null
            ])
          ]);
        }))
      : L.dom.empty('note', query ? 'Aucun résultat' : 'Aucune note',
          query ? 'Essaie un autre mot.' : 'Les notes rapides servent à vider sa tête ; les dossiers viennent après.',
          h('button.btn.btn--primary', { onclick: function () { L.forms.note(null, { folderId: folder !== 'all' && folder !== 'none' ? folder : null }); } }, 'Nouvelle note'));

    return h('div.view.view--wide', [
      h('div.view__head', [
        h('div.between.wrap', [
          h('div', [
            h('h1.view__title', 'Notes'),
            h('p.view__lead', all.length + ' ' + L.util.plural(all.length, 'note') +
              (folder !== 'all' ? ' · ' + list.length + ' affichées' : ''))
          ]),
          h('button.btn.btn--primary', {
            onclick: function () { L.forms.note(null, { folderId: folder !== 'all' && folder !== 'none' ? folder : null }); }
          }, [L.icon('plus'), 'Nouvelle note'])
        ])
      ]),
      h('div.notes-layout', [
        h('div.desktop-only', [aside]),
        h('div', [
          h('div.toolbar', { style: { marginBottom: 'var(--sp-4)' } }, [
            h('input.input', {
              placeholder: 'Rechercher dans les notes…', value: query, style: { maxWidth: '320px' },
              oninput: L.util.debounce(function (e) { L.router.setParams({ q: e.target.value }, { replace: true }); }, 250)
            }),
            tag ? h('button.chip.chip--accent.chip--tap', { onclick: function () { L.router.setParams({ tag: '' }); } }, ['#' + tag, L.icon('x')]) : null
          ]),
          h('div.mobile-only.toolbar.toolbar--scroll', { style: { marginBottom: 'var(--sp-4)' } }, [
            h('button.chip.chip--tap' + (folder === 'all' ? '.chip--accent' : ''), {
              onclick: function () { L.router.setParams({ folder: '' }); }
            }, 'Toutes')
          ].concat(L.notes.folders().map(function (f) {
            return h('button.chip.chip--tap' + (folder === f.id ? '.chip--accent' : ''), {
              onclick: function () { L.router.setParams({ folder: f.id }); }
            }, f.name);
          }))),
          grid
        ])
      ])
    ]);
  };
})(window.LifeOS = window.LifeOS || {});
