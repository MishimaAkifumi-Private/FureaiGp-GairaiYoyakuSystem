/*
 * QuickHistory.js
 * 同一カルテNoの過去チケットを検索し、人物情報として一覧表示します。
 */
(function() {
  'use strict';

  // スタイルの追加
  const injectStyles = () => {
    if (document.getElementById('quick-history-styles')) return;
    const style = document.createElement('style');
    style.id = 'quick-history-styles';
    style.textContent = `
      .qh-container {
        margin: 10px 0;
        font-family: "Helvetica Neue", Arial, sans-serif;
      }
      .qh-details {
        border: 1px solid #dcdfe6;
        border-radius: 6px;
        background-color: #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .qh-summary {
        cursor: pointer;
        font-weight: bold;
        padding: 12px 15px;
        background-color: #f8f9fa;
        border-radius: 6px;
        user-select: none;
        display: flex;
        align-items: center;
        color: #2c3e50;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      .qh-summary:hover {
        background-color: #e9ecef;
      }
      .qh-summary::-webkit-details-marker {
        display: none;
      }
      .qh-summary::before {
        content: '▶';
        display: inline-block;
        margin-right: 8px;
        font-size: 12px;
        transition: transform 0.2s;
      }
      .qh-details[open] .qh-summary::before {
        transform: rotate(90deg);
      }
      .qh-details[open] .qh-summary {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-bottom: 1px solid #dcdfe6;
      }
      .qh-table-wrapper {
        overflow-x: auto;
        padding: 15px;
      }
      .qh-table {
        border-collapse: collapse;
        width: 100%;
        font-size: 11px;
        min-width: 800px;
      }
      .qh-table th, .qh-table td {
        border: 1px solid #e0e0e0;
        padding: 2px !important;
        text-align: center;
        vertical-align: middle;
        line-height: 1.4;
        width: 4.5em;
        min-width: 4.5em;
        max-width: 4.5em;
        white-space: normal;
        word-break: break-all;
      }
      .qh-table th {
        background-color: #f4f6f8;
        color: #555;
        font-weight: bold;
      }
      .qh-table th.qh-col-ticket, .qh-table td.qh-col-ticket {
        width: 5.5em;
        min-width: 5.5em;
        max-width: 5.5em;
        white-space: normal;
      }
      .qh-table th.qh-col-date, .qh-table td.qh-col-date {
        width: auto;
        min-width: auto;
        max-width: none;
        white-space: nowrap;
      }
      .qh-table th.qh-col-memo, .qh-table td.qh-col-memo {
        width: auto;
        min-width: 200px;
        max-width: none;
        text-align: center;
      }
      .qh-ticket-link, .qh-current-ticket {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
      }
      .qh-ticket-link {
        font-size: 20px;
        text-decoration: none;
        transition: transform 0.1s;
      }
      .qh-ticket-link:hover {
        transform: scale(1.1);
      }
      .qh-current-ticket {
        font-weight: bold; 
        font-size: 10px;
        color: #1565c0;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  };

  kintone.events.on('app.record.detail.show', async function(event) {
    const record = event.record;
    const chartNo = record['カルテNo'] ? record['カルテNo'].value : '';
    const currentId = kintone.app.record.getId();
    const spaceEl = kintone.app.record.getSpaceElement('QuickHistory');

    if (!spaceEl) return event;
    
    // スタイルを注入
    injectStyles();

    // カルテNoが未入力の場合は表示をスキップ
    if (!chartNo) {
        spaceEl.innerHTML = '<div style="color: #95a5a6; padding: 10px; font-size: 13px;">カルテNoが未入力のため、過去の履歴は検索できません。</div>';
        return event;
    }

    try {
      const appId = kintone.app.getId();
      // カルテNoが一致するレコードを取得（作成日時降順）
      const query = `カルテNo = "${chartNo}" order by 作成日時 desc`;
      const body = {
        app: appId,
        query: query,
        fields: ['$id', '作成日時', '申込者', '申込者補足', '共通評価', '人物メモ']
      };

      const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', body);
      const records = resp.records;

      if (records.length === 0) {
        spaceEl.innerHTML = '<div style="color: #95a5a6; padding: 10px; font-size: 13px;">過去の履歴はありません。</div>';
        return event;
      }

      // チェックボックスの配列に特定の値が含まれているか判定するヘルパー関数
      const hasValue = (rec, fieldCode, val) => {
        const field = rec[fieldCode];
        if (!field || !field.value || !Array.isArray(field.value)) return false;
        return field.value.includes(val);
      };

      const escapeHtml = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const htmlParts = [];
      
      htmlParts.push(`
        <div class="qh-container">
          <details class="qh-details">
            <summary class="qh-summary">人物情報（履歴 ${records.length}件）</summary>
            <div class="qh-table-wrapper">
              <table class="qh-table">
                <thead>
                  <tr>
                    <th rowspan="2" class="qh-col-ticket">チケット</th>
                    <th rowspan="2" class="qh-col-date">申込日</th>
                    <th rowspan="2">申込者</th>
                    <th rowspan="2">申込者<br>補足</th>
                    <th colspan="7">申込者の特徴</th>
                  </tr>
                  <tr>
                    <th>既読にな<br>らない</th>
                    <th>電話が繫<br>りにくい</th>
                    <th>長電話に<br>なり易い</th>
                    <th>話が噛み<br>合わない</th>
                    <th>直前にキ<br>ャンセル</th>
                    <th>無断でキ<br>ャンセル</th>
                    <th class="qh-col-memo">メモ</th>
                  </tr>
                </thead>
                <tbody>
      `);

      records.forEach(r => {
        const id = r.$id.value;
        const url = window.location.pathname + '?record=' + id;
        
        // 現在開いているレコードかどうかの判定
        const isCurrent = (id === String(currentId));
        const ticketDisplay = isCurrent ? '<span class="qh-current-ticket">このチケット</span>' : `<a href="${url}" target="_blank" class="qh-ticket-link" title="レコード詳細を開く">🎫</a>`;

        const createdDate = new Date(r['作成日時'].value);
        const y = createdDate.getFullYear();
        const m = String(createdDate.getMonth() + 1).padStart(2, '0');
        const d = String(createdDate.getDate()).padStart(2, '0');
        const dateStr = `${y}/${m}/${d}`;
        
        const applicant = escapeHtml(r['申込者']?.value);
        const supplement = escapeHtml(r['申込者補足']?.value);
        
        const checkUnread = hasValue(r, '共通評価', 'メールが既読にならない') ? '🔴' : '';
        const checkPhone = hasValue(r, '共通評価', '電話が繫がりにくい') ? '🔴' : '';
        const checkLongCall = hasValue(r, '共通評価', '長電話になりやすい') ? '🔴' : '';
        const checkTalk = hasValue(r, '共通評価', '話が噛み合いにくい') ? '🔴' : '';
        const checkCancel1 = hasValue(r, '共通評価', '直前に受診キャンセル') ? '🔴' : '';
        const checkCancel2 = hasValue(r, '共通評価', '無断で受診キャンセル') ? '🔴' : '';
        
        const memo = escapeHtml(r['人物メモ']?.value).replace(/\n/g, '<br>');

        htmlParts.push(`
          <tr${isCurrent ? ' style="background-color: #e3f2fd;"' : ''}>
            <td class="qh-col-ticket">${ticketDisplay}</td>
            <td class="qh-col-date">${dateStr}</td>
            <td>${applicant}</td>
            <td>${supplement}</td>
            <td>${checkUnread}</td>
            <td>${checkPhone}</td>
            <td>${checkLongCall}</td>
            <td>${checkTalk}</td>
            <td>${checkCancel1}</td>
            <td>${checkCancel2}</td>
            <td class="qh-col-memo">${memo}</td>
          </tr>
        `);
      });

      htmlParts.push(`
                </tbody>
              </table>
            </div>
          </details>
        </div>
      `);

      spaceEl.innerHTML = htmlParts.join('');

    } catch (e) {
      console.error('[QuickHistory] Error:', e);
      spaceEl.innerHTML = '<div style="color: #e74c3c; padding: 10px; font-size: 13px;">過去の履歴の取得に失敗しました。</div>';
    }

    return event;
  });

})();