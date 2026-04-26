/*
 * StaffFilterButtons.js
 * ページネーション領域に担当者ごとの絞り込みボタンを追加します。
 */
(function() {
    'use strict';

    const STORAGE_KEY_STAFF_FILTER = 'shinryo_staff_filter_selected';
    
    // Kintoneのレコード取得（件数集計用）
    async function fetchRecordsForCount() {
        const appId = kintone.app.getId();
        let allRecords = [];
        let offset = 0;
        const limit = 500;
        
        // 有効/終了のトグル状態を取得（ListToggleFilter.jsとの互換性）
        const toggleMode = localStorage.getItem('shinryo_ticket_status_filter') || 'active';
        const baseCondition = toggleMode === 'active' ? '管理状況 not in ("終了", "強制終了")' : '管理状況 in ("終了", "強制終了")';
        
        const searchText = sessionStorage.getItem('shinryo_ticket_search_chart_no') || '';
        let searchCondition = '';
        if (searchText) {
            searchCondition = ` and (カルテNo like "${searchText}" or 姓漢字 like "${searchText}" or 名漢字 like "${searchText}" or 姓かな like "${searchText}" or 名かな like "${searchText}")`;
        }

        while (true) {
            const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', { 
                app: appId, 
                query: `${baseCondition}${searchCondition} limit ${limit} offset ${offset}`,
                fields: ['担当者', '管理状況']
            });
            allRecords = allRecords.concat(resp.records);
            if (resp.records.length < limit) break;
            offset += limit;
        }
        return allRecords;
    }

    // フィルターの適用（リダイレクト）
    function applyStaffFilter(staffName) {
        localStorage.setItem(STORAGE_KEY_STAFF_FILTER, staffName);
        
        // 有効/終了のトグル状態を取得（ListToggleFilter.jsとの互換性）
        const toggleMode = localStorage.getItem('shinryo_ticket_status_filter') || 'active';
        const baseCondition = toggleMode === 'active' ? '管理状況 not in ("終了", "強制終了")' : '管理状況 in ("終了", "強制終了")';

        const searchText = sessionStorage.getItem('shinryo_ticket_search_chart_no') || '';
        let searchCondition = '';
        if (searchText) {
            searchCondition = ` and (カルテNo like "${searchText}" or 姓漢字 like "${searchText}" or 名漢字 like "${searchText}" or 姓かな like "${searchText}" or 名かな like "${searchText}")`;
        }
        
        let staffCondition = '';
        if (staffName !== '全担当') {
            // 選択した担当者（他の担当者ボタンの場合はその他担当者） ＋ 未着手
            staffCondition = ` and (担当者 in ("${staffName}") or 管理状況 in ("未着手"))`;
        }

        // 未着手を上にするためのソート（文字コード順を利用して暫定的にdesc指定）
        const orderClause = 'order by 管理状況 desc, 更新日時 desc';
        const newQuery = `${baseCondition}${searchCondition}${staffCondition} ${orderClause}`;

        const url = new URL(window.location.href);
        url.searchParams.set('query', newQuery);
        window.location.href = url.toString();
    }

    kintone.events.on('app.record.index.show', async function(event) {
        if (document.getElementById('custom-staff-filter-container')) return event;

        const pager = document.querySelector('.gaia-argoui-app-index-pager');
        const pagerContent = document.querySelector('.gaia-argoui-app-index-pager-content');
        if (!pager || !pagerContent) return event;

        // 端末の担当者（自分）を取得
        const currentStaff = localStorage.getItem('shinryo_ticket_staff_name') || localStorage.getItem('customKey') || '';
        
        // 現在選択中のフィルターを取得（初期値は自分、設定されていなければ全担当）
        let selectedFilter = localStorage.getItem(STORAGE_KEY_STAFF_FILTER);
        if (!selectedFilter) {
            selectedFilter = currentStaff ? currentStaff : '全担当';
            localStorage.setItem(STORAGE_KEY_STAFF_FILTER, selectedFilter);
            // 初回アクセス時は自動でフィルターを適用してリロード
            applyStaffFilter(selectedFilter);
            return event; 
        }

        // --- スタッフリストと担当件数の集計 ---
        let staffList = [];
        
        // ConfigManagerのロード待機
        const waitForConfigManager = async () => {
            if (window.ShinryoApp && window.ShinryoApp.ConfigManager) return true;
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 200));
                if (window.ShinryoApp && window.ShinryoApp.ConfigManager) return true;
            }
            return false;
        };
        await waitForConfigManager();

        try {
            if (window.ShinryoApp && window.ShinryoApp.ConfigManager) {
                const data = await window.ShinryoApp.ConfigManager.fetchPublishedData();
                if (data && data.commonSettings && Array.isArray(data.commonSettings.staffs)) {
                    staffList = data.commonSettings.staffs.map(s => s.name);
                }
            }
        } catch(e) { console.warn(e); }

        // 設定から取得できなかった場合はローカルストレージを確認（フォールバック）
        if (staffList.length === 0) {
            try {
                const localStaffs = JSON.parse(localStorage.getItem('shinryo_common_staffs') || '[]');
                if (Array.isArray(localStaffs)) {
                    staffList = localStaffs.map(s => s.name);
                }
            } catch(e) {}
        }
        
        // 端末の担当者（自分）も確実にリストに含める
        if (currentStaff && !staffList.includes(currentStaff)) {
            staffList.push(currentStaff);
        }

        const targetRecords = await fetchRecordsForCount();
        const counts = {};
        let totalCount = 0;
        targetRecords.forEach(r => {
            const staff = r['担当者']?.value;
            const status = r['管理状況']?.value;
            if (staff) counts[staff] = (counts[staff] || 0) + 1;
            if (status !== '未着手') totalCount++;
        });

        // 設定から取得できなかった場合や、レコードには存在する担当者（絵文字付きなど）を補完
        Object.keys(counts).forEach(staff => {
            if (!staffList.includes(staff)) {
                staffList.push(staff);
            }
        });

        // スタッフを件数の多い順にソート
        const sortedStaffs = staffList.filter(s => s).sort((a, b) => {
            const countA = counts[a] || 0;
            const countB = counts[b] || 0;
            return countB - countA; // 降順
        });

        // --- UI構築 ---
        pager.style.display = 'flex';
        pager.style.justifyContent = 'space-between';
        pager.style.alignItems = 'center';
        pager.style.padding = '5px 10px';
        
        // 既存のページネーション要素のレイアウト調整
        pagerContent.style.marginLeft = 'auto'; 
        pagerContent.style.flexShrink = '0';
        pagerContent.style.minWidth = 'max-content'; // ページネーション領域を不動の優先領域として保護
        pagerContent.style.whiteSpace = 'nowrap'; // 折り返しを強制防止

        const container = document.createElement('div');
        container.id = 'custom-staff-filter-container';
        // Flexアイテムが親の幅を押し広げないように min-width: 0 を設定し、maxWidthで厳格に領域を保護する
        container.style.cssText = 'display: flex; gap: 8px; flex: 1; min-width: 0; overflow: visible; align-items: center; position: relative; box-sizing: border-box;';

        // ボタンスタイル生成関数
        const createBtn = (name, count, isSelected) => {
            const btn = document.createElement('button');
            btn.className = 'staff-filter-btn';
            
            let text = `${name} (${count || 0})`;
            btn.textContent = text;
            
            // 角がややRがある長方形ボタンのデザイン
            btn.style.cssText = `
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: bold;
                border: 1px solid #ccc;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            `;
            
            if (isSelected) {
                // 選択中（ハイライト）
                btn.style.backgroundColor = '#3498db';
                btn.style.color = '#fff';
                btn.style.borderColor = '#2980b9';
            } else {
                // 未選択
                btn.style.backgroundColor = '#f8f9fa';
                btn.style.color = '#555';
                btn.onmouseover = () => btn.style.backgroundColor = '#e9ecef';
                btn.onmouseout = () => btn.style.backgroundColor = '#f8f9fa';
            }

            btn.onclick = () => {
                if (selectedFilter !== name) applyStaffFilter(name);
            };
            return btn;
        };

        // 全担当ボタン (最左端)
        const allBtn = createBtn('全担当', totalCount, selectedFilter === '全担当');
        container.appendChild(allBtn);

        // スタッフボタンをコンテナに追加
        const staffBtns = [];
        sortedStaffs.forEach(staff => {
            const count = counts[staff] || 0;
            const btn = createBtn(staff, count, selectedFilter === staff);
            container.appendChild(btn);
            staffBtns.push(btn);
        });

        // --- (+) 展開ボタンとドロップダウンの構築 ---
        const moreWrapper = document.createElement('div');
        // absoluteを解除し、通常のFlexアイテムとしてボタンのすぐ横に並べる
        moreWrapper.style.cssText = 'position: relative; display: none;';
        
        const moreBtn = document.createElement('button');
        moreBtn.textContent = '＋';
        moreBtn.style.cssText = `
            padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold;
            background-color: #fff; border: 1px solid #ccc; color: #555; cursor: pointer;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        `;
        
        const dropdown = document.createElement('div');
        dropdown.style.cssText = `
            position: absolute; bottom: 100%; right: 0; margin-bottom: 5px;
            background: #fff; border: 1px solid #ccc; border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none;
            flex-direction: column; min-width: 150px; z-index: 1000;
            padding: 5px 0; max-height: 300px; overflow-y: auto;
        `;
        
        moreWrapper.appendChild(moreBtn);
        moreWrapper.appendChild(dropdown);
        container.appendChild(moreWrapper);

        // ドロップダウンの開閉制御
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
        };
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
        dropdown.onclick = (e) => e.stopPropagation();

        pager.insertBefore(container, pager.firstChild);

        // --- 表示領域に合わせたボタンの折りたたみ制御 ---
        function adjustButtons() {
            // 1. 各ボタンの幅を事前にキャッシュする
            let allBtnWidth = allBtn.dataset.width ? parseInt(allBtn.dataset.width, 10) : allBtn.offsetWidth;
            if (!allBtn.dataset.width) allBtn.dataset.width = allBtnWidth;
            
            staffBtns.forEach(btn => {
                if (!btn.dataset.width) {
                    btn.style.display = 'inline-block';
                    btn.dataset.width = btn.offsetWidth;
                }
            });

            // 2. コンテナを一旦非表示にして、ページネーション領域の本来の幅を正確に計測する
            container.style.display = 'none';

            // 強制リフローによる正確な幅取得
            const totalWidth = pager.clientWidth;
            const pagerContentWidth = pagerContent.offsetWidth;

            // 3. コンテナを表示状態に戻す
            container.style.display = 'flex';
            
            // 全体幅から、右側のページネーション幅と安全マージン（左右のpadding等）を引いた幅
            const availableWidth = totalWidth - pagerContentWidth - 30;
            
            // コンテナの最大幅を固定し、ページネーション領域への侵入を物理的にブロック
            container.style.maxWidth = Math.max(0, availableWidth) + 'px';
            
            dropdown.innerHTML = '';
            
            // ＋ボタンの表示スペース（約50px）を考慮した限界幅
            const maxButtonsWidth = Math.max(0, availableWidth - 50);

            let currentWidth = allBtnWidth + 8; // 全担当ボタン幅 + gap
            let hiddenCount = 0;

            staffBtns.forEach(btn => {
                // キャッシュしておいた幅を使って論理的に計算
                const btnWidth = parseInt(btn.dataset.width, 10) + 8;

                if (currentWidth + btnWidth > maxButtonsWidth) {
                    // 入り切らないボタンをドロップダウンに移動
                    btn.style.display = 'none';
                    
                    // ドロップダウン用のメニューアイテムを作成
                    const menuItem = document.createElement('div');
                    menuItem.textContent = btn.textContent;
                    
                    // 選択状態のスタイル
                    if (btn.style.backgroundColor === 'rgb(52, 152, 219)' || btn.style.backgroundColor === '#3498db') { // ハイライト色
                        menuItem.style.backgroundColor = '#3498db';
                        menuItem.style.color = '#fff';
                    } else {
                        menuItem.style.backgroundColor = 'transparent';
                        menuItem.style.color = '#333';
                        menuItem.onmouseover = () => menuItem.style.backgroundColor = '#f0f0f0';
                        menuItem.onmouseout = () => menuItem.style.backgroundColor = 'transparent';
                    }
                    
                    menuItem.style.cssText += `
                        padding: 8px 15px; font-size: 13px; cursor: pointer; font-weight: bold;
                    `;
                    menuItem.onclick = btn.onclick;
                    dropdown.appendChild(menuItem);
                    hiddenCount++;
                } else {
                    // 入り切る場合は表示して幅を加算
                    btn.style.display = 'inline-block';
                    currentWidth += btnWidth;
                }
            });

            if (hiddenCount > 0) {
                moreWrapper.style.display = 'block';
            } else {
                moreWrapper.style.display = 'none';
            }
        }

        // 初回計算と、ウィンドウリサイズ時の再計算
        adjustButtons();
        window.addEventListener('resize', adjustButtons);

        return event;
    });
})();