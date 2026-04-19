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
      .custom-tooltip-icon {
        position: relative;
        display: inline-flex;
        align-items: center;
        margin-left: 6px;
        color: #9DA0A4;
        cursor: help;
        vertical-align: middle;
        font-size: 16px;
      }
      /* ツールチップ吹き出し本体 */
      .custom-tooltip-icon::after {
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
        z-index: 10000;
        width: max-content;
        max-width: 250px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        line-height: 1.4;
        font-weight: normal;
        text-align: left;
      }
      /* ツールチップの三角形（下向き矢印） */
      .custom-tooltip-icon::before {
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
        z-index: 10000;
      }
      /* マウスオーバーで表示 */
      .custom-tooltip-icon:hover::after,
      .custom-tooltip-icon:hover::before {
        opacity: 1;
        visibility: visible;
      }
    `;
    document.head.appendChild(style);
  };

  // アイコン生成関数
  const createTooltipIcon = (tooltipText) => {
    const span = document.createElement('span');
    span.className = 'custom-tooltip-icon';
    span.setAttribute('data-tooltip', tooltipText);
    span.innerHTML = '💡';
    return span;
  };

  // ★ ツールチップを表示するターゲット要素と説明文の定義
  // textの部分はお好きな説明文に変更してください。
  const targets = [
    {
      match: (el) => el.id === 'rcb-timeout-select',
      text: '仮予約状態を維持できる期限です',
      position: 'after' // プルダウンの横に配置
    },
    {
      match: (el) => el.id === 'rcb-reset-btn',
      text: '担当者等を初期化してチケット到着時の状態まで戻します（チケット情報は維持されます）。メールを送信した後の場合、そのメールに含まれる予約時日時などのリンク(URL)情報をアクセスすると無効表示になります',
      position: 'inside' // ボタンの内部に配置
    },
    {
      match: (el) => el.classList && el.classList.contains('custom-ticket-text') && el.textContent.includes('チケット情報'),
      text: 'このチケットの詳細情報を表示します。',
      position: 'inside' // テキストの内部（右横）に配置
    },
    {
      match: (el) => el.classList && el.classList.contains('rcb-section-title') && el.textContent.includes('対応方法の選択'),
      text: '依頼者への対応方法を、電話とするか、メールとするかを選択します。',
      position: 'inside' // 見出しのdiv内部に配置
    },
    {
      match: (el) => el.classList && el.classList.contains('rcb-section-title') && el.textContent.includes('確定予約日時の設定'),
      text: '依頼者に提示する仮の予約日と予約時刻を設定します。',
      position: 'inside' // 見出しのdiv内部に配置
    },
    {
      match: (el) => el.tagName === 'BUTTON' && el.textContent.includes('再設定する'),
      text: '対応方法や仮予約日時を再度設定し直します。',
      position: 'inside' // 幅が広いボタンなどを想定してボタン内部に配置
    },
    {
      match: (el) => el.parentNode && el.parentNode.id === 'staff-display-badge' && el.style.fontSize === '24px',
      text: '現在この端末を操作している担当者です。\nクリックすると担当者を設定・変更できます。',
      position: 'inside' // 名前の右横（ボタンの内側）に配置する
    },
    {
      match: (el) => el.classList && el.classList.contains('rcb-btn-save') && el.textContent.includes('メールを送信する'),
      text: '仮予約日時など、設定した内容で依頼者にメールを送信します。',
      position: 'inside' // ボタンの内部に配置
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
        const icon = createTooltipIcon(target.text);

        if (target.position === 'inside') {
            node.appendChild(icon);
            
            // ツールチップ追加による右側のスペース空きすぎを防ぐため、親要素の右パディングを少し削る
            const computedStyle = window.getComputedStyle(node);
            const currentPaddingRight = parseInt(computedStyle.paddingRight, 10);
            if (!isNaN(currentPaddingRight) && currentPaddingRight > 8) {
                node.style.setProperty('padding-right', Math.max(4, currentPaddingRight - 8) + 'px', 'important');
            }

            // 要素が flex でない場合はレイアウトを整える
            const style = window.getComputedStyle(node);
            if (style.display !== 'flex' && style.display !== 'inline-flex') {
                if (style.display === 'inline' || style.display === 'inline-block') {
                    node.style.display = 'inline-flex';
                } else {
                    node.style.display = 'flex';
                }
                node.style.alignItems = 'center';
                if (node.tagName === 'BUTTON') {
                     node.style.justifyContent = 'center';
                }
            }
        } else if (target.position === 'after') {
            node.parentNode.insertBefore(icon, node.nextSibling);
        }

        if (target.onAdd) {
            target.onAdd(node, icon);
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
