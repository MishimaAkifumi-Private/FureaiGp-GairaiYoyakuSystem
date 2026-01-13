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
})();