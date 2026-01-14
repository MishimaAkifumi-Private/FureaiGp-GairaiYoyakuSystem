/*
 * ViewModeSwitcher.js (v30)
 * 診療シフト管理アプリ(ID:156)用
 */
(function() {
  'use strict';
  console.log('ViewModeSwitcher.js: Loading...');

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
    if (!window.ShinryoApp || !window.ShinryoApp.Viewer) {
        const errorMsg = '【エラー】ShinryoViewer.js が読み込まれていません。\n設定画面の「JavaScript / CSSでカスタマイズ」で、ShinryoViewer.js を ViewModeSwitcher.js より上に配置してください。';
        console.error(errorMsg);
        window.alert(errorMsg); // Fallback to standard alert for critical init error
        return event;
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
        
        if (viewMode === 'overview') {
            const titleContainer = document.createElement('div');
            titleContainer.className = 'overview-title-container';

            // テキストラッパー
            const textWrapper = document.createElement('div');
            textWrapper.className = 'overview-text-wrapper';

            const titleText = document.createElement('div');
            titleText.className = 'overview-title-text';
            titleText.textContent = '予約待ち受け状況';
            textWrapper.appendChild(titleText);

            const dateText = document.createElement('div');
            dateText.className = 'overview-last-update';
            textWrapper.appendChild(dateText);

            titleContainer.appendChild(textWrapper);

            // 更新通知ボタン (初期非表示)
            const btnUpdate = document.createElement('button');
            btnUpdate.className = 'btn-update-available';
            btnUpdate.textContent = '更新があります';
            btnUpdate.style.display = 'none';
            titleContainer.appendChild(btnUpdate);

            // ★変更: 歯車ボタンを廃止し、メインメニューボタンを右側に配置
            const btnMainMenu = document.createElement('button');
            btnMainMenu.className = 'mode-switch-btn';
            btnMainMenu.textContent = 'メインメニュー';
            btnMainMenu.style.backgroundColor = '#28a745'; // ★変更: 緑色
            btnMainMenu.style.position = 'absolute';
            btnMainMenu.style.right = '20px';
            btnMainMenu.style.top = '50%';
            btnMainMenu.style.transform = 'translateY(-50%)';
            btnMainMenu.style.marginLeft = '0';
            btnMainMenu.style.marginTop = '5px'; // ★追加: 位置調整
            btnMainMenu.style.zIndex = '10';
            btnMainMenu.onclick = () => location.href = '?view_mode=dashboard';
            div.appendChild(btnMainMenu);

            // 更新チェックロジック
            if (window.ShinryoApp.ConfigManager) {
                const checkUpdates = async () => {
                    try {
                        const records = await fetchAllRecords(kintone.app.getId());
                        await window.ShinryoApp.ConfigManager.fetchPublishedData();
                        
                        const lastTime = window.ShinryoApp.ConfigManager.getLastPublishedAt();
                        if (lastTime) {
                            const d = new Date(lastTime);
                            const dateStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                            dateText.textContent = `Last Form Update : ${dateStr}`;
                        }

                        const hasDiff = window.ShinryoApp.ConfigManager.hasUnsavedChanges(records);
                        const isOld = window.ShinryoApp.ConfigManager.isOldFormat ? window.ShinryoApp.ConfigManager.isOldFormat() : false;
                        btnUpdate.style.display = (hasDiff || isOld) ? 'block' : 'none';
                    } catch (e) {
                        console.error('Update check failed:', e);
                    }
                };
                checkUpdates();

                btnUpdate.onclick = async () => {
                    const confirmed = await showCustomDialog(
                        '表の点滅している個所で情報が更新されています。\n今すぐ予約フォームに公開しますか？', 
                        'confirm', 
                        { ok: '公開する', cancel: 'しない' }
                    );
                    if (confirmed) {
                        await executePublish();
                    }
                };
            }

            div.appendChild(titleContainer);
        }

        if (viewMode === 'input') {
             const btnOverview = document.createElement('button');
             btnOverview.className = 'mode-switch-btn btn-to-overview';
             btnOverview.textContent = '予約待ち受け管理';
             // ボタンを離して配置し、色を変えて誤操作防止
             btnOverview.style.marginRight = '0px';
             btnOverview.style.backgroundColor = '#28a745'; 
             btnOverview.onclick = () => location.href = '?view_mode=overview';
             div.appendChild(btnOverview);
             
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

        } else if (viewMode === 'overview') {
             const btnDetail = document.createElement('button');
             btnDetail.className = 'mode-switch-btn btn-to-detail';
             btnDetail.textContent = '診療シフト表 編集';
             btnDetail.onclick = () => location.href = '?view_mode=input';
             div.appendChild(btnDetail);
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
      container.style.cssText = 'display: flex; flex-wrap: wrap; gap: 30px; padding: 50px; justify-content: center; align-items: flex-start; background-color: #f5f5f5; min-height: 80vh;';
      
      // ロゴ画像の表示
      const logoContainer = document.createElement('div');
      logoContainer.style.cssText = 'width: 100%; text-align: center; margin-bottom: 10px;';
      const logo = document.createElement('img');
      // ★ここにロゴ画像のURLを設定してください
      logo.src = 'https://www.fureai-g.or.jp/fureai-g/images/shared/site-logo.svg'; 
      logo.style.cssText = 'max-width: 100%; height: auto; max-height: 120px;';
      logoContainer.appendChild(logo);
      container.appendChild(logoContainer);

      const title = document.createElement('h1');
      title.textContent = '外来予約管理システム';
      title.style.cssText = 'width: 100%; text-align: center; margin-bottom: 10px; font-size: 50px;  color: #444; text-shadow: 3px 3px 0px #fff, -1px -1px 0 #fff; letter-spacing: 2px; font-family: "HGP創英角ﾎﾟｯﾌﾟ体", "HGSoeiKakupoptai", "HGPSoeiKakupoptai", "Rounded Mplus 1c", "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", Osaka, "メイリオ", Meiryo, sans-serif;';
      container.appendChild(title);

      // 予約センター名表示
      const centerName = localStorage.getItem('shinryo_center_name') || '湘南東部外来予約センター';
      const subTitle = document.createElement('div');
      subTitle.textContent = centerName;
      subTitle.style.cssText = 'width: 100%; text-align: center; margin-bottom: 20px; color: #555; font-size: 20px; font-weight: bold;';
      container.appendChild(subTitle);

      // 外来予約フォームを開くボタン
      const formUrl = localStorage.getItem('shinryo_form_url');
      if (formUrl) {
          const btnContainer = document.createElement('div');
          btnContainer.style.cssText = 'width: 100%; text-align: center; margin-bottom: 40px;';
          const openFormBtn = document.createElement('button');
          openFormBtn.textContent = '外来予約フォームを開く';
          openFormBtn.style.cssText = 'padding: 15px 30px; font-size: 18px; font-weight: bold; color: #fff; background-color: #e67e22; border: none; border-radius: 50px; cursor: pointer; box-shadow: 0 4px 10px rgba(230, 126, 34, 0.4); transition: all 0.3s ease;';
          openFormBtn.onmouseover = () => { openFormBtn.style.transform = 'translateY(-2px)'; openFormBtn.style.boxShadow = '0 6px 15px rgba(230, 126, 34, 0.6)'; };
          openFormBtn.onmouseout = () => { openFormBtn.style.transform = 'translateY(0)'; openFormBtn.style.boxShadow = '0 4px 10px rgba(230, 126, 34, 0.4)'; };
          openFormBtn.onclick = () => window.open(formUrl, '_blank');
          btnContainer.appendChild(openFormBtn);
          container.appendChild(btnContainer);
      }

      const cards = [
          { title: '予約チケット管理', icon: '🎫', url: 'https://w60013hke2ct.cybozu.com/k/guest/11/142/', target: '_blank', desc: '予約の申込状況を確認・管理します' },
          { title: '予約待ち受け管理', icon: '📅', url: '?view_mode=overview', target: '_self', desc: '個別医師の予定状況等から予約が受け付けられる選択肢を組み立てます' },
          { title: 'フォーム挿入ラベル', icon: '📑', action: () => alert('現在開発中です'), desc: '予約フォームに挿入するラベルの文言を編集します' },
          { title: 'スタッフ管理', icon: '👥', action: () => alert('現在開発中です'), desc: 'システム利用者の登録・管理を行います' },
          { title: '設定', icon: '⚙️', action: () => showSettingsMenu(), desc: '各種システム環境の設定' }
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
  function createModalBase() {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay';
      const box = document.createElement('div');
      box.className = 'custom-modal-box';
      overlay.appendChild(box);
      return { overlay, box };
  }

  function showSettingsMenu() {
      const { overlay, box } = createModalBase();
      
      const title = document.createElement('h2');
      title.textContent = 'システム設定';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      box.appendChild(title);

      const menuList = [
          { label: '予約センター名の登録', icon: '🏥', desc: 'ダッシュボードに表示するセンター名を設定します', action: () => { document.body.removeChild(overlay); showCenterNameInputDialog(); } },
          { label: '病院休診日設定', icon: '📅', desc: '病院固有の休診日カレンダーを設定します', action: () => { alert('現在開発中です'); } },
          { label: '病院共通 予約期間設定', icon: '⏳', desc: 'デフォルトの予約受付開始日と期間を設定します', action: () => { document.body.removeChild(overlay); showCommonTermInputDialog(); } },
          { label: '予約チケット管理アプリ設定', icon: '🎫', desc: '連携アプリ番号やメール通知設定を行います', action: () => { document.body.removeChild(overlay); showTicketAppSettingDialog(); } },
          { label: '各種URL設定', icon: '🔗', desc: 'フォームURLやロゴ画像URLなどを管理します', action: () => { document.body.removeChild(overlay); showUrlSettingDialog(); } },
          // 必要に応じてメニューを追加
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
          box.appendChild(btn);
      });

      const closeBtn = document.createElement('button');
      closeBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      closeBtn.textContent = '閉じる';
      closeBtn.style.marginTop = '10px';
      closeBtn.onclick = () => document.body.removeChild(overlay);
      box.appendChild(closeBtn);

      document.body.appendChild(overlay);
  }

  function showCenterNameInputDialog() {
      const { overlay, box } = createModalBase();
      
      const title = document.createElement('h2');
      title.textContent = '予約センター名の登録';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      box.appendChild(title);

      const desc = document.createElement('p');
      desc.textContent = 'ダッシュボードに表示する予約センター名を入力してください。';
      desc.style.cssText = 'text-align: left; font-size: 14px; color: #666; margin-bottom: 10px;';
      box.appendChild(desc);

      const input = document.createElement('input');
      input.className = 'custom-modal-input';
      input.value = localStorage.getItem('shinryo_center_name') || '湘南東部外来予約センター';
      box.appendChild(input);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => { document.body.removeChild(overlay); showSettingsMenu(); }; // メニューに戻る

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
      box.appendChild(btnGroup);

      document.body.appendChild(overlay);
      input.focus();
  }

  function showTicketAppSettingDialog() {
      const { overlay, box } = createModalBase();
      box.style.maxWidth = '500px';
      box.style.maxHeight = '90vh';
      box.style.overflowY = 'auto';
      
      // 設定値の読み込み
      let config = JSON.parse(localStorage.getItem('shinryo_ticket_config') || '{}');

      // 共通スタイル
      const titleStyle = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700; text-align: center;';

      // --- 画面描画関数 ---

      // メインメニュー
      const renderMenu = () => {
          box.innerHTML = '';
          const title = document.createElement('h2');
          title.textContent = '予約チケット管理アプリ設定';
          title.style.cssText = titleStyle;
          box.appendChild(title);

          const menuList = [
              { label: 'アプリ連携設定', icon: '🔗', desc: 'アプリ番号の設定', action: () => renderAppIdSettings() },
              { label: 'メール設定', icon: '✉️', desc: 'サーバー・BCC・リマインド設定', action: () => renderMailMenu() },
              { label: '未読警告設定', icon: '⚠️', desc: 'アラート時間の閾値設定', action: () => renderAlertSettings() }
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
              box.appendChild(btn);
          });

          const closeBtn = document.createElement('button');
          closeBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
          closeBtn.textContent = '閉じる';
          closeBtn.style.marginTop = '15px';
          closeBtn.onclick = () => { document.body.removeChild(overlay); showSettingsMenu(); };
          box.appendChild(closeBtn);
      };

      // メール設定サブメニュー
      const renderMailMenu = () => {
          box.innerHTML = '';
          const title = document.createElement('h2');
          title.textContent = 'メール設定';
          title.style.cssText = titleStyle;
          box.appendChild(title);

          const menuList = [
              { label: 'メールサーバー設定', icon: '🖥️', desc: 'SMTPサーバー・認証情報の設定', action: () => renderMailServerSettings() },
              { label: 'BCC設定', icon: '📬', desc: 'BCC の設定', action: () => renderMailDestSettings() },
              { label: '予約日リマインド設定', icon: '⏰', desc: 'リマインドメールの送信設定', action: () => { alert('現在開発中です'); } }
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
              box.appendChild(btn);
          });

          const backBtn = document.createElement('button');
          backBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
          backBtn.textContent = '戻る';
          backBtn.style.marginTop = '15px';
          backBtn.onclick = () => renderMenu();
          box.appendChild(backBtn);
      };

      // フォーム描画ヘルパー
      const renderForm = (titleText, inputsDef, onSave, backAction = null) => {
          box.innerHTML = '';
          const title = document.createElement('h2');
          title.textContent = titleText;
          title.style.cssText = titleStyle;
          box.appendChild(title);

          const inputEls = {};

          inputsDef.forEach(def => {
              const div = document.createElement('div');
              div.style.marginBottom = '15px';
              div.style.textAlign = 'left';
              
              const lbl = document.createElement('label');
              lbl.textContent = def.label;
              lbl.style.display = 'block';
              lbl.style.fontSize = '12px';
              lbl.style.fontWeight = 'bold';
              lbl.style.marginBottom = '4px';
              div.appendChild(lbl);

              let inp;
              if (def.type === 'select') {
                  inp = document.createElement('select');
                  inp.className = 'custom-modal-input';
                  inp.style.marginBottom = '0';
                  def.options.forEach(opt => {
                      const o = document.createElement('option');
                      o.value = opt;
                      o.textContent = opt;
                      if (opt === (config[def.key] || def.default)) o.selected = true;
                      inp.appendChild(o);
                  });
              } else {
                  inp = document.createElement('input');
                  inp.className = 'custom-modal-input';
                  inp.style.marginBottom = '0';
                  inp.type = def.type || 'text';
                  // 値の取得（フォールバック対応）
                  let val = config[def.key] || '';
                  if (def.fallbackKey && !val) {
                      val = config[def.fallbackKey] || '';
                  }
                  inp.value = val;
                  if (def.placeholder) inp.placeholder = def.placeholder;
              }
              inputEls[def.key] = inp;
              div.appendChild(inp);
              box.appendChild(div);
          });

          const btnGroup = document.createElement('div');
          btnGroup.className = 'custom-modal-btn-group';
          btnGroup.style.marginTop = '20px';

          const cancelBtn = document.createElement('button');
          cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
          cancelBtn.textContent = '戻る';
          cancelBtn.onclick = () => backAction ? backAction() : renderMenu();

          const saveBtn = document.createElement('button');
          saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
          saveBtn.textContent = '保存';
          saveBtn.onclick = () => {
              const newValues = {};
              Object.keys(inputEls).forEach(key => {
                  newValues[key] = inputEls[key].value;
              });
              
              if (onSave(newValues)) {
                  config = { ...config, ...newValues };
                  localStorage.setItem('shinryo_ticket_config', JSON.stringify(config));
                  backAction ? backAction() : renderMenu();
              }
          };

          btnGroup.appendChild(cancelBtn);
          btnGroup.appendChild(saveBtn);
          box.appendChild(btnGroup);
      };

      // 各設定画面
      const renderAppIdSettings = () => {
          renderForm('アプリ連携設定', [
              { label: 'アプリ番号', key: 'appId', type: 'number' }
          ], () => true);
      };

      const renderMailServerSettings = () => {
          renderForm('メールサーバー設定', [
              { label: 'SMTPサーバー名', key: 'smtpServer' },
              { label: 'ポート番号', key: 'smtpPort', type: 'number' },
              { label: '暗号方式', key: 'encryption', type: 'select', options: ['None', 'SSL', 'TLS'], default: 'None' },
              { label: 'ユーザー名', key: 'smtpUser' },
              { label: 'パスワード', key: 'smtpPass', type: 'password' },
              { label: '送信元メールアドレス', key: 'mailAddress', type: 'email' }
          ], () => true, renderMailMenu);
      };

      const renderMailDestSettings = () => {
          renderForm('BCC設定', [
              { label: 'BCC', key: 'mailBcc', placeholder: '例: bcc@example.com' }
          ], () => true, renderMailMenu);
      };

      const renderAlertSettings = () => {
          renderForm('未読警告設定', [
              { label: 'Yellow警告 (時間)', key: 'alertYellow', type: 'number' },
              { label: 'Red警告 (時間)', key: 'alertRed', type: 'number' }
          ], (vals) => {
              const y = parseFloat(vals.alertYellow) || 0;
              const r = parseFloat(vals.alertRed) || 0;
              if (y >= r && r !== 0) {
                  alert('Yellow警告の時間はRed警告より短く設定してください。');
                  return false;
              }
              return true;
          });
      };

      renderMenu();

      document.body.appendChild(overlay);
  }

  function showUrlSettingDialog() {
      const { overlay, box } = createModalBase();
      box.style.maxWidth = '600px';
      box.style.textAlign = 'left';
      
      const title = document.createElement('h2');
      title.textContent = '各種URL設定';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700; text-align: center;';
      box.appendChild(title);

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
              inp.value = localStorage.getItem(key) || '';
          } else {
              const urlConfig = JSON.parse(localStorage.getItem('shinryo_url_config') || '{}');
              inp.value = urlConfig[key] || '';
          }
          inp.placeholder = placeholder;
          div.appendChild(lbl);
          div.appendChild(inp);
          box.appendChild(div);
          return { inp, key };
      };

      const inputs = [
          createInput('予約チケット管理アプリURL', 'ticketAppUrl'),
          createInput('施設画像URL', 'facilityImgUrl'),
          createInput('病院施設ロゴURL', 'hospitalLogoUrl'),
          createInput('ふれあいGpロゴURL', 'groupLogoUrl'),
          createInput('診察券サンプルURL', 'ticketSampleUrl'),
          createInput('公開用 外来予約フォームURL', 'shinryo_form_url'),
          createInput('プレビュー用 外来予約フォームURL', 'previewFormUrl'),
          createInput('既読確定URL', 'readConfirmUrl')
      ];

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';
      btnGroup.style.marginTop = '20px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => { document.body.removeChild(overlay); showSettingsMenu(); };

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
          location.reload(); // URL変更の影響を反映するためリロード
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      box.appendChild(btnGroup);

      document.body.appendChild(overlay);
  }

  // ★追加: 病院共通予約期間設定ダイアログ
  async function showCommonTermInputDialog() {
      const { overlay, box } = createModalBase();
      
      const title = document.createElement('h2');
      title.textContent = '病院共通 予約期間設定';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      box.appendChild(title);

      // 現在の設定を取得
      let currentStart = '', currentDuration = '';
      if (window.ShinryoApp.ConfigManager) {
          await window.ShinryoApp.ConfigManager.fetchPublishedData();
          const common = window.ShinryoApp.ConfigManager.getCommonSettings();
          if (common) {
              currentStart = common.start || '';
              currentDuration = common.duration || '';
          }
      }

      const createInput = (label, val) => {
          const div = document.createElement('div');
          div.style.marginBottom = '15px';
          div.innerHTML = `<div style="font-weight:bold;margin-bottom:5px;text-align:left;">${label}</div>`;
          const inp = document.createElement('input');
          inp.className = 'custom-modal-input';
          inp.style.marginBottom = '0';
          inp.type = 'number';
          inp.value = val;
          div.appendChild(inp);
          box.appendChild(div);
          return inp;
      };

      const startInput = createInput('予約開始 (日後)', currentStart);
      const durationInput = createInput('予約可能期間 (日間)', currentDuration);

      // 説明文の追加
      const expl = document.createElement('div');
      expl.style.cssText = 'text-align: left; font-size: 11px; color: #666; margin-bottom: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; line-height: 1.5;';
      expl.innerHTML = `
        <div style="margin-bottom: 8px;">
            <strong>予約開始：</strong>本日を0日目として、何日後から予約を受け付けるかを設定（休診日はカウント除外）<br>例：本日が金曜日である場合に3を指定すると、日曜日が休診日なので予約開始は火曜日からとなる）
        </div>
        <div><strong>予約可能期間：</strong>予約開始日から何日先までを予約可能にするかを設定(休診日もカウントする）</div>
      `;
      box.appendChild(expl);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';
      btnGroup.style.marginTop = '20px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => { document.body.removeChild(overlay); showSettingsMenu(); };

      const saveBtn = document.createElement('button');
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.onclick = async () => {
          const newStart = startInput.value;
          const newDuration = durationInput.value;
          document.body.removeChild(overlay);
          try {
              await window.ShinryoApp.ConfigManager.updateCommonTerm(newStart, newDuration);
              await showCustomDialog('共通設定を保存し、予約フォームに反映しました。', 'alert');
              // ★追加: 画面とLast Form Updateを更新
              if (window.ShinryoApp.Viewer && window.ShinryoApp.Viewer.renderOverview) {
                  window.ShinryoApp.Viewer.renderOverview();
              }
          } catch(e) {
              await showCustomDialog('保存に失敗しました。', 'alert');
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
        const publishedData = await window.ShinryoApp.ConfigManager.fetchPublishedData();
        const descriptions = publishedData.descriptions || {};
        
        await window.ShinryoApp.ConfigManager.saveConfig(records, descriptions);
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

            validRecords.forEach(r => {
                const v = r[target.field]?.value;
                if (v) {
                    counts[v] = (counts[v] || 0) + 1;
                    if (target.field === '医師名' && isRecordConflicting(r)) {
                        conflictCounts[v] = true;
                    }
                }
            });
            
            const values = new Set(Object.keys(counts));

            // 選択肢の再構築
            target.element.innerHTML = '';
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '(すべて)';
            target.element.appendChild(defaultOpt);

            Array.from(values).sort().forEach(v => {
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
            if (values.has(currentVal)) {
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

})();