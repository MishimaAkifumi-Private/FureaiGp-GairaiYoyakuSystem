/*
 * このコードをアプリ番号142の「JavaScript / CSSでカスタマイズ」設定に追加してください。
 * 既存のJavaScriptファイルがある場合は、そのファイルに追記することを推奨します。
 *
 * このコードは、ShinryoApp.ConfigManager オブジェクトが利用可能であること、
 * およびFontAwesome (v6.4.0) が読み込まれていることを前提としています。
 */
(function() {
  'use strict';

  // ダイアログ表示に必要なスタイルを動的に追加する関数
  function applyStaffDialogStyles() {
    const styleId = 'staff-dialog-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    const css = `
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
          position: relative;
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
      .custom-modal-input { 
          width: 100%; padding: 12px; font-size: 15px; 
          border: 1px solid #dce1e6; border-radius: 6px; 
          box-sizing: border-box; margin-bottom: 20px; 
          background-color: #fcfcfc; transition: border-color 0.2s, background-color 0.2s;
      }
      .custom-modal-input:focus { border-color: #3498db; background-color: #fff; outline: none; }
    `;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }


  kintone.events.on('app.record.index.show', function(event) {
    // 必要なCSSをページに適用
    applyStaffDialogStyles();

    const BADGE_ID = 'staff-display-badge';
    
    // バッジ初期化関数
    const initBadge = () => {
        const staffBadge = document.getElementById(BADGE_ID);
        // 要素が存在し、かつ未初期化の場合のみ処理
        if (staffBadge && !staffBadge.classList.contains('js-badge-initialized')) {
            // クリック可能に設定
            staffBadge.style.cursor = 'pointer';
            staffBadge.onclick = (e) => {
                e.preventDefault();
                showStaffSettingDialog();
            };

            // localStorageから現在の担当者名を取得して表示を更新
            const staffNameDiv = staffBadge.querySelector('div:last-child');
            if (staffNameDiv) {
                const currentStaff = localStorage.getItem('shinryo_ticket_staff_name') || '未設定';
                staffNameDiv.textContent = currentStaff;
            }
            
            // 初期化済みフラグ
            staffBadge.classList.add('js-badge-initialized');
        }
    };

    // 初回実行
    initBadge();

    // 遅延描画対策: MutationObserverで監視
    const observer = new MutationObserver((mutations) => {
        initBadge();
    });
    
    // ヘッダースペースを監視 (存在しない場合はbody)
    const target = kintone.app.getHeaderMenuSpaceElement() || document.body;
    observer.observe(target, { childList: true, subtree: true });
    
    return event;
  });

  // ★追加: App 200 (共通設定) と通信する ConfigManager (ShinryoViewer.js非依存版)
  function createRemoteConfigManager() {
    const STORAGE_APP_ID = 200;
    const STORAGE_API_TOKEN = 'qGQAy2d3TcicQ8t73Oknv5BZU7gGO9aBvhAD9aY8';
    const STORAGE_KEY_FIELD = 'AppID';
    const STORAGE_JSON_FIELD = '設定情報2';

    let cachedData = null;
    let recordId = null;

    return {
        fetchPublishedData: async () => {
            try {
                const appId = kintone.app.getId();
                const query = `${STORAGE_KEY_FIELD} = "${appId}" limit 1`;
                const url = kintone.api.url('/k/v1/records', true) + `?app=${STORAGE_APP_ID}&query=${encodeURIComponent(query)}`;
                const headers = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN };

                const [body, status] = await kintone.proxy(url, 'GET', headers, {});
                if (status !== 200) throw new Error(`設定取得エラー: ${status}`);

                const resp = JSON.parse(body);
                if (resp.records.length > 0) {
                    recordId = resp.records[0].$id.value;
                    const jsonStr = resp.records[0][STORAGE_JSON_FIELD].value;
                    cachedData = JSON.parse(jsonStr || '{}');
                } else {
                    cachedData = {};
                    recordId = null;
                }
            } catch (e) {
                console.error('Remote Config Fetch Error:', e);
                throw e;
            }
        },
        
        getCommonSettings: () => {
            return cachedData ? (cachedData.commonSettings || {}) : {};
        },
        
        updateCommonStaffs: async (staffs) => {
            if (!cachedData) cachedData = {};
            if (!cachedData.commonSettings) cachedData.commonSettings = {};
            cachedData.commonSettings.staffs = staffs;

            const appId = kintone.app.getId();
            const jsonStr = JSON.stringify(cachedData);
            
            const headers = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN, 'Content-Type': 'application/json' };
            const apiUrl = kintone.api.url('/k/v1/record', true);
            
            let method = 'POST';
            let bodyParams = {
                app: STORAGE_APP_ID,
                record: {
                    [STORAGE_KEY_FIELD]: { value: String(appId) },
                    [STORAGE_JSON_FIELD]: { value: jsonStr }
                }
            };

            if (recordId) {
                method = 'PUT';
                bodyParams = {
                    app: STORAGE_APP_ID,
                    id: recordId,
                    record: { [STORAGE_JSON_FIELD]: { value: jsonStr } }
                };
            }

            const [respBody, status] = await kintone.proxy(apiUrl, method, headers, JSON.stringify(bodyParams));
            if (status !== 200) throw new Error(`設定保存エラー: ${status}`);
        },
        
        syncExternalAppDropdown: async (appId, fieldName, options) => {
            // テキストフィールドの場合は同期不要
            console.log('Skip dropdown sync for text field.');
        }
    };
  }

  // --- 以下、ViewModeSwitcher.jsからコピーしたヘルパー関数とダイアログ関数 ---

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

  // 独自モーダル関連関数
  function createModalBase(initialOnCloseRequest) {
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay';
      const box = document.createElement('div');
      box.className = 'custom-modal-box';
      box.style.position = 'relative'; // ×ボタンの配置用
      
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

      const closeBtn = document.createElement('div');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = 'position: absolute; top: 15px; right: 15px; font-size: 24px; cursor: pointer; color: #ccc; line-height: 1; font-weight: bold; z-index: 100; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;';
      closeBtn.onmouseover = () => { closeBtn.style.color = '#555'; closeBtn.style.backgroundColor = '#f0f0f0'; };
      closeBtn.onmouseout = () => { closeBtn.style.color = '#ccc'; closeBtn.style.backgroundColor = 'transparent'; };
      closeBtn.onclick = handleClose;
      
      box.appendChild(closeBtn);
      box.appendChild(content);
      overlay.appendChild(box);

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

  // スタッフ管理ダイアログ
  async function showStaffSettingDialog(isForced = false) {
      // ★変更: リモート(App 200)を使用するConfigManager
      const configManager = createRemoteConfigManager();
      const isRealMode = true; // 常に本番動作

      let initialStaffsJson = '[]';
      let initialUser = localStorage.getItem('shinryo_ticket_staff_name') || '';
      
      let currentStaffs = [];
      let tempUser = initialUser;

      const checkDirty = (action) => {
          const currentStaffsJson = JSON.stringify(currentStaffs);
          const isDirty = (currentStaffsJson !== initialStaffsJson) || (tempUser !== initialUser);
          checkDirtyAndConfirm(isDirty, action);
      };

      const { overlay, box, content } = createModalBase((doClose) => {
          if (isForced) return;
          checkDirty(doClose);
      });

      box.style.maxWidth = '600px';
      
      if (isForced) {
          const closeBtn = box.querySelector('div[style*="position: absolute"]');
          if (closeBtn) closeBtn.style.display = 'none';
          overlay.onclick = null;
      }

      const title = document.createElement('h2');
      title.textContent = isForced ? '初期設定: スタッフ登録' : 'スタッフ管理';
      title.style.cssText = 'margin-top: 0; margin-bottom: 20px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      if (isForced) title.style.color = '#e74c3c';
      content.appendChild(title);

      // ★変更: 抽象化された configManager を使用
      await configManager.fetchPublishedData();
      const common = configManager.getCommonSettings();
      if (common && Array.isArray(common.staffs)) {
          currentStaffs = JSON.parse(JSON.stringify(common.staffs));
      }
      initialStaffsJson = JSON.stringify(currentStaffs);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      closeBtn.textContent = '保存して閉じる';
      closeBtn.style.display = 'none';

      const updateSaveButtonVisibility = () => {
          const currentStaffsJson = JSON.stringify(currentStaffs);
          const isDirty = (currentStaffsJson !== initialStaffsJson) || (tempUser !== initialUser);
          closeBtn.style.display = isDirty ? 'inline-block' : 'none';
      };

      const userSettingContainer = document.createElement('div');
      userSettingContainer.style.cssText = 'margin-bottom: 20px; padding: 15px; background-color: #e8f5e9; border-radius: 6px; text-align: left;';

      const userLabel = document.createElement('div');
      userLabel.textContent = 'この端末の利用者 (担当者)';
      userLabel.style.cssText = 'font-weight: bold; margin-bottom: 8px; font-size: 12px;';
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
          tempUser = userSelect.value;
          updateSaveButtonVisibility();
      };

      const userDesc = document.createElement('div');
      userDesc.textContent = '※あなたが現在操作している端末（つまりこの端末）は、ここで選択した名前が予約チケット管理アプリの操作時に「担当者」として紐づけられます。';
      userDesc.style.cssText = 'font-size: 10px; color: #666;';
      
      userSettingContainer.appendChild(userSelect);
      userSettingContainer.appendChild(userDesc);
      content.appendChild(userSettingContainer);

      const container = document.createElement('div');
      container.style.cssText = 'text-align: left; margin-bottom: 20px; max-height: 400px; overflow-y: auto;';

      const renderList = () => {
          container.innerHTML = '';
          if (currentStaffs.length === 0) {
              container.innerHTML = '<div style="color:#999; text-align:center; padding:20px;">登録されているスタッフはいません</div>';
          } else {
              currentStaffs.forEach((staff, idx) => {
                  const row = document.createElement('div');
                  row.style.cssText = 'display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #eee;';
                  
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
                          if (staff.name === tempUser) {
                              tempUser = '';
                          }
                          currentStaffs.splice(idx, 1);
                          renderList();
                          updateUserSelect();
                          updateSaveButtonVisibility();
                      }
                  };
                  container.appendChild(row);
              });
          }
      };
      renderList();
      content.appendChild(container);

      const addForm = document.createElement('div');
      addForm.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;';
      addForm.innerHTML = `
        <div style="display:flex; gap:10px;">
            <input type="text" class="custom-modal-input" placeholder="スタッフ名 (必須)" style="margin:0; flex:1;" id="new-staff-name">
        </div>
        <button class="custom-modal-btn custom-modal-btn-ok" style="align-self:flex-end; min-width:80px;">追加</button>`;
      addForm.querySelector('button').onclick = () => {
          const nameInput = document.getElementById('new-staff-name');
          const name = nameInput.value.trim();
          if(name) {
              currentStaffs.push({ name: name });
              nameInput.value = '';
              tempUser = name;
              renderList();
              updateUserSelect();
              updateSaveButtonVisibility();
          }
      };
      box.appendChild(addForm);

      closeBtn.onclick = async () => {
          const ticketConfig = JSON.parse(localStorage.getItem('shinryo_ticket_config') || '{}');
          const targetAppId = ticketConfig.appId || 142;

          overlay.onclick = null;

          box.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 30px; margin-bottom: 15px; display: inline-block;">⏳</div>
                <div style="font-weight: bold; font-size: 18px; color: #333; margin-bottom: 10px;">保存と同期を実行中...</div>
                <div style="font-size: 13px; color: #666;">画面を閉じずにそのままお待ちください。</div>
            </div>
          `;

          try {
              localStorage.setItem('shinryo_ticket_staff_name', tempUser);
              
              if (tempUser) {
                  localStorage.setItem('customKey', tempUser);
              } else {
                  localStorage.removeItem('customKey');
              }

              // ★変更: 抽象化された configManager を使用
              await configManager.updateCommonStaffs(currentStaffs);

              const staffNames = currentStaffs.map(s => s.name);
              await configManager.syncExternalAppDropdown(142, '担当者', staffNames);
              if (targetAppId != 142) {
                  await configManager.syncExternalAppDropdown(targetAppId, '担当者', staffNames);
              }

              // ★変更: 本番モードの時だけリロードする
              location.reload();
          } catch(e) {
              await showCustomDialog('保存または同期に失敗しました。\n' + e.message, 'alert');
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

})();
