/*
 * CrmPatientSearch.js
 * 外来予約患者CRM (App 309) 一覧画面用の患者検索バー
 * 
 * 【特徴】
 * - カルテNo（患者ID）・氏名・かな・電話番号などの「完全な部分一致検索」
 * - 施設接頭辞（142_）や途中番号（例: 142, 1234, 5678）のいずれでも即座にヒット
 * - 全角数字・全角英数・大文字小文字・スペースの有無を自動吸収
 * - ページリロード不要のリアルタイム検索（入力と同時に即時絞り込み）
 * - 検索件数バッジ表示（例: 「3件 該当」「該当なし」）
 * - 画面遷移後も検索状態をセッション保持
 */
(function () {
    'use strict';

    const STORAGE_KEY_SEARCH = 'crm_patient_search_keyword';

    // 文字列の正規化（全角英数→半角、小文字化、スペース除去）
    function normalize(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, function (s) {
                return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
            })
            .toLowerCase()
            .replace(/[\s　\-_/]/g, '');
    }

    // レコードがキーワードに部分一致するか判定
    function isRecordMatch(record, rawKeyword) {
        if (!rawKeyword) return true;
        const target = normalize(rawKeyword);
        if (!target) return true;

        // 1. 患者ID（142_12345678 など）
        const patientId = normalize(record['患者ID']?.value);
        if (patientId.includes(target)) return true;

        // 2. 氏名
        const name = normalize(record['氏名']?.value);
        if (name.includes(target)) return true;

        // 3. かな
        const kana = normalize(record['かな']?.value);
        if (kana.includes(target)) return true;

        // 4. 生年月日
        const dob = normalize(record['生年月日']?.value);
        if (dob.includes(target)) return true;

        // 5. 連絡先記録サブテーブル（電話番号、メール、郵便番号、住所）
        const contacts = record['連絡先記録']?.value || [];
        for (let i = 0; i < contacts.length; i++) {
            const v = contacts[i].value;
            const phone1 = normalize(v['電話番号1']?.value);
            const phone2 = normalize(v['電話番号2']?.value);
            const email = normalize(v['メール1']?.value);
            const zip = normalize(v['郵便番号']?.value);
            const addr = normalize(v['住所']?.value);
            if (phone1.includes(target) || phone2.includes(target) || email.includes(target) || zip.includes(target) || addr.includes(target)) {
                return true;
            }
        }

        // 6. 申込記録サブテーブル（用件、診療科など）
        const applies = record['申込記録']?.value || [];
        for (let j = 0; j < applies.length; j++) {
            const av = applies[j].value;
            const purpose = normalize(av['用件']?.value);
            const dept = normalize(av['診療科']?.value);
            if (purpose.includes(target) || dept.includes(target)) {
                return true;
            }
        }

        return false;
    }

    kintone.events.on('app.record.index.show', function (event) {
        const records = event.records;
        if (!records) return event;

        // 既存コンテナの重複防止
        const existingContainer = document.getElementById('crm-patient-search-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        const headerSpace = kintone.app.getHeaderMenuSpaceElement();
        if (!headerSpace) return event;

        const savedKeyword = sessionStorage.getItem(STORAGE_KEY_SEARCH) || '';

        // --- 検索コンテナの構築 ---
        const container = document.createElement('div');
        container.id = 'crm-patient-search-container';
        container.style.cssText = 'display: inline-flex; align-items: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 30px; padding: 2px 8px 2px 14px; margin-left: 15px; margin-top: 6px; margin-bottom: 6px; vertical-align: middle; box-shadow: 0 1px 3px rgba(0,0,0,0.08); height: 38px; box-sizing: border-box; transition: all 0.2s ease;';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'No・名前・電話で検索';
        searchInput.value = savedKeyword;
        searchInput.style.cssText = 'border: none; outline: none; font-size: 13px; width: 160px; background: transparent; color: #1e293b; margin-right: 4px;';

        // フォーカス時のハイライト
        searchInput.onfocus = function () {
            container.style.borderColor = '#3b82f6';
            container.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
        };
        searchInput.onblur = function () {
            container.style.borderColor = '#cbd5e1';
            container.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        };

        // クリアボタン (✖)
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = '✖';
        clearBtn.title = '検索条件をクリア';
        clearBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; font-size: 12px; padding: 2px 5px; color: #94a3b8; display: ' + (savedKeyword ? 'inline-block' : 'none') + '; margin-right: 4px; transition: color 0.2s;';
        clearBtn.onmouseover = function () { clearBtn.style.color = '#ef4444'; };
        clearBtn.onmouseout = function () { clearBtn.style.color = '#94a3b8'; };

        // 検索ボタン (🔍)
        const searchBtn = document.createElement('button');
        searchBtn.type = 'button';
        searchBtn.id = 'crm-search-btn';
        searchBtn.textContent = '🔍';
        searchBtn.title = '検索';
        searchBtn.style.cssText = 'background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; border: none; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; padding: 5px 12px; transition: opacity 0.2s; display: inline-flex; align-items: center; justify-content: center;';
        searchBtn.onmouseover = function () { searchBtn.style.opacity = '0.85'; };
        searchBtn.onmouseout = function () { searchBtn.style.opacity = '1.0'; };

        // 該当件数バッジ
        const countBadge = document.createElement('span');
        countBadge.id = 'crm-search-count-badge';
        countBadge.style.cssText = 'font-size: 12px; font-weight: bold; margin-left: 10px; padding: 3px 8px; border-radius: 12px; display: none; white-space: nowrap;';

        // --- フィルタリング実行関数 ---
        const applyFilter = function (keyword) {
            const trimmed = (keyword || '').trim();
            if (trimmed) {
                sessionStorage.setItem(STORAGE_KEY_SEARCH, trimmed);
                clearBtn.style.display = 'inline-block';
            } else {
                sessionStorage.removeItem(STORAGE_KEY_SEARCH);
                clearBtn.style.display = 'none';
            }

            // テーブル行の取得
            const fieldElements = kintone.app.getFieldElements('患者ID') || kintone.app.getFieldElements('氏名') || [];
            let matchCount = 0;

            records.forEach(function (rec, idx) {
                const isMatch = isRecordMatch(rec, trimmed);
                if (isMatch) matchCount++;

                let row = null;
                if (fieldElements[idx]) {
                    row = fieldElements[idx].closest('tr');
                } else {
                    const rows = document.querySelectorAll('.recordlist-row-gaia, .recordlist-row');
                    if (rows[idx]) row = rows[idx];
                }

                if (row) {
                    row.style.display = isMatch ? '' : 'none';
                }
            });

            // バッジの表示切り替え
            if (trimmed) {
                countBadge.style.display = 'inline-block';
                if (matchCount > 0) {
                    countBadge.textContent = `${matchCount}件 表示中`;
                    countBadge.style.backgroundColor = '#ecfdf5';
                    countBadge.style.color = '#059669';
                    countBadge.style.border = '1px solid #a7f3d0';
                } else {
                    countBadge.textContent = '該当なし (0件)';
                    countBadge.style.backgroundColor = '#fef2f2';
                    countBadge.style.color = '#dc2626';
                    countBadge.style.border = '1px solid #fecaca';
                }
            } else {
                countBadge.style.display = 'none';
            }
        };

        // 入力時リアルタイムフィルタリング
        searchInput.oninput = function () {
            applyFilter(searchInput.value);
        };

        searchBtn.onclick = function () {
            applyFilter(searchInput.value);
        };

        searchInput.onkeydown = function (e) {
            if (e.key === 'Enter') {
                applyFilter(searchInput.value);
            }
        };

        clearBtn.onclick = function () {
            searchInput.value = '';
            applyFilter('');
            searchInput.focus();
        };

        container.appendChild(searchInput);
        container.appendChild(clearBtn);
        container.appendChild(searchBtn);

        headerSpace.appendChild(container);
        headerSpace.appendChild(countBadge);

        // 初期ロード時に保存キーワードがあれば即時適用
        if (savedKeyword) {
            setTimeout(function () {
                applyFilter(savedKeyword);
            }, 50);
        }

        return event;
    });
})();
