﻿(function() {
  'use strict';

  // --- 設定値 ---
  const INTERVAL_MS = 180000; // 更新間隔（3分）
  const IDLE_WAIT_MS = 5000; // 操作したあと、更新を再開するまでの待機時間（5秒）

  let lastActivityTime = Date.now();
  let pageLoadTime = new Date().toISOString(); // 画面を開いた時刻（差分チェック用）

  // ユーザーの操作（マウス移動、クリック、キー入力）を検知して記録する
  const updateActivity = function() {
    lastActivityTime = Date.now();
  };

  window.addEventListener('mousemove', updateActivity);
  window.addEventListener('mousedown', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('scroll', updateActivity);

  // レコード一覧画面が表示された時に実行
  kintone.events.on('app.record.index.show', function(event) {
    
    if (window.myKintoneAutoRefreshTimer) {
      clearInterval(window.myKintoneAutoRefreshTimer);
    }

    console.log('[AutoRefresh] 監視を開始しました。操作がない時に ' + (INTERVAL_MS / 1000) + '秒間隔で更新します。');

    window.myKintoneAutoRefreshTimer = setInterval(async function() {
      
      // 1. 編集・追加画面ではないか（URLハッシュで判定）
      const hash = window.location.hash;
      if (hash.includes('/edit') || hash.includes('/add')) {
        console.log('[AutoRefresh] 編集・追加画面のため、更新を停止しています。');
        return;
      }

      // 2. 最後に操作してから IDLE_WAIT_MS 以上経過しているか
      const now = Date.now();
      if (now - lastActivityTime < IDLE_WAIT_MS) {
        console.log('[AutoRefresh] ユーザーが操作中のため、今回の更新をスキップします。');
        return;
      }

      // 3. 検索窓などの入力要素にフォーカスが当たっていないか
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        console.log('[AutoRefresh] 入力フォーカスを検知したため、更新をスキップします。');
        return;
      }

      // 4. インライン編集（一覧画面での直接編集）が行われていないか確認
      if (document.querySelectorAll('.kintone-app-record-index-edit-save').length > 0) {
        console.log('[AutoRefresh] 一覧でのインライン編集を検知したため、更新を中止します。');
        return;
      }

      // 5. ★追加: 差分チェック（更新された未完了チケットがあるか確認）
      try {
        const appId = kintone.app.getId();
        const query = `更新日時 > "${pageLoadTime}" and 管理ステータス not in ("完了") limit 1`;
        
        const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
          app: appId,
          query: query,
          fields: ['$id']
        });

        if (resp.records.length > 0) {
          console.log('[AutoRefresh] 新しい更新を検知しました。リロードします。');
          window.location.reload();
        } else {
          console.log('[AutoRefresh] 更新はありませんでした。');
        }
      } catch (e) {
        console.error('[AutoRefresh] 差分チェックに失敗しました。', e);
      }

    }, INTERVAL_MS);

    return event;
  });

  // アプリを離れる時にタイマーとイベントリスナーを解除
  kintone.events.on('app.record.index.hide', function(event) {
    if (window.myKintoneAutoRefreshTimer) {
      clearInterval(window.myKintoneAutoRefreshTimer);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      console.log('[AutoRefresh] タイマーと監視を停止しました。');
      delete window.myKintoneAutoRefreshTimer;
    }
    return event;
  });

})();