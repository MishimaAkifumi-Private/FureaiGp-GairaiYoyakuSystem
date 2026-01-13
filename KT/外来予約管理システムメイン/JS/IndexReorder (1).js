﻿/*
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

      // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 変更箇所 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
      // 判定条件を「絞り込みがされているか」のみに修正しました。
      const queryCondition = kintone.app.getQueryCondition();
      const isFiltered = queryCondition !== null && queryCondition.trim() !== '';

      // 絞り込みが行われている場合のみ、警告を出して処理を中断します。
      if (isFiltered) {
        alert('エラー：レコードが絞り込まれています。「すべてのレコード」が表示されている状態で実行してください。');
        return; // 処理をここで中断
      }
      // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 変更箇所 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

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

})();