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
      API_URL: 'https://sendreservationmail-yoslzibmlq-uc.a.run.app',
      CONFIRM_BASE_URL: 'https://confirmreservation-yoslzibmlq-uc.a.run.app',
      STATUS_SENT_VALUE: 'メール送信', // 送信後のステータス
      STATUS_PHONE_VALUE: '電話合意済', // 電話合意後のステータス
      STATUS_WITHDRAWN_VALUE: 'スタッフ取下', // 取下後のステータス
      TIMEOUT_MINUTES: 1, // タイムアウト時間 (分) - テスト用
      FIELDS: {
        STATUS: '管理状況',       // 管理状況
        METHOD: '対応方法',       // 対応方法
        PURPOSE: '用件',          // 用件
        RES_DATE: '確定予約日',   // 確定予約日
        RES_TIME: '確定予約時刻', // 確定予約時刻
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
        STAFF: '担当者'
      },
      // 予約時刻の選択肢
      ALLOWED_TIMES: [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
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
    const showDialog = (message, type = 'alert', title = null, placeholder = '') => {
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
          footer.appendChild(createBtn('はい', 'rcb-modal-btn-ok', true));
        } else if (type === 'prompt') {
          footer.appendChild(createBtn('キャンセル', 'rcb-modal-btn-cancel', null));
          footer.appendChild(createBtn('OK', 'rcb-modal-btn-ok', () => textarea.value));
        } else {
          footer.appendChild(createBtn('OK', 'rcb-modal-btn-ok', true));
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
      applyStyles();
  
      const recordId = kintone.app.record.getId();
      
      // 現在の値を取得
      const currentStatus = record[CONFIG.FIELDS.STATUS]?.value || '未設定';
      const currentMethod = record[CONFIG.FIELDS.METHOD]?.value || '未設定';
      const purpose = record[CONFIG.FIELDS.PURPOSE]?.value || '';
      const currentDate = record[CONFIG.FIELDS.RES_DATE]?.value || '';
      const currentTime = record[CONFIG.FIELDS.RES_TIME]?.value || '';
      const sendDateVal = record[CONFIG.FIELDS.SEND_DATE]?.value || '';
      const readDateVal = record[CONFIG.FIELDS.READ_DATE]?.value || '';
      const phoneDateVal = record[CONFIG.FIELDS.PHONE_CONFIRM]?.value || '';

      // 確定済みフラグ
      const isConfirmed = !!(currentDate && currentTime);
      // 送信済みフラグ
      const isSent = currentStatus === CONFIG.STATUS_SENT_VALUE;
      const isPhoneConfirmed = currentStatus === CONFIG.STATUS_PHONE_VALUE;
      const isWithdrawn = currentStatus === CONFIG.STATUS_WITHDRAWN_VALUE;
  
      // コンテナ作成
      const container = document.createElement('div');
      container.className = 'rcb-container';

      // ステータスに応じたスタイル適用
      if (isWithdrawn) container.classList.add('status-withdrawn');
      else if (isPhoneConfirmed) container.classList.add('status-phone');
      else if (isSent) container.classList.add('status-sent');

      // 取下げ時は全体を少し薄くする
      if (isWithdrawn) container.style.opacity = '0.9';
  
      // --- 1. ヘッダー (バッジ表示) ---
      const header = document.createElement('div');
      header.className = 'rcb-header';
  
      const createBadge = (label, value, color) => {
        const badge = document.createElement('div');
        badge.className = 'rcb-badge';
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
  
      // 管理状態バッジ
      const statusBadge = createBadge('管理状態', currentStatus, '#e67e22');
      // 対応方法バッジ
      const methodBadge = createBadge('対応方法', currentMethod, '#27ae60');
  
      header.appendChild(statusBadge);
      header.appendChild(methodBadge);
      container.appendChild(header);
  
      // --- 2. メインコンテンツエリア ---
      const content = document.createElement('div');
      content.className = 'rcb-content';
  
      // ① 対応方法選択 (用件が「変更」または「初診」の場合)
      if (purpose === '変更' || purpose === '初診') {
        const methodSection = document.createElement('div');
        methodSection.className = 'rcb-section';
        
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
              // バッジ更新
              methodBadge.querySelector('.rcb-badge-value').textContent = updateValue;
              // リロード削除: 画面リセットを防ぐためDOM更新のみに留める
            }
          };
  
          labelEl.appendChild(input);
          labelEl.appendChild(document.createTextNode(label));
          return labelEl;
        };
  
        radioGroup.appendChild(createRadio('電話で対応', 'phone', '電話対応'));
        radioGroup.appendChild(createRadio('メールで対応', 'email', 'メール対応'));
        
        methodSection.appendChild(radioGroup);
        content.appendChild(methodSection);
      }
  
      // ② 確定予約日時エディタ (サブエレメントとして統合)
      // 対応方法が選択されている、または用件が対象外の場合は表示する等の制御が可能ですが、
      // ここでは「その後...開いてください」との指示なので、常に表示またはフローの下部に配置します。
      const dateSection = document.createElement('div');
      dateSection.className = 'rcb-section';
      dateSection.style.marginTop = '30px';
      dateSection.style.borderTop = '1px dashed #eee';
      dateSection.style.paddingTop = '20px';
  
      const dateTitle = document.createElement('div');
      dateTitle.className = 'rcb-section-title';
      dateTitle.textContent = '確定予約日時の設定';
      
      // エディタ描画関数
      const renderEditorView = () => {
        // 再設定時は対応方法のロックを解除
        const radios = container.querySelectorAll('input[name="rcb-method-select"]');
        radios.forEach(radio => {
            radio.disabled = false;
            if (radio.parentElement) {
                radio.parentElement.style.opacity = '1';
                radio.parentElement.style.cursor = 'pointer';
            }
        });

        dateSection.innerHTML = '';
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
        const timeLabel = document.createElement('div');
        timeLabel.textContent = '時刻: ';
        timeLabel.style.fontWeight = 'bold';
        timeLabel.style.marginBottom = '8px';
        dateEditor.appendChild(timeLabel);
    
        const timeGrid = document.createElement('div');
        timeGrid.className = 'rcb-time-grid';
        
        let selectedTime = currentTime;
    
        // 時刻ボタン描画更新関数
        const updateTimeButtons = () => {
          timeGrid.innerHTML = '';
          CONFIG.ALLOWED_TIMES.forEach(time => {
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
            timeGrid.appendChild(btn);
          });
        };

        // 日付変更時に時刻ボタンの状態を更新
        dateInput.addEventListener('change', updateTimeButtons);
        updateTimeButtons(); // 初期描画

        dateEditor.appendChild(timeGrid);
    
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
        saveBtn.textContent = '予約日時を確定する';
        
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
    
          const success = await updateRecord(recordId, {
            [CONFIG.FIELDS.RES_DATE]: { value: newDate },
            [CONFIG.FIELDS.RES_TIME]: { value: selectedTime }
          });
    
          if (success) {
            msgSpan.style.display = 'inline';
            setTimeout(() => {
               location.reload();
            }, 800);
          } else {
            saveBtn.disabled = false;
            saveBtn.textContent = '予約日時を確定する';
          }
        };
    
        actionRow.appendChild(msgSpan);
        actionRow.appendChild(saveBtn);
        dateEditor.appendChild(actionRow);
    
        dateSection.appendChild(dateEditor);
      };

      // ★ 分岐: 予約日時が確定しているかどうか
      if (isConfirmed) {
        // --- 確定済み表示モード ---
        dateSection.innerHTML = ''; // 初期化
        dateSection.appendChild(dateTitle);

        const confirmedContainer = document.createElement('div');
        confirmedContainer.style.padding = '20px';
        confirmedContainer.style.backgroundColor = '#fff';
        confirmedContainer.style.border = '1px solid #e0e0e0';
        confirmedContainer.style.borderRadius = '6px';
        confirmedContainer.style.textAlign = 'center';

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
        
        const dObj = new Date(currentDate);
        const dateStr = `${dObj.getFullYear()}年${dObj.getMonth() + 1}月${dObj.getDate()}日`;
        
        const textSpan = document.createElement('span');
        textSpan.innerHTML = `確定日時: <span style="color:#3498db; font-size: 1.2em;">${dateStr} ${currentTime}</span>`;
        dateTimeDisplay.appendChild(textSpan);

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '✏️ 再設定';
        editBtn.style.cssText = 'background-color: #fff; border: 1px solid #ddd; color: #666; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: normal; display: flex; align-items: center; gap: 4px; transition: background-color 0.2s;';
        
        if (isSent) {
            editBtn.disabled = true;
            editBtn.style.opacity = '0.5';
            editBtn.style.cursor = 'not-allowed';
            editBtn.title = 'メール送信済のため再設定できません';
        } else {
            editBtn.onmouseover = () => { editBtn.style.backgroundColor = '#f5f5f5'; editBtn.style.borderColor = '#ccc'; };
            editBtn.onmouseout = () => { editBtn.style.backgroundColor = '#fff'; editBtn.style.borderColor = '#ddd'; };
            editBtn.onclick = () => renderEditorView();
        }
        dateTimeDisplay.appendChild(editBtn);

        confirmedContainer.appendChild(dateTimeDisplay);

        // 送信履歴・既読情報の表示
        if (isSent) {
            // タイムアウト判定
            let isTimeout = false;
            if (!readDateVal && sendDateVal && currentMethod === 'メール対応') {
                const sentTime = new Date(sendDateVal).getTime();
                const now = new Date().getTime();
                const diffMinutes = (now - sentTime) / (1000 * 60);
                if (diffMinutes >= CONFIG.TIMEOUT_MINUTES) {
                    isTimeout = true;
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

            const readRow = document.createElement('div');
            if (readDateVal) {
                readRow.innerHTML = `<span style="${labelStyle}">既読日時:</span><span style="${valueStyle} color: #27ae60;">${formatDateTime(readDateVal)}</span>`;
            } else {
                readRow.innerHTML = `<span style="${labelStyle}">既読日時:</span><span style="${valueStyle} color: #95a5a6;">未読</span>`;
            }
            historyContainer.appendChild(readRow);
            
            // タイムアウト時のアクションボタン (メール対応かつ未読かつタイムアウト)
            if (isTimeout) {
                const timeoutAlert = document.createElement('div');
                timeoutAlert.style.marginTop = '15px';
                timeoutAlert.style.padding = '10px';
                timeoutAlert.style.backgroundColor = '#fff3cd';
                timeoutAlert.style.border = '1px solid #ffeeba';
                timeoutAlert.style.borderRadius = '4px';
                timeoutAlert.style.color = '#856404';
                timeoutAlert.innerHTML = `<strong>⚠️ 未読タイムアウト</strong><br>送信から${CONFIG.TIMEOUT_MINUTES}分以上経過しましたが、既読になっていません。`;
                
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

        // メール送信ボタン
        const sendMailBtn = document.createElement('button');
        sendMailBtn.className = 'rcb-btn-save';
        sendMailBtn.style.width = '100%';
        sendMailBtn.style.maxWidth = '300px';
        
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
        } else {
            sendMailBtn.textContent = 'メールを送信する';
            sendMailBtn.style.backgroundColor = '#e67e22'; // オレンジ色
            
            sendMailBtn.onclick = async () => {
          // 対応方法の選択チェックと最新値の取得
          let effectiveMethod = currentMethod;
          const radio = container.querySelector('input[name="rcb-method-select"]:checked');
          
          // ラジオボタンが表示されている場合（用件が変更・初診など）
          if (container.querySelector('input[name="rcb-method-select"]')) {
              if (!radio) {
                  await showDialog('対応方法を選択してください。', 'error');
                  return;
              }
              effectiveMethod = (radio.value === 'phone') ? '電話対応' : 'メール対応';
          }

          // 送信内容のプレビュー作成
          const email = record[CONFIG.FIELDS.EMAIL]?.value || '';
          const lastName = record[CONFIG.FIELDS.LAST_NAME]?.value || '';
          const firstName = record[CONFIG.FIELDS.FIRST_NAME]?.value || '';
          const fullName = `${lastName} ${firstName}`.trim();
          const dept = record[CONFIG.FIELDS.DEPT]?.value || '（未指定）';

          const confirmMsg = `
            以下の内容でメールを送信します。<br>よろしいですか？<br><br>
            <div style="background:#f9f9f9; padding:10px; border-radius:4px; text-align:left;">
              <strong>宛先:</strong> ${fullName} 様 (${email})<br>
              <strong>用件:</strong> ${purpose}<br>
              <strong>日時:</strong> ${currentDate} ${currentTime}<br>
              <strong>診療科:</strong> ${dept}<br>
              <hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;">
              <small>※送信後、レコードのステータスは「${CONFIG.STATUS_SENT_VALUE}」に更新されます。</small>
            </div>
          `;

          const confirmed = await showDialog(confirmMsg, 'confirm', '送信確認');
          if (!confirmed) return;

          sendMailBtn.disabled = true;
          sendMailBtn.textContent = '送信中...';

          try {
            // URL生成 (対応方法による分岐)
            let targetUrl = `${CONFIG.CONFIRM_BASE_URL}?id=${recordId}`;
            if (effectiveMethod === '電話対応') {
              targetUrl += '&mode=phone'; // 電話対応: Cancelボタン表示
            } else {
              targetUrl += '&mode=mail';  // メール対応: 初回Cancel非表示
            }

            // ペイロード作成
            const payload = {
              to: record[CONFIG.FIELDS.EMAIL]?.value || '',
              name: `${record[CONFIG.FIELDS.LAST_NAME]?.value || ''} ${record[CONFIG.FIELDS.FIRST_NAME]?.value || ''}`.trim(),
              type: purpose,
              reservationDate: currentDate,
              reservationTime: currentTime,
              department: record[CONFIG.FIELDS.DEPT]?.value || '',
              url: targetUrl
            };

            if (!payload.to) throw new Error('メールアドレスが設定されていません。');

            // メール送信API実行
            const response = await fetch(CONFIG.API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            // レコード更新 (管理状態 + キャンセルクリア + 送信日時 + 既読日時クリア)
            // ※キャンセル情報をクリアすることで、過去にキャンセルされたレコードでもURLを有効にする
            await updateRecord(recordId, { 
                [CONFIG.FIELDS.STATUS]: { value: CONFIG.STATUS_SENT_VALUE },
                [CONFIG.FIELDS.SEND_DATE]: { value: new Date().toISOString() },
                [CONFIG.FIELDS.CANCEL_EXECUTOR]: { value: null },
                [CONFIG.FIELDS.CANCEL_DATE]: { value: null },
                [CONFIG.FIELDS.READ_DATE]: { value: null } // 既読日時をクリアして初回アクセス状態にする
            });

            await showDialog('メールを送信しました。', 'success');
            location.reload();
          } catch (e) {
            console.error(e);
            await showDialog('送信に失敗しました: ' + e.message, 'error');
            sendMailBtn.disabled = false;
            sendMailBtn.textContent = 'メールを送信する';
          }
        };
        }

        confirmedContainer.appendChild(sendMailBtn);

        // 予約取下げボタン (送信済みの場合のみ表示)
        if (isSent || isPhoneConfirmed) {
            const withdrawBtn = document.createElement('button');
            withdrawBtn.textContent = '予約取下げ';
            withdrawBtn.className = 'rcb-btn-save';
            withdrawBtn.style.backgroundColor = '#dc3545'; // 赤色
            withdrawBtn.style.width = '100%';
            withdrawBtn.style.maxWidth = '300px';
            withdrawBtn.style.marginTop = '10px';
            
            withdrawBtn.onclick = () => handleWithdrawal();
            
            confirmedContainer.appendChild(withdrawBtn);
        }
        
        // 取下げ取消（復活）ボタン (取下げ済みの場合のみ表示)
        if (isWithdrawn) {
            const reviveBtn = document.createElement('button');
            reviveBtn.textContent = '取下げを取り消す（復活）';
            reviveBtn.className = 'rcb-btn-save';
            reviveBtn.style.backgroundColor = '#7f8c8d'; // グレー
            reviveBtn.style.width = '100%';
            reviveBtn.style.maxWidth = '300px';
            reviveBtn.style.marginTop = '10px';
            
            reviveBtn.onclick = async () => {
                const confirmed = await showDialog('取下げを取り消して、元の状態に戻しますか？', 'confirm');
                if (!confirmed) return;

                // 元のステータスを推定（電話確認日時があれば電話合意、送信日時があればメール送信）
                let targetStatus = CONFIG.STATUS_SENT_VALUE; // デフォルト
                if (phoneDateVal) targetStatus = CONFIG.STATUS_PHONE_VALUE;
                else if (sendDateVal) targetStatus = CONFIG.STATUS_SENT_VALUE;

                await updateRecord(recordId, {
                    [CONFIG.FIELDS.STATUS]: { value: targetStatus },
                    [CONFIG.FIELDS.NOTE]: { value: '' } // 備考（取下げ理由）をクリア
                });
                location.reload();
            };
            confirmedContainer.appendChild(reviveBtn);
        }

        // 取下げ処理ロジック
        const handleWithdrawal = async () => {
            const isRead = !!readDateVal;
            let shouldSendCancelMail = false;
            let reason = '';

            // 1. 確認フロー
            if (currentMethod === '電話対応') {
                reason = await showDialog('予約依頼者と取消しについて調整済みですか？？\n取下げ理由を入力してください。', 'prompt', null, '理由を入力...');
                if (reason === null) return; // キャンセル
            } else if (currentMethod === 'メール対応') {
                if (!isRead) {
                    // 既読前
                    reason = await showDialog('予約を取り下げますか？\n取下げ理由を入力してください。', 'prompt', null, '理由を入力...');
                    if (reason === null) return;
                } else {
                    // 既読後
                    reason = await showDialog('予約依頼者と取消しについて調整済みですか？？\n取下げ理由を入力してください。', 'prompt', null, '理由を入力...');
                    if (reason === null) return;
                    shouldSendCancelMail = true;
                }
            }

            // 2. 実行処理
            try {
                const payload = {
                    [CONFIG.FIELDS.STATUS]: { value: CONFIG.STATUS_WITHDRAWN_VALUE },
                    [CONFIG.FIELDS.NOTE]: { value: reason }
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

        dateSection.appendChild(confirmedContainer);

      } else {
        // --- 未確定: 編集フォーム表示 ---
        renderEditorView();
      } // end if-else
      content.appendChild(dateSection);
  
      container.appendChild(content);
      spaceElement.appendChild(container);
    };
  
    // イベントリスナー
    kintone.events.on('app.record.detail.show', function(event) {
      const record = event.record;
      const space = kintone.app.record.getSpaceElement(CONFIG.SPACE_ID);
      
      if (space) {
        // 担当者アサインチェック
        const staffVal = record[CONFIG.FIELDS.STAFF]?.value;
        let isAssigned = false;
        if (staffVal) {
            // 配列(ユーザー選択等)と文字列の両方に対応
            isAssigned = Array.isArray(staffVal) ? staffVal.length > 0 : !!staffVal;
        }

        if (!isAssigned) {
            space.style.display = 'none'; // 担当者がいない場合は非表示
        } else {
            space.style.display = 'block';
            renderBoard(space, record);
        }
      }
      return event;
    });
  
  })();