/*
 * Copyright (c) 2024 Akifumi Mishima
 * Released under the MIT license
 * https://opensource.org/licenses/mit-license.php
 */

(function() {
  'use strict';

  // 作成画面と編集画面が表示された時のイベント
  const events = [
    'app.record.create.show',
    'app.record.edit.show'
  ];

  kintone.events.on(events, function(event) {
    // 操作対象のチェックボックスフィールドのフィールドコードを配列で定義
    const checkBoxFieldCodes = [
      '月1', '月2', '月3', '月4', '月5',
      '火1', '火2', '火3', '火4', '火5',
      '水1', '水2', '水3', '水4', '水5',
      '木1', '木2', '木3', '木4', '木5',
      '金1', '金2', '金3', '金4', '金5',
      '土1', '土2', '土3', '土4', '土5'
    ];

    // ボタンを設置するスペースフィールドのフィールドコード
    const spaceFieldCode = 'WeekOpenCheckButtonCtrol';

    // スペースフィールドの要素を取得
    const spaceElement = kintone.app.record.getSpaceElement(spaceFieldCode);
    if (!spaceElement) {
      console.log('スペースフィールド ' + spaceFieldCode + ' が見つかりません。');
      return event;
    }

    // すでにボタンが作成済みの場合は処理を中断
    if (document.getElementById('select_all_week_btn')) {
        return event;
    }

    // ボタンに適用する共通のスタイル
    const buttonStyle = {
      backgroundColor: '#3498db', // Kintoneの標準的な青色
      color: '#fff',
      border: 'none',
      padding: '4px 16px',
      fontSize: '12px',
      lineHeight: '1.5',
      cursor: 'pointer',
      borderRadius: '4px'
    };

    // --- 「すべて選択」ボタンの作成 ---
    const selectAllButton = document.createElement('button');
    selectAllButton.id = 'select_all_week_btn';
    selectAllButton.textContent = 'すべて選択';
    Object.assign(selectAllButton.style, buttonStyle);
    selectAllButton.style.marginRight = '12px';

    selectAllButton.onclick = function() {
      const record = kintone.app.record.get().record;
      const allOptions = ['午前', '午後'];
      checkBoxFieldCodes.forEach(function(fieldCode) {
        if (record[fieldCode]) {
          record[fieldCode].value = allOptions;
        }
      });
      kintone.app.record.set({ record: record });
    };

    // --- 「すべて解除」ボタンの作成 ---
    const deselectAllButton = document.createElement('button');
    deselectAllButton.id = 'deselect_all_week_btn';
    deselectAllButton.textContent = 'すべて解除';
    Object.assign(deselectAllButton.style, buttonStyle);
    deselectAllButton.style.marginRight = '12px'; // ★ 新しいボタンとの間隔を確保

    deselectAllButton.onclick = function() {
      const record = kintone.app.record.get().record;
      checkBoxFieldCodes.forEach(function(fieldCode) {
        if (record[fieldCode]) {
          record[fieldCode].value = [];
        }
      });
      kintone.app.record.set({ record: record });
    };

    // --- ★ここから「第一週と同じ」ボタンの追加 ---
    const copyWeek1Button = document.createElement('button');
    copyWeek1Button.id = 'copy_week1_btn';
    copyWeek1Button.textContent = '第一週と同じ';
    Object.assign(copyWeek1Button.style, buttonStyle);

    copyWeek1Button.onclick = function() {
      const record = kintone.app.record.get().record;
      const dayPrefixes = ['月', '火', '水', '木', '金', '土'];

      dayPrefixes.forEach(function(day) {
        const sourceFieldCode = day + '1'; // コピー元 (例: '月1')
        
        // コピー元のフィールドが存在し、値があることを確認
        if (record[sourceFieldCode] && record[sourceFieldCode].value) {
          const sourceValue = record[sourceFieldCode].value;

          // 第2週から第5週までループ
          for (let i = 2; i <= 5; i++) {
            const destFieldCode = day + i; // コピー先 (例: '月2')
            if (record[destFieldCode]) {
              // 値をコピー
              record[destFieldCode].value = sourceValue.slice(); // slice()で配列のコピーを作成
            }
          }
        }
      });

      kintone.app.record.set({ record: record });
    };
    // --- ★ここまで追加 ---


    // スペースフィールドにボタンを追加
    spaceElement.appendChild(selectAllButton);
    spaceElement.appendChild(deselectAllButton);
    spaceElement.appendChild(copyWeek1Button); // ★ 追加したボタンを配置

    return event;
  });

  // --- ★追加: 施設選択UIのカスタマイズ ---
  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], function(event) {
    // ConfigManagerが利用可能かチェック
    if (window.ShinryoApp && window.ShinryoApp.ConfigManager) {
        // 非同期で設定を取得してUI構築
        window.ShinryoApp.ConfigManager.fetchPublishedData().then(() => {
            const common = window.ShinryoApp.ConfigManager.getCommonSettings();
            const facilities = common ? (common.facilities || []) : [];
            
            if (facilities.length > 0) {
                const facilityFieldCode = '施設名';
                const originalFieldEl = kintone.app.record.getFieldElement(facilityFieldCode);
                
                if (originalFieldEl) {
                    // 標準フィールドを視覚的に隠す（setFieldShownだとスペースごと消えることがあるためstyleで制御）
                    originalFieldEl.style.display = 'none';
                    
                    const customContainer = document.createElement('div');
                    customContainer.style.marginBottom = '10px';
                    customContainer.style.padding = '10px';
                    customContainer.style.backgroundColor = '#f9f9f9';
                    customContainer.style.borderRadius = '4px';
                    customContainer.style.border = '1px solid #e0e0e0';

                    const label = document.createElement('div');
                    label.textContent = '診察施設を選択してください:';
                    label.style.fontWeight = 'bold';
                    label.style.marginBottom = '8px';
                    label.style.fontSize = '12px';
                    label.style.color = '#555';
                    customContainer.appendChild(label);

                    const btnGroup = document.createElement('div');
                    btnGroup.style.display = 'flex';
                    btnGroup.style.gap = '10px';
                    btnGroup.style.flexWrap = 'wrap';

                    // デフォルト色パレット（設定がない場合用）
                    const defaultColors = ['#007bff', '#28a745', '#e67e22', '#9b59b6', '#e74c3c'];

                    facilities.forEach((fac, idx) => {
                        const btn = document.createElement('button');
                        const color = fac.color || defaultColors[idx % defaultColors.length];
                        btn.innerHTML = `<span style="font-weight:bold; font-size:1.2em; margin-right:5px;">${fac.shortName || '●'}</span> ${fac.name}`;
                        btn.style.padding = '8px 16px';
                        btn.style.border = `2px solid ${color}`;
                        btn.style.borderRadius = '30px';
                        btn.style.backgroundColor = '#fff';
                        btn.style.color = color;
                        btn.style.cursor = 'pointer';
                        btn.style.fontWeight = 'bold';
                        btn.style.transition = 'all 0.2s';
                        
                        // 現在の選択状態反映
                        const currentVal = event.record[facilityFieldCode].value;
                        if (currentVal === fac.name) {
                            btn.style.backgroundColor = color;
                            btn.style.color = '#fff';
                        }

                        btn.onclick = (e) => {
                            e.preventDefault(); // サブミット防止
                            // 選択状態更新
                            const rec = kintone.app.record.get();
                            rec.record[facilityFieldCode].value = fac.name;
                            // ★追加: デフォルト診療科の自動セット
                            if (fac.defaultDept && rec.record['診療科']) {
                                rec.record['診療科'].value = fac.defaultDept;
                            }
                            kintone.app.record.set(rec);
                            
                            // UI更新
                            Array.from(btnGroup.children).forEach(b => {
                                b.style.backgroundColor = '#fff';
                                b.style.color = b.style.borderColor;
                            });
                            btn.style.backgroundColor = color;
                            btn.style.color = '#fff';
                        };
                        btnGroup.appendChild(btn);
                    });
                    customContainer.appendChild(btnGroup);
                    originalFieldEl.parentNode.insertBefore(customContainer, originalFieldEl);
                }
            }
        });
    }
    return event;
  });
})();