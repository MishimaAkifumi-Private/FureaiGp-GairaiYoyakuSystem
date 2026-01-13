﻿(function() {
  'use strict';

  // --- 一覧画面の処理 (前回正常動作したコード) ---
  kintone.events.on('app.record.index.show', function(event) {
    const appId = kintone.app.getId();
    if (!appId) {
      console.error('[カスタマイズ Index] アプリIDが取得できませんでした。');
      return event;
    }
    const params = {
      app: appId,
      totalCount: true
    };
    return kintone.api(kintone.api.url('/k/v1/records', true), 'GET', params).then(function(resp) {
      if (resp.totalCount > 0) {
        // レコードが1件以上ある場合、自動的に1件目の詳細画面へ遷移する
        if (resp.records && resp.records.length > 0) {
          const firstRecordId = resp.records[0].$id.value;
          // ゲストスペース対応: 現在のURLパスからアプリルート(/k/xxx または /k/guest/xxx/xxx)を抽出
          const appRootMatch = location.pathname.match(/\/k\/(?:guest\/\d+\/)?\d+/);
          const appRootPath = appRootMatch ? appRootMatch[0] : '/k/' + appId;
          window.location.replace(appRootPath + '/show#record=' + firstRecordId);
          return event;
        }

        console.log('[カスタマイズ Index] 既存レコード数:', resp.totalCount, '。レコード追加ボタンの非表示を試みます。');
        const createButton = document.querySelector('a.gaia-argoui-app-menu-add[title="レコードを追加する"]');
        if (createButton) {
          createButton.style.display = 'none';
          console.log('[カスタマイズ Index] レコード追加ボタンを非表示にしました。');
        } else {
          console.warn('[カスタマイズ Index] レコード追加ボタンの特定ができませんでした。画面のHTML構造が変更された可能性があります。');
        }
      } else {
        console.log('[カスタマイズ Index] 既存レコード数:', resp.totalCount, '。レコード追加ボタンは表示のままです。');
      }
      return event;
    }).catch(function(error) {
      console.error('[カスタマイズ Index] 処理中にエラーが発生しました:', error);
      return event;
    });
  });

  // --- レコード詳細画面の処理 (新規追加) ---
  kintone.events.on('app.record.detail.show', function(event) {
    const record = event.record; // 表示されているレコード情報
    const appId = event.appId; // アプリID

    if (!record || !appId) {
      console.error('[カスタマイズ Detail] レコード情報またはアプリIDが取得できませんでした。');
      return event;
    }

    // 環境設定用アプリで1レコードのみという前提の場合、
    // 詳細画面が開けている時点で1件は存在します。
    // 念のため、APIで総レコード数を確認して1件以上の場合に処理を行うこともできますが、
    // ここでは詳細画面が表示されている＝1件存在するとみなし、APIコールを省略してシンプルにします。
    // もし厳密に総数を確認したい場合は、一覧画面と同様にAPIを呼び出してください。

    console.log('[カスタマイズ Detail] 詳細画面表示。レコード追加ボタンの非表示を試みます。');

    // 詳細画面のツールバー内にある「レコードを追加する」ボタンを特定
    // 親要素のクラス '.gaia-argoui-app-toolbar-menu' を含めて特定性を高めます。
    const createButtonInDetail = document.querySelector('.gaia-argoui-app-toolbar-menu a.gaia-argoui-app-menu-add[title="レコードを追加する"]');

    if (createButtonInDetail) {
      createButtonInDetail.style.display = 'none';
      console.log('[カスタマイズ Detail] 詳細画面のレコード追加ボタンを非表示にしました。');
    } else {
      // セレクタが正しいか、またはKintoneのアップデートでHTML構造が変わったか確認してください。
      console.warn('[カスタマイズ Detail] 詳細画面のレコード追加ボタンの特定ができませんでした。');
    }
    return event;
  });

})();