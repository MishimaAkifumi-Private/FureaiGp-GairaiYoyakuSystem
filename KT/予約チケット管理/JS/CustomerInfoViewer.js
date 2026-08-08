/*
 * CustomerInfoViewer.js
 * スペースフィールド「CustomerInfo」内に、「患者情報・申込内容」、
 * 同一カルテNoの過去チケット履歴、および経過情報を統一されたカード形式で表示します。
 */
(function() {
  'use strict';

  // スタイルの追加
  const injectCustomerInfoStyles = () => {
    if (document.getElementById('customer-info-styles')) return;
    const style = document.createElement('style');
    style.id = 'customer-info-styles';
    style.textContent = `
      .ci-container {
        margin: 10px 0 20px 0;
        font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", Meiryo, sans-serif;
        width: 100%;
        max-width: 922px;
        box-sizing: border-box;
      }
      .ci-card {
        border: 1px solid #dcdfe6;
        border-radius: 6px;
        background-color: #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        overflow: hidden;
        width: 100%;
        max-width: 922px;
        box-sizing: border-box;
      }
      .ci-header {
        font-weight: bold;
        padding: 8px 14px;
        background-color: #2c3e50;
        color: #ffffff;
        font-size: 14px;
        letter-spacing: 0.5px;
      }
      .ci-content {
        padding: 16px;
        background-color: #fafbfc;
        box-sizing: border-box;
      }
      .ci-section-title {
        font-size: 13px;
        font-weight: bold;
        color: #1565c0;
        border-left: 4px solid #1565c0;
        padding-left: 8px;
        margin: 18px 0 8px 0;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ci-section-title:first-child {
        margin-top: 0;
      }
      .ci-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
        font-size: 12px;
        background-color: #ffffff;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        box-sizing: border-box;
      }
      .ci-table th, .ci-table td {
        border: 1px solid #e0e0e0;
        padding: 8px 10px;
        vertical-align: middle;
        line-height: 1.5;
      }
      .ci-table th {
        background-color: #f4f6f8;
        color: #475569;
        font-weight: 600;
        text-align: right;
        white-space: nowrap;
        width: 15%;
        min-width: 110px;
      }
      .ci-table td {
        color: #1e293b;
        background-color: #ffffff;
        word-break: break-word;
      }
      .ci-table td.ci-empty-val {
        color: #94a3b8;
        font-style: italic;
      }
      .ci-badge-value {
        display: inline-block;
        padding: 2px 8px;
        background-color: #e0f2fe;
        color: #0369a1;
        border-radius: 4px;
        font-weight: bold;
      }
      .ci-link {
        color: #2563eb;
        text-decoration: none;
      }
      .ci-link:hover {
        text-decoration: underline;
      }

      /* 過去履歴用テーブルスタイル */
      .ci-history-wrapper {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow-x: auto;
        overflow-y: auto;
        max-height: 250px;
        background-color: #ffffff;
        margin-bottom: 12px;
      }
      .ci-history-table {
        border-collapse: collapse;
        width: 100%;
        font-size: 11px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      }
      .ci-history-table th, .ci-history-table td {
        border: 1px solid #e0e0e0;
        padding: 6px 8px !important;
        text-align: center;
        vertical-align: middle;
        line-height: 1.4;
      }
      .ci-history-table th {
        background-color: #f4f6f8;
        color: #555;
        font-weight: bold;
      }
      .ci-history-table td.ci-col-memo {
        text-align: left;
        min-width: 160px;
        word-break: break-word;
        line-height: 1.5;
        padding: 6px 10px !important;
      }
      .ci-ticket-open-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #2563eb;
        font-weight: bold;
        text-decoration: none;
        padding: 2px 6px;
        border-radius: 4px;
        background-color: #eff6ff;
        border: 1px solid #bfdbfe;
        transition: background-color 0.15s ease;
      }
      .ci-ticket-open-btn:hover {
        background-color: #dbeafe;
        text-decoration: underline;
      }
      .ci-current-ticket-badge {
        font-weight: bold; 
        font-size: 6.5px;
        color: #1565c0;
        background-color: #e3f2fd;
        border: 1px solid #90caf9;
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
        display: inline-block;
      }

      /* 経過情報サブテーブル用スタイル */
      .ci-progress-wrapper {
        overflow-x: auto;
        background-color: #ffffff;
        margin-bottom: 12px;
      }
      .ci-progress-table {
        border-collapse: collapse;
        width: 100%;
        font-size: 11px;
      }
      .ci-progress-table th, .ci-progress-table td {
        border: 1px solid #e0e0e0;
        padding: 6px 10px;
        text-align: center;
        vertical-align: middle;
        line-height: 1.4;
      }
      .ci-progress-table th {
        background-color: #f4f6f8;
        color: #475569;
        font-weight: 600;
      }
      .ci-progress-table td.ci-reason-cell {
        text-align: left;
        color: #1e293b;
      }
    `;
    document.head.appendChild(style);
  };

  // HTMLエスケープヘルパー
  const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // 値が存在する場合のフォーマット
  const valOrDash = (val, formatFn = null) => {
    if (!val || (typeof val === 'string' && !val.trim())) {
      return '<span class="ci-empty-val">-</span>';
    }
    const escaped = escapeHtml(val);
    return formatFn ? formatFn(escaped) : escaped;
  };

  // チェックボックス判定ヘルパー
  const hasValue = (rec, fieldCode, val) => {
    const field = rec[fieldCode];
    if (!field || !field.value || !Array.isArray(field.value)) return false;
    return field.value.includes(val);
  };

  // ステータスバッジの背景色取得
  const getStatusColor = (st) => {
    switch (st) {
      case '未着手': return '#94a3b8';
      case '担当設定': return '#3b82f6';
      case '要電話対応': return '#ea580c';
      case 'メール送信済': return '#f59e0b';
      case 'メール既読': return '#10b981';
      case '電話合意済': return '#16a34a';
      case '閲覧期限切れ': return '#dc2626';
      case '申込者再依頼': return '#8b5cf6';
      case 'スタッフ取下':
      case 'WEB取下':
      case '終了':
      case '強制終了':
      case 'キャンセル': return '#64748b';
      default: return '#3b82f6';
    }
  };

  // URLおよびチケットIDの自動ハイパーリンク化ヘルパー (別タブ target="_blank" で開く)
  const linkify = (text) => {
    if (!text || !text.trim()) return '<span class="ci-empty-val">-</span>';
    let escaped = escapeHtml(text);
    
    // 1. URLの自動ハイパーリンク化
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    escaped = escaped.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" class="ci-link" rel="noopener noreferrer">${url}</a>`;
    });

    // 2. チケットID (例: ID:82, ID: 82, 83, 比較対象チケットID:82, [複数の用件を短期間に依頼:82]) の自動ハイパーリンク化
    const appBaseUrl = location.protocol + '//' + location.host + location.pathname.replace(/\/(show|edit).*/, '/');
    const ticketBlockRegex = /(ID[:：\s]*|チケットID[:：\s]*|[:：])([\d\s,]+)/gi;
    escaped = escaped.replace(ticketBlockRegex, (match, prefix, idListStr) => {
      const linkedIds = idListStr.replace(/\b(\d+)\b/g, (id) => {
        const url = `${appBaseUrl}show#record=${id}`;
        return `<a href="${url}" target="_blank" class="ci-link" rel="noopener noreferrer" style="color:#3b82f6; text-decoration:underline; font-weight:bold;">${id}</a>`;
      });
      return prefix + linkedIds;
    });

    return escaped.replace(/\n/g, '<br>');
  };

  // Kintoneイベント登録
  kintone.events.on(['app.record.detail.show'], async function(event) {
    const spaceEl = kintone.app.record.getSpaceElement('CustomerInfo');
    if (!spaceEl) return event;

    spaceEl.style.maxWidth = '922px';
    spaceEl.style.width = '100%';

    injectCustomerInfoStyles();

    const record = event.record;
    const currentId = kintone.app.record.getId();

    // フィールド値の取得
    const getV = (code) => (record[code] ? record[code].value : '');

    // 氏名の組み立て
    const lastNameKanji = getV('姓漢字');
    const firstNameKanji = getV('名漢字');
    const fullNameKanji = (lastNameKanji || firstNameKanji) ? `${lastNameKanji} ${firstNameKanji}`.trim() : '';

    const lastNameKana = getV('姓かな');
    const firstNameKana = getV('名かな');
    const fullNameKana = (lastNameKana || firstNameKana) ? `${lastNameKana} ${firstNameKana}`.trim() : '';

    // 住所の組み立て
    const postalCode = getV('postal_code') || getV('郵便番号');
    const address = getV('住所');
    const addressSub = getV('丁目番地等');
    const building = getV('建物');
    let fullAddress = '';
    if (postalCode) fullAddress += `〒${postalCode} `;
    fullAddress += `${address} ${addressSub} ${building}`.trim();

    // 申込者・補足
    const applicant = getV('申込者');
    const applicantSub = getV('申込者補足');
    const applicantText = applicant ? `${applicant}${applicantSub ? `（${applicantSub}）` : ''}` : '';

    // 希望日時の抽出（第1〜第5）
    const wishes = [
      getV('第1希望日時'),
      getV('第2希望日時'),
      getV('第3希望日時'),
      getV('第4希望日時'),
      getV('第5希望日時')
    ].filter(w => w && w.trim());

    // --- 1. 同一カルテNoの過去チケット履歴の生成 ---
    const chartNo = getV('カルテNo');
    let historyHtml = '<div style="color: #94a3b8; font-style: italic; font-size: 12px;">過去の履歴はありません。</div>';
    let historyCount = 0;

    if (chartNo) {
      try {
        const query = `カルテNo = "${chartNo}" order by 作成日時 desc limit 10`;
        const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
          app: kintone.app.getId(),
          query: query,
          fields: ['$id', '作成日時', '用件', '診療科', '対応方法', '申込者', '申込者補足', '共通評価', '人物メモ', '管理状況']
        });

        const historyRecords = resp.records || [];
        historyCount = historyRecords.length;

        if (historyRecords.length > 0) {
          const rows = historyRecords.map(r => {
            const id = r.$id.value;
            const url = window.location.pathname + '?record=' + id;
            const isCurrent = (id === String(currentId));
            const status = r['管理状況']?.value;
            const isActive = !['終了', '強制終了', 'キャンセル', 'URL取下', 'スタッフ取下', 'WEB取下'].includes(status);
            const memoStr = r['人物メモ']?.value || '';
            const hasConfirmedDup = memoStr.includes('[複数の用件を短期間に依頼:');

            let activeLabel = '';
            let rowStyle = '';
            if (isCurrent) {
              rowStyle = '';
            } else if (isActive) {
              if (!hasConfirmedDup) {
                activeLabel = '<br><span style="background-color: #ef4444; color: white; font-size: 9px; padding: 1px 4px; border-radius: 3px; white-space: nowrap;">同時進行中</span>';
                rowStyle = ' style="background-color: #fef2f2;"';
              } else {
                activeLabel = '<br><span style="background-color: #10b981; color: white; font-size: 9px; padding: 1px 4px; border-radius: 3px; white-space: nowrap;">別件進行中</span>';
                rowStyle = ' style="background-color: #ecfdf5;"';
              }
            }

            // 「このチケット」以外の過去チケットは別タブ(_blank)で開くリンクを表示（シンプルに管理番号のみ）
            const ticketDisplay = isCurrent 
              ? '<span class="ci-current-ticket-badge">本チケット</span>' 
              : `<a href="${url}" target="_blank" style="color: #3498db; text-decoration: underline; font-weight: bold;" title="チケット詳細を別タブで開く">${id}</a>`;

            const statusStr = escapeHtml(status) || '-';

            const createdDate = new Date(r['作成日時'].value);
            const y = createdDate.getFullYear();
            const m = String(createdDate.getMonth() + 1).padStart(2, '0');
            const d = String(createdDate.getDate()).padStart(2, '0');
            const dateStr = `${y}/${m}/${d}`;

            const purpose = escapeHtml(r['用件']?.value) || '-';

            // 診療科の「診療分野/」省略処理
            let rawDept = r['診療科']?.value || '';
            if (rawDept.includes('/')) {
              const parts = rawDept.split('/');
              rawDept = parts[parts.length - 1].trim();
            }
            const dept = escapeHtml(rawDept) || '-';

            // 対応方法判定（絵文字のみ表示）
            const rawMethod = r['対応方法']?.value || '';
            let methodEmoji = '-';
            if (rawMethod.includes('電話') || status === '電話合意済' || status === '要電話対応') {
              methodEmoji = '<span title="電話対応" style="font-size:13px;">📞</span>';
            } else if (rawMethod.includes('メール') || (status && status.includes('メール'))) {
              methodEmoji = '<span title="メール対応" style="font-size:13px;">✉️</span>';
            } else if (rawMethod) {
              methodEmoji = escapeHtml(rawMethod);
            }

            const recApplicant = escapeHtml(r['申込者']?.value);
            const recSupplement = escapeHtml(r['申込者補足']?.value);

            const checkUnread = hasValue(r, '共通評価', 'メールが既読にならない') ? '🔴' : '';
            const checkPhone = hasValue(r, '共通評価', '電話が繫がりにくい') ? '🔴' : '';
            const checkLongCall = hasValue(r, '共通評価', '長電話になりやすい') ? '🔴' : '';
            const checkTalk = hasValue(r, '共通評価', '話が噛み合いにくい') ? '🔴' : '';
            const checkCancel1 = hasValue(r, '共通評価', '直前に受診キャンセル') ? '🔴' : '';
            const checkCancel2 = hasValue(r, '共通評価', '無断で受診キャンセル') ? '🔴' : '';

            const memo = linkify(r['人物メモ']?.value);

            return `
              <tr${rowStyle}>
                <td style="white-space:nowrap; text-align:center;">${ticketDisplay}</td>
                <td style="white-space:nowrap;">${purpose}</td>
                <td style="white-space:nowrap; text-align:center;">${statusStr}</td>
                <td style="white-space:nowrap;">${dateStr}</td>
                <td style="white-space:nowrap; text-align:center;">${dept}</td>
                <td style="white-space:nowrap; text-align:center;">${methodEmoji}</td>
                <td style="white-space:nowrap;">${recApplicant}</td>
                <td style="white-space:nowrap;">${recSupplement}</td>
                <td>${checkUnread}</td>
                <td>${checkPhone}</td>
                <td>${checkLongCall}</td>
                <td>${checkTalk}</td>
                <td>${checkCancel1}</td>
                <td>${checkCancel2}</td>
                <td class="ci-col-memo">${memo}</td>
              </tr>
            `;
          }).join('');

          historyHtml = `
            <div class="ci-history-wrapper">
              <table class="ci-history-table">
                <thead>
                  <tr>
                    <th rowspan="2" style="width:60px; white-space:nowrap;">チケット</th>
                    <th rowspan="2" style="width:70px; white-space:nowrap;">用件</th>
                    <th rowspan="2" style="width:85px; white-space:nowrap;">管理状況</th>
                    <th rowspan="2" style="width:70px; white-space:nowrap;">申込日</th>
                    <th rowspan="2" style="width:105px; white-space:nowrap;">診療科</th>
                    <th rowspan="2" style="width:70px; white-space:nowrap;" title="対応方法">対応方法</th>
                    <th rowspan="2" style="width:50px; white-space:nowrap;">申込者</th>
                    <th rowspan="2" style="width:50px; white-space:nowrap;">補足</th>
                    <th colspan="6">申込者の特徴・注意点</th>
                    <th rowspan="2" style="min-width:160px;">メモ</th>
                  </tr>
                  <tr>
                    <th style="white-space:nowrap; padding: 4px 1px; font-size: 9.5px; width: 32px; cursor:help;" title="未既読：送付したメールが既読にならない。迷惑メールになっていたり、IT関係の操作に不慣れの可能性あり。">未既読</th>
                    <th style="white-space:nowrap; padding: 4px 1px; font-size: 9.5px; width: 32px; cursor:help;" title="不通：なかなか電話がつながらない。すぐ留守電になるなど、連絡がとれない、あるいはとりにくい。">不通</th>
                    <th style="white-space:nowrap; padding: 4px 1px; font-size: 9.5px; width: 32px; cursor:help;" title="長電話：必要性の低い会話を続ける傾向がある。">長電話</th>
                    <th style="white-space:nowrap; padding: 4px 1px; font-size: 9.5px; width: 32px; cursor:help;" title="不一致：会話が伝わりにくい、かみ合わないにくい。">不一致</th>
                    <th style="white-space:nowrap; padding: 4px 1px; font-size: 9.5px; width: 32px; cursor:help;" title="直キャン：診察予定日時の直近になって急にキャンセルとなった。">直キャン</th>
                    <th style="white-space:nowrap; padding: 4px 1px; font-size: 9.5px; width: 32px; cursor:help;" title="無キャン：診療予定日時が過ぎても来院せず無断キャンセルとなった。">無キャン</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>
          `;
        }
      } catch (e) {
        console.error('[CustomerInfoViewer] History load error:', e);
        historyHtml = '<div style="color: #ef4444; font-size: 12px;">履歴データの取得に失敗しました。</div>';
      }
    }

    // --- 2. 経過情報サブテーブルの生成 (独自デザイン) ---
    const progressField = record['経過情報'];
    const progressRows = (progressField && progressField.value) ? progressField.value : [];
    let progressHtml = '<div style="color: #94a3b8; font-style: italic; font-size: 12px;">経過情報はありません。</div>';
    
    if (progressRows.length > 0) {
      const pRows = progressRows.map(row => {
        const pDate = escapeHtml(row.value['経過情報_日時']?.value);
        const pStaff = escapeHtml(row.value['経過情報_担当者']?.value);
        const pStatus = escapeHtml(row.value['経過情報_管理状態']?.value);
        const rawReason = row.value['経過情報_理由']?.value;

        const reasonHtml = linkify(rawReason);

        return `
          <tr>
            <td style="width: 140px; white-space: nowrap;">${pDate || '-'}</td>
            <td style="width: 90px; color: #1e293b;">${pStaff || '-'}</td>
            <td style="width: 110px; color: #1e293b;">${pStatus || '-'}</td>
            <td class="ci-reason-cell">${reasonHtml}</td>
          </tr>
        `;
      }).join('');

      progressHtml = `
        <div class="ci-progress-wrapper">
          <table class="ci-progress-table">
            <thead>
              <tr>
                <th style="width: 140px;">対応日時</th>
                <th style="width: 90px;">担当者</th>
                <th style="width: 110px;">管理状態</th>
                <th>対応内容・理由・備考</th>
              </tr>
            </thead>
            <tbody>
              ${pRows}
            </tbody>
          </table>
        </div>
      `;
    }

    // --- 3. 全体HTML組み立て ---
    let html = `
      <div class="ci-container">
        <div class="ci-card">
          <div class="ci-header">患者情報・申込内容</div>
          <div class="ci-content">

            <!-- セクション1: 診療先・予約基本情報 -->
            <div class="ci-section-title">🏥 診療先・予約基本情報</div>
            <table class="ci-table">
              <tr>
                <th>施設名</th>
                <td>${valOrDash(getV('施設名'))}</td>
                <th>診療科</th>
                <td>${valOrDash(getV('診療科'), v => `<span class="ci-badge-value">${v}</span>`)}</td>
              </tr>
              <tr>
                <th>担当医師</th>
                <td>${valOrDash(getV('担当医師'))}</td>
                <th>予約日時（入力）</th>
                <td>${valOrDash(getV('予約日時'))}</td>
              </tr>
            </table>

            <!-- セクション2: 希望条件 -->
            <div class="ci-section-title">🗓️ 希望条件</div>
            <table class="ci-table">
              <tr>
                <th>希望指定方法</th>
                <td>${valOrDash(getV('希望指定方法'))}</td>
                <th>おまかせ時間帯</th>
                <td>${valOrDash(getV('おまかせ希望時間帯'))}</td>
              </tr>
              <tr>
                <th>希望日時一覧</th>
                <td colspan="3">
                  ${wishes.length > 0 ? 
                    wishes.map((w, idx) => `<div><b>第${idx + 1}希望:</b> ${escapeHtml(w)}</div>`).join('') 
                    : '<span class="ci-empty-val">希望日時の指定なし</span>'}
                </td>
              </tr>
            </table>

            <!-- セクション3: 患者基本情報 -->
            <div class="ci-section-title">👤 患者情報</div>
            <table class="ci-table">
              <tr>
                <th>カルテNo</th>
                <td>${valOrDash(getV('カルテNo'), v => `<b>${v}</b>`)}</td>
                <th>性別 / 生年月日</th>
                <td>${valOrDash(getV('性別'))} / ${valOrDash(getV('生年月日'))}</td>
              </tr>
              <tr>
                <th>患者氏名</th>
                <td><b>${valOrDash(fullNameKanji)}</b> ${fullNameKana ? `(${escapeHtml(fullNameKana)})` : ''}</td>
                <th>申込者</th>
                <td>${valOrDash(applicantText)}</td>
              </tr>
              <tr>
                <th>住所</th>
                <td colspan="3">${valOrDash(fullAddress)}</td>
              </tr>
              <tr>
                <th>電話番号1</th>
                <td>${valOrDash(getV('電話1'), v => `<a href="tel:${v}" class="ci-link">📞 ${v}</a>`)}</td>
                <th>電話番号2</th>
                <td>${valOrDash(getV('電話2'), v => `<a href="tel:${v}" class="ci-link">📞 ${v}</a>`)}</td>
              </tr>
              <tr>
                <th>連絡希望時間帯</th>
                <td>${valOrDash(getV('連絡時間帯'))}</td>
                <th>メールアドレス</th>
                <td>${valOrDash(getV('メールアドレス'), v => `<a href="mailto:${v}" class="ci-link">✉️ ${v}</a>`)}</td>
              </tr>
            </table>

            <!-- セクション4: この患者の特徴等 (同一カルテNo履歴) -->
            <div class="ci-section-title">📜 この患者の特徴等（直近10件まで）</div>
            ${historyHtml}

            <!-- セクション5: 付帯情報・症状 -->
            <div class="ci-section-title">📋 付帯情報・症状</div>
            <table class="ci-table">
              <tr>
                <th>紹介元医療機関</th>
                <td>${valOrDash(getV('紹介元医療機関名'))} ${getV('紹介元医療機関電話番号') ? `(TEL: ${escapeHtml(getV('紹介元医療機関電話番号'))})` : ''}</td>
                <th>持参画像CD</th>
                <td>${valOrDash(getV('持参画像CD'))}</td>
              </tr>
              <tr>
                <th>症状</th>
                <td colspan="3" style="white-space: pre-wrap;">${valOrDash(getV('症状'))}</td>
              </tr>
              <tr>
                <th>理由・補足</th>
                <td colspan="3" style="white-space: pre-wrap;">${valOrDash(getV('理由'))}</td>
              </tr>
            </table>

            <!-- セクション6: その他 -->
            <div class="ci-section-title">📝 その他</div>
            <table class="ci-table">
              <tr>
                <th>個人情報同意</th>
                <td style="width: 120px; white-space: nowrap;">${valOrDash(getV('個人情報同意'))}</td>
                <th>備考</th>
                <td>${valOrDash(getV('その他備考') || getV('備考'))}</td>
              </tr>
            </table>

            <!-- セクション7: チケット対応経過情報 (サブテーブル) -->
            <div class="ci-section-title">⏱️ チケット対応経過情報</div>
            ${progressHtml}

          </div>
        </div>
      </div>
    `;

    spaceEl.innerHTML = html;

    // kintone標準サブテーブル（経過情報など）のテキスト要素に対してもチケットIDのハイパーリンク化を適用
    setTimeout(() => {
      const appBaseUrl = location.protocol + '//' + location.host + location.pathname.replace(/\/(show|edit).*/, '/');
      const cells = document.querySelectorAll('.subtable-gaia td');
      cells.forEach(td => {
        const text = td.innerText || td.textContent;
        if (text && (text.includes('ID:') || text.includes('ID：') || text.includes('比較対象チケットID') || text.includes('関連チケットID') || text.includes('複数の用件を短期間に依頼'))) {
          if (!td.querySelector('a')) {
            const ticketBlockRegex = /(ID[:：\s]*|チケットID[:：\s]*|[:：])([\d\s,]+)/gi;
            const html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(ticketBlockRegex, (match, prefix, idListStr) => {
              const linkedIds = idListStr.replace(/\b(\d+)\b/g, (id) => {
                const url = `${appBaseUrl}show#record=${id}`;
                return `<a href="${url}" target="_blank" style="color:#3b82f6; text-decoration:underline; font-weight:bold;">${id}</a>`;
              });
              return prefix + linkedIds;
            }).replace(/\n/g, '<br>');
            td.innerHTML = html;
          }
        }
      });
    }, 600);

    return event;
  });
})();
