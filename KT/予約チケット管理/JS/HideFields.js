(function() {
  'use strict';

  kintone.events.on([
    'app.record.detail.show',
    'app.record.edit.show',
    'app.record.create.show'
  ], function(event) {
    // 1. APIを利用した安全な非表示化
    kintone.app.record.setFieldShown('経過情報', false);
    kintone.app.record.setFieldShown('人物評価', false);
    kintone.app.record.setFieldShown('チケット情報', false);
    kintone.app.record.setFieldShown('内部処理', false);

    // 2. DOM操作による強制非表示（APIの動作遅延やタイミングのズレ対策）
    setTimeout(() => {
        // 経過情報のサブテーブル行を非表示
        document.querySelectorAll('.subtable-row-gaia').forEach(el => {
            const label = el.querySelector('.subtable-row-label-text-gaia');
            if (label && label.textContent.trim() === '経過情報') {
                el.style.display = 'none';
            }
        });

        // 人物評価・チケット情報・内部処理のグループコンテナを非表示
        document.querySelectorAll('.control-group-gaia').forEach(el => {
            const label = el.querySelector('.group-label-gaia');
            if (label && (label.textContent.includes('人物評価') || label.textContent.includes('チケット情報') || label.textContent.includes('内部処理'))) {
                el.style.display = 'none';
            }
        });
    }, 100);

    return event;
  });
})();
