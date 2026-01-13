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

    const createScheduleTableHtml = (rec) => {
        const facility = rec['施設名']?.value || '';
        const department = rec['診療科']?.value || '';
        const selection = rec['診療選択']?.value || ''; 
        const doctor = rec['医師名']?.value || '';
        // タイトルをFlexbox化し、フォントサイズを調整して長文に対応
        let html = `<div style="text-align:center;font-weight:bold;margin-bottom:10px;font-size:16px;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;"><span>${facility}</span><span>${department}</span>${selection ? `<span>${selection}</span>` : ''} <span>${doctor}</span></div>`;
        html += `<table class="schedule-table" style="table-layout: fixed; width: 100%;"><colgroup><col style="width: 50px;"><col><col><col><col><col><col></colgroup><thead><tr><th></th>`;
        days.forEach(d => html += `<th>${d}</th>`);
        html += `</tr></thead><tbody>`;
        weeks.forEach(w => {
            html += `<tr><th>第${w}</th>`;
            days.forEach(d => {
                const v = rec[`${d}${w}`]?.value || [];
                let cls = '', txt = '';
                if(v.includes('午前') && v.includes('午後')) { cls='schedule-allday'; txt='終日'; }
                else if(v.includes('午前')) { cls='schedule-am'; txt='午前'; }
                else if(v.includes('午後')) { cls='schedule-pm'; txt='午後'; }
                html += `<td class="${cls}">${txt}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        return html;
    };

    // スタイル適用および件数表示のメイン処理
    const applyPeriodStyling = () => {
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
                        countSpan.style.marginLeft = '5px';
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
                        row.onmouseenter = (e) => {
                            const tip = getTooltipElement();
                            tip.innerHTML = createScheduleTableHtml(fullRecord);
                            tip.style.display = 'block';
                            tip.style.top = (e.pageY + 15) + 'px';
                            tip.style.left = (e.pageX + 15) + 'px';
                        };
                        row.onmousemove = (e) => {
                            const tip = getTooltipElement();
                            tip.style.top = (e.pageY + 15) + 'px';
                            tip.style.left = (e.pageX + 15) + 'px';
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
        
        return kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
            app: kintone.app.getId(),
            query: `limit 500 offset ${offset}`,
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
    // イベント定義
    // -------------------------------------------------------
    kintone.events.on('app.record.index.show', (event) => {
        cachedRecords = event.records;
        
        fetchAllRecordsCounts().then(() => {
            applyPeriodStyling();
            setupDropdownObserver();
        });

        const target = document.querySelector('.recordlist-contents-gaia') || document.body;
        const observer = new MutationObserver((mutations) => {
            // 無限ループ防止フラグがあるため、DOM変化時は単純に再実行
            if (mutations.some(m => m.type === 'childList')) {
                applyPeriodStyling();
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
                applyPeriodStyling();
            });
        }, 500);
        return event;
    });

})();