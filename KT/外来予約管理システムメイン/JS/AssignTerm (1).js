(() => {
    'use strict';

    let cachedRecords = []; 
    let allRecordsCache = []; // 全レコード（期間重複チェック用）
    let dropdownCounts = {};
    let isProcessing = false;

    // スケジュールフィールドの定義
    const days = ['月', '火', '水', '木', '金', '土'];
    const weeks = ['1', '2', '3', '4', '5'];
    const scheduleFields = days.flatMap(d => weeks.map(w => d + w));

    // --- ツールチップ制御用変数・関数 ---
    let tooltipEl = null;

    const getTooltipElement = () => {
        if (!tooltipEl) {
            tooltipEl = document.getElementById('customHtmlTooltip');
            if (!tooltipEl) {
                tooltipEl = document.createElement('div');
                tooltipEl.id = 'customHtmlTooltip';
                // ShinryoViewer.jsのスタイルが適用されるはずだが、念のため最低限のスタイルを設定
                tooltipEl.style.display = 'none';
                tooltipEl.style.position = 'absolute';
                tooltipEl.style.backgroundColor = '#fff';
                tooltipEl.style.border = '1px solid #ccc';
                tooltipEl.style.boxShadow = '2px 2px 8px rgba(0,0,0,0.3)';
                tooltipEl.style.padding = '10px';
                tooltipEl.style.zIndex = '10000';
                tooltipEl.style.borderRadius = '4px';
                tooltipEl.style.color = '#333';
                tooltipEl.style.textAlign = 'left';
                document.body.appendChild(tooltipEl);
            }
            // 幅を固定して比較しやすくする（CSSのmax-widthを上書き）
            tooltipEl.style.width = '700px';
            tooltipEl.style.maxWidth = 'none';
        }
        return tooltipEl;
    };

    // HTMLタグ除去ヘルパー
    const stripHtml = (html) => { const t = document.createElement('div'); t.innerHTML = html || ''; return t.textContent || t.innerText || ''; };

    // ShinryoViewer.js と同等のHTML生成関数
    const createScheduleTableHtml = (rec, isMerged = false, commonSettings = null) => {
        const days = ['月','火','水','木','金','土'];
        
        // 案内文の収集
        const uniqueGuidances = new Set();
        if (rec._scheduleInfo) {
            ['1','2','3','4','5'].forEach(w => {
                days.forEach((d) => {
                    const field = `${d}${w}`;
                    if (rec._scheduleInfo[field]) {
                        const infoList = rec._scheduleInfo[field];
                        infoList.forEach(item => {
                            if (item.guidance && stripHtml(item.guidance).trim() !== '') {
                                uniqueGuidances.add(item.guidance);
                            }
                        });
                    }
                });
            });
        }

        // ヘッダー表示形式: [診療科] [医師名]
        const department = rec['診療科']?.value || '';
        const doctor = rec['医師名']?.value || '';
        let headerText = `${department}　${doctor}`;

        // 案内アイコンをタイトルに追加
        if (uniqueGuidances.size > 0) {
            const noteHtml = Array.from(uniqueGuidances).join('<hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;">');
            const encodedHtml = encodeURIComponent(noteHtml);
            // ShinryoApp.Viewer が存在する場合のみクリックイベントを設定
            const onclickAttr = (window.ShinryoApp && window.ShinryoApp.Viewer) 
                ? `onclick="event.stopPropagation(); window.ShinryoApp.Viewer.showContentDialog('医師案内', decodeURIComponent('${encodedHtml}'))"`
                : '';
            headerText += ` <span class="icon-note" style="cursor:pointer; font-size:1.2em;" ${onclickAttr}>ℹ️</span>`;
        }

        let html = `<div style="text-align:left;font-size:14px;font-weight:bold;color:#666;margin-bottom:2px;">月間担当パターン</div>`;
        html += `<div style="text-align:center;font-weight:bold;margin-bottom:5px;font-size:16px;color:#333;">${headerText}</div>`;
        html += `<table class="schedule-table" style="table-layout: fixed; width: 100%;"><colgroup><col style="width: 50px;"><col><col><col><col><col><col></colgroup><thead><tr><th></th>`;
        days.forEach(d => html += `<th>${d}</th>`);
        html += `</tr></thead><tbody>`;

        const facilities = commonSettings ? (commonSettings.facilities || []) : [];

        ['1','2','3','4','5'].forEach(w => {
            html += `<tr><th>第${w}週</th>`;
            days.forEach((d) => {
                const field = `${d}${w}`;
                let cellContent = '';
                let cellClass = '';
                
                if (rec._scheduleInfo && rec._scheduleInfo[field]) {
                    const infoList = rec._scheduleInfo[field];
                    if (infoList.length > 0) {
                        const amParts = [];
                        const pmParts = [];
                        
                        infoList.forEach(sch => {
                            const defaultColors = ['#007bff', '#28a745', '#e67e22', '#9b59b6', '#e74c3c'];
                            const facObj = facilities.find(f => f.name === sch.facility);
                            let symbolHtml = '';
                            let selectionHtml = '';
                            
                            if (facObj && facilities.length > 1) {
                                const facIdx = facilities.findIndex(f => f.name === sch.facility);
                                const color = facObj.color || (facIdx >= 0 ? defaultColors[facIdx % defaultColors.length] : '#333');
                                const sym = facObj.shortName || '●';
                                symbolHtml = `<span style="color:${color};font-weight:bold;margin-left:2px;margin-right:2px;font-size:1.2em;">${sym}</span>`;
                            }
                            
                            if (sch.selection) {
                                selectionHtml = `<div style="font-size:0.65em;color:#003366;line-height:1.1;margin-top:1px;">${sch.selection}</div>`;
                            }

                            if (sch.times.includes('午前')) amParts.push({ symbol: symbolHtml, selection: selectionHtml });
                            if (sch.times.includes('午後')) pmParts.push({ symbol: symbolHtml, selection: selectionHtml });
                        });

                        const buildContent = (label, parts) => {
                            if (parts.length === 0) return '';
                            const symbols = parts.map(p => p.symbol).join('');
                            const selections = parts.map(p => p.selection).join('');
                            return `<div style="display:flex; flex-direction:column; align-items:center; width:100%;">
                                <div><span style="font-size:0.8em; margin-right:2px; color:#666;">${label}</span>${symbols}</div>
                                ${selections}
                            </div>`;
                        };

                        const amStyle = amParts.length > 0 ? 'background-color:#e0f7fa;' : '';
                        const pmStyle = pmParts.length > 0 ? 'background-color:#fff3e0;' : '';
                        
                        const amContent = buildContent('午前', amParts);
                        const pmContent = buildContent('午後', pmParts);
                        
                        cellContent = `<div style="display:flex; flex-direction:column; height:100%; min-height:50px;">
                            <div style="flex:1 1 0; border-bottom:1px dashed #ccc; padding:2px; display:flex; align-items:center; justify-content:center; ${amStyle}">${amContent}</div>
                            <div style="flex:1 1 0; padding:2px; display:flex; align-items:center; justify-content:center; ${pmStyle}">${pmContent}</div>
                        </div>`;
                    }
                }
                html += `<td class="${cellClass}" style="padding:0; height:100%;">${cellContent}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        
        // 凡例追加
        const legendParts = [];
        const defaultColors = ['#007bff', '#28a745', '#e67e22', '#9b59b6', '#e74c3c'];
        if (facilities.length > 1) {
            facilities.forEach((fac, i) => {
                const color = fac.color || defaultColors[i % defaultColors.length];
                const sym = fac.shortName || '●';
                legendParts.push(`<span style="color:${color};font-weight:bold;">${sym}</span>:${fac.name}`);
            });
        }
        if (legendParts.length > 0) {
            html += `<div style="margin-top:8px; font-size:11px; text-align:left; color:#555;">${legendParts.join(' / ')}</div>`;
        }

        return html;
    };

    // 単一レコード用のスケジュール情報構築ヘルパー
    const buildScheduleInfo = (rec, facilities) => {
        const info = {};
        scheduleFields.forEach(f => {
            const val = rec[f]?.value || [];
            if (val.length > 0) {
                let facName = rec['施設名']?.value || '';
                if (facilities) {
                    const found = facilities.find(fac => facName.includes(fac.name));
                    if (found) facName = found.name;
                }
                info[f] = [{
                    times: val,
                    facility: facName,
                    selection: rec['診療選択']?.value || '',
                    guidance: rec['留意案内']?.value || ''
                }];
            }
        });
        return info;
    };

    // スタイル適用および件数表示のメイン処理
    const applyPeriodStyling = (commonSettings) => {
        // 無限ループ防止
        if (isProcessing) return;
        isProcessing = true;

        const records = cachedRecords;
        if (!records || records.length === 0) {
            isProcessing = false;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // -------------------------------------------------------
        // 1. ヘッダー行のスタイル適用（ご提示のコードベース）
        // -------------------------------------------------------
        const headerCells = document.querySelectorAll('.recordlist-header-cell-gaia');
        headerCells.forEach((th) => {
            th.style.setProperty('background-color', '#000000', 'important');
            th.style.setProperty('color', '#ffffff', 'important');
            th.style.borderBottom = '1px solid #cccccc';
            th.style.borderTop = '1px solid #cccccc';
            th.style.setProperty('text-align', 'center', 'important');

            const inners = th.querySelectorAll('.recordlist-header-cell-inner-wrapper-gaia, .recordlist-header-cell-inner-gaia, .recordlist-header-label-gaia');
            inners.forEach((inner) => {
                inner.style.setProperty('color', '#ffffff', 'important');
                inner.style.setProperty('background-color', 'transparent', 'important');
                inner.style.setProperty('display', 'flex', 'important');
                inner.style.setProperty('justify-content', 'center', 'important');
                inner.style.setProperty('align-items', 'center', 'important');
                inner.style.setProperty('text-align', 'center', 'important');
                inner.style.setProperty('width', '100%', 'important');
            });
        });

        // -------------------------------------------------------
        // 2. 各レコード行の処理（ご提示のロジックを復元・統合）
        // -------------------------------------------------------
        
        // 行特定のための要素取得
        let elRows = kintone.app.getFieldElements('着任日');
        if (!elRows || elRows.length === 0) {
            elRows = document.querySelectorAll('.recordlist-show-gaia');
        }

        // 個別処理用のフィールド要素取得
        const elConnect = kintone.app.getFieldElements('集合');
        const elPublish = kintone.app.getFieldElements('掲載'); // 医師受付

        if (!elRows || elRows.length === 0) {
            isProcessing = false;
            return;
        }

        // --- 競合チェック用のヘルパー関数 ---
        const getScheduleSet = (rec) => {
            const set = new Set();
            scheduleFields.forEach(field => {
                const val = rec[field]?.value || [];
                if (val.includes('午前')) set.add(`${field}_AM`);
                if (val.includes('午後')) set.add(`${field}_PM`);
            });
            return set;
        };

        const checkConflict = (currentRec) => {
            const currentTag = currentRec['集合'] ? currentRec['集合'].value : '';
            if (!currentTag) return { isConflict: false }; // タグなしは競合しない

            const currentId = currentRec['$id'].value;
            const currentStart = currentRec['着任日']?.value ? new Date(currentRec['着任日'].value).getTime() : -8640000000000000;
            const currentEnd = currentRec['離任日']?.value ? new Date(currentRec['離任日'].value).getTime() : 8640000000000000;
            const currentSchedule = getScheduleSet(currentRec);

            // 同じタグを持つ他レコードとの期間重複をチェック
            const conflicts = allRecordsCache.filter(other => {
                if (other['$id'].value === currentId) return false;
                if ((other['集合']?.value || '') !== currentTag) return false;

                const otherStart = other['着任日']?.value ? new Date(other['着任日'].value).getTime() : -8640000000000000;
                const otherEnd = other['離任日']?.value ? new Date(other['離任日'].value).getTime() : 8640000000000000;

                // 1. 期間重複判定
                const isPeriodOverlap = (currentStart <= otherEnd && currentEnd >= otherStart);
                if (!isPeriodOverlap) return false;

                // 2. 時間割重複判定
                const otherSchedule = getScheduleSet(other);
                for (let slot of currentSchedule) {
                    if (otherSchedule.has(slot)) {
                        other._tempConflictType = '期間・時間割重複';
                        return true;
                    }
                }
                return false;
            });

            return {
                isConflict: conflicts.length > 0,
                details: conflicts.map(c => `ID:${c['$id'].value}(${c._tempConflictType})`).join(', ')
            };
        };

        records.forEach((record, index) => {
            const startDateStr = record['着任日'] ? record['着任日'].value : null;
            const endDateStr = record['離任日'] ? record['離任日'].value : null;

            const startDate = startDateStr ? new Date(startDateStr) : null;
            const endDate = endDateStr ? new Date(endDateStr) : null;
            
            if (startDate && !isNaN(startDate.getTime())) startDate.setHours(0, 0, 0, 0);
            if (endDate && !isNaN(endDate.getTime())) endDate.setHours(0, 0, 0, 0);

            // ステータス判定
            let status = 'valid';
            const conflictInfo = checkConflict(record);

            if (startDate && endDate && startDate > endDate) {
                status = 'invalid';
            } 
            else if (startDate && today < startDate) {
                status = 'future';
            }
            else if (endDate && today > endDate) {
                status = 'departed';
            }

            // --- A. ベースカラーの決定 ---
            let rowColor = '#fffaf0'; // 有効：薄い黄色
            
            if (conflictInfo.isConflict) {
                rowColor = '#ffcccc'; // 衝突：赤色（警告）
            } else if (status === 'departed' || status === 'invalid') {
                rowColor = '#a0a0a0'; // 離任・矛盾：濃い灰色
            } else if (status === 'future') {
                rowColor = '#00bfff'; // 予定：薄い青（変更点）
            }

            // --- B. 行全体へのスタイル適用 ---
            // 以前のコード同様、要素から親のtrを探して適用
            const targetCellEl = elRows[index];
            if (targetCellEl) {
                const row = targetCellEl.closest('tr');
                if (row) {
                    Array.from(row.children).forEach((cell) => {
                        cell.style.color = '#000000';
                        cell.style.borderBottom = '1px solid #cccccc'; 
                        cell.style.borderTop = '1px solid #cccccc';
                        cell.style.backgroundColor = rowColor; // 行全体を塗る
                    });
                }
            }

            // --- C. 「医師受付」停止時の上書き処理 ---
            // ※行全体を塗った後に、特定のセルだけ上書きする
            if (elPublish && elPublish[index]) {
                const publishVal = record['掲載'] ? record['掲載'].value : '';
                if (publishVal === '停止') {
                    const pubCell = elPublish[index].closest('td');
                    if (pubCell) {
                        // ここだけは確実に上書きするためimportantを使用
                        pubCell.style.setProperty('background-color', '#ffff00', 'important');
                    }
                }
            }

            // --- D. 集合列への件数付記 ---
            if (elConnect && elConnect[index]) {
                const connectVal = record['集合'] ? record['集合'].value : '';
                const cellInner = elConnect[index].querySelector('span') || elConnect[index];
                
                // 既存の要素を取得
                const existing = cellInner.querySelector('.custom-cell-count');
                const hasValue = connectVal && connectVal.trim() !== '';

                if (!hasValue) {
                    if (existing) existing.remove();
                } else if (dropdownCounts[connectVal] !== undefined) {
                    if (!existing) {
                        const countSpan = document.createElement('span');
                        countSpan.className = 'custom-cell-count';
                        countSpan.innerText = ` ${dropdownCounts[connectVal]}`;
                        countSpan.style.fontSize = '12px';
                        countSpan.style.marginLeft = '0px';
                        countSpan.style.fontWeight = 'bold';
                        countSpan.style.pointerEvents = 'none';
                        cellInner.appendChild(countSpan);
                    }
                }

                // 競合時のツールチップ表示
                if (conflictInfo.isConflict) {
                    elConnect[index].title = `【設定エラー】\n他のレコードと期間および時間割が重複しています。\n競合レコード: ${conflictInfo.details}`;
                    if (elConnect[index].style) {
                        elConnect[index].style.cursor = 'help';
                    }
                }
            }

            // --- E. 行ホバー時のツールチップ表示 (担当パターン) ---
            if (targetCellEl) {
                const row = targetCellEl.closest('tr');
                if (row) {
                    // 全レコードキャッシュから詳細情報（スケジュール）を取得
                    const fullRecord = allRecordsCache.find(r => r.$id.value === record.$id.value);
                    if (fullRecord) {
                        row.onclick = (e) => {
                            // ツールチップ表示用に _scheduleInfo を構築
                            fullRecord._scheduleInfo = buildScheduleInfo(fullRecord, commonSettings ? commonSettings.facilities : []);
                            const tip = getTooltipElement();
                            tip.innerHTML = createScheduleTableHtml(fullRecord, false, commonSettings);
                            tip.style.display = 'block';
                            tip.style.top = (e.pageY + 15) + 'px';
                            tip.style.left = (e.pageX + 15) + 'px';
                        };
                        row.onmousemove = (e) => {
                            const tip = getTooltipElement();
                            if (tip.style.display === 'block') {
                                tip.style.top = (e.pageY + 15) + 'px';
                                tip.style.left = (e.pageX + 15) + 'px';
                            }
                        };
                        row.onmouseleave = () => {
                            const tip = getTooltipElement();
                            tip.style.display = 'none';
                        };
                    }
                }
            }
        });

        isProcessing = false;
    };

    // -------------------------------------------------------
    // 集計・ドロップダウン制御 (新機能部分)
    // -------------------------------------------------------
    const fetchAllRecordsCounts = (opt_offset, opt_records) => {
        const offset = opt_offset || 0;
        let allRecords = opt_records || [];

        // ★追加: 3ヶ月前の日付を計算
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        const threeMonthsAgoStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        // 離任日が3ヶ月前より新しい、または未設定（現職）のレコードのみ取得
        const queryCondition = `(離任日 >= "${threeMonthsAgoStr}" or 離任日 = "")`;
        
        return kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
            app: kintone.app.getId(),
            query: `${queryCondition} limit 500 offset ${offset}`,
            fields: ['$id', '集合', '着任日', '離任日', '施設名', '診療科', '診療選択', '医師名', ...scheduleFields] // 競合チェックに必要な全フィールドを取得
        }).then((resp) => {
            allRecords = allRecords.concat(resp.records);
            if (resp.records.length === 500) {
                return fetchAllRecordsCounts(offset + 500, allRecords);
            }
            allRecordsCache = allRecords; // 全レコードをキャッシュ
            const counts = {};
            allRecords.forEach(rec => {
                const val = rec['集合'] ? rec['集合'].value : null;
                if (val && val.trim() !== '') {
                    counts[val] = (counts[val] || 0) + 1;
                }
            });
            dropdownCounts = counts;
            return dropdownCounts;
        });
    };

    const setupDropdownObserver = () => {
        const observer = new MutationObserver(() => {
            const items = document.querySelectorAll('.goog-menuitem-content');
            if (items.length === 0) return;

            items.forEach(item => {
                if (item.querySelector('.custom-dropdown-count')) return;
                const baseText = item.innerText.trim();
                
                if (baseText && baseText !== '' && dropdownCounts[baseText] !== undefined) {
                    const span = document.createElement('span');
                    span.className = 'custom-dropdown-count';
                    span.innerText = ` ${dropdownCounts[baseText]}`;
                    span.style.fontSize = '10px';
                    span.style.color = '#888';
                    span.style.marginLeft = '5px';
                    item.appendChild(span);
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    // -------------------------------------------------------
    // 統合スケジュール表示ロジック (新規追加)
    // -------------------------------------------------------
    const renderMergedSchedule = (records, commonSettings) => {
        const containerId = 'merged-schedule-container';
        let container = document.getElementById(containerId);
        
        // レコードがない、または医師名が一意でない場合は非表示にして終了
        if (!records || records.length === 0) {
            if (container) container.style.display = 'none';
            return;
        }

        const doctorNames = new Set(records.map(r => r['医師名'].value).filter(n => n));
        if (doctorNames.size !== 1) {
            if (container) container.style.display = 'none';
            return;
        }

        // コンテナがなければ作成
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.style.marginTop = '20px';
            container.style.padding = '20px';
            container.style.backgroundColor = '#f9f9f9';
            container.style.border = '1px solid #ddd';
            container.style.borderRadius = '5px';
            container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
            
            // 挿入位置：一覧表の下（ページャーの下あたり）
            const pager = document.querySelector('.gaia-argoui-app-index-pager');
            if (pager && pager.parentNode) {
                pager.parentNode.insertBefore(container, pager.nextSibling);
            } else {
                const main = document.querySelector('.gaia-argoui-app-index-contents');
                if (main) main.appendChild(container);
            }
        }
        container.style.display = 'block';
        container.innerHTML = ''; // クリア

        const doctorName = Array.from(doctorNames)[0];

        // マージレコード作成
        const facilities = commonSettings ? (commonSettings.facilities || []) : [];
        const mergedRec = {
            '施設名': { value: Array.from(new Set(records.map(r => r['施設名'].value).filter(v => v))).join(', ') },
            '診療科': { value: Array.from(new Set(records.map(r => r['診療科'].value).filter(v => v))).join(', ') },
            '診療選択': { value: Array.from(new Set(records.map(r => r['診療選択'].value).filter(v => v))).join(', ') },
            '医師名': { value: doctorName },
            '_scheduleInfo': {}
        };

        scheduleFields.forEach(field => {
            const values = new Set();
            const infoList = [];
            records.forEach(r => {
                const val = r[field]?.value || [];
                if (val.length > 0) {
                    let facName = r['施設名']?.value || '';
                    if (facilities) {
                        const found = facilities.find(fac => facName.includes(fac.name));
                        if (found) facName = found.name;
                    }
                    infoList.push({
                        times: val,
                        facility: facName,
                        selection: r['診療選択']?.value || '',
                        guidance: r['留意案内']?.value || ''
                    });
                }
                val.forEach(v => values.add(v));
            });
            if (infoList.length > 0) {
                mergedRec._scheduleInfo[field] = infoList;
            }
            mergedRec[field] = { value: Array.from(values) };
        });

        // タイトル
        const title = document.createElement('h3');
        title.textContent = `${doctorName} 医師の月間診療曜日パターン`;
        title.style.margin = '0 0 15px 0';
        title.style.fontSize = '16px';
        title.style.color = '#333';
        title.style.borderBottom = '2px solid #3498db';
        title.style.paddingBottom = '5px';
        title.style.display = 'inline-block';
        container.appendChild(title);

        // スケジュール表
        const content = document.createElement('div');
        content.innerHTML = createScheduleTableHtml(mergedRec, true, commonSettings);
        // 背景色を白にして見やすく
        const table = content.querySelector('table');
        if (table) table.style.backgroundColor = '#fff';
        
        container.appendChild(content);

        // 幅調整: 下の一覧表に合わせる
        const listTable = document.querySelector('.recordlist-gaia');
        if (listTable) {
            container.style.width = listTable.offsetWidth + 'px';
            container.style.boxSizing = 'border-box';
            container.style.marginLeft = '0';
            container.style.marginRight = '0';
        }
    };

    // -------------------------------------------------------
    // イベント定義
    // -------------------------------------------------------
    kintone.events.on('app.record.index.show', (event) => {
        cachedRecords = event.records;
        
        fetchAllRecordsCounts().then(() => {
            // ConfigManagerから共通設定を取得
            if (window.ShinryoApp && window.ShinryoApp.ConfigManager) {
                return window.ShinryoApp.ConfigManager.fetchPublishedData().then(data => data.commonSettings || {});
            }
            return {};
        }).then((commonSettings) => {
            applyPeriodStyling(commonSettings);
            setupDropdownObserver();
            renderMergedSchedule(cachedRecords, commonSettings);
        });

        const target = document.querySelector('.recordlist-contents-gaia') || document.body;
        const observer = new MutationObserver((mutations) => {
            // 無限ループ防止フラグがあるため、DOM変化時は単純に再実行
            if (mutations.some(m => m.type === 'childList')) {
                // 設定はキャッシュしていないため、再取得はコストがかかるが、簡易的にnullで呼ぶか再取得するか
                // ここでは簡易的に再実行（設定なし＝デフォルト色）になる可能性があるが、頻度を考慮して許容
                applyPeriodStyling(null); 
            }
        });
        observer.observe(target, { childList: true, subtree: true });

        return event;
    });

    kintone.events.on('app.record.index.edit.submit.success', (event) => {
        setTimeout(() => {
            const appId = kintone.app.getId();
            const query = kintone.app.getQuery();
            
            kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                app: appId,
                query: query
            }).then((resp) => {
                cachedRecords = resp.records;
                return fetchAllRecordsCounts();
            }).then(() => { 
                if (window.ShinryoApp && window.ShinryoApp.ConfigManager) {
                    return window.ShinryoApp.ConfigManager.fetchPublishedData().then(data => data.commonSettings || {});
                }
                return {};
            }).then((commonSettings) => {
                applyPeriodStyling(commonSettings);
                renderMergedSchedule(cachedRecords, commonSettings);
            });
        }, 500);
        return event;
    });

})();