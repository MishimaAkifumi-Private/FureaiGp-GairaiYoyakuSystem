/*
 * Kintone Rich Text Copier (最終版・DOM比較対応)
 * Copyright (c) 2024-2025 Your Name or Company
 * Released under the MIT License.
 */
(function() {
  'use strict';

  // --- スタイル定義 (ボタン用) ---
  const css = `
    .custom-copy-button {
      background-color: #cd5c5c !important;
      color: white !important;
      border: none !important;
      margin-left: 10px !important;
      transition: opacity 0.2s;
    }
    .custom-copy-button:hover {
      opacity: 0.75;
    }
    .custom-copy-button.is-disabled {
      background-color: #cccccc !important; /* グレー系の色に変更 */
      color: #666666 !important;
      cursor: not-allowed !important; /* マウスカーソルを「禁止」マークに */
    }
    .custom-copy-button.is-disabled:hover {
      opacity: 1 !important; /* ホバーしても見た目が変わらないようにする */
    }
    .help-tooltip {
      position: absolute;
      background-color: #333;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
      max-width: 250px;
      line-height: 1.4;
    }
  `;

  const styleId = 'custom-copy-button-style';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.type = 'text/css';
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }

  // --- ヘルプツールチップ表示用関数 ---
  const showHelp = (e, text) => {
    const existing = document.getElementById('guide-help-tip');
    if (existing) existing.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'help-tooltip';
    tooltip.id = 'guide-help-tip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    const updatePos = (ev) => {
      tooltip.style.left = (ev.pageX + 15) + 'px';
      tooltip.style.top = (ev.pageY + 15) + 'px';
    };
    updatePos(e);
    e.target.addEventListener('mousemove', updatePos);
    e.target.addEventListener('mouseleave', () => {
      e.target.removeEventListener('mousemove', updatePos);
      const tip = document.getElementById('guide-help-tip');
      if (tip) tip.remove();
    }, { once: true });
  };

  // --- 4セット分の設定情報 ---
  const buttonSettings = [
    { sourceFieldCode: '冒頭ラベル', targetFieldCode: '冒頭ラベルProxy', spaceFieldCode: 'ButtonSpaceForHeader' },
    { sourceFieldCode: '変更用件ラベル', targetFieldCode: '変更ラベルProxy', spaceFieldCode: 'ButtonSpaceForChange' },
    { sourceFieldCode: '初診用件ラベル', targetFieldCode: '初診ラベルProxy', spaceFieldCode: 'ButtonSpaceForFirstvisit' },
    { sourceFieldCode: '取消用件ラベル', targetFieldCode: '取消ラベルProxy', spaceFieldCode: 'ButtonSpaceForCancel' }
  ];

  // ★★★【追加】2つのHTMLを正確に比較するためのヘルパー関数 ★★★
  /**
   * 2つのHTML文字列をDOMを使って比較する関数
   * @param {string} html1 - 比較するHTML文字列1
   * @param {string} html2 - 比較するHTML文字列2
   * @returns {boolean} - 内容が同じであればtrue、異なればfalse
   */
  const compareHtml = (html1, html2) => {
    // 両方が空またはnullの場合は同一とみなす
    if (!html1 && !html2) return true;

    // 目に見えないdiv要素を2つ作成
    const div1 = document.createElement('div');
    const div2 = document.createElement('div');
    
    // それぞれにHTMLを流し込むことで、ブラウザに解釈・正規化させる
    div1.innerHTML = html1 || '';
    div2.innerHTML = html2 || '';

    // 正規化された後のHTML文字列を比較
    return div1.innerHTML === div2.innerHTML;
  };


  // =================================================================
  // レコード詳細画面の処理
  // =================================================================
  kintone.events.on('app.record.detail.show', function(event) {
    const record = event.record;

    buttonSettings.forEach(setting => {
      const spaceElement = kintone.app.record.getSpaceElement(setting.spaceFieldCode);
      if (!spaceElement) {
        console.error('指定されたスペースフィールドが見つかりません: ' + setting.spaceFieldCode);
        return;
      }

      const buttonId = 'copy-button-detail-' + setting.spaceFieldCode;
      // 毎回ボタンを再描画するため、既存のボタンがあれば削除
      const existingButton = document.getElementById(buttonId);
      if (existingButton) {
        existingButton.remove();
      }

      const copyButton = document.createElement('button');
      copyButton.id = buttonId;
      copyButton.className = 'kintoneplugin-button-normal custom-copy-button';

      // ソースとターゲットの値を取得
      const sourceValue = record[setting.sourceFieldCode].value;
      const targetValue = record[setting.targetFieldCode].value;

      // ★★★ 変更点：新しいcompareHtml関数を使った比較に変更 ★★★
      const isSameContent = compareHtml(sourceValue, targetValue);
      
      if (isSameContent) {
        // 【差異なしの場合】ボタンを「反映済み」として無効化（グレーアウト）する
        copyButton.textContent = '反映済み';
        copyButton.disabled = true;
        copyButton.classList.add('is-disabled');
        copyButton.onmouseenter = (e) => showHelp(e, 'この項目の内容は既にWebフォーム側と一致しています。');

      } else {
        // 【差異ありの場合】ボタンを有効化する
        copyButton.textContent = 'Webフォームに反映する';
        copyButton.onmouseenter = (e) => showHelp(e, '左側のリッチテキストで編集した内容を、Web予約フォームが参照する公開用フィールドへ同期します。');
        copyButton.disabled = false;
        
        copyButton.onclick = function() {
          this.disabled = true;
          this.textContent = '反映中...';

          const recordId = kintone.app.record.getId();
          const latestSourceValue = kintone.app.record.get().record[setting.sourceFieldCode].value;

          const params = {
            app: kintone.app.getId(),
            id: recordId,
            record: { [setting.targetFieldCode]: { value: latestSourceValue } }
          };

          kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', params)
            .then(function(resp) {
              alert('Webフォームへの反映が完了しました。画面を更新します。');
              location.reload();
            })
            .catch(function(error) {
              console.error(error);
              alert('エラーが発生しました。詳細はデベロッパーツールのコンソールを確認してください。');
              copyButton.disabled = false;
              copyButton.textContent = 'Webフォームに反映する';
            });
        };
      }
      
      spaceElement.appendChild(copyButton);
    });

    return event;
  });

})();