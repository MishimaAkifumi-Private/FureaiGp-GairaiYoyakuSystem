/*
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

    // 既に表示済みなら削除して再作成（二重防止）
    const existing = document.getElementById('staff-display-badge');
    if (existing) existing.remove();

    const displayName = staffName;
    const nameColor = '#666';

    const container = document.createElement('div');
    container.id = 'staff-display-badge';
    // 指定されたスタイル + 配置調整(inline-flex)
    container.style.cssText = 'display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-left: 20px; vertical-align: middle; background-color: #fff; border: 2px solid #e0e0e0; border-radius: 40px; padding: 6px 24px 6px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s;';
    
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
    
    targetSpace.appendChild(container);
  };

  kintone.events.on(['app.record.index.show', 'app.record.detail.show'], (event) => {
    loadFontAwesome();
    // DOM構築待ちを含めて実行
    setTimeout(renderStaffBadge, 100);
    return event;
  });

})();