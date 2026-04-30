﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿/*
 * InitialPcUserRegist.js
 * 担当者表示スクリプト (APP142用)
 * 指定されたデザインで現在の端末利用者を表示します。
 */
(function() {
  'use strict';

  // FontAwesomeのロード
  const loadFontAwesome = () => {
    if (!document.getElementById('font-awesome-css')) {
      const link = document.createElement('link');
      link.id = 'font-awesome-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
  };

  // --- Modal & Settings Logic (Ported from ViewModeSwitcher.js) ---
  const injectModalStyles = () => {
      if (document.getElementById('custom-modal-styles')) return;
      const css = `
        .custom-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center; }
        .custom-modal-box { background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.25); min-width: 400px; max-width: 600px; text-align: center; font-family: "Helvetica Neue", Arial, sans-serif; border: 1px solid rgba(0,0,0,0.1); }
        .custom-modal-msg { margin-bottom: 25px; font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #555; }
        .custom-modal-btn-group { display: flex; justify-content: center; gap: 15px; margin-top: 25px; }
        .custom-modal-btn { padding: 10px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; min-width: 100px; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .custom-modal-btn:active { transform: translateY(1px); box-shadow: none; }
        .custom-modal-btn-ok { background: #3498db; color: #fff; }
        .custom-modal-btn-ok:hover { background: #2980b9; }
        .custom-modal-btn-cancel { background: #95a5a6; color: #fff; }
        .custom-modal-btn-cancel:hover { background: #7f8c8d; }
        .custom-modal-menu-btn { display: flex; align-items: center; width: 100%; padding: 16px 20px; margin-bottom: 12px; background: #fff; border: 1px solid #e1e4e8; border-radius: 8px; text-align: left; cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .custom-modal-menu-btn:hover { background: #f8fbff; border-color: #3498db; box-shadow: 0 5px 15px rgba(52, 152, 219, 0.15); transform: translateY(-2px); }
        .custom-modal-menu-btn::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: #3498db; opacity: 0; transition: opacity 0.2s; border-top-left-radius: 7px; border-bottom-left-radius: 7px; }
        .custom-modal-menu-btn:hover::before { opacity: 1; }
        .menu-btn-icon { font-size: 24px; margin-right: 15px; display: flex; align-items: center; justify-content: center; width: 30px; }
        .menu-btn-content { flex: 1; }
        .menu-btn-title { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 3px; }
        .menu-btn-desc { font-size: 12px; color: #7f8c8d; line-height: 1.3; }
        .custom-modal-input { width: 100%; padding: 12px; font-size: 15px; border: 1px solid #dce1e6; border-radius: 6px; box-sizing: border-box; margin-bottom: 20px; background-color: #fcfcfc; transition: border-color 0.2s, background-color 0.2s; }
        .custom-modal-input:focus { border-color: #3498db; background-color: #fff; outline: none; }
      `;
      const style = document.createElement('style');
      style.id = 'custom-modal-styles';
      style.textContent = css;
      document.head.appendChild(style);
  };

  function createModalBase(initialOnCloseRequest) {
      injectModalStyles();
      const overlay = document.createElement('div');
      overlay.className = 'custom-modal-overlay';
      const box = document.createElement('div');
      box.className = 'custom-modal-box';
      box.style.position = 'relative';
      
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
      overlay.onclick = (e) => { if (e.target === overlay) handleClose(); };

      return { overlay, box, content, setOnCloseRequest };
  }

  function showCustomDialog(message, type = 'alert', labels = {}) {
      return new Promise((resolve) => {
          const { overlay, box, content } = createModalBase();
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

          if (type === 'confirm') btnGroup.appendChild(createBtn(labels.cancel || 'キャンセル', 'custom-modal-btn-cancel', false));
          btnGroup.appendChild(createBtn(labels.ok || 'OK', 'custom-modal-btn-ok', true));

          content.appendChild(msg);
          content.appendChild(btnGroup);
          document.body.appendChild(overlay);
      });
  }

  function checkDirtyAndConfirm(isDirty, onConfirm) {
      if (isDirty) {
          showCustomDialog('変更が保存されていません。\n破棄して閉じてもよろしいですか？', 'confirm', { ok: '破棄する', cancel: 'キャンセル' })
              .then(confirmed => { if (confirmed) onConfirm(); });
      } else {
          onConfirm();
      }
  }

  const showBlockingDialog = () => {
      if (document.getElementById('staff-blocking-overlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'staff-blocking-overlay';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 999999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);';
      
      const box = document.createElement('div');
      box.style.cssText = 'background: #fff; padding: 40px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center; max-width: 600px; width: 90%;';
      
      const icon = document.createElement('div');
      icon.innerHTML = '⚠️';
      icon.style.cssText = 'font-size: 50px; margin-bottom: 20px;';
      
      const title = document.createElement('div');
      title.textContent = 'スタッフが未設定です';
      title.style.cssText = 'font-size: 24px; font-weight: bold; color: #e74c3c; margin-bottom: 15px;';
      
      const desc = document.createElement('div');
      desc.textContent = '外来予約管理システムにてこの端末にスタッフを設定してください。';
      desc.style.cssText = 'font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 30px;';
      
      const btnGroup = document.createElement('div');
      btnGroup.style.display = 'flex';
      btnGroup.style.gap = '10px';
      btnGroup.style.justifyContent = 'center';

      const settingBtn = document.createElement('button');
      settingBtn.textContent = '担当者を設定する';
      settingBtn.style.cssText = 'padding: 12px 30px; font-size: 16px; cursor: pointer; background: #27ae60; color: #fff; border: none; border-radius: 5px; font-weight: bold; transition: background 0.2s;';
      settingBtn.onclick = () => {
          document.body.removeChild(overlay);
          showStaffRegistrationDialog();
      };

      const reloadBtn = document.createElement('button');
      reloadBtn.textContent = '再読み込み';
      reloadBtn.style.cssText = 'padding: 12px 30px; font-size: 16px; cursor: pointer; background: #3498db; color: #fff; border: none; border-radius: 5px; font-weight: bold; transition: background 0.2s;';
      reloadBtn.onmouseover = () => reloadBtn.style.background = '#2980b9';
      reloadBtn.onmouseout = () => reloadBtn.style.background = '#3498db';
      reloadBtn.onclick = () => location.reload();

      btnGroup.appendChild(settingBtn);
      btnGroup.appendChild(reloadBtn);

      box.appendChild(icon);
      box.appendChild(title);
      box.appendChild(desc);
      box.appendChild(btnGroup);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
  };

  // ★追加: スタッフマスタ設定ダイアログ
  async function showStaffMasterSettingDialog() {
      let hasConfigManager = false;
      if (window.ShinryoApp && window.ShinryoApp.ConfigManager) hasConfigManager = true;
      const { overlay, box, content } = createModalBase();
      box.style.maxWidth = '600px';

      const title = document.createElement('h2');
      title.textContent = 'スタッフリスト管理 (管理者用)';
      title.style.cssText = 'margin-top: 0; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      content.appendChild(title);

      // データ取得
      let currentStaffs = [];
      if (hasConfigManager) {
          try {
              const pubData = await window.ShinryoApp.ConfigManager.fetchPublishedData();
              if (pubData && pubData.commonSettings && Array.isArray(pubData.commonSettings.staffs)) {
                  currentStaffs = pubData.commonSettings.staffs;
              }
          } catch(e) { console.warn(e); }
      }
      // ConfigManagerから取得できなかった場合はローカルストレージを確認 (フォールバック)
      if (currentStaffs.length === 0) {
          try {
              currentStaffs = JSON.parse(localStorage.getItem('shinryo_common_staffs') || '[]');
          } catch(e) {}
      }

      const listContainer = document.createElement('div');
      listContainer.style.maxHeight = '400px';
      listContainer.style.overflowY = 'auto';
      listContainer.style.marginBottom = '15px';

      // ヘッダー
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.fontWeight = 'bold';
      header.style.borderBottom = '1px solid #ddd';
      header.style.paddingBottom = '5px';
      header.style.marginBottom = '10px';
      header.innerHTML = `
        <div style="flex: 1; padding-left: 5px;">スタッフ名</div>
        <div style="flex: 1; padding-left: 5px;">メールアドレス (任意)</div>
        <div style="width: 40px;"></div>
      `;
      listContainer.appendChild(header);

      const rows = [];

      const addRow = (staff = { name: '', email: '' }) => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.marginBottom = '8px';
          row.style.alignItems = 'center';

          const nameInput = document.createElement('input');
          nameInput.className = 'custom-modal-input';
          nameInput.style.marginBottom = '0';
          nameInput.style.marginRight = '5px';
          nameInput.style.flex = '1';
          nameInput.placeholder = '氏名';
          nameInput.value = staff.name || '';

          const emailInput = document.createElement('input');
          emailInput.className = 'custom-modal-input';
          emailInput.style.marginBottom = '0';
          emailInput.style.marginRight = '5px';
          emailInput.style.flex = '1';
          emailInput.placeholder = 'email@example.com';
          emailInput.value = staff.email || '';

          const delBtn = document.createElement('button');
          delBtn.textContent = '×';
          delBtn.style.cssText = 'width: 30px; height: 30px; border: 1px solid #e74c3c; color: #e74c3c; background: #fff; border-radius: 4px; cursor: pointer; font-weight: bold;';
          delBtn.onclick = () => {
              row.remove();
              const idx = rows.indexOf(rowObj);
              if (idx > -1) rows.splice(idx, 1);
          };

          row.appendChild(nameInput);
          row.appendChild(emailInput);
          row.appendChild(delBtn);
          listContainer.appendChild(row);

          const rowObj = { element: row, nameInput, emailInput };
          rows.push(rowObj);
      };

      currentStaffs.forEach(s => addRow(s));
      if (currentStaffs.length === 0) addRow();

      content.appendChild(listContainer);

      const addBtn = document.createElement('button');
      addBtn.textContent = '+ スタッフを追加';
      addBtn.style.cssText = 'background: none; border: none; color: #3498db; cursor: pointer; font-weight: bold; margin-bottom: 20px;';
      addBtn.onclick = () => addRow();
      content.appendChild(addBtn);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = '戻る';
      cancelBtn.onclick = () => { document.body.removeChild(overlay); showStaffRegistrationDialog(); };

      const saveBtn = document.createElement('button');
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.onclick = async () => {
          const newStaffs = rows.map(r => ({
              name: r.nameInput.value.trim(),
              email: r.emailInput.value.trim()
          })).filter(s => s.name);

          if (hasConfigManager) {
              try {
                  // ConfigManager経由で共通設定を更新
                  if (typeof window.ShinryoApp.ConfigManager.updateCommonStaffs === 'function') {
                      await window.ShinryoApp.ConfigManager.updateCommonStaffs(newStaffs);
                      await showCustomDialog('スタッフリストを保存しました。', 'alert');
                      document.body.removeChild(overlay);
                      showStaffRegistrationDialog();
                  } else {
                      // メソッドがない場合もローカルへフォールバック
                      localStorage.setItem('shinryo_common_staffs', JSON.stringify(newStaffs));
                      await showCustomDialog('ConfigManagerに保存機能が見つかりませんでした。\nローカルストレージに保存しました。', 'alert');
                      document.body.removeChild(overlay);
                      showStaffRegistrationDialog();
                  }
              } catch(e) {
                  await showCustomDialog('保存に失敗しました。\n' + e.message, 'alert');
              }
          } else {
              // ConfigManagerがない場合 -> ローカルストレージに保存
              localStorage.setItem('shinryo_common_staffs', JSON.stringify(newStaffs));
              await showCustomDialog('設定マネージャーが見つからないため、この端末のローカルストレージに保存しました。\n※他の端末には共有されません。', 'alert');
              document.body.removeChild(overlay);
              showStaffRegistrationDialog();
          }
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      content.appendChild(btnGroup);

      document.body.appendChild(overlay);
  }

  // ★修正: 端末利用者登録ダイアログ (リスト選択式)
  async function showStaffRegistrationDialog() {
      const currentName = localStorage.getItem('shinryo_ticket_staff_name') || '';
      let hasConfigManager = false;
      if (window.ShinryoApp && window.ShinryoApp.ConfigManager) hasConfigManager = true;
      
      // スタッフリスト取得
      let staffList = [];
      if (hasConfigManager) {
          try {
              const pubData = await window.ShinryoApp.ConfigManager.fetchPublishedData();
              if (pubData && pubData.commonSettings && Array.isArray(pubData.commonSettings.staffs)) {
                  staffList = pubData.commonSettings.staffs;
              }
          } catch(e) { console.warn(e); }
      }
      // ConfigManagerから取得できなかった場合はローカルストレージを確認
      if (staffList.length === 0) {
          try {
              staffList = JSON.parse(localStorage.getItem('shinryo_common_staffs') || '[]');
          } catch(e) {}
      }

      const { overlay, box, content } = createModalBase();
      
      const title = document.createElement('h2');
      title.textContent = '端末利用者の設定';
      title.style.cssText = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700;';
      content.appendChild(title);

      const desc = document.createElement('p');
      desc.textContent = 'この端末を使用するスタッフ';
      desc.style.cssText = 'text-align: left; font-size: 14px; color: #666; margin-bottom: 10px; line-height: 1.5;';
      content.appendChild(desc);

      // プルダウン作成
      const select = document.createElement('select');
      select.className = 'custom-modal-input';
      
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '(選択してください)';
      select.appendChild(defaultOpt);

      let found = false;
      staffList.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.name;
          opt.textContent = s.name;
          if (s.name === currentName) {
              opt.selected = true;
              found = true;
          }
          select.appendChild(opt);
      });

      content.appendChild(select);

      const adminLinkDiv = document.createElement('div');
      adminLinkDiv.style.textAlign = 'right';
      adminLinkDiv.style.marginBottom = '20px';
      const adminLink = document.createElement('a');
      adminLink.textContent = 'スタッフリストを編集する';
      adminLink.style.cssText = 'font-size: 12px; color: #3498db; cursor: pointer; text-decoration: underline;';
      adminLink.onclick = () => {
          document.body.removeChild(overlay);
          showStaffMasterSettingDialog();
      };
      adminLinkDiv.appendChild(adminLink);
      content.appendChild(adminLinkDiv);

      const btnGroup = document.createElement('div');
      btnGroup.className = 'custom-modal-btn-group';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.onclick = () => document.body.removeChild(overlay);

      const saveBtn = document.createElement('button');
      saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
      saveBtn.textContent = '保存';
      saveBtn.onclick = () => {
          const val = select.value;
          if (val) {
              localStorage.setItem('shinryo_ticket_staff_name', val);
              localStorage.setItem('customKey', val); // 互換性維持
              document.body.removeChild(overlay);
              location.reload();
          } else {
              select.style.borderColor = 'red';
          }
      };

      btnGroup.appendChild(cancelBtn);
      btnGroup.appendChild(saveBtn);
      content.appendChild(btnGroup);

      document.body.appendChild(overlay);
  }

  const renderStaffBadge = () => {
    // スタッフ名取得 (設定アプリと共有のキーを優先)
    let staffName = localStorage.getItem('shinryo_ticket_staff_name');
    if (!staffName) {
        staffName = localStorage.getItem('customKey'); // 旧キー(互換性)
        if (staffName === 'cancel') staffName = null;
    }
    
    if (!staffName) {
        showBlockingDialog();
        return;
    }

    // ★変更: 挿入先を .gaia-argoui-app-toolbar-statusmenu に変更
    let targetSpace = document.querySelector('.gaia-argoui-app-toolbar-statusmenu');

    // 見つからない場合のフォールバック (ヘッダーメニュースペース)
    if (!targetSpace) {
        targetSpace = kintone.app.getHeaderMenuSpaceElement();
        if (!targetSpace) {
            targetSpace = kintone.app.record.getHeaderMenuSpaceElement();
        }
    }

    if (!targetSpace) return;

    // 既に表示済みなら再作成しない（ソート時等に削除・追加すると表示順が右端に寄ってしまうため）
    const wrapperId = 'staff-badge-wrapper';
    const existingWrapper = document.getElementById(wrapperId);
    if (existingWrapper && document.body.contains(existingWrapper)) {
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = wrapperId;
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';

    const displayName = staffName;
    const nameColor = '#ffffff';

    const container = document.createElement('div');
    container.id = 'staff-display-badge';
    // 指定されたスタイル + 配置調整(inline-flex)
    container.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-left: 20px; vertical-align: middle; background: linear-gradient(145deg, #3a6161, #243d3d); border: 1px solid #1d3131; border-radius: 40px; padding: 6px 8px 6px 16px; box-shadow: inset 1px 1px 2px rgba(255,255,255,0.3), inset -1px -1px 2px rgba(0,0,0,0.4), 0 2px 5px rgba(0,0,0,0.3); cursor: pointer; transition: all 0.2s;';
    container.onclick = showStaffRegistrationDialog; // ★修正: 担当者登録機能へ戻す
    
    // ホバーエフェクト
    container.onmouseover = () => {
        container.style.background = 'linear-gradient(145deg, #426e6e, #294747)';
        container.style.boxShadow = 'inset 1px 1px 2px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.4)';
    };
    container.onmouseout = () => {
        container.style.background = 'linear-gradient(145deg, #3a6161, #243d3d)';
        container.style.boxShadow = 'inset 1px 1px 2px rgba(255,255,255,0.3), inset -1px -1px 2px rgba(0,0,0,0.4), 0 2px 5px rgba(0,0,0,0.3)';
    };

    container.innerHTML = `
        <div style="display: flex; align-items: center; font-size: 32px; color: #ffffff; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
            <i class="fa-solid fa-headset"></i>
        </div>
        <div style="font-size: 24px; font-weight: bold; color: ${nameColor}; margin-left: 2px; line-height: 1; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
            ${displayName}
        </div>
    `;

    wrapper.appendChild(container);
    targetSpace.appendChild(wrapper);
  };

  kintone.events.on('app.record.index.show', (event) => {
    loadFontAwesome();
    // DOM構築待ちを含めて実行
    setTimeout(renderStaffBadge, 100);
    return event;
  });

  // 詳細・編集画面では非表示にする
  kintone.events.on(['app.record.detail.show', 'app.record.edit.show', 'app.record.create.show'], (event) => {
    const wrapper = document.getElementById('staff-badge-wrapper');
    if (wrapper) wrapper.remove();
    return event;
  });
})();