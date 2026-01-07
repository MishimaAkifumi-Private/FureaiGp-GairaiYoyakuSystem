/**
 * 外来予約システム - 予約メール送信マネージャー (Version 3.2 Status-Schema-Update)
 *
 * [機能]
 * 1. Kintoneレコードから予約情報を抽出
 * 2. 必須項目の厳格なバリデーション
 * 3. 独自モーダルによる警告・確認・完了表示
 * 4. レコードIDに基づく「既読確認用URL」の動的生成
 * 5. Firebase Functions へ POST リクエスト送信
 * 6. 送信中の画面ロック（ローディングスピナー）
 * 7. 【修正】送信成功時の Kintone レコード自動更新 (管理ステータス・送信日時)
 * 8. 詳細なデバッグログ出力 (トラブルシューティング用)
 *
 * [変更履歴]
 * 2026-01-07: Version 3.2
 * - Kintoneアプリのスキーマ変更に対応（管理ステータスの選択肢変更）。
 * - 送信後のステータスを「メール送信済」に統一。
 */

(function() {
  "use strict";

  // --- 設定値 (環境に合わせて適宜修正してください) ---
  const CONFIG = {
    SPACE_ID: 'MailSend', // ボタン設置スペースID
    
    // API関連
    API_URL: 'http://127.0.0.1:5001/fureai-reservation-center/us-central1/sendReservationMail',
    CONFIRM_BASE_URL: 'http://127.0.0.1:5001/fureai-reservation-center/us-central1/confirmReservation',
    
    // フィールドコード設定
    FIELDS: {
      EMAIL: 'メールアドレス',
      LAST_NAME: '姓漢字',
      FIRST_NAME: '名漢字',
      TYPE: '用件',            // 初診 / 変更 / 取消
      RES_DATE: '確定予約日',   // YYYY-MM-DD
      RES_TIME: '確定予約時刻', // HH:mm
      DEPT: '診療科',
      
      // 【修正】更新用フィールド (プロセス管理の'ステータス'ではなく、ドロップダウンの'管理ステータス'を指定)
      STATUS: '管理ステータス',
      SEND_DATE: 'メール送信日時'   // 送信完了日時を記録するフィールド
    },

    // 更新する値 (ドロップダウンの選択肢と完全一致させる必要があります: 2026-01-07変更)
    UPDATE_VALUES: {
      STATUS_SENT: 'メール送信済'
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
  function showModal(type, title, message, onConfirm = null) {
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
    okBtn.innerText = type === 'confirm' ? '送信する' : '閉じる';
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

  /**
   * --- Kintone レコード更新処理 (修正版) ---
   * @param {string} recordId - レコードID
   * @param {string} type - 用件 (初診/変更/取消)
   */
  async function updateKintoneRecord(recordId, type) {
    log(`Updating Kintone Record ID: ${recordId}, Type: ${type}`);
    
    // 現在日時 (ISO形式)
    const nowISO = new Date().toISOString();

    // 更新するステータス値を決定 (Version 3.2: 統一されたステータスを使用)
    const newStatus = CONFIG.UPDATE_VALUES.STATUS_SENT;

    const body = {
      app: kintone.app.getId(),
      id: recordId,
      record: {
        [CONFIG.FIELDS.STATUS]: { value: newStatus },
        [CONFIG.FIELDS.SEND_DATE]: { value: nowISO }
      }
    };

    log('Kintone Update Payload:', body);

    try {
      const resp = await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body);
      log('Kintone Update Success:', resp);
      return true;
    } catch (error) {
      errorLog('Kintone Update Failed:', error);
      throw error;
    }
  }

  // --- メイン処理 ---
  kintone.events.on('app.record.detail.show', function(event) {
    const spaceElement = kintone.app.record.getSpaceElement(CONFIG.SPACE_ID);
    if (!spaceElement) {
      errorLog(`Space Element "${CONFIG.SPACE_ID}" not found.`);
      return event;
    }

    // 二重描画防止
    if (document.getElementById('send-reservation-mail-btn')) return event;

    // ボタン作成
    const btn = document.createElement('button');
    btn.id = 'send-reservation-mail-btn';
    btn.innerText = '予約メール送信';
    btn.style.cssText = `
      padding: 10px 24px;
      background-color: ${CONFIG.COLORS.PRIMARY};
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      transition: background-color 0.2s;
    `;
    btn.onmouseover = () => { btn.style.backgroundColor = '#004a80'; };
    btn.onmouseout  = () => { btn.style.backgroundColor = CONFIG.COLORS.PRIMARY; };

    // クリックイベント
    btn.onclick = async () => {
      log('Button Clicked.');
      const recordData = kintone.app.record.get();
      const record = recordData.record;
      const recordId = kintone.app.record.getId();

      // データ取得
      const email = getValue(record, CONFIG.FIELDS.EMAIL);
      const lastName = getValue(record, CONFIG.FIELDS.LAST_NAME);
      const firstName = getValue(record, CONFIG.FIELDS.FIRST_NAME);
      const type = getValue(record, CONFIG.FIELDS.TYPE);
      const resDate = getValue(record, CONFIG.FIELDS.RES_DATE);
      const resTime = getValue(record, CONFIG.FIELDS.RES_TIME);
      const dept = getValue(record, CONFIG.FIELDS.DEPT);
      const fullName = `${lastName} ${firstName}`.trim();

      log('Extracted Data:', { email, fullName, type, resDate, resTime });

      // --- バリデーション ---
      if (!email) {
        showModal('error', 'エラー: 宛先不明', '「メールアドレス」が入力されていません。');
        return;
      }
      if (!type) {
        showModal('error', 'エラー: 用件不明', '「用件」が選択されていません。');
        return;
      }
      if (!resDate || !resTime) {
        showModal('warning', '送信できません', '<strong>確定予約日</strong> または <strong>確定予約時刻</strong> が空欄です。');
        return;
      }

      // --- URL生成 ---
      const generatedUrl = `${CONFIG.CONFIRM_BASE_URL}?id=${recordId}`;
      log(`Generated Dynamic URL: ${generatedUrl}`);

      // --- 確認画面 ---
      // 次のステータスを表示用に判定 (Version 3.2)
      const nextStatusLabel = CONFIG.UPDATE_VALUES.STATUS_SENT;

      const confirmMsg = `
        以下の内容でメールを送信します。<br>よろしいですか？<br><br>
        <div style="background:#f9f9f9; padding:10px; border-radius:4px; text-align:left;">
          <strong>宛先:</strong> ${fullName} 様 (${email})<br>
          <strong>用件:</strong> ${type}<br>
          <strong>日時:</strong> ${resDate} ${resTime}<br>
          <strong>診療科:</strong> ${dept || '（未指定）'}<br>
          <hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;">
          <small>※送信後、レコードのステータスは「${nextStatusLabel}」に更新されます。</small>
        </div>
      `;

      showModal('confirm', '送信確認', confirmMsg, async () => {
        log('User confirmed sending.');
        
        // ローディング開始 (画面ロック)
        showSpinner();

        // ペイロード作成
        const payload = {
          to: email,
          name: fullName,
          type: type,
          reservationDate: resDate,
          reservationTime: resTime,
          department: dept,
          url: generatedUrl
        };
        log('Request Payload:', payload);

        try {
          // 1. メール送信 (Firebase Functions)
          log('Fetching API...');
          const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          const responseText = await response.text();
          let responseJson = {};
          try { responseJson = JSON.parse(responseText); } catch(e) {}

          log('API Status:', response.status);
          log('API Response Body:', responseJson);

          if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${responseJson.message || responseText}`);
          }

          // 2. Kintoneレコード更新 (成功時のみ)
          log('Mail sent successfully. Proceeding to update Kintone record...');
          await updateKintoneRecord(recordId, type);

          // 3. 完了表示
          hideSpinner(); // スピナー消去
          showModal('success', '処理完了', 'メール送信およびレコード更新が完了しました。', () => {
            log('Reloading page...');
            location.reload(); // 最新状態を反映するためリロード
          });

        } catch (error) {
          hideSpinner(); // エラー時も必ずスピナーを消す
          errorLog('Process Failed', error);
          
          let errMsg = '処理中にエラーが発生しました。<br>';
          if (error.message.includes('API Error')) {
            errMsg += 'メールサーバーへの接続または送信に失敗しました。';
          } else if (error.message.includes('Kintone Update Failed')) {
            errMsg += 'メールは送信されましたが、Kintoneのステータス更新に失敗しました。手動で更新してください。';
          } else {
            errMsg += '予期せぬエラーです。管理者に連絡してください。';
          }
          
          showModal('error', '送信失敗', `${errMsg}<br><small style="color:#777;">${error.message}</small>`);
        }
      });
    };

    spaceElement.appendChild(btn);
    return event;
  });
})();