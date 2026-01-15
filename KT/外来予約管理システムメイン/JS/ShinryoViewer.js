/*
 * ShinryoViewer.js (v30)
 * 診療シフト管理アプリ(ID:156)用 - 描画エンジン
 */
window.ShinryoApp = window.ShinryoApp || {};

(function() {
  'use strict';
  console.log('ShinryoViewer.js: Loading...');

  // 外部公開メソッド
  window.ShinryoApp.Viewer = {
    applyStyles: applyStyles,
    renderOverview: renderOverview,
    showCustomDialog: showCustomDialog
  };

  // --- CSS適用 ---
  function applyStyles() {
    const styleId = 'overview-mode-style';
    if (document.getElementById(styleId)) return;

    const css = `
      /* --- 参照モード時の不要要素隠蔽 --- */
      body.view-mode-overview .recordlist-header-gaia,
      body.view-mode-overview .recordlist-gaia,
      body.view-mode-overview .gaia-argoui-app-index-pager,
      body.view-mode-overview .gaia-argoui-app-viewtoggle,
      body.view-mode-overview .gaia-argoui-app-filterbutton,
      body.view-mode-overview .gaia-argoui-app-subtotalbutton,
      body.view-mode-overview .gaia-argoui-app-menu-add,
      body.view-mode-overview .gaia-argoui-app-menu-settingssplitbutton,
      body.view-mode-overview .gaia-argoui-optionmenubutton,
      body.view-mode-overview .gaia-argoui-app-menu-pin {
          display: none !important;
      }
      /* ツールバー圧縮 */
      body.view-mode-overview .gaia-argoui-app-toolbar {
          padding: 4px 0px !important;
          position: relative !important;
          height: auto !important;
          min-height: 38px !important;
      }

      /* --- タイトル --- */
      .overview-title-container {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        white-space: nowrap;
        pointer-events: none;
        z-index: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
      }
      .overview-title-text {
        font-size: 30px;
        font-weight: bold;
        color: #333;
        line-height: 1;
      }
      .overview-last-update {
        font-size: 11px;
        color: #666;
        margin-top: 5px;
        font-weight: normal;
        line-height: 1.2;
      }
      .overview-text-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .btn-update-available {
        pointer-events: auto;
        background-color: #e74c3c;
        color: white;
        border: none;
        padding: 6px 16px;
        border-radius: 20px;
        font-weight: bold;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        animation: pulse-animation 2s infinite;
      }
      @keyframes pulse-animation {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }

      /* --- ボタン --- */
      .mode-switch-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: #3498db;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 0 20px;
        height: 35px;
        line-height: 35px;
        font-weight: bold;
        cursor: pointer;
        font-size: 15px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        transition: background-color 0.2s;
        vertical-align: top;
        box-sizing: border-box;
        margin-left: 30px;
        margin-top: 10px;
        position: relative;
        z-index: 1;
      }
      .mode-switch-btn:hover { background-color: #2980b9; }

      /* --- 全体レイアウト --- */
      #overview-container { padding: 0 20px 20px; background-color: #fff; font-family: "Meiryo", "Hiragino Kaku Gothic ProN", sans-serif; }
      .shinryo-config-table { width: 100%; border-collapse: collapse; border: 2px solid #555; table-layout: fixed; margin-top: 0px; }
      .shinryo-config-table th, .shinryo-config-table td { border: 1px solid #ddd; padding: 6px; font-size: 12px; vertical-align: middle; text-align: center; }
      .shinryo-config-table th { background-color: #e9e9e9; color: #333; font-weight: bold; font-size: 13px; height: 30px; }
      .shinryo-config-table tr.department-group-start > td { border-top: 2px solid #555; }
      .shinryo-config-table td.bunya-cell, .shinryo-config-table th.bunya-cell { border-right: 2px solid #555; }
      .shinryo-config-table td.large-font-cell { font-size: 1.3em; font-weight: bold; }
      .shinryo-config-table td.align-top { vertical-align: top; }
      .gray-out-cell { background-color: #888888; color: #fff; }
      
      /* --- 差分検知（点滅） --- */
      .cell-changed { animation: blink-animation 1.5s infinite; }
      @keyframes blink-animation { 50% { background-color: #ff8a80; } }

      /* --- トグルスイッチ --- */
      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 22px;
        vertical-align: middle;
        margin: 0 4px;
      }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: #2196F3;
        transition: .4s;
        border-radius: 22px;
      }
      .toggle-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      input:checked + .toggle-slider { background-color: #ccc; }
      input:checked + .toggle-slider:before { transform: translateX(18px); }
      input:disabled + .toggle-slider { opacity: 0.5; cursor: not-allowed; }
      
      .toggle-label { font-size: 11px; font-weight: bold; }
      .label-accept { color: #2196F3; }
      .label-stop { color: #ff5252; }

      /* --- 大型トグルスイッチ（診療科用） --- */
      .toggle-switch.large { width: 50px; height: 26px; }
      .toggle-switch.large .toggle-slider { border-radius: 26px; }
      .toggle-switch.large .toggle-slider:before {
        height: 20px; width: 20px; left: 3px; bottom: 3px;
      }
      .toggle-switch.large input:checked + .toggle-slider:before {
        transform: translateX(24px);
      }
      
      /* 診療科ヘッダーコンテナ */
      .dept-header-container { display: flex; align-items: center; justify-content: center; gap: 10px; }

      /* --- アイコン・ツールチップ --- */
      .custom-icon { display: inline-block; width: 20px; height: 20px; vertical-align: middle; background-repeat: no-repeat; background-size: contain; cursor: help; margin-left: 4px; }
      .icon-schedule { background: none; font-size: 18px; line-height: 1.1; text-align: center; width: auto; height: auto; }
      .dept-info-row { margin-top: 4px; display: flex; justify-content: center; gap: 4px; align-items: center; flex-wrap: wrap; }
      #customHtmlTooltip { display: none; position: absolute; background-color: #fff; border: 1px solid #ccc; box-shadow: 2px 2px 8px rgba(0,0,0,0.3); padding: 10px; z-index: 10000; max-width: 700px; border-radius: 4px; color: #333; text-align: left; }

      /* --- カレンダー --- */
      .calendar-container { padding: 0 5px; font-size: 12px; min-width: 600px; }
      .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
      .calendar-header h3 { margin: 0; font-size: 18px; font-weight: bold; color: #333; }
      .calendar-nav { cursor: pointer; padding: 4px 12px; border-radius: 4px; user-select: none; color: #999; font-size: 16px; }
      .calendar-nav:hover { background-color: #eee; color: #333; }
      .calendar-table { width: 100%; border-collapse: collapse; table-layout: fixed; background-color: #fff; }
      .calendar-table th { background-color: #f2f2f2; font-size: 12px; padding: 4px 0; border: 1px solid #ccc; color: #333; font-weight: bold; text-align: center; vertical-align: middle; }
      .calendar-table th.sat-col { color: #007bff; }
      .calendar-table td { border: 1px solid #ccc; text-align: center; vertical-align: top; height: auto; min-height: 60px; padding: 0; position: relative; background: #fff; }
      .calendar-table td.holiday-cell { background-color: #ffe4e1 !important; }
      .holiday-name-display { color: #d9534f; font-weight: bold; font-size: 11px; margin-top: 15px; margin-bottom: 5px; }
      .calendar-table td.past-date { background-color: #f9f9f9; color: #ccc; }
      .calendar-table td.past-date .date-num { color: #aaa; }
      .date-num { text-align: left; padding: 2px 0 0 4px; font-size: 13px; font-weight: bold; color: #555; font-family: Arial, sans-serif; line-height: 1; }
      .am-slot, .pm-slot { font-size: 10px; width: 100%; padding: 2px 1px; box-sizing: border-box; line-height: 1.2; margin-bottom: 1px; }
      .am-slot { background-color: #e0f7fa; margin-top: 2px; }
      .pm-slot { background-color: #fff9c4; }
      
      .calendar-legend-area { margin-top: 8px; border-top: 1px solid #eee; padding-top: 5px; text-align: left; font-size: 11px; color: #444; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
      .legend-item { white-space: nowrap; }
      
      .schedule-table { width: 100%; border-collapse: collapse; font-size: 11px; }
      .schedule-table th, .schedule-table td { border: 1px solid #bbb; padding: 4px; text-align: center; }
      .schedule-table th { background-color: #e0e0e0; }
      .schedule-am { background-color: #e0f7fa; }
      .schedule-pm { background-color: #e8f5e9; }
      .schedule-allday { background-color: #fff3e0; }

      /* --- カスタムダイアログ --- */
      .custom-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.5); z-index: 10000;
          display: flex; justify-content: center; align-items: center;
      }
      .custom-modal-box {
          background: #fff; padding: 25px; border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          min-width: 350px; max-width: 500px; text-align: center;
      }
      .custom-modal-msg { margin-bottom: 25px; font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #333; }
      .custom-modal-btn-group { display: flex; justify-content: center; gap: 15px; }
      .custom-modal-btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; min-width: 80px; }
      .custom-modal-btn-ok { background: #3498db; color: #fff; }
      .custom-modal-btn-cancel { background: #95a5a6; color: #fff; }

      /* --- 医師名セル --- */
      .doctor-name-cell { font-size: 1.5em; font-weight: bold; }
      .doctor-name-cell { font-size: 16px; font-weight: bold; }

      /* --- 詳細ボタン --- */
      .btn-detail {
        background-color: #3498db;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
        margin-left: 5px;
        transition: background-color 0.2s;
        vertical-align: middle;
      }
      .btn-detail:hover { background-color: #2980b9; }

      /* --- 入力ダイアログ --- */
      .term-input-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px; }
      .term-input-label { width: 100px; text-align: right; font-weight: bold; }
      .term-input-field { width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: right; }

      /* --- スケジュール表内アイコン --- */
      .icon-g { color: green; font-weight: bold; font-size: 1.1em; margin-right: 2px; }
      .icon-c { color: #007bff; font-weight: bold; font-size: 1.1em; margin-right: 2px; }
      .icon-note { color: #e74c3c; font-weight: bold; cursor: help; margin-left: 2px; font-size: 1.1em; }
    `;
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }

  // --- カスタムダイアログ関数 ---
  function showCustomDialog(message, type = 'alert', labels = {}) {
      return new Promise((resolve) => {
          const overlay = document.createElement('div');
          overlay.className = 'custom-modal-overlay';
          const box = document.createElement('div');
          box.className = 'custom-modal-box';
          const msg = document.createElement('div');
          msg.className = 'custom-modal-msg';
          msg.textContent = message;
          const btnGroup = document.createElement('div');
          btnGroup.className = 'custom-modal-btn-group';

          const createBtn = (text, cls, val) => {
              const btn = document.createElement('button');
              btn.textContent = text;
              btn.className = `custom-modal-btn ${cls}`;
              btn.onclick = () => { document.body.removeChild(overlay); resolve(val); };
              return btn;
          };

          const cancelText = labels.cancel || 'キャンセル';
          const okText = labels.ok || 'OK';

          if (type === 'confirm') btnGroup.appendChild(createBtn(cancelText, 'custom-modal-btn-cancel', false));
          btnGroup.appendChild(createBtn(okText, 'custom-modal-btn-ok', true));

          box.appendChild(msg); box.appendChild(btnGroup); overlay.appendChild(box); document.body.appendChild(overlay);
      });
  }

  // --- データ取得 ---
  async function fetchAllRecords(appId) {
    let allRecords = [];
    let offset = 0;
    const limit = 500;
    while (true) {
      const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', { app: appId, query: `limit ${limit} offset ${offset}` });
      allRecords = allRecords.concat(resp.records);
      offset += resp.records.length;
      if (resp.records.length < limit) break;
    }
    return allRecords;
  }


  function getFacilityChar(fullName, facilities) {
    if (!fullName || !facilities) return '';
    // デフォルト色パレット
    const defaultColors = ['#007bff', '#28a745', '#e67e22', '#9b59b6', '#e74c3c'];
    
    for (let i = 0; i < facilities.length; i++) {
        const fac = facilities[i];
        if (fac.name && fullName.includes(fac.name)) {
            const color = fac.color || defaultColors[i % defaultColors.length];
            const sym = fac.shortName || '●';
            return `<span style="color:${color}; font-weight:bold; font-size:1.0em;">${sym}</span>`;
        }
    }
    return '';
  }
  function stripHtml(html) { const t = document.createElement('div'); t.innerHTML = html || ''; return t.textContent || t.innerText || ''; }
  
  function getHolidayName(dateObj, customHolidays) {
    const y = dateObj.getFullYear(), m = dateObj.getMonth() + 1, d = dateObj.getDate();
    // ゼロ埋めなしのキー（既存ロジック互換）
    const key = `${y}-${m}-${d}`; 
    // ゼロ埋めありのキー（設定保存用）
    const keyPad = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    // 1. カスタム休診日チェック
    if (customHolidays && customHolidays.includes(keyPad)) {
        return '休診日';
    }
    // 2. 固定祝日チェック
    const holidays = { '2025-1-1': '元日', '2025-1-13': '成人の日', '2026-1-1': '元日' }; 
    return holidays[key] || null;
  }

  function createCalendarHtml(targetDate, scheduleRecords, commonSettings) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const departmentName = scheduleRecords.length > 0 ? scheduleRecords[0]['診療科']?.value : '';
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); 
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startOffset);

    const specMap = new Map();
    let specCounter = 1;
    scheduleRecords.forEach(rec => {
        const sel = rec['診療選択']?.value;
        if (sel && sel !== '（全般）' && sel !== '') {
            if (!specMap.has(sel)) specMap.set(sel, specCounter++);
        }
    });

    const customHolidays = commonSettings ? (commonSettings.holidays || []) : [];
    const facilities = commonSettings ? (commonSettings.facilities || []) : [];

    const scheduleByDate = {};
    let existsFacility = false;

    for (let i = 0; i < 42; i++) {
        const d = new Date(startDate); d.setDate(d.getDate() + i);
        if(d.getDay() === 0) continue; 
        const dayChar = ['日','月','火','水','木','金','土'][d.getDay()];
        let weekNum = Math.floor((d.getDate() - 1) / 7) + 1;
        const fieldCode = `${dayChar}${weekNum}`;
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        scheduleByDate[key] = { am: [], pm: [] };

        if (d.getMonth() === month) {
            scheduleRecords.forEach(rec => {
                // 着任日・離任日のチェック
                const startStr = rec['着任日']?.value;
                const endStr = rec['離任日']?.value;
                if (startStr) {
                    const parts = startStr.split('-');
                    const sDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    if (d < sDate) return;
                }
                if (endStr) {
                    const parts = endStr.split('-');
                    const eDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    if (d > eDate) return;
                }

                const vals = rec[fieldCode]?.value || [];
                if (vals.length > 0) {
                    let name = (rec['医師名']?.value || '〇') + getFacilityChar(rec['施設名']?.value, facilities);
                    const sel = rec['診療選択']?.value;
                    if (specMap.has(sel)) name += ` #${specMap.get(sel)}`;

                    let isAmNg = false;
                    let isPmNg = false;
                    const ngTable = rec['直近NG日指定']?.value;
                    if (ngTable && Array.isArray(ngTable)) {
                        const targetDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        for (const row of ngTable) {
                            if (row.value['日付']?.value === targetDateStr) {
                                const ngTimes = row.value['NG時間帯']?.value || [];
                                if (ngTimes.includes('AM')) isAmNg = true;
                                if (ngTimes.includes('PM')) isPmNg = true;
                            }
                        }
                    }

                    if (vals.includes('午前') && !isAmNg && !scheduleByDate[key].am.includes(name)) scheduleByDate[key].am.push(name);
                    if (vals.includes('午後') && !isPmNg && !scheduleByDate[key].pm.includes(name)) scheduleByDate[key].pm.push(name);
                    const fName = rec['施設名']?.value || '';
                    if (fName) existsFacility = true;
                }
            });
        }
    }

    let html = `<div class="calendar-container" data-y="${year}" data-m="${month}"><div class="calendar-header"><div class="calendar-nav prev-month">◀</div><h3>${year}年 ${month + 1}月 ${departmentName ? '('+departmentName+')' : ''}</h3><div class="calendar-nav next-month">▶</div></div><table class="calendar-table"><thead><tr><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th><th class="sat-col">土</th></tr></thead><tbody>`;
    let current = new Date(startDate);
    for(let r=0; r<6; r++){
        let rowHtml = "";
        let hasDayInMonth = false;
        for(let c=0; c<7; c++){
             if(current.getDay() === 0) { current.setDate(current.getDate()+1); continue; } 
             const isTarget = current.getMonth() === month;
             if(isTarget) hasDayInMonth = true;
             const dateKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;
             const holidayName = getHolidayName(current, customHolidays);
             const sch = scheduleByDate[dateKey] || {am:[], pm:[]};
             let cls = isTarget ? "" : "past-date";
             if (holidayName) cls += " holiday-cell";
             rowHtml += `<td class="${cls}"><div class="date-num">${current.getDate()}</div>`;
             if (isTarget) {
                 if (holidayName) rowHtml += `<div class="holiday-name-display">${holidayName}</div>`;
                 else {
                     if (sch.am.length > 0) rowHtml += `<div class="am-slot">${sch.am.join('<br>')}</div>`;
                     if (sch.pm.length > 0) rowHtml += `<div class="pm-slot">${sch.pm.join('<br>')}</div>`;
                 }
             }
             rowHtml += `</td>`;
             current.setDate(current.getDate()+1);
        }
        if(hasDayInMonth || r === 0) html += `<tr>${rowHtml}</tr>`;
    }
    let legendHtml = '';
    let legendParts = [];
    const defaultColors = ['#007bff', '#28a745', '#e67e22', '#9b59b6', '#e74c3c'];
    facilities.forEach((fac, i) => {
        const color = fac.color || defaultColors[i % defaultColors.length];
        const sym = fac.shortName || '●';
        legendParts.push(`<span style="color:${color};font-weight:bold;">${sym}</span> ${fac.name}`);
    });
    legendParts.push(`<span style="background-color:#e0f7fa; border:1px solid #ccc; padding:0 4px;">午前</span>`);
    legendParts.push(`<span style="background-color:#fff9c4; border:1px solid #ccc; padding:0 4px;">午後</span>`);
    legendHtml += `<span class="legend-item">凡例: ${legendParts.join(' / ')}</span>`;

    if (specMap.size > 0) {
        const sortedSpecs = Array.from(specMap.entries()).sort((a,b) => a[1] - b[1]);
        legendHtml += sortedSpecs.map(([name, id]) => `<span class="legend-item">#${id}: ${name}</span>`).join('');
    }
    html += `</tbody></table><div class="calendar-legend-area">${legendHtml}</div></div>`;
    return html;
  }

  function createScheduleTableHtml(rec, isMerged = false, commonSettings = null) {
      const days = ['月','火','水','木','金','土'];
      const facility = rec['施設名']?.value || '';
      const department = rec['診療科']?.value || '';
      const selection = rec['診療選択']?.value || ''; 
      const doctor = rec['医師名']?.value || '';
      const facilities = commonSettings ? (commonSettings.facilities || []) : [];
      
      // タイトル部
      // ヘッダー表示形式を変更: [施設名]　[診療科]　[診療選択]　[医師名]
      let headerText = `${facility}　${department}`;
      if (selection) headerText += `　${selection}`;
      headerText += `　${doctor}`;

      let html = `<div style="text-align:center;font-weight:bold;margin-bottom:10px;font-size:16px;color:#333;">${headerText}</div>`;
      html += `<table class="schedule-table" style="table-layout: fixed; width: 100%;"><colgroup><col style="width: 50px;"><col><col><col><col><col><col></colgroup><thead><tr><th></th>`;
      days.forEach(d => html += `<th>${d}</th>`);
      html += `</tr></thead><tbody>`;
      ['1','2','3','4','5'].forEach(w => {
          html += `<tr><th>第${w}</th>`;
          days.forEach(d => {
              const field = `${d}${w}`;
              const v = rec[field]?.value || [];
              let cls = '', txt = '';
              if(v.includes('午前') && v.includes('午後')) { cls='schedule-allday'; txt='終日'; }
              else if(v.includes('午前')) { cls='schedule-am'; txt='午前'; }
              else if(v.includes('午後')) { cls='schedule-pm'; txt='午後'; }
              
              // アイコン付与ロジック
              let icons = '';
              if (isMerged && rec._scheduleInfo && rec._scheduleInfo[field]) {
                  const info = rec._scheduleInfo[field];
                  // 施設アイコンの動的生成
                  const defaultColors = ['#007bff', '#28a745', '#e67e22', '#9b59b6', '#e74c3c'];
                  facilities.forEach((fac, idx) => {
                      if (info.facilities.has(fac.name)) {
                          const color = fac.color || defaultColors[idx % defaultColors.length];
                          icons += `<span style="color:${color};font-weight:bold;margin-right:2px;">${fac.shortName}</span>`;
                      }
                  });
                  if (info.notes.size > 0) {
                      const noteText = Array.from(info.notes).join('\n').replace(/"/g, '&quot;');
                      icons += `<span class="icon-note" title="${noteText}">!</span>`;
                  }
              }

              html += `<td class="${cls}">${icons}${txt}</td>`;
          });
          html += `</tr>`;
      });
      html += `</tbody></table>`;
      
      // 凡例追加
      const legendParts = [];
      const defaultColors = ['#007bff', '#28a745', '#e67e22', '#9b59b6', '#e74c3c'];
      facilities.forEach((fac, i) => {
          const color = fac.color || defaultColors[i % defaultColors.length];
          legendParts.push(`<span style="color:${color};font-weight:bold;">${fac.shortName}</span> ${fac.name}`);
      });
      html += `<div style="margin-top:8px; font-size:11px; text-align:left; color:#555;">凡例: ${legendParts.join(' / ')} / <span class="icon-note">!</span> 医師別案内 (マウスオーバーで表示)</div>`;
      
      return html;
  }

  // ★追加: 同一医師・同一条件のレコードをマージする関数
  function mergeSameDoctorRecords(records, commonSettings) {
    const map = new Map();
    const days = ['月', '火', '水', '木', '金', '土'];
    const weeks = ['1', '2', '3', '4', '5'];
    const scheduleFields = days.flatMap(d => weeks.map(w => d + w));

    // 正規化ヘルパー: 全角半角スペースを除去
    const normalize = (str) => (str || '').replace(/[\s\u3000]+/g, '');
    const facilities = commonSettings ? (commonSettings.facilities || []) : [];

    records.forEach(rec => {
        // マージキー: 診療分野, 診療科, 医師名 (施設名、診療選択は除外してマージ対象とする)
        const key = [
            normalize(rec['診療分野']?.value),
            normalize(rec['診療科']?.value),
            normalize(rec['医師名']?.value)
        ].join('___');

        // 施設名判定用ヘルパー (動的)
        const getFacName = (val) => {
            for (const fac of facilities) {
                if (val.includes(fac.name)) return fac.name;
            }
            return '';
        };

        if (!map.has(key)) {
            // ベースレコード作成 (Deep Copy)
            const baseRec = JSON.parse(JSON.stringify(rec));
            baseRec._mergedIds = [rec.$id.value];
            baseRec._selections = new Set(); // 診療選択を保持するSet
            if (rec['診療選択']?.value) baseRec._selections.add(rec['診療選択'].value);
            baseRec._facilities = new Set(); // 施設名を保持するSet
            if (rec['施設名']?.value) baseRec._facilities.add(rec['施設名'].value);
            
            // スケジュール詳細情報の初期化
            baseRec._scheduleInfo = {};
            scheduleFields.forEach(f => {
                if (rec[f]?.value?.length > 0) {
                    baseRec._scheduleInfo[f] = { facilities: new Set(), notes: new Set() };
                    const facName = getFacName(rec['施設名']?.value || '');
                    if (facName) baseRec._scheduleInfo[f].facilities.add(facName);
                    if (rec['留意案内']?.value) baseRec._scheduleInfo[f].notes.add(rec['留意案内'].value);
                }
            });

            map.set(key, baseRec);
        } else {
            const baseRec = map.get(key);
            baseRec._mergedIds.push(rec.$id.value);

            // 診療選択のマージ
            if (rec['診療選択']?.value) baseRec._selections.add(rec['診療選択'].value);
            // 施設名のマージ
            if (rec['施設名']?.value) baseRec._facilities.add(rec['施設名'].value);

            // スケジュールマージ (和集合) ＆ 詳細情報収集
            scheduleFields.forEach(field => {
                const baseVals = baseRec[field]?.value || [];
                const currentVals = rec[field]?.value || [];
                const mergedSet = new Set([...baseVals, ...currentVals]);
                baseRec[field].value = Array.from(mergedSet);

                // 詳細情報の収集
                if (currentVals.length > 0) {
                    if (!baseRec._scheduleInfo) baseRec._scheduleInfo = {};
                    if (!baseRec._scheduleInfo[field]) baseRec._scheduleInfo[field] = { facilities: new Set(), notes: new Set() };
                    
                    const facName = getFacName(rec['施設名']?.value || '');
                    if (facName) baseRec._scheduleInfo[field].facilities.add(facName);
                    if (rec['留意案内']?.value) baseRec._scheduleInfo[field].notes.add(rec['留意案内'].value);
                }
            });

            // 掲載ステータスマージ (どれか一つでも「受付」なら「受付」とする)
            if (rec['掲載']?.value === '受付') {
                baseRec['掲載'].value = '受付';
            }
            
            // 予約開始・期間・案内などはベースレコード(先に処理されたもの)を優先
        }
    });
    
    // マージ後の後処理
    const result = Array.from(map.values());
    result.forEach(rec => {
        if (rec._selections && rec._selections.size > 0) {
            // 診療選択を結合して表示用に更新
            const sortedSels = Array.from(rec._selections).sort().filter(s => s);
            if (sortedSels.length > 0) rec['診療選択'].value = sortedSels.join('、');
        }
        if (rec._facilities && rec._facilities.size > 0) {
            // 施設名を結合して表示用に更新
            const sortedFacs = Array.from(rec._facilities).sort().filter(s => s);
            if (sortedFacs.length > 0) rec['施設名'].value = sortedFacs.join(',');
        }
    });

    return result;
  }

  function renderOverview() {
    const container = document.getElementById('overview-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:50px;"><div class="kintone-spinner"></div> Loading...</div>';

    Promise.all([
        fetchAllRecords(kintone.app.getId()), // 現在のアプリ(App156)のレコード（ドラフト）
        window.ShinryoApp.ConfigManager.fetchPublishedData() // 共通設定保管アプリ(App200)のデータ（公開版）
    ]).then(([records, publishedData]) => {
        const descriptions = publishedData.descriptions || {};
        const deptSettings = publishedData.departmentSettings || {}; // ★追加: 診療科設定取得
        const commonSettings = publishedData.commonSettings || {}; // ★追加: 共通設定取得
        
        // --- レコードのフィルタリング処理 ---
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();

        // スケジュール比較用ヘルパー
        const days = ['月', '火', '水', '木', '金', '土'];
        const weeks = ['1', '2', '3', '4', '5'];
        const scheduleFields = days.flatMap(d => weeks.map(w => d + w));
        const getScheduleSet = (rec) => {
            const set = new Set();
            scheduleFields.forEach(field => {
                const val = rec[field]?.value || [];
                if (val.includes('午前')) set.add(`${field}_AM`);
                if (val.includes('午後')) set.add(`${field}_PM`);
            });
            return set;
        };

        // ★変更: フィルタリングロジックを関数化して再利用可能にする
        const createFilter = (sourceRecords) => (rec) => {
            const startStr = rec['着任日']?.value;
            const endStr = rec['離任日']?.value;
            
            // 日付パース（ローカルタイム）
            const parseDate = (str) => {
                if (!str) return null;
                const parts = str.split('-');
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
            };
            const start = parseDate(startStr) ?? -8640000000000000;
            const end = parseDate(endStr) ?? 8640000000000000;

            // 1. 有効期間チェック (過去に離任したレコードのみ除外、未来の着任は表示)
            if (todayTime > end) return false;

            const myTag = rec['集合']?.value;
            if (!myTag) return true; // タグなしは競合しない

            const myId = rec['$id'].value;
            const mySchedule = getScheduleSet(rec);

            const hasConflict = sourceRecords.some(other => {
                if (other['$id'].value === myId) return false;
                if ((other['集合']?.value || '') !== myTag) return false;
                
                const oStart = parseDate(other['着任日']?.value) ?? -8640000000000000;
                const oEnd = parseDate(other['離任日']?.value) ?? 8640000000000000;
                if (!(start <= oEnd && end >= oStart)) return false;

                // 時間割重複チェック
                const oSchedule = getScheduleSet(other);
                for (let slot of mySchedule) {
                    if (oSchedule.has(slot)) return true; // 重複あり
                }
                return false;
            });
            return !hasConflict; // 競合がある場合は除外（無効扱い）
        };

        const validRecords = records.filter(createFilter(records));

        // マージ前にソートして、ベースとなるレコード(ID)を安定させる
        const sortFunc = (a, b) => {
            const oa = parseInt(a['表示順']?.value || 9999, 10);
            const ob = parseInt(b['表示順']?.value || 9999, 10);
            if (oa !== ob) return oa - ob;
            return parseInt(a.$id.value, 10) - parseInt(b.$id.value, 10);
        };
        validRecords.sort(sortFunc);

        // ★変更: レコードのマージ処理を実行
        const mergedRecords = mergeSameDoctorRecords(validRecords, commonSettings);

        // ★追加: 比較用（公開済みデータ）も同様にマージしてマップ化
        const pubAllRecords = publishedData.records || [];
        const validPubRecords = pubAllRecords.filter(createFilter(pubAllRecords)); // ★変更: 公開データも同じ条件でフィルタリング
        validPubRecords.sort(sortFunc);
        const mergedPublishedRecords = mergeSameDoctorRecords(validPubRecords, commonSettings);
        const publishedMap = new Map(mergedPublishedRecords.map(r => [String(r.$id.value), r])); // ★変更: IDを文字列に統一

        // ★デバッグ: マージ後のレコード数比較
        console.log(`[Viewer Debug] Merged Records Count - Local: ${mergedRecords.length}, Published: ${mergedPublishedRecords.length}`);
        console.log(`[Viewer Debug] Published Map Keys:`, Array.from(publishedMap.keys()));
        console.log(`[Viewer Debug] Local Merged Keys:`, mergedRecords.map(r => String(r.$id.value)));

        renderTable(mergedRecords, descriptions, container, publishedMap, deptSettings, commonSettings); // ★変更: commonSettingsも渡す
    }).catch(err => {
        console.error('Overview load error:', err);
        container.innerHTML = '<div style="color:red;padding:20px;">データの読み込みに失敗しました。<br>ページをリロードしてください。</div>';
    });
  }

  function renderTable(records, descriptions, container, publishedMap, deptSettings, commonSettings) {
    container.innerHTML = '';
    records.sort((a, b) => {
        const oa = parseInt(a['表示順']?.value || 9999, 10);
        const ob = parseInt(b['表示順']?.value || 9999, 10);
        return oa - ob;
    });

    // ★追加: 差分判定用に公開済みの診療分野・診療科リストを作成
    const existingBunyas = new Set();
    const existingDepts = new Set();
    if (publishedMap) {
        publishedMap.forEach(r => {
            if (r['診療分野']?.value) existingBunyas.add(r['診療分野'].value);
            if (r['診療科']?.value) existingDepts.add(r['診療科'].value);
        });
    }

    const table = document.createElement('table');
    table.className = 'shinryo-config-table';
    
    const columns = [
      { header: '予約受付', field: '診療科', type: 'dept_toggle', width: '6%', merge: true, cls: 'large-font-cell' },
      { header: '予定表', type: 'calendar_icon', width: '5%', merge: true, mergeKey: '診療科', cls: 'large-font-cell' },
      { header: '予約期間', type: 'term_group', width: '12%', merge: true, mergeKey: '診療科', cls: 'large-font-cell' },
      { header: '診療科', field: '診療科', width: '27%', merge: true, cls: 'large-font-cell' },
      { header: '医師名', field: '医師名', width: '12%', cls: 'doctor-name-cell' }
    ];

    const thead = table.createTHead();
    const hRow = thead.insertRow();
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.header;
        if (col.width) th.style.width = col.width;
        if (col.cls) col.cls.split(' ').forEach(c => th.classList.add(c));
        hRow.appendChild(th);
    });

    // ★変更: マージロジックの修正 (fieldがない列でもmergeKeyを使って結合判定できるようにする)
    const mergeCols = columns.filter(c => c.merge);
    for (const col of mergeCols) {
        const fieldKey = col.mergeKey || col.field; // マージ判定に使うフィールド名
        const rowspanKey = col.field || col.type;   // rowspanを保存するキー

        for (let i = 0; i < records.length; i++) {
            const currentVal = records[i][fieldKey]?.value;
            const prevVal = (i > 0) ? records[i-1][fieldKey]?.value : null;
            if (i === 0 || currentVal !== prevVal) {
                let count = 1;
                for (let j = i + 1; j < records.length; j++) {
                    if (records[j][fieldKey]?.value === currentVal) count++; else break;
                }
                records[i][`_rowspan_${rowspanKey}`] = count;
            } else { records[i][`_rowspan_${rowspanKey}`] = 0; }
        }
    }

    // ★追加: ローカル比較ロジック (マージ済みレコード同士を比較するため)
    const isDiffLocal = (rec1, rec2, col) => {
        const field = col.field;
        const type = col.type;
        
        // ★変更: 正規化ヘルパー (強化版: 空白文字の完全正規化)
        const normalize = (val) => {
            if (val === null || val === undefined) return '';
            return String(val)
                .replace(/\r\n/g, '\n').replace(/\r/g, '\n') // 改行コード統一
                .replace(/[\s\u3000]+/g, ' ') // 全角・半角スペース、タブ等を「1つの半角スペース」に置換
                .trim();
        };

        if (type === 'schedule') {
            const days = ['月', '火', '水', '木', '金', '土'];
            const weeks = ['1', '2', '3', '4', '5'];
            for (const w of weeks) {
                for (const d of days) {
                    const key = `${d}${w}`;
                    const v1 = (rec1[key]?.value || []).slice().sort();
                    const v2 = (rec2[key]?.value || []).slice().sort();
                    if (JSON.stringify(v1) !== JSON.stringify(v2)) {
                        console.warn(`[Viewer Diff] Schedule ${key} (ID:${rec1.$id.value}):`, v1, v2);
                        return true;
                    }
                }
            }
            return false;
        }
        if (type === 'term') {
            return (JSON.stringify(rec1['予約開始']?.value) !== JSON.stringify(rec2['予約開始']?.value)) ||
                   (JSON.stringify(rec1['予約可能期間']?.value) !== JSON.stringify(rec2['予約可能期間']?.value));
        }
        if (type === 'info') {
             const v1 = normalize(rec1['留意案内']?.value);
             const v2 = normalize(rec2['留意案内']?.value);
             if (v1 !== v2) {
                 console.warn(`[Viewer Diff] Info (ID:${rec1.$id.value}):`, v1, v2);
                 return true;
             }
        }
        if (field) {
             const v1 = normalize(rec1[field]?.value);
             const v2 = normalize(rec2[field]?.value);
             if (v1 !== v2) {
                 console.warn(`[Viewer Diff] Field ${field} (ID:${rec1.$id.value}):`, v1, v2);
                 return true;
             }
        }
        return false;
    };

    const tbody = table.createTBody();
    records.forEach((rec, idx) => {
        const row = tbody.insertRow();
        const isSuspended = rec['掲載']?.value === '停止';
        const currentDept = rec['診療科']?.value;
        // 診療科全体のステータスを確認 (descriptions内の特殊キー __status__診療科名)
        const deptStatus = descriptions['__status__' + currentDept];
        const isDeptStopped = deptStatus === '停止';

        const prevDept = (idx > 0) ? records[idx-1]['診療科']?.value : null;
        if (idx === 0 || currentDept !== prevDept) row.classList.add('department-group-start');

        columns.forEach(col => {
            const rowspanKey = col.field || col.type;
            if (col.merge && rec[`_rowspan_${rowspanKey}`] === 0) return;
            const cell = row.insertCell();
            if (col.cls) col.cls.split(' ').forEach(c => cell.classList.add(c));
            if (col.merge && rec[`_rowspan_${rowspanKey}`] > 1) cell.rowSpan = rec[`_rowspan_${rowspanKey}`];
            
            cell.dataset.field = col.field || '';

            // 行のグレーアウト判定
            if (isDeptStopped) {
                // 診療科停止: 診療分野以外はグレーアウト
                if (col.field !== '診療分野') cell.classList.add('gray-out-cell');
            } else if (isSuspended) {
                // 個別停止: 診療分野、診療科(toggle含む)、予定表は除外
                if (col.field !== '診療分野' && col.field !== '診療科' && col.type !== 'calendar_icon') {
                    cell.classList.add('gray-out-cell');
                }
            }

            // 差分検知ロジックの適用
            // ★変更: ConfigManager.checkDiff ではなく、マージ済みデータ同士で比較する
            const pubRec = publishedMap ? publishedMap.get(String(rec.$id.value)) : null; // ★変更: IDを文字列に統一
            let isChanged = false;
            if (!pubRec) {
                // ★変更: 新規レコードの場合でも、結合カラムについては既存グループなら点滅させない
                if (col.merge) {
                    const val = rec[col.field]?.value;
                    const deptVal = rec['診療科']?.value;
                    if (col.field === '診療分野' && existingBunyas.has(val)) {
                        isChanged = false;
                    } else if ((col.field === '診療科' || col.type === 'dept_toggle' || col.type === 'calendar_icon') && existingDepts.has(deptVal)) {
                        isChanged = false;
                    } else {
                        isChanged = true; // 新規グループの場合は点滅
                    }
                } else {
                    // 通常カラム（医師名など）は新規なら点滅
                    isChanged = true;
                }
            } else {
                isChanged = isDiffLocal(rec, pubRec, col);
            }

            // term_group の差分検知は廃止（Viewer上で直接編集・保存するため）
            if (col.type === 'term_group') {
                 isChanged = false;
            }

            if (col.field !== '掲載' && isChanged) {
                cell.classList.add('cell-changed');
            }

            if (col.type === 'dept_toggle') {
                // 診療科全体トグル (descriptionsのステータスを優先)
                // ステータスが '停止' ならON(右:グレー)、それ以外(undefined含む)ならOFF(左:青)
                const isToggleStopped = isDeptStopped;
                
                const deptLabel = document.createElement('label');
                deptLabel.className = 'toggle-switch large';
                
                const deptInput = document.createElement('input');
                deptInput.type = 'checkbox';
                deptInput.checked = isToggleStopped; 
                
                const deptSlider = document.createElement('span');
                deptSlider.className = 'toggle-slider';
                
                deptInput.onchange = async function() {
                    const newState = deptInput.checked ? '停止' : '受付';
                    const msg = `診療科「${currentDept}」の表示設定を【${newState}】に変更しますか？\n※Webフォームへの反映には少し時間がかかる場合があります。`;
                    
                    const confirmed = await showCustomDialog(msg, 'confirm', { ok: '変更する', cancel: 'キャンセル' });
                    if (!confirmed) {
                        deptInput.checked = !deptInput.checked;
                        return;
                    }
                    deptInput.disabled = true;
                    try {
                        // 診療科ステータスのみ更新 (レコードは変更しない)
                        await window.ShinryoApp.ConfigManager.updateDepartmentStatus(currentDept, newState);
                        
                        // descriptionsを更新して再描画
                        descriptions['__status__' + currentDept] = newState;
                        renderTable(records, descriptions, container, publishedMap, deptSettings, commonSettings); // 再描画
                    } catch(e) {
                        await showCustomDialog('更新に失敗しました', 'alert');
                        deptInput.checked = !deptInput.checked;
                        deptInput.disabled = false;
                    }
                };
                
                deptLabel.appendChild(deptInput);
                deptLabel.appendChild(deptSlider);
                cell.appendChild(deptLabel);

            } else if (col.type === 'calendar_icon') {
                const groupRecs = records.filter(r => r['診療科']?.value === currentDept);
                const iconSpan = document.createElement('span');
                iconSpan.textContent = '📅';
                iconSpan.style.cursor = 'pointer';
                iconSpan.style.fontSize = '1.2em';
                iconSpan.title = 'カレンダーを表示';
                iconSpan.onclick = (e) => {
                    e.stopPropagation();
                    showCalendarTooltip(e, groupRecs, true, commonSettings); // ★変更: commonSettingsを渡す
                };
                cell.style.textAlign = 'center';
                cell.appendChild(iconSpan);

            } else if (col.field === '診療科') {
                // 診療科名
                const nameDiv = document.createElement('div');
                // nameDiv.textContent = rec[col.field]?.value || '';
                
                const textSpan = document.createElement('span');
                textSpan.textContent = rec[col.field]?.value || '';
                nameDiv.appendChild(textSpan);

                const searchBtn = document.createElement('button');
                searchBtn.className = 'btn-detail';
                searchBtn.textContent = '詳細';
                searchBtn.title = 'この診療科で絞り込んで編集';
                searchBtn.onclick = (e) => {
                    e.stopPropagation();
                    const query = `診療科 in ("${currentDept}")`;
                    window.location.href = `?view_mode=input&query=${encodeURIComponent(query)}`;
                };
                nameDiv.appendChild(searchBtn);

                cell.appendChild(nameDiv);

                // 診療選択を収集（マージされた全行分を重複なく取得）
                const rowSpan = rec[`_rowspan_診療科`] || 1;
                const selections = new Set();
                for (let i = 0; i < rowSpan; i++) {
                    const targetRec = records[idx + i];
                    if (targetRec && targetRec['診療選択']?.value) {
                        targetRec['診療選択'].value.split('、').forEach(s => {
                            if (s.trim()) selections.add(s.trim());
                        });
                    }
                }

                // 診療選択がある場合、小さい文字で「～ 含む」と表示
                if (selections.size > 0) {
                    const selDiv = document.createElement('div');
                    selDiv.style.fontSize = '10px';
                    selDiv.style.fontWeight = 'normal';
                    selDiv.style.marginTop = '4px';
                    selDiv.style.color = '#666';
                    const sortedSels = Array.from(selections).sort();
                    selDiv.textContent = sortedSels.join('、') + ' を含む';
                    cell.appendChild(selDiv);
                }

                const infoRow = document.createElement('div');
                infoRow.className = 'dept-info-row';
                cell.appendChild(infoRow);
            } else if (col.type === 'term_group') {
                // ★変更: deptSettingsから値を取得
                const deptSetting = deptSettings ? deptSettings[currentDept] : null;
                const isInherited = !deptSetting;
                const setting = isInherited ? commonSettings : deptSetting;
                
                const startVal = setting ? setting.start : null;
                const periodVal = setting ? setting.duration : null;
                
                let text = '';
                if (startVal !== undefined && startVal !== null && startVal !== '' && periodVal !== undefined && periodVal !== null && periodVal !== '') {
                    text = `${startVal}日後から${periodVal}日間`;
                } else {
                    text = '未設定';
                }

                if (isInherited) {
                    cell.innerHTML = `<div style="font-size:12px; color:#333;">${text}</div><div style="font-size:10px; color:#888;">(共通設定)</div>`;
                } else {
                    cell.innerHTML = `<div style="font-size:12px; color:#007bff; font-weight:bold;">${text}</div>`;
                }
                cell.style.cursor = 'pointer';
                cell.title = 'クリックして予約期間を編集';
                cell.onclick = () => showTermEditDialog(currentDept, deptSetting, commonSettings, () => {
                    // 更新後のコールバック: 再描画
                    window.ShinryoApp.Viewer.renderOverview();
                });
            } else if (col.field === '医師名') {
                // cell.textContent = rec[col.field]?.value || '';
                const doctorName = rec[col.field]?.value || '';
                
                const containerDiv = document.createElement('div');
                containerDiv.style.display = 'flex';
                containerDiv.style.alignItems = 'center';
                containerDiv.style.justifyContent = 'center';

                const textSpan = document.createElement('span');
                textSpan.textContent = doctorName;
                containerDiv.appendChild(textSpan);

                const searchBtn = document.createElement('button');
                searchBtn.className = 'btn-detail';
                searchBtn.textContent = '詳細';
                searchBtn.title = 'この医師で絞り込んで編集';
                searchBtn.onclick = (e) => {
                    e.stopPropagation();
                    const query = `診療科 in ("${currentDept}") and 医師名 in ("${doctorName}")`;
                    window.location.href = `?view_mode=input&query=${encodeURIComponent(query)}`;
                };
                containerDiv.appendChild(searchBtn);
                cell.appendChild(containerDiv);

                // 担当パターンをツールチップ表示
                const tblHtml = createScheduleTableHtml(rec, true, commonSettings);
                cell.onmouseenter = (e) => showTooltip(e, tblHtml);
                cell.onmouseleave = hideTooltip;
                cell.style.cursor = 'help';
            } else {
                cell.textContent = rec[col.field]?.value || '';
            }
        });
    });
    container.appendChild(table);

    // 凡例は削除（スケジュール表内に移動したため）
  }

  // ★追加: 予約開始・期間編集ダイアログ
  async function showTermEditDialog(deptName, currentSetting, commonSettings, onSuccess) {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay';
      const box = document.createElement('div');
      box.className = 'custom-modal-box';
      
      const title = document.createElement('h3');
      title.textContent = `予約期間設定: ${deptName}`;
      title.style.marginBottom = '15px';
      box.appendChild(title);

      // 共通設定使用スイッチ
      const switchContainer = document.createElement('div');
      switchContainer.style.marginBottom = '20px';
      switchContainer.style.textAlign = 'left';
      switchContainer.style.padding = '10px';
      switchContainer.style.backgroundColor = '#f9f9f9';
      switchContainer.style.borderRadius = '4px';

      const switchLabel = document.createElement('label');
      switchLabel.style.display = 'flex';
      switchLabel.style.alignItems = 'center';
      switchLabel.style.cursor = 'pointer';
      
      const switchInput = document.createElement('input');
      switchInput.type = 'checkbox';
      switchInput.checked = !currentSetting; // 設定オブジェクトがなければ共通使用
      switchInput.style.marginRight = '8px';
      
      const switchText = document.createElement('span');
      switchText.textContent = '病院共通の設定を使用する';
      switchText.style.fontWeight = 'bold';
      switchText.style.fontSize = '14px';

      switchLabel.appendChild(switchInput);
      switchLabel.appendChild(switchText);
      switchContainer.appendChild(switchLabel);
      
      // 共通設定の内容表示
      const commonInfo = document.createElement('div');
      commonInfo.style.fontSize = '12px';
      commonInfo.style.color = '#666';
      commonInfo.style.marginTop = '5px';
      commonInfo.style.marginLeft = '22px';
      const cStart = commonSettings?.start ?? '未設定';
      const cDur = commonSettings?.duration ?? '未設定';
      commonInfo.textContent = `(現在の共通設定: 開始 ${cStart}日後 / 期間 ${cDur}日間)`;
      switchContainer.appendChild(commonInfo);

      box.appendChild(switchContainer);

      // 入力エリア
      const inputArea = document.createElement('div');
      
      const createInputRow = (label, value, unit, maxVal) => {
          const row = document.createElement('div');
          row.className = 'term-input-row';
          const maxAttr = maxVal ? `max="${maxVal}" oninput="if(this.value > ${maxVal}) this.value = ${maxVal}"` : '';
          row.innerHTML = `<div class="term-input-label">${label}</div><input type="number" class="term-input-field" value="${value || ''}" ${maxAttr}><div>${unit}</div>`;
          return row;
      };

      // 初期値：個別設定があればそれ、なければ共通設定の値を入れる
      const initStart = currentSetting ? currentSetting.start : (commonSettings?.start ?? '');
      const initDuration = currentSetting ? currentSetting.duration : (commonSettings?.duration ?? '');

      const startRow = createInputRow('予約開始', initStart, '日後から');
      const durationRow = createInputRow('予約可能期間', initDuration, '日間', 60);
      
      inputArea.appendChild(startRow);
      inputArea.appendChild(durationRow);
      box.appendChild(inputArea);

      const noteDiv = document.createElement('div');
      noteDiv.style.marginTop = '15px';
      noteDiv.style.fontSize = '11px';
      noteDiv.style.color = '#666';
      noteDiv.style.textAlign = 'left';
      noteDiv.style.lineHeight = '1.4';
      noteDiv.style.backgroundColor = '#f0f0f0';
      noteDiv.style.padding = '8px';
      noteDiv.style.borderRadius = '4px';
      noteDiv.innerHTML = `<strong>予約開始：</strong>本日を0日目として、何日後から予約を受け付けるかを設定（休診日はカウント除外）<br><span style="color:#888; margin-left:1em;">例：本日が金曜日である場合に3を指定すると、日曜日が休診日なので予約開始は火曜日からとなる）</span><br><strong>予約可能期間：</strong>予約開始日から何日先までを予約可能にするかを設定(休診日もカウントする）<br><span style="color:#d9534f; font-weight:bold;">※負荷軽減のため、予約可能期間は最大60日までとしてください。</span>`;
      box.appendChild(noteDiv);

      // スイッチ切り替え時の制御
      const toggleInputs = () => {
          const isCommon = switchInput.checked;
          const inputs = inputArea.querySelectorAll('input');
          inputs.forEach(input => {
              input.disabled = isCommon;
              input.style.backgroundColor = isCommon ? '#eee' : '#fff';
          });
          if (isCommon) {
              startRow.querySelector('input').value = commonSettings?.start ?? '';
              durationRow.querySelector('input').value = commonSettings?.duration ?? '';
          } else if (currentSetting) {
              // 個別設定に戻す場合、元の値があれば復元
              startRow.querySelector('input').value = currentSetting.start ?? '';
              durationRow.querySelector('input').value = currentSetting.duration ?? '';
          }
      };
      switchInput.onchange = toggleInputs;
      toggleInputs(); // 初期状態適用

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';
      btnGroup.style.marginTop = '20px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => document.body.removeChild(overlay);

      const saveBtn = document.createElement('button');
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.onclick = async () => {
          if (!switchInput.checked) {
              const newDuration = durationRow.querySelector('input').value;
              if (parseInt(newDuration, 10) > 60) {
                  await showCustomDialog('予約可能期間は最大60日までです。\nシステム負荷軽減のため、60日以内で設定してください。', 'alert');
                  return;
              }
          }

          document.body.removeChild(overlay);
          try {
              if (switchInput.checked) {
                  // 共通設定を使用 -> null を渡して削除
                  await window.ShinryoApp.ConfigManager.updateDepartmentTerm(deptName, null, null);
              } else {
                  // 個別設定を使用
                  const newStart = startRow.querySelector('input').value;
                  const newDuration = durationRow.querySelector('input').value;
                  await window.ShinryoApp.ConfigManager.updateDepartmentTerm(deptName, newStart, newDuration);
              }
              if (onSuccess) onSuccess();
          } catch(e) {
              await showCustomDialog('保存に失敗しました', 'alert');
          }
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      box.appendChild(btnGroup);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
  }

  let tooltipEl = document.getElementById('customHtmlTooltip');
  if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'customHtmlTooltip';
      document.body.appendChild(tooltipEl);
  }
  let hideTimer;
  let currentCloseHandler = null;

  function adjustTooltipPosition(e) {
      const tooltipRect = tooltipEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      const offset = 15;
      let top = e.pageY + offset;
      let left = e.pageX + offset;
      if (top + tooltipRect.height > scrollTop + viewportHeight) {
          top = e.pageY - tooltipRect.height - offset;
      }
      // 右端からはみ出る場合は左側に表示
      if (left + tooltipRect.width > scrollLeft + viewportWidth) {
          left = e.pageX - tooltipRect.width - offset;
      }
      tooltipEl.style.top = top + 'px';
      tooltipEl.style.left = left + 'px';
  }

  function showTooltip(e, htmlContent) {
      clearTimeout(hideTimer);
      tooltipEl.innerHTML = htmlContent;
      tooltipEl.style.display = 'block';
      adjustTooltipPosition(e);
  }

  function showCalendarTooltip(e, records, isPersistent = false, commonSettings = null) {
      clearTimeout(hideTimer);
      
      if (currentCloseHandler) {
          document.removeEventListener('click', currentCloseHandler);
          currentCloseHandler = null;
      }

      const today = new Date();
      updateCalendarTooltip(today.getFullYear(), today.getMonth(), records, commonSettings);
      tooltipEl.style.display = 'block';
      tooltipEl.style.left = (e.pageX + 15) + 'px';
      tooltipEl.style.top = (e.pageY + 15) + 'px';
      tooltipEl.style.pointerEvents = 'auto';
      adjustTooltipPosition(e);
      
      if (isPersistent) {
          tooltipEl.onmouseenter = null;
          tooltipEl.onmouseleave = null;
          currentCloseHandler = (ev) => {
              if (!tooltipEl.contains(ev.target)) {
                  tooltipEl.style.display = 'none';
                  document.removeEventListener('click', currentCloseHandler);
                  currentCloseHandler = null;
              }
          };
          setTimeout(() => document.addEventListener('click', currentCloseHandler), 0);
      } else {
          tooltipEl.onmouseenter = () => clearTimeout(hideTimer);
          tooltipEl.onmouseleave = hideTooltip;
      }
  }
  
  function updateCalendarTooltip(year, month, records, commonSettings) {
      tooltipEl.innerHTML = createCalendarHtml(new Date(year, month, 1), records, commonSettings);
      const prev = tooltipEl.querySelector('.prev-month');
      const next = tooltipEl.querySelector('.next-month');
      if(prev) prev.onclick = (e) => {
          e.stopPropagation();
          updateCalendarTooltip(month===0?year-1:year, month===0?11:month-1, records, commonSettings);
      };
      if(next) next.onclick = (e) => {
          e.stopPropagation();
          updateCalendarTooltip(month===11?year+1:year, month===11?0:month+1, records, commonSettings);
      };
  }

  function hideTooltip() {
      hideTimer = setTimeout(() => { tooltipEl.style.display = 'none'; }, 200);
  }

  console.log('ShinryoViewer.js: Loaded successfully.');
})();