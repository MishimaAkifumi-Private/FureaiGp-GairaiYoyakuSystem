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
        margin-left: 8px;
        color: #9DA0A4;
        cursor: help;
        vertical-align: middle;
      }
      .custom-tooltip-icon svg {
        width: 24px;
        height: 24px;
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

  // 指定されたSVGアイコン
  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd"></path></svg>`;

  // アイコン生成関数
  const createTooltipIcon = (tooltipText) => {
    const span = document.createElement('span');
    span.className = 'custom-tooltip-icon';
    span.setAttribute('data-tooltip', tooltipText);
    span.innerHTML = svgIcon;
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
      position: 'after' // ボタンの横に配置
    },
    {
      match: (el) => el.classList && el.classList.contains('custom-ticket-text') && el.textContent.includes('チケット情報'),
      text: 'このチケットの詳細情報を表示します。',
      position: 'after' // テキストの横に配置
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
      match: (el) => el.id === 'staff-badge-wrapper',
      text: '現在この端末を操作している担当者です。\nクリックすると担当者を設定・変更できます。',
      position: 'inside' // ラッパーの内側（右端）に配置して中央揃えにする
    },
    {
      match: (el) => el.classList && el.classList.contains('rcb-btn-save') && el.textContent.includes('メールを送信する'),
      text: '仮予約日時など、設定した内容で依頼者にメールを送信します。',
      position: 'after', // ボタンの外に配置
      onAdd: (el, icon) => {
        // ボタンとアイコンを横並びにするためのラッパーを作成
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.width = '100%';

        // ボタンの幅をアイコン分だけ縮める
        el.style.width = 'calc(100% - 40px)';

        // ラッパーを元の位置に挿入し、ボタンとアイコンをその中に移動させる
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
        wrapper.appendChild(icon);
      }
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
            // 要素が flex でない場合はレイアウトを整える
            const style = window.getComputedStyle(node);
            if (style.display !== 'flex' && style.display !== 'inline-flex') {
                node.style.display = 'flex';
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
