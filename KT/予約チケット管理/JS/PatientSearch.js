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
        searchBtn.id = 'rcb-search-btn'; // ★追加: ツールチップ用のID
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

        // --- 管理状況凡例ボタン ---
        const legendBtn = document.createElement('button');
        legendBtn.id = 'custom-legend-btn';
        legendBtn.textContent = '管理状況凡例';
        // 独立したボタンとしてスタイルを定義
        legendBtn.style.cssText = 'display: inline-flex; align-items: center; background: #6c757d; color: #fff; border: 1px solid #565e64; border-radius: 40px; padding: 4px 15px; margin-left: 10px; margin-bottom: 18px; vertical-align: middle; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); height: 48px; box-sizing: border-box; font-weight: bold; cursor: pointer;';
        legendBtn.onmouseover = () => legendBtn.style.background = '#5a6268';
        legendBtn.onmouseout = () => legendBtn.style.background = '#6c757d';
        legendBtn.onclick = showStatusLegendDialog;

        // 「有効/終了チケット」のトグルの右隣に挿入する（描画タイミングを考慮して追従）
        const insertSearchContainer = () => {
            const toggleContainer = document.getElementById('custom-status-toggle-container');
            if (toggleContainer && toggleContainer.parentNode) {
                const parent = toggleContainer.parentNode;
                // 検索コンテナを挿入
                if (toggleContainer.nextSibling !== container) {
                    parent.insertBefore(container, toggleContainer.nextSibling);
                }
                // 凡例ボタンを検索コンテナの右隣に挿入
                if (container.nextSibling !== legendBtn) {
                    parent.insertBefore(legendBtn, container.nextSibling);
                }
                return true;
            }
            return false;
        };

        if (!insertSearchContainer()) {
            headerSpace.appendChild(container); // 一時的な配置
            headerSpace.appendChild(legendBtn);
        }
        
        // DOMの変更を監視し、トグルボタンが現れた・移動したタイミングで右隣をキープする
        const observer = new MutationObserver(() => insertSearchContainer());
        observer.observe(document.body, { childList: true, subtree: true });

        return event;
    });

    // --- 凡例ダイアログ表示関数 ---
    function showStatusLegendDialog() {
        // スタイルがなければ注入
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
            { status: '未着手', desc: '新規のチケットが到着した直後。' },
            { status: '担当設定', desc: '担当者を設定した。' },
            { status: 'メール送信済', desc: '患者に仮予約日時を確保に関する案内メールを送信した。' },
            { status: 'メール既読', desc: '患者に送信した仮予定日時確保の案内メールを読んだ。' },
            { status: '閲覧期限切れ', desc: '患者に送信した仮予定日時確保の案内が読まれず期限が過ぎた。' },
            { status: '申込者再依頼', desc: '閲覧期限後に改めて仮予約日時の再確保を依頼された(※1)。' },
            { status: 'URL取下', desc: '予約日時が確定していたが、受診日時までに患者が予約を取下げた。' },
            { status: 'スタッフ取下', desc: 'スタッフが手違いなどにより確保した仮予約日時の取下げを行った。' },
            { status: 'スタッフ取下中止', desc: 'スタッフが仮予約日時を取下げたが復活させた(取下をやめた)。' },
            { status: '終了', desc: '患者の受診日時が予定通り過ぎた、あるいはスタッフの判断により患者の受診日時の予定を手動で無効にした(※2)。' },
            { status: 'WEB取下', desc: '患者によるWebフォームからの予約取下げ依頼をスタッフが処理した。' }
        ];

        const notes = `
            <div style="margin-top: 20px; font-size: 12px; line-height: 1.6; color: #555; background-color: #f8f9fa; padding: 15px; border-radius: 4px; border: 1px solid #e9ecef;">
                <p style="margin:0 0 10px 0;"><strong>(※1)</strong> 閲覧期限当日中であれば患者はWebフォームを経由せずに仮予約日時確保を再依頼出来ます。</p>
                <p style="margin:0 0 5px 0;"><strong>(※2)</strong> Webフォームで予約が確定すると、以下の条件を満たすまでWebフォームからの新らたな予約はできません。</p>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>患者からのWebフォームからの取下げ依頼をスタッフが処理した場合。</li>
                    <li>患者に届いているメール上のURL(リンク)から取下げた場合。</li>
                    <li>患者の診療予約日時が過ぎたたまま翌日になった場合。</li>
                    <li>スタッフが【手動終了】のボタン操作を行った場合。</li>
                    <li>スタッフが【スタッフ取下】後に即時無効処理を選択した場合★要確認★。</li>
                </ul>
            </div>
        `;

        let tableHtml = `
            <p style="margin-top:0; margin-bottom:15px; font-size: 14px;">チケットの現在の管理状態(下記のいずれか)を表示します。</p>
            <style>
                .legend-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .legend-table th, .legend-table td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
                .legend-table th { background-color: #f8f9fa; font-weight: bold; }
                .legend-table th:first-child { width: 150px; }
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