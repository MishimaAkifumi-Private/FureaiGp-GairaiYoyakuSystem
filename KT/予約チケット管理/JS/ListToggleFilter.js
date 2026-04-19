/*
 * ListToggleFilter.js
 * 一覧画面の上部に「有効チケット/終了チケット」の切り替えトグルを配置し、
 * 端末（担当者）ごとに選択したフィルター状態を記憶・適用します。
 */
(function() {
    'use strict';

    // 端末ごとに状態を記憶するためのキー
    const STORAGE_KEY = 'shinryo_ticket_status_filter';
    const ACTIVE = 'active';     // 有効チケット
    const FINISHED = 'finished'; // 終了チケット

    kintone.events.on('app.record.index.show', function(event) {
        // 既に設置されている場合はスキップ
        if (document.getElementById('custom-status-toggle-container')) return event;

        // localStorageから現在のモードを取得（初回は 'active'）
        let currentMode = localStorage.getItem(STORAGE_KEY) || ACTIVE;

        // URLパラメータから現在のクエリ（絞り込み状況）を判定
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('query') || '';

        // 他のフィルター（担当者絞り込み等）との統合クエリを構築して期待値と比較する
        const staffName = localStorage.getItem('shinryo_staff_filter_selected') || '全担当';
        const expectedBase = currentMode === ACTIVE ? '管理状況 not in ("終了", "強制終了")' : '管理状況 in ("終了", "強制終了")';
        let expectedStaff = '';
        if (staffName !== '全担当') {
            expectedStaff = ` and (担当者 in ("${staffName}") or 管理状況 in ("未着手"))`;
        }
        const expectedOrder = 'order by 管理状況 desc, 更新日時 desc';
        const expectedQuery = `${expectedBase}${expectedStaff} ${expectedOrder}`;

        // 現在のURLクエリが期待される統合クエリと完全一致しない場合はリダイレクトして適用
        if (queryParam !== expectedQuery) {
            applyFilter(currentMode);
            return event; // リダイレクト待ち
        }

        // --- トグルUIの構築 ---
        const container = document.createElement('div');
        container.id = 'custom-status-toggle-container';
        // スタッフバッジの高さ(48px)に合わせ、背景を少し濃くしてボタンを目立たせる
        container.style.cssText = 'display: inline-flex; align-items: center; background: #dce1e6; border-radius: 40px; padding: 4px; margin-left: 100px; margin-bottom: 18px; vertical-align: middle; box-shadow: inset 0 2px 6px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.9); height: 48px; box-sizing: border-box;';

        const btnStyle = 'height: 100%; padding: 0 24px; font-size: 15px; font-weight: bold; border: none; border-radius: 36px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none; margin: 0; display: flex; align-items: center; justify-content: center; letter-spacing: 0.5px; ';

        const activeBtn = document.createElement('button');
        activeBtn.textContent = '有効チケット';

        const finishedBtn = document.createElement('button');
        finishedBtn.textContent = '終了チケット';

        // 状態に応じたスタイル更新
        const updateButtonStyles = (mode) => {
            // 目立つグラデーション配色
            const activeActiveStyle = `background: linear-gradient(145deg, #3498db, #2980b9); color: #ffffff; box-shadow: 0 4px 10px rgba(52, 152, 219, 0.4), inset 0 1px 1px rgba(255,255,255,0.3); transform: scale(1); text-shadow: 0 1px 2px rgba(0,0,0,0.2);`;
            const finishedActiveStyle = `background: linear-gradient(145deg, #7f8c8d, #636e72); color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2); transform: scale(1); text-shadow: 0 1px 2px rgba(0,0,0,0.2);`;
            const inactiveStyle = `background: transparent; color: #7f8c8d; box-shadow: none; transform: scale(0.98); text-shadow: none;`;

            if (mode === ACTIVE) {
                activeBtn.style.cssText = btnStyle + activeActiveStyle;
                finishedBtn.style.cssText = btnStyle + inactiveStyle;
            } else {
                finishedBtn.style.cssText = btnStyle + finishedActiveStyle;
                activeBtn.style.cssText = btnStyle + inactiveStyle;
            }
        };

        updateButtonStyles(currentMode);

        // クリックイベント
        activeBtn.onclick = () => {
            if (currentMode !== ACTIVE) applyFilter(ACTIVE);
        };

        finishedBtn.onclick = () => {
            if (currentMode !== FINISHED) applyFilter(FINISHED);
        };

        container.appendChild(activeBtn);
        container.appendChild(finishedBtn);

        // 挿入処理: スタッフバッジは別スクリプトで遅れて描画されるため、
        // MutationObserverを使って描画を待ってから確実に右側に配置する
        const insertContainer = () => {
            const staffBadge = document.getElementById('staff-badge-wrapper');
            if (staffBadge && staffBadge.parentNode) {
                const parent = staffBadge.parentNode;
                if (staffBadge.nextSibling === container) return true; // 既に正しい位置にある
                
                if (staffBadge.nextSibling) {
                    parent.insertBefore(container, staffBadge.nextSibling);
                } else {
                    parent.appendChild(container);
                }
                return true;
            }
            return false;
        };

        if (!insertContainer()) {
            // まだスタッフバッジが描画されていない場合は、一時的にヘッダーに追加
            const headerSpace = kintone.app.getHeaderMenuSpaceElement();
            if (headerSpace) headerSpace.appendChild(container);
            
            // DOMの変更を監視し、スタッフバッジが現れたタイミングで移動させる
            const observer = new MutationObserver((mutations, obs) => {
                if (insertContainer()) {
                    obs.disconnect(); // 移動が完了したら監視を終了
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        return event;
    });

    // フィルター適用関数 (URLのqueryパラメータを書き換えてリダイレクト)
    function applyFilter(mode) {
        localStorage.setItem(STORAGE_KEY, mode);
        
        const staffName = localStorage.getItem('shinryo_staff_filter_selected') || '全担当';
        const baseCondition = mode === ACTIVE ? '管理状況 not in ("終了", "強制終了")' : '管理状況 in ("終了", "強制終了")';
        let staffCondition = '';
        if (staffName !== '全担当') {
            staffCondition = ` and (担当者 in ("${staffName}") or 管理状況 in ("未着手"))`;
        }
        const orderClause = 'order by 管理状況 desc, 更新日時 desc';
        
        const url = new URL(window.location.href);
        url.searchParams.set('query', `${baseCondition}${staffCondition} ${orderClause}`);
        window.location.href = url.toString();
    }

})();