/*
 * PatientSearch.js
 * 一覧画面上部にカルテNoでの患者検索機能を設けます。
 */
(function() {
    'use strict';

    const STORAGE_KEY_SEARCH = 'shinryo_ticket_search_chart_no';
    const STORAGE_KEY_MODE = 'shinryo_ticket_status_filter';
    const STORAGE_KEY_STAFF = 'shinryo_staff_filter_selected';

    kintone.events.on('app.record.index.show', function(event) {
        if (document.getElementById('custom-patient-search-container')) return event;

        const headerSpace = kintone.app.getHeaderMenuSpaceElement();
        if (!headerSpace) return event;

        const container = document.createElement('div');
        container.id = 'custom-patient-search-container';
        // 他のヘッダーUIと馴染むデザイン
        container.style.cssText = 'display: inline-flex; align-items: center; background: #fff; border: 1px solid #ccc; border-radius: 40px; padding: 4px 15px; margin-left: 15px; margin-bottom: 18px; vertical-align: middle; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); height: 48px; box-sizing: border-box;';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'カルテNo・名前で検索';
        input.style.cssText = 'border: none; outline: none; font-size: 15px; width: 160px; background: transparent; color: #333; margin-right: 5px;';
        
        const currentSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || '';
        input.value = currentSearch;

        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = '✖';
        clearBtn.title = '検索クリア';
        clearBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; font-size: 14px; padding: 5px; color: #aaa; display: ' + (currentSearch ? 'block' : 'none') + '; margin-right: 5px; transition: color 0.2s;';
        clearBtn.onmouseover = () => clearBtn.style.color = '#555';
        clearBtn.onmouseout = () => clearBtn.style.color = '#aaa';

        const searchBtn = document.createElement('button');
        searchBtn.innerHTML = '🔍 検索'; 
        searchBtn.style.cssText = 'background: #3498db; color: #fff; border: none; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; padding: 6px 15px; transition: background 0.2s;';
        searchBtn.onmouseover = () => searchBtn.style.background = '#2980b9';
        searchBtn.onmouseout = () => searchBtn.style.background = '#3498db';

        const executeSearch = () => {
            const val = input.value.trim();
            if (val) {
                sessionStorage.setItem(STORAGE_KEY_SEARCH, val);
                // 検索時は見つけやすくするため、強制的に全担当に変更する（有効/終了タブは現在の状態を維持）
                localStorage.setItem(STORAGE_KEY_STAFF, '全担当');
            } else {
                sessionStorage.removeItem(STORAGE_KEY_SEARCH);
            }
            location.reload();
        };

        searchBtn.onclick = executeSearch;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') executeSearch();
        };

        clearBtn.onclick = () => {
            input.value = '';
            sessionStorage.removeItem(STORAGE_KEY_SEARCH);
            location.reload();
        };

        container.appendChild(input);
        container.appendChild(clearBtn);
        container.appendChild(searchBtn);

        // 「有効/終了チケット」のトグルの右隣に挿入する（描画タイミングを考慮して追従）
        const insertSearchContainer = () => {
            const toggleContainer = document.getElementById('custom-status-toggle-container');
            if (toggleContainer && toggleContainer.parentNode) {
                if (toggleContainer.nextSibling !== container) {
                    toggleContainer.parentNode.insertBefore(container, toggleContainer.nextSibling);
                }
                return true;
            }
            return false;
        };

        if (!insertSearchContainer()) headerSpace.appendChild(container); // 一時的な配置
        
        // DOMの変更を監視し、トグルボタンが現れた・移動したタイミングで右隣をキープする
        const observer = new MutationObserver(() => insertSearchContainer());
        observer.observe(document.body, { childList: true, subtree: true });

        return event;
    });
})();