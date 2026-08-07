/*
 * QuickHistory.js
 * (CustomerInfoViewer.js への機能統合に伴い、互換性維持のためスキップ処理を行います)
 */
(function() {
  'use strict';

  kintone.events.on('app.record.detail.show', function(event) {
    const spaceEl = kintone.app.record.getSpaceElement('QuickHistory');
    if (!spaceEl) return event;
    // CustomerInfoViewer に統合済みのため、無駄な二重描画を防止
    spaceEl.style.display = 'none';
    return event;
  });
})();