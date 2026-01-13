﻿(function() {
  'use strict';

  // --- ★★★【要設定】★★★ ---
  // 1. 連携先アプリのデータを保持するフィールド（既存）
  const TARGET_MULTILINE_FIELD_CODE_A = '診療科別設定コード';
  // 2. 診療科別補足情報(HTML)をJSONで保存するフィールド（新規）
  const DESCRIPTION_FIELD_CODE = 'shinryoka_descriptions';
  // 3. 編集用パレットとして使う「リッチエディター」フィールド（新規）
  const RICH_TEXT_PALETTE_CODE = 'ラベル編集';

  // 連携先のアプリIDや、ボタンを置くスペースフィールドのコード
  const APP_B_ID = 156;
  const SPACE_FIELD_CODE = 'UpdateEachShinryoukaSetting';
  const CUSTOMIZE_APP_URL = 'https://w60013hke2ct.cybozu.com/k/guest/11/156/';
  // --- 設定はここまで ---

  let descriptionsData = {};
  let previousKey = null;

  const CUSTOM_TOOLTIP_ID = 'customHtmlTooltip';
  let hideTooltipTimeout;

  // --- ★対応: CSSを修正 ---
  const css = `
    .config-section { margin-bottom: 25px; }
    .config-section h2 { margin: 0 0 10px 0; font-size: 16px; font-weight: bold; padding-bottom: 5px; border-bottom: 2px solid #3498db; }
    .editor-title { margin: 0 0 15px 0; font-size: 16px; font-weight: bold; padding-bottom: 5px; border-bottom: 2px solid #3498db; }
    #shinryoConfigContainer { padding: 0 17px; }
    #shinryoConfigHeader { display: flex; justify-content: space-between; align-items: center; }
    #customizeButton, #getAppBDataButton { background-color: #3498db !important; color: white !important; border: none !important; border-radius: 4px; padding: 6px 12px; font-size: 14px; cursor: pointer; }
    #getAppBDataButton { background-color: #cd5c5c !important; }
    #getAppBDataButton:disabled { background-color: #cccccc !important; cursor: not-allowed !important; }
    .editor-control-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; width: 100%; gap: 10px; }
    .editor-selector-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    #shinryoka-selector, #main-selector, #sentaku-selector { font-size: 14px; padding: 5px; border-radius: 4px; border: 1px solid #ccc; }
    #readonly-html-viewer { border: 1px solid #e3e3e3; padding: 16px; min-height: 200px; background-color: #f7f7f7; word-wrap: break-word; }
    #readonly-html-viewer > *:first-child { margin-top: 0; }
    #readonly-html-viewer > *:last-child { margin-bottom: 0; }
    .shinryo-config-table { width: 100%; border-collapse: collapse; border: 2px solid #555; table-layout: fixed; }
    .shinryo-config-table th, .shinryo-config-table td { border: 1px solid #ddd; padding: 8px; font-size: 12px; vertical-align: middle; text-align: center; }
    .shinryo-config-table th { background-color: #e9e9e9; color: #333; font-weight: bold; font-size: 13px; }
    .shinryo-config-table tr.department-group-start > td { border-top: 2px solid #555; }
    .shinryo-config-table td.bunya-cell, .shinryo-config-table th.bunya-cell { border-right: 2px solid #555; }
    .shinryo-config-table td.update-btn-cell, .shinryo-config-table th.update-btn-cell { border-right: 2px solid #555; }
    .shinryo-config-table td .readonly-description { border: 1px solid #f0f0f0; padding: 5px 10px; min-height: 60px; background-color: #fafafa; }
    .shinryo-config-table td .readonly-description > *:first-child { margin-top: 0; }
    .shinryo-config-table td .readonly-description > *:last-child { margin-bottom: 0; }
    .shinryo-config-table td.cell-changed { animation: blink-animation 1.5s infinite; }
    .shinryo-config-table tr.row-off-background > td { background-color: #888888 !important; }
    .shinryo-config-table td .diff-tooltip-target { border-bottom: 1px dotted #666; cursor: help; }
    .shinryo-config-table td.large-font-cell { font-size: 1.3em; font-weight: bold; }
    .update-button { display: inline-block; padding: 4px 6px; font-size: 11px; font-weight: bold; border: 1px solid transparent; border-radius: 4px; text-align: center; min-width: 40px; box-sizing: border-box; cursor: default; }
    .update-button.needs-update { background-color: #ffebee; color: #d32f2f; border-color: #ffcdd2; }
    .update-button.up-to-date { background-color: transparent; color: #aaa; border-color: transparent; cursor: default; }
    #customHtmlTooltip { display: none; position: absolute; background-color: #fff; border: 1px solid #ccc; box-shadow: 2px 2px 5px rgba(0,0,0,0.2); padding: 10px; z-index: 1051; max-width: 600px; pointer-events: none; border-radius: 4px; white-space: pre-wrap; word-break: break-all; }
    .schedule-title { text-align: center; margin-bottom: 10px; font-size: 16px; font-weight: bold; }
    .schedule-title span + span { margin-left: 1em; }
    .schedule-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .schedule-table th, .schedule-table td { border: 1px solid #bbb; padding: 5px; text-align: center; min-width: 50px; }
    .schedule-table th { background-color: #e0e0e0; }
    .schedule-table td.cell-blinking { animation: blink-animation 1.5s infinite; }
    .schedule-table td.schedule-am { background-color: #e0f7fa; }
    .schedule-table td.schedule-pm { background-color: #e8f5e9; }
    .schedule-table td.schedule-allday { background-color: #fff3e0; }
    @keyframes blink-animation { 50% { background-color: #ff8a80; } }
    
    .calendar-container { padding: 0 10px 5px 10px; font-size: 12px; min-width: 550px; pointer-events: auto; }
    .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1px; }
    .calendar-header h3 { margin: 0; font-size: 18px; padding: 2px 0; font-weight: bold; }
    .calendar-header h3 span { font-size: 16px; font-weight: bold; }
    .calendar-nav { cursor: pointer; padding: 2px 8px; border-radius: 4px; user-select: none; }
    .calendar-nav:hover { background-color: #f0f0f0; }
    .calendar-nav.disabled { color: #ccc; cursor: not-allowed; pointer-events: none; }
    .calendar-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .calendar-table th { background-color: #f7f7f7; font-size: 11px; padding: 2px 0; height: auto; border: 1px solid #ccc; }
    .calendar-table td { border: 1px solid #ccc; text-align: center; vertical-align: top; height: 48px; padding: 0; overflow: hidden; }
    .calendar-table tr.week-no-schedule td { height: 22px; vertical-align: middle; }
    .calendar-table tr.week-no-schedule .schedule-content { display: none; }
    .calendar-table td.past-date { background-color: #f5f5f5; color: #ccc; }
    .calendar-table td.past-date .schedule-content { display: none; }
    .calendar-table td.today { background-color: transparent !important; }
    .calendar-table td.today .date-num { background-color: #007bff; color: white; }
    .calendar-table td.holiday { background-color: #ffe4e1; }
    .calendar-table .date-num { float: left; width: 20px; height: 20px; line-height: 20px; text-align: center; margin: 1px; font-size: 12px; border-radius: 50%; }
    .calendar-table td.is-target-month .date-num { font-weight: bold; font-size: 13px; }
    .calendar-table .schedule-content { margin-left: 22px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; word-break: break-all; height: 100%; }
    .calendar-table .am-slot, .calendar-table .pm-slot { padding: 0; min-height: 22px; display: flex; align-items: center; justify-content: center; width: 100%; }
    .calendar-table .am-slot { background-color: #e0f7fa; }
    .calendar-table .pm-slot { background-color: #fff9e6; }
    .calendar-table .am-slot span, .calendar-table .pm-slot span { line-height: 1.1; }
    .facility-icon { font-weight: bold; font-size: 0.9em; margin-left: 1px; }
    .facility-g { color: green; }
    .facility-c { color: blue; }
    .holiday-name-display { color: #d9534f; font-weight: bold; font-size: 12px; }
    .help-tooltip-v2 {
      position: absolute;
      background-color: #2c3e50;
      color: #ecf0f1;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      z-index: 10001;
      pointer-events: none;
      max-width: 300px;
      line-height: 1.5;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .header-help-icon {
      margin-left: 4px;
      color: #3498db;
      font-size: 12px;
      cursor: help;
      display: inline-block;
    }
    .custom-icon {
      display: inline-block;
      width: 24px;
      height: 24px;
      vertical-align: middle;
      background-repeat: no-repeat;
      background-size: contain;
      cursor: help;
    }
    .icon-info {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f39c12'%3e%3cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'/%3e%3c/svg%3e");
    }
    .icon-calendar {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232ecc71'%3e%3cpath d='M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z'/%3e%3c/svg%3e");
    }
    .icon-schedule {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233498db'%3e%3cpath d='M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'/%3e%3c/svg%3e");
    }
    .calendar-notes { margin-top: 5px; padding-top: 5px; border-top: 1px solid #eee; font-size: 12px; text-align: left; }
    .align-top { vertical-align: top !important; }
    .dept-info-row { margin-top: 4px; display: flex; justify-content: center; gap: 8px; align-items: center; flex-wrap: wrap; }
  `;
  const styleId = 'shinryo-config-v3-style';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.type = 'text/css';
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }

  // --- ヘルプツールチップ表示用関数 ---
  const showHelp = (e, text) => {
    const existing = document.getElementById('config-help-tip');
    if (existing) existing.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'help-tooltip-v2';
    tooltip.id = 'config-help-tip';
    tooltip.innerHTML = text;
    document.body.appendChild(tooltip);
    const updatePos = (ev) => {
      tooltip.style.left = (ev.pageX + 15) + 'px';
      tooltip.style.top = (ev.pageY + 15) + 'px';
    };
    updatePos(e);
    const target = e.currentTarget;
    target.addEventListener('mousemove', updatePos);
    target.addEventListener('mouseleave', () => {
      target.removeEventListener('mousemove', updatePos);
      const tip = document.getElementById('config-help-tip');
      if (tip) tip.remove();
    }, { once: true });
  };

  function saveCurrentEditorContent(recordObject) { if (previousKey && recordObject) { descriptionsData[previousKey] = recordObject[RICH_TEXT_PALETTE_CODE].value; } }
  function findFieldElementByLabelText(labelText) { const labels = document.querySelectorAll('.control-label-text-gaia'); for (let i = 0; i < labels.length; i++) { if (labels[i].textContent === labelText) { let currentElement = labels[i]; while (currentElement.parentElement) { currentElement = currentElement.parentElement; if (currentElement.classList.contains('control-gaia')) { return currentElement; } } } } return null; }
  async function fetchAndStringifySortedAppBData(appId) { try { const fetchAllRecords = async (targetAppId) => { let allRecords = []; let offset = 0; const limit = 500; while (true) { const params = { app: targetAppId, query: `limit ${limit} offset ${offset}` }; const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', params); allRecords = allRecords.concat(resp.records); offset += resp.records.length; if (resp.records.length < limit) break; } return allRecords; }; const records = await fetchAllRecords(appId); return JSON.stringify(records); } catch (error) { console.error('連携アプリのデータ取得中にエラーが発生しました:', error); throw error; } }
  function formatDateTime(isoString) { if (!isoString) return ''; try { const date = new Date(isoString); if (isNaN(date.getTime())) return isoString; const pad = (num) => String(num).padStart(2, '0'); return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`; } catch (e) { return isoString; } }
  function stripHtml(html) { if (!html) return ''; const tempDiv = document.createElement('div'); tempDiv.innerHTML = html; return tempDiv.textContent || tempDiv.innerText || ''; }
  function createTableFromText(htmlString) { const plainText = stripHtml(htmlString); const lines = plainText.split('\n').map(line => line.trim()).filter(line => line.includes(':')); if (lines.length === 0) return htmlString; let tableHtml = '<table style="border-collapse: collapse; width: 100%; border: 1px solid #ccc;"><tbody>'; lines.forEach(line => { const parts = line.split(/:(.*)/s); tableHtml += `<tr><td style="border: 1px solid #ccc; padding: 8px; background-color: #f7f9fb; font-weight: bold; vertical-align: top; text-align: left;">${parts[0] || ''}</td><td style="border: 1px solid #ccc; padding: 8px; text-align: left;">${parts[1] || ''}</td></tr>`; }); return tableHtml + '</tbody></table>'; }
  function createScheduleTableHtml(currentRecord, latestRecord) { const weeks = ['第1週', '第2週', '第3週', '第4週', '第5週']; const days = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']; const dayKeyMap = { '月曜': '月', '火曜': '火', '水曜': '水', '木曜': '木', '金曜': '金', '土曜': '土' }; const weekKeyMap = { '第1週': '1', '第2週': '2', '第3週': '3', '第4週': '4', '第5週': '5' }; const facilityName = currentRecord['施設名']?.value || ''; const departmentName = currentRecord['診療科']?.value || ''; const shinryoSentaku = currentRecord['診療選択']?.value || ''; const doctorName = currentRecord['医師名']?.value || '〇'; let tableHtml = `<div class="schedule-title"><span>${facilityName}</span><span>${departmentName}</span>`; const extraInfo = [shinryoSentaku, doctorName].filter(Boolean); if (extraInfo.length > 0) tableHtml += `<span>${extraInfo.join(' ')}</span>`; tableHtml += '</div><table class="schedule-table"><thead><tr><th></th>'; days.forEach(day => { tableHtml += `<th>${day}</th>`; }); tableHtml += '</tr></thead><tbody>'; weeks.forEach(week => { tableHtml += `<tr><th>${week}</th>`; days.forEach(day => { const fieldCode = `${dayKeyMap[day]}${weekKeyMap[week]}`; const currentField = currentRecord[fieldCode]; let valueText = '', cellClass = ''; if (latestRecord && JSON.stringify(currentField?.value) !== JSON.stringify(latestRecord[fieldCode]?.value)) { cellClass += ' cell-blinking'; } if (currentField && Array.isArray(currentField.value)) { const hasAm = currentField.value.includes('午前'), hasPm = currentField.value.includes('午後'); if (hasAm && hasPm) { valueText = '終日'; cellClass += ' schedule-allday'; } else if (hasAm) { valueText = '午前'; cellClass += ' schedule-am'; } else if (hasPm) { valueText = '午後'; cellClass += ' schedule-pm'; } } tableHtml += `<td class="${cellClass.trim()}">${valueText}</td>`; }); tableHtml += '</tr>'; }); return tableHtml + '</tbody></table>'; }
  function isScheduleChanged(currentRecord, latestRecord) { if (!latestRecord) return false; const weeks = ['1', '2', '3', '4', '5'], days = ['月', '火', '水', '木', '金', '土']; for (const week of weeks) { for (const day of days) { const fieldCode = `${day}${week}`; if (JSON.stringify(currentRecord[fieldCode]?.value) !== JSON.stringify(latestRecord[fieldCode]?.value)) return true; } } return false; }
  function isRecordChanged(currentRecord, latestRecord) { if (!latestRecord) return true; const fieldsToCheck = ['予約受付', '掲載', '診療選択', '医師名', '施設名', '留意案内', '予約開始', '予約可能期間']; for (const field of fieldsToCheck) { if (JSON.stringify(currentRecord[field]?.value) !== JSON.stringify(latestRecord[field]?.value)) { return true; } } if (isScheduleChanged(currentRecord, latestRecord)) { return true; } return false; }
  
  // ★対応: 祝日計算ロジックを修正
  function getJapaneseHolidays(year) {
    const holidays = new Map();
    const addHoliday = (date, name) => {
        const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        holidays.set(key, name);
    };
    const getNthWeekdayOfMonth = (year, month, dayOfWeek, n) => {
        const firstDay = new Date(year, month, 1);
        const firstDayOfWeek = firstDay.getDay();
        const dateOfFirstTargetDay = 1 + (dayOfWeek - firstDayOfWeek + 7) % 7;
        return new Date(year, month, dateOfFirstTargetDay + (n - 1) * 7);
    };

    addHoliday(new Date(year, 0, 1), '元日');
    if (year >= 2000) addHoliday(getNthWeekdayOfMonth(year, 0, 1, 2), '成人の日');
    else if (year >= 1949) addHoliday(new Date(year, 0, 15), '成人の日');
    if (year >= 1967) addHoliday(new Date(year, 1, 11), '建国記念の日');
    if (year >= 2020) addHoliday(new Date(year, 1, 23), '天皇誕生日');
    const getVernalEquinoxDay = y => new Date(y, 2, Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))); addHoliday(getVernalEquinoxDay(year), '春分の日');
    if (year >= 2007) addHoliday(new Date(year, 3, 29), '昭和の日');
    addHoliday(new Date(year, 4, 3), '憲法記念日');
    if (year >= 1986) addHoliday(new Date(year, 4, 4), 'みどりの日');
    addHoliday(new Date(year, 4, 5), 'こどもの日');
    if (year >= 2022) addHoliday(getNthWeekdayOfMonth(year, 6, 1, 3), '海の日'); // 2022年以降
    else if (year >= 2003) addHoliday(getNthWeekdayOfMonth(year, 6, 1, 3), '海の日'); // NOTE: 2020, 2021年は特例
    else if (year >= 1996) addHoliday(new Date(year, 6, 20), '海の日');
    if (year >= 2016) addHoliday(new Date(year, 7, 11), '山の日');
    if (year >= 2003) addHoliday(getNthWeekdayOfMonth(year, 8, 1, 3), '敬老の日');
    else if (year >= 1966) addHoliday(new Date(year, 8, 15), '敬老の日');
    const getAutumnalEquinoxDay = y => new Date(y, 8, Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))); addHoliday(getAutumnalEquinoxDay(year), '秋分の日');
    if (year >= 2022) addHoliday(getNthWeekdayOfMonth(year, 9, 1, 2), 'スポーツの日'); // NOTE: 2020, 2021年は特例
    else if (year >= 2000) addHoliday(getNthWeekdayOfMonth(year, 9, 1, 2), 'スポーツの日');
    else if (year >= 1966) addHoliday(new Date(year, 9, 10), '体育の日');
    if (year >= 1948) addHoliday(new Date(year, 10, 3), '文化の日');
    if (year >= 1948) addHoliday(new Date(year, 10, 23), '勤労感謝の日');
    const holidayKeys = Array.from(holidays.keys());
    holidayKeys.forEach(key => {
        const [y, m, d] = key.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        if (date.getDay() === 0) {
            let transferDate = new Date(date);
            transferDate.setDate(transferDate.getDate() + 1);
            while (holidays.has(`${transferDate.getFullYear()}-${transferDate.getMonth() + 1}-${transferDate.getDate()}`)) {
                transferDate.setDate(transferDate.getDate() + 1);
            }
            addHoliday(transferDate, '振替休日');
        }
    });
    return holidays;
  }
  
  function getFacilityInfo(fullName) {
    if (!fullName) return null;
    if (fullName.includes('総合病院')) return { char: 'Ⓖ', className: 'facility-g' };
    if (fullName.includes('クリニック')) return { char: 'Ⓒ', className: 'facility-c' };
    return null;
  }

  function createAdvancedCalendarHtml(targetDate, scheduleRecords) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const departmentName = scheduleRecords[0]?.['診療科']?.value || '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidays = getJapaneseHolidays(year);
    const scheduleByDate = {};
    const specializationMap = new Map();
    let specializationCounter = 1;

    const firstDayInGrid = new Date(year, month, 1);
    firstDayInGrid.setDate(firstDayInGrid.getDate() - (firstDayInGrid.getDay() + 6) % 7);

    for (let i = 0; i < 42; i++) {
        const d = new Date(firstDayInGrid);
        d.setDate(d.getDate() + i);
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0) continue;
        
        const dayChar = ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek];
        const weekNum = Math.floor((d.getDate() - 1) / 7) + 1;
        const fieldCode = `${dayChar}${weekNum}`;
        
        scheduleRecords.forEach(rec => {
            const scheduleValues = rec[fieldCode]?.value || [];
            if (scheduleValues.length > 0) {
                const doctorNameValue = rec['医師名']?.value;
                const facilityInfo = getFacilityInfo(rec['施設名']?.value);
                const facilityHtml = facilityInfo ? `<span class="facility-icon ${facilityInfo.className}">${facilityInfo.char}</span>` : '';
                const shinryoSentaku = rec['診療選択']?.value || '';
                let displayName = '';

                if (doctorNameValue) {
                    let numberSuffix = '';
                    if (shinryoSentaku && shinryoSentaku.indexOf('（全般）') === -1) {
                        if (!specializationMap.has(shinryoSentaku)) {
                            specializationMap.set(shinryoSentaku, specializationCounter++);
                        }
                        numberSuffix = '#' + specializationMap.get(shinryoSentaku);
                    }
                    displayName = doctorNameValue + facilityHtml + numberSuffix;
                } else {
                    displayName = '〇' + facilityHtml;
                }
                
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                if (!scheduleByDate[key]) scheduleByDate[key] = { am: [], pm: [] };
                if (scheduleValues.includes('午前') && !scheduleByDate[key].am.includes(displayName)) {
                    scheduleByDate[key].am.push(displayName);
                }
                if (scheduleValues.includes('午後') && !scheduleByDate[key].pm.includes(displayName)) {
                    scheduleByDate[key].pm.push(displayName);
                }
            }
        });
    }

    const todayYearMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const targetYearMonth = new Date(year, month, 1);
    const disablePrevButton = targetYearMonth.getTime() <= todayYearMonth.getTime();
    
    let html = `<div class="calendar-container" data-year="${year}" data-month="${month + 1}"><div class="calendar-header"><div class="calendar-nav ${disablePrevButton ? 'disabled' : ''}" id="calendar-prev-month" title="先月へ">◀</div><h3>${year}年 ${month + 1}月 <span>(${departmentName})</span></h3><div class="calendar-nav" id="calendar-next-month" title="翌月へ">▶</div></div><table class="calendar-table"><thead><tr><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th><th style="color:#007bff;">土</th></tr></thead><tbody>`;
    const startDate = new Date(year, month, 1);
    startDate.setDate(startDate.getDate() - (startDate.getDay() + 6) % 7);

    for (let i = 0; i < 6; i++) {
        let weekHtml = '';
        let hasScheduleThisWeek = false;
        const weekStartDate = new Date(startDate);
        for (let j = 0; j < 6; j++) {
            if (weekStartDate.getDay() === 0) {
                weekStartDate.setDate(weekStartDate.getDate() + 1);
            }
            const currentDate = new Date(weekStartDate);
            let classes = [];
            const isToday = currentDate.getTime() === today.getTime();
            const isPast = currentDate < today && !isToday;
            const holidayKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
            const isHoliday = holidays.has(holidayKey);
            
            if (currentDate.getMonth() === month) {
                classes.push('is-target-month');
            }
            if (isPast) classes.push('past-date');
            if (isHoliday) classes.push('holiday');
            if (isToday) classes.push('today');

            const scheduleKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
            const dailySchedule = scheduleByDate[scheduleKey];
            const canShowSchedule = !isPast && !isHoliday && dailySchedule && (dailySchedule.am.length > 0 || dailySchedule.pm.length > 0);
            
            if (canShowSchedule) {
                hasScheduleThisWeek = true;
            }

            weekHtml += `<td class="${classes.join(' ')}"><div class="date-num">${currentDate.getDate()}</div><div class="schedule-content">`;
            if (isHoliday && !isPast) {
                weekHtml += `<div class="holiday-name-display">${holidays.get(holidayKey)}</div>`;
            } else if (canShowSchedule) {
                weekHtml += `<div class="am-slot"><span>${dailySchedule.am.join('<br>')}</span></div>`;
                weekHtml += `<div class="pm-slot"><span>${dailySchedule.pm.join('<br>')}</span></div>`;
            }
            weekHtml += `</div></td>`;
            weekStartDate.setDate(weekStartDate.getDate() + 1);
        }
        
        const lastDayOfWeek = new Date(weekStartDate);
        lastDayOfWeek.setDate(lastDayOfWeek.getDate() - 1);
        if (i >= 4 && lastDayOfWeek.getMonth() !== month && !hasScheduleThisWeek) {
        } else {
            html += `<tr class="${hasScheduleThisWeek ? '' : 'week-no-schedule'}">${weekHtml}</tr>`;
        }
        startDate.setDate(startDate.getDate() + 7);
    }
    html += '</tbody></table>';
    if (specializationMap.size > 0) {
        html += '<div class="calendar-notes">';
        const notes = [];
        const sortedNotes = [...specializationMap.entries()].sort((a, b) => a[1] - b[1]);
        sortedNotes.forEach(([spec, number]) => {
            notes.push(`#${number}: ${spec}`);
        });
        html += notes.join('　');
        html += '</div>';
    }
    html += '</div>';
    return html;
  }
  
  function setActiveTooltipTarget(targetElement) {
      document.querySelectorAll('[data-active-tooltip="true"]').forEach(el => {
          el.removeAttribute('data-active-tooltip');
      });
      if (targetElement) {
          targetElement.setAttribute('data-active-tooltip', 'true');
      }
  }

  function showAdvancedCalendarTooltip(e) {
      clearTimeout(hideTooltipTimeout);
      setActiveTooltipTarget(e.currentTarget);
      const tooltip = document.getElementById(CUSTOM_TOOLTIP_ID);
      const recordsStr = e.currentTarget.dataset.scheduleRecords;
      if (!recordsStr) return;
      const records = JSON.parse(recordsStr);
      if (!records || records.length === 0) return;
      const initialHtml = createAdvancedCalendarHtml(new Date(), records);
      tooltip.innerHTML = initialHtml;
      tooltip.style.display = 'block';
      tooltip.style.pointerEvents = 'auto';
  }

  function handleComplexTooltip(e) {
    clearTimeout(hideTooltipTimeout);
    setActiveTooltipTarget(e.currentTarget);
    const tooltip = document.getElementById(CUSTOM_TOOLTIP_ID);
    tooltip.innerHTML = e.currentTarget.dataset.fullHtml;
    tooltip.style.display = 'block';
    tooltip.style.pointerEvents = 'none';
  }

  function handleTooltipMouseOut() {
    hideTooltipTimeout = setTimeout(() => {
        document.getElementById(CUSTOM_TOOLTIP_ID).style.display = 'none';
    }, 300);
  }

  function handleTooltipMouseMove(e) {
    const tooltip = document.getElementById(CUSTOM_TOOLTIP_ID);
    tooltip.style.left = (e.pageX + 15) + 'px';
    tooltip.style.top = (e.pageY + 15) + 'px';
  }

  function renderJsonAsTable(currentJsonString, latestJsonString, targetElement, descriptionsData = {}) {
    targetElement.innerHTML = '';
    let currentData, latestData;
    try { currentData = JSON.parse(currentJsonString || '[]'); latestData = JSON.parse(latestJsonString || '[]'); } catch (e) { targetElement.textContent = 'データ解析エラー'; return; }
    if (!Array.isArray(currentData) || currentData.length === 0) { targetElement.textContent = '表示する設定データなし'; return; }
    const getMinOrder = (records) => Math.min(...records.map(r => parseInt(r['表示順']?.value || '9999', 10)));
    const groups = currentData.reduce((acc, record) => { const key = record['診療分野']?.value || '（未分類）'; if (!acc[key]) acc[key] = []; acc[key].push(record); return acc; }, {});
    const sortedGroupKeys = Object.keys(groups).sort((a, b) => getMinOrder(groups[a]) - getMinOrder(groups[b]));
    currentData = sortedGroupKeys.flatMap(key => { const groupRecords = groups[key]; groupRecords.sort((a, b) => parseInt(a['表示順']?.value || 0, 10) - parseInt(b['表示順']?.value || 0, 10)); return groupRecords; });
    const latestDataMap = new Map(latestData.map(record => [record.$id.value, record]));
    const table = document.createElement('table'); table.className = 'shinryo-config-table';
    // テーブル全体からマウスが外れたら、強制的にツールチップを消す（安全策）
    table.addEventListener('mouseleave', (e) => {
      const simpleTip = document.getElementById('config-help-tip');
      if (simpleTip) simpleTip.remove();
      const complexTip = document.getElementById(CUSTOM_TOOLTIP_ID);
      if (complexTip && complexTip.style.display !== 'none') {
        if (e.relatedTarget && complexTip.contains(e.relatedTarget)) return;
        complexTip.style.display = 'none';
      }
    });
    const thead = table.createTHead(); const headerRow = thead.insertRow();
    const columns = [
      { header: '診療分野', fieldCode: '診療分野', width: '9%', merge: true, largeFont: true, specialClass: 'bunya-cell', helpText: '診療の分野です（第１選択階層）' },
      { header: '診療科', fieldCode: '診療科', width: '25%', merge: true, largeFont: true, helpText: '診療科名に加え、受付状況、案内、予定表が表示されます' },
      { header: '医師名', fieldCode: '医師名', width: '9%', helpText: '担当する医師の名前です' },
      { header: '診療選択', fieldCode: '診療選択', width: '9%', helpText: '診療科の下にさらに診療内容等を選択肢として構成する場合に表示されます（例：専門の違いまで選択させる場合等）(第３選択階層）' },
      { header: '医師受付', fieldCode: '掲載', width: '3%', helpText: '担当医師毎に予約フォーム上で一時的に受付を停止する場合に「停止」が表示されます。' },
      { header: '担当パターン', fieldCode: 'custom_row_schedule', width: '6%', helpText: '<b>時計アイコン</b>にマウスをかざすと医師毎の月間の診察の曜日や午前/午後等の担当パターンを確認できます' },
      { header: '診察場所', fieldCode: '施設名', width: '11%', helpText: '診察を実施する施設（病院やクリニック）です' },
      { header: '医師別案内', fieldCode: '留意案内', width: '6%', helpText: '<b>インフォメーションアイコン</b>の表示がある場合にマウスをかざすと予約フォーム上で診療科の選択時に現れる医師別の案内を確認できます。' },
      { header: '予約開始日', fieldCode: '予約開始', width: '7%', helpText: '担当医師が本日から予約受付を開始するまでの日数です' },
      { header: '予約可能期間', fieldCode: '予約可能期間', width: '7%', helpText: '担当医師が予約開始から何日先までの予約を受け付けるかの期間設定です' },
    ];
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.header;
      if (col.width) th.style.width = col.width;
      if (col.specialClass) {
        col.specialClass.split(' ').forEach(cls => {
          if (cls) th.classList.add(cls);
        });
      }
      if (col.helpText) {
        const helpIcon = document.createElement('span');
        helpIcon.innerHTML = ' ⓘ';
        helpIcon.className = 'header-help-icon';
        th.appendChild(helpIcon);
        th.onmouseenter = (e) => showHelp(e, col.helpText);
        th.onmouseleave = () => {
          const tip = document.getElementById('config-help-tip');
          if (tip) tip.remove();
        };
      }
      headerRow.appendChild(th);
    });
    const tbody = table.createTBody();
    const mergeFields = columns.filter(c => c.merge).map(c => c.fieldCode);
    for (let i = 0; i < currentData.length; i++) {
        for (const field of mergeFields) {
            const getFieldValue = (rec, code) => { if (code.startsWith('custom_')) return rec['診療科']?.value; if (code === '予約受付') return `${rec['診療科']?.value}-${rec[code]?.value}`; return rec[code]?.value; };
            if (i > 0 && getFieldValue(currentData[i], field) === getFieldValue(currentData[i - 1], field)) continue;
            let rowspan = 1;
            for (let j = i + 1; j < currentData.length; j++) { if (getFieldValue(currentData[j], field) === getFieldValue(currentData[i], field)) { rowspan++; } else { break; } }
            currentData[i][`_rowspan_${field}`] = rowspan;
        }
    }
    currentData.forEach((currentRecord, index) => {
      const row = tbody.insertRow();
      const latestRecord = latestDataMap.get(currentRecord.$id.value);
      const currentDept = currentRecord['診療科']?.value; const prevDept = index > 0 ? currentData[index - 1]['診療科']?.value : null;
      if (index === 0 || currentDept !== prevDept) row.classList.add('department-group-start');
      if (currentRecord['掲載']?.value === 'Off') row.classList.add('row-off-background');
      columns.forEach(col => {
        const getFieldValue = (rec, code) => { if (code.startsWith('custom_')) return rec['診療科']?.value; if (code === '予約受付') return `${rec['診療科']?.value}-${rec[code]?.value}`; return rec[code]?.value; };
        if (col.merge && index > 0 && getFieldValue(currentRecord, col.fieldCode) === getFieldValue(currentData[index - 1], col.fieldCode)) return;
        const cell = row.insertCell();
        if (col.largeFont) cell.classList.add('large-font-cell');
        if (col.specialClass) {
          col.specialClass.split(' ').forEach(cls => {
            if (cls) cell.classList.add(cls);
          });
        }
        // データ行のみ上寄せを適用
        if (col.fieldCode === '診療分野' || col.fieldCode === '診療科') {
          cell.classList.add('align-top');
        }
        if (col.merge && currentRecord[`_rowspan_${col.fieldCode}`] > 1) cell.rowSpan = currentRecord[`_rowspan_${col.fieldCode}`];
        const field = currentRecord[col.fieldCode]; let rawValue = (field && typeof field.value !== 'undefined') ? (Array.isArray(field.value) ? field.value.join(', ') : field.value) : '';
        let isValueChanged = false;
        let displayValue = rawValue;

        if (latestRecord && col.fieldCode && !col.fieldCode.startsWith('custom_')) {
          const latestField = latestRecord[col.fieldCode];
          const latestVal = (latestField && typeof latestField.value !== 'undefined') ? (Array.isArray(latestField.value) ? latestField.value.join(', ') : latestField.value) : '';

          if (JSON.stringify(field?.value) !== JSON.stringify(latestField?.value)) {
            isValueChanged = true;
            cell.classList.add('cell-changed');
            displayValue = latestVal;
          }
        }
        
        if (col.fieldCode === '診療科') {
          // 1. 診療科名
          const nameDiv = document.createElement('div');
          nameDiv.textContent = displayValue;
          cell.appendChild(nameDiv);

          // 2. 統合情報行（受付ステータス、案内、予定表）
          const infoRow = document.createElement('div');
          infoRow.className = 'dept-info-row';

          // 受付ステータス確認
          const receptionField = currentRecord['予約受付'];
          let receptionVal = (receptionField && receptionField.value) ? receptionField.value : '';
          if (latestRecord && latestRecord['予約受付']) {
             const latestReceptionVal = latestRecord['予約受付'].value;
             if (receptionVal !== latestReceptionVal) {
                 receptionVal = latestReceptionVal;
                 cell.classList.add('cell-changed'); // 受付状態が変わっていればセルを点滅
             }
          }
          const valLower = String(receptionVal).toLowerCase();
          if (valLower === 'off' || valLower === 'false' || valLower === '停止') {
              const statusSpan = document.createElement('span');
              statusSpan.textContent = '停止';
              statusSpan.style.color = 'red';
              statusSpan.style.fontWeight = 'bold';
              statusSpan.style.fontSize = '11px';
              infoRow.appendChild(statusSpan);
          }

          // 案内アイコン
          const deptName = currentRecord['診療科']?.value;
          const deptNote = deptName ? (descriptionsData[deptName] || '') : '';
          if (stripHtml(deptNote).trim()) {
            const icon = document.createElement('span');
            icon.className = 'custom-icon icon-info diff-tooltip-target';
            icon.dataset.fullHtml = createTableFromText(deptNote);
            icon.addEventListener('mouseover', handleComplexTooltip);
            icon.addEventListener('mouseout', handleTooltipMouseOut);
            icon.addEventListener('mousemove', handleTooltipMouseMove);
            infoRow.appendChild(icon);
          }

          // カレンダー表示用データ設定（セル全体で反応させるため）
          const groupRecords = currentData.filter(r => r['診療科']?.value === deptName);
          cell.dataset.scheduleRecords = JSON.stringify(groupRecords);
          cell.addEventListener('mouseover', (e) => {
            if (e.target.closest('.custom-icon')) return; // アイコン上の場合はカレンダーを表示しない
            showAdvancedCalendarTooltip(e);
          });
          cell.addEventListener('mouseout', handleTooltipMouseOut);
          cell.addEventListener('mousemove', handleTooltipMouseMove);

          cell.appendChild(infoRow);

        } else if (col.fieldCode === '掲載') {
          const val = String(displayValue).toLowerCase();
          if (val === 'off' || val === 'false' || val === '停止') {
            cell.textContent = '停止';
            cell.style.color = 'red';
            cell.style.fontWeight = 'bold';
          } else {
            cell.textContent = '';
          }
        } else if (col.fieldCode === 'custom_row_schedule') {
          const icon = document.createElement('span');
          icon.className = 'custom-icon icon-schedule';
          cell.appendChild(icon);
          cell.classList.add('diff-tooltip-target');
          cell.dataset.fullHtml = createScheduleTableHtml(currentRecord, latestRecord);
          cell.addEventListener('mouseover', handleComplexTooltip);
          cell.addEventListener('mouseout', handleTooltipMouseOut);
          cell.addEventListener('mousemove', handleTooltipMouseMove);
          if (isScheduleChanged(currentRecord, latestRecord)) cell.classList.add('cell-changed');
        } else if (col.fieldCode === '留意案内') {
          const plainText = stripHtml(displayValue).trim();
          if (plainText) {
            const icon = document.createElement('span');
            icon.className = 'custom-icon icon-info';
            cell.appendChild(icon);
            cell.classList.add('diff-tooltip-target');
            cell.dataset.fullHtml = createTableFromText(displayValue);
            cell.addEventListener('mouseover', handleComplexTooltip);
            cell.addEventListener('mouseout', handleTooltipMouseOut);
            cell.addEventListener('mousemove', handleTooltipMouseMove);
          }
        } else { cell.textContent = displayValue; }
      });
    });
    targetElement.appendChild(table);
  }

  function setupAdvancedEditor(baseJsonString, mode = 'edit') {
    const paletteFieldElement = findFieldElementByLabelText(RICH_TEXT_PALETTE_CODE);
    if (!paletteFieldElement) { console.warn(`警告: UI構築の起点となるフィールド「${RICH_TEXT_PALETTE_CODE}」が見つかりませんでした。`); return; }

    if (mode === 'detail') {
      paletteFieldElement.style.display = 'none';
      return;
    }

    const paletteLabel = paletteFieldElement.querySelector('.control-label-gaia');
    if (!paletteLabel || paletteFieldElement.querySelector('.editor-control-header')) { return; }
    
    const valueContainer = paletteFieldElement.querySelector('.control-value-gaia');
    if (!valueContainer) { console.error('致命的エラー: リッチテキストエディタの値コンテナが見つかりません。'); return; }
    let displayArea;
    if (mode === 'detail') { valueContainer.innerHTML = ''; const viewer = document.createElement('div'); viewer.id = 'readonly-html-viewer'; valueContainer.appendChild(viewer); displayArea = viewer; } else { displayArea = valueContainer; }
    let records; try { records = JSON.parse(baseJsonString || '[]'); } catch (e) { records = []; }
    const bunyaMap = {};
    records.forEach(record => { const bunya = record['診療分野']?.value; const shinryoka = record['診療科']?.value; const shinryoSentaku = record['診療選択']?.value; if (bunya && shinryoka) { if (!bunyaMap[bunya]) { bunyaMap[bunya] = {}; } if (!bunyaMap[bunya][shinryoka]) { bunyaMap[bunya][shinryoka] = new Set(); } if (shinryoSentaku) { bunyaMap[bunya][shinryoka].add(shinryoSentaku); } } });
    const uniqueBunyaList = Object.keys(bunyaMap).sort();
    const controlHeader = document.createElement('div'); controlHeader.className = 'editor-control-header'; const selectorGroup = document.createElement('div'); selectorGroup.className = 'editor-selector-group'; const mainSelector = document.createElement('select'); mainSelector.id = 'main-selector'; const shinryokaSelector = document.createElement('select'); shinryokaSelector.id = 'shinryoka-selector'; shinryokaSelector.style.display = 'none'; const sentakuSelector = document.createElement('select'); sentakuSelector.id = 'sentaku-selector'; sentakuSelector.style.display = 'none'; selectorGroup.appendChild(mainSelector); selectorGroup.appendChild(shinryokaSelector); selectorGroup.appendChild(sentakuSelector); controlHeader.appendChild(selectorGroup);
    const originalLabelText = paletteLabel.querySelector('.control-label-text-gaia'); if (originalLabelText) { originalLabelText.textContent = ''; } paletteLabel.appendChild(controlHeader);
    // セレクターへのヘルプ
    mainSelector.onmouseenter = (e) => showHelp(e, '編集したい項目（共通ラベル、または特定の診療科）を選択してください。');
    const updateDisplayVisibility = (visible) => { displayArea.style.display = visible ? 'block' : 'none'; };
    const getSelectedKey = () => { const mainSelection = mainSelector.value; const isBunyaSelected = uniqueBunyaList.includes(mainSelection); if (!isBunyaSelected) { return mainSelection || null; } const shinryoka = shinryokaSelector.value; if (!shinryoka) return null; const sentakuSet = bunyaMap[mainSelection]?.[shinryoka]; const hasSentakuOptions = sentakuSet && sentakuSet.size > 0; if (hasSentakuOptions) { const sentaku = sentakuSelector.value; if (sentaku === '') return null; if (sentaku === '__department_wide__' || sentaku === '__department_self__') return shinryoka; return `${shinryoka}-${sentaku}`; } return shinryoka; };
    const updateDisplayArea = () => { const key = getSelectedKey(); const currentHtml = key ? (descriptionsData[key] || '') : ''; if (mode === 'edit') { const record = kintone.app.record.get(); record.record[RICH_TEXT_PALETTE_CODE].value = currentHtml; kintone.app.record.set(record); } else { displayArea.innerHTML = currentHtml || ''; } previousKey = key; };
    const initializeSelectors = () => { mainSelector.innerHTML = ''; const fixedOptions = { '': '----- 選択してください -----', 'common_label': '冒頭の共通ラベル', 'change_label': '変更の時のラベル', 'cancel_label': '取消の時のラベル', 'first_visit_label': '初診の時のラベル' }; for (const [value, text] of Object.entries(fixedOptions)) { mainSelector.add(new Option(text, value)); } if (uniqueBunyaList.length > 0) { const separator = new Option('--------------------', ''); separator.disabled = true; mainSelector.add(separator); uniqueBunyaList.forEach(bunyaName => { mainSelector.add(new Option(`▼ ${bunyaName}`, bunyaName)); }); } shinryokaSelector.innerHTML = '<option value="">診療科を選択</option>'; shinryokaSelector.style.display = 'none'; sentakuSelector.innerHTML = '<option value="">診療選択を選択</option>'; sentakuSelector.style.display = 'none'; };
    mainSelector.addEventListener('change', () => { if (mode === 'edit') { saveCurrentEditorContent(kintone.app.record.get().record); } const selection = mainSelector.value; const isBunyaSelected = uniqueBunyaList.includes(selection); shinryokaSelector.innerHTML = '<option value="">診療科を選択</option>'; shinryokaSelector.style.display = 'none'; sentakuSelector.innerHTML = '<option value="">診療選択を選択</option>'; sentakuSelector.style.display = 'none'; if (isBunyaSelected) { const shinryokaList = Object.keys(bunyaMap[selection] || {}).sort(); if (shinryokaList.length > 0) { shinryokaList.forEach(shinryokaName => { shinryokaSelector.add(new Option(shinryokaName, shinryokaName)); }); shinryokaSelector.style.display = 'inline-block'; } } updateDisplayArea(); updateDisplayVisibility(!!getSelectedKey()); });
    shinryokaSelector.onmouseenter = (e) => showHelp(e, '特定の診療科に対する案内文を編集したい場合に選択します。');
    shinryokaSelector.addEventListener('change', () => { if (mode === 'edit') { saveCurrentEditorContent(kintone.app.record.get().record); } const selectedBunya = mainSelector.value; const selectedShinryoka = shinryokaSelector.value; sentakuSelector.innerHTML = '<option value="">診療選択を選択</option>'; sentakuSelector.style.display = 'none'; if (selectedBunya && selectedShinryoka) { const sentakuSet = bunyaMap[selectedBunya]?.[selectedShinryoka]; const sentakuList = sentakuSet ? Array.from(sentakuSet).sort() : []; if (sentakuList.length > 0) { sentakuSelector.add(new Option(`${selectedShinryoka}全体として`, '__department_wide__')); sentakuSelector.add(new Option(selectedShinryoka, '__department_self__')); sentakuList.forEach(sentakuName => { sentakuSelector.add(new Option(sentakuName, sentakuName)); }); sentakuSelector.style.display = 'inline-block'; } } updateDisplayArea(); updateDisplayVisibility(!!getSelectedKey()); });
    sentakuSelector.addEventListener('change', () => { if (mode === 'edit') { saveCurrentEditorContent(kintone.app.record.get().record); } updateDisplayArea(); updateDisplayVisibility(!!getSelectedKey()); });
    initializeSelectors(); updateDisplayVisibility(false);
  }

  async function initShinryoConfig(record, mode) {
    const spaceElement = kintone.app.record.getSpaceElement(SPACE_FIELD_CODE);
    if (!spaceElement) return;
    spaceElement.innerHTML = '';
    const tooltip = document.createElement('div');

    // 編集画面の場合、不要なフィールドをDOMから削除する
    if (mode !== 'detail') {
        const labelFields = document.querySelectorAll('.control-label-field-gaia');
        labelFields.forEach(el => {
            if (el.textContent.includes('診療科別設定情報')) {
                el.remove();
            }
        });
    }

    tooltip.id = CUSTOM_TOOLTIP_ID;
    document.body.appendChild(tooltip);
    tooltip.addEventListener('mouseenter', () => clearTimeout(hideTooltipTimeout));
    tooltip.addEventListener('mouseleave', handleTooltipMouseOut);
    document.addEventListener('click', (e) => {
        if (!tooltip.contains(e.target) && !e.target.closest('.diff-tooltip-target')) {
            tooltip.style.display = 'none';
        }
    });
    
    tooltip.addEventListener('click', (event) => {
        event.stopPropagation();
        const calendarContainer = tooltip.querySelector('.calendar-container');
        if (!calendarContainer) return;
        const targetElement = document.querySelector('[data-active-tooltip="true"]');
        if (!targetElement || !targetElement.dataset.scheduleRecords) return;
        
        const records = JSON.parse(targetElement.dataset.scheduleRecords);
        let year = parseInt(calendarContainer.dataset.year, 10);
        let month = parseInt(calendarContainer.dataset.month, 10);
        let newDate;
        
        const clickedEl = event.target.closest('.calendar-nav');
        if (!clickedEl) return;
        if (clickedEl.id === 'calendar-prev-month') newDate = new Date(year, month - 2, 1);
        else if (clickedEl.id === 'calendar-next-month') newDate = new Date(year, month, 1);
        else return;
        
        const updatedHtml = createAdvancedCalendarHtml(newDate, records);
        tooltip.innerHTML = updatedHtml;
    });

    // descriptionsDataの初期化を先行して行う
    try { descriptionsData = JSON.parse(record[DESCRIPTION_FIELD_CODE]?.value || '{}'); } catch (e) { descriptionsData = {}; }

    const diffSection = document.createElement('div'); diffSection.className = 'config-section'; 
    const header = document.createElement('div'); header.id = 'shinryoConfigHeader'; 
    
    const customizeButton = document.createElement('button'); customizeButton.id = 'customizeButton'; 
    customizeButton.onclick = () => { window.open(CUSTOMIZE_APP_URL, '_blank'); };
    
    // ★変更: 予約フォーム反映ボタンの生成と配置
    const updateButtonId = 'getAppBDataButton';
    let updateButton = document.getElementById(updateButtonId);
    if (updateButton) updateButton.remove(); // 重複防止のため既存ボタンを削除
    updateButton = null;

    const tableContainer1 = document.createElement('div'); tableContainer1.id = 'shinryoConfigTableContainer';

    if (mode === 'detail') {
        customizeButton.textContent = '診療科の設定情報を編集する';
        diffSection.appendChild(header);
        diffSection.appendChild(tableContainer1);

        // ユーザー指定のツールバー領域 (.gaia-argoui-app-toolbar-menu) を取得
        const toolbarMenu = document.querySelector('.gaia-argoui-app-toolbar-menu');
        // 挿入基準となる「レコードを編集する」ボタンを取得
        const editButton = document.querySelector('.gaia-argoui-app-menu-edit');

        // ツールバーが見つからない場合は標準APIのスペースを使用（フォールバック）
        const targetContainer = toolbarMenu || kintone.app.record.getHeaderMenuSpaceElement();

        if (targetContainer) {
            updateButton = document.createElement('button');
            updateButton.id = updateButtonId;
            updateButton.style.marginLeft = '12px';
            updateButton.style.marginRight = '12px';
            updateButton.style.verticalAlign = 'middle';
            
            // 編集ボタンが見つかり、かつコンテナ内にある場合はその直前に挿入
            if (editButton && targetContainer.contains(editButton)) {
                targetContainer.insertBefore(updateButton, editButton);
            } else {
                targetContainer.appendChild(updateButton);
            }
            
            // 診療科設定編集ボタンを反映ボタンの左隣に配置
            customizeButton.style.marginLeft = '12px';
            customizeButton.style.verticalAlign = 'middle';
            targetContainer.insertBefore(customizeButton, updateButton);
        }
        
        spaceElement.appendChild(diffSection);
    }

    
    const updateUI = (state) => { if (!updateButton) return; const stateMap = { loading: { text: '確認中...', disabled: true }, 'up-to-date': { text: '予約フォームに反映済', disabled: true }, 'needs-update': { text: '予約フォームに反映する', disabled: false }, error: { text: 'エラー', disabled: true }, updating: { text: '反映中...', disabled: true } }; updateButton.textContent = stateMap[state].text; updateButton.disabled = stateMap[state].disabled; };

    customizeButton.onmouseenter = (e) => showHelp(e, '診療科の追加・削除や基本情報の変更を行う「診療科マスタ」アプリを開きます。');
    if (updateButton) updateButton.onmouseenter = (e) => showHelp(e, 'この操作を行うと診療科の変更内容（下の表で赤く点滅している個所）が予約フォームとして公開されます。');

    // 詳細画面の場合のみ、データを取得して表を描画する
    if (mode === 'detail') {
        updateUI('loading');
        try {
            const latestDataString = await fetchAndStringifySortedAppBData(APP_B_ID);
            const currentDataString = record[TARGET_MULTILINE_FIELD_CODE_A]?.value || '[]';
            
            renderJsonAsTable(currentDataString, latestDataString, tableContainer1, descriptionsData);
            
            if (currentDataString !== latestDataString) {
                updateUI('needs-update');
                if (updateButton) {
                    updateButton.onclick = async () => { if (!confirm('個別診療設定を最新の状態に更新します。よろしいですか？')) return; updateUI('updating'); try { await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', { app: kintone.app.getId(), id: record.$id.value, record: { [TARGET_MULTILINE_FIELD_CODE_A]: { value: latestDataString } } }); location.reload(); } catch (updateError) { alert('エラーのため更新できませんでした。\n' + (updateError.message || '')); updateUI('needs-update'); } };
                }
            } else { updateUI('up-to-date'); }
        } catch (error) {
            console.error('診療科別設定情報の描画中にエラーが発生しました:', error);
            updateUI('error');
            // エラー内容を画面にも簡易表示（デバッグ用）
            if(tableContainer1) tableContainer1.innerHTML = `<p style="color:red; padding:10px;">エラーが発生しました: ${error.message}</p>`;
        }
    }
    
    setTimeout(() => { const baseJsonString = record[TARGET_MULTILINE_FIELD_CODE_A]?.value; setupAdvancedEditor(baseJsonString, mode); }, 0);
  }

  kintone.events.on('app.record.detail.show', function(event) {
    initShinryoConfig(event.record, 'detail');
    return event;
  });

  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], function(event) {
    ['冒頭ラベル', '変更用件ラベル', '初診用件ラベル', '取消用件ラベル'].forEach(field => {
      kintone.app.record.setFieldShown(field, false);
    });

    // 編集画面では描画タイミングを少し遅らせる（DOM生成待ち）
    setTimeout(() => { initShinryoConfig(event.record, 'edit'); }, 500);
    return event;
  });

  kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], function(event) { saveCurrentEditorContent(event.record); const targetField = event.record[DESCRIPTION_FIELD_CODE]; if (targetField.disabled) { console.error(`エラー: フィールド '${DESCRIPTION_FIELD_CODE}' が無効化されているため、値を設定できません。`); } targetField.value = JSON.stringify(descriptionsData, null, 2); return event; });

})();