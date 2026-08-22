/*
 * PatientSearch.js
 * 全画面（一覧・詳細・編集・作成）で共通して、情報バーに「管理状況凡例」ボタンおよび「カルテNo検索」機能を配置します。
 * 外部APIリクエスト制限（APIトークン上限）を消費しない kintone.api() を使用し、
 * CRMアプリ(App 309)およびApp 142から患者の全過去チケット履歴・特徴・経過情報を取得し、別ポップアップで表示します。
 */
(function () {
    'use strict';

    // 検索結果のキャッシュ (カルテNo -> 統合患者データ)
    const patientSearchCache = {};

    // --- モダンなトースト通知関数 ---
    function showToastNotification(message, type = 'warning') {
        if (!document.getElementById('custom-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'custom-toast-styles';
            style.textContent = `
              .custom-toast-container { position: fixed; top: 20px; right: 20px; z-index: 20000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
              .custom-toast { pointer-events: auto; min-width: 280px; max-width: 420px; background: #ffffff; color: #333333; padding: 12px 18px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: bold; border-left: 5px solid #ffc107; opacity: 0; transform: translateX(50px); transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
              .custom-toast.show { opacity: 1; transform: translateX(0); }
              .custom-toast-warning { border-left-color: #f39c12; background: #fffdf5; }
              .custom-toast-error { border-left-color: #e74c3c; background: #fdf7f7; }
              .custom-toast-info { border-left-color: #3498db; background: #f4f9fd; }
              .custom-toast-icon { font-size: 18px; flex-shrink: 0; }
              .custom-toast-message { flex-grow: 1; line-height: 1.4; }
            `;
            document.head.appendChild(style);
        }

        let container = document.getElementById('custom-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'custom-toast-container';
            container.className = 'custom-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const icon = type === 'error' ? '❌' : (type === 'info' ? 'ℹ️' : '⚠️');
        toast.className = `custom-toast custom-toast-${type}`;
        toast.innerHTML = `<span class="custom-toast-icon">${icon}</span><span class="custom-toast-message">${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);

        const removeToast = () => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        };

        toast.onclick = removeToast;
        setTimeout(removeToast, 4000);
    }

    kintone.events.on([
        'app.record.index.show',
        'app.record.detail.show',
        'app.record.edit.show',
        'app.record.create.show'
    ], function (event) {
        const isIndex = event.type === 'app.record.index.show';
        const targetMarginRight = isIndex ? '26px' : '90px';

        // --- 1. 管理状況凡例ボタンの構築 (元の位置・スタイル) ---
        let legendBtn = document.getElementById('custom-legend-btn');
        if (!legendBtn) {
            legendBtn = document.createElement('button');
            legendBtn.id = 'custom-legend-btn';
            legendBtn.textContent = '管理状況凡例';
            legendBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; background: #6c757d; color: #fff; border: 1px solid #565e64; border-radius: 4px; padding: 0 10px; height: 26px; box-sizing: border-box; font-size: 12px; font-weight: bold; cursor: pointer; flex-shrink: 0; line-height: 1; position: relative; z-index: 10; margin-left: auto; margin-right: ' + targetMarginRight + ';';
            legendBtn.onmouseover = () => legendBtn.style.background = '#5a6268';
            legendBtn.onmouseout = () => legendBtn.style.background = '#6c757d';
            legendBtn.onclick = showStatusLegendDialog;
        }

        // --- 2. カルテNo検索コンテナの構築 (kintone-app-headermenu-space用) ---
        let searchContainer = document.getElementById('custom-patient-search-container');
        if (!searchContainer) {
            searchContainer = document.createElement('div');
            searchContainer.id = 'custom-patient-search-container';
            searchContainer.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; margin-left: 15px; margin-right: 20px; flex-shrink: 0; position: relative; z-index: 10; vertical-align: middle;';

            const searchLabel = document.createElement('span');
            searchLabel.textContent = '🔍 患者検索:';
            searchLabel.style.cssText = 'font-size: 16px; font-weight: bold; color: #333; white-space: nowrap;';

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.id = 'custom-patient-search-input';
            searchInput.placeholder = 'カルテNo (8桁)';
            searchInput.maxLength = 8;
            searchInput.style.cssText = 'width: 115px; height: 34px; padding: 0 6px; border: 1.5px solid #ced4da; border-radius: 6px; font-size: 14px; font-weight: bold; text-align: center; box-sizing: border-box; outline: none; transition: border-color 0.2s; font-family: monospace; letter-spacing: 0px; color: #212529; background: #ffffff;';
            
            searchInput.oninput = () => {
                let val = searchInput.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
                val = val.replace(/[^\d]/g, '');
                if (val.length > 8) val = val.slice(0, 8);
                searchInput.value = val;
            };

            searchInput.onfocus = () => searchInput.style.borderColor = '#80bdff';
            searchInput.onblur = () => searchInput.style.borderColor = '#ced4da';
            searchInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    executePatientSearch();
                }
            };

            const searchBtn = document.createElement('button');
            searchBtn.id = 'custom-patient-search-btn';
            searchBtn.textContent = '検索';
            searchBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; background: #007bff; color: #fff; border: 1px solid #0069d9; border-radius: 6px; padding: 0 16px; height: 34px; box-sizing: border-box; font-size: 15px; font-weight: bold; cursor: pointer; flex-shrink: 0; line-height: 1; shadow: 0 2px 4px rgba(0,0,0,0.1);';
            searchBtn.onmouseover = () => searchBtn.style.background = '#0069d9';
            searchBtn.onmouseout = () => searchBtn.style.background = '#007bff';
            searchBtn.onclick = executePatientSearch;

            searchContainer.appendChild(searchLabel);
            searchContainer.appendChild(searchInput);
            searchContainer.appendChild(searchBtn);
        }

        // --- 3. 要素の配置処理 (凡例ボタンは元のパンくずバー右端、検索はheadermenu-spaceへ) ---
        const insertHeaderElements = () => {
            // A. 「凡例ボタン」の元位置への挿入 (パンくず情報バー右端)
            const iconlistWrapper = document.querySelector('.gaia-argoui-app-infobar-breadcrumb-iconlist');
            const iconList = document.querySelector('.gaia-argoui-app-infobar-iconlist');
            const infobar = document.querySelector('.gaia-argoui-app-infobar');
            const targetInfobar = iconlistWrapper || infobar;

            if (targetInfobar) {
                targetInfobar.style.display = 'flex';
                targetInfobar.style.alignItems = 'center';
                targetInfobar.style.width = '100%';

                if (iconList) {
                    iconList.style.marginLeft = '0';
                    iconList.style.marginRight = '10px';
                    iconList.style.display = 'inline-flex';
                    iconList.style.alignItems = 'center';
                }

                legendBtn.style.marginLeft = 'auto';
                legendBtn.style.marginRight = targetMarginRight;
                legendBtn.style.visibility = 'visible';

                if (legendBtn.parentNode !== targetInfobar) {
                    targetInfobar.appendChild(legendBtn);
                }
            }

            // B. 「患者検索コンテナ」の headermenu-space への挿入
            const headerSpace = kintone.app.getHeaderMenuSpaceElement() || document.querySelector('.kintone-app-headermenu-space');
            const staffBadgeWrapper = document.getElementById('staff-badge-wrapper');

            if (headerSpace) {
                headerSpace.style.display = 'inline-flex';
                headerSpace.style.alignItems = 'center';

                const parentTarget = staffBadgeWrapper || headerSpace;
                if (searchContainer.parentNode !== parentTarget) {
                    parentTarget.appendChild(searchContainer);
                }
            }

            return true;
        };

        insertHeaderElements();

        // DOMの変更を監視して再配置
        const observer = new MutationObserver(() => {
            insertHeaderElements();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            insertHeaderElements();
        }, 400);

        return event;
    });

    // --- 4. 患者検索処理の実行 (厳格な8桁数字チェック & kintone.api 使用) ---
    async function executePatientSearch() {
        const inputEl = document.getElementById('custom-patient-search-input');
        if (!inputEl) return;
        
        let chartNo = inputEl.value.trim();
        chartNo = chartNo.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
        
        // ① 数字以外が含まれていないかチェック (alert排他 ➔ トースト通知)
        if (!/^\d+$/.test(chartNo)) {
            showToastNotification('「カルテNo」は半角数字のみで入力してください。', 'warning');
            inputEl.focus();
            return;
        }

        // ② 桁数が厳密に8桁であるかチェック (alert排他 ➔ トースト通知)
        if (chartNo.length !== 8) {
            showToastNotification(`「カルテNo」は8桁の数字で入力してください。（現在 ${chartNo.length} 桁）`, 'warning');
            inputEl.focus();
            return;
        }

        // キャッシュチェック
        if (patientSearchCache[chartNo]) {
            showPatientCrmModal(chartNo, patientSearchCache[chartNo]);
            return;
        }

        const searchBtn = document.getElementById('custom-patient-search-btn');
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.textContent = '⏳ 検索中...';
        }

        try {
            const currentAppId = kintone.app.getId();
            const CRM_APP_ID = 309;
            const patientId = `${currentAppId}_${chartNo}`;

            const app142Query = `カルテNo = "${chartNo}" order by $id desc`;
            const app142Resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                app: currentAppId,
                query: app142Query
            });

            const crmQuery = `患者ID = "${patientId}" or カルテNo = "${chartNo}"`;
            let crmResp = { records: [] };
            try {
                crmResp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                    app: CRM_APP_ID,
                    query: crmQuery
                });
            } catch (crmErr) {
                console.warn('[PatientSearch] CRM App query warning:', crmErr);
            }

            const integratedData = processPatientData(chartNo, app142Resp.records, crmResp.records);

            if (!integratedData.hasRecords) {
                showToastNotification(`カルテNo「${chartNo}」に該当する患者記録が見つかりませんでした。`, 'info');
                return;
            }

            patientSearchCache[chartNo] = integratedData;
            showPatientCrmModal(chartNo, integratedData);

        } catch (error) {
            console.error('[PatientSearch] 検索処理中にエラーが発生しました:', error);
            showToastNotification('検索処理中にエラーが発生しました: ' + error.message, 'error');
        } finally {
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.textContent = '検索';
            }
        }
    }

    // 年齢計算ヘルパー
    function calculateAge(dobStr) {
        if (!dobStr) return '';
        try {
            const d = new Date(dobStr);
            if (isNaN(d.getTime())) return '';
            const today = new Date();
            let age = today.getFullYear() - d.getFullYear();
            const m = today.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
                age--;
            }
            return ` (${age}歳)`;
        } catch (e) {
            return '';
        }
    }

    // --- 5. App 142 と App 309 データの統合処理 ---
    function processPatientData(chartNo, app142Records, crmRecords) {
        let patientInfo = {
            chartNo: chartNo,
            name: '',
            kana: '',
            dob: '',
            gender: '',
            zip: '',
            address: '',
            phone1: '',
            phone2: '',
            email: '',
            tickets: [],
            hasRecords: false
        };

        const inactiveStatuses = ['終了', '強制終了', 'キャンセル', 'URL取下', 'WEB取下'];

        // CRMアプリ(App 309)から患者基本情報と過去アーカイブログを取得
        if (crmRecords && crmRecords.length > 0) {
            const crmRecord = crmRecords[0];
            patientInfo.name = crmRecord['氏名']?.value || '';
            patientInfo.kana = crmRecord['かな']?.value || '';
            patientInfo.dob = crmRecord['生年月日']?.value || '';
            patientInfo.gender = crmRecord['性別']?.value || '';

            // 連絡先記録
            const contactTable = crmRecord['連絡先記録']?.value || [];
            if (contactTable.length > 0) {
                const cVal = contactTable[0].value;
                patientInfo.zip = cVal['郵便番号']?.value || '';
                patientInfo.address = cVal['住所']?.value || '';
                patientInfo.phone1 = cVal['電話番号1']?.value || '';
                patientInfo.phone2 = cVal['電話番号2']?.value || '';
                patientInfo.email = cVal['メール1']?.value || '';
            }

            // サブテーブル: 申込記録
            const applyTable = crmRecord['申込記録']?.value || [];
            applyTable.forEach(row => {
                const rVal = row.value;
                let evalObj = { common: [], memo: '' };
                try {
                    if (rVal['人物評価']?.value) {
                        evalObj = JSON.parse(rVal['人物評価'].value);
                    }
                } catch (e) {}

                let progressArr = [];
                try {
                    if (rVal['経過情報']?.value) {
                        progressArr = JSON.parse(rVal['経過情報'].value);
                    }
                } catch (e) {}

                patientInfo.tickets.push({
                    type: 'past',
                    isCurrent: false,
                    purpose: rVal['用件']?.value || '-',
                    status: '終了',
                    applyDate: rVal['申込日']?.value || '-',
                    dept: rVal['診療科']?.value || '-',
                    method: rVal['対応方法']?.value || '-',
                    applicant: rVal['申込者']?.value || '-',
                    note: '-',
                    commonEval: evalObj.common || [],
                    memo: evalObj.memo || '-',
                    progress: progressArr
                });
            });
        }

        // App 142のアクティブチケット（未終了）を統合
        if (app142Records && app142Records.length > 0) {
            app142Records.forEach((rec, idx) => {
                const status = (rec['管理状況']?.value || '').trim();
                const isInactive = inactiveStatuses.includes(status);
                
                // 基本情報の補完 (CRMにない場合)
                if (!patientInfo.name) {
                    const lName = rec['姓漢字']?.value || '';
                    const fName = rec['名漢字']?.value || '';
                    patientInfo.name = `${lName} ${fName}`.trim();
                }
                if (!patientInfo.kana) {
                    const lKana = rec['姓かな']?.value || '';
                    const fKana = rec['名かな']?.value || '';
                    patientInfo.kana = `${lKana} ${fKana}`.trim();
                }
                if (!patientInfo.dob) patientInfo.dob = rec['生年月日']?.value || '';
                if (!patientInfo.gender) patientInfo.gender = rec['性別']?.value || '';

                if (!patientInfo.phone1) patientInfo.phone1 = rec['電話1']?.value || rec['電話番号']?.value || '';
                if (!patientInfo.phone2) patientInfo.phone2 = rec['電話2']?.value || '';
                if (!patientInfo.email) patientInfo.email = rec['メールアドレス']?.value || '';
                if (!patientInfo.address) {
                    const zip = rec['郵便番号']?.value || rec['postal_code']?.value || '';
                    const a1 = rec['住所']?.value || '';
                    const a2 = rec['丁目番地等']?.value || '';
                    const a3 = rec['建物']?.value || '';
                    if (zip) patientInfo.zip = zip;
                    patientInfo.address = `${a1} ${a2} ${a3}`.trim();
                }

                // 経過情報のパース
                const historyTable = rec['経過情報']?.value || [];
                const progressArr = historyTable.map(hRow => {
                    return {
                        datetime: hRow.value['経過情報_日時']?.value || '',
                        staff: hRow.value['経過情報_担当者']?.value || '',
                        status: hRow.value['経過情報_管理状態']?.value || '',
                        reason: hRow.value['経過情報_理由']?.value || ''
                    };
                });

                const rawDate = rec['申込日']?.value || (rec['作成日時']?.value ? rec['作成日時'].value.split('T')[0] : '-');
                
                patientInfo.tickets.push({
                    type: isInactive ? 'past' : 'active',
                    isCurrent: !isInactive && idx === 0, // 最上位のアクティブを「本チケット」とする
                    purpose: rec['用件']?.value || '-',
                    status: status || '-',
                    applyDate: rawDate,
                    dept: rec['診療科']?.value || '-',
                    method: rec['対応方法']?.value || rec['応対方法']?.value || '-',
                    applicant: rec['申込者']?.value || '-',
                    note: rec['申込者補足']?.value || rec['補足']?.value || '-',
                    commonEval: rec['共通評価']?.value || [],
                    memo: rec['人物メモ']?.value || '-',
                    progress: progressArr
                });
            });
        }

        // アクティブな「本チケット」を最優先、それ以外は日付の降順ソート
        patientInfo.tickets.sort((a, b) => {
            if (a.isCurrent) return -1;
            if (b.isCurrent) return 1;
            return (b.applyDate || '').localeCompare(a.applyDate || '');
        });

        patientInfo.hasRecords = patientInfo.tickets.length > 0;
        return patientInfo;
    }

    // --- 6. 「📜 この患者の特徴等」モーダルダイアログの表示 ---
    function showPatientCrmModal(chartNo, data) {
        if (!document.getElementById('patient-crm-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'patient-crm-modal-styles';
            style.textContent = `
              .pcm-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); z-index: 10001; display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.25s ease; }
              .pcm-box { background: #fff; width: 1240px; max-width: 96%; border-radius: 8px; box-shadow: 0 12px 30px rgba(0,0,0,0.3); overflow: hidden; transform: translateY(-15px); transition: transform 0.25s ease; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
              .pcm-header { padding: 12px 20px; background-color: #2c3e50; color: #fff; font-weight: bold; font-size: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #3498db; }
              .pcm-body { padding: 16px 20px; max-height: 78vh; overflow-y: auto; background: #fafafa; }
              
              /* 患者基本情報テーブル */
              .pcm-info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; background: #ffffff; border: 1px solid #dee2e6; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden; }
              .pcm-info-table th { background-color: #f1f4f6; color: #495057; font-weight: bold; padding: 6px 10px; border: 1px solid #dee2e6; text-align: left; white-space: nowrap; width: 130px; }
              .pcm-info-table td { padding: 6px 10px; border: 1px solid #dee2e6; color: #212529; text-align: left; word-break: break-all; }
              .pcm-font-bold { font-weight: bold; color: #1a365d; }

              /* チケット履歴テーブル (コンパクト＆改行防止) */
              .pcm-table { width: 100%; border-collapse: collapse; font-size: 11px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; }
              .pcm-table th, .pcm-table td { border: 1px solid #dee2e6; padding: 6px 4px; text-align: center; vertical-align: middle; white-space: nowrap; }
              .pcm-table th { background-color: #f1f4f6; color: #333; font-weight: bold; font-size: 11px; }
              .pcm-table tr:hover { background-color: #f8f9fa; }
              .pcm-badge-ticket-active { display: inline-block; white-space: nowrap; background-color: #eef5ff; color: #0056b3; border: 1px solid #b8daff; padding: 2px 6px; border-radius: 12px; font-weight: bold; font-size: 10.5px; }
              .pcm-badge-ticket-past { display: inline-block; white-space: nowrap; background-color: #e9ecef; color: #495057; border: 1px solid #ced4da; padding: 2px 6px; border-radius: 12px; font-size: 10.5px; }
              .pcm-eval-check { color: #27ae60; font-weight: bold; font-size: 13px; }
              .pcm-btn-progress { background-color: #ffffff; border: 1px solid #ced4da; border-radius: 4px; padding: 2px 8px; font-size: 11px; color: #495057; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
              .pcm-btn-progress:hover { background-color: #e2e6ea; border-color: #adb5bd; }
              .pcm-footer { padding: 12px 20px; background-color: #f8f9fa; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; }
              .pcm-btn-close { padding: 6px 20px; background-color: #6c757d; color: white; border: none; border-radius: 4px; font-weight: bold; font-size: 13px; cursor: pointer; transition: background-color 0.2s; }
              .pcm-btn-close:hover { background-color: #5a6268; }
            `;
            document.head.appendChild(style);
        }

        const overlay = document.createElement('div');
        overlay.className = 'pcm-overlay';

        const box = document.createElement('div');
        box.className = 'pcm-box';

        const headerTitle = `📜 この患者の特徴等 (カルテNo: ${chartNo}${data.name ? ` / ${data.name} 様` : ''})`;
        const header = document.createElement('div');
        header.className = 'pcm-header';
        header.innerHTML = `<span>${headerTitle}</span>`;

        // 患者基本情報サマリー表（テーブル形式）HTML
        const phones = [data.phone1, data.phone2].filter(Boolean).join(' / ') || '-';
        const cardHtml = `
            <table class="pcm-info-table">
                <tbody>
                    <tr>
                        <th>👤 氏名 (フリガナ)</th>
                        <td class="pcm-font-bold">${data.name || '-'} ${data.kana ? `(${data.kana})` : ''}</td>
                        <th>🎂 生年月日 / 性別</th>
                        <td>${data.dob || '-'}${calculateAge(data.dob)} / ${data.gender || '-'}</td>
                        <th>📞 電話番号</th>
                        <td>${phones}</td>
                    </tr>
                    <tr>
                        <th>✉️ メールアドレス</th>
                        <td>${data.email || '-'}</td>
                        <th>🏠 住所</th>
                        <td colspan="3">${data.zip ? `〒${data.zip} ` : ''}${data.address || '-'}</td>
                    </tr>
                </tbody>
            </table>
        `;

        const body = document.createElement('div');
        body.className = 'pcm-body';

        // 特徴・注意点フラグの定義
        const evalFlags = [
            { key: '未既読', label: '未既読' },
            { key: '不通', label: '不通' },
            { key: '長電話', label: '長電話' },
            { key: '不一致', label: '不一致' },
            { key: '直前に受診キャンセル', label: '直キャン' },
            { key: '無断で受診キャンセル', label: '無キャン' }
        ];

        let tableHtml = `
            <table class="pcm-table">
                <thead>
                    <tr>
                        <th rowspan="2" style="width: 75px; white-space: nowrap;">チケット</th>
                        <th rowspan="2" style="width: 50px; white-space: nowrap;">用件</th>
                        <th rowspan="2" style="width: 80px; white-space: nowrap;">管理状況</th>
                        <th rowspan="2" style="width: 85px; white-space: nowrap;">申込日</th>
                        <th rowspan="2" style="width: 120px; white-space: nowrap;">診療科</th>
                        <th rowspan="2" style="width: 55px; white-space: nowrap;">対応方法</th>
                        <th rowspan="2" style="width: 55px; white-space: nowrap;">申込者</th>
                        <th rowspan="2" style="width: 65px;">補足</th>
                        <th colspan="6">申込者の特徴・注意点</th>
                        <th rowspan="2" style="width: 130px;">メモ</th>
                        <th rowspan="2" style="width: 50px; white-space: nowrap;">経過</th>
                    </tr>
                    <tr>
                        ${evalFlags.map(f => `<th style="width: 48px; font-size: 10.5px; white-space: nowrap;">${f.label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        data.tickets.forEach((t, tIdx) => {
            const ticketBadge = t.isCurrent 
                ? `<span class="pcm-badge-ticket-active">本チケット</span>` 
                : `<span class="pcm-badge-ticket-past">済</span>`;
            
            // 対応方法アイコン
            let methodDisplay = t.method;
            if (t.method === 'email' || t.method === 'メール対応') methodDisplay = '✉️';
            else if (t.method === 'phone' || t.method === '電話対応') methodDisplay = '📞';

            // 特徴フラグチェック
            const evalCols = evalFlags.map(f => {
                const hasFlag = Array.isArray(t.commonEval) && t.commonEval.includes(f.key);
                return `<td>${hasFlag ? '<span class="pcm-eval-check">✔</span>' : ''}</td>`;
            }).join('');

            tableHtml += `
                <tr>
                    <td>${ticketBadge}</td>
                    <td><strong>${t.purpose}</strong></td>
                    <td>${t.status}</td>
                    <td>${t.applyDate}</td>
                    <td>${t.dept}</td>
                    <td>${methodDisplay}</td>
                    <td>${t.applicant}</td>
                    <td>${t.note !== '-' ? t.note : ''}</td>
                    ${evalCols}
                    <td style="text-align: left; font-size: 11px; white-space: normal; word-break: break-all;">${t.memo !== '-' ? t.memo : '-'}</td>
                    <td>
                        <button type="button" class="pcm-btn-progress" id="pcm-btn-progress-${tIdx}">表示</button>
                    </td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        body.innerHTML = cardHtml + tableHtml;

        const footer = document.createElement('div');
        footer.className = 'pcm-footer';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'pcm-btn-close';
        closeBtn.textContent = '閉じる';
        closeBtn.onclick = () => document.body.removeChild(overlay);

        footer.appendChild(closeBtn);

        box.appendChild(header);
        box.appendChild(body);
        box.appendChild(footer);
        overlay.appendChild(box);

        overlay.onclick = (e) => {
            if (e.target === overlay) document.body.removeChild(overlay);
        };

        document.body.appendChild(overlay);

        // 経過ボタンイベントの登録
        data.tickets.forEach((t, tIdx) => {
            const btn = document.getElementById(`pcm-btn-progress-${tIdx}`);
            if (btn) {
                btn.onclick = () => showProgressSubModal(t);
            }
        });

        setTimeout(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'translateY(0)';
        }, 10);
    }

    // --- 7. 経過情報表示サブモーダル ---
    function showProgressSubModal(ticketData) {
        const progressList = ticketData.progress || [];
        let html = '<div style="font-size: 13px; line-height: 1.6;">';
        if (progressList.length === 0) {
            html += '<p style="color: #777; margin: 0;">経過情報の記録はありません。</p>';
        } else {
            html += '<table style="width:100%; border-collapse:collapse; font-size:12px;">';
            html += '<tr style="background:#f1f4f6;"><th>日時</th><th>担当者</th><th>管理状態</th><th>理由</th></tr>';
            progressList.forEach(p => {
                html += `<tr>
                    <td style="border:1px solid #ddd; padding:6px;">${p.datetime || '-'}</td>
                    <td style="border:1px solid #ddd; padding:6px;">${p.staff || '-'}</td>
                    <td style="border:1px solid #ddd; padding:6px;">${p.status || '-'}</td>
                    <td style="border:1px solid #ddd; padding:6px;">${p.reason || '-'}</td>
                </tr>`;
            });
            html += '</table>';
        }
        html += '</div>';

        // 簡易アラートダイアログ風サブ表示
        const subOverlay = document.createElement('div');
        subOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 10002; display: flex; justify-content: center; align-items: center;';
        
        const subBox = document.createElement('div');
        subBox.style.cssText = 'background: #fff; width: 600px; max-width: 90%; border-radius: 6px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);';
        subBox.innerHTML = `
            <h4 style="margin-top:0; margin-bottom:15px; color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:8px;">⏱️ 経過情報ログ (${ticketData.purpose} / ${ticketData.applyDate})</h4>
            ${html}
            <div style="margin-top:15px; text-align:right;">
                <button type="button" style="padding:5px 15px; background:#6c757d; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">閉じる</button>
            </div>
        `;

        subBox.querySelector('button').onclick = () => document.body.removeChild(subOverlay);
        subOverlay.onclick = (e) => { if (e.target === subOverlay) document.body.removeChild(subOverlay); };

        subOverlay.appendChild(subBox);
        document.body.appendChild(subOverlay);
    }

    // --- 8. 凡例ダイアログ表示関数 ---
    function showStatusLegendDialog() {
        if (!document.getElementById('rcb-modal-styles-legend')) {
            const modalStyle = document.createElement('style');
            modalStyle.id = 'rcb-modal-styles-legend';
            modalStyle.textContent = `
              .rcb-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 10000; display: flex; justify-content: center; align-items: center; opacity: 0; transition: opacity 0.3s ease; }
              .rcb-modal { background: #fff; width: 800px; max-width: 90%; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden; transform: translateY(-20px); transition: transform 0.3s ease; font-family: "Helvetica Neue", Arial, sans-serif; }
              .rcb-modal-header { padding: 15px 20px; font-weight: bold; font-size: 16px; color: #fff; display: flex; align-items: center; gap: 10px; background-color: #555; }
              .rcb-modal-body { padding: 25px; color: #333; line-height: 1.6; font-size: 14px; text-align: left; max-height: 70vh; overflow-y: auto; }
              .rcb-modal-footer { padding: 0 20px 20px 20px; display: flex; justify-content: flex-end; gap: 10px; }
              .rcb-modal-btn { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; }
              .rcb-modal-btn-cancel { background: #f0f0f0; color: #555; border: 1px solid #ccc; }
            `;
            document.head.appendChild(modalStyle);
        }

        const overlay = document.createElement('div');
        overlay.className = 'rcb-modal-overlay';

        const box = document.createElement('div');
        box.className = 'rcb-modal';

        const header = document.createElement('div');
        header.className = 'rcb-modal-header';
        header.innerHTML = '<span>ℹ️</span> <span>管理状況凡例</span>';

        const content = document.createElement('div');
        content.className = 'rcb-modal-body';

        const legendData = [
            { status: '未着手', desc: '新規のチケットが到着した直後' },
            { status: '担当設定', desc: '担当者を設定した' },
            { status: 'メール送信済', desc: '患者に仮予約日時を確保した旨の案内メールを送信した' },
            { status: 'メール既読', desc: '患者に送信した仮予約日時を確保した旨の案内メールを患者が読んだ' },
            { status: '閲覧期限切れ', desc: '患者に送信した仮予約日時を確保した旨の案内メールが患者に読まれないまま期限が過ぎた' },
            { status: '申込者再依頼', desc: '閲覧期限が過ぎた後に患者から改めて仮予約日時の確保を依頼された(※1)' },
            { status: 'URL取下', desc: '既に予約日時は確定していたが、受診日時までに患者がその予約を取下げた' },
            { status: 'スタッフ取下', desc: 'スタッフの手違いなどの理由により確保した仮予約日時の取下げをスタッフが行った' },
            { status: 'スタッフ取下中止', desc: 'スタッフが仮予約日時を取下げたものの、やっぱり復活させることにした(取下をやめた)' },
            { status: '強制終了', desc: '重複申込の選別やスタッフの手動操作などにより、チケットを強制的に無効・打ち切り処理した' },
            { status: '終了', desc: '患者の受診日時が(予定通り)経過した、あるいはスタッフの判断により患者の受診日時の予定を手動で無効にした(※2)' },
            { status: 'WEB取下', desc: '患者がWebフォームから行った予約取下げ依頼を、スタッフが処理した' }
        ];

        const notes = `
            <div style="margin-top: 20px; font-size: 12px; line-height: 1.6; color: #555; background-color: #f8f9fa; padding: 15px; border-radius: 4px; border: 1px solid #e9ecef;">
                <p style="margin:0 0 10px 0;"><strong>(※1)</strong>閲覧期限当日中であれば、患者はWebフォームを経由せずに仮予約日時確保の再依頼が出来ます（スタッフ側が当日中の対応が困難と予想される場合（退勤時刻が近い場合など）には仮予約日時の案内メールを送信する際に閲覧期限を明日までとする設定も可能です）</p>
                <p style="margin:0 0 10px 0;"><strong>(※2)</strong>Webフォームで予約が確定すると、同じ患者は以下いずれかの条件を満たすまでWebフォームから新たな予約はできません</p>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>患者のWebフォームから来た取下げ依頼をスタッフが処理した場合</li>
                    <li>患者に届いているメールに記載の URL(リンク)から取下を行った場合</li>
                    <li>患者の診療予約日時が過ぎた場合</li>
                    <li>スタッフが【手動終了】のボタン操作を行った場合</li>
                    <li>スタッフが【強制終了】のボタン操作を行った場合</li>
                </ul>
            </div>
        `;

        let tableHtml = `
            <p style="margin-top:0; margin-bottom:15px; font-size: 14px;">チケットの現在の管理状態(下記のいずれか)を表示します。</p>
            <style>
                .legend-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .legend-table th, .legend-table td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
                .legend-table th { background-color: #f8f9fa; font-weight: bold; text-align: center; vertical-align: middle; }
                .legend-table th:first-child { width: 150px; }
                .legend-table td:first-child { text-align: center; vertical-align: middle; }
                .legend-table tr:nth-child(even) { background-color: #fdfdfd; }
            </style>
            <table class="legend-table">
                <thead>
                    <tr><th>状態</th><th>説明</th></tr>
                </thead>
                <tbody>
        `;
        legendData.forEach(item => {
            tableHtml += `<tr><td><strong>${item.status}</strong></td><td>${item.desc}</td></tr>`;
        });
        tableHtml += `</tbody></table>` + notes;

        content.innerHTML = tableHtml;

        const footer = document.createElement('div');
        footer.className = 'rcb-modal-footer';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'rcb-modal-btn rcb-modal-btn-cancel';
        closeBtn.textContent = '閉じる';
        closeBtn.onclick = () => document.body.removeChild(overlay);

        footer.appendChild(closeBtn);

        box.appendChild(header);
        box.appendChild(content);
        box.appendChild(footer);
        overlay.appendChild(box);

        overlay.onclick = (e) => {
            if (e.target === overlay) document.body.removeChild(overlay);
        };

        document.body.appendChild(overlay);
        setTimeout(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'translateY(0)';
        }, 10);
    }
})();
