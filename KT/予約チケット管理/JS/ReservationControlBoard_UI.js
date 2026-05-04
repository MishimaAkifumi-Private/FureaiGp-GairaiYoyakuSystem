/**
 * ReservationControlBoard_UI.js
 * 予約管理ダッシュボード (UIコンポーネント・ユーティリティ群)
 */
(function() {
    'use strict';

    if (window.RcbUI) return;
    console.log('[RcbUI] Loading UI and Utilities...');

    const CONFIG = {
      SPACE_ID: 'RreservationContorlBoard',
      RESET_SPACE_ID: 'TicketReset',
      API_URL: 'https://sendreservationmail-yoslzibmlq-uc.a.run.app/',
      CONFIRM_BASE_URL: 'https://confirmreservation-yoslzibmlq-uc.a.run.app/',
      STATUS_SENT_VALUE: 'メール送信済', // 送信後のステータス
      STATUS_READ_VALUE: 'メール既読', // 既読後のステータス
      STATUS_TIMEOUT_VALUE: '閲覧期限切れ', // タイムアウト後のステータス
      STATUS_RE_REQUEST_VALUE: '申込者再依頼', // 再依頼ステータス
      STATUS_PHONE_VALUE: '電話合意済', // 電話合意後のステータス
      STATUS_WITHDRAWN_VALUE: 'スタッフ取下', // 取下後のステータス
      STATUS_WEB_WITHDRAWN_VALUE: 'WEB取下', // WEB取下後のステータス
      STATUS_REVIVED_VALUE: 'スタッフ取下中止', // 取消中止後のステータス
      STATUS_REQUIRE_PHONE_VALUE: '要電話対応', // 要電話対応ステータス
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
        background: #fdfdfd;
        padding: 6px 12px;
        border-radius: 4px;
        box-shadow: none;
        border: 1px solid #e0e0e0;
        border-left: 5px solid #3498db;
        min-width: 100px;
        cursor: default;
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
        background-color: #fff;
        border: 1px solid #e0e0e0;
        padding: 25px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .rcb-input-row {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
        flex-wrap: wrap;
      }
      .rcb-date-input {
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
        transition: all 0.2s;
      }
      .rcb-date-input.selected {
        background-color: #1890ff !important;
        color: white !important;
        border-color: #1890ff !important;
        font-weight: bold;
        color-scheme: dark;
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
        transition: all 0.1s ease;
        box-shadow: 0 2px 0 rgba(0,0,0,0.05);
      }
      .rcb-time-btn:hover:not(.selected) {
        background-color: #e6f7ff;
        border-color: #1890ff;
        transform: translateY(-1px);
        box-shadow: 0 3px 0 rgba(24,144,255,0.2);
      }
      .rcb-time-btn:active:not(.selected) {
        transform: translateY(1px);
        box-shadow: none;
      }
      .rcb-time-btn.selected {
        background-color: #1890ff;
        color: white;
        border-color: #1890ff;
        font-weight: bold;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        transform: translateY(1px);
      }
      .rcb-btn-save {
        background-color: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        transition: all 0.1s ease;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2);
        border-bottom: 3px solid rgba(0,0,0,0.2);
      }
      .rcb-btn-save:hover:not(:disabled) {
        filter: brightness(0.9);
        transform: translateY(-1px);
        box-shadow: 0 6px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3);
        border-bottom: 4px solid rgba(0,0,0,0.2);
        margin-bottom: -1px;
      }
      .rcb-btn-save:active:not(:disabled) {
        filter: brightness(0.85);
        transform: translateY(2px);
        border-bottom: 1px solid rgba(0,0,0,0.2);
        margin-bottom: 2px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.2);
      }
      .rcb-btn-save:disabled {
        cursor: not-allowed;
        box-shadow: none;
        border-bottom: none;
        transform: none;
        margin-bottom: 3px;
        opacity: 0.6;
      }
      .rcb-btn-secondary {
        background-color: #fff;
        color: #555;
        border: 1px solid #ccc;
        padding: 6px 15px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: bold;
        font-size: 13px;
        display: flex; align-items: center; gap: 5px;
        transition: all 0.1s ease;
        box-shadow: 0 3px 5px rgba(0,0,0,0.05), inset 0 -2px 0 rgba(0,0,0,0.05);
      }
      .rcb-btn-secondary:hover:not(:disabled) {
        background-color: #f8f9fa;
        border-color: #bbb;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(0,0,0,0.08), inset 0 -2px 0 rgba(0,0,0,0.05);
      }
      .rcb-btn-secondary:active:not(:disabled) {
        transform: translateY(1px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
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
        padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;
        transition: all 0.1s ease;
        box-shadow: 0 3px 5px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2);
        border-bottom: 3px solid rgba(0,0,0,0.2);
      }
      .rcb-modal-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 5px 7px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3);
        border-bottom: 4px solid rgba(0,0,0,0.2);
        margin-bottom: -1px;
      }
      .rcb-modal-btn:active:not(:disabled) {
        transform: translateY(2px);
        border-bottom: 1px solid rgba(0,0,0,0.2);
        margin-bottom: 2px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.2);
      }
      .rcb-modal-btn-cancel {
        background: #f8f9fa; color: #555; border: 1px solid #ddd; border-bottom: 3px solid #ccc;
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
      
      /* Cancel Form Styles (Improved) */
      .rcb-cancel-container {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 25px;
        text-align: left;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .rcb-form-group {
        margin-bottom: 20px;
      }
      .rcb-label {
        display: block;
        font-weight: bold;
        margin-bottom: 8px;
        color: #2c3e50;
        font-size: 14px;
      }
      .rcb-input-text {
        width: 100%;
        max-width: 400px;
        padding: 10px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        font-size: 14px;
        transition: border-color 0.2s;
      }
      .rcb-input-text:focus {
        border-color: #3498db;
        outline: none;
      }
      .rcb-info-block {
        background-color: #f8f9fa;
        padding: 12px 15px;
        border-radius: 4px;
        font-size: 13px;
        color: #555;
        margin-bottom: 15px;
        border-left: 4px solid #3498db;
        line-height: 1.5;
      }
      
      /* Modal Confirm Styles (New) */
      .rcb-confirm-msg {
        margin-bottom: 20px;
        font-size: 15px;
        color: #333;
        text-align: center;
        font-weight: bold;
      }
      .rcb-confirm-box {
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 20px;
        text-align: left;
      }
      .rcb-confirm-row {
        display: flex;
        margin-bottom: 10px;
        font-size: 14px;
        line-height: 1.5;
      }
      .rcb-confirm-label {
        flex: 0 0 80px;
        font-weight: bold;
        color: #7f8c8d;
      }
      .rcb-confirm-value {
        flex: 1;
        color: #2c3e50;
        font-weight: 500;
        word-break: break-word;
      }
      .rcb-confirm-divider {
        border: 0;
        border-top: 1px dashed #ccc;
        margin: 15px 0;
      }
      .rcb-confirm-note {
        display: block;
        font-size: 12px;
        color: #95a5a6;
      }
      .rcb-confirm-sub {
        font-size: 12px;
        color: #7f8c8d;
        margin-left: 5px;
      }
      
      /* Hide Standard Kintone Elements */
      .gaia-argoui-app-menu-add,
      .gaia-argoui-app-menu-copy,
      .sidebar-tab-comments-gaia,
      .sidebar-tab-history-gaia,
      .gaia-argoui-app-infobar-iconlist,
      .gaia-argoui-app-subtotalbutton,
      .gaia-argoui-optionmenubutton,
      .gaia-argoui-app-viewtoggle,
      .gaia-argoui-app-filterbutton {
        display: none !important;
      }
      
      /* Subtable Header Style (経過情報などのサブテーブルヘッダーを濃いグレーに) */
      thead.subtable-header-gaia th.subtable-label-gaia {
        background-color: #555555 !important;
        border-color: #cccccc !important;
      }
      thead.subtable-header-gaia th.subtable-label-gaia .subtable-label-inner-gaia {
        color: #ffffff !important;
      }

      /* RecordList Header Style (一覧画面ヘッダーを濃いグレーに) */
      thead th.recordlist-header-cell-gaia {
        background-color: #555555 !important;
        border-color: #cccccc !important;
        text-align: center !important;
      }
      thead th.recordlist-header-cell-gaia .recordlist-header-label-gaia {
        color: #ffffff !important;
      }
      thead th.recordlist-header-cell-gaia .recordlist-header-cell-inner-wrapper-gaia {
        justify-content: center !important;
      }

      /* 一覧画面のレコードセルを中央揃えに */
      table.recordlist-gaia td.recordlist-cell-gaia {
        text-align: center !important;
        vertical-align: middle !important;
      }
      table.recordlist-gaia td.recordlist-cell-gaia > div {
        text-align: center !important;
        justify-content: center !important;
      }

      /* Group Label Style (for "チケット情報") */
      .custom-ticket-text {
        background-color: #444444 !important;
        color: white !important;
        padding: 5px 12px;
        border-radius: 4px;
        font-weight: bold;
        margin-left: 2px !important;
        display: inline-block;
      }

      /* アサインボタン点滅アニメーション */
      @keyframes rcb-btn-blink-anim {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
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
  
    // 特定のグループラベルにスタイルクラスを付与
    const styleGroupLabels = () => {
      // Kintoneの描画タイミングを考慮して少し待機
      setTimeout(() => {
        const labels = document.querySelectorAll('.group-label-gaia');
        labels.forEach(label => {
          if (label.textContent.trim() === 'チケット情報' && !label.querySelector('.custom-ticket-text')) {
            // Kintone標準のアウトライン（フォーカス時の青枠）を消去
            label.style.outline = 'none';
            label.style.border = 'none';
            
            // テキスト部分だけを別のspanで囲んで、アイコンと分離させる
            label.textContent = ''; 
            const textSpan = document.createElement('span');
            textSpan.className = 'custom-ticket-text';
            textSpan.textContent = 'チケット情報';
            label.appendChild(textSpan);
          }
        });
      }, 100);
    };

    // --- 砂時計 (スピナー) の表示・非表示関数 ---
    const showSpinner = (text = '処理中...') => {
        let overlay = document.getElementById('rcb-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'rcb-loading-overlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.7); z-index: 20000; display: flex; align-items: center; justify-content: center; flex-direction: column; cursor: wait;';
            
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                border: 6px solid #f3f3f3;
                border-top: 6px solid #3498db;
                border-radius: 50%;
                width: 50px; height: 50px;
                animation: rcb-spin 1s linear infinite;
            `;
            
            const styleSheet = document.createElement("style");
            styleSheet.innerText = `@keyframes rcb-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(styleSheet);

            const msg = document.createElement('div');
            msg.id = 'rcb-loading-msg';
            msg.style.cssText = 'margin-top: 15px; font-size: 16px; font-weight: bold; color: #333; letter-spacing: 1px;';
            
            overlay.appendChild(spinner);
            overlay.appendChild(msg);
            document.body.appendChild(overlay);
        }
        document.getElementById('rcb-loading-msg').textContent = text;
        overlay.style.display = 'flex';
    };

    const hideSpinner = () => {
        const overlay = document.getElementById('rcb-loading-overlay');
        if (overlay) overlay.style.display = 'none';
    };

    // 独自モーダル表示関数
    const showDialog = (message, type = 'alert', title = null, placeholder = '', okLabel = null, cancelLabel = null, checkboxLabel = null) => {
      return new Promise((resolve) => {
        const existing = document.getElementById('rcb-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'rcb-modal-overlay';
        overlay.className = 'rcb-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'rcb-modal';

        // ★追加: メールプレビューの場合は幅を広げる
        if (message.includes('rcb-confirm-box')) {
          modal.style.width = '600px';
        }
        
        let headerTitle = title;
        let headerIcon = '';
        if (!headerTitle) {
            headerTitle = (type === 'confirm' || type === 'prompt') ? '確認' : (type === 'error' ? 'エラー' : '通知');
        }
        if (type === 'error') {
            headerIcon = '❌';
        } else if (title === '送信確認') {
            headerIcon = '📧';
        } else if (title && (title.includes('強制終了') || title.includes('破棄') || title.includes('取下げ'))) {
            headerIcon = '⚠️';
        } else {
            headerIcon = 'ℹ️';
        }

        const header = document.createElement('div');
        header.className = 'rcb-modal-header';
        header.style.backgroundColor = (type === 'confirm' || type === 'prompt') ? '#3498db' : (type === 'error' ? '#e74c3c' : '#27ae60');
        header.innerHTML = `<span>${headerIcon}</span> <span>${headerTitle}</span>`;
        
        const body = document.createElement('div');
        body.className = 'rcb-modal-body';
        // HTMLタグで始まる場合はそのまま、それ以外（テキストのみ）は改行を<br>に変換
        if (message.trim().startsWith('<')) {
            body.innerHTML = message;
        } else {
            body.innerHTML = message.replace(/\n/g, '<br>');
        }
        
        let textarea = null;
        if (type === 'prompt') {
            textarea = document.createElement('textarea');
            textarea.className = 'rcb-modal-textarea';
            textarea.placeholder = placeholder;
            body.appendChild(textarea);
        }

        let checkbox = null;
        if (checkboxLabel) {
            const checkContainer = document.createElement('div');
            checkContainer.style.cssText = 'margin-top: 15px; padding: 15px; background: #fff5f5; border: 1px dashed #e74c3c; border-radius: 4px; text-align: left;';
            
            const label = document.createElement('label');
            label.style.cssText = 'font-weight: bold; cursor: pointer; color: #c0392b; font-size: 14px; display: flex; align-items: center; gap: 8px; user-select: none;';
            
            checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #e74c3c; margin: 0;';
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(checkboxLabel));
            checkContainer.appendChild(label);
            body.appendChild(checkContainer);
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

        let okBtn = null;
        if (type === 'confirm') {
          footer.appendChild(createBtn(cancelLabel || 'キャンセル', 'rcb-modal-btn-cancel', false));
          okBtn = createBtn(okLabel || 'はい', 'rcb-modal-btn-ok', true);
          footer.appendChild(okBtn);
        } else if (type === 'prompt') {
          footer.appendChild(createBtn(cancelLabel || 'キャンセル', 'rcb-modal-btn-cancel', null));
          okBtn = createBtn(okLabel || 'OK', 'rcb-modal-btn-ok', () => textarea.value);
          footer.appendChild(okBtn);
        } else {
          okBtn = createBtn(okLabel || 'OK', 'rcb-modal-btn-ok', true);
          footer.appendChild(okBtn);
        }

        if (checkbox && okBtn) {
            okBtn.disabled = true;
            okBtn.style.opacity = '0.5';
            okBtn.style.cursor = 'not-allowed';
            checkbox.onchange = () => {
                if (checkbox.checked) {
                    okBtn.disabled = false;
                    okBtn.style.opacity = '1';
                    okBtn.style.cursor = 'pointer';
                } else {
                    okBtn.disabled = true;
                    okBtn.style.opacity = '0.5';
                    okBtn.style.cursor = 'not-allowed';
                }
            };
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

    // 評価ダイアログ表示関数
    const showEvaluationDialog = (message, title, method, initialData, checkboxLabel = null, okLabel = '確定', cancelLabel = 'キャンセル') => {
      return new Promise((resolve) => {
        const existing = document.getElementById('rcb-eval-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'rcb-eval-modal-overlay';
        overlay.className = 'rcb-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'rcb-modal';
        if (message.includes('rcb-confirm-box')) {
          modal.style.width = '600px';
        }

        const header = document.createElement('div');
        header.className = 'rcb-modal-header';
        header.style.backgroundColor = '#3498db';
        header.innerHTML = `<span>📝</span> <span>${title}</span>`;
        
        const body = document.createElement('div');
        body.className = 'rcb-modal-body';
        body.style.paddingTop = '5px';
        
        const msgDiv = document.createElement('div');
        if (message.trim()) {
            if (message.trim().startsWith('<')) {
                msgDiv.innerHTML = message;
            } else {
                msgDiv.innerHTML = message.replace(/\n/g, '<br>');
            }
            body.appendChild(msgDiv);
        }

        const evalTitle = document.createElement('div');
        evalTitle.style.cssText = 'margin-top: 10px; margin-bottom: 10px; font-weight: normal; color: #7f8c8d; font-size: 11px; text-align: left;';
        evalTitle.textContent = '※今後の対応に役立つ情報なので、できるだけ入力してください';
        body.appendChild(evalTitle);

        // 評価入力セクション
        const evalContainer = document.createElement('div');
        evalContainer.style.cssText = 'padding: 15px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; text-align: left;';

        const createCheckboxes = (label, name, options, currentValues) => {
            if (options.length === 0) return null;
            const group = document.createElement('div');
            group.style.marginBottom = '10px';

            const checkContainer = document.createElement('div');
            checkContainer.style.display = 'flex';
            checkContainer.style.gap = '10px';
            checkContainer.style.flexWrap = 'wrap';

            options.forEach(opt => {
                const wrap = document.createElement('label');
                wrap.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 13px; color: #333;';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.name = name;
                cb.value = opt;
                cb.style.marginRight = '4px';
                if (currentValues.includes(opt)) cb.checked = true;
                wrap.appendChild(cb);
                wrap.appendChild(document.createTextNode(opt));
                checkContainer.appendChild(wrap);
            });
            group.appendChild(checkContainer);
            return group;
        };

        // シチュエーションによって表示する項目を分ける
        let evalOptions = [];
        if (method === 'phone_after_call' || method === 'phone') {
            evalOptions = ['電話が繫がりにくい', '長電話になりやすい', '話が噛み合いにくい'];
        } else {
            evalOptions = []; // 電話以外は通常のアンケート項目はなし
        }

        const checkGroup = createCheckboxes('チェック項目', 'eval-common', evalOptions, initialData.common);
        if (checkGroup) evalContainer.appendChild(checkGroup);

        const memoGroup = document.createElement('div');
        const memoLbl = document.createElement('div');
        memoLbl.style.cssText = 'font-size: 12px; font-weight: bold; color: #7f8c8d; margin-bottom: 5px;';
        memoLbl.textContent = 'メモ';
        memoGroup.appendChild(memoLbl);
        
        const memoInp = document.createElement('input');
        memoInp.type = 'text';
        memoInp.className = 'rcb-input-text';
        memoInp.style.cssText = 'width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 13px;';
        memoInp.value = initialData.memo;
        memoGroup.appendChild(memoInp);
        evalContainer.appendChild(memoGroup);

        body.appendChild(evalContainer);

        // 追加チェックボックス (例: 破棄時の電カル枠解除確認など)
        let confirmCheckbox = null;
        if (checkboxLabel) {
            const checkContainer = document.createElement('div');
            checkContainer.style.cssText = 'margin-top: 15px; padding: 15px; background: #fff5f5; border: 1px dashed #e74c3c; border-radius: 4px; text-align: left;';
            const label = document.createElement('label');
            label.style.cssText = 'font-weight: bold; cursor: pointer; color: #c0392b; font-size: 14px; display: flex; align-items: center; gap: 8px; user-select: none;';
            confirmCheckbox = document.createElement('input');
            confirmCheckbox.type = 'checkbox';
            confirmCheckbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #e74c3c; margin: 0;';
            label.appendChild(confirmCheckbox);
            label.appendChild(document.createTextNode(checkboxLabel));
            checkContainer.appendChild(label);
            body.appendChild(checkContainer);
        }

        const footer = document.createElement('div');
        footer.className = 'rcb-modal-footer';
        
        if (cancelLabel) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'rcb-modal-btn rcb-modal-btn-cancel';
            cancelBtn.textContent = cancelLabel;
            cancelBtn.onclick = () => {
                document.body.removeChild(overlay);
                resolve(null);
            };
            footer.appendChild(cancelBtn);
        }

        const okBtn = document.createElement('button');
        okBtn.className = 'rcb-modal-btn rcb-modal-btn-ok';
        okBtn.textContent = okLabel;

        if (confirmCheckbox) {
            okBtn.disabled = true;
            okBtn.style.opacity = '0.5';
            okBtn.style.cursor = 'not-allowed';
            confirmCheckbox.onchange = () => {
                if (confirmCheckbox.checked) {
                    okBtn.disabled = false;
                    okBtn.style.opacity = '1';
                    okBtn.style.cursor = 'pointer';
                } else {
                    okBtn.disabled = true;
                    okBtn.style.opacity = '0.5';
                    okBtn.style.cursor = 'not-allowed';
                }
            };
        }

        okBtn.onclick = () => {
            const checkedVals = Array.from(evalContainer.querySelectorAll('input[name="eval-common"]:checked')).map(e => e.value);
            
            // ダイアログで表示されなかったが、元々チェックされていた項目を裏で保持する
            const hiddenCheckedVals = (initialData.common || []).filter(val => !evalOptions.includes(val));
            const commonVals = [...new Set([...checkedVals, ...hiddenCheckedVals])];
            const memoVal = memoInp.value.trim();

            document.body.removeChild(overlay);
            resolve({ common: commonVals, memo: memoVal });
        };

        footer.appendChild(okBtn);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(() => { overlay.style.opacity = '1'; modal.style.transform = 'translateY(0)'; }, 10);
      });
    };

    // API更新ヘルパー
    const updateRecord = async (recordId, payload, extraHistories = [], resetHistory = false, skipStatusHistory = false, actionReason = '') => {
      try {
        let currentHistories = [];
        
        // 既存の履歴を取得 (リセットしない場合)
        if (!resetHistory) {
          const resp = await kintone.api(kintone.api.url('/k/v1/record', true), 'GET', {
            app: kintone.app.getId(),
            id: recordId
          });
          currentHistories = resp.record['経過情報']?.value || [];
        }

        const now = new Date();
        const currentStaff = localStorage.getItem('shinryo_ticket_staff_name') || localStorage.getItem('customKey') || 'システム';
        
        const formatDateTime = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const s = String(date.getSeconds()).padStart(2, '0');
            return `${y}/${m}/${d} ${h}:${min}:${s}`;
        };
        
        // 追加するステータスのリスト
        let statusesToAdd = [...extraHistories];
        if (!skipStatusHistory && payload[CONFIG.FIELDS.STATUS] && payload[CONFIG.FIELDS.STATUS].value) {
            statusesToAdd.push(payload[CONFIG.FIELDS.STATUS].value);
        }

        if (statusesToAdd.length > 0 || resetHistory) {
            statusesToAdd.forEach((st, index) => {
                let recStaff = currentStaff;
                if (st === '未着手') {
                    recStaff = '未設定';
                }
                const historyRow = { 
                    "経過情報_日時": { value: formatDateTime(now) }, 
                    "経過情報_担当者": { value: recStaff }, 
                    "経過情報_管理状態": { value: st } 
                };
                
                // 操作理由は、一連の履歴の最初の行（トリガーとなったアクション）にのみ記録する
                if (actionReason && index === 0) {
                    historyRow["経過情報_理由"] = { value: actionReason };
                }
                currentHistories.push({ value: historyRow });
            });
            payload['経過情報'] = { value: currentHistories };
        }

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

    // 和暦フォーマット (例: 令和8年4月18日)
    const formatToJapaneseDate = (dateStr) => {
      if (!dateStr) return '';
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("ja-JP-u-ca-japanese", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
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

    // 外部公開 (メインロジックから呼び出せるようにする)
    window.RcbUI = {
        CONFIG,
        applyStyles,
        styleGroupLabels,
        showSpinner,
        hideSpinner,
        showDialog,
        showEvaluationDialog,
        updateRecord,
        formatDateISO,
        formatToJapaneseDate,
        isPastTime
    };

})();