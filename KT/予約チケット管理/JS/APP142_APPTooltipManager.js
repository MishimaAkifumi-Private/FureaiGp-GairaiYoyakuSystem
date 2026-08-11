/*
 * TooltipManager.js
 * 指定された要素の横にツールチップ付きのアイコンを動的に追加します。
 */
(function() {
  'use strict';

  // ツールチップのCSSを追加
  const addStyles = () => {
    if (document.getElementById('custom-tooltip-style')) return;
    const style = document.createElement('style');
    style.id = 'custom-tooltip-style';
    style.textContent = `
      .custom-tooltip-target {
        position: relative !important;
      }
      span.custom-tooltip-target, div.custom-tooltip-target {
        cursor: help;
      }
      /* ツールチップ吹き出し本体 */
      .custom-tooltip-target::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 8px;
        background-color: rgba(51, 51, 51, 0.95);
        color: #fff;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        white-space: pre-wrap;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        z-index: 20000;
        width: max-content;
        max-width: 250px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        line-height: 1.4;
        font-weight: normal;
        text-align: left;
      }
      /* ツールチップの三角形（下向き矢印） */
      .custom-tooltip-target::before {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 0px;
        border-width: 8px 8px 0;
        border-style: solid;
        border-color: rgba(51, 51, 51, 0.95) transparent transparent transparent;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        z-index: 20000;
      }
      /* マウスオーバーで表示 */
      .custom-tooltip-target:hover::after,
      .custom-tooltip-target:hover::before {
        opacity: 1;
        visibility: visible;
      }
      /* 下側に表示するツールチップ */
      .custom-tooltip-target.custom-tooltip-bottom::after {
        bottom: auto;
        top: 100%;
        margin-bottom: 0;
        margin-top: 8px;
      }
      .custom-tooltip-target.custom-tooltip-bottom::before {
        bottom: auto;
        top: 100%;
        margin-bottom: 0;
        margin-top: 0px;
        border-width: 0 8px 8px;
        border-color: transparent transparent rgba(51, 51, 51, 0.95) transparent;
      }
    `;
    document.head.appendChild(style);
  };

  // ★ ツールチップを表示するターゲット要素と説明文の定義
  const targets = [
    {
      match: (el) => el.classList && el.classList.contains('rcb-timeout-label'),
      text: '仮予約状態を維持できる期限です'
    },
    {
      match: (el) => el.id === 'rcb-reset-btn',
      position: 'bottom',
      text: '患者から予約依頼のチケットが到着した直後の状態に戻します。\n担当者は「未設定」に、管理状態は「未着手」になります。\n予約日時などのデータや経過情報なども消去されます。\nただし、患者に送信済みのメールは取り戻せませんので\nこの操作による影響を十分考慮の上で行ってください。'
    },
    {
      match: (el) => el.classList && (el.classList.contains('custom-ticket-text') || el.classList.contains('group-label-gaia')) && el.textContent.includes('チケット情報'),
      text: 'このチケットの詳細情報を表示します。'
    },
    {
      match: (el) => el.classList && el.classList.contains('rcb-section-title') && el.textContent.includes('対応方法の選択'),
      text: '依頼者への対応方法を、電話とするか、メールとするかを選択します。'
    },
    {
      match: (el) => el.classList && el.classList.contains('rcb-section-title') && el.textContent.includes('確定予約日時の設定'),
      text: '依頼者に提示する仮の予約日と予約時刻を設定します。'
    },
    {
      match: (el) => el.tagName === 'BUTTON' && el.textContent.includes('再設定する'),
      text: '対応方法や仮予約日時を再度設定し直します。'
    },
    {
      match: (el) => el.parentNode && el.parentNode.id === 'staff-display-badge' && el.style.fontSize === '24px',
      text: '現在この端末を操作している担当者です。\nクリックすると担当者を設定・変更できます。'
    },
    {
      match: (el) => el.classList && el.classList.contains('rcb-btn-save') && el.textContent.includes('メールを送信する'),
      text: '仮予約日時など、設定した内容で依頼者にメールを送信します。'
    }
  ];

  // DOMに要素が追加された時の処理
  const processNode = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    // すでにアイコンを追加済みの要素はスキップ
    if (node.hasAttribute('data-tooltip-added')) return;

    for (const target of targets) {
      if (target.match(node)) {
        node.setAttribute('data-tooltip-added', 'true');
        node.setAttribute('data-tooltip', target.text);
        node.classList.add('custom-tooltip-target');
        if (target.position === 'bottom') {
          node.classList.add('custom-tooltip-bottom');
        }
      }
    }

    // 子要素も再帰的にチェック
    if (node.children) {
      Array.from(node.children).forEach(processNode);
    }
  };

  const init = () => {
    addStyles();
    
    // 既に画面に存在する要素をチェック
    processNode(document.body);

    // 以降、画面に動的に追加される要素を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            processNode(node);
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  // Kintoneのレコード画面が開いた時に実行
  kintone.events.on(['app.record.index.show', 'app.record.detail.show', 'app.record.edit.show', 'app.record.create.show'], function(event) {
      init();
      return event;
  });

})();