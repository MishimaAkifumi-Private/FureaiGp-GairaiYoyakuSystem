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
    TELE_SPACE_ID: 'TeleConfirmation', // 電話調整ボタン設置スペースID
    CANCEL_SPACE_ID: 'CancelByStaff', // スタッフキャンセルボタン設置スペースID
    WAY_OF_REPLY_SPACE_ID: 'WayOfReply', // 対応方法選択スペースID
    RES_DATE_SPACE_ID: 'ReservationDate', // 予約日時表示スペースID
    ASSIGN_SPACE_ID: 'MyTicket', // 担当者アサインボタン設置スペースID
    
// API関連（発行された本番URLを設定）
    API_URL: 'https://sendreservationmail-yoslzibmlq-uc.a.run.app',
    CONFIRM_BASE_URL: 'https://confirmreservation-yoslzibmlq-uc.a.run.app',
    
    // フィールドコード設定
    FIELDS: {
      EMAIL: 'メールアドレス',
      LAST_NAME: '姓漢字',
      FIRST_NAME: '名漢字',
      TYPE: '用件',            // 初診 / 変更 / 取消
      RES_DATE: '確定予約日',   // YYYY-MM-DD
      RES_TIME: '確定予約時刻', // HH:mm
      DEPT: '診療科',
      STAFF: '担当者',         // 担当者フィールド
      
      // 【修正】更新用フィールド (プロセス管理の'ステータス'ではなく、ドロップダウンの'管理ステータス'を指定)
      STATUS: '管理ステータス',
      SEND_DATE: 'メール送信日時',   // 送信完了日時を記録するフィールド
      PHONE_CONFIRM: '電話確認日時', // 電話調整完了日時
      READ_DATE: 'メール既読日時',    // メール既読日時
      CANCEL_EXECUTOR: 'キャンセル実行者', // キャンセル実行者
      CANCEL_DATE: 'キャンセル日時',   // キャンセル日時
      STAFF_CONFIRM_CHECK: 'スタッフ確認', // スタッフ確認チェックボックス
      WAY_OF_REPLY: '応対方法' // 応対方法保存用
    },

    // 更新する値 (ドロップダウンの選択肢と完全一致させる必要があります: 2026-01-07変更)
    UPDATE_VALUES: {
      STATUS_SENT: 'メール送信済',
      STATUS_READ: 'メール合意済',
      STATUS_PHONE: '電話合意済',
      STATUS_CANCEL: 'キャンセル',
      STATUS_ASSIGNED: '担当設定',
      STATUS_FINISH: '終了'
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
    okBtn.innerText = type === 'confirm' ? 'はい' : '閉じる';
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
        [CONFIG.FIELDS.SEND_DATE]: { value: nowISO },
        [CONFIG.FIELDS.CANCEL_EXECUTOR]: { value: null },
        [CONFIG.FIELDS.CANCEL_DATE]: { value: null }
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
    const teleSpaceElement = kintone.app.record.getSpaceElement(CONFIG.TELE_SPACE_ID);
    const cancelSpaceElement = kintone.app.record.getSpaceElement(CONFIG.CANCEL_SPACE_ID);
    const wayOfReplySpace = kintone.app.record.getSpaceElement(CONFIG.WAY_OF_REPLY_SPACE_ID);
    const resDateSpaceElement = kintone.app.record.getSpaceElement(CONFIG.RES_DATE_SPACE_ID);
    const staffConfirmFieldElement = kintone.app.record.getFieldElement(CONFIG.FIELDS.STAFF_CONFIRM_CHECK);

    const record = event.record;
    const recordId = kintone.app.record.getId();
    const savedWayOfReply = getValue(record, CONFIG.FIELDS.WAY_OF_REPLY);
    
    // ステータス・日付チェック
    const status = getValue(record, CONFIG.FIELDS.STATUS);
    const sendDate = getValue(record, CONFIG.FIELDS.SEND_DATE);
    const phoneDate = getValue(record, CONFIG.FIELDS.PHONE_CONFIRM);
    const resDate = getValue(record, CONFIG.FIELDS.RES_DATE);
    const resTime = getValue(record, CONFIG.FIELDS.RES_TIME);
    const cancelExecutor = getValue(record, CONFIG.FIELDS.CANCEL_EXECUTOR);
    const isCancelledByPatient = (cancelExecutor === '本人');
    
    // 予約日時が未入力かどうか
    const isResDateOrTimeEmpty = !resDate || !resTime;

    // 送信済み、または電話調整済み、または完了/キャンセル済みの場合は送信ボタンを無効化
    const isSent = !!sendDate;
    const isPhoneConfirmed = !!phoneDate;
    const isCompleted = ['メール送信済', 'メール合意済', '電話合意済', '完了'].includes(status);
    const disableSendBtn = isSent || isPhoneConfirmed || isCompleted || isResDateOrTimeEmpty;

    // --- 0. 対応方法選択ラジオボタン作成 & 表示制御 ---
    // 表示制御関数を定義 (作成ブロックの外に出すことで、常に呼び出せるようにする)
    const updateVisibility = (mode) => {
      const isEmail = (mode === 'email');
      const isPhone = (mode === 'phone');
      const isAny = isEmail || isPhone;

      // 1. メール送信ボタン (MailSendスペース) -> Email only
      if (spaceElement) spaceElement.style.display = isEmail ? 'block' : 'none';
      
      // 2. 電話合意ボタン (TeleConfirmationスペース) -> Phone only
      if (teleSpaceElement) teleSpaceElement.style.display = isPhone ? 'block' : 'none';

      // 3. 電話確認日時フィールド -> Phone only
      kintone.app.record.setFieldShown(CONFIG.FIELDS.PHONE_CONFIRM, isPhone);

      // 共通項目 (Email or Phone)
      const commonDisplay = isAny ? 'block' : 'none';

      // 確定予約日時 (フィールド & スペース)
      kintone.app.record.setFieldShown(CONFIG.FIELDS.RES_DATE, isAny);
      kintone.app.record.setFieldShown(CONFIG.FIELDS.RES_TIME, isAny);
      if (resDateSpaceElement) resDateSpaceElement.style.display = commonDisplay;

      // その他共通フィールド
      kintone.app.record.setFieldShown(CONFIG.FIELDS.SEND_DATE, isAny);
      kintone.app.record.setFieldShown(CONFIG.FIELDS.READ_DATE, isAny);
      
      if (cancelSpaceElement) cancelSpaceElement.style.display = commonDisplay;
      kintone.app.record.setFieldShown(CONFIG.FIELDS.CANCEL_DATE, isAny);
      kintone.app.record.setFieldShown(CONFIG.FIELDS.CANCEL_EXECUTOR, isAny);
      kintone.app.record.setFieldShown(CONFIG.FIELDS.STAFF_CONFIRM_CHECK, isAny);
      
      // 応対方法フィールド自体は常に非表示
      kintone.app.record.setFieldShown(CONFIG.FIELDS.WAY_OF_REPLY, false);
    };

    if (wayOfReplySpace) {
      const containerId = 'way-of-reply-container';
      let container = document.getElementById(containerId);

      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.cssText = 'padding: 15px; background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 20px; display: flex; gap: 20px; align-items: center;';

        const title = document.createElement('div');
        title.innerText = '対応方法:';
        title.style.fontWeight = 'bold';
        container.appendChild(title);

        const createRadio = (label, value) => {
          const wrapper = document.createElement('label');
          wrapper.style.cssText = 'cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 14px;';
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'way-of-reply-radio';
          radio.value = value;
          wrapper.appendChild(radio);
          wrapper.appendChild(document.createTextNode(label));
          return { wrapper, radio };
        };

        const emailOpt = createRadio('メールで対応する', 'email');
        const phoneOpt = createRadio('電話で対応する', 'phone');

        container.appendChild(emailOpt.wrapper);
        container.appendChild(phoneOpt.wrapper);
        wayOfReplySpace.appendChild(container);

        // イベントリスナー
        emailOpt.radio.addEventListener('change', () => updateVisibility('email'));
        phoneOpt.radio.addEventListener('change', () => updateVisibility('phone'));
        const onRadioChange = async (mode) => {
          updateVisibility(mode);
          // 選択状態をレコードに保存
          try {
            await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
              app: kintone.app.getId(),
              id: recordId,
              record: { [CONFIG.FIELDS.WAY_OF_REPLY]: { value: mode } }
            });
          } catch(e) { console.error('Failed to save way of reply', e); }
        };

        // 初期状態設定: どちらも選択せず、フィールドを非表示にする
        updateVisibility(null);
        emailOpt.radio.addEventListener('change', () => onRadioChange('email'));
        phoneOpt.radio.addEventListener('change', () => onRadioChange('phone'));

        // 初期状態設定: 保存された値があれば復元、なければ非表示
        if (savedWayOfReply === 'email' || savedWayOfReply === 'phone') {
          if (savedWayOfReply === 'email') emailOpt.radio.checked = true;
          if (savedWayOfReply === 'phone') phoneOpt.radio.checked = true;
          updateVisibility(savedWayOfReply);
        } else {
          updateVisibility(null);
        }
      } else {
        // 既に存在する場合、現在の選択状態に合わせて表示を更新 (画面再描画対策)
        const checked = container.querySelector('input[name="way-of-reply-radio"]:checked');
        updateVisibility(checked ? checked.value : null);
      }
    }

    // --- 1. メール送信ボタン作成 ---
    if (!isResDateOrTimeEmpty && spaceElement && !document.getElementById('send-reservation-mail-btn')) {
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

      if (disableSendBtn) {
        btn.disabled = true;
        btn.style.backgroundColor = '#ccc';
        btn.style.cursor = 'not-allowed';
        btn.style.boxShadow = 'none';
        if (isResDateOrTimeEmpty) {
          btn.title = '確定予約日と確定予約時刻を入力してください';
        } else {
          btn.title = '既に送信済み、または処理が進行中です';
        }
      } else {
    btn.onmouseover = () => { btn.style.backgroundColor = '#004a80'; };
    btn.onmouseout  = () => { btn.style.backgroundColor = CONFIG.COLORS.PRIMARY; };

    // クリックイベント
    btn.onclick = async () => {
      log('Button Clicked.');

      // データ取得
      const email = getValue(record, CONFIG.FIELDS.EMAIL);
      const lastName = getValue(record, CONFIG.FIELDS.LAST_NAME);
      const firstName = getValue(record, CONFIG.FIELDS.FIRST_NAME);
      const type = getValue(record, CONFIG.FIELDS.TYPE);
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

      }
    spaceElement.appendChild(btn);
    }

    // --- 2. 電話調整済ボタン作成 ---
    if (!isResDateOrTimeEmpty && teleSpaceElement && !document.getElementById('phone-confirm-btn')) {
      const phoneBtn = document.createElement('button');
      phoneBtn.id = 'phone-confirm-btn';
      phoneBtn.innerText = '電話合意済';
      phoneBtn.style.cssText = `
        padding: 10px 24px;
        background-color: ${CONFIG.COLORS.SUCCESS};
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: background-color 0.2s;
      `;

      // ② 電話調整完了のボタンはメール既読前まで有効 (既読検知済みなら無効化)
      if (isPhoneConfirmed || status === CONFIG.UPDATE_VALUES.STATUS_READ || isResDateOrTimeEmpty || isCancelledByPatient) {
        phoneBtn.disabled = true;
        phoneBtn.innerText = '電話合意済';
        phoneBtn.style.backgroundColor = '#ccc';
        phoneBtn.style.cursor = 'not-allowed';
        phoneBtn.style.boxShadow = 'none';
        if (isResDateOrTimeEmpty) {
          phoneBtn.title = '確定予約日と確定予約時刻を入力してください';
        }
      } else {
        phoneBtn.onmouseover = () => { phoneBtn.style.backgroundColor = '#1e8449'; };
        phoneBtn.onmouseout  = () => { phoneBtn.style.backgroundColor = CONFIG.COLORS.SUCCESS; };

        phoneBtn.onclick = () => {
          // ① メール送信ができる状態かチェック
          const email = getValue(record, CONFIG.FIELDS.EMAIL);
          const type = getValue(record, CONFIG.FIELDS.TYPE);
          const lastName = getValue(record, CONFIG.FIELDS.LAST_NAME);
          const firstName = getValue(record, CONFIG.FIELDS.FIRST_NAME);
          const fullName = `${lastName} ${firstName}`.trim();

          // 必須項目（メールアドレス、用件、予約日時）が揃っているか
          const canSendMail = (email && type && resDate && resTime);
          // ★追加: 未送信の場合のみ送信する
          const shouldSendMail = canSendMail && !isSent;

          let confirmMsg = '電話で予約調整が完了したことを記録します。<br>ステータスを「電話合意済」に変更し、電話確認日時を記録します。';
          if (shouldSendMail) {
            confirmMsg += '<br><br><strong>※予約確定メールも同時に送信されます。</strong>';
          }
          confirmMsg += '<br>よろしいですか？';

          showModal('confirm', '電話調整の確認', 
            confirmMsg, 
            async () => {
              showSpinner();
              try {
                const nowISO = new Date().toISOString();
                const updateRecord = {
                  [CONFIG.FIELDS.STATUS]: { value: CONFIG.UPDATE_VALUES.STATUS_PHONE },
                  [CONFIG.FIELDS.PHONE_CONFIRM]: { value: nowISO },
                  [CONFIG.FIELDS.CANCEL_EXECUTOR]: { value: null },
                  [CONFIG.FIELDS.CANCEL_DATE]: { value: null }
                };

                // メール送信処理
                if (shouldSendMail) {
                  const generatedUrl = `${CONFIG.CONFIRM_BASE_URL}?id=${recordId}`;
                  const payload = {
                    to: email,
                    name: fullName,
                    type: type,
                    reservationDate: resDate,
                    reservationTime: resTime,
                    department: getValue(record, CONFIG.FIELDS.DEPT),
                    url: generatedUrl
                  };

                  const response = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });

                  if (!response.ok) {
                    throw new Error(`Email API Error: ${response.status}`);
                  }
                  // 送信成功時は送信日時も記録
                  updateRecord[CONFIG.FIELDS.SEND_DATE] = { value: nowISO };
                }

                const body = {
                  app: kintone.app.getId(),
                  id: recordId,
                  record: updateRecord
                };
                await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body);
                hideSpinner();
                showModal('success', '完了', '電話調整情報を登録しました。' + (shouldSendMail ? '<br>(メール送信完了)' : ''), () => location.reload());
              } catch (error) {
                hideSpinner();
                errorLog('Phone Confirm Update Failed', error);
                showModal('error', 'エラー', '更新に失敗しました。<br>' + error.message);
              }
            }
          );
        };
      }
      teleSpaceElement.appendChild(phoneBtn);
    }

    // --- 3. スタッフキャンセルボタン作成 ---
    if ((isSent || isPhoneConfirmed) && cancelSpaceElement && !document.getElementById('staff-cancel-btn') && !isCancelledByPatient) {
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'staff-cancel-btn';
      cancelBtn.innerText = 'キャンセル';
      cancelBtn.style.cssText = `
        padding: 10px 24px;
        background-color: ${CONFIG.COLORS.DANGER};
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: background-color 0.2s;
      `;

      // スタッフキャンセルボタンは、メール送信済み または 電話合意済み の場合のみ有効にする
      if (!isSent && !isPhoneConfirmed) {
        cancelBtn.disabled = true;
        cancelBtn.style.backgroundColor = '#ccc';
        cancelBtn.style.cursor = 'not-allowed';
        cancelBtn.style.boxShadow = 'none';
        cancelBtn.title = 'メール送信または電話合意後に有効になります';
      } else {
        cancelBtn.onmouseover = () => { cancelBtn.style.backgroundColor = '#c0392b'; };
        cancelBtn.onmouseout  = () => { cancelBtn.style.backgroundColor = CONFIG.COLORS.DANGER; };

        cancelBtn.onclick = () => {
          const confirmMsg = `
            <strong>【警告】この操作は取り消せません。</strong><br><br>
            以下の処理を実行します：<br>
            ・メール送信日時、電話確認日時、メール既読日時を<strong>消去</strong>します。<br>
            ・ステータスを<strong>キャンセル</strong>に変更します。<br>
            <br>
            本当に実行してよろしいですか？
          `;

          showModal('warning', 'スタッフキャンセルの確認', confirmMsg, async () => {
            showSpinner();
            try {
              // キャンセルステータスへ変更（フィールドクリア含む）
              const body = {
                app: kintone.app.getId(),
                id: recordId,
                record: {
                  [CONFIG.FIELDS.STATUS]: { value: CONFIG.UPDATE_VALUES.STATUS_CANCEL },
                  [CONFIG.FIELDS.SEND_DATE]: { value: null },
                  [CONFIG.FIELDS.PHONE_CONFIRM]: { value: null },
                  [CONFIG.FIELDS.READ_DATE]: { value: null },
                  [CONFIG.FIELDS.CANCEL_EXECUTOR]: { value: 'スタッフ' },
                  [CONFIG.FIELDS.CANCEL_DATE]: { value: new Date().toISOString() }
                }
              };
              await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body);

              hideSpinner();
              showModal('success', '完了', '予約を取り下げました。', () => location.reload());
            } catch (error) {
              hideSpinner();
              errorLog('Staff Cancel Update Failed', error);
              showModal('error', 'エラー', '更新に失敗しました。<br>' + error.message);
            }
          });
        };
      }
      cancelSpaceElement.appendChild(cancelBtn);
    }

    // --- 3.5 チケット終了/確認ボタン作成 (キャンセル済みの場合) ---
    if (status === CONFIG.UPDATE_VALUES.STATUS_CANCEL) {
      // --- A. スタッフによるキャンセルの場合：「このチケットを終了にする」ボタン ---
      if (cancelExecutor === 'スタッフ' && cancelSpaceElement) {
        if (!document.getElementById('finish-ticket-btn')) {
          const finishBtn = document.createElement('button');
          finishBtn.id = 'finish-ticket-btn';
          finishBtn.innerText = 'このチケットを終了にする';
          finishBtn.style.cssText = `padding: 10px 24px; background-color: #000000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: background-color 0.2s;`;
          finishBtn.onmouseover = () => { finishBtn.style.backgroundColor = '#333333'; };
          finishBtn.onmouseout  = () => { finishBtn.style.backgroundColor = '#000000'; };

          finishBtn.onclick = async () => {
            const confirmMsg = 'このチケットを終了ステータスに変更しますか？<br>変更後は予約日時の編集ができなくなります。';
            showModal('confirm', '確認', confirmMsg, async () => {
              showSpinner();
              try {
                const body = {
                  app: kintone.app.getId(),
                  id: recordId,
                  record: { [CONFIG.FIELDS.STATUS]: { value: CONFIG.UPDATE_VALUES.STATUS_FINISH } }
                };
                await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body);
                hideSpinner();
                showModal('success', '完了', 'ステータスを「終了」に変更しました。', () => location.reload());
              } catch (error) {
                hideSpinner();
                errorLog('Finish Ticket Update Failed', error);
                showModal('error', 'エラー', '更新に失敗しました。<br>' + error.message);
              }
            });
          };
          cancelSpaceElement.appendChild(finishBtn);
        }
      }

      // --- B. 本人によるキャンセルの場合：「スタッフ確認」ボタン ---
      const staffConfirmedValue = getValue(record, CONFIG.FIELDS.STAFF_CONFIRM_CHECK);
      const isStaffConfirmed = Array.isArray(staffConfirmedValue) && staffConfirmedValue.length > 0;

      if (cancelExecutor === '本人' && !isStaffConfirmed && staffConfirmFieldElement) {
        if (!document.getElementById('staff-ack-btn')) {
          const ackBtn = document.createElement('button');
          ackBtn.id = 'staff-ack-btn';
          ackBtn.innerText = 'スタッフ確認';
          ackBtn.style.cssText = `margin-left: 10px; padding: 5px 15px; background-color: #2c3e50; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;`;
          ackBtn.onmouseover = () => { ackBtn.style.backgroundColor = '#34495e'; };
          ackBtn.onmouseout  = () => { ackBtn.style.backgroundColor = '#2c3e50'; };

          ackBtn.onclick = async () => {
            showModal('confirm', '確認', 'Webからのキャンセルをスタッフ確認済として記録しますか？', async () => {
              showSpinner();
              try {
                const body = {
                  app: kintone.app.getId(),
                  id: recordId,
                  record: { [CONFIG.FIELDS.STAFF_CONFIRM_CHECK]: { value: ['確認済'] } }
                };
                await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body);
                hideSpinner();
                location.reload();
              } catch (error) {
                hideSpinner();
                errorLog('Staff Ack Failed', error);
                showModal('error', 'エラー', '更新に失敗しました。<br>' + error.message);
              }
            });
          };
          staffConfirmFieldElement.appendChild(ackBtn);
        }
      }
    }

    // --- 4. 担当者アサインボタン作成 ---
    const assignSpaceElement = kintone.app.record.getSpaceElement(CONFIG.ASSIGN_SPACE_ID);
    if (assignSpaceElement && !document.getElementById('assign-staff-btn')) {
      const assignBtn = document.createElement('button');
      assignBtn.id = 'assign-staff-btn';
      assignBtn.innerText = '私が担当する';
      
      // ★追加: 自身の担当判定
      const currentStaffName = localStorage.getItem('shinryo_ticket_staff_name') || localStorage.getItem('customKey');
      const recordStaffName = getValue(record, CONFIG.FIELDS.STAFF);
      const isSelf = currentStaffName && (recordStaffName === currentStaffName);

      if (isSelf) {
        assignBtn.disabled = true;
        assignBtn.style.cssText = `
            padding: 10px 24px;
            background-color: #ccc;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: not-allowed;
            font-weight: bold;
            font-size: 14px;
            box-shadow: none;
            height: 60px;
        `;
        assignBtn.title = '既にあなたが担当者です';
      } else {
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
        `;
        
        assignBtn.onmouseover = () => { assignBtn.style.backgroundColor = '#34495e'; };
        assignBtn.onmouseout = () => { assignBtn.style.backgroundColor = '#2c3e50'; };

        assignBtn.onclick = async () => {
        // 端末の担当者名を取得
        const currentStaff = localStorage.getItem('shinryo_ticket_staff_name') || localStorage.getItem('customKey');
        
        if (!currentStaff) {
          showModal('error', 'エラー', 'この端末には担当者が設定されていません。<br>ダッシュボード等で担当者を設定してください。');
          return;
        }

        const recordStaff = getValue(record, CONFIG.FIELDS.STAFF);
        
        const doAssign = async () => {
          showSpinner();
          try {
            const updateRecord = {
              [CONFIG.FIELDS.STAFF]: { value: currentStaff }
            };

            // 初めて担当が設定される場合のみステータスを更新
            if (!recordStaff) {
                updateRecord[CONFIG.FIELDS.STATUS] = { value: CONFIG.UPDATE_VALUES.STATUS_ASSIGNED };
            }

            const body = {
              app: kintone.app.getId(),
              id: recordId,
              record: updateRecord
            };
            await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body);
            hideSpinner();
            showModal('success', '完了', `担当者を「${currentStaff}」に設定しました。`, () => location.reload());
          } catch (error) {
            hideSpinner();
            errorLog('Assign Staff Failed', error);
            showModal('error', 'エラー', '更新に失敗しました。<br>' + error.message);
          }
        };

        if (recordStaff) {
          showModal('confirm', '担当者変更の確認', 
            `すでに担当がアサインされています。<br>強制的に担当をあなた（${currentStaff}）にしますか？`, 
            doAssign
          );
        } else {
          doAssign();
        }
      };
      }
      assignSpaceElement.appendChild(assignBtn);
    }

    return event;
  });

  // --- 編集画面でのフィールド制御 ---
  kintone.events.on(['app.record.edit.show', 'app.record.create.show'], function(event) {
    const record = event.record;

    // 1. 担当者フィールドの制御 (常に編集不可)
    const staffField = record[CONFIG.FIELDS.STAFF];
    if (staffField) {
      staffField.disabled = true; // 編集不可に設定

      // グレーアウトを解除するスタイルを注入
      if (!document.getElementById('custom-disabled-style')) {
          const style = document.createElement('style');
          style.id = 'custom-disabled-style';
          style.textContent = `.gaia-ui-dropdown-disabled .gaia-ui-dropdown-selected, input[disabled] { background-color: #fff !important; color: #333 !important; opacity: 1 !important; -webkit-text-fill-color: #333 !important; }`;
          document.head.appendChild(style);
      }
    }

    // 2. 予約日時フィールドの制御 (送信済・合意済の場合)
    const status = getValue(record, CONFIG.FIELDS.STATUS);
    const cancelExecutor = getValue(record, CONFIG.FIELDS.CANCEL_EXECUTOR);
    const lockedStatuses = [
        CONFIG.UPDATE_VALUES.STATUS_SENT, 
        CONFIG.UPDATE_VALUES.STATUS_READ, 
        CONFIG.UPDATE_VALUES.STATUS_PHONE, 
        '完了',
        CONFIG.UPDATE_VALUES.STATUS_FINISH
    ];

    if (lockedStatuses.includes(status) || (status === CONFIG.UPDATE_VALUES.STATUS_CANCEL && cancelExecutor === '本人')) {
        if (record[CONFIG.FIELDS.RES_DATE]) record[CONFIG.FIELDS.RES_DATE].disabled = true;
        if (record[CONFIG.FIELDS.RES_TIME]) record[CONFIG.FIELDS.RES_TIME].disabled = true;
    }
    return event;
  });
})();