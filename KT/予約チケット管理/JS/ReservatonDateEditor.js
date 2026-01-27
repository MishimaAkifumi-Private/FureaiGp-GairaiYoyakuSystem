/**
 * ReservationDateEditor.js
 * 予約日時変更コンポーネント
 * 詳細画面で予約日時を直接編集するためのUIを提供します。
 */
(function() {
  'use strict';

  const CONFIG = {
    SPACE_ID: 'ReservationDate', // KintoneのスペースフィールドID
    FIELD_DATE: '確定予約日',
    FIELD_TIME: '確定予約時刻',
    FIELD_STATUS: '管理ステータス',
    ALLOWED_TIMES: [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ],
    MAX_DAYS: 60 // 本日から60日後まで
  };

  // 日付フォーマット (YYYY-MM-DD)
  const formatDateISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 表示用フォーマット (MM月DD日 HH:mm)
  const formatDisplay = (dateStr, timeStr) => {
    if (!dateStr) return '未設定';
    const date = new Date(dateStr);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const t = timeStr || '--:--';
    return `${m}月${d}日 ${t}`;
  };

  // モーダル表示関数
  const showEditModal = (currentDate, currentTime, onSave) => {
    // 既存モーダル削除
    const existing = document.getElementById('res-date-modal');
    if (existing) existing.remove();

    // オーバーレイ
    const overlay = document.createElement('div');
    overlay.id = 'res-date-modal';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 10000;
      display: flex; justify-content: center; align-items: center;
      backdrop-filter: blur(3px);
    `;

    // モーダル本体
    const box = document.createElement('div');
    box.style.cssText = `
      background: #fff; padding: 30px; border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      width: 420px; max-width: 90%;
      font-family: "Helvetica Neue", Arial, sans-serif;
    `;

    // タイトル
    const title = document.createElement('h3');
    title.textContent = '予約日時の変更';
    title.style.cssText = 'margin: 0 0 20px 0; color: #333; text-align: center; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px;';
    box.appendChild(title);

    // 日付選択エリア
    const dateGroup = document.createElement('div');
    dateGroup.style.marginBottom = '20px';
    const dateLabel = document.createElement('label');
    dateLabel.textContent = '日付';
    dateLabel.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #555; font-size: 14px;';
    
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px; box-sizing: border-box; background: #f9f9f9;';
    
    // 日付制限 (本日 ～ 本日+60日)
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + CONFIG.MAX_DAYS);
    
    dateInput.min = formatDateISO(today);
    dateInput.max = formatDateISO(maxDate);
    if (currentDate) dateInput.value = currentDate;

    dateGroup.appendChild(dateLabel);
    dateGroup.appendChild(dateInput);
    box.appendChild(dateGroup);

    // 時刻選択エリア
    const timeGroup = document.createElement('div');
    timeGroup.style.marginBottom = '25px';
    const timeLabel = document.createElement('label');
    timeLabel.textContent = '時刻';
    timeLabel.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #555; font-size: 14px;';
    
    const timeContainer = document.createElement('div');
    timeContainer.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;';

    let selectedTime = currentTime;

    CONFIG.ALLOWED_TIMES.forEach(time => {
      const btn = document.createElement('button');
      btn.textContent = time;
      const isSelected = time === selectedTime;
      btn.style.cssText = `
        padding: 8px 0; border: 1px solid #ddd; border-radius: 4px;
        background: ${isSelected ? '#005a9e' : '#fff'};
        color: ${isSelected ? '#fff' : '#333'};
        cursor: pointer; font-size: 14px; transition: all 0.2s;
        font-weight: ${isSelected ? 'bold' : 'normal'};
      `;
      
      btn.onmouseover = () => { if(time !== selectedTime) btn.style.background = '#f0f0f0'; };
      btn.onmouseout = () => { if(time !== selectedTime) btn.style.background = '#fff'; };

      btn.onclick = () => {
        // 全ボタンのスタイルリセット
        Array.from(timeContainer.children).forEach(c => {
          c.style.background = '#fff';
          c.style.color = '#333';
          c.style.fontWeight = 'normal';
        });
        // 選択ボタンのスタイル適用
        btn.style.background = '#005a9e';
        btn.style.color = '#fff';
        btn.style.fontWeight = 'bold';
        selectedTime = time;
      };
      timeContainer.appendChild(btn);
    });

    timeGroup.appendChild(timeLabel);
    timeGroup.appendChild(timeContainer);
    box.appendChild(timeGroup);

    // ボタンエリア
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display: flex; justify-content: space-between; gap: 10px; margin-top: 10px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.style.cssText = 'flex: 1; padding: 12px; border: 1px solid #ccc; background: #f8f9fa; color: #555; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s;';
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#e2e6ea';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#f8f9fa';
    cancelBtn.onclick = () => overlay.remove();

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存する';
    saveBtn.style.cssText = 'flex: 1; padding: 12px; border: none; background: #005a9e; color: #fff; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: background 0.2s;';
    saveBtn.onmouseover = () => saveBtn.style.background = '#004a80';
    saveBtn.onmouseout = () => saveBtn.style.background = '#005a9e';
    
    saveBtn.onclick = () => {
      if (!dateInput.value) {
        alert('日付を選択してください');
        return;
      }
      if (!selectedTime) {
        alert('時刻を選択してください');
        return;
      }
      onSave(dateInput.value, selectedTime);
      overlay.remove();
    };

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(saveBtn);
    box.appendChild(btnGroup);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    
    // オーバーレイクリックで閉じる
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
  };

  kintone.events.on('app.record.detail.show', function(event) {
    const space = kintone.app.record.getSpaceElement(CONFIG.SPACE_ID);
    if (!space) return;

    const record = event.record;
    const currentDate = record[CONFIG.FIELD_DATE].value;
    const currentTime = record[CONFIG.FIELD_TIME].value;
    const status = record[CONFIG.FIELD_STATUS] ? record[CONFIG.FIELD_STATUS].value : '';

    // 編集不可とするステータス (メール送信済、電話合意済など)
    const LOCKED_STATUSES = ['メール送信済', 'メール合意済', '電話合意済', '完了'];
    const isLocked = LOCKED_STATUSES.includes(status);

    // 表示コンテナ
    const container = document.createElement('div');
    if (isLocked) {
      container.style.cssText = `
        display: inline-flex; align-items: center; gap: 12px;
        padding: 10px 20px; background: #f5f5f5; border: 1px solid #ddd;
        border-radius: 6px; cursor: not-allowed; color: #999;
      `;
      container.title = '現在のステータスでは変更できません';
    } else {
      container.style.cssText = `
        display: inline-flex; align-items: center; gap: 12px;
        padding: 10px 20px; background: #fff; border: 1px solid #ccc;
        border-radius: 6px; cursor: pointer; transition: all 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      `;
      container.title = 'クリックして予約日時を変更';
    }
    
    // アイコン
    const icon = document.createElement('span');
    icon.innerHTML = '📅'; 
    icon.style.fontSize = '20px';

    // テキスト
    const text = document.createElement('span');
    text.style.cssText = 'font-size: 16px; font-weight: bold; color: #2c3e50;';
    text.textContent = formatDisplay(currentDate, currentTime);

    // 編集アイコン
    const editIcon = document.createElement('span');
    editIcon.innerHTML = isLocked ? '🔒' : '✏️';
    editIcon.style.fontSize = '14px';
    editIcon.style.opacity = '0.6';

    container.appendChild(icon);
    container.appendChild(text);
    container.appendChild(editIcon);

    if (!isLocked) {
      // ホバー効果
      container.onmouseover = () => { 
          container.style.background = '#f8fbff'; 
          container.style.borderColor = '#005a9e'; 
          container.style.transform = 'translateY(-1px)';
          container.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)';
      };
      container.onmouseout = () => { 
          container.style.background = '#fff'; 
          container.style.borderColor = '#ccc'; 
          container.style.transform = 'translateY(0)';
          container.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      };

      // クリックイベント
      container.onclick = () => {
        showEditModal(currentDate, currentTime, async (newDate, newTime) => {
          try {
            // ローディング表示
            text.textContent = '更新中...';
            container.style.cursor = 'wait';
            
            const body = {
              app: kintone.app.getId(),
              id: kintone.app.record.getId(),
              record: {
                [CONFIG.FIELD_DATE]: { value: newDate },
                [CONFIG.FIELD_TIME]: { value: newTime }
              }
            };

            await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body);
            
            // 成功したらリロード
            location.reload();
          } catch (error) {
            console.error(error);
            alert('更新に失敗しました: ' + error.message);
            text.textContent = formatDisplay(currentDate, currentTime); // 元に戻す
            container.style.cursor = 'pointer';
          }
        });
      };
    }

    space.innerHTML = '';
    
    const titleDiv = document.createElement('div');
    titleDiv.textContent = '確定予約日時';
    titleDiv.style.cssText = 'font-size: 12px; font-weight: bold; color: #333; margin-bottom: 5px;';
    space.appendChild(titleDiv);
    space.appendChild(container);
  });

})();
