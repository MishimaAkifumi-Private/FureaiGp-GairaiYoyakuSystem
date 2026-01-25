﻿/*
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

  async function showMailSettingsDialog() {
      const { overlay, box, content, setOnCloseRequest } = createModalBase();
      box.style.maxWidth = '500px';
      box.style.maxHeight = '90vh';
      box.style.overflowY = 'auto';
      
      let config = JSON.parse(localStorage.getItem('shinryo_ticket_config') || '{}');
      let staffList = [];
      if (window.ShinryoApp && window.ShinryoApp.ConfigManager) {
          try {
              const pubData = await window.ShinryoApp.ConfigManager.fetchPublishedData();
              if (pubData && pubData.commonSettings && Array.isArray(pubData.commonSettings.staffs)) {
                  staffList = pubData.commonSettings.staffs;
              }
          } catch(e) { console.warn('Failed to fetch staff list', e); }
      }

      const titleStyle = 'margin-top: 0; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #f0f2f5; padding-bottom: 15px; color: #2c3e50; font-weight: 700; text-align: center;';

      const renderMenu = () => {
          setOnCloseRequest(null);
          content.innerHTML = '';
          const title = document.createElement('h2');
          title.textContent = 'メール設定';
          title.style.cssText = titleStyle;
          content.appendChild(title);

          const menuList = [
              { label: 'BCC設定', icon: '📬', desc: 'BCC の設定', action: () => renderMailDestSettings() },
              { label: '予約日リマインド設定', icon: '⏰', desc: 'リマインドメールの送信設定', action: () => renderReminderSettings() }
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
          closeBtn.style.marginTop = '20px';
          closeBtn.onclick = () => document.body.removeChild(overlay);
          content.appendChild(closeBtn);
      };

      const renderForm = (titleText, inputsDef, onSave, backAction) => {
          content.innerHTML = '';
          const title = document.createElement('h2');
          title.textContent = titleText;
          title.style.cssText = titleStyle;
          content.appendChild(title);

          const inputEls = {};
          const initialValues = {};

          inputsDef.forEach(def => {
              let val = config[def.key] || '';
              if (def.fallbackKey && !val) val = config[def.fallbackKey] || '';
              if (def.default && !val) val = def.default;
              initialValues[def.key] = val;
          });

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
                      if (opt === initialValues[def.key]) o.selected = true;
                      inp.appendChild(o);
                  });
              } else if (def.type === 'textarea') {
                  inp = document.createElement('textarea');
                  inp.className = 'custom-modal-input';
                  inp.style.marginBottom = '0';
                  inp.style.height = '100px';
                  inp.style.resize = 'vertical';
                  inp.style.fontFamily = 'monospace';
                  inp.value = initialValues[def.key];
                  if (def.placeholder) inp.placeholder = def.placeholder;
              } else {
                  inp = document.createElement('input');
                  inp.className = 'custom-modal-input';
                  inp.style.marginBottom = '0';
                  inp.type = def.type || 'text';
                  inp.value = initialValues[def.key];
                  if (def.placeholder) inp.placeholder = def.placeholder;
              }
              inputEls[def.key] = inp;
              div.appendChild(inp);
              content.appendChild(div);
          });

          const checkDirty = (action) => {
              let isDirty = false;
              Object.keys(inputEls).forEach(key => {
                  if (inputEls[key].value != initialValues[key]) isDirty = true;
              });
              checkDirtyAndConfirm(isDirty, action);
          };
          setOnCloseRequest((doClose) => checkDirty(doClose));

          const btnGroup = document.createElement('div');
          btnGroup.className = 'custom-modal-btn-group';
          btnGroup.style.marginTop = '20px';

          const cancelBtn = document.createElement('button');
          cancelBtn.className = 'custom-modal-btn custom-modal-btn-cancel';
          cancelBtn.textContent = 'キャンセル';
          cancelBtn.onclick = () => checkDirty(() => backAction());

          const saveBtn = document.createElement('button');
          saveBtn.className = 'custom-modal-btn custom-modal-btn-ok';
          saveBtn.textContent = '保存';
          saveBtn.onclick = () => {
              const newValues = {};
              Object.keys(inputEls).forEach(key => { newValues[key] = inputEls[key].value; });
              if (onSave(newValues)) {
                  config = { ...config, ...newValues };
                  localStorage.setItem('shinryo_ticket_config', JSON.stringify(config));
                  backAction();
              }
          };

          btnGroup.appendChild(cancelBtn);
          btnGroup.appendChild(saveBtn);
          content.appendChild(btnGroup);
      };

      const renderMailDestSettings = () => {
          renderForm('BCC設定', [
              { label: 'BCC', key: 'mailBcc', placeholder: '例: bcc@example.com' }
          ], () => true, renderMenu);
      };

      const renderReminderSettings = () => {
          const staffOptions = ['(選択なし)', ...staffList.map(s => s.name)];
          const inputs = [
              { label: '送信タイミング (日前)', key: 'reminderDays', type: 'number', placeholder: '例: 1 (前日)' },
              { label: '送信時間', key: 'reminderTime', type: 'time' },
              { label: '担当スタッフ (署名用)', key: 'reminderStaffName', type: 'select', options: staffOptions, default: '(選択なし)' },
              { label: '件名', key: 'reminderSubject', placeholder: '【リマインド】明日のご予約について' },
              { label: '本文', key: 'reminderBody', type: 'textarea', placeholder: '{{name}} 様\n\n明日のご予約の日時をお知らせします。\n日時: {{date}} {{time}}\n診療科: {{dept}}\n担当医: {{doctor}}\n\n担当: {{staff_name}} ({{staff_email}})\nご来院をお待ちしております。' }
          ];

          renderForm('予約日リマインド設定', inputs, (vals) => {
              if (vals.reminderStaffName && vals.reminderStaffName !== '(選択なし)') {
                  const targetStaff = staffList.find(s => s.name === vals.reminderStaffName);
                  if (targetStaff) config.reminderStaffEmail = targetStaff.email || '';
              } else {
                  config.reminderStaffEmail = '';
              }
              localStorage.setItem('shinryo_ticket_config', JSON.stringify(config));
              return true;
          }, renderMenu);
          
          const note = document.createElement('div');
          note.style.fontSize = '11px';
          note.style.color = '#666';
          note.style.textAlign = 'left';
          note.style.marginTop = '-10px';
          note.style.marginBottom = '15px';
          note.style.padding = '10px';
          note.style.backgroundColor = '#f8f9fa';
          note.style.borderRadius = '4px';
          note.innerHTML = `<strong>利用可能な差し込みタグ:</strong><br>{{name}}: 患者名, {{date}}: 予約日, {{time}}: 予約時間<br>{{dept}}: 診療科, {{doctor}}: 医師名<br>{{staff_name}}: 担当スタッフ名, {{staff_email}}: スタッフEmail`;
          const btnGroup = content.querySelector('.custom-modal-btn-group');
          if (btnGroup) content.insertBefore(note, btnGroup);
      };

      renderMenu();
      document.body.appendChild(overlay);
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
      
      const reloadBtn = document.createElement('button');
      reloadBtn.textContent = '再読み込み';
      reloadBtn.style.cssText = 'padding: 12px 30px; font-size: 16px; cursor: pointer; background: #3498db; color: #fff; border: none; border-radius: 5px; font-weight: bold; transition: background 0.2s;';
      reloadBtn.onmouseover = () => reloadBtn.style.background = '#2980b9';
      reloadBtn.onmouseout = () => reloadBtn.style.background = '#3498db';
      reloadBtn.onclick = () => location.reload();

      box.appendChild(icon);
      box.appendChild(title);
      box.appendChild(desc);
      box.appendChild(reloadBtn);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
  };

  const renderStaffBadge = () => {
    // スタッフ名取得 (APP156と共有のキーを優先)
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

    // 既に表示済みなら削除して再作成（二重防止）- ラッパーごと削除
    const wrapperId = 'staff-badge-wrapper';
    const existingWrapper = document.getElementById(wrapperId);
    if (existingWrapper) existingWrapper.remove();

    const wrapper = document.createElement('div');
    wrapper.id = wrapperId;
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';

    const displayName = staffName;
    const nameColor = '#666';

    const container = document.createElement('div');
    container.id = 'staff-display-badge';
    // 指定されたスタイル + 配置調整(inline-flex)
    container.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-left: 20px; vertical-align: middle; background-color: #fff; border: 2px solid #e0e0e0; border-radius: 40px; padding: 6px 24px 6px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: default; transition: all 0.2s;';
    
    // ホバーエフェクト
    container.onmouseover = () => {
        container.style.backgroundColor = '#f8f9fa';
        container.style.borderColor = '#ccc';
        container.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    };
    container.onmouseout = () => {
        container.style.backgroundColor = '#fff';
        container.style.borderColor = '#e0e0e0';
        container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    };

    container.innerHTML = `
        <div style="display: flex; align-items: center; font-size: 32px; color: #555;">
            <i class="fa-solid fa-headset"></i>
        </div>
        <div style="font-size: 24px; font-weight: bold; color: ${nameColor}; margin-left: 2px; line-height: 1;">
            ${displayName}
        </div>
    `;
    
    // Settings Button
    const settingsBtn = document.createElement('div');
    settingsBtn.id = 'mail-settings-btn';
    settingsBtn.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; margin-left: 15px; vertical-align: middle; cursor: pointer; transition: transform 0.2s; font-size: 45px;';
    settingsBtn.innerHTML = '📧';
    settingsBtn.title = 'メール設定';
    
    settingsBtn.onmouseover = () => {
        settingsBtn.style.transform = 'scale(1.1)';
    };
    settingsBtn.onmouseout = () => {
        settingsBtn.style.transform = 'scale(1)';
    };
    settingsBtn.onclick = showMailSettingsDialog;

    wrapper.appendChild(container);
    wrapper.appendChild(settingsBtn);
    targetSpace.appendChild(wrapper);
  };

  kintone.events.on(['app.record.index.show', 'app.record.detail.show'], (event) => {
    loadFontAwesome();
    // DOM構築待ちを含めて実行
    setTimeout(renderStaffBadge, 100);
    return event;
  });

})();