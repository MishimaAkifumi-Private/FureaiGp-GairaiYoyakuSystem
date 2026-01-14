﻿﻿﻿/*
 * kintone Display Order Reset Button (for Number Field)
 * Copyright (c) 2024 Your Name
 * Released under the MIT license
 * https://opensource.org/licenses/mit-license.php
 */

(function() {
  'use strict';

  // ■■■■■■■■■■■■■■■■ 設定項目 ■■■■■■■■■■■■■■■■
  // 「表示順」として使用するフィールドのフィールドコードを指定してください。
  const ORDER_FIELD_CODE = '表示順';
  // ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

  // 一覧画面が表示されたときのイベント
  kintone.events.on('app.record.index.show', function(event) {

    if (document.getElementById('reset_order_button') !== null) {
      return event;
    }

    // 絞り込みチェック
    const queryCondition = kintone.app.getQueryCondition();
    const isFiltered = queryCondition !== null && queryCondition.trim() !== '';

    if (isFiltered) {
      return event; // 絞り込み時はボタンを表示しない
    }

    // 非同期で全件チェックしてボタン表示判定
    checkAndDisplayButton();

    return event;
  });

  /**
   * 現在、画面に表示されているレコードセットをすべて取得します。
   */
  const fetchAllRecords = async () => {
    const appId = kintone.app.getId();
    let baseQuery = kintone.app.getQuery();
    baseQuery = baseQuery.replace(/limit\s+\d+/i, '').replace(/offset\s+\d+/i, '').trim();

    const limit = 500;
    let allRecords = [];
    let offset = 0;

    while (true) {
      const queryForApi = `${baseQuery} limit ${limit} offset ${offset}`.trim();
      const params = {
        app: appId,
        fields: ['$id', ORDER_FIELD_CODE],
        query: queryForApi
      };
      const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', params);
      allRecords = allRecords.concat(resp.records);
      if (resp.records.length < limit) {
        break;
      }
      offset += limit;
    }
    return allRecords;
  };

  const createUpdatePayload = (records) => {
    return records.map((record, index) => {
      const newOrderValue = (index + 1) * 10;
      return {
        id: record.$id.value,
        record: {
          [ORDER_FIELD_CODE]: {
            value: newOrderValue
          }
        }
      };
    });
  };

  const updateRecordsInChunks = async (payload) => {
    const appId = kintone.app.getId();
    const CHUNK_SIZE = 100;
    const requests = [];

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      const body = {
        app: appId,
        records: chunk
      };
      requests.push(kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', body));
    }
    await Promise.all(requests);
  };

  // --- 追加: ボタン表示判定ロジック ---
  const checkAndDisplayButton = async () => {
    try {
      const allRecords = await fetchAllRecords();
      
      let needsReset = false;
      let previousVal = -Infinity;

      for (let i = 0; i < allRecords.length; i++) {
        const record = allRecords[i];
        const val = Number(record[ORDER_FIELD_CODE].value);
        
        // 1. 10の倍数でない
        // 2. 昇順になっていない (前の値より小さい)
        if (val % 10 !== 0 || val < previousVal) {
          needsReset = true;
          break;
        }
        previousVal = val;
      }

      if (needsReset) {
        showResetButton();
      }
    } catch (e) {
      console.error('表示順チェックエラー:', e);
    }
  };

  // --- 追加: ボタン作成・表示ロジック ---
  const showResetButton = () => {
    if (document.getElementById('reset_order_button') !== null) return;

    const resetButton = document.createElement('button');
    resetButton.id = 'reset_order_button';
    resetButton.textContent = '表示順をリセット';

    // ボタンのスタイル設定
    resetButton.style.backgroundColor = '#3498db';
    resetButton.style.color = 'white';
    resetButton.style.border = 'none';
    resetButton.style.padding = '0 10px';
    resetButton.style.lineHeight = '30px';
    resetButton.style.height = '30px';
    resetButton.style.fontSize = '12px';
    resetButton.style.borderRadius = '4px';
    resetButton.style.fontWeight = 'bold';
    resetButton.style.cursor = 'pointer';
    resetButton.onmouseover = () => { resetButton.style.backgroundColor = '#2980b9'; };
    resetButton.onmouseout = () => { resetButton.style.backgroundColor = '#3498db'; };

    resetButton.onclick = async () => {
      if (!window.confirm('現在表示されているすべてのレコードの「' + ORDER_FIELD_CODE + '」の値を、10の倍数で振り直します。よろしいですか？')) {
        return;
      }

      try {
        resetButton.disabled = true;
        resetButton.textContent = '処理中...';

        const allRecords = await fetchAllRecords();

        if (allRecords.length === 0) {
          alert('対象のレコードがありません。');
        } else {
          const updatePayload = createUpdatePayload(allRecords);
          await updateRecordsInChunks(updatePayload);
          window.location.reload();
          return;
        }

      } catch (error) {
        console.error('エラーが発生しました:', error);
        alert('エラーが発生しました。\n詳細はデベロッパーコンソールを確認してください。');
      }

      resetButton.disabled = false;
      resetButton.textContent = '表示順をリセット';
    };

    const pager = document.querySelector('.gaia-argoui-app-index-pager');
    if (pager) {
      resetButton.style.float = 'left';
      resetButton.style.marginLeft = '10px';
      pager.insertBefore(resetButton, pager.firstChild);
    } else {
      kintone.app.getHeaderMenuSpaceElement().appendChild(resetButton);
    }
  };

})();