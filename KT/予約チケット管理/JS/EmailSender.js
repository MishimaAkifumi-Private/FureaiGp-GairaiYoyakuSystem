/**
 * 外来予約システム - 担当者アサインマネージャー (EmailSender.js - Refactored)
 *
 * [機能]
 * 1. 担当者アサイン機能: 「担当する」ボタンを表示し、担当者を自分に設定する。
 */

(function() {
  "use strict";

  // --- 設定値 (環境に合わせて適宜修正してください) ---
  const CONFIG = {
    ASSIGN_SPACE_ID: 'MyTicket', // 担当者アサインボタン設置スペースID
    
    // フィールドコード設定
    FIELDS: {
      STAFF: '担当者',         // 担当者フィールド
      STATUS: '管理状況',
    },

    // 更新する値 (ドロップダウンの選択肢と完全一致させる必要があります: 2026-01-07変更)
    UPDATE_VALUES: {
      STATUS_ASSIGNED: '担当設定',
    },

    // UIカラー
    COLORS: {
      PRIMARY: '#005a9e',
      DANGER: '#e74c3c',
      WARNING: '#f39c12',
      SUCCESS: '#27ae60',
      TEXT: '#333333',
      BG: '#ffffff'
    }
  };

  const LOG_PREFIX = '[EmailSender v3.2]';

  /**
   * ログ出力ヘルパー (勝手に削除禁止)
   */
  function log(message, data = null) {
    if (data) {
      console.log(`${LOG_PREFIX} ${message}`, data);
    } else {
      console.log(`${LOG_PREFIX} ${message}`);
    }
  }

  function errorLog(message, error = null) {
    if (error) {
      console.error(`${LOG_PREFIX} [ERROR] ${message}`, error);
    } else {
      console.error(`${LOG_PREFIX} [ERROR] ${message}`);
    }
  }

  /**
   * フィールド値安全取得
   */
  function getValue(record, fieldCode) {
    if (record && record[fieldCode]) {
      return record[fieldCode].value || '';
    }
    return '';
  }

  /**
   * --- ローディングスピナー (復旧機能) ---
   */
  function showSpinner() {
    if (document.getElementById('custom-spinner')) return;

    const overlay = document.createElement('div');
    overlay.id = 'custom-spinner';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background-color: rgba(255, 255, 255, 0.7);
      z-index: 11000;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      backdrop-filter: blur(2px);
    `;

    // CSSスピナー作成
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      border: 8px solid #f3f3f3;
      border-top: 8px solid ${CONFIG.COLORS.PRIMARY};
      border-radius: 50%;
      width: 60px; height: 60px;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    `;

    // アニメーション定義の注入
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(styleSheet);

    const text = document.createElement('div');
    text.innerText = '処理中...';
    text.style.cssText = `font-weight:bold; color: #555; font-size:16px;`;

    overlay.appendChild(spinner);
    overlay.appendChild(text);
    document.body.appendChild(overlay);
  }

  function hideSpinner() {
    const overlay = document.getElementById('custom-spinner');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * --- スタイリッシュモーダルシステム ---
   */
  function showModal(type, title, message, onConfirm = null, okLabel = null) {
    const existing = document.getElementById('custom-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.4);
      z-index: 10000;
      display: flex; justify-content: center; align-items: center;
      opacity: 0; transition: opacity 0.3s ease;
    `;

    let themeColor = CONFIG.COLORS.PRIMARY;
    let icon = 'ℹ️';
    if (type === 'warning') { themeColor = CONFIG.COLORS.WARNING; icon = '⚠️'; }
    if (type === 'error')   { themeColor = CONFIG.COLORS.DANGER; icon = '❌'; }
    if (type === 'success') { themeColor = CONFIG.COLORS.SUCCESS; icon = '✅'; }
    if (type === 'confirm') { themeColor = CONFIG.COLORS.PRIMARY; icon = '📧'; }

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: ${CONFIG.COLORS.BG};
      width: 450px; max-width: 90%;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      overflow: hidden;
      transform: translateY(-20px); transition: transform 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background-color: ${themeColor};
      color: white;
      padding: 15px 20px;
      font-weight: bold;
      font-size: 16px;
      display: flex; align-items: center; gap: 10px;
    `;
    header.innerHTML = `<span>${icon}</span> <span>${title}</span>`;

    const body = document.createElement('div');
    body.style.cssText = `padding: 25px 20px; color: ${CONFIG.COLORS.TEXT}; line-height: 1.6; font-size: 14px;`;
    body.innerHTML = message;

    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 0 20px 20px 20px;
      display: flex; justify-content: flex-end; gap: 10px;
    `;

    if (type === 'confirm') {
      const cancelBtn = document.createElement('button');
      cancelBtn.innerText = 'キャンセル';
      cancelBtn.style.cssText = `
        padding: 8px 16px; border: 1px solid #ddd; background: #f8f9fa;
        color: #555; border-radius: 4px; cursor: pointer; font-weight: bold;
      `;
      cancelBtn.onmouseover = () => { cancelBtn.style.background = '#e2e6ea'; };
      cancelBtn.onmouseout = () => { cancelBtn.style.background = '#f8f9fa'; };
      cancelBtn.onclick = () => closeModal(overlay);
      footer.appendChild(cancelBtn);
    }

    const okBtn = document.createElement('button');
    okBtn.innerText = okLabel || (type === 'confirm' ? 'はい' : '閉じる');
    okBtn.style.cssText = `
      padding: 8px 24px; border: none; background: ${themeColor};
      color: white; border-radius: 4px; cursor: pointer; font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    okBtn.onclick = () => {
      closeModal(overlay);
      if (onConfirm) onConfirm();
    };
    footer.appendChild(okBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'translateY(0)';
    }, 10);
  }

  function closeModal(overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }, 300);
  }

  // --- メイン処理 ---
  kintone.events.on('app.record.detail.show', function(event) {
    // ReservationControlBoard.js に機能を統合したため無効化
    return event;
  });

})();