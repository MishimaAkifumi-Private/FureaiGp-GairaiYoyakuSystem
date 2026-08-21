/*
 * PatientSearch.js
 * 全画面（一覧・詳細・編集・作成）で共通して、情報バーの右端に「管理状況凡例」ボタンを表示します。
 * （※患者検索ボックスはCRMアプリ側へ移設されました）
 */
(function () {
    'use strict';

    kintone.events.on([
        'app.record.index.show',
        'app.record.detail.show',
        'app.record.edit.show',
        'app.record.create.show'
    ], function (event) {
        const isIndex = event.type === 'app.record.index.show';

        // --- 1. 管理状況凡例ボタンの構築 (全画面共通) ---
        let legendBtn = document.getElementById('custom-legend-btn');
        if (!legendBtn) {
            legendBtn = document.createElement('button');
            legendBtn.id = 'custom-legend-btn';
            legendBtn.textContent = '管理状況凡例';
            // パンくず情報バー右端に独立配置するデザイン
            legendBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; background: #6c757d; color: #fff; border: 1px solid #565e64; border-radius: 4px; padding: 0 12px; margin-left: auto; margin-right: ' + (isIndex ? '26px' : '90px') + '; height: 26px; box-sizing: border-box; font-size: 12px; font-weight: bold; cursor: pointer; flex-shrink: 0; visibility: hidden; line-height: 1; position: relative; z-index: 10;';
            legendBtn.onmouseover = () => legendBtn.style.background = '#5a6268';
            legendBtn.onmouseout = () => legendBtn.style.background = '#6c757d';
            legendBtn.onclick = showStatusLegendDialog;
        }

        // 凡例ボタンの挿入 (全画面共通)
        const insertLegendBtn = () => {
            const iconlistWrapper = document.querySelector('.gaia-argoui-app-infobar-breadcrumb-iconlist');
            const iconList = document.querySelector('.gaia-argoui-app-infobar-iconlist');
            const infobar = document.querySelector('.gaia-argoui-app-infobar');
            
            const targetMarginRight = isIndex ? '26px' : '90px';
            
            if (iconlistWrapper) {
                iconlistWrapper.style.display = 'flex';
                iconlistWrapper.style.alignItems = 'center';
                iconlistWrapper.style.width = '100%';
                
                if (iconList) {
                    iconList.style.marginLeft = '0';
                    iconList.style.marginRight = '10px';
                    iconList.style.display = 'inline-flex';
                    iconList.style.alignItems = 'center';
                }

                legendBtn.style.marginLeft = 'auto';
                legendBtn.style.marginRight = targetMarginRight;
                legendBtn.style.visibility = 'visible';

                if (legendBtn.parentNode !== iconlistWrapper) {
                    iconlistWrapper.appendChild(legendBtn);
                }
                return true;
            } else if (infobar) {
                infobar.style.display = 'flex';
                infobar.style.alignItems = 'center';
                infobar.style.width = '100%';
                legendBtn.style.marginLeft = 'auto';
                legendBtn.style.marginRight = targetMarginRight;
                legendBtn.style.visibility = 'visible';
                if (legendBtn.parentNode !== infobar) {
                    infobar.appendChild(legendBtn);
                }
                return true;
            }
            return false;
        };

        insertLegendBtn();

        // DOMの変更を監視して再配置
        const observer = new MutationObserver(() => {
            insertLegendBtn();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            insertLegendBtn();
        }, 400);

        return event;
    });

    // --- 凡例ダイアログ表示関数 (全画面共通) ---
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