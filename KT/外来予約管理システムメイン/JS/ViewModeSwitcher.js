/*
 * ViewModeSwitcher.js (v30)
 * 診療シフト管理アプリ(ID:156)用
 */
(function() {
  'use strict';
  console.log('ViewModeSwitcher.js: Loading...');

  const APP_VERSION = '0.90'; // システムのバージョン番号

  function getUrlParam(name) {
    const url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  const currentMode = getUrlParam('view_mode') || 'dashboard';
  console.log('ViewModeSwitcher.js: Current mode is', currentMode);

  const INITIAL_HIDE_STYLE_ID = 'kintone-initial-hide-style';

  // 先行隠蔽処理
  if (currentMode === 'overview' || currentMode === 'dashboard') {
      const hideCss = `
        .gaia-argoui-app-index-contents,
        .recordlist-gaia,
        .recordlist-header-gaia,
        .gaia-argoui-app-index-pager,
        #reset_order_button,
        .gaia-argoui-app-viewtoggle,
        .gaia-argoui-app-filterbutton,
        .gaia-argoui-app-subtotalbutton,
        .gaia-argoui-app-menu-add,
        .gaia-argoui-app-menu-settingssplitbutton,
        .gaia-argoui-optionmenubutton,
        .gaia-argoui-app-menu-pin 
        {
            display: none !important;
        }
        .gaia-argoui-app-toolbar {
            padding: 0px !important;
            height: auto !important;
            min-height: 0px !important;
        }
        /* Custom Modal Styles */
        .custom-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
        }
        .custom-modal-box {
            background: #fff; padding: 30px; border-radius: 12px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.25);
            min-width: 400px; max-width: 600px; text-align: center;
            font-family: "Helvetica Neue", Arial, sans-serif;
            border: 1px solid rgba(0,0,0,0.1);
        }
        .custom-modal-msg { margin-bottom: 25px; font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #555; }
        .custom-modal-btn-group { display: flex; justify-content: center; gap: 15px; margin-top: 25px; }
        .custom-modal-btn { 
            padding: 10px 24px; border: none; border-radius: 6px; cursor: pointer; 
            font-weight: 600; font-size: 14px; min-width: 100px; 
            transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .custom-modal-btn:active { transform: translateY(1px); box-shadow: none; }
        .custom-modal-btn-ok { background: #3498db; color: #fff; }
        .custom-modal-btn-ok:hover { background: #2980b9; }
        .custom-modal-btn-cancel { background: #95a5a6; color: #fff; }
        .custom-modal-btn-cancel:hover { background: #7f8c8d; }
        
        /* 追加: 設定メニュー用スタイル (Enhanced) */
        .custom-modal-menu-btn {
            display: flex; align-items: center; width: 100%; padding: 16px 20px; margin-bottom: 12px;
            background: #fff; border: 1px solid #e1e4e8; border-radius: 8px;
            text-align: left; cursor: pointer;
            transition: all 0.2s ease; position: relative; overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .custom-modal-menu-btn:hover { 
            background: #f8fbff; border-color: #3498db; 
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.15);
            transform: translateY(-2px);
        }
        .custom-modal-menu-btn::before {
            content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px;
            background: #3498db; opacity: 0; transition: opacity 0.2s;
            border-top-left-radius: 7px; border-bottom-left-radius: 7px;
        }
        .custom-modal-menu-btn:hover::before { opacity: 1; }
        
        .menu-btn-icon { font-size: 24px; margin-right: 15px; display: flex; align-items: center; justify-content: center; width: 30px; }
        .menu-btn-content { flex: 1; }
        .menu-btn-title { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 3px; }
        .menu-btn-desc { font-size: 12px; color: #7f8c8d; line-height: 1.3; }

        .custom-modal-input { 
            width: 100%; padding: 12px; font-size: 15px; 
            border: 1px solid #dce1e6; border-radius: 6px; 
            box-sizing: border-box; margin-bottom: 20px; 
            background-color: #fcfcfc; transition: border-color 0.2s, background-color 0.2s;
        }
        .custom-modal-input:focus { border-color: #3498db; background-color: #fff; outline: none; }

        /* ストレージ使用状況バーのスタイル */
        .storage-usage-container { margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #eee; text-align: left; }
        .storage-usage-label { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #555; margin-bottom: 8px; }
        .storage-usage-bar-bg { width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
        .storage-usage-bar-fg { height: 100%; transition: width 0.3s ease; }
        .usage-green { background: #28a745; }
        .usage-yellow { background: #ffc107; }
        .usage-red { background: #dc3545; }

        /* システムヘルス情報用スタイル */
        .health-info-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        .health-info-table th { width: 35%; padding: 10px; background: #f2f4f7; border: 1px solid #dee2e6; text-align: left; color: #495057; }
        .health-info-table td { padding: 10px; border: 1px solid #dee2e6; text-align: left; color: #212529; }
        .health-desc { font-size: 11px; color: #6c757d; margin-top: 4px; line-height: 1.4; }
        .usage-bar-container { width: 100%; height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden; margin-top: 8px; }
        .usage-bar-fill { height: 100%; transition: width 0.5s ease; }

        /* プレビュー画面の行間調整 */
        .preview-content p { margin: 0 !important; padding: 0 !important; line-height: 1.5 !important; }

        /* カレンダー強調表示用 */
        @keyframes blink-shadow-green { 50% { box-shadow: 0 0 0 2px transparent; } }
        @keyframes blink-shadow-black { 50% { box-shadow: 0 0 0 2px transparent; } }
        .cell-today {
            box-shadow: 0 0 0 2px #28a745;
            animation: blink-shadow-green 1.5s infinite;
            z-index: 1;
        }
        .cell-limit {
            box-shadow: 0 0 0 2px #becf3e;
            animation: blink-shadow-black 1.5s infinite;
            z-index: 1;
        }
        .cell-label-tag {
            position: absolute; top: -6px; right: -4px; font-size: 9px; padding: 1px 3px; border-radius: 3px; line-height: 1; z-index: 2; box-shadow: 0 1px 2px rgb(6, 118, 114); font-weight: bold; pointer-events: none;
        }
        .label-today { background-color: #28a745; color: white; }
        .label-limit { background-color: #7f7908bb; color: white; }

        /* 点滅アニメーション */
        @keyframes btn-blink-anim {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .btn-blink { animation: btn-blink-anim 0.5s infinite ease-in-out; }
        .btn-disabled {
            background-color: #cccccc !important;
            color: #ffffff !important;
            cursor: not-allowed !important;
            pointer-events: none !important;
            box-shadow: none !important;
        }
      `;
      const style = document.createElement('style');
      style.id = INITIAL_HIDE_STYLE_ID;
      style.textContent = hideCss;
      (document.head || document.documentElement).appendChild(style);
  }

  // Custom Dialog Helper
  function showCustomDialog(message, type = 'alert', labels = {}) {
      return new Promise((resolve) => {
          const overlay = document.createElement('div');
          overlay.className = 'custom-modal-overlay';
          const box = document.createElement('div');
          box.className = 'custom-modal-box';
          const msg = document.createElement('div');
          msg.className = 'custom-modal-msg';
          msg.textContent = message;
          const btnGroup = document.createElement('div');
          btnGroup.className = 'custom-modal-btn-group';

          const createBtn = (text, cls, val) => {
              const btn = document.createElement('button');
              btn.textContent = text;
              btn.className = `custom-modal-btn ${cls}`;
              btn.onclick = () => { document.body.removeChild(overlay); resolve(val); };
              return btn;
          };

          const cancelText = labels.cancel || 'キャンセル';
          const okText = labels.ok || 'OK';

          if (type === 'confirm') btnGroup.appendChild(createBtn(cancelText, 'custom-modal-btn-cancel', false));
          btnGroup.appendChild(createBtn(okText, 'custom-modal-btn-ok', true));

          box.appendChild(msg); box.appendChild(btnGroup); overlay.appendChild(box); document.body.appendChild(overlay);
      });
  }

  kintone.events.on('app.record.index.show', async function(event) {
    console.log('ViewModeSwitcher.js: app.record.index.show triggered.');

    // ShinryoViewerが読み込まれているかチェック
    if (!window.ShinryoApp || !window.ShinryoApp.Viewer || !window.ShinryoApp.Viewer.renderOverview) {
        const errorMsg = '【エラー】ShinryoViewer.js が正しく読み込まれていません。\n設定画面の「JavaScript / CSSでカスタマイズ」で、ShinryoViewer.js がアップロードされているか、ViewModeSwitcher.js より上に配置されているか確認してください。';
        console.error(errorMsg);
        window.alert(errorMsg); // Fallback to standard alert for critical init error
        return event;
    }

    // ★追加: スタッフ未設定時の強制ロック処理
    const currentStaff = localStorage.getItem('shinryo_ticket_staff_name');
    if (!currentStaff) {
        // スタッフ未設定の場合、強制的にスタッフ設定ダイアログを表示
        if (!document.querySelector('.custom-modal-overlay')) {
             showStaffSettingDialog(true); // true = 強制モード
        }
        return event; // 以降の描画処理をスキップ
    }

    let viewMode = getUrlParam('view_mode');
    if (!viewMode) viewMode = 'dashboard';

    // 共通スタイル適用
    window.ShinryoApp.Viewer.applyStyles();

    if (viewMode === 'overview' || viewMode === 'dashboard') {
        document.body.classList.add('view-mode-overview');
    } else {
        document.body.classList.remove('view-mode-overview');
    }

    const headerMenu = kintone.app.getHeaderMenuSpaceElement();
    if (!document.getElementById('mode-switch-container')) {
        const div = document.createElement('div');
        div.id = 'mode-switch-container';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.flexWrap = 'wrap'; // ★追加: 画面幅が狭い場合に折り返す
        
        let btnUpdate = null;

        if (viewMode === 'overview') {
            const titleContainer = document.createElement('div');
            titleContainer.className = 'overview-title-container';

            // ★変更: 全体編集ボタンを右側に配置
            const btnDetail = document.createElement('button');
            btnDetail.className = 'mode-switch-btn btn-to-detail';
            btnDetail.textContent = '全医師';
            btnDetail.style.position = 'absolute';
            btnDetail.style.right = '20px';
            btnDetail.style.top = '50%';
            btnDetail.style.transform = 'translateY(-50%)';
            btnDetail.style.marginLeft = '0';
            btnDetail.style.marginTop = '0';
            btnDetail.style.zIndex = '10';
            btnDetail.style.height = '40px';
            btnDetail.style.width = '100px';
            btnDetail.style.backgroundColor = '#369';
            btnDetail.style.fontSize = '18px';
            btnDetail.onclick = () => location.href = '?view_mode=input';
            div.appendChild(btnDetail);
            div.appendChild(titleContainer);
        }

        if (viewMode === 'input') {
             const btnOverview = document.createElement('button');

             const hideStyle = document.getElementById(INITIAL_HIDE_STYLE_ID);
             if (hideStyle) hideStyle.remove();

             // 既存の絞り込み・集計ボタンを非表示にする
             const INPUT_HIDE_STYLE_ID = 'kintone-input-hide-style';
             if (!document.getElementById(INPUT_HIDE_STYLE_ID)) {
                 const inputHideStyle = document.createElement('style');
                 inputHideStyle.id = INPUT_HIDE_STYLE_ID;
                 inputHideStyle.textContent = `
                     .gaia-argoui-app-filterbutton,
                     .gaia-argoui-app-subtotalbutton {
                         display: none !important;
                     }
                 `;
                 document.head.appendChild(inputHideStyle);
             }

             // ★ 編集モード用フィルターの作成
             createEditModeFilters(div);

             // ★ 追加: ページャー部分へのボタン配置 (Dashboard, 予約待ち受け状況)
             const pager = document.querySelector('.gaia-argoui-app-index-pager');
             if (pager) {
                 const btnContainer = document.createElement('div');
                 btnContainer.style.float = 'left';
                 btnContainer.style.display = 'flex';
                 btnContainer.style.gap = '10px';
                 btnContainer.style.marginLeft = '10px';
                 btnContainer.style.alignItems = 'center';
                 
                 // Dashboard Button
                 const btnDashboard = document.createElement('button');
                 btnDashboard.className = 'mode-switch-btn';
                 btnDashboard.textContent = 'Dashboard';
                 btnDashboard.style.backgroundColor = '#28a745';
                 btnDashboard.style.margin = '0';
                 btnDashboard.style.height = '30px';
                 btnDashboard.style.lineHeight = '30px';
                 btnDashboard.style.padding = '0 15px';
                 btnDashboard.style.fontSize = '13px';
                 btnDashboard.onclick = () => location.href = '?view_mode=dashboard';
                 
                 // Overview Button
                 const btnOverview = document.createElement('button');
                 btnOverview.className = 'mode-switch-btn';
                 btnOverview.textContent = '予約待ち受け管理';
                 btnOverview.style.backgroundColor = '#28a745';
                 btnOverview.style.margin = '0';
                 btnOverview.style.height = '30px';
                 btnOverview.style.lineHeight = '30px';
                 btnOverview.style.padding = '0 15px';
                 btnOverview.style.fontSize = '13px';
                 btnOverview.onclick = () => location.href = '?view_mode=overview';

                 btnContainer.appendChild(btnDashboard);
                 btnContainer.appendChild(btnOverview);

                 const resetBtn = document.getElementById('reset_order_button');
                 if (resetBtn && resetBtn.parentNode === pager) {
                     pager.insertBefore(btnContainer, resetBtn.nextSibling);
                 } else {
                     pager.insertBefore(btnContainer, pager.firstChild);
                 }
             }

        } else if (viewMode === 'overview') {
             const btnMainMenu = document.createElement('button');
             btnMainMenu.className = 'mode-switch-btn';
             btnMainMenu.textContent = 'Dashboard';
             btnMainMenu.style.backgroundColor = '#28a745';
             btnMainMenu.style.marginTop = '0';
             btnMainMenu.style.whiteSpace = 'nowrap'; // ★追加: 折り返し禁止
             btnMainMenu.style.flexShrink = '0'; // ★追加: 縮小禁止
             btnMainMenu.onclick = () => location.href = '?view_mode=dashboard';
             div.appendChild(btnMainMenu);

             const btnHoliday = document.createElement('button');
             btnHoliday.className = 'mode-switch-btn';
             btnHoliday.textContent = '予約待受期間・休診日';
             btnHoliday.style.marginTop = '0';
             btnHoliday.style.marginLeft = '10px';
             btnHoliday.style.whiteSpace = 'nowrap'; // ★追加: 折り返し禁止
             btnHoliday.style.flexShrink = '0'; // ★追加: 縮小禁止
             btnHoliday.onclick = () => showHolidaySettingDialog();
             div.appendChild(btnHoliday);

             const btnFormLabel = document.createElement('button');
             btnFormLabel.className = 'mode-switch-btn';
             btnFormLabel.textContent = 'フォーム挿入ラベル';
             btnFormLabel.style.marginTop = '0';
             btnFormLabel.style.marginLeft = '10px';
             btnFormLabel.style.whiteSpace = 'nowrap'; // ★追加: 折り返し禁止
             btnFormLabel.style.flexShrink = '0'; // ★追加: 縮小禁止
             btnFormLabel.onclick = () => showFormLabelMenu();
             div.appendChild(btnFormLabel);

             // --- 公開フロー用コンテナ (枠線付き) ---
             const flowContainer = document.createElement('div');
             flowContainer.style.cssText = 'display: flex; align-items: center; border: 2px solid #ddd; border-radius: 8px; padding: 8px 15px; margin-left: 10px; background-color: #eee; gap: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); height: 25px;';

             const btnPreview = document.createElement('button');
             btnPreview.className = 'mode-switch-btn';
             btnPreview.textContent = 'プレビュー';
             btnPreview.style.backgroundColor = '#e74c3c';
             btnPreview.style.marginLeft = '0';
             btnPreview.style.height = '30px';
             btnPreview.style.marginTop = '0';
             btnPreview.style.whiteSpace = 'nowrap'; // ★追加: 折り返し禁止
             btnPreview.style.flexShrink = '0'; // ★追加: 縮小禁止
             btnPreview.onclick = () => {
                 const formUrl = localStorage.getItem('shinryo_form_url');
                 if (formUrl) {
                     const url = new URL(formUrl);
                     url.searchParams.set('preview', '1');
                     window.open(url.toString(), '_blank');
                 } else {
                     alert('公開用URLが設定されていません。\n「設定 > 各種URL設定」から設定してください。');
                 }
             };
             flowContainer.appendChild(btnPreview);

             // ★追加: 中止ボタン (左向き矢印)
             const btnRevert = document.createElement('button');
             btnRevert.textContent = '中止';
             btnRevert.style.cssText = `
                 background-color: #6c757d;
                 color: white;
                 border: none;
                 padding: 0 5px;
                 height: 30px;
                 line-height: 30px;
                 cursor: pointer;
                 font-weight: bold;
                 font-size: 12px;
                 position: relative;
                 border-radius: 15px;
                 transition: background-color 0.2s;
                 width: 40px;
                 white-space: nowrap;
                 flex-shrink: 0;
                 margin-top: 0;
             `;
             btnRevert.onmouseover = () => btnRevert.style.backgroundColor = '#5a6268';
             btnRevert.onmouseout = () => btnRevert.style.backgroundColor = '#6c757d';
             btnRevert.onclick = async () => {
                  const confirmed = await showCustomDialog(
                      '現在の編集内容（プレビュー環境）を破棄し、公開中の設定（本番環境）に戻しますか？\nこの操作は取り消せません。', 
                      'confirm', 
                      { ok: '中止して戻す', cancel: 'キャンセル' }
                  );
                  if (confirmed) {
                      try {
                          await window.ShinryoApp.ConfigManager.revertFromProduction();
                          await showCustomDialog('設定を公開中の状態に戻しました。', 'alert');
                          location.reload();
                      } catch(e) {
                          await showCustomDialog('処理に失敗しました。\n' + e.message, 'alert');
                      }
                  }
             };
             flowContainer.appendChild(btnRevert);

             const btnPublish = document.createElement('button');
             btnPublish.textContent = '公開'; // ★変更: 名称変更
             btnPublish.style.cssText = `
                 background-color: #28a745;
                 color: white;
                 border: none;
                 padding: 0 5px;
                 height: 30px;
                 line-height: 30px;
                 cursor: pointer;
                 font-weight: bold;
                 font-size: 12px;
                 position: relative;
                 border-radius: 15px;
                 transition: background-color 0.2s;
                 width: 40px;
                 white-space: nowrap;
                 flex-shrink: 0;
                 margin-top: 0;
             `;
             btnPublish.onmouseover = () => btnPublish.style.backgroundColor = '#218838';
             btnPublish.onmouseout = () => btnPublish.style.backgroundColor = '#28a745';
             btnPublish.onclick = async () => {
                  const confirmed = await showCustomDialog(
                      '現在の設定を予約フォームに公開しますか？', 
                      'confirm', 
                      { ok: '公開する', cancel: 'キャンセル' }
                  );
                  if (confirmed) {
                      await executePublish();
                  }
             };
             flowContainer.appendChild(btnPublish);

             const btnPublicView = document.createElement('button');
             btnPublicView.className = 'mode-switch-btn';
             btnPublicView.textContent = '公開中フォーム';
             btnPublicView.style.backgroundColor = '#499';
             btnPublicView.style.marginLeft = '10px';
             btnPublicView.style.height = '40px';
             btnPublicView.style.marginTop = '0';
             btnPublicView.style.whiteSpace = 'nowrap'; // ★追加: 折り返し禁止
             btnPublicView.style.flexShrink = '0'; // ★追加: 縮小禁止
             btnPublicView.onclick = () => {
                 const currentUrl = localStorage.getItem('shinryo_form_url');
                 if (currentUrl) window.open(currentUrl, '_blank');
                 else alert('公開用URLが設定されていません。\n「設定 > 各種URL設定」から設定してください。');
             };

             div.appendChild(btnPublicView);
             div.appendChild(flowContainer);


             // 更新チェックロジック (ボタン生成後に移動)
             if (window.ShinryoApp.ConfigManager) {
                const checkUpdates = async () => {
                    try {
                        const records = await fetchAllRecords(kintone.app.getId());
                        
                        // ★追加: 保存前にソートして順序を安定させる (executePublishと同様)
                        records.sort((a, b) => {
                            const oa = parseInt(a['表示順']?.value || 9999, 10);
                            const ob = parseInt(b['表示順']?.value || 9999, 10);
                            if (oa !== ob) return oa - ob;
                            return parseInt(a.$id.value, 10) - parseInt(b.$id.value, 10);
                        });

                        await window.ShinryoApp.ConfigManager.fetchPublishedData();
                        
                        // 2. 本番環境との差分チェック (Preview/Publishボタン用)
                        const hasProdDiff = window.ShinryoApp.ConfigManager.hasProductionDiff();
                        if (hasProdDiff) {
                            // 差分あり: 点滅させる (公開ボタンは点滅させない)
                            // btnPreview.classList.add('btn-blink');
                            // btnPublish.classList.add('btn-blink'); // ★変更: 点滅停止
                            btnPreview.classList.remove('btn-disabled');
                            btnPublish.classList.remove('btn-disabled');
                            btnRevert.classList.remove('btn-disabled'); // ★追加: 中止ボタン有効化
                        } else {
                            // 差分なし: グレーアウトして操作不可
                            btnPreview.classList.remove('btn-blink');
                            // btnPublish.classList.remove('btn-blink');
                            btnPreview.classList.add('btn-disabled');
                            btnPublish.classList.add('btn-disabled');
                            btnRevert.classList.add('btn-disabled'); // ★追加: 中止ボタン無効化
                        }

                    } catch (e) {
                        console.error('Update check failed:', e);
                    }
                };
                checkUpdates();
            }
        }

        if(headerMenu.firstChild) {
            headerMenu.insertBefore(div, headerMenu.firstChild);
        } else {
            headerMenu.appendChild(div);
        }
    }

    if (viewMode === 'dashboard') {
        const defaultView = document.querySelector('.gaia-argoui-app-index-contents') || document.querySelector('.recordlist-gaia');
        if (defaultView) defaultView.style.display = 'none';
        const pager = document.querySelector('.gaia-argoui-app-index-pager');
        if (pager) pager.style.display = 'none';
        const resetBtn = document.getElementById('reset_order_button');
        if (resetBtn) resetBtn.style.display = 'none';

        renderDashboard();
    }

    if (viewMode === 'overview') {
        const defaultView = document.querySelector('.gaia-argoui-app-index-contents') || document.querySelector('.recordlist-gaia');
        if (defaultView) defaultView.style.display = 'none';

        const pager = document.querySelector('.gaia-argoui-app-index-pager');
        if (pager) pager.style.display = 'none';
        
        const resetBtn = document.getElementById('reset_order_button');
        if (resetBtn) resetBtn.style.display = 'none';

        const main = document.querySelector('.gaia-argoui-app-index-view-main') || document.body;
        let container = document.getElementById('overview-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'overview-container';
            main.appendChild(container);
            
            // 描画実行
            window.ShinryoApp.Viewer.renderOverview();
        }
    }
    return event;
  });

  // ダッシュボード描画関数
  function renderDashboard() {
      const main = document.querySelector('.gaia-argoui-app-index-view-main') || document.body;
      let container = document.getElementById('dashboard-container');
      if (container) return;

      container = document.createElement('div');
      container.id = 'dashboard-container';
      // align-content: flex-start を追加して、行間の余計な広がりを防止
      container.style.cssText = 'display: flex; flex-wrap: wrap; gap: 30px 20px; padding: 30px; justify-content: center; align-items: flex-start; align-content: flex-start; background-color: #f5f5f5; min-height: 80vh;';
      
      // FontAwesomeのロード
      if (!document.getElementById('font-awesome-css')) {
          const link = document.createElement('link');
          link.id = 'font-awesome-css'; link.rel = 'stylesheet'; link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
          document.head.appendChild(link);
      }
      
      // --- ヘッダー行 (3つのエレメントを横並び) ---
      const headerRow = document.createElement('div');
      headerRow.style.cssText = 'width: 100%; display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0; flex-wrap: wrap;';

      // 区切り線生成ヘルパー
      const createDivider = () => {
          const div = document.createElement('div');
          div.style.cssText = 'width: 3px; height: 70px; background-color: #e0e0e0;';
          return div;
      };

      // ① ロゴ + センター名 (group1)
      const group1 = document.createElement('div');
      group1.style.cssText = 'display: flex; flex-direction: column; align-items: flex-start; justify-content: center;';

      const logo = document.createElement('img');
      logo.src = 'https://www.fureai-g.or.jp/fureai-g/images/shared/site-logo.svg'; 
      logo.style.cssText = 'height: 30px; width: auto; margin-bottom: 5px;';
      group1.appendChild(logo);

      const centerName = localStorage.getItem('shinryo_center_name') || '湘南東部外来予約センター';
      const subTitle = document.createElement('div');
      subTitle.textContent = centerName;
      subTitle.style.cssText = 'font-size: 24px; font-weight: bold; color: #555;';
      group1.appendChild(subTitle);

      // ② タイトル + バージョン (group2)
      const group2 = document.createElement('div');
      group2.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 15px;';

      // ★追加: システムアイコン
      const systemIcon = document.createElement('div');
      systemIcon.innerHTML = '<i class="fa-solid fa-hospital"></i>'; 
      systemIcon.style.cssText = 'font-size: 65px; line-height: 1; cursor: default; color: #808080; margin-right: 15px; margin-bottom: 20px;';
      group2.appendChild(systemIcon);

      const titleContainer = document.createElement('div');
      titleContainer.style.cssText = 'display: flex; flex-direction: column; align-items: flex-start; justify-content: center;';

      const title = document.createElement('h1');
      title.textContent = '外来予約管理システム';
      title.style.cssText = 'margin: 0; font-size: 35px; color: #444; font-family: "HGP創英角ﾎﾟｯﾌﾟ体", "HGSoeiKakupoptai", "HGPSoeiKakupoptai", "Rounded Mplus 1c", "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", Osaka, "メイリオ", Meiryo, sans-serif; line-height: 1.2;';
      titleContainer.appendChild(title);

      const version = document.createElement('span');
      version.textContent = `Ver. ${APP_VERSION}`;
      version.style.cssText = 'color: #888; font-size: 20px; align-self: flex-end;';
      titleContainer.appendChild(version);

      group2.appendChild(titleContainer);

      // ③ ユーザー名 (group3)
      const group3 = document.createElement('div');
      group3.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-left: 20px; cursor: pointer; background-color: #fff; border: 2px solid #e0e0e0; border-radius: 40px; padding: 6px 24px 6px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s;';
      
      group3.onmouseover = () => {
          group3.style.backgroundColor = '#f8f9fa';
          group3.style.borderColor = '#ccc';
          group3.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
      };
      group3.onmouseout = () => {
          group3.style.backgroundColor = '#fff';
          group3.style.borderColor = '#e0e0e0';
          group3.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
      };

      group3.onclick = () => showStaffSettingDialog();

      // ★追加: スタッフ名取得
      const currentStaff = localStorage.getItem('shinryo_ticket_staff_name') || '未設定';

      // ユーザーアイコン (FontAwesome)
          const iconDiv = document.createElement('div');
          iconDiv.innerHTML = '<i class="fa-solid fa-headset"></i>';
          iconDiv.style.display = 'flex';
          iconDiv.style.alignItems = 'center';
          iconDiv.style.fontSize = '32px';
          iconDiv.style.color = '#555';
          group3.appendChild(iconDiv);

          // スタッフ名
          const staffNameDiv = document.createElement('div');
          staffNameDiv.textContent = currentStaff;
          staffNameDiv.style.cssText = 'font-size: 24px; font-weight: bold; color: #666; margin-left: 2px; line-height: 1;';
          group3.appendChild(staffNameDiv);
      
      // 並び順: ②システム情報 -> ①ロゴ -> ③利用者 (ユーザーとロゴを入れ替え)
      headerRow.appendChild(group2);
      headerRow.appendChild(createDivider());
      headerRow.appendChild(group1);
      headerRow.appendChild(group3);

      container.appendChild(headerRow);

      const cards = [
          { title: '予約チケット管理', icon: '📬', url: 'https://w60013hke2ct.cybozu.com/k/guest/11/142/', target: '_blank', desc: '予約変更/取消/初診の着信を管理、予約枠を確保して患者に返信します' },
          { title: '予約待ち受け管理', icon: '📅', url: '?view_mode=overview', target: '_self', desc: '個別医師の予定状況等から予約が受け付けられる選択肢を組み立てます' },
          { title: '各種システム設定', icon: '🔐', action: () => showAdminPasswordDialog(), desc: 'システム管理者専用' }
      ];

      cards.forEach(c => {
          const card = document.createElement('div');
          card.className = 'dashboard-card';
          card.style.cssText = `
              width: 240px; height: 200px; background: #fff; border-radius: 12px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; flex-direction: column;
              align-items: center; justify-content: center; cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; color: #333;
              padding: 20px; box-sizing: border-box; text-align: center; border: 1px solid #eee;
          `;
          
          card.onmouseenter = () => { card.style.transform = 'translateY(-5px)'; card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'; card.style.backgroundColor = '#fcfcfc'; };
          card.onmouseleave = () => { card.style.transform = 'translateY(0)'; card.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)'; card.style.backgroundColor = '#fff'; };

          if (c.url) {
              card.onclick = () => window.open(c.url, c.target || '_self');
          } else if (c.action) {
              card.onclick = c.action;
          }

          const icon = document.createElement('div');
          icon.textContent = c.icon;
          icon.style.fontSize = '56px';
          icon.style.marginBottom = '20px';
          
          const label = document.createElement('div');
          label.textContent = c.title;
          label.style.fontSize = '18px';
          label.style.fontWeight = 'bold';
          label.style.marginBottom = '10px';

          const desc = document.createElement('div');
          desc.textContent = c.desc;
          desc.style.fontSize = '12px';
          desc.style.color = '#666';
          desc.style.lineHeight = '1.4';

          card.appendChild(icon);
          card.appendChild(label);
          card.appendChild(desc);

          container.appendChild(card);
      });

      main.appendChild(container);
  }

  // --- 独自モーダル関連関数 ---
  function createModalBase(initialOnCloseRequest) {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay';
      const box = document.createElement('div');
      box.className = 'custom-modal-box';
      box.style.position = 'relative'; // ×ボタンの配置用
      
      // コンテンツ領域 (innerHTMLクリア対策)
      const content = document.createElement('div');
      content.style.width = '100%';

      let onCloseRequest = initialOnCloseRequest;
      const setOnCloseRequest = (fn) => { onCloseRequest = fn; };

      const handleClose = () => {
          const doClose = () => {
              if (document.body.contains(overlay)) document.body.removeChild(overlay);
          };
          if (onCloseRequest) {
              onCloseRequest(doClose);
          } else {
              doClose();
          }
      };

      // ×ボタン
      const closeBtn = document.createElement('div');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = 'position: absolute; top: 15px; right: 15px; font-size: 24px; cursor: pointer; color: #ccc; line-height: 1; font-weight: bold; z-index: 100; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;';
      closeBtn.onmouseover = () => { closeBtn.style.color = '#555'; closeBtn.style.backgroundColor = '#f0f0f0'; };
      closeBtn.onmouseout = () => { closeBtn.style.color = '#ccc'; closeBtn.style.backgroundColor = 'transparent'; };
      closeBtn.onclick = handleClose;
      
      box.appendChild(closeBtn);
      box.appendChild(content);
      overlay.appendChild(box);

      // オーバーレイクリックで閉じる
      overlay.onclick = (e) => {
          if (e.target === overlay) handleClose();
      };

      return { overlay, box, content, setOnCloseRequest };
  }

  // 変更破棄確認ヘルパー
  async function checkDirtyAndConfirm(isDirty, onConfirm) {
      if (isDirty) {
          const confirmed = await showCustomDialog(
              '変更が保存されていません。\n破棄して閉じてもよろしいですか？',
              'confirm',
              { ok: '破棄する', cancel: 'キャンセル' }
          );
          if (confirmed) onConfirm();
      } else {
          onConfirm();
      }
  }

  // ★追加: 管理者認証ダイアログ
  async function showAdminPasswordDialog() {
      const { overlay, box, content } = createModalBase();
      
      const title = document.createElement('h2');
      title.textContent = '管理者認証';
      title.style.cssText = 'margin-top: 0; margin-bottom: 20px; font-size: 20px; color: #2c3e50; font-weight: 700;';
      content.appendChild(title);

      const desc = document.createElement('p');
      desc.textContent = 'システム管理者パスワードを入力してください。';
      desc.style.cssText = 'font-size: 14px; color: #666; margin-bottom: 15px;';
      content.appendChild(desc);

      const input = document.createElement('input');
      input.type = 'password';
      input.className = 'custom-modal-input';
      input.placeholder = 'パスワード';
      content.appendChild(input);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => { document.body.removeChild(overlay); };

      const okBtn = document.createElement('button');
      okBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      okBtn.textContent = '認証';
      okBtn.onclick = () => {
          if (input.value === '17320508') {
              document.body.removeChild(overlay);
              showAdminMenu();
          } else {
              alert('パスワードが違います。');
              input.value = '';
              input.focus();
          }
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(okBtn);
      content.appendChild(btnGroup);

      document.body.appendChild(overlay);
      input.focus();
  }

  // ★追加: システム管理者メニュー
  async function showAdminMenu() {
      const { overlay, box, content } = createModalBase();
      
      const title = document.createElement('h2');
      title.textContent = 'システム管理者メニュー';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      content.appendChild(title);

      const menuList = [
          { label: 'メールサーバー設定', icon: '🖥️', desc: 'SMTPサーバー・認証情報の設定を行います', action: () => { document.body.removeChild(overlay); showMailServerSettingDialog(); } },
          { label: 'アプリ連携設定', icon: '🔗', desc: '連携するKintoneアプリ番号の設定を行います', action: () => { document.body.removeChild(overlay); showAppIdSettingDialog(); } },
          { label: '各種URL設定', icon: '🌐', desc: 'フォームURLやロゴ画像URLなどを管理します', action: () => { document.body.removeChild(overlay); showUrlSettingDialog(); } },
          { label: 'システムヘルス情報', icon: '📊', desc: '詳細なシステム稼働状況を確認します', action: () => { document.body.removeChild(overlay); showSystemHealthDialog(); } },
      ];

      menuList.forEach(item => {
          const btn = document.createElement('button');
          btn.className = 'custom-modal-menu-btn';
          btn.innerHTML = `
            <div class="menu-btn-icon">${item.icon}</div>
            <div class="menu-btn-content">
                <div class="menu-btn-title">${item.label}</div>
                <div class="menu-btn-desc">${item.desc}</div>
            </div>
          `;
          btn.onclick = item.action;
          content.appendChild(btn);
      });

      const backBtn = document.createElement('button');
      backBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      backBtn.textContent = '閉じる';
      backBtn.style.marginTop = '15px';
      backBtn.onclick = () => { document.body.removeChild(overlay); };
      content.appendChild(backBtn);

      document.body.appendChild(overlay);
  }

  // ★追加: システムヘルス情報ダイアログ
  function showSystemHealthDialog() {
      const { overlay, box, content } = createModalBase();
      box.style.maxWidth = '650px';
      
      const title = document.createElement('h2');
      title.textContent = 'システムヘルス情報';
      title.style.cssText = 'margin-top: 0; margin-bottom: 20px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      content.appendChild(title);

      if (!window.ShinryoApp.ConfigManager) {
          content.innerHTML += '<p>情報を取得できませんでした。</p>';
      } else {
          const status = window.ShinryoApp.ConfigManager.getStorageStatus();
          const percent = Math.min(100, Math.round((status.length / status.limit) * 100));
          const colorClass = percent > 90 ? 'usage-red' : (percent > 70 ? 'usage-yellow' : 'usage-green');
          const avgSize = status.recordCount > 0 ? Math.round(status.length / status.recordCount) : 0;
          
          const lastUpdate = status.lastPublishedAt ? new Date(status.lastPublishedAt).toLocaleString() : '未公開';

          const table = document.createElement('table');
          table.className = 'health-info-table';
          table.innerHTML = `
              <tr>
                  <th>データ使用量</th>
                  <td>
                      <strong>${status.length.toLocaleString()} / ${status.limit.toLocaleString()} 文字 (${percent}%)</strong>
                      <div class="usage-bar-container"><div class="usage-bar-fill ${colorClass}" style="width: ${percent}%"></div></div>
                      <div class="health-desc">Kintoneの1フィールドあたりの制限（64,000文字）に対する現在の使用量です。100%に達すると設定の保存ができなくなります。</div>
                  </td>
              </tr>
              <tr>
                  <th>登録レコード数</th>
                  <td>
                      <strong>${status.recordCount.toLocaleString()} 件</strong>
                      <div class="health-desc">現在設定されている医師・シフト情報の総数です。</div>
                  </td>
              </tr>
              <tr>
                  <th>平均データサイズ</th>
                  <td>
                      <strong>${avgSize.toLocaleString()} 文字 / レコード</strong>
                      <div class="health-desc">1レコードあたりの平均的な消費文字数です。今後の拡張（医師の追加など）の目安になります。</div>
                  </td>
              </tr>
              <tr>
                  <th>最終公開日時</th>
                  <td>
                      <strong>${lastUpdate}</strong>
                      <div class="health-desc">設定が最後に予約フォーム（App 200）へ反映された日時です。</div>
                  </td>
              </tr>
              <tr>
                  <th>データ構造形式</th>
                  <td>
                      <strong>${status.isOldFormat ? '旧形式 (互換モード)' : '新形式 (最適化済み)'}</strong>
                      <div class="health-desc">内部データの保存形式です。新形式は診療科ごとの詳細設定などに対応しています。</div>
                  </td>
              </tr>
          `;
          content.appendChild(table);
      }

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';
      btnGroup.style.marginTop = '25px';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      closeBtn.textContent = '戻る';
      closeBtn.onclick = () => { document.body.removeChild(overlay); showAdminMenu(); };
      
      btnGroup.appendChild(closeBtn);
      content.appendChild(btnGroup);

      document.body.appendChild(overlay);
  }

  // ★追加: メールサーバー設定ダイアログ (showTicketAppSettingDialogから移動・独立)
  function showMailServerSettingDialog() {
      let config = JSON.parse(localStorage.getItem('shinryo_ticket_config') || '{}');
      const inputRefs = {};

      const checkDirty = (action) => {
          let isDirty = false;
          Object.keys(inputRefs).forEach(key => {
              if (inputRefs[key].value != (config[key] || '')) isDirty = true;
          });
          checkDirtyAndConfirm(isDirty, action);
      };

      const { overlay, box, content } = createModalBase((doClose) => checkDirty(doClose));
      box.style.maxWidth = '500px';
      
      const title = document.createElement('h2');
      title.textContent = 'メールサーバー設定';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700; text-align: center;';
      content.appendChild(title);

      const createInput = (label, key, type = 'text', options = null) => {
          const div = document.createElement('div');
          div.style.marginBottom = '15px';
          const lbl = document.createElement('label');
          lbl.textContent = label;
          lbl.style.display = 'block';
          lbl.style.fontSize = '12px';
          lbl.style.fontWeight = 'bold';
          lbl.style.marginBottom = '4px';
          div.appendChild(lbl);

          let inp;
          if (type === 'select') {
              inp = document.createElement('select');
              inp.className = 'custom-modal-input';
              options.forEach(opt => {
                  const o = document.createElement('option');
                  o.value = opt;
                  o.textContent = opt;
                  if (opt === (config[key] || 'None')) o.selected = true;
                  inp.appendChild(o);
              });
          } else {
              inp = document.createElement('input');
              inp.className = 'custom-modal-input';
              inp.type = type;
              inp.value = config[key] || '';
          }
          inp.style.marginBottom = '0';
          div.appendChild(inp);
          content.appendChild(div);
          inputRefs[key] = inp;
      };

      createInput('SMTPサーバー名', 'smtpServer');
      createInput('ポート番号', 'smtpPort', 'number');
      createInput('暗号方式', 'encryption', 'select', ['None', 'SSL', 'TLS']);
      createInput('ユーザー名', 'smtpUser');
      createInput('パスワード', 'smtpPass', 'password');
      createInput('送信元メールアドレス', 'mailAddress', 'email');

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';
      btnGroup.style.marginTop = '20px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => checkDirty(() => { document.body.removeChild(overlay); showAdminMenu(); });

      const saveBtn = document.createElement('button');
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.style.display = 'none'; // ★変更: 初期状態は非表示

      saveBtn.onclick = () => {
          Object.keys(inputRefs).forEach(key => {
              config[key] = inputRefs[key].value;
          });
          localStorage.setItem('shinryo_ticket_config', JSON.stringify(config));
          document.body.removeChild(overlay);
          showAdminMenu();
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      content.appendChild(btnGroup);

      document.body.appendChild(overlay);
  }

  // ★追加: アプリ連携設定ダイアログ (システム管理者用)
  function showAppIdSettingDialog() {
      let config = JSON.parse(localStorage.getItem('shinryo_ticket_config') || '{}');
      const inputRefs = {};

      const checkDirty = (action) => {
          const isDirty = inputRefs.appId.value != (config.appId || '');
          checkDirtyAndConfirm(isDirty, action);
      };

      const { overlay, box, content } = createModalBase((doClose) => checkDirty(doClose));
      box.style.maxWidth = '400px';
      
      const title = document.createElement('h2');
      title.textContent = 'アプリ連携設定';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700; text-align: center;';
      content.appendChild(title);

      const div = document.createElement('div');
      div.style.marginBottom = '15px';
      const lbl = document.createElement('label');
      lbl.textContent = '予約チケット管理アプリ番号 (AppID)';
      lbl.style.display = 'block';
      lbl.style.fontSize = '12px';
      lbl.style.fontWeight = 'bold';
      lbl.style.marginBottom = '4px';
      div.appendChild(lbl);

      const inp = document.createElement('input');
      inp.className = 'custom-modal-input';
      inp.type = 'number';
      inp.value = config.appId || '';
      inp.style.marginBottom = '0';
      div.appendChild(inp);
      content.appendChild(div);
      inputRefs.appId = inp;

      const desc = document.createElement('p');
      desc.textContent = '※通常は「142」が設定されています。アプリを移行した場合のみ変更してください。';
      desc.style.cssText = 'font-size: 11px; color: #888; margin-top: 10px;';
      content.appendChild(desc);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';
      btnGroup.style.marginTop = '20px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => checkDirty(() => { document.body.removeChild(overlay); showAdminMenu(); });

      const saveBtn = document.createElement('button');
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.onclick = () => {
          config.appId = inp.value;
          localStorage.setItem('shinryo_ticket_config', JSON.stringify(config));
          document.body.removeChild(overlay);
          showAdminMenu();
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      content.appendChild(btnGroup);

      document.body.appendChild(overlay);
      inp.focus();
  }

  // ★追加: 予約センター登録メニュー
  function showCenterRegistrationMenu() {
      const { overlay, box, content } = createModalBase();
      
      const title = document.createElement('h2');
      title.textContent = '予約センター登録';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      content.appendChild(title);

      const menuList = [
          { label: '予約センター名設定', icon: '🏷️', desc: 'ダッシュボードに表示するセンター名を設定します', action: () => { document.body.removeChild(overlay); showCenterNameInputDialog(); } },
          { label: '管轄施設', icon: '🏥', desc: 'このセンターが管理する施設(最大5件)を登録します', action: () => { document.body.removeChild(overlay); showFacilitySettingDialog(); } },
      ];

      menuList.forEach(item => {
          const btn = document.createElement('button');
          btn.className = 'custom-modal-menu-btn';
          btn.innerHTML = `<div class="menu-btn-icon">${item.icon}</div><div class="menu-btn-content"><div class="menu-btn-title">${item.label}</div><div class="menu-btn-desc">${item.desc}</div></div>`;
          btn.onclick = item.action;
          content.appendChild(btn);
      });

      const closeBtn = document.createElement('button');
      closeBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      closeBtn.textContent = '閉じる';
      closeBtn.style.marginTop = '15px';
      closeBtn.onclick = () => { document.body.removeChild(overlay); };
      content.appendChild(closeBtn);

      document.body.appendChild(overlay);
  }

  function showUrlSettingDialog() {
      const initialConfig = JSON.parse(localStorage.getItem('shinryo_url_config') || '{}');
      const initialFormUrl = localStorage.getItem('shinryo_form_url') || '';
      const inputRefs = {};

      const checkDirty = (action) => {
          let isDirty = false;
          Object.keys(inputRefs).forEach(key => {
              const currentVal = inputRefs[key].value.trim();
              if (key === 'shinryo_form_url') {
                  if (currentVal !== initialFormUrl) isDirty = true;
              } else {
                  if (currentVal !== (initialConfig[key] || '')) isDirty = true;
              }
          });
          checkDirtyAndConfirm(isDirty, action);
      };

      const { overlay, box, content } = createModalBase((doClose) => checkDirty(doClose));
      box.style.maxWidth = '600px';
      box.style.textAlign = 'left';
      
      const title = document.createElement('h2');
      title.textContent = '各種URL設定';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700; text-align: center;';
      content.appendChild(title);

      const createInput = (label, key, placeholder = '') => {
          const div = document.createElement('div');
          div.style.marginBottom = '15px';
          const lbl = document.createElement('label');
          lbl.textContent = label;
          lbl.style.display = 'block';
          lbl.style.fontSize = '12px';
          lbl.style.fontWeight = 'bold';
          lbl.style.marginBottom = '4px';
          const inp = document.createElement('input');
          inp.className = 'custom-modal-input';
          inp.style.marginBottom = '0';
          // 既存の shinryo_form_url は特別扱い
          if (key === 'shinryo_form_url') {
              inp.value = initialFormUrl;
          } else {
              inp.value = initialConfig[key] || '';
          }
          inp.placeholder = placeholder;
          div.appendChild(lbl);
          div.appendChild(inp);
          content.appendChild(div);
          
          inputRefs[key] = inp;
          return { inp, key };
      };

      const inputs = [
          createInput('予約チケット管理アプリURL', 'ticketAppUrl'),
          createInput('施設画像URL', 'facilityImgUrl'),
          createInput('病院施設ロゴURL', 'hospitalLogoUrl'),
          createInput('ふれあいGpロゴURL', 'groupLogoUrl'),
          createInput('診察券サンプルURL', 'ticketSampleUrl'),
          createInput('公開用 外来予約フォームURL', 'shinryo_form_url'),
          createInput('既読確定URL', 'readConfirmUrl')
      ];

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';
      btnGroup.style.marginTop = '20px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => checkDirty(() => { document.body.removeChild(overlay); showAdminMenu(); });

      const saveBtn = document.createElement('button');
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.onclick = () => {
          const urlConfig = JSON.parse(localStorage.getItem('shinryo_url_config') || '{}');
          
          inputs.forEach(item => {
              if (item.key === 'shinryo_form_url') {
                  localStorage.setItem('shinryo_form_url', item.inp.value.trim());
              } else {
                  urlConfig[item.key] = item.inp.value.trim();
              }
          });
          
          localStorage.setItem('shinryo_url_config', JSON.stringify(urlConfig));
          document.body.removeChild(overlay);
          showAdminMenu();
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      content.appendChild(btnGroup);

      document.body.appendChild(overlay);
  }

  // ★追加: スタッフ管理ダイアログ
  async function showStaffSettingDialog(isForced = false) {
      // 初期データのロード（DirtyCheck用）
      let initialStaffsJson = '[]';
      let initialUser = localStorage.getItem('shinryo_ticket_staff_name') || '';
      
      // 現在の編集状態
      let currentStaffs = [];
      let tempUser = initialUser;

      const checkDirty = (action) => {
          const currentStaffsJson = JSON.stringify(currentStaffs);
          const isDirty = (currentStaffsJson !== initialStaffsJson) || (tempUser !== initialUser);
          checkDirtyAndConfirm(isDirty, action);
      };

      const { overlay, box, content } = createModalBase((doClose) => {
          if (isForced) return; // 強制モード時は閉じさせない
          checkDirty(doClose);
      });

      box.style.maxWidth = '600px';
      
      // ★追加: 強制モード時のUI制御
      if (isForced) {
          const closeBtn = box.querySelector('div[style*="position: absolute"]'); // ×ボタン
          if (closeBtn) closeBtn.style.display = 'none';
          overlay.onclick = null; // 背景クリック無効
      }

      const title = document.createElement('h2');
      title.textContent = isForced ? '初期設定: スタッフ登録' : 'スタッフ管理';
      title.style.cssText = 'margin-top: 0; margin-bottom: 20px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      if (isForced) title.style.color = '#e74c3c';
      content.appendChild(title);

      // データ取得
      if (window.ShinryoApp.ConfigManager) {
          await window.ShinryoApp.ConfigManager.fetchPublishedData();
          const common = window.ShinryoApp.ConfigManager.getCommonSettings();
          if (common && Array.isArray(common.staffs)) {
              currentStaffs = JSON.parse(JSON.stringify(common.staffs)); // Deep Copy
          }
      }
      initialStaffsJson = JSON.stringify(currentStaffs);

      // ★追加: 保存ボタンの要素作成（表示制御用）
      const closeBtn = document.createElement('button');
      closeBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      closeBtn.textContent = '保存して閉じる';
      closeBtn.style.display = 'none'; // 初期状態は非表示

      // ★追加: 変更検知関数
      const updateSaveButtonVisibility = () => {
          const currentStaffsJson = JSON.stringify(currentStaffs);
          const isDirty = (currentStaffsJson !== initialStaffsJson) || (tempUser !== initialUser);
          closeBtn.style.display = isDirty ? 'inline-block' : 'none';
      };

      // --- ブラウザ利用者設定エリア ---
      const userSettingContainer = document.createElement('div');
      userSettingContainer.style.marginBottom = '20px';
      userSettingContainer.style.padding = '15px';
      userSettingContainer.style.backgroundColor = '#e8f5e9'; // 薄い緑
      userSettingContainer.style.borderRadius = '6px';
      userSettingContainer.style.textAlign = 'left';

      const userLabel = document.createElement('div');
      userLabel.textContent = 'この端末の利用者 (担当者)';
      userLabel.style.fontWeight = 'bold';
      userLabel.style.marginBottom = '8px';
      userLabel.style.fontSize = '12px';
      userSettingContainer.appendChild(userLabel);

      const userSelect = document.createElement('select');
      userSelect.className = 'custom-modal-input';
      userSelect.style.marginBottom = '5px';
      
      const updateUserSelect = () => {
          userSelect.innerHTML = '';
          const defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = '(未設定)';
          userSelect.appendChild(defaultOpt);
          
          currentStaffs.forEach(s => {
              const opt = document.createElement('option');
              opt.value = s.name;
              opt.textContent = s.name;
              if (s.name === tempUser) {
                  opt.selected = true;
              }
              userSelect.appendChild(opt);
          });
      };
      updateUserSelect();

      userSelect.onchange = () => {
          tempUser = userSelect.value; // 即時保存せず一時変数に保持
          updateSaveButtonVisibility();
      };

      const userDesc = document.createElement('div');
      userDesc.textContent = '※あなたが現在操作している端末（つまりこの端末）は、ここで選択した名前が予約チケット管理アプリの操作時に「担当者」として紐づけられます。';
      userDesc.style.fontSize = '10px';
      userDesc.style.color = '#666';
      
      userSettingContainer.appendChild(userSelect);
      userSettingContainer.appendChild(userDesc);
      
      // リストの前に挿入
      content.appendChild(userSettingContainer);

      const container = document.createElement('div');
      container.style.textAlign = 'left';
      container.style.marginBottom = '20px';
      container.style.maxHeight = '400px';
      container.style.overflowY = 'auto';

      // リスト表示関数
      const renderList = () => {
          container.innerHTML = '';
          if (currentStaffs.length === 0) {
              container.innerHTML = '<div style="color:#999; text-align:center; padding:20px;">登録されているスタッフはいません</div>';
          } else {
              currentStaffs.forEach((staff, idx) => {
                  const row = document.createElement('div');
                  row.style.display = 'flex';
                  row.style.alignItems = 'center';
                  row.style.padding = '8px';
                  row.style.borderBottom = '1px solid #eee';
                  
                  // ★追加: アクセス情報表示
                  let accessInfo = '';
                  if (staff.lastAccess) {
                      const d = new Date(staff.lastAccess);
                      const dateStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                      
                      let browserInfo = '';
                      if (staff.userAgent) {
                          const ua = staff.userAgent;
                          let browser = 'Other';
                          if (ua.includes('Edg')) browser = 'Edge';
                          else if (ua.includes('Chrome')) browser = 'Chrome';
                          else if (ua.includes('Firefox')) browser = 'Firefox';
                          else if (ua.includes('Safari')) browser = 'Safari';
                          
                          let os = '';
                          if (ua.includes('Windows')) os = 'Win';
                          else if (ua.includes('Mac')) os = 'Mac';
                          else if (ua.includes('Linux')) os = 'Linux';
                          else if (ua.includes('Android')) os = 'Android';
                          else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                          
                          browserInfo = ` <span title="${ua}">(${browser}/${os})</span>`;
                      }
                      accessInfo = `<div style="font-size:10px; color:#999; margin-top:2px;">最終アクセス: ${dateStr}${browserInfo}</div>`;
                  }

                  row.innerHTML = `
                    <div style="flex:1; text-align:left;">
                        <div style="font-weight:bold;">${staff.name}</div>
                        ${accessInfo}
                    </div>
                    <button class="custom-modal-btn" style="padding:4px 10px; font-size:12px; background:#e74c3c; color:#fff; margin-left:10px;">削除</button>
                  `;
                  row.querySelector('button').onclick = async () => {
                      if(await showCustomDialog(`「${staff.name}」を削除しますか？`, 'confirm')) {
                          // ★追加: 削除対象が現在の選択ユーザーならクリア
                          if (staff.name === tempUser) {
                              tempUser = '';
                          }
                          currentStaffs.splice(idx, 1);
                          renderList();
                          updateUserSelect(); // 削除反映
                          updateSaveButtonVisibility();
                      }
                  };
                  container.appendChild(row);
              });
          }
      };
      renderList();
      content.appendChild(container);

      // 追加フォーム
      const addForm = document.createElement('div');
      addForm.style.display = 'flex';
      addForm.style.flexDirection = 'column';
      addForm.style.gap = '10px';
      addForm.style.marginBottom = '20px';
      addForm.innerHTML = `
        <div style="display:flex; gap:10px;">
            <input type="text" class="custom-modal-input" placeholder="スタッフ名 (必須)" style="margin:0; flex:1;" id="new-staff-name">
        </div>
        <button class="custom-modal-btn custom-modal-btn-ok" style="align-self:flex-end; min-width:80px;">追加</button>`;
      addForm.querySelector('button').onclick = () => {
          const name = document.getElementById('new-staff-name').value.trim();
          if(name) {
              currentStaffs.push({ name: name });
              document.getElementById('new-staff-name').value = '';
              
              // ★追加: 追加したスタッフを自動選択
              tempUser = name;

              renderList();
              updateUserSelect(); // 追加反映
              updateSaveButtonVisibility();
          }
      };
      box.appendChild(addForm);

      closeBtn.onclick = async () => {
          const ticketConfig = JSON.parse(localStorage.getItem('shinryo_ticket_config') || '{}');
          const targetAppId = ticketConfig.appId || 142;

          // ★追加: 保存処理中はオーバーレイクリックを無効化
          overlay.onclick = null;

          // ★変更: ダイアログを閉じずに、ローディング表示に切り替える（操作ブロック）
          box.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 30px; margin-bottom: 15px; display: inline-block;">⏳</div>
                <div style="font-weight: bold; font-size: 18px; color: #333; margin-bottom: 10px;">保存と同期を実行中...</div>
                <div style="font-size: 13px; color: #666;">画面を閉じずにそのままお待ちください。</div>
            </div>
          `;

          try {
              // ブラウザ利用者の保存
              localStorage.setItem('shinryo_ticket_staff_name', tempUser);
              
              // ★追加: 互換性のため旧キーも同期（削除時は削除）
              if (tempUser) {
                  localStorage.setItem('customKey', tempUser);
              } else {
                  localStorage.removeItem('customKey');
              }

              // 共通設定の保存
              await window.ShinryoApp.ConfigManager.updateCommonStaffs(currentStaffs);

              // 予約チケット管理アプリのドロップダウン同期
              const staffNames = currentStaffs.map(s => s.name);
              await window.ShinryoApp.ConfigManager.syncExternalAppDropdown(142, '担当者', staffNames);
              if (targetAppId != 142) {
                  await window.ShinryoApp.ConfigManager.syncExternalAppDropdown(targetAppId, '担当者', staffNames);
              }

              // ★修正: 完了メッセージを表示せず即座にリロード
              location.reload();
          } catch(e) {
              await showCustomDialog('保存または同期に失敗しました。\n' + e.message, 'alert');
              location.reload();
              box.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <div style="font-size: 40px; color: #e74c3c; margin-bottom: 15px;">✖</div>
                    <div style="font-weight: bold; font-size: 18px; color: #333; margin-bottom: 10px;">保存に失敗しました</div>
                    <div style="font-size: 13px; color: #666; margin-bottom: 15px;">${e.message}</div>
                    <div style="font-size: 12px; color: #888;">自動的にリロードします...</div>
                </div>
              `;
              setTimeout(() => {
                  location.reload();
              }, 3000);
          }
      };
      box.appendChild(closeBtn);
      document.body.appendChild(overlay);
  }

  function showCenterNameInputDialog() {
      const initialVal = localStorage.getItem('shinryo_center_name') || '湘南東部外来予約センター';
      let inputEl;

      const checkDirty = (action) => {
          const currentVal = inputEl ? inputEl.value : initialVal;
          const isDirty = currentVal !== initialVal;
          checkDirtyAndConfirm(isDirty, action);
      };

      const { overlay, box, content } = createModalBase((doClose) => checkDirty(doClose));
      
      const title = document.createElement('h2');
      title.textContent = '予約センター名の登録';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      content.appendChild(title);

      const desc = document.createElement('p');
      desc.textContent = 'ダッシュボードに表示する予約センター名を入力してください。';
      desc.style.cssText = 'text-align: left; font-size: 14px; color: #666; margin-bottom: 10px;';
      content.appendChild(desc);

      const input = document.createElement('input');
      inputEl = input;
      input.className = 'custom-modal-input';
      input.value = initialVal;
      content.appendChild(input);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => checkDirty(() => { document.body.removeChild(overlay); showCenterRegistrationMenu(); });

      const saveBtn = document.createElement('button');
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.onclick = () => {
          const val = input.value.trim();
          if (val) {
              localStorage.setItem('shinryo_center_name', val);
              document.body.removeChild(overlay);
              location.reload(); // 反映のためリロード
          } else {
              // 簡易バリデーション（空の場合は保存しない）
              input.style.borderColor = 'red';
          }
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      content.appendChild(btnGroup);

      document.body.appendChild(overlay);
      input.focus();
  }

  // 祝日データ取得ヘルパー
  async function fetchPublicHolidays() {
      const url = 'https://holidays-jp.github.io/api/v1/date.json';
      try {
          if (typeof kintone !== 'undefined' && kintone.proxy) {
              const [body, status] = await kintone.proxy(url, 'GET', {}, {});
              if (status === 200) return JSON.parse(body);
              else throw new Error(`Proxy Status ${status}`);
          } else {
              const res = await fetch(url);
              return await res.json();
          }
      } catch(e) { console.warn('祝日取得失敗', e); return {}; }
  }

  // ★追加: 休診日設定ダイアログ
  async function showHolidaySettingDialog() {
      const { overlay, box } = createModalBase();
      box.style.maxWidth = '900px';
      box.style.width = '95%';
      
      const title = document.createElement('h2');
      title.textContent = '予約待受期間・休診日設定';
      title.style.cssText = 'margin-top: 0; margin-bottom: 15px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      box.appendChild(title);

      // 祝日データの取得
      const publicHolidays = await fetchPublicHolidays();

      // 現在の設定を取得
      let currentHolidays = new Set();
      let currentExceptions = new Set(); // 例外診療日
      let closeSaturdays = false;
      let currentStart = '', currentDuration = '';

      if (window.ShinryoApp.ConfigManager) {
          await window.ShinryoApp.ConfigManager.fetchPublishedData();
          const common = window.ShinryoApp.ConfigManager.getCommonSettings();
          if (common && Array.isArray(common.holidays)) {
              common.holidays.forEach(d => currentHolidays.add(d));
          }
          if (common && Array.isArray(common.exceptionalDays)) {
              common.exceptionalDays.forEach(d => currentExceptions.add(d));
          }
          if (common && typeof common.closeSaturdays === 'boolean') {
              closeSaturdays = common.closeSaturdays;
          }
          if (common) {
              currentStart = common.start || '';
              currentDuration = common.duration || '';
          }
      }

      // ★追加: 変更検知用の初期値保存
      const initialHolidays = new Set(currentHolidays);
      const initialExceptions = new Set(currentExceptions);
      const initialCloseSaturdays = closeSaturdays;
      const initialStart = currentStart;
      const initialDuration = currentDuration;

      // UIコンテナ
      const controlsContainer = document.createElement('div');
      controlsContainer.style.marginBottom = '15px';
      controlsContainer.style.textAlign = 'left'; 
      
      // 土曜休診設定チェックボックス (定義位置を移動)
      const satLabel = document.createElement('label');
      satLabel.style.display = 'inline-flex';
      satLabel.style.alignItems = 'center';
      satLabel.style.cursor = 'pointer';
      satLabel.style.fontWeight = 'bold';
      satLabel.style.marginLeft = '20px'; // 左マージン追加
      satLabel.style.whiteSpace = 'nowrap'; // 折り返し防止
      
      const satInput = document.createElement('input');
      satInput.type = 'checkbox';
      satInput.checked = closeSaturdays;
      satInput.style.marginRight = '8px';
      
      satLabel.appendChild(satInput);
      satLabel.appendChild(document.createTextNode('土曜日をデフォルトで休診日とする'));

      // --- 待受期間設定UIの移植 ---
      const termContainer = document.createElement('div');
      termContainer.style.cssText = 'display: flex; gap: 20px; align-items: center; margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;';
      
      const createInput = (label, val, maxVal, minVal, width = '80px') => {
          const div = document.createElement('div');
          div.innerHTML = `<div style="font-weight:bold;margin-bottom:5px;font-size:12px;">${label}</div>`;
          const inp = document.createElement('input');
          inp.className = 'custom-modal-input';
          inp.style.marginBottom = '0';
          inp.style.width = width;
          inp.type = 'number';
          
          if (minVal !== undefined && minVal !== null) inp.min = minVal;
          if (maxVal !== undefined && maxVal !== null) inp.max = maxVal;

          inp.oninput = function() {
              if (this.value === '') return;
              if (maxVal !== undefined && maxVal !== null && Number(this.value) > maxVal) this.value = maxVal;
          };
          inp.onchange = function() {
              if (this.value === '') return;
              if (minVal !== undefined && minVal !== null && Number(this.value) < minVal) this.value = minVal;
          };

          inp.value = val;
          div.appendChild(inp);
          return { div, inp };
      };

      const startInputObj = createInput('予約開始 (日後)', currentStart, null, 1);
      const durationInputObj = createInput('予約可能期間 (日間)', currentDuration, 60, 1);
      
      termContainer.appendChild(startInputObj.div);
      termContainer.appendChild(durationInputObj.div);
      
      const termDesc = document.createElement('div');
      termDesc.style.cssText = 'font-size: 11px; color: #666; line-height: 1.4; flex: 1; margin-left: 10px;';
      termDesc.innerHTML = `
        <strong>予約開始：</strong>本日を0日目として、何日後から予約を受け付けるかを設定（休診日はカウント除外）<br>
        <strong>予約可能期間：</strong>予約開始日から何日先までを予約可能にするかを設定(休診日もカウントする）
      `;
      termContainer.appendChild(termDesc);
      
      termContainer.appendChild(satLabel); // コンテナ内に配置
      
      controlsContainer.appendChild(termContainer);
      // ---------------------------

      // ★追加: 保存ボタン参照と変更検知関数
      let saveBtnElement = null;
      const checkChanges = () => {
          if (!saveBtnElement) return;
          let isChanged = false;

          if (satInput.checked !== initialCloseSaturdays) isChanged = true;
          if (String(startInputObj.inp.value) !== String(initialStart)) isChanged = true;
          if (String(durationInputObj.inp.value) !== String(initialDuration)) isChanged = true;

          if (!isChanged) {
              if (currentHolidays.size !== initialHolidays.size) isChanged = true;
              else {
                  for (const d of currentHolidays) if (!initialHolidays.has(d)) { isChanged = true; break; }
              }
          }
          if (!isChanged) {
              if (currentExceptions.size !== initialExceptions.size) isChanged = true;
              else {
                  for (const d of currentExceptions) if (!initialExceptions.has(d)) { isChanged = true; break; }
              }
          }
          saveBtnElement.style.display = isChanged ? 'inline-block' : 'none';
      };

      box.appendChild(controlsContainer);

      const thisYear = new Date().getFullYear();
      const years = [thisYear, thisYear + 1];
      
      // 本日と予約期限の計算
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let limitDate = null;
      let startDate = null;
      
      // 初期値で計算
      const initS = parseInt(currentStart, 10) || 0;
      const initD = parseInt(currentDuration, 10) || 0;
      limitDate = new Date(today);
      limitDate.setDate(today.getDate() + initS + initD);

      startDate = new Date(today);
      startDate.setDate(today.getDate() + initS);

      // タブUI
      const tabContainer = document.createElement('div');
      tabContainer.style.display = 'flex';
      tabContainer.style.borderBottom = '1px solid #ccc';
      tabContainer.style.marginBottom = '15px';

      const contentContainer = document.createElement('div');
      contentContainer.style.height = '50vh';
      contentContainer.style.overflowY = 'auto';
      contentContainer.style.border = '1px solid #eee';
      contentContainer.style.padding = '10px';

      const renderCalendar = (year, container) => {
          container.innerHTML = '';

          // ★追加: 年度リセットボタン
          const headerActions = document.createElement('div');
          headerActions.style.display = 'flex';
          headerActions.style.justifyContent = 'flex-end';
          headerActions.style.marginBottom = '10px';

          const resetBtn = document.createElement('button');
          resetBtn.textContent = `${year}年の設定を初期化`;
          resetBtn.style.cssText = 'padding: 6px 12px; font-size: 12px; cursor: pointer; background-color: #fff; border: 1px solid #d9534f; color: #d9534f; border-radius: 4px; transition: all 0.2s;';
          resetBtn.onmouseover = () => { resetBtn.style.backgroundColor = '#d9534f'; resetBtn.style.color = '#fff'; };
          resetBtn.onmouseout = () => { resetBtn.style.backgroundColor = '#fff'; resetBtn.style.color = '#d9534f'; };

          resetBtn.onclick = async () => {
              const confirmed = await showCustomDialog(
                  `${year}年の設定をすべて初期状態（デフォルト）に戻しますか？\n\nこの操作により、${year}年内の手動設定（休診日・例外診療日）がすべて削除されます。`,
                  'confirm',
                  { ok: '初期化する', cancel: 'キャンセル' }
              );
              if (confirmed) {
                  const prefix = `${year}-`;
                  const hToRemove = Array.from(currentHolidays).filter(d => d.startsWith(prefix));
                  hToRemove.forEach(d => currentHolidays.delete(d));
                  const eToRemove = Array.from(currentExceptions).filter(d => d.startsWith(prefix));
                  eToRemove.forEach(d => currentExceptions.delete(d));
                  renderCalendar(year, container);
                  checkChanges();
              }
          };
          headerActions.appendChild(resetBtn);
          container.appendChild(headerActions);

          const grid = document.createElement('div');
          grid.style.display = 'grid';
          grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
          grid.style.gap = '15px';

          for (let m = 0; m < 12; m++) {
              const monthDiv = document.createElement('div');
              monthDiv.style.border = '1px solid #ddd';
              monthDiv.style.padding = '5px';
              monthDiv.style.borderRadius = '4px';
              
              const monthTitle = document.createElement('div');
              monthTitle.textContent = `${year}年 ${m + 1}月`;
              monthTitle.style.fontWeight = 'bold';
              monthTitle.style.textAlign = 'center';
              monthTitle.style.marginBottom = '5px';
              monthTitle.style.backgroundColor = '#f0f0f0';
              monthDiv.appendChild(monthTitle);

              const calTable = document.createElement('div');
              calTable.style.display = 'grid';
              calTable.style.gridTemplateColumns = 'repeat(7, 1fr)';
              calTable.style.fontSize = '12px';
              calTable.style.textAlign = 'center';

              // 曜日ヘッダー
              ['日','月','火','水','木','金','土'].forEach((d, i) => {
                  const cell = document.createElement('div');
                  cell.textContent = d;
                  if(i===0) cell.style.color = 'red';
                  if(i===6) cell.style.color = 'blue';
                  calTable.appendChild(cell);
              });

              const firstDay = new Date(year, m, 1);
              const lastDay = new Date(year, m + 1, 0);
              
              // 空白セル
              for(let i=0; i<firstDay.getDay(); i++) {
                  calTable.appendChild(document.createElement('div'));
              }

              // 日付セル
              for(let d=1; d<=lastDay.getDate(); d++) {
                  const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; // YYYY-MM-DD
                  const cell = document.createElement('div');
                  cell.textContent = d;
                  cell.style.cursor = 'pointer';
                  cell.style.padding = '4px 0';
                  cell.style.borderRadius = '2px';
                  cell.style.position = 'relative';
                  
                  const dayOfWeek = new Date(year, m, d).getDay();
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;
                  const isPublicHoliday = !!publicHolidays[dateStr];

                  // 本日・予約期限判定
                  const currentDate = new Date(year, m, d);
                  const isToday = currentDate.getTime() === today.getTime();
                  const isStart = startDate && currentDate.getTime() === startDate.getTime();
                  const isLimit = limitDate && currentDate.getTime() === limitDate.getTime();

                  if (isToday) {
                      cell.classList.add('cell-today');
                      const lbl = document.createElement('div');
                      lbl.className = 'cell-label-tag label-today'; lbl.textContent = '本日'; cell.appendChild(lbl);
                  }
                  if (isStart) {
                      cell.classList.add('cell-limit');
                      const lbl = document.createElement('div');
                      lbl.className = 'cell-label-tag label-limit'; lbl.textContent = 'start'; cell.appendChild(lbl);
                  }
                  if (isLimit) {
                      cell.classList.add('cell-limit');
                      const lbl = document.createElement('div');
                      lbl.className = 'cell-label-tag label-limit'; lbl.textContent = 'end'; cell.appendChild(lbl);
                  }
                  
                  // 状態判定ロジック
                  const updateStyle = () => {
                      // スタイルのリセット
                      cell.style.border = 'none';
                      cell.style.borderRadius = '2px';

                      let isClosed = false;
                      let isException = false;
                      let isManualClosed = false;
                      const isDefaultHoliday = isSunday || isPublicHoliday || (isSaturday && satInput.checked);

                      // 1. デフォルトの休み判定
                      if (isDefaultHoliday) isClosed = true;

                      // 2. 個別設定による上書き
                      if (currentHolidays.has(dateStr)) {
                          isClosed = true;
                          isManualClosed = true;
                      }
                      if (currentExceptions.has(dateStr)) {
                          isClosed = false;
                          isException = true;
                      }

                      // スタイル適用
                      if (isException) {
                          // 例外診療日（青）
                          cell.style.backgroundColor = '#e3f2fd';
                          cell.style.color = '#1976d2';
                          cell.style.fontWeight = 'bold';
                          cell.title = '例外診療日 (本来は休日ですが診療します)';
                          // 元々が固定休日の場合は、点線で囲んで例外であることを示す
                          if (isDefaultHoliday) {
                              cell.style.border = '2px dotted #1976d2';
                          }
                      } else if (isClosed) {
                          // 休診日（赤）
                          cell.style.backgroundColor = '#ffcccc';
                          cell.style.color = '#d9534f';
                          cell.style.fontWeight = 'bold';
                          cell.title = isManualClosed ? '休診日 (手動設定)' : (publicHolidays[dateStr] || '休診日');
                          // 固定的な休日（日曜・祝日）の場合は、丸枠で囲む
                          if (isDefaultHoliday) {
                              cell.style.border = '2px solid #d9534f';
                              cell.style.borderRadius = '50%';
                          }
                      } else {
                          // 稼働日（透明）
                          cell.style.backgroundColor = 'transparent';
                          cell.style.color = '#333';
                          cell.style.fontWeight = 'normal';
                          cell.title = '診療日';
                      }
                  };
                  updateStyle();

                  cell.onclick = () => {
                      // 現在の状態を再計算
                      let isClosedDefault = (isSunday || isPublicHoliday || (isSaturday && satInput.checked));
                      
                      if (isClosedDefault) {
                          // デフォルト休日の場合 -> 例外診療(Open)のトグル
                          if (currentExceptions.has(dateStr)) currentExceptions.delete(dateStr);
                          else currentExceptions.add(dateStr);
                          // 手動休診設定があれば消す（矛盾防止）
                          if (currentHolidays.has(dateStr)) currentHolidays.delete(dateStr);
                      } else {
                          // デフォルト稼働日の場合 -> 手動休診(Closed)のトグル
                          if (currentHolidays.has(dateStr)) currentHolidays.delete(dateStr);
                          else currentHolidays.add(dateStr);
                          // 例外設定があれば消す
                          if (currentExceptions.has(dateStr)) currentExceptions.delete(dateStr);
                      }
                      updateStyle();
                      checkChanges();
                  };
                  calTable.appendChild(cell);
              }
              monthDiv.appendChild(calTable);
              grid.appendChild(monthDiv);
          }
          container.appendChild(grid);
      };

      // 再描画・再計算関数
      const refreshView = () => {
          // 予約期限の再計算
          const s = parseInt(startInputObj.inp.value, 10) || 0;
          const d = parseInt(durationInputObj.inp.value, 10) || 0;
          limitDate = new Date(today);
          limitDate.setDate(today.getDate() + s + d);
          startDate = new Date(today);
          startDate.setDate(today.getDate() + s);

          // 現在表示中のカレンダーを再描画してスタイル更新
          const activeTab = Array.from(tabContainer.children).find(t => t.style.fontWeight === 'bold');
          if (activeTab) activeTab.click();
          checkChanges();
      };

      // イベントリスナー設定
      satInput.onchange = refreshView;
      startInputObj.inp.addEventListener('input', refreshView);
      durationInputObj.inp.addEventListener('input', refreshView);

      years.forEach((y, idx) => {
          const tab = document.createElement('div');
          tab.textContent = `${y}年`;
          tab.style.padding = '10px 20px';
          tab.style.cursor = 'pointer';
          tab.style.borderBottom = idx === 0 ? '3px solid #3498db' : '3px solid transparent';
          tab.style.fontWeight = idx === 0 ? 'bold' : 'normal';
          tab.style.color = idx === 0 ? '#3498db' : '#666';
          
          tab.onclick = () => {
              Array.from(tabContainer.children).forEach(t => {
                  t.style.borderBottom = '3px solid transparent';
                  t.style.fontWeight = 'normal';
                  t.style.color = '#666';
              });
              tab.style.borderBottom = '3px solid #3498db';
              tab.style.fontWeight = 'bold';
              tab.style.color = '#3498db';
              renderCalendar(y, contentContainer);
          };
          tabContainer.appendChild(tab);
      });

      box.appendChild(tabContainer);
      box.appendChild(contentContainer);
      
      // 初期表示
      renderCalendar(thisYear, contentContainer);

      const note = document.createElement('div');
      note.innerHTML = '※日付をクリックすると設定を切り替えられます。<br><span style="color:#d9534f;font-weight:bold;">■ 赤色：休診日</span>　<span style="color:#1976d2;font-weight:bold;">■ 青色：例外診療日（祝日等だが診療する日）</span>';
      note.style.fontSize = '12px';
      note.style.color = '#666';
      note.style.marginTop = '10px';
      note.style.textAlign = 'left';
      box.appendChild(note);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';
      btnGroup.style.marginTop = '20px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => { document.body.removeChild(overlay); };

      const saveBtn = document.createElement('button');
      saveBtnElement = saveBtn;
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.style.display = 'none';
      saveBtn.onclick = async () => {
          const newStart = startInputObj.inp.value.trim();
          const newDuration = durationInputObj.inp.value.trim();

          if (parseInt(newDuration, 10) > 60) {
              await showCustomDialog('予約可能期間は最大60日までです。', 'alert');
              return;
          }
          if (parseInt(newStart, 10) < 1) {
              await showCustomDialog('予約開始は1日以上で設定してください。', 'alert');
              return;
          }
          if (parseInt(newDuration, 10) < 1) {
              await showCustomDialog('予約可能期間は1日以上で設定してください。', 'alert');
              return;
          }

          const sortedHolidays = Array.from(currentHolidays).sort();
          const sortedExceptions = Array.from(currentExceptions).sort();
          document.body.removeChild(overlay);
          try {
              await window.ShinryoApp.ConfigManager.updateCommonCalendarSettings(sortedHolidays, sortedExceptions, satInput.checked, newStart, newDuration);
              await showCustomDialog('設定を保存しました。', 'alert');
              // 画面更新
              location.reload(); // ★変更: リロード
          } catch(e) {
              await showCustomDialog('保存に失敗しました。', 'alert');
          }
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      box.appendChild(btnGroup);

      document.body.appendChild(overlay);
  }

  // ★追加: 管轄施設設定ダイアログ
  async function showFacilitySettingDialog() {
      const { overlay, box } = createModalBase();
      box.style.maxWidth = '800px';
      
      const title = document.createElement('h2');
      title.textContent = '管轄施設設定';
      title.style.cssText = 'margin-top: 0; margin-bottom: 20px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      box.appendChild(title);

      // 現在の設定を取得
      let currentFacilities = [];
      if (window.ShinryoApp.ConfigManager) {
          await window.ShinryoApp.ConfigManager.fetchPublishedData();
          const common = window.ShinryoApp.ConfigManager.getCommonSettings();
          if (common && Array.isArray(common.facilities)) {
              currentFacilities = common.facilities;
          }
      }

      const container = document.createElement('div');
      container.style.textAlign = 'left';
      container.style.marginBottom = '20px';

      // ヘッダー
      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.fontWeight = 'bold';
      headerRow.style.marginBottom = '10px';
      headerRow.style.fontSize = '12px';
      headerRow.innerHTML = `
        <div style="width: 40px; text-align: center;">No.</div>
        <div style="flex: 2; padding: 0 5px;">施設名 (正式名称)</div>
        <div style="width: 80px; padding: 0 5px;">省略記号</div>
        <div style="width: 50px; padding: 0 5px;">色</div>
        <div style="flex: 1; padding: 0 5px;">デフォルト診療科</div>
        <div style="flex: 3; padding: 0 5px;">アクセス (URL)</div>
      `;
      container.appendChild(headerRow);

      const inputs = [];
      // デフォルト色パレット
      const defaultColors = ['#007bff', '#28a745', '#e67e22', '#9b59b6', '#e74c3c'];

      for (let i = 0; i < 5; i++) {
          const fac = currentFacilities[i] || {};
          const color = fac.color || defaultColors[i % defaultColors.length];
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.marginBottom = '10px';
          row.style.alignItems = 'center';

          row.innerHTML = `
            <div style="width: 40px; text-align: center; font-weight: bold;">${i + 1}</div>
            <div style="flex: 2; padding: 0 5px;"><input type="text" class="custom-modal-input" style="margin:0; padding: 8px;" placeholder="例: 湘南東部総合病院" value="${fac.name || ''}"></div>
            <div style="width: 80px; padding: 0 5px;"><input type="text" class="custom-modal-input" style="margin:0; padding: 8px; text-align:center;" placeholder="例: Ⓖ" value="${fac.shortName || ''}"></div>
            <div style="width: 50px; padding: 0 5px;"><input type="color" class="custom-modal-input" style="margin:0; padding: 2px; height: 36px;" value="${color}"></div>
            <div style="flex: 1; padding: 0 5px;"><input type="text" class="custom-modal-input" style="margin:0; padding: 8px;" placeholder="例: 内科" value="${fac.defaultDept || ''}"></div>
            <div style="flex: 3; padding: 0 5px;"><input type="text" class="custom-modal-input" style="margin:0; padding: 8px;" placeholder="https://..." value="${fac.url || ''}"></div>
          `;
          container.appendChild(row);
          inputs.push(row);
      }
      box.appendChild(container);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => { document.body.removeChild(overlay); showCenterRegistrationMenu(); };

      const saveBtn = document.createElement('button');
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.onclick = async () => {
          const newFacilities = inputs.map(row => {
              const inps = row.querySelectorAll('input');
              return { 
                  name: inps[0].value.trim(), 
                  shortName: inps[1].value.trim(), 
                  color: inps[2].value,
                  defaultDept: inps[3].value.trim(),
                  url: inps[4].value.trim() 
              };
          }).filter(f => f.name); // 名前があるものだけ保存

          // ★追加: 確認ダイアログ
          const confirmed = await showCustomDialog(
              '管轄施設設定を保存します。\n同時に、アプリの「施設名」ドロップダウンの選択肢も更新しますか？\n（更新には管理者権限が必要です）',
              'confirm',
              { ok: '保存して更新', cancel: 'キャンセル' }
          );
          if (!confirmed) return;

          document.body.removeChild(overlay);
          try {
              // 1. 共通設定保存
              await window.ShinryoApp.ConfigManager.updateCommonFacilities(newFacilities);
              // 2. アプリのドロップダウン更新
              const facilityNames = newFacilities.map(f => f.name);
              await window.ShinryoApp.ConfigManager.syncAppDropdown('施設名', facilityNames);
              await showCustomDialog('設定を保存し、アプリの更新を開始しました。\n反映完了まで数分かかる場合があります。', 'alert');
              location.reload();
          } catch(e) {
              await showCustomDialog('保存またはアプリ更新に失敗しました。\n' + e.message, 'alert');
          }
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      box.appendChild(btnGroup);
      document.body.appendChild(overlay);
  }

  // 公開実行処理
  async function executePublish() {
    try {
        const records = await fetchAllRecords(kintone.app.getId());
        
        // ★追加: 表示順でソートしてから保存する
        records.sort((a, b) => {
            const oa = parseInt(a['表示順']?.value || 9999, 10);
            const ob = parseInt(b['表示順']?.value || 9999, 10);
            if (oa !== ob) return oa - ob;
            return parseInt(a.$id.value, 10) - parseInt(b.$id.value, 10);
        });

        const publishedData = await window.ShinryoApp.ConfigManager.fetchPublishedData();
        const descriptions = publishedData.descriptions || {};
        
        await window.ShinryoApp.ConfigManager.saveConfig(records, descriptions);
        
        // ★追加: 本番環境へ反映 (設定情報2 -> 設定情報)
        await window.ShinryoApp.ConfigManager.deployToProduction();

        await showCustomDialog('設定を公開しました。', 'alert');
        location.reload();
    } catch (e) {
        console.error('公開エラー:', e);
        await showCustomDialog('公開に失敗しました。\n' + e.message, 'alert');
    }
  }

  // 全レコード取得用ヘルパー
  async function fetchAllRecords(appId) {
    let allRecords = [];
    let offset = 0;
    const limit = 500;
    while (true) {
      const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', { app: appId, query: `limit ${limit} offset ${offset}` });
      allRecords = allRecords.concat(resp.records);
      offset += resp.records.length;
      if (resp.records.length < limit) break;
    }
    return allRecords;
  }

  // --- 編集モード用フィルター機能 ---
  async function createEditModeFilters(parentElement) {
    if (document.getElementById('custom-edit-filters')) return;

    // フィルターコンテナの作成
    const container = document.createElement('div');
    container.id = 'custom-edit-filters';
    container.style.display = 'flex';
    container.style.alignItems = 'flex-end';
    container.style.marginLeft = '20px';
    container.style.gap = '10px';

    if (parentElement) {
        parentElement.appendChild(container);
    } else {
        kintone.app.getHeaderMenuSpaceElement().appendChild(container);
    }

    // 全レコード取得（選択肢生成用）
    const records = await fetchAllRecords(kintone.app.getId());
    
    // --- 競合チェック用ロジック ---
    const days = ['月', '火', '水', '木', '金', '土'];
    const weeks = ['1', '2', '3', '4', '5'];
    const scheduleFields = days.flatMap(d => weeks.map(w => d + w));

    const getScheduleSet = (rec) => {
        const set = new Set();
        scheduleFields.forEach(field => {
            const val = rec[field]?.value || [];
            if (val.includes('午前')) set.add(`${field}_AM`);
            if (val.includes('午後')) set.add(`${field}_PM`);
        });
        return set;
    };

    const isRecordConflicting = (currentRec) => {
        const currentTag = currentRec['集合'] ? currentRec['集合'].value : '';
        if (!currentTag) return false;

        const currentId = currentRec['$id'].value;
        const currentStart = currentRec['着任日']?.value ? new Date(currentRec['着任日'].value).getTime() : -8640000000000000;
        const currentEnd = currentRec['離任日']?.value ? new Date(currentRec['離任日'].value).getTime() : 8640000000000000;
        const currentSchedule = getScheduleSet(currentRec);

        return records.some(other => {
            if (other['$id'].value === currentId) return false;
            if ((other['集合']?.value || '') !== currentTag) return false;

            const otherStart = other['着任日']?.value ? new Date(other['着任日'].value).getTime() : -8640000000000000;
            const otherEnd = other['離任日']?.value ? new Date(other['離任日'].value).getTime() : 8640000000000000;

            // 1. 期間重複判定
            if (!(currentStart <= otherEnd && currentEnd >= otherStart)) return false;

            // 2. 時間割重複判定
            const otherSchedule = getScheduleSet(other);
            for (let slot of currentSchedule) { if (otherSchedule.has(slot)) return true; }
            return false;
        });
    };

    const filters = [
        { label: '診療科', field: '診療科' },
        { label: '診察施設', field: '施設名' },
        { label: '医師', field: '医師名' }
    ];

    // 現在のクエリから選択状態を復元するためのヘルパー
    // URLパラメータを優先しつつ、kintone.app.getQueryCondition() もフォールバックとして使用
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get('query') || '';
    const appQuery = kintone.app.getQueryCondition() || '';
    const currentQuery = urlQuery || appQuery;

    const getQueryValue = (field) => {
        // 正規表現を調整: スペースの柔軟性向上
        const re = new RegExp(`${field}\\s*(?:=|in)\\s*(?:\\"([^"]+)\\"|\\(\\s*\\"([^"]+)\\"\\s*\\))`);
        const match = currentQuery.match(re);
        return match ? (match[1] || match[2]) : '';
    };

    const selectElements = [];

    // --- 絞り込み実行関数 ---
    const applyFilter = () => {
        const conditions = Array.from(container.querySelectorAll('select'))
            .map((sel, idx) => sel.value ? `${filters[idx].field} in ("${sel.value}")` : null)
            .filter(Boolean);
        const query = conditions.join(' and ');
        const url = new URL(window.location.href);
        if (query) url.searchParams.set('query', query);
        else url.searchParams.delete('query');
        window.location.href = url.toString();
    };

    // --- 絞り込みボタン ---
    const btnFilter = document.createElement('button');
    btnFilter.textContent = '絞込';
    btnFilter.style.backgroundColor = '#3498db';
    btnFilter.style.color = '#fff';
    btnFilter.style.border = 'none';
    btnFilter.style.padding = '0 15px';
    btnFilter.style.height = '32px';
    btnFilter.style.borderRadius = '4px';
    btnFilter.style.fontWeight = 'bold';
    btnFilter.style.cursor = 'pointer';
    btnFilter.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    btnFilter.onclick = applyFilter;

    // --- 自動絞り込みチェックボックス ---
    const autoFilterCheckbox = document.createElement('input');
    autoFilterCheckbox.type = 'checkbox';
    autoFilterCheckbox.id = 'auto-filter-checkbox';
    autoFilterCheckbox.style.margin = '0';
    autoFilterCheckbox.style.cursor = 'pointer';
    
    const updateBtnState = () => {
        if (autoFilterCheckbox.checked) {
            btnFilter.disabled = true;
            btnFilter.style.backgroundColor = '#ccc';
            btnFilter.style.cursor = 'not-allowed';
        } else {
            btnFilter.disabled = false;
            btnFilter.style.backgroundColor = '#3498db';
            btnFilter.style.cursor = 'pointer';
        }
    };

    // 状態の復元と保存
    if (localStorage.getItem('shinryo_auto_filter') === 'true') {
        autoFilterCheckbox.checked = true;
    }
    updateBtnState();
    autoFilterCheckbox.onchange = () => {
        localStorage.setItem('shinryo_auto_filter', autoFilterCheckbox.checked);
        updateBtnState();
    };

    const autoLabel = document.createElement('label');
    autoLabel.htmlFor = 'auto-filter-checkbox';
    autoLabel.textContent = '自動';
    autoLabel.style.fontSize = '10px';
    autoLabel.style.marginLeft = '2px';
    autoLabel.style.cursor = 'pointer';
    autoLabel.style.userSelect = 'none';
    autoLabel.style.color = '#555';
    autoLabel.style.lineHeight = '1';

    const autoContainer = document.createElement('div');
    autoContainer.style.display = 'flex';
    autoContainer.style.alignItems = 'center';
    autoContainer.style.marginLeft = '3px';
    autoContainer.style.marginBottom = '1px'; // 極限まで接近
    autoContainer.appendChild(autoFilterCheckbox);
    autoContainer.appendChild(autoLabel);

    filters.forEach(f => {
        if (f.label === '診療分野') return;
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';

        const title = document.createElement('div');
        title.textContent = f.label;
        title.style.fontSize = '11px';
        title.style.fontWeight = 'bold';
        title.style.color = '#555';
        title.style.marginBottom = '0px';
        title.style.lineHeight = '1.2';
        title.style.paddingLeft = '2px';

        const select = document.createElement('select');
        select.className = 'gaia-argoui-select'; // Kintoneライクなスタイルクラスがあれば適用（なければ以下のスタイル）
        select.style.padding = '0 8px';
        select.style.height = '32px';
        select.style.borderRadius = '4px';
        select.style.border = '2px solid #3498db';
        select.style.fontSize = '13px';
        select.style.color = '#333';
        select.style.cursor = 'pointer';
        select.style.backgroundColor = '#fff';
        select.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        select.style.minWidth = '130px';
        
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '(すべて)';
        select.appendChild(defaultOpt);

        // 変更時に他のプルダウンの選択肢を更新（検索はしない）
        select.onchange = () => {
            updateDropdownOptions();
            if (autoFilterCheckbox.checked) {
                applyFilter();
            }
        };

        wrapper.appendChild(title);
        wrapper.appendChild(select);
        container.appendChild(wrapper);

        // 初期値を保持しておく（選択肢生成後にセットするため）
        const initialVal = getQueryValue(f.field);
        selectElements.push({ element: select, field: f.field, initialValue: initialVal });
    });

    // プルダウンの選択肢を動的に更新する関数
    function updateDropdownOptions() {
        selectElements.forEach(target => {
            // 現在の値を取得。未設定で初期値があればそれを使用
            let currentVal = target.element.value;
            if (!currentVal && target.initialValue) {
                currentVal = target.initialValue;
            }
            
            // 自分以外の選択条件でレコードを絞り込む
            const validRecords = records.filter(r => {
                return selectElements.every(other => {
                    if (other === target) return true; // 自分自身は条件に含めない（選択変更できるようにするため）
                    
                    // 他のフィールドの値も、DOM値または初期値から取得
                    let otherVal = other.element.value;
                    if (!otherVal && other.initialValue) otherVal = other.initialValue;

                    if (!otherVal) return true;
                    return r[other.field]?.value === otherVal;
                });
            });

            // 有効なレコードから選択肢を抽出
            const counts = {};
            const conflictCounts = {}; // 競合があるかどうかのフラグ
            const orderMap = {}; // 表示順保持用

            validRecords.forEach(r => {
                const v = r[target.field]?.value;
                if (v) {
                    counts[v] = (counts[v] || 0) + 1;
                    if (target.field === '医師名' && isRecordConflicting(r)) {
                        conflictCounts[v] = true;
                    }
                    // 表示順の取得 (最小値を採用)
                    const order = parseInt(r['表示順']?.value || 9999, 10);
                    if (orderMap[v] === undefined || order < orderMap[v]) {
                        orderMap[v] = order;
                    }

                }
            });
            
            const values = Object.keys(counts);

            // 選択肢の再構築
            target.element.innerHTML = '';
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '(すべて)';
            target.element.appendChild(defaultOpt);

            // 表示順でソート (昇順)
            values.sort((a, b) => {
                const oa = orderMap[a] ?? 9999;
                const ob = orderMap[b] ?? 9999;
                if (oa !== ob) return oa - ob;
                return a.localeCompare(b, 'ja');
            });

            values.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = `${v} (${counts[v]})`;
                if (conflictCounts[v]) {
                    opt.style.color = 'red';
                    opt.style.fontWeight = 'bold';
                }
                target.element.appendChild(opt);
            });

            // 値の復元（選択肢になければリセット）
            if (values.includes(currentVal)) {
                target.element.value = currentVal;
                // 初期値の適用に成功したら、次回以降はDOMの値を優先するため初期値をクリア
                if (target.initialValue === currentVal) {
                    target.initialValue = null;
                }
            } else {
                target.element.value = '';
            }

            // ② 選択肢がない場合はグレーアウトして操作不可にする
            if (target.element.options.length <= 1) {
                target.element.disabled = true;
                target.element.style.backgroundColor = '#eee';
                target.element.style.cursor = 'not-allowed';
            } else {
                target.element.disabled = false;
                target.element.style.backgroundColor = '#fff';
                target.element.style.cursor = 'pointer';
            }
        });
    }

    // 初期表示時に選択肢を更新
    updateDropdownOptions();

    // --- リセットボタン ---
    const btnReset = document.createElement('button');
    btnReset.textContent = 'リセット';
    btnReset.style.backgroundColor = '#95a5a6';
    btnReset.style.color = '#fff';
    btnReset.style.border = 'none';
    btnReset.style.padding = '0 15px';
    btnReset.style.height = '32px';
    btnReset.style.borderRadius = '4px';
    btnReset.style.fontWeight = 'bold';
    btnReset.style.cursor = 'pointer';
    btnReset.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

    btnReset.onclick = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('query');
        window.location.href = url.toString();
    };

    // ボタンとチェックボックスをまとめるラッパー
    const filterWrapper = document.createElement('div');
    filterWrapper.style.display = 'flex';
    filterWrapper.style.flexDirection = 'column';
    filterWrapper.style.alignItems = 'flex-start';
    filterWrapper.appendChild(autoContainer);
    filterWrapper.appendChild(btnFilter);

    container.appendChild(filterWrapper);
    container.appendChild(btnReset);
  }



 

  // ★追加: フォーム挿入ラベル管理メニュー
  async function showFormLabelMenu() {
      const { overlay, box, content, setOnCloseRequest } = createModalBase();
      
      let hasChanges = false;
      
      // モーダルボックスのスタイル調整 (サイドバーレイアウト用)
      box.style.maxWidth = '1100px';
      box.style.width = '95%';
      box.style.height = '85vh';
      box.style.padding = '0'; // パディングなしで全画面利用
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
      box.style.textAlign = 'left';
      box.style.overflow = 'hidden';
      
      // コンテンツエリアのスタイル調整
      content.style.flex = '1';
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      content.style.height = '100%';
      content.style.overflow = 'hidden';

      // 1. ヘッダーエリア
      const headerDiv = document.createElement('div');
      headerDiv.style.padding = '20px 25px';
      headerDiv.style.borderBottom = '1px solid #e1e4e8';
      headerDiv.style.backgroundColor = '#fff';
      headerDiv.style.flexShrink = '0';

      const title = document.createElement('h2');
      title.textContent = 'フォーム挿入ラベル管理';
      title.style.cssText = 'margin: 0 0 5px 0; font-size: 20px; color: #2c3e50; font-weight: 700;';
      headerDiv.appendChild(title);
      
      const subTitle = document.createElement('p');
      subTitle.textContent = '予約フォームに表示される各種案内文を一元管理します。左側のメニューから対象を選択してください。';
      subTitle.style.cssText = 'margin: 0; font-size: 12px; color: #666;';
      headerDiv.appendChild(subTitle);

      const note = document.createElement('p');
      note.textContent = '※実際の予約フォーム上での見え方はプレビュー画面にて確認するようにしてください';
      note.style.cssText = 'margin: 5px 0 0 0; font-size: 12px; color: #e74c3c; font-weight: bold;';
      headerDiv.appendChild(note);


      content.appendChild(headerDiv);

      // 2. メインレイアウト (サイドバー + メインエリア)
      const layoutContainer = document.createElement('div');
      layoutContainer.style.display = 'flex';
      layoutContainer.style.flex = '1';
      layoutContainer.style.overflow = 'hidden'; // 内部でスクロール

      // サイドバー
      const sidebar = document.createElement('div');
      sidebar.style.width = '240px';
      sidebar.style.backgroundColor = '#f8f9fa';
      sidebar.style.borderRight = '1px solid #e1e4e8';
      sidebar.style.overflowY = 'auto';
      sidebar.style.flexShrink = '0';
      sidebar.style.padding = '15px 0';

      // メインエリア
      const mainArea = document.createElement('div');
      mainArea.style.flex = '1';
      mainArea.style.overflowY = 'auto';
      mainArea.style.padding = '25px';
      mainArea.style.backgroundColor = '#fff';
      mainArea.style.scrollBehavior = 'smooth';

      layoutContainer.appendChild(sidebar);
      layoutContainer.appendChild(mainArea);
      content.appendChild(layoutContainer);

      // 3. フッターエリア
      const footerDiv = document.createElement('div');
      footerDiv.style.padding = '15px 25px';
      footerDiv.style.borderTop = '1px solid #e1e4e8';
      footerDiv.style.backgroundColor = '#fff';
      footerDiv.style.display = 'flex';
      footerDiv.style.justifyContent = 'space-between';
      footerDiv.style.flexShrink = '0';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      closeBtn.textContent = '閉じる';
      closeBtn.onclick = () => {
          document.body.removeChild(overlay);
          if (hasChanges) location.reload();
      };

      setOnCloseRequest((doClose) => {
          doClose();
          if (hasChanges) location.reload();
      });

      footerDiv.appendChild(closeBtn);
      content.appendChild(footerDiv);

      document.body.appendChild(overlay);

      // --- データ取得と描画 ---
      let descriptions = {};
      let labelSettings = {}; // ★追加
      let fieldGroups = new Map(); // 診療分野 -> 診療科リスト
      let fieldOrderMap = new Map(); // 診療分野 -> 最小表示順
      let deptOrderMap = new Map();  // 診療科 -> 最小表示順
      
      if (window.ShinryoApp.ConfigManager) {
        const data = await window.ShinryoApp.ConfigManager.fetchPublishedData();
        descriptions = data.descriptions || {};
        labelSettings = data.labelSettings || {}; // ★追加
        
        const records = data.records || [];
        records.forEach(r => {
            const dept = r['診療科']?.value;
            const field = r['診療分野']?.value || 'その他';
            const order = parseInt(r['表示順']?.value || 9999, 10);
            
            if (dept) {
                if (!fieldGroups.has(field)) fieldGroups.set(field, new Set());
                fieldGroups.get(field).add(dept);
                
                // 表示順の記録 (グループ内の最小値を採用)
                if (!fieldOrderMap.has(field) || order < fieldOrderMap.get(field)) fieldOrderMap.set(field, order);
                if (!deptOrderMap.has(dept) || order < deptOrderMap.get(dept)) deptOrderMap.set(dept, order);



            }          
        });
      }

      const globalLabels = [
          { key: '__Global_Header__', label: '冒頭ラベル', desc: 'フォームの最上部に表示される案内文です。' },
          { key: '__Global_Change__', label: '変更ラベル', desc: '用件で変更が選択された場合に表示される案内文です。' },
          { key: '__Global_Cancel__', label: '取消ラベル', desc: '用件で取消が選択された場合に表示される案内文です。' },
          { key: '__Global_FirstVisit__', label: '初診ラベル', desc: '用件で初診が選択された場合に表示される案内文です。' }
      ];

      // HTMLタグ除去ヘルパー
      const stripHtml = (html) => {
          const tmp = document.createElement("DIV");
          tmp.innerHTML = html || '';
          return tmp.textContent || tmp.innerText || "";
      };

      // サイドバー項目作成ヘルパー
      const createSidebarItem = (id, text, isHeader = false, isIndent = false) => {
          const item = document.createElement('div');
          if (isHeader) {
              item.textContent = text;
              item.style.padding = '12px 15px';
              item.style.fontSize = '14px';
              item.style.fontWeight = 'bold';
              item.style.color = '#fff';
              item.style.backgroundColor = '#34495e';
              item.style.marginTop = '0';
              item.style.marginBottom = '5px';
          } else {
              item.textContent = text;
              item.style.padding = isIndent ? '8px 15px 8px 35px' : '8px 20px';
              item.style.fontSize = isIndent ? '12px' : '13px';
              item.style.cursor = 'pointer';
              item.style.color = '#333';
              item.style.borderLeft = '3px solid transparent';
              item.style.transition = 'background-color 0.2s';
              
              item.onmouseover = () => { item.style.backgroundColor = '#e9ecef'; };
              item.onmouseout = () => { item.style.backgroundColor = 'transparent'; };
              item.onclick = () => {
                  const target = document.getElementById(id);
                  if (target) {
                      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // ハイライトエフェクト
                      const originalBg = target.style.backgroundColor;
                      target.style.transition = 'background-color 0.5s';
                      target.style.backgroundColor = '#fff3cd';
                      setTimeout(() => { target.style.backgroundColor = originalBg; }, 1000);
                  }
              };
          }
          sidebar.appendChild(item);
      };

      // カード作成ヘルパー
      const createCard = (key, label, desc, isDept = false) => {
          const cardId = isDept ? `dept-${label}` : `global-${key}`;
          const card = document.createElement('div');
          card.id = cardId;
          card.style.border = '1px solid #e1e4e8';
          card.style.borderRadius = '8px';
          card.style.padding = '20px';
          card.style.marginBottom = '25px';
          card.style.backgroundColor = '#fff';
          card.style.scrollMarginTop = '20px'; 
          
          const header = document.createElement('div');
          header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
          
          const titleDiv = document.createElement('div');
          titleDiv.style.display = 'flex';
          titleDiv.style.alignItems = 'center';
          
          const titleText = document.createElement('div');
          titleText.textContent = label;
          titleText.style.fontWeight = 'bold';
          titleText.style.fontSize = '18px';
          titleText.style.color = '#333';
          titleDiv.appendChild(titleText);

          const badge = document.createElement('span');
          badge.textContent = isDept ? '診療科' : '共通';
          badge.style.fontSize = '11px';
          badge.style.color = '#fff';
          badge.style.backgroundColor = isDept ? '#28a745' : '#007bff';
          badge.style.padding = '2px 8px';
          badge.style.borderRadius = '10px';
          badge.style.marginLeft = '10px';
          titleDiv.appendChild(badge);

          let settingBadge = null;

          // ★追加: 診療科の場合、用件別制御の設定状況を表示
          if (isDept) {
              const setting = labelSettings[key] || 'both';
              let settingText = '初診・変更';
              let settingColor = '#6c757d'; // Default gray

              if (setting === 'first_visit') {
                  settingText = '初診のみ';
                  settingColor = '#e67e22'; // Orange
              } else if (setting === 'change') {
                  settingText = '変更のみ';
                  settingColor = '#17a2b8'; // Cyan
              }
              
              settingBadge = document.createElement('span');
              settingBadge.textContent = settingText;
              settingBadge.style.fontSize = '11px';
              settingBadge.style.color = '#fff';
              settingBadge.style.backgroundColor = settingColor;
              settingBadge.style.padding = '2px 8px';
              settingBadge.style.borderRadius = '10px';
              settingBadge.style.marginLeft = '5px';
              titleDiv.appendChild(settingBadge);
          }

          header.appendChild(titleDiv);
          
          const editBtn = document.createElement('button');
          editBtn.className = 'custom-modal-btn';
          editBtn.textContent = '編集';
          editBtn.style.padding = '6px 16px';
          editBtn.style.fontSize = '13px';
          editBtn.style.backgroundColor = '#fff';
          editBtn.style.border = '1px solid #3498db';
          editBtn.style.color = '#3498db';
          editBtn.style.minWidth = 'auto';
          editBtn.onclick = () => {
              window.ShinryoApp.Viewer.showLabelEditor(key, descriptions[key] || '', labelSettings[key], () => {
                  hasChanges = true;
                  // 保存後のコールバック: データを再取得して表示更新
                  window.ShinryoApp.ConfigManager.fetchPublishedData().then(newData => {
                      descriptions = newData.descriptions || {};
                      labelSettings = newData.labelSettings || {};
                      const newHtml = descriptions[key] || '';
                      const previewDiv = card.querySelector('.preview-content');
                      if (previewDiv) {
                          if (newHtml && stripHtml(newHtml).trim()) {
                              previewDiv.innerHTML = newHtml;
                              previewDiv.style.display = 'block';
                          } else {
                              previewDiv.innerHTML = '<span style="color:#ccc;">(未設定)</span>';
                              previewDiv.style.display = 'flex';
                              previewDiv.style.alignItems = 'center';
                              previewDiv.style.justifyContent = 'center';
                          }
                      }

                      // ★追加: バッジの表示更新
                      if (settingBadge) {
                          const newSetting = labelSettings[key] || 'both';
                          let newText = '初診・変更';
                          let newColor = '#6c757d';

                          if (newSetting === 'first_visit') {
                              newText = '初診のみ';
                              newColor = '#e67e22';
                          } else if (newSetting === 'change') {
                              newText = '変更のみ';
                              newColor = '#17a2b8';
                          }
                          settingBadge.textContent = newText;
                          settingBadge.style.backgroundColor = newColor;
                      }
                  });
              }, label);
          };
          header.appendChild(editBtn);
          card.appendChild(header);

          if (desc) {
              const descDiv = document.createElement('div');
              descDiv.textContent = desc;
              descDiv.style.fontSize = '12px';
              descDiv.style.color = '#666';
              descDiv.style.marginBottom = '15px';
              card.appendChild(descDiv);
          }

          const preview = document.createElement('div');
          preview.className = 'preview-content';
          preview.style.backgroundColor = '#f9f9f9';
          preview.style.border = '1px solid #eee';
          preview.style.borderRadius = '4px';
          preview.style.padding = '15px';
          preview.style.fontSize = '14px';
          preview.style.color = '#333';
          preview.style.minHeight = '100px';
          preview.style.maxHeight = '300px';
          preview.style.overflowY = 'auto';
          preview.style.fontFamily = '"Meiryo", sans-serif';
          preview.style.lineHeight = '1.6';
          
          const currentHtml = descriptions[key];
          if (currentHtml && stripHtml(currentHtml).trim()) {
              preview.innerHTML = currentHtml; // 簡易プレビュー
          } else {
              preview.innerHTML = '<span style="color:#ccc;">(未設定)</span>';
              preview.style.display = 'flex';
              preview.style.alignItems = 'center';
              preview.style.justifyContent = 'center';
          }
          card.appendChild(preview);

          mainArea.appendChild(card);
      };

      // --- 描画実行 ---
      
      // 1. 共通ラベル
      createSidebarItem(null, '共通ラベル', true);
      globalLabels.forEach(item => {
          createSidebarItem(`global-${item.key}`, item.label);
          createCard(item.key, item.label, item.desc);
      });

      // 2. 診療科ラベル
      if (fieldGroups.size > 0) {
          createSidebarItem(null, '診療科別ラベル', true);
          
          const divider = document.createElement('div');
          divider.style.borderTop = '2px dashed #eee';
          divider.style.margin = '30px 0';
          divider.style.textAlign = 'center';
          divider.innerHTML = '<span style="background:#fff; padding:0 10px; color:#999; font-size:12px;">以下、診療科別設定</span>';
          mainArea.appendChild(divider);

         // 診療分野でソート (表示順優先)
          const sortedFields = Array.from(fieldGroups.keys()).sort((a, b) => {
              const oa = fieldOrderMap.get(a) ?? 9999;
              const ob = fieldOrderMap.get(b) ?? 9999;
              if (oa !== ob) return oa - ob;

              if (a === 'その他') return 1;
              if (b === 'その他') return -1;
              return a.localeCompare(b, 'ja');
          });

          sortedFields.forEach(field => {
              // サイドバーの分野ヘッダー
              const sbField = document.createElement('div');
              sbField.textContent = field;
              sbField.style.cssText = 'padding: 8px 15px; font-size: 12px; font-weight: bold; color: #555; background-color: #f0f2f5; border-bottom: 1px solid #e1e4e8;';
              sidebar.appendChild(sbField);

              // メインエリアの分野ヘッダー
              const mainField = document.createElement('h3');
              mainField.textContent = field;
              mainField.style.cssText = 'font-size: 16px; color: #2c3e50; border-left: 4px solid #3498db; padding-left: 10px; margin-top: 30px; margin-bottom: 15px;';
              mainArea.appendChild(mainField);

              // 診療科でソート (表示順優先)
              const depts = Array.from(fieldGroups.get(field)).sort((a, b) => {
                  const oa = deptOrderMap.get(a) ?? 9999;
                  const ob = deptOrderMap.get(b) ?? 9999;
                  if (oa !== ob) return oa - ob;
                  return a.localeCompare(b, 'ja');
              });

              depts.forEach(dept => {
                  createSidebarItem(`dept-${dept}`, dept, false, true); // インデントあり
                  createCard(dept, dept, `「${dept}」を選択した際に表示される案内文です。`, true);
              });
          });
      }
  }

})();