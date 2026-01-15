/*
 * ShinryoViewer_UI.js (v1)
 * 診療シフト管理アプリ(ID:156)用 - UIコンポーネント・スタイル担当
 */
window.ShinryoApp = window.ShinryoApp || {};
window.ShinryoApp.Viewer = window.ShinryoApp.Viewer || {};

(function(Viewer) {
  'use strict';

  // --- 外部公開メソッド ---
  Viewer.applyStyles = applyStyles;
  Viewer.showCustomDialog = showCustomDialog;
  Viewer.showContentDialog = showContentDialog;
  Viewer.showTermEditDialog = showTermEditDialog;
  Viewer.showCalendarTooltip = showCalendarTooltip;
  Viewer.showTooltip = showTooltip;
  Viewer.hideTooltip = hideTooltip;
  Viewer.createScheduleTableHtml = createScheduleTableHtml;

  // --- 内部変数 ---
  let tooltipEl = document.getElementById('customHtmlTooltip');
  if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'customHtmlTooltip';
      document.body.appendChild(tooltipEl);
  }
  let hideTimer;
  let currentCloseHandler = null;

  // --- CSS適用 ---
  function applyStyles() {
    const styleId = 'overview-mode-style';
    if (document.getElementById(styleId)) return;

    const css = `
      body.view-mode-overview .recordlist-header-gaia,
      body.view-mode-overview .recordlist-gaia,
      body.view-mode-overview .gaia-argoui-app-index-pager,
      body.view-mode-overview .gaia-argoui-app-viewtoggle,
      body.view-mode-overview .gaia-argoui-app-filterbutton,
      body.view-mode-overview .gaia-argoui-app-subtotalbutton,
      body.view-mode-overview .gaia-argoui-app-menu-add,
      body.view-mode-overview .gaia-argoui-app-menu-settingssplitbutton,
      body.view-mode-overview .gaia-argoui-optionmenubutton,
      body.view-mode-overview .gaia-argoui-app-menu-pin { display: none !important; }
      body.view-mode-overview .gaia-argoui-app-toolbar { padding: 4px 0px !important; position: relative !important; height: auto !important; min-height: 38px !important; }
      .overview-title-container { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); white-space: nowrap; pointer-events: none; z-index: 0; display: flex; align-items: center; justify-content: center; gap: 20px; }
      .overview-title-text { font-size: 30px; font-weight: bold; color: #333; line-height: 1; }
      .overview-last-update { font-size: 11px; color: #666; margin-top: 5px; font-weight: normal; line-height: 1.2; }
      .overview-text-wrapper { display: flex; flex-direction: column; align-items: center; }
      .btn-update-available { pointer-events: auto; background-color: #e74c3c; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); animation: pulse-animation 2s infinite; }
      @keyframes pulse-animation { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
      .mode-switch-btn { display: inline-flex; align-items: center; justify-content: center; background-color: #3498db; color: #fff; border: none; border-radius: 4px; padding: 0 20px; height: 35px; line-height: 35px; font-weight: bold; cursor: pointer; font-size: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); transition: background-color 0.2s; vertical-align: top; box-sizing: border-box; margin-left: 30px; margin-top: 10px; position: relative; z-index: 1; }
      .mode-switch-btn:hover { background-color: #2980b9; }
      #overview-container { padding: 0 20px 20px; background-color: #fff; font-family: "Meiryo", sans-serif; }
      .shinryo-config-table { width: 100%; border-collapse: collapse; border: 2px solid #555; table-layout: fixed; }
      .shinryo-config-table th, .shinryo-config-table td { border: 1px solid #ddd; padding: 6px; font-size: 12px; vertical-align: middle; text-align: center; }
      .shinryo-config-table th { background-color: #e9e9e9; color: #333; font-weight: bold; font-size: 13px; height: 30px; }
      .shinryo-config-table tr.department-group-start > td { border-top: 2px solid #555; }
      .shinryo-config-table td.bunya-cell, .shinryo-config-table th.bunya-cell { border-right: 2px solid #555; }
      .shinryo-config-table td.large-font-cell { font-size: 1.3em; font-weight: bold; }
      .gray-out-cell { background-color: #888888 !important; color: #fff !important; }
      .cell-changed { animation: blink-animation 1.5s infinite; }
      @keyframes blink-animation { 50% { background-color: #ff8a80; } }
      .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; vertical-align: middle; margin: 0 4px; }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #2196F3; transition: .4s; border-radius: 22px; }
      .toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
      input:checked + .toggle-slider { background-color: #ccc; }
      input:checked + .toggle-slider:before { transform: translateX(18px); }
      .toggle-switch.large { width: 50px; height: 26px; }
      .toggle-switch.large .toggle-slider:before { height: 20px; width: 20px; left: 3px; bottom: 3px; }
      .toggle-switch.large input:checked + .toggle-slider:before { transform: translateX(24px); }
      #customHtmlTooltip { display: none; position: absolute; background-color: #fff; border: 1px solid #ccc; box-shadow: 2px 2px 8px rgba(0,0,0,0.3); padding: 10px; z-index: 10000; max-width: 700px; border-radius: 4px; color: #333; text-align: left; }
      .calendar-container { padding: 0 5px; font-size: 12px; min-width: 600px; }
      .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
      .calendar-nav { cursor: pointer; padding: 4px 12px; border-radius: 4px; user-select: none; color: #999; font-size: 16px; }
      .calendar-nav:hover { background-color: #eee; color: #333; }
      .calendar-table { width: 100%; border-collapse: collapse; table-layout: fixed; background-color: #fff; }
      .calendar-table th, .calendar-table td { border: 1px solid #ccc; text-align: center; vertical-align: top; }
      .calendar-table td.holiday-cell { background-color: #ffe4e1 !important; }
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
      .custom-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center; }
      .custom-modal-box { background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); min-width: 350px; max-width: 500px; text-align: center; }
      .custom-modal-msg { margin-bottom: 25px; font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #333; }
      .custom-modal-btn-group { display: flex; justify-content: center; gap: 15px; }
      .custom-modal-btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; min-width: 80px; }
      .custom-modal-btn-ok { background: #3498db; color: #fff; }
      .custom-modal-btn-cancel { background: #95a5a6; color: #fff; }
      .doctor-name-cell { font-size: 1.5em; font-weight: bold; }
      .term-input-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px; }
      .term-input-label { width: 100px; text-align: right; font-weight: bold; }
      .term-input-field { width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: right; }
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

  // 汎用コンテンツ表示ダイアログ
  function showContentDialog(titleText, htmlContent) {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay';
      
      const box = document.createElement('div');
      box.className = 'custom-modal-box';
      box.style.maxWidth = '800px';
      box.style.width = '90%';
      box.style.cursor = 'default';
      
      const title = document.createElement('h3');
      title.textContent = titleText;
      title.style.marginTop = '0';
      title.style.marginBottom = '15px';
      title.style.borderBottom = '1px solid #eee';
      title.style.paddingBottom = '10px';
      title.style.textAlign = 'left';
      
      const content = document.createElement('div');
      content.innerHTML = htmlContent;
      content.style.textAlign = 'left';
      content.style.maxHeight = '70vh';
      content.style.overflowY = 'auto';
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      closeBtn.textContent = '閉じる';
      closeBtn.style.marginTop = '20px';
      closeBtn.onclick = () => document.body.removeChild(overlay);
      
      box.appendChild(title);
      box.appendChild(content);
      box.appendChild(closeBtn);
      overlay.appendChild(box);
      
      overlay.onclick = (e) => {
          if (e.target === overlay) document.body.removeChild(overlay);
      };
      
      document.body.appendChild(overlay);
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

  function getHolidayName(dateObj, customHolidays) {
    const y = dateObj.getFullYear(), m = dateObj.getMonth() + 1, d = dateObj.getDate();
    const key = `${y}-${m}-${d}`;
    const keyPad = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    if (customHolidays && customHolidays.includes(keyPad)) {
        return '休診日';
    }

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
                    if (vals.includes('午前') && !scheduleByDate[key].am.includes(name)) scheduleByDate[key].am.push(name);
                    if (vals.includes('午後') && !scheduleByDate[key].pm.includes(name)) scheduleByDate[key].pm.push(name);
                    const fName = rec['施設名']?.value || '';
                    if (fName.includes('総合病院') || fName.includes('クリニック')) existsFacility = true;
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
              
              let icons = '';
              if (isMerged && rec._scheduleInfo && rec._scheduleInfo[field]) {
                  const info = rec._scheduleInfo[field];
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
      
      const legendParts = [];
      const defaultColors = ['#007bff', '#28a745', '#e67e22', '#9b59b6', '#e74c3c'];
      facilities.forEach((fac, i) => {
          const color = fac.color || defaultColors[i % defaultColors.length];
          legendParts.push(`<span style="color:${color};font-weight:bold;">${fac.shortName}</span> ${fac.name}`);
      });
      html += `<div style="margin-top:8px; font-size:11px; text-align:left; color:#555;">凡例: ${legendParts.join(' / ')} / <span class="icon-note">!</span> 医師別案内 (マウスオーバーで表示)</div>`;

      if (rec._debug_infos && rec._debug_infos.length > 0) {
          html += `<div style="margin-top:10px; border-top:1px dashed #ccc; padding-top:5px; text-align:left;">
            <div style="font-size:11px; font-weight:bold; color:#333; margin-bottom:3px;">▼ 予約開始日診断 (レコード別)</div>`;
          
          rec._debug_infos.forEach((info, idx) => {
              const isFuture = info.calculated_start_days > 0;
              const color = isFuture ? '#007bff' : '#e74c3c';
              html += `<div style="font-size:11px; color:${color}; font-family:monospace; margin-bottom:2px;">
                [Rec#${idx+1}] 開始:${info.calculated_start_days}日後 (着任:${info.arrival_date || '未設定'})
              </div>`;
          });
          html += `</div>`;
      } else if (rec._debug_info) {
          html += `<div style="margin-top:5px; font-size:10px; color:#888; border-top:1px solid #eee; padding-top:2px; font-family:monospace;">
            [Debug] Start:${rec._debug_info.calculated_start_days}days, Arrival:${rec._debug_info.arrival_date || '-'}
          </div>`;
      }
      
      return html;
  }

  async function showTermEditDialog(deptName, currentSetting, commonSettings, onSuccess) {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay';
      const box = document.createElement('div');
      box.className = 'custom-modal-box';
      const title = document.createElement('h3');
      title.textContent = `予約期間設定: ${deptName}`;
      box.appendChild(title);

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
      switchInput.checked = !currentSetting; 
      switchInput.style.marginRight = '8px';
      
      const switchText = document.createElement('span');
      switchText.textContent = '病院共通の設定を使用する';
      switchText.style.fontWeight = 'bold';
      switchText.style.fontSize = '14px';

      switchLabel.appendChild(switchInput);
      switchLabel.appendChild(switchText);
      switchContainer.appendChild(switchLabel);
      
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

      const inputArea = document.createElement('div');
      
      const createInputRow = (label, value, unit, maxVal) => {
          const row = document.createElement('div');
          row.className = 'term-input-row';
          const maxAttr = maxVal ? `max="${maxVal}" oninput="if(this.value > ${maxVal}) this.value = ${maxVal}"` : '';
          const maxAttr = maxVal ? `max="${maxVal}" oninput="if(parseInt(this.value, 10) > ${maxVal}) this.value = ${maxVal}"` : '';
          row.innerHTML = `<div class="term-input-label">${label}</div><input type="number" class="term-input-field" value="${value || ''}" ${maxAttr}><div>${unit}</div>`;
          return row;
      };

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
              startRow.querySelector('input').value = currentSetting.start ?? '';
              durationRow.querySelector('input').value = currentSetting.duration ?? '';
          }
      };
      switchInput.onchange = toggleInputs;
      toggleInputs(); 

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
                  await window.ShinryoApp.ConfigManager.updateDepartmentTerm(deptName, null, null);
              } else {
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

  function adjustTooltipPosition(e) {
      const tooltipRect = tooltipEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const offset = 15;
      let top = e.pageY + offset;
      let left = e.pageX + offset;
      if (top + tooltipRect.height > scrollTop + viewportHeight) {
          top = e.pageY - tooltipRect.height - offset;
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

  function showCalendarTooltip(e, records, isPersistent = false) {
      clearTimeout(hideTimer);
      if (currentCloseHandler) { document.removeEventListener('click', currentCloseHandler); currentCloseHandler = null; }
      
      // UI版ではcommonSettingsを直接参照できないため、ConfigManagerから取得を試みる
      const commonSettings = window.ShinryoApp.ConfigManager ? window.ShinryoApp.ConfigManager.getCommonSettings() : null;

      updateCalendarTooltip(new Date().getFullYear(), new Date().getMonth(), records, commonSettings);
      tooltipEl.style.display = 'block';
      tooltipEl.style.left = (e.pageX + 15) + 'px';
      tooltipEl.style.top = (e.pageY + 15) + 'px';
      tooltipEl.style.pointerEvents = 'auto';
      adjustTooltipPosition(e);
      if (isPersistent) {
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
      if(prev) prev.onclick = (e) => { e.stopPropagation(); updateCalendarTooltip(month===0?year-1:year, month===0?11:month-1, records, commonSettings); };
      if(next) next.onclick = (e) => { e.stopPropagation(); updateCalendarTooltip(month===11?year+1:year, month===11?0:month+1, records, commonSettings); };
  }

  function hideTooltip() {
      hideTimer = setTimeout(() => { tooltipEl.style.display = 'none'; }, 200);
  }

  console.log('ShinryoViewer_UI.js: Loaded successfully.');
})(window.ShinryoApp.Viewer);