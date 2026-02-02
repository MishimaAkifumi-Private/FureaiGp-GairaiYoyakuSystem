/**
 * ReservationControlBoard.js
 * 予約管理ダッシュボード (RreservationContorlBoard)
 * 
 * [機能]
 * - 管理状況・対応方法の常時表示（バッジ）
 * - 用件に応じた対応方法選択（ラジオボタン）
 * - 確定予約日時の編集（サブエレメントとして統合）
 */

(function() {
    'use strict';
  
    const CONFIG = {
      SPACE_ID: 'RreservationContorlBoard',
      RESET_SPACE_ID: 'TicketReset',
      API_URL: 'https://sendreservationmail-yoslzibmlq-uc.a.run.app',
      CONFIRM_BASE_URL: 'https://confirmreservation-yoslzibmlq-uc.a.run.app',
      STATUS_SENT_VALUE: 'メール送信済', // 送信後のステータス
      STATUS_READ_VALUE: 'メール既読', // 既読後のステータス
      STATUS_TIMEOUT_VALUE: '閲覧期限切れ', // タイムアウト後のステータス
      STATUS_RE_REQUEST_VALUE: '申込者再依頼', // 再依頼ステータス
      STATUS_PHONE_VALUE: '電話合意済', // 電話合意後のステータス
      STATUS_WITHDRAWN_VALUE: 'スタッフ取下', // 取下後のステータス
      STATUS_WEB_WITHDRAWN_VALUE: 'WEB取下', // WEB取下後のステータス
      STATUS_REVIVED_VALUE: 'スタッフ取下中止', // 取消中止後のステータス
      TIMEOUT_MINUTES: 1, // タイムアウト時間 (分) - テスト用
      FIELDS: {
        STATUS: '管理状況',       // 管理状況
        METHOD: '対応方法',       // 対応方法
        PURPOSE: '用件',          // 用件
        RES_DATE: '確定予約日',   // 確定予約日
        RES_TIME: '確定予約時刻', // 確定予約時刻
        TIMEOUT: 'タイムアウト',  // タイムアウト時間
        SEND_DATE: 'メール送信日時',
        CANCEL_EXECUTOR: 'キャンセル実行者',
        CANCEL_DATE: 'キャンセル日時',
        PHONE_CONFIRM: '電話確認日時',
        NOTE: '備考',
        READ_DATE: 'メール既読日時', // 既読日時フィールドを追加
        EMAIL: 'メールアドレス',
        LAST_NAME: '姓漢字',
        FIRST_NAME: '名漢字',
        DEPT: '診療科',
        STAFF: '担当者',
        URL_TOKEN: 'URLトークン' // URLトークンフィールド
      },
      // 予約時刻の選択肢
      ALLOWED_TIMES: [
        '9:00', '9:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
      ]
    };
  
    // スタイル定義
    const STYLES = `
      .rcb-container {
        background-color: #f5f7f9;
        border: 1px solid #dcdfe6;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        font-family: "Helvetica Neue", Arial, sans-serif;
        color: #333;
      }
      /* ステータス別スタイル */
      .rcb-container.status-sent {
        border-left: 5px solid #e67e22;
        background-color: #fffcf5;
      }
      .rcb-container.status-phone {
        border-left: 5px solid #27ae60;
        background-color: #f0f9eb;
      }
      .rcb-container.status-withdrawn {
        border-left: 5px solid #7f8c8d;
        background-color: #f9f9f9;
      }
      .rcb-header {
        display: flex;
        gap: 15px;
        margin-bottom: 20px;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 15px;
      }
      .rcb-badge {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        background: #fff;
        padding: 8px 15px;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border-left: 5px solid #3498db;
        min-width: 120px;
      }
      .rcb-badge-label {
        font-size: 10px;
        color: #888;
        font-weight: bold;
        margin-bottom: 2px;
      }
      .rcb-badge-value {
        font-size: 16px;
        font-weight: bold;
        color: #2c3e50;
      }
      .rcb-content {
        background: #fff;
        border-radius: 6px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .rcb-section {
        margin-bottom: 20px;
      }
      .rcb-section-title {
        font-size: 14px;
        font-weight: bold;
        color: #555;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
      }
      .rcb-section-title::before {
        content: '';
        display: inline-block;
        width: 4px;
        height: 16px;
        background-color: #3498db;
        margin-right: 8px;
        border-radius: 2px;
      }
      .rcb-radio-group {
        display: flex;
        gap: 20px;
      }
      .rcb-radio-label {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 10px 15px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        transition: all 0.2s;
      }
      .rcb-radio-label:hover {
        background-color: #f0f9eb;
        border-color: #c2e7b0;
      }
      .rcb-radio-label input {
        margin-right: 8px;
      }
      .rcb-radio-label.checked {
        background-color: #f0f9eb;
        border-color: #67c23a;
        color: #67c23a;
        font-weight: bold;
      }
      
      /* Date Editor Styles */
      .rcb-date-editor {
        background-color: #fafafa;
        border: 1px solid #eee;
        padding: 15px;
        border-radius: 6px;
      }
      .rcb-input-row {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
        flex-wrap: wrap;
      }
      .rcb-date-input {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
      }
      .rcb-time-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
        gap: 8px;
        width: 100%;
      }
      .rcb-time-btn {
        padding: 6px 0;
        border: 1px solid #ddd;
        background: #fff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        text-align: center;
        transition: all 0.2s;
      }
      .rcb-time-btn:hover {
        background-color: #e6f7ff;
        border-color: #1890ff;
      }
      .rcb-time-btn.selected {
        background-color: #1890ff;
        color: white;
        border-color: #1890ff;
        font-weight: bold;
      }
      .rcb-btn-save {
        background-color: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      .rcb-btn-save:hover {
        background-color: #2980b9;
      }
      .rcb-message {
        margin-top: 10px;
        font-size: 12px;
        color: #67c23a;
        font-weight: bold;
        display: none;
      }
      
      /* Modal Styles */
      .rcb-modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex; justify-content: center; align-items: center;
        opacity: 0; transition: opacity 0.3s ease;
      }
      .rcb-modal {
        background: #fff;
        width: 400px; max-width: 90%;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        overflow: hidden;
        transform: translateY(-20px); transition: transform 0.3s ease;
        font-family: "Helvetica Neue", Arial, sans-serif;
      }
      .rcb-modal-header {
        padding: 15px 20px;
        font-weight: bold;
        font-size: 16px;
        color: #fff;
        display: flex; align-items: center; gap: 10px;
      }
      .rcb-modal-body {
        padding: 25px 20px;
        color: #333;
        line-height: 1.6;
        font-size: 14px;
      }
      .rcb-modal-footer {
        padding: 0 20px 20px 20px;
        display: flex; justify-content: flex-end; gap: 10px;
      }
      .rcb-modal-btn {
        padding: 8px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;
      }
      .rcb-modal-btn-cancel {
        background: #f8f9fa; color: #555; border: 1px solid #ddd;
      }
      .rcb-modal-btn-ok {
        background: #3498db; color: #fff;
      }
      .rcb-modal-textarea {
        width: 100%; height: 80px; padding: 8px; margin-top: 10px;
        border: 1px solid #ddd; border-radius: 4px;
        box-sizing: border-box; font-family: inherit; font-size: 14px;
        resize: vertical;
      }
    `;
  
    // スタイル適用
    const applyStyles = () => {
      if (document.getElementById('rcb-styles')) return;
      const style = document.createElement('style');
      style.id = 'rcb-styles';
      style.textContent = STYLES;
      document.head.appendChild(style);
    };
  
    // 独自モーダル表示関数
    const showDialog = (message, type = 'alert', title = null, placeholder = '', okLabel = null) => {
      return new Promise((resolve) => {
        const existing = document.getElementById('rcb-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'rcb-modal-overlay';
        overlay.className = 'rcb-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'rcb-modal';
        
        let headerTitle = title;
        let headerIcon = '';
        if (!headerTitle) {
            headerTitle = (type === 'confirm' || type === 'prompt') ? '確認' : (type === 'error' ? 'エラー' : '通知');
        }
        if (type === 'confirm' || type === 'prompt') headerIcon = '📧';
        else if (type === 'error') headerIcon = '❌';
        else headerIcon = 'ℹ️';

        const header = document.createElement('div');
        header.className = 'rcb-modal-header';
        header.style.backgroundColor = (type === 'confirm' || type === 'prompt') ? '#3498db' : (type === 'error' ? '#e74c3c' : '#27ae60');
        header.innerHTML = `<span>${headerIcon}</span> <span>${headerTitle}</span>`;
        
        const body = document.createElement('div');
        body.className = 'rcb-modal-body';
        body.innerHTML = message.replace(/\n/g, '<br>');
        
        let textarea = null;
        if (type === 'prompt') {
            textarea = document.createElement('textarea');
            textarea.className = 'rcb-modal-textarea';
            textarea.placeholder = placeholder;
            body.appendChild(textarea);
        }

        const footer = document.createElement('div');
        footer.className = 'rcb-modal-footer';
        
        const createBtn = (text, cls, valResolver) => {
          const btn = document.createElement('button');
          btn.className = `rcb-modal-btn ${cls}`;
          btn.textContent = text;
          btn.onclick = () => {
            const val = typeof valResolver === 'function' ? valResolver() : valResolver;
            document.body.removeChild(overlay);
            resolve(val);
          };
          return btn;
        };

        if (type === 'confirm') {
          footer.appendChild(createBtn('キャンセル', 'rcb-modal-btn-cancel', false));
          footer.appendChild(createBtn(okLabel || 'はい', 'rcb-modal-btn-ok', true));
        } else if (type === 'prompt') {
          footer.appendChild(createBtn('キャンセル', 'rcb-modal-btn-cancel', null));
          footer.appendChild(createBtn('OK', 'rcb-modal-btn-ok', () => textarea.value));
        } else {
          footer.appendChild(createBtn(okLabel || 'OK', 'rcb-modal-btn-ok', true));
        }
        
        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        setTimeout(() => { overlay.style.opacity = '1'; modal.style.transform = 'translateY(0)'; }, 10);
        if (textarea) textarea.focus();
      });
    };

    // API更新ヘルパー
    const updateRecord = async (recordId, payload) => {
      try {
        await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
          app: kintone.app.getId(),
          id: recordId,
          record: payload
        });
        return true;
      } catch (e) {
        console.error('Update failed:', e);
        showDialog('更新に失敗しました: ' + e.message, 'error');
        return false;
      }
    };
  
    // 日付フォーマット (YYYY-MM-DD)
    const formatDateISO = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // 過去時刻チェック (本日かつ現在時刻以前ならtrue)
    const isPastTime = (dateStr, timeStr) => {
      if (!dateStr) return false;
      const now = new Date();
      const todayStr = formatDateISO(now);
      if (dateStr !== todayStr) return false; // 本日以外はチェックしない

      const nowH = now.getHours();
      const nowM = now.getMinutes();
      const [tH, tM] = timeStr.split(':').map(Number);

      if (tH < nowH) return true;
      if (tH === nowH && tM <= nowM) return true;
      return false;
    };

    // メイン描画処理
    const renderBoard = (spaceElement, record) => {
      spaceElement.innerHTML = ''; // クリア
  
      const recordId = kintone.app.record.getId();
      
      // 現在の値を取得
      const currentStatus = record[CONFIG.FIELDS.STATUS]?.value || '未設定';
      let currentMethod = record[CONFIG.FIELDS.METHOD]?.value || '未設定';
  
      const purpose = record[CONFIG.FIELDS.PURPOSE]?.value || '';
      const currentDate = record[CONFIG.FIELDS.RES_DATE]?.value || '';
      const currentTime = record[CONFIG.FIELDS.RES_TIME]?.value || '';
      const sendDateVal = record[CONFIG.FIELDS.SEND_DATE]?.value || '';
      const staffName = record[CONFIG.FIELDS.STAFF]?.value;
      
      // 診療科入力用変数 (取消時用)
      let currentDeptInput = record[CONFIG.FIELDS.DEPT]?.value || '';

      // 担当者判定
      const currentStaff = localStorage.getItem('shinryo_ticket_staff_name') || localStorage.getItem('customKey');
      const urlToken = record[CONFIG.FIELDS.URL_TOKEN]?.value || '';
      const readDateVal = record[CONFIG.FIELDS.READ_DATE]?.value || '';
      const phoneDateVal = record[CONFIG.FIELDS.PHONE_CONFIRM]?.value || '';
      const timeoutVal = record[CONFIG.FIELDS.TIMEOUT]?.value || '2時間'; // デフォルト

      // 確定済みフラグ
      const isConfirmed = !!(currentDate && currentTime);
      // 送信済みフラグ
      const isSent = currentStatus === CONFIG.STATUS_SENT_VALUE;
      const isPhoneConfirmed = currentStatus === CONFIG.STATUS_PHONE_VALUE;
      const isWithdrawn = currentStatus === CONFIG.STATUS_WITHDRAWN_VALUE;
      const isWebWithdrawn = currentStatus === CONFIG.STATUS_WEB_WITHDRAWN_VALUE;
      const isRead = currentStatus === CONFIG.STATUS_READ_VALUE;
      const isTimeoutStatus = currentStatus === CONFIG.STATUS_TIMEOUT_VALUE;
      const isReRequest = currentStatus === CONFIG.STATUS_RE_REQUEST_VALUE;

      // 予約日時の確定/仮判定
      let isFixed = false;
      if (currentMethod === 'phone') {
          // 電話: メール送信済 or 電話合意済 or 既読 なら確定
          if (isSent || isPhoneConfirmed || isRead) isFixed = true;
      } else if (currentMethod === 'email') {
          // メール: 既読 or 電話合意済 なら確定
          if (isRead || isPhoneConfirmed) isFixed = true;
      }
      
      const reservationStatusLabel = isFixed ? '確定' : '仮';
      const reservationStatusColor = isFixed ? '#27ae60' : '#f39c12'; // 緑 / オレンジ
      const reservationDateLabel = isFixed ? '確定予約日時' : '仮予約日時';
  
      // コンテナ作成
      const container = document.createElement('div');
      container.className = 'rcb-content';
  
      // --- 1. ヘッダー (バッジ表示) ---
      const header = document.createElement('div');
      header.className = 'rcb-header';
      header.style.alignItems = 'center'; // アイコンとバッジの垂直位置合わせ
  
      const createBadge = (label, value, color) => {
        const badge = document.createElement('div');
        badge.className = 'rcb-badge';
        badge.style.backgroundColor = 'rgb(245, 245, 225)';
        if (color) badge.style.borderLeftColor = color;
        
        const lbl = document.createElement('div');
        lbl.className = 'rcb-badge-label';
        lbl.textContent = label;
        
        const val = document.createElement('div');
        val.className = 'rcb-badge-value';
        val.textContent = value;
        
        badge.appendChild(lbl);
        badge.appendChild(val);
        
        return badge;
      };
  

      // 対応方法アイコン (左上に大きく表示)
      const getMethodIconHtml = (val) => {
        if (val === 'phone' || val === '電話対応') {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" style="vertical-align: middle;"><path fill="none" stroke="currentColor" stroke-dasharray="62" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 3c0.5 0 2.5 4.5 2.5 5c0 1 -1.5 2 -2 3c-0.5 1 0.5 2 1.5 3c0.39 0.39 2 2 3 1.5c1 -0.5 2 -2 3 -2c0.5 0 5 2 5 2.5c0 2 -1.5 3.5 -3 4c-1.5 0.5 -2.5 0.5 -4.5 0c-2 -0.5 -3.5 -1 -6 -3.5c-2.5 -2.5 -3 -4 -3.5 -6c-0.5 -2 -0.5 -3 0 -4.5c0.5 -1.5 2 -3 4 -3Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="62;0"/><animateTransform attributeName="transform" dur="2.7s" keyTimes="0;0.035;0.07;0.105;0.14;0.175;0.21;0.245;0.28;1" repeatCount="indefinite" type="rotate" values="0 12 12;15 12 12;0 12 12;-12 12 12;0 12 12;12 12 12;0 12 12;-15 12 12;0 12 12;0 12 12"/></path></svg>`;
        }
        if (val === 'email' || val === 'メール対応') {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" style="vertical-align: middle;"><path fill="currentColor" fill-opacity="0" d="M12 11l-8 -5h16l-8 5Z"><animate fill="freeze" attributeName="fill-opacity" begin="0.9s" dur="0.4s" to="1"/></path><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="66" d="M4 5h16c0.55 0 1 0.45 1 1v12c0 0.55 -0.45 1 -1 1h-16c-0.55 0 -1 -0.45 -1 -1v-12c0 -0.55 0.45 -1 1 -1Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="66;0"/></path><path stroke-dasharray="24" stroke-dashoffset="24" d="M3 6.5l9 5.5l9 -5.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.3s" to="0"/></path></g></svg>`;
        }
        // デフォルト（未設定含む）は内部対応
        return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 512 512" style="fill: currentColor; vertical-align: middle;"><path d="M256 48C141.1 48 48 141.1 48 256v40c0 13.3-10.7 24-24 24S0 309.3 0 296v-40C0 114.6 114.6 0 256 0s256 114.6 256 256v144.1c0 48.6-39.4 88-88.1 88l-110.3-.1c-8.3 14.3-23.8 24-41.6 24h-32c-26.5 0-48-21.5-48-48s21.5-48 48-48h32c17.8 0 33.3 9.7 41.6 24l110.4.1c22.1 0 40-17.9 40-40V256c0-114.9-93.1-208-208-208M144 208h16c17.7 0 32 14.3 32 32v112c0 17.7-14.3 32-32 32h-16c-35.3 0-64-28.7-64-64v-48c0-35.3 28.7-64 64-64m224 0c35.3 0 64 28.7 64 64v48c0 35.3-28.7 64-64 64h-16c-17.7 0-32-14.3-32-32V240c0-17.7 14.3-32 32-32z"/></svg>`;
      };

      // 管理状況バッジ
      const statusBadge = createBadge('管理状況', currentStatus, '#e67e22');
      header.appendChild(statusBadge);

      const methodIconDiv = document.createElement('div');
      methodIconDiv.style.marginRight = '0px';
      methodIconDiv.style.lineHeight = '1';
      methodIconDiv.innerHTML = getMethodIconHtml(currentMethod);
      header.appendChild(methodIconDiv);

      // 担当者名
      if (staffName) {
        const staffDiv = document.createElement('div');
        staffDiv.style.fontSize = '26px';
        staffDiv.style.fontWeight = 'bold';
        staffDiv.style.color = '#2c3e50';
        staffDiv.textContent = staffName;
        header.appendChild(staffDiv);
      }

      // 用件別バッジ (右端)
      let purposeLabel = '';
      let purposeBg = '';

      if (purpose === '変更') {
          purposeLabel = '予約変更';
          purposeBg = '#3498db'; // 青
      } else if (purpose === '取消') {
          purposeLabel = '予約取消';
          purposeBg = '#e74c3c'; // 赤
      } else if (purpose === '初診') {
          purposeLabel = '初診予約';
          purposeBg = '#27ae60'; // 緑
      }

      if (purposeLabel) {
          const purposeBadge = document.createElement('div');
          purposeBadge.textContent = purposeLabel;
          purposeBadge.style.cssText = `margin-left: auto; background-color: ${purposeBg}; color: #fff; padding: 8px 20px; border-radius: 6px; font-size: 18px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.15);`;
          header.appendChild(purposeBadge);
      }

      container.appendChild(header);
  
      // --- 2. コンテンツ分岐 ---
      const isAssignedToMe = staffName && staffName === currentStaff;

      if (!isAssignedToMe) {
          // === 担当者以外の場合 ===
          // 未着手ならアサインボタンを表示
          if (currentStatus === '未着手') {
              const assignBtn = document.createElement('button');
              assignBtn.id = 'rcb-assign-staff-btn';
              assignBtn.innerText = currentStaff ? `私（${currentStaff}）がこのチケットを担当する` : '担当者設定が必要です';
              assignBtn.style.cssText = `
                  padding: 10px 24px;
                  background-color: #2c3e50;
                  color: #fff;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-weight: bold;
                  font-size: 14px;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                  transition: background-color 0.2s;
                  height: 60px;
                  width: 300px;
                  display: block;
                  margin: 20px auto;
              `;
              
              assignBtn.onmouseover = () => { assignBtn.style.backgroundColor = '#34495e'; };
              assignBtn.onmouseout = () => { assignBtn.style.backgroundColor = '#2c3e50'; };

              assignBtn.onclick = async () => {
                  if (!currentStaff) {
                      await showDialog('この端末には担当者が設定されていません。\nダッシュボード等で担当者を設定してください。', 'error');
                      return;
                  }

                  const doAssign = async () => {
                      assignBtn.disabled = true;
                      assignBtn.textContent = '処理中...';
                      
                      const updatePayload = {
                          [CONFIG.FIELDS.STAFF]: { value: currentStaff }
                      };

                      // 初めて担当が設定される場合のみステータスを更新
                      if (!staffName) {
                          updatePayload[CONFIG.FIELDS.STATUS] = { value: '担当設定' };
                      }

                      const success = await updateRecord(recordId, updatePayload);
                      if (success) {
                          await showDialog(`担当者を「${currentStaff}」に設定しました。`, 'success');
                          location.reload();
                      } else {
                          assignBtn.disabled = false;
                          assignBtn.textContent = '担当する';
                      }
                  };

                  if (staffName) {
                      const confirmed = await showDialog(
                          `すでに担当者「${staffName}」が設定されています。\n強制的に担当をあなた（${currentStaff}）に変更しますか？`,
                          'confirm',
                          '担当者変更',
                          '',
                          '強制的に自分が担当する'
                      );
                      if (confirmed) doAssign();
                  } else {
                      doAssign();
                  }
              };
              
              container.appendChild(assignBtn);
          }
          
          spaceElement.appendChild(container);
          return; // ここで終了（メイン機能は表示しない）
      }

      // === 担当者本人の場合 (以下、既存のメインロジック) ===

      // 取消完了メール送信処理
      const processCancelMail = async (targetDate, targetTime, inputDept) => {
          const email = record[CONFIG.FIELDS.EMAIL]?.value || '';
          const lastName = record[CONFIG.FIELDS.LAST_NAME]?.value || '';
          const firstName = record[CONFIG.FIELDS.FIRST_NAME]?.value || '';
          const fullName = `${lastName} ${firstName}`.trim();
          const dept = inputDept || record[CONFIG.FIELDS.DEPT]?.value || '';

          if (!dept) {
              await showDialog('診療科を入力してください。\n取消完了メールには診療科の記載が必要です。', 'error');
              return;
          }

          const confirmMsg = `
            以下の内容で取消完了メールを送信します。<br>よろしいですか？<br><br>
            <div style="background:#f9f9f9; padding:10px; border-radius:4px; text-align:left;">
              <strong>宛先:</strong> ${fullName} 様 (${email})<br>
              <strong>用件:</strong> ${purpose}<br>
              <strong>予約日時:</strong> ${targetDate} ${targetTime}<br>
              <strong>診療科:</strong> ${dept}<br>
              <hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;">
              <small>※送信後、レコードのステータスは「${CONFIG.STATUS_WEB_WITHDRAWN_VALUE}」に更新されます。</small>
            </div>
          `;

          const confirmed = await showDialog(confirmMsg, 'confirm', '送信確認');
          if (!confirmed) return;

          try {
            const payload = {
              to: email,
              name: fullName,
              type: '取消',
              reservationDate: targetDate,
              reservationTime: targetTime,
              department: dept,
              url: '' // URLなし
            };

            await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            const updateData = { 
                [CONFIG.FIELDS.STATUS]: { value: CONFIG.STATUS_WEB_WITHDRAWN_VALUE },
                [CONFIG.FIELDS.SEND_DATE]: { value: new Date().toISOString() }
            };
            // 診療科が入力されていれば更新
            if (dept) {
                updateData[CONFIG.FIELDS.DEPT] = { value: dept };
            }
            const success = await updateRecord(recordId, updateData);

            if (success) {
                await showDialog('取消完了メールを送信しました。', 'success');
                location.reload();
            }
          } catch (e) {
            console.error(e);
            await showDialog('送信に失敗しました: ' + e.message, 'error');
          }
      };

      // メール送信処理 (共通関数)
      const processSendMail = async (targetDate, targetTime) => {
          // 対応方法の判定
          let effectiveMethod = currentMethod;
          const radio = container.querySelector('input[name="rcb-method-select"]:checked');
          if (container.querySelector('input[name="rcb-method-select"]')) {
              if (!radio) {
                  await showDialog('対応方法を選択してください。', 'error');
                  return;
              }
              effectiveMethod = (radio.value === 'phone') ? 'phone' : 'email';
          }

          // タイムアウト値取得 (プルダウンがあれば取得、なければデフォルト)
          const timeoutSelect = container.querySelector('select');
          const selectedTimeout = timeoutSelect ? timeoutSelect.value : null;

          // トークンの確保 (レコードになければ新規生成)
          let token = urlToken;
          if (!token) {
              token = Math.random().toString(36).substring(2, 10);
          }

          // 送信内容のプレビュー作成
          const email = record[CONFIG.FIELDS.EMAIL]?.value || '';
          const lastName = record[CONFIG.FIELDS.LAST_NAME]?.value || '';
          const firstName = record[CONFIG.FIELDS.FIRST_NAME]?.value || '';
          const fullName = `${lastName} ${firstName}`.trim();
          const dept = record[CONFIG.FIELDS.DEPT]?.value || '（未指定）';

          const timeoutDisplay = selectedTimeout ? `<strong>タイムアウト:</strong> ${selectedTimeout}<br>` : '';
          const confirmMsg = `
            以下の内容でメールを送信します。<br>よろしいですか？<br><br>
            <div style="background:#f9f9f9; padding:10px; border-radius:4px; text-align:left;">
              <strong>宛先:</strong> ${fullName} 様 (${email})<br>
              <strong>用件:</strong> ${purpose}<br>
              <strong>日時:</strong> ${targetDate} ${targetTime}<br>
              <strong>診療科:</strong> ${dept}<br>
              <hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;">
              ${timeoutDisplay}
              <small>※送信後、レコードのステータスは「${CONFIG.STATUS_SENT_VALUE}」に更新されます。</small>
            </div>
          `;

          const confirmed = await showDialog(confirmMsg, 'confirm', '送信確認');
          if (!confirmed) return;

          // 【重要】メール送信前にトークンをKintoneに保存する
          // これを行わないと、メール受信時にサーバー側で「トークンなし」と判定されてしまう
          const tokenSaved = await updateRecord(recordId, { 
              [CONFIG.FIELDS.URL_TOKEN]: { value: token } 
          });
          if (!tokenSaved) return; // 保存に失敗した場合はメール送信を中止

          try {
            // URL生成
            // IDやモードを削除し、トークンのみのシンプルなURLにする
            let targetUrl = `${CONFIG.CONFIRM_BASE_URL}?token=${token}`;

            const payload = {
              to: email,
              name: fullName,
              type: purpose,
              reservationDate: targetDate,
              reservationTime: targetTime,
              department: dept,
              url: targetUrl
            };

            await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            // 送信成功後、ステータス等を更新
            const success = await updateRecord(recordId, { 
                [CONFIG.FIELDS.STATUS]: { value: CONFIG.STATUS_SENT_VALUE },
                [CONFIG.FIELDS.SEND_DATE]: { value: new Date().toISOString() },
                [CONFIG.FIELDS.CANCEL_EXECUTOR]: { value: null },
                [CONFIG.FIELDS.CANCEL_DATE]: { value: null },
                [CONFIG.FIELDS.READ_DATE]: { value: null },
                [CONFIG.FIELDS.TIMEOUT]: { value: selectedTimeout }
            });

            if (success) {
                await showDialog('メールを送信しました。', 'success');
                location.reload();
            }
          } catch (e) {
            console.error(e);
            await showDialog('送信に失敗しました: ' + e.message, 'error');
          }
      };

      // ② 確定予約日時エディタ (定義を前方に移動)
      const dateSection = document.createElement('div');
      dateSection.className = 'rcb-section';
      dateSection.style.marginTop = '30px';
      dateSection.style.paddingTop = '20px';
  
      const dateTitle = document.createElement('div');
      dateTitle.className = 'rcb-section-title';
      dateTitle.textContent = '確定予約日時の設定';

      // エディタ描画関数
      const renderEditorView = () => {
        // 対応方法セクションの表示・有効化 (再設定時用)
        const methodSection = container.querySelector('.rcb-method-section');
        if (methodSection) {
            methodSection.style.display = 'block'; // 再設定時に表示
            const radios = methodSection.querySelectorAll('input[name="rcb-method-select"]');
            radios.forEach(radio => {
                radio.disabled = false;
                if (radio.parentElement) {
                    radio.parentElement.style.opacity = '1';
                    radio.parentElement.style.cursor = 'pointer';
                }
            });
        }

        dateSection.innerHTML = '';

        // ① 対応方法未選択チェック
        if (methodSection) {
            const checked = methodSection.querySelector('input[name="rcb-method-select"]:checked');
            if (!checked) {
                return; // 何も表示しない
            }
        }
        dateSection.appendChild(dateTitle);
    
        const dateEditor = document.createElement('div');
        dateEditor.className = 'rcb-date-editor';
    
        // 日付入力
        const inputRow = document.createElement('div');
        inputRow.className = 'rcb-input-row';
        
        const dateLabel = document.createElement('label');
        dateLabel.textContent = '日付: ';
        dateLabel.style.fontWeight = 'bold';
        
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'rcb-date-input';
        dateInput.value = currentDate; // 初期値はレコードの値（または空）
        
        // 日付制限 (本日 ～ 60日後)
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 60);
        dateInput.min = formatDateISO(today);
        dateInput.max = formatDateISO(maxDate);
        
        inputRow.appendChild(dateLabel);
        inputRow.appendChild(dateInput);
        dateEditor.appendChild(inputRow);
    
        // 時刻選択
        const timeContainer = document.createElement('div');
        
        let selectedTime = currentTime;
    
        // 時刻ボタン描画更新関数
        const updateTimeButtons = () => {
          timeContainer.innerHTML = '';
          
          const morningTimes = CONFIG.ALLOWED_TIMES.filter(t => parseInt(t.split(':')[0], 10) < 12);
          const afternoonTimes = CONFIG.ALLOWED_TIMES.filter(t => parseInt(t.split(':')[0], 10) >= 12);

          const createSection = (label, times) => {
            const section = document.createElement('div');
            section.style.marginBottom = '10px';
            
            const lbl = document.createElement('div');
            lbl.textContent = label;
            lbl.style.fontSize = '12px';
            lbl.style.color = '#666';
            lbl.style.marginBottom = '5px';
            lbl.style.fontWeight = 'bold';
            section.appendChild(lbl);
            
            const grid = document.createElement('div');
            grid.className = 'rcb-time-grid';
            
            times.forEach(time => {
                const btn = document.createElement('div');
                btn.className = 'rcb-time-btn';
                
                // ③ 過去時刻チェック
                if (isPastTime(dateInput.value, time)) {
                  btn.style.backgroundColor = '#eee';
                  btn.style.color = '#ccc';
                  btn.style.cursor = 'not-allowed';
                  btn.style.borderColor = '#ddd';
                  btn.textContent = time;
                } else {
                  if (time === selectedTime) btn.classList.add('selected');
                  btn.textContent = time;
                  
                  btn.onclick = () => {
                    document.querySelectorAll('.rcb-time-btn').forEach(el => el.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedTime = time;
                  };
                }
                grid.appendChild(btn);
            });
            section.appendChild(grid);
            return section;
          };

          if (morningTimes.length > 0) {
            timeContainer.appendChild(createSection('午前の部', morningTimes));
          }
          if (afternoonTimes.length > 0) {
            timeContainer.appendChild(createSection('午後の部', afternoonTimes));
          }
        };

        // 日付変更時に時刻ボタンの状態を更新
        dateInput.addEventListener('change', updateTimeButtons);
        updateTimeButtons(); // 初期描画

        dateEditor.appendChild(timeContainer);
    
        // 保存ボタンエリア
        const actionRow = document.createElement('div');
        actionRow.style.marginTop = '20px';
        actionRow.style.textAlign = 'right';
    
        const msgSpan = document.createElement('span');
        msgSpan.className = 'rcb-message';
        msgSpan.textContent = '保存しました';
        msgSpan.style.marginRight = '15px';
    
        const saveBtn = document.createElement('button');
        saveBtn.className = 'rcb-btn-save';
        saveBtn.textContent = '予約日時を保存する';
        
        saveBtn.onclick = async () => {
          const newDate = dateInput.value;
          if (!newDate) {
            await showDialog('日付を選択してください', 'error');
            return;
          }
          if (!selectedTime) {
            await showDialog('時刻を選択してください', 'error');
            return;
          }
    
          saveBtn.disabled = true;
          saveBtn.textContent = '保存中...';
    
          const payload = {
            [CONFIG.FIELDS.RES_DATE]: { value: newDate },
            [CONFIG.FIELDS.RES_TIME]: { value: selectedTime }
          };

          // スタッフ取下中の場合、ステータスをクリアしてメール送信可能状態にする
          if (currentStatus === CONFIG.STATUS_WITHDRAWN_VALUE) {
              payload[CONFIG.FIELDS.STATUS] = { value: null };
          }
    
          const success = await updateRecord(recordId, payload);
    
          if (success) {
            msgSpan.style.display = 'inline';
            setTimeout(() => {
               location.reload();
            }, 800);
          } else {
            saveBtn.disabled = false;
            saveBtn.textContent = '予約日時を保存する';
          }
        };
    
        actionRow.appendChild(msgSpan);
        actionRow.appendChild(saveBtn);
        dateEditor.appendChild(actionRow);
    
        dateSection.appendChild(dateEditor);
      };

      // ① 対応方法選択 (用件が「変更」または「初診」の場合)
      if (purpose === '変更' || purpose === '初診') {
        const methodSection = document.createElement('div');
        methodSection.className = 'rcb-section rcb-method-section'; // クラス追加
        
        // 確定済みの場合は初期非表示（再設定時に表示）
        if (isConfirmed) {
            methodSection.style.display = 'none';
        }
        
        const methodTitle = document.createElement('div');
        methodTitle.className = 'rcb-section-title';
        methodTitle.textContent = '対応方法の選択';
        methodSection.appendChild(methodTitle);
  
        const radioGroup = document.createElement('div');
        radioGroup.className = 'rcb-radio-group';
  
        const createRadio = (label, value, updateValue) => {
          const labelEl = document.createElement('label');
          labelEl.className = 'rcb-radio-label';
          if (currentMethod === updateValue) labelEl.classList.add('checked');
  
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = 'rcb-method-select';
          input.value = value;
          if (currentMethod === updateValue) input.checked = true;

          // ① 確定後は選択不可 (固定)
          if (isConfirmed) {
            input.disabled = true;
            labelEl.style.opacity = '0.6';
            labelEl.style.cursor = 'not-allowed';
          }
  
          input.onchange = async () => {
            // UI更新 (即時反映)
            document.querySelectorAll('.rcb-radio-label').forEach(el => el.classList.remove('checked'));
            labelEl.classList.add('checked');
            
            // API更新
            const success = await updateRecord(recordId, {
              [CONFIG.FIELDS.METHOD]: { value: updateValue }
            });
            
            if (success) {
              currentMethod = updateValue; // 内部変数を更新
              // アイコン更新
              methodIconDiv.innerHTML = getMethodIconHtml(updateValue);
              renderEditorView(); // 日時設定エリアを更新（表示）
              // リロード削除: 画面リセットを防ぐためDOM更新のみに留める
            }
          };
  
          labelEl.appendChild(input);
          labelEl.appendChild(document.createTextNode(label));
          return labelEl;
        };

        radioGroup.appendChild(createRadio('電話で対応', 'phone', 'phone'));
        radioGroup.appendChild(createRadio('メールで対応', 'email', 'email'));
        
        methodSection.appendChild(radioGroup);
        container.appendChild(methodSection);
      }
  
      // ★ 分岐: 予約日時が確定しているかどうか、または用件が「取消」の場合
      // 用件が「取消」の場合は、日時設定（エディタ）をスキップして、チケット情報を引用した確認画面を即座に表示する
      if (isConfirmed || purpose === '取消') {
        // --- 確定済み表示モード ---
        dateSection.innerHTML = ''; // 初期化

        const confirmedContainer = document.createElement('div');
        confirmedContainer.style.padding = '20px';
        confirmedContainer.style.backgroundColor = '#EEE';
        confirmedContainer.style.border = '1px solid rgb(224, 224, 224)';
        confirmedContainer.style.borderRadius = '6px';
        confirmedContainer.style.textAlign = 'center';

        // 申込者再依頼時のメッセージ表示
        if (isReRequest) {
            const msgDiv = document.createElement('div');
            msgDiv.style.marginBottom = '20px';
            msgDiv.style.textAlign = 'left';
            msgDiv.style.fontSize = '14px';
            msgDiv.style.fontWeight = 'bold';
            msgDiv.style.color = '#e74c3c'; // 注意を引くための赤系
            msgDiv.innerHTML = `本件は申込者の閲覧期限が過ぎたことによる予約の再依頼です。<br>下記の${reservationDateLabel}でよい場合はこのまま送信ボタンを押してください。<br>あるいは時間が経過したため、予約日時や対応方法を見直す場合は再設定ボタンを押してください。`;
            confirmedContainer.appendChild(msgDiv);
        }

        // 取下げ処理ロジック
        const handleWithdrawal = async () => {
            const isRead = !!readDateVal;
            let shouldSendCancelMail = false;

            // 1. 確認フロー
            if (currentMethod === 'phone') {
                const confirmed = await showDialog('予約依頼者と取消しについて調整済みですか？\n予約を取り下げますか？', 'confirm');
                if (!confirmed) return;
            } else if (currentMethod === 'email') {
                if (!isRead) {
                    // 既読前
                    const confirmed = await showDialog('予約を取り下げますか？', 'confirm');
                    if (!confirmed) return;
                } else {
                    // 既読後
                    const confirmed = await showDialog('予約依頼者と取消しについて調整済みですか？\nメールが既読になっているので依頼者の予約日時の認識について混乱させないようにする必要があります。\n予約を取下げますか？', 'confirm');
                    if (!confirmed) return;
                }
            } else {
                // 未設定などの場合
                const confirmed = await showDialog('予約を取り下げますか？', 'confirm');
                if (!confirmed) return;
            }

            // 2. 実行処理
            try {
                const payload = {
                    [CONFIG.FIELDS.STATUS]: { value: CONFIG.STATUS_WITHDRAWN_VALUE },
                    [CONFIG.FIELDS.NOTE]: { value: '' }
                };

                // メール送信 (メール対応 & 既読後の場合)
                if (shouldSendCancelMail) {
                    const email = record[CONFIG.FIELDS.EMAIL]?.value || '';
                    const lastName = record[CONFIG.FIELDS.LAST_NAME]?.value || '';
                    const firstName = record[CONFIG.FIELDS.FIRST_NAME]?.value || '';
                    const dept = record[CONFIG.FIELDS.DEPT]?.value || '';

                    const mailPayload = {
                        to: email,
                        name: `${lastName} ${firstName}`.trim(),
                        type: '取消', // 取消タイプ
                        reservationDate: currentDate,
                        reservationTime: currentTime,
                        department: dept,
                        url: '' // URLなし
                    };

                    // メール送信API実行
                    const response = await fetch(CONFIG.API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(mailPayload)
                    });

                    if (!response.ok) throw new Error(`Email API Error: ${response.status}`);
                }

                // レコード更新
                await updateRecord(recordId, payload);

                await showDialog('予約を取り下げました。', 'success');
                location.reload();
            } catch (e) {
                console.error(e);
                await showDialog('取下げ処理に失敗しました: ' + e.message, 'error');
            }
        };

        // 日時表示
        const dateTimeDisplay = document.createElement('div');
        dateTimeDisplay.style.fontSize = '18px';
        dateTimeDisplay.style.fontWeight = 'bold';
        dateTimeDisplay.style.color = '#2c3e50';
        dateTimeDisplay.style.marginBottom = '20px';
        dateTimeDisplay.style.display = 'flex';
        dateTimeDisplay.style.alignItems = 'center';
        dateTimeDisplay.style.justifyContent = 'center';
        dateTimeDisplay.style.gap = '15px';
        
        // 表示・送信用日時（取消の場合はチケットの予約日情報を優先）
        let displayDateVal = currentDate;
        let displayTimeVal = currentTime;
        
        const textSpan = document.createElement('span');

        if (purpose === '取消') {
            // 取消の場合: チケット情報をそのまま使用
            displayDateVal = record['予約日時']?.value || '（未設定）';
            displayTimeVal = ''; // 時刻は分離しない

            const ticketLastName = record['姓漢字']?.value || '';
            const ticketFirstName = record['名漢字']?.value || '';
            const ticketDept = record['診療科']?.value || '（未設定）';
            const ticketName = `${ticketLastName} ${ticketFirstName} 様`.trim();

            // レイアウト調整
            dateTimeDisplay.style.flexDirection = 'column';
            dateTimeDisplay.style.gap = '5px';
            dateTimeDisplay.style.alignItems = 'center';

            textSpan.innerHTML = '';

            // 診療科入力
            const deptDiv = document.createElement('div');
            deptDiv.style.fontSize = '16px';
            deptDiv.innerHTML = '<strong>診療科:</strong> ';
            
            const deptInput = document.createElement('input');
            deptInput.type = 'text';
            deptInput.value = currentDeptInput;
            deptInput.placeholder = '診療科を入力';
            deptInput.style.cssText = 'margin-left: 5px; padding: 4px; font-size: 16px; width: 200px; border: 1px solid #ccc; border-radius: 4px;';
            deptInput.oninput = (e) => { currentDeptInput = e.target.value; };
            
            deptDiv.appendChild(deptInput);
            textSpan.appendChild(deptDiv);

            // 予約日時
            const dateDiv = document.createElement('div');
            dateDiv.style.fontSize = '16px';
            dateDiv.innerHTML = `<strong>予約日時:</strong> <span style="color:#3498db; font-size: 1.2em;">${displayDateVal}</span>`;
            textSpan.appendChild(dateDiv);

            // お名前
            const nameDiv = document.createElement('div');
            nameDiv.style.fontSize = '16px';
            nameDiv.innerHTML = `<strong>お名前:</strong> ${ticketName}`;
            textSpan.appendChild(nameDiv);
        } else {
            // 通常の場合
            const dObj = displayDateVal ? new Date(displayDateVal) : null;
            const dateStr = dObj ? `${dObj.getFullYear()}年${dObj.getMonth() + 1}月${dObj.getDate()}日` : '（日付未定）';
            const timeStr = displayTimeVal || '（時刻未定）';
            
            textSpan.innerHTML = `<span style="background-color: ${reservationStatusColor}; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 14px; margin-right: 8px; vertical-align: middle;">${reservationStatusLabel}</span>${reservationDateLabel}: <span style="color:#3498db; font-size: 1.2em;">${dateStr} ${timeStr}</span>`;
        }
        dateTimeDisplay.appendChild(textSpan);

        // メール送信済みでない場合、または申込者再依頼の場合に再設定ボタンを表示（ただし「取消」の場合は再設定不要）
        if ((!sendDateVal || isReRequest) && purpose !== '取消') {
            const editBtn = document.createElement('button');
            editBtn.innerHTML = '⚙️再設定';
            editBtn.style.cssText = 'background-color: rgb(245, 245, 225); border: 1px solid rgb(221, 221, 221); color: rgb(102, 102, 102); padding: 5px 10px; border-radius: 9px; cursor: pointer; font-size: 16px; font-weight: bold; display: flex; align-items: center; gap: 4px; transition: background-color 0.2s;';
            
            editBtn.onmouseover = () => { editBtn.style.backgroundColor = '#e8e8d2'; editBtn.style.borderColor = '#bbb'; };
            editBtn.onmouseout = () => { editBtn.style.backgroundColor = 'rgb(245, 245, 225)'; editBtn.style.borderColor = 'rgb(221, 221, 221)'; };
            editBtn.onclick = () => renderEditorView();
            dateTimeDisplay.appendChild(editBtn);
        }

        confirmedContainer.appendChild(dateTimeDisplay);

        // 送信履歴・既読情報の表示
        if (isSent) {
            let isTimeout = false;
            // タイムアウト判定 (自動更新ロジック) - 未読の場合のみ実行
            if (!readDateVal) {
                const sentTime = new Date(sendDateVal);
                const now = new Date();

                if (timeoutVal === '今日中') {
                    const endOfToday = new Date(sentTime);
                    endOfToday.setHours(23, 59, 59, 999);
                    if (now > endOfToday) isTimeout = true;
                } else if (timeoutVal === '明日中') {
                    const endOfTomorrow = new Date(sentTime);
                    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
                    endOfTomorrow.setHours(23, 59, 59, 999);
                    if (now > endOfTomorrow) isTimeout = true;
                } else {
                    let timeoutHours = 2; // デフォルト
                    const match = timeoutVal.match(/(\d+)/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (timeoutVal.includes('分')) {
                            timeoutHours = num / 60;
                        } else { // 時間と仮定
                            timeoutHours = num;
                        }
                    }
                    const diffHours = (now.getTime() - sentTime.getTime()) / (1000 * 60 * 60);
                    if (diffHours >= timeoutHours) isTimeout = true;
                }
                
                if (isTimeout && currentStatus !== CONFIG.STATUS_TIMEOUT_VALUE) {
                    // 画面表示時にタイムアウトしていればステータスを更新してリロード
                    updateRecord(recordId, { [CONFIG.FIELDS.STATUS]: { value: CONFIG.STATUS_TIMEOUT_VALUE } }).then(() => location.reload());
                    return; // 描画を中断してリロードを待つ
                }
            }

            const historyContainer = document.createElement('div');
            historyContainer.style.marginBottom = '25px';
            historyContainer.style.padding = '20px';
            historyContainer.style.backgroundColor = '#f0f4f8';
            historyContainer.style.borderRadius = '8px';
            historyContainer.style.border = '1px solid #d1d9e6';
            historyContainer.style.textAlign = 'center';

            const formatDateTime = (isoStr) => {
                if (!isoStr) return '-';
                const d = new Date(isoStr);
                return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            };

            const labelStyle = 'font-weight: bold; color: #555; margin-right: 15px; font-size: 16px;';
            const valueStyle = 'font-weight: bold; font-size: 20px; font-family: monospace;';

            const sendRow = document.createElement('div');
            sendRow.style.marginBottom = '10px';
            sendRow.innerHTML = `<span style="${labelStyle}">送信日時:</span><span style="${valueStyle} color: #2c3e50;">${formatDateTime(sendDateVal)}</span>`;
            historyContainer.appendChild(sendRow);

            // タイムアウト予告表示 (未読かつタイムアウト設定ありの場合)
            if (!readDateVal && timeoutVal) {
                const sentTime = new Date(sendDateVal);
                let timeoutDate = null;

                if (timeoutVal === '今日中') {
                    timeoutDate = new Date(sentTime);
                    timeoutDate.setHours(23, 59, 59, 999);
                } else if (timeoutVal === '明日中') {
                    timeoutDate = new Date(sentTime);
                    timeoutDate.setDate(timeoutDate.getDate() + 1);
                    timeoutDate.setHours(23, 59, 59, 999);
                } else {
                    const match = timeoutVal.match(/(\d+)/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        timeoutDate = new Date(sentTime);
                        if (timeoutVal.includes('分')) {
                            timeoutDate.setMinutes(timeoutDate.getMinutes() + num);
                        } else {
                            timeoutDate.setHours(timeoutDate.getHours() + num);
                        }
                    }
                }

                if (timeoutDate) {
                    const m = timeoutDate.getMonth() + 1;
                    const d = timeoutDate.getDate();
                    const h = String(timeoutDate.getHours()).padStart(2, '0');
                    const min = String(timeoutDate.getMinutes()).padStart(2, '0');
                    
                    const timeoutMsg = document.createElement('div');
                    timeoutMsg.style.marginBottom = '10px';
                    timeoutMsg.style.fontSize = '13px';
                    timeoutMsg.style.color = '#e67e22';
                    timeoutMsg.innerHTML = `申込者が${m}月${d}日${h}:${min}頃までに仮予約情報を閲覧しない場合は<br>閲覧期限切れ（タイムアウト）になります。`;
                    historyContainer.appendChild(timeoutMsg);
                }
            }

            const readRow = document.createElement('div');
            if (readDateVal) {
                readRow.innerHTML = `<span style="${labelStyle}">既読日時:</span><span style="${valueStyle} color: #27ae60;">${formatDateTime(readDateVal)}</span>`;
            } else {
                readRow.innerHTML = `<span style="${labelStyle}">既読日時:</span><span style="${valueStyle} color: #95a5a6;">未読</span>`;
            }
            historyContainer.appendChild(readRow);
            
            // タイムアウト時のアクションボタン (メール対応かつ未読かつタイムアウト)
            if (isTimeout || isTimeoutStatus) {
                const timeoutAlert = document.createElement('div');
                timeoutAlert.style.marginTop = '15px';
                timeoutAlert.style.padding = '10px';
                timeoutAlert.style.backgroundColor = '#fff3cd';
                timeoutAlert.style.border = '1px solid #ffeeba';
                timeoutAlert.style.borderRadius = '4px';
                timeoutAlert.style.color = '#856404';
                timeoutAlert.innerHTML = `<strong>⚠️ 未読タイムアウト</strong><br>設定された${timeoutHours}時間を経過しましたが、反応がありません。`;
                
                const btnGroup = document.createElement('div');
                btnGroup.style.display = 'flex';
                btnGroup.style.gap = '10px';
                btnGroup.style.marginTop = '10px';
                btnGroup.style.justifyContent = 'center';

                const phoneBtn = document.createElement('button');
                phoneBtn.className = 'rcb-btn-save';
                phoneBtn.textContent = '電話で調整する';
                phoneBtn.style.backgroundColor = '#17a2b8';
                phoneBtn.onclick = async () => {
                    const confirmed = await showDialog('電話で調整を行いますか？\nステータスを「電話合意済」に変更します。', 'confirm');
                    if (!confirmed) return;
                    
                    await updateRecord(recordId, {
                        [CONFIG.FIELDS.PHONE_CONFIRM]: { value: new Date().toISOString() }
                    });
                    location.reload();
                };

                const withdrawBtn = document.createElement('button');
                withdrawBtn.className = 'rcb-btn-save';
                withdrawBtn.textContent = '予約を取下げる';
                withdrawBtn.style.backgroundColor = '#dc3545';
                withdrawBtn.onclick = () => handleWithdrawal(); // 共通の取下げロジックへ

                btnGroup.appendChild(phoneBtn);
                btnGroup.appendChild(withdrawBtn);
                timeoutAlert.appendChild(btnGroup);
                historyContainer.appendChild(timeoutAlert);
            }

            confirmedContainer.appendChild(historyContainer);
        }

        // アクションエリア（メール送信ボタン + タイムアウト設定）
        const actionContainer = document.createElement('div');
        actionContainer.style.display = 'flex';
        actionContainer.style.alignItems = 'center';
        actionContainer.style.justifyContent = 'center';
        actionContainer.style.gap = '10px';
        actionContainer.style.width = '100%';
        actionContainer.style.maxWidth = '480px';
        actionContainer.style.margin = '0 auto';

        // メール送信ボタン
        const sendMailBtn = document.createElement('button');
        sendMailBtn.className = 'rcb-btn-save';
        sendMailBtn.style.flex = '1'; // 幅を自動調整
        
        if (isSent) {
            sendMailBtn.textContent = 'メール送信済み';
            sendMailBtn.style.backgroundColor = '#95a5a6'; // グレー
            sendMailBtn.disabled = true;
            sendMailBtn.style.cursor = 'not-allowed';
        } else if (isPhoneConfirmed) {
            sendMailBtn.textContent = '電話合意済み';
            sendMailBtn.style.backgroundColor = '#27ae60'; // 緑色
            sendMailBtn.disabled = true;
            sendMailBtn.style.cursor = 'not-allowed';
        } else if (isWithdrawn) {
            sendMailBtn.textContent = '取下済み';
            sendMailBtn.style.backgroundColor = '#7f8c8d';
            sendMailBtn.disabled = true;
            sendMailBtn.style.cursor = 'not-allowed';
        } else if (isWebWithdrawn) {
            sendMailBtn.textContent = 'WEB取下済み';
            sendMailBtn.style.backgroundColor = '#7f8c8d';
            sendMailBtn.disabled = true;
            sendMailBtn.style.cursor = 'not-allowed';
        } else if (isRead) {
            sendMailBtn.textContent = 'メール既読';
            sendMailBtn.style.backgroundColor = '#27ae60';
            sendMailBtn.disabled = true;
        } else if (isTimeoutStatus) {
            sendMailBtn.textContent = '閲覧期限切れ';
            sendMailBtn.style.backgroundColor = '#e74c3c';
            sendMailBtn.disabled = true;
        } else {
            if (purpose === '取消') {
                sendMailBtn.textContent = '取消完了メールを送信する';
                sendMailBtn.style.backgroundColor = '#c0392b'; // 赤色
                sendMailBtn.onclick = () => processCancelMail(displayDateVal, displayTimeVal, currentDeptInput);
            } else {
                sendMailBtn.textContent = 'メールを送信する';
                sendMailBtn.style.backgroundColor = '#e67e22'; // オレンジ色
                sendMailBtn.onclick = () => processSendMail(currentDate, currentTime);
            }
        }

        actionContainer.appendChild(sendMailBtn);

        // タイムアウト設定 (送信前のみ、ボタンの右横に表示)
        let timeoutSelect = null;
        // 用件が「取消」の場合はタイムアウト設定を表示しない
        if (!isSent && !isPhoneConfirmed && !isWithdrawn && !isWebWithdrawn && !isRead && !isTimeoutStatus && currentMethod !== 'phone' && purpose !== '取消') {
            const timeoutWrapper = document.createElement('div');
            timeoutWrapper.style.display = 'flex';
            timeoutWrapper.style.alignItems = 'center';
            timeoutWrapper.style.gap = '5px';

            // アイコン表示
            const iconDiv = document.createElement('div');
            iconDiv.style.color = '#555';
            iconDiv.style.display = 'flex';
            iconDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 72 72"><path fill="#fff" d="M35.498 37.967h1.017c7.624 0 13.814 6.19 13.814 13.815v6.458H22.001v-6.776c0-7.45 6.048-13.497 13.497-13.497m1.159-3.971h-1.016c-7.625 0-13.815-6.19-13.815-13.814v-6.458h28.328v6.775c0 7.45-6.048 13.497-13.497 13.497"/><path fill="#fff" d="M39.313 33.681s-2.823 2.018-.171 4.548c0 0-2.034-.556-6.387.07c0 0 2.756-2.098-.094-4.729z"/><path fill="#9b9b9a" d="M40.214 31.106q.006-.004.01-.003l.014-.005C45.893 29.613 48 23.308 48 19.682V18H24v1.682c0 3.626 2.107 9.931 7.762 11.416l.013.006l.011.002c1.792.486 3.1 1.536 3.75 2.894h.929c.65-1.358 1.957-2.408 3.749-2.894M47 55c-6.074 0-11-4.926-11-11c0 6.074-4.926 11-11 11h-1v4h24v-4z"/><path fill="#a57939" d="M55 11c0 1.1-.9 2-2 2H19c-1.1 0-2-.9-2-2v-1c0-1.1.9-2 2-2h34c1.1 0 2 .9 2 2zm0 51c0 1.1-.9 2-2 2H19c-1.1 0-2-.9-2-2v-1c0-1.1.9-2 2-2h34c1.1 0 2 .9 2 2z"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M31 34c-7.272-1.91-10-9.545-10-14.318V13m0 46v-6.682C21 47.546 23.728 39.91 31 38m0 0c1-.271 2-.894 2-2c0-1.104-1-1.728-2-2m10 0c7.273-1.91 10-9.545 10-14.318V13m0 46v-6.682C51 47.546 48.273 39.91 41 38m0 0c-1-.271-2-.894-2-2c0-1.104 1-1.728 2-2M25 55c6.074 0 11-4.926 11-11c0 6.074 4.926 11 11 11m8-44c0 1.1-.9 2-2 2H19c-1.1 0-2-.9-2-2v-1c0-1.1.9-2 2-2h34c1.1 0 2 .9 2 2zm-8 7H25m30 44c0 1.1-.9 2-2 2H19c-1.1 0-2-.9-2-2v-1c0-1.1.9-2 2-2h34c1.1 0 2 .9 2 2zM36 39v5"/></svg>`;
            
            // プルダウン
            timeoutSelect = document.createElement('select');
            timeoutSelect.style.padding = '5px';
            timeoutSelect.style.backgroundColor = 'rgb(245, 245, 225)';
            timeoutSelect.style.borderRadius = '4px';
            timeoutSelect.style.border = '1px solid rgb(204, 204, 204)';
            
            const options = ['1分間','15分間', '30分間', '45分間','60分間', '90分間', '2時間', '4時間', '6時間', '12時間', '24時間', '48時間', '本日中', '明日中'];
            options.forEach(optVal => {
                const opt = document.createElement('option');
                opt.value = optVal;
                opt.textContent = optVal;
                if (optVal === '2時間') opt.selected = true;
                timeoutSelect.appendChild(opt);
            });

            timeoutWrapper.appendChild(iconDiv);
            timeoutWrapper.appendChild(timeoutSelect);
            actionContainer.appendChild(timeoutWrapper);
        }

        confirmedContainer.appendChild(actionContainer);

        // 予約取下げボタン (送信済み、電話合意済み、または既読の場合に表示)
        if (isSent || isPhoneConfirmed || isRead) {
            const withdrawBtn = document.createElement('button');
            withdrawBtn.textContent = '取下げる';
            withdrawBtn.className = 'rcb-btn-save';
            withdrawBtn.style.backgroundColor = '#dc3545'; // 赤色
            withdrawBtn.style.width = '100%';
            withdrawBtn.style.maxWidth = '300px';
            withdrawBtn.style.marginTop = '10px';
            
            withdrawBtn.onclick = () => handleWithdrawal();
            
            confirmedContainer.appendChild(withdrawBtn);
        }
        
        // 取下げ後のアクション (戻る / 再設定)
        if (isWithdrawn) {
            const actionGroup = document.createElement('div');
            actionGroup.style.display = 'flex';
            actionGroup.style.flexDirection = 'row';
            actionGroup.style.justifyContent = 'center';
            actionGroup.style.gap = '10px';
            actionGroup.style.marginTop = '15px';

            // ① 戻る (メール対応かつ未読の場合のみ。電話対応は不可)
            if (currentMethod !== 'phone' && !readDateVal) {
                const reviveBtn = document.createElement('button');
                reviveBtn.textContent = '前に戻る';
                reviveBtn.className = 'rcb-btn-save';
                reviveBtn.style.backgroundColor = '#f39c12'; // オレンジ
                reviveBtn.style.flex = '1';
                reviveBtn.style.maxWidth = '200px';
                
                reviveBtn.onclick = async () => {
                    const confirmed = await showDialog('取下げを取り消して、前の状態に戻しますか？', 'confirm');
                    if (!confirmed) return;

                    // 最新の既読状態をチェック
                    try {
                        const resp = await kintone.api(kintone.api.url('/k/v1/record', true), 'GET', {
                            app: kintone.app.getId(),
                            id: recordId
                        });
                        if (resp.record[CONFIG.FIELDS.READ_DATE]?.value) {
                            await showDialog('スタッフによって予約が取下げられたことを申込者が既に認識していますので\n前の状態に戻すことができませんでした。', 'error');
                            location.reload();
                            return;
                        }
                    } catch (e) {
                        console.error('Status check failed', e);
                    }

                    // 元のステータスを推定
                    let targetStatus = CONFIG.STATUS_SENT_VALUE;
                    if (phoneDateVal) targetStatus = CONFIG.STATUS_PHONE_VALUE;
                    else if (sendDateVal) targetStatus = CONFIG.STATUS_SENT_VALUE;

                    await updateRecord(recordId, {
                        [CONFIG.FIELDS.STATUS]: { value: CONFIG.STATUS_REVIVED_VALUE },
                        [CONFIG.FIELDS.STATUS]: { value: targetStatus },
                        [CONFIG.FIELDS.NOTE]: { value: '' }
                    });
                    location.reload();
                };
                actionGroup.appendChild(reviveBtn);
            }

            // ② 再設定する (リセット)
            const reconfigBtn = document.createElement('button');
            reconfigBtn.textContent = '再設定する';
            reconfigBtn.className = 'rcb-btn-save';
            reconfigBtn.style.backgroundColor = '#3498db'; // 青
            reconfigBtn.style.flex = '1';
            reconfigBtn.style.maxWidth = '200px';

            reconfigBtn.onclick = async () => {
                const confirmed = await showDialog('予約を最初から再設定しますか？\n現在の履歴はすべて消去されます。', 'confirm');
                if (!confirmed) return;

                // 新しいトークンを生成
                const newToken = Math.random().toString(36).substring(2, 10);

                const payload = {
                    [CONFIG.FIELDS.STATUS]: { value: CONFIG.STATUS_WITHDRAWN_VALUE },
                    [CONFIG.FIELDS.URL_TOKEN]: { value: newToken }, // トークン更新
                    [CONFIG.FIELDS.RES_DATE]: { value: null },
                    [CONFIG.FIELDS.RES_TIME]: { value: null },
                    [CONFIG.FIELDS.SEND_DATE]: { value: null },
                    [CONFIG.FIELDS.READ_DATE]: { value: null },
                    [CONFIG.FIELDS.PHONE_CONFIRM]: { value: null },
                    [CONFIG.FIELDS.CANCEL_EXECUTOR]: { value: null },
                    [CONFIG.FIELDS.CANCEL_DATE]: { value: null },
                    [CONFIG.FIELDS.TIMEOUT]: { value: null },
                    [CONFIG.FIELDS.NOTE]: { value: null }
                };
                
                const success = await updateRecord(recordId, payload);
                if (success) location.reload();
            };
            actionGroup.appendChild(reconfigBtn);

            confirmedContainer.appendChild(actionGroup);
        }

        dateSection.appendChild(confirmedContainer);

      } else {
        // --- 未確定: 編集フォーム表示 ---
        renderEditorView();
      } // end if-else
      container.appendChild(dateSection);
  
      spaceElement.appendChild(container);
    };

    // リセットボタン描画関数
    const renderResetButton = (spaceElement, recordId) => {
        if (document.getElementById('rcb-reset-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'rcb-reset-btn';
        btn.textContent = 'リセット';
        btn.style.cssText = 'padding: 8px 16px; background-color: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px; margin-top: 10px;';
        btn.onmouseover = () => btn.style.backgroundColor = '#7f8c8d';
        btn.onmouseout = () => btn.style.backgroundColor = '#95a5a6';
        
        btn.onclick = async () => {
            const confirmed = await showDialog('このレコードを初期状態にリセットしますか？\n入力された予約日時や履歴はすべて消去されます。', 'confirm', 'リセット確認');
            if (!confirmed) return;
            
            // 新しいトークンを生成
            const newToken = Math.random().toString(36).substring(2, 10);

            const payload = {
                [CONFIG.FIELDS.STATUS]: { value: '未着手' },
                [CONFIG.FIELDS.URL_TOKEN]: { value: newToken }, // トークン更新
                [CONFIG.FIELDS.METHOD]: { value: 'staff' },
                [CONFIG.FIELDS.STAFF]: { value: null },
                [CONFIG.FIELDS.RES_DATE]: { value: null },
                [CONFIG.FIELDS.RES_TIME]: { value: null },
                [CONFIG.FIELDS.SEND_DATE]: { value: null },
                [CONFIG.FIELDS.READ_DATE]: { value: null },
                [CONFIG.FIELDS.PHONE_CONFIRM]: { value: null },
                [CONFIG.FIELDS.CANCEL_EXECUTOR]: { value: null },
                [CONFIG.FIELDS.CANCEL_DATE]: { value: null },
                [CONFIG.FIELDS.TIMEOUT]: { value: null },
                [CONFIG.FIELDS.NOTE]: { value: null }
            };
            
            const success = await updateRecord(recordId, payload);
            if (success) location.reload();
        };
        
        spaceElement.appendChild(btn);
    };

    // 担当アサインボタン描画関数 (EmailSender.jsから移植・統合)
    // 担当アサインボタン描画関数 (RreservationContorlBoardスペース用)
    const renderAssignButton = (spaceElement, record) => {
        // 管理状況が「未着手」の場合のみ表示
        const currentStatus = record[CONFIG.FIELDS.STATUS]?.value;
        if (currentStatus !== '未着手') return;

        if (document.getElementById('rcb-assign-staff-btn')) return;

        // 端末の担当者名を取得
        const currentStaff = localStorage.getItem('shinryo_ticket_staff_name') || localStorage.getItem('customKey');

        const assignBtn = document.createElement('button');
        assignBtn.id = 'rcb-assign-staff-btn';
        assignBtn.innerText = currentStaff ? `私（${currentStaff}）がこのチケットを担当する` : '担当者設定が必要です';
        assignBtn.style.cssText = `
            padding: 10px 24px;
            background-color: #2c3e50;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: background-color 0.2s;
            height: 60px;
            width:300px;
        `;
        
        assignBtn.onmouseover = () => { assignBtn.style.backgroundColor = '#34495e'; };
        assignBtn.onmouseout = () => { assignBtn.style.backgroundColor = '#2c3e50'; };

        assignBtn.onclick = async () => {
            if (!currentStaff) {
                await showDialog('この端末には担当者が設定されていません。\nダッシュボード等で担当者を設定してください。', 'error');
                return;
            }

            const recordStaff = record[CONFIG.FIELDS.STAFF]?.value;
            const recordId = kintone.app.record.getId();

            const doAssign = async () => {
                assignBtn.disabled = true;
                assignBtn.textContent = '処理中...';
                
                const updatePayload = {
                    [CONFIG.FIELDS.STAFF]: { value: currentStaff }
                };

                // 初めて担当が設定される場合のみステータスを更新
                if (!recordStaff) {
                    updatePayload[CONFIG.FIELDS.STATUS] = { value: '担当設定' };
                }

                const success = await updateRecord(recordId, updatePayload);
                if (success) {
                    await showDialog(`担当者を「${currentStaff}」に設定しました。`, 'success');
                    location.reload();
                } else {
                    assignBtn.disabled = false;
                    assignBtn.textContent = '担当する';
                }
            };

            if (recordStaff) {
                const confirmed = await showDialog(
                    `すでに担当者「${recordStaff}」が設定されています。\n強制的に担当をあなた（${currentStaff}）に変更しますか？`,
                    'confirm',
                    '担当者変更',
                    '',
                    '強制的に自分が担当する'
                );
                if (confirmed) doAssign();
            } else {
                doAssign();
            }
        };
        
        spaceElement.appendChild(assignBtn);
    };

    // ポーリング管理用
    let pollingTimer = null;
    const POLLING_INTERVAL = 10000; // 10秒間隔

    // ポーリング開始関数
    const startPolling = (recordId, initialRecord) => {
        if (pollingTimer) clearInterval(pollingTimer);
        
        // 初期状態の保持
        let currentRevision = initialRecord.$revision.value;
        let currentStatus = initialRecord[CONFIG.FIELDS.STATUS]?.value;

        pollingTimer = setInterval(async () => {
            // モーダル表示中はポーリングをスキップ（ユーザー操作の邪魔をしない）
            if (document.getElementById('rcb-modal-overlay')) return;

            try {
                const resp = await kintone.api(kintone.api.url('/k/v1/record', true), 'GET', {
                    app: kintone.app.getId(),
                    id: recordId
                });
                
                const latestRecord = resp.record;
                const latestRevision = latestRecord.$revision.value;
                let latestStatus = latestRecord[CONFIG.FIELDS.STATUS]?.value;

                // ★追加: クライアントサイドでのタイムアウト自動検知＆更新
                // サーバー側で自動更新されないため、画面を開いている担当者のブラウザが代行して更新する
                if (latestStatus === CONFIG.STATUS_SENT_VALUE) {
                    const sendDateVal = latestRecord[CONFIG.FIELDS.SEND_DATE]?.value;
                    const readDateVal = latestRecord[CONFIG.FIELDS.READ_DATE]?.value;
                    const timeoutVal = latestRecord[CONFIG.FIELDS.TIMEOUT]?.value;

                    if (sendDateVal && !readDateVal) {
                        let isTimeout = false;
                        const sentTime = new Date(sendDateVal);
                        const now = new Date();
                        
                        // タイムアウト計算
                        if (timeoutVal === '今日中') {
                            const endOfToday = new Date(sentTime);
                            endOfToday.setHours(23, 59, 59, 999);
                            if (now > endOfToday) isTimeout = true;
                        } else if (timeoutVal === '明日中') {
                            const endOfTomorrow = new Date(sentTime);
                            endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
                            endOfTomorrow.setHours(23, 59, 59, 999);
                            if (now > endOfTomorrow) isTimeout = true;
                        } else {
                            let timeoutHours = 2; // デフォルト
                            const match = (timeoutVal || '').match(/(\d+)/);
                            if (match) {
                                const num = parseInt(match[1], 10);
                                if ((timeoutVal || '').includes('分')) {
                                    timeoutHours = num / 60;
                                } else {
                                    timeoutHours = num;
                                }
                            }
                            const diffHours = (now.getTime() - sentTime.getTime()) / (1000 * 60 * 60);
                            if (diffHours >= timeoutHours) isTimeout = true;
                        }

                        if (isTimeout) {
                            // タイムアウト確定 -> ステータス更新実行
                            await updateRecord(recordId, {
                                [CONFIG.FIELDS.STATUS]: { value: CONFIG.STATUS_TIMEOUT_VALUE }
                            });
                            
                            // 更新通知を出してリロードを促す
                            latestStatus = CONFIG.STATUS_TIMEOUT_VALUE; // ステータスを更新後のものとして扱う
                            // ※ここでリビジョンが変わるため、下のif文には入らず、強制的に通知を出すフローへ
                        }
                    }
                }

                // リビジョンチェック (他者による更新があった場合)
                // または、上記でタイムアウト更新を行った場合(latestStatusが変更された場合)
                if (latestRevision !== currentRevision || latestStatus !== currentStatus) {
                    // ステータス変化チェック
                    if (latestStatus !== currentStatus) {
                        let msg = '';
                        let title = '更新通知';

                        if (latestStatus === CONFIG.STATUS_READ_VALUE) {
                            msg = '申込者が予約情報を閲覧し既読になりました。';
                            title = '既読通知';
                        } else if (latestStatus.includes('取下') || latestStatus.includes('キャンセル')) {
                            msg = '申込者が予約の取下げを行いました。';
                            title = '取下通知';
                        } else if (latestStatus === CONFIG.STATUS_TIMEOUT_VALUE) {
                            msg = '申込者の閲覧期限が切れました（タイムアウト）。';
                            title = '期限切れ通知';
                        } else if (latestStatus === CONFIG.STATUS_RE_REQUEST_VALUE) {
                            msg = '申込者から再依頼がありました。';
                            title = '再依頼通知';
                        } else {
                            msg = `管理状況が「${latestStatus}」に更新されました。`;
                        }

                        msg += '\n\n画面を更新（リロード）して最新の状態を表示しますか？';

                        // 通知のためにポーリングを停止
                        clearInterval(pollingTimer);
                        pollingTimer = null;

                        const confirmed = await showDialog(msg, 'confirm', title, '', 'リロードする');
                        if (confirmed) {
                            location.reload();
                        } else {
                            // リロードしない場合、ユーザーが保存作業を行えるようにポーリングは停止したままにする
                            console.log('User canceled reload. Polling stopped.');
                        }
                    } else {
                        // ステータス以外の変更（備考など）の場合は、リビジョンのみ更新して監視継続
                        currentRevision = latestRevision;
                    }
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        }, POLLING_INTERVAL);
    };

    // イベントリスナー
    kintone.events.on('app.record.detail.show', function(event) {
      // ★重要: スタイルを必ず適用する (担当アサインボタン表示時にもダイアログスタイルが必要なため)
      applyStyles();

      // タイマーリセット (画面遷移時)
      if (pollingTimer) {
          clearInterval(pollingTimer);
          pollingTimer = null;
      }

      const spaceElement = kintone.app.record.getSpaceElement(CONFIG.SPACE_ID);
      
      // 担当者判定: レコードの担当者と、端末の利用者が一致する場合のみ表示
      const recordStaff = event.record[CONFIG.FIELDS.STAFF]?.value;
      const currentStaff = localStorage.getItem('shinryo_ticket_staff_name') || localStorage.getItem('customKey');

      if (spaceElement) {
        // 常にボードを描画 (内部で担当者判定してコンテンツを出し分け)
        renderBoard(spaceElement, event.record);
      }
      
      // リセットボタン (TicketResetスペースに設置)
      const resetSpace = kintone.app.record.getSpaceElement(CONFIG.RESET_SPACE_ID);
      if (resetSpace) {
          renderResetButton(resetSpace, kintone.app.record.getId());
      }

      // ポーリング開始
      startPolling(kintone.app.record.getId(), event.record);

      return event;
    });

})();