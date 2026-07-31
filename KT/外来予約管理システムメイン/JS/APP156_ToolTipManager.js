(function() {
  'use strict';

  // [DEBUG LOG] スクリプト読み込み確認
  console.log('[Tooltip Custom] Script loaded.');

  // 各フィールドの設定（IDと表示テキスト）
  const TOOLTIP_MAP = {
    '8246260': '表示順の説明文をここに記載します。',
    '8246259': '予約受付に関する説明文です。',
    '8246266': '診療分野に関する説明文です。',
    '8245769': '診療科に関する説明文です。',
    '8246275': '診療選択に関する説明文です。',
    '8246138': '診察施設に関する説明文です。',
    '8248202': 'タグに関する説明文です。',
    '8246272': '医師名に関する説明文です。',
    '8245802': '通常は月間診療曜日パターンの設定に従うものの、何らかの都合で臨時に診療を行わない日を設定するある場合に記載します。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。',
    '8248181': '着任日に関する説明文です。',
    '8248182': 'その診療科の担当を終了する日です。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。未記載の場合は現時点では終了の期限が設定されていないという意味になります。',
    '8245804': '医師等から受診に際してメッセージ等予約しようとしている患者に伝えたい場合に記載します（任意です）。'
  };

  // スタイルシートの動的生成
  const injectStyles = () => {
    if (document.getElementById('pure-header-tooltip-style')) return;
    const style = document.createElement('style');
    style.id = 'pure-header-tooltip-style';
    style.textContent = `
      /* 共通ツールチップ本体 */
      #pure-custom-tooltip {
        position: fixed;
        background-color: #334155;
        color: #f8fafc;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: normal;
        line-height: 1.5;
        white-space: normal;
        width: 260px;
        box-sizing: border-box;
        word-break: break-word;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        z-index: 999999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease-in-out, visibility 0.15s ease-in-out;
        pointer-events: none;
        text-align: left;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      /* 通常時：吹き出し下部の三角矢印（上側に表示する場合） */
      #pure-custom-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px;
        border-style: solid;
        border-color: #334155 transparent transparent transparent;
      }

      /* 固定ヘッダー時：吹き出し上部の三角矢印（下側に表示する場合） */
      #pure-custom-tooltip.is-bottom::after {
        top: auto;
        bottom: 100%;
        border-color: transparent transparent #334155 transparent;
      }

      /* 一覧画面：ヘッダーホバー時のカーソル */
      th.has-custom-tooltip {
        cursor: help !important;
      }

      /* 編集・詳細画面：電球アイコン（💡）のスタイル */
      .custom-tooltip-bulb-icon {
        display: inline-block !important;
        margin-left: 4px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        line-height: 1 !important;
        vertical-align: middle !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);
  };

  // 共有のツールチップ要素を用意する
  const getOrCreateTooltipEl = () => {
    let tooltipEl = document.getElementById('pure-custom-tooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'pure-custom-tooltip';
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  };

  // ツールチップ表示位置の計算と表示制御
  const showTooltip = (targetEl, text) => {
    const tooltipEl = getOrCreateTooltipEl();
    tooltipEl.textContent = text;

    const rect = targetEl.getBoundingClientRect();
    const tooltipWidth = 260;
    const left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

    // ヘッダー固定モード（または画面上端付近）の判定
    const isFixedHeader = !!targetEl.closest('.gaia-app-recordlist-fixedheader') || rect.top < 110;

    if (isFixedHeader) {
      // 下側に表示（矢印は上向き）
      tooltipEl.classList.add('is-bottom');
      tooltipEl.style.left = `${Math.max(10, left)}px`;
      tooltipEl.style.top = `${rect.bottom + 8}px`;
      tooltipEl.style.transform = 'translateY(0)';
    } else {
      // 上側に表示（矢印は下向き）
      tooltipEl.classList.remove('is-bottom');
      tooltipEl.style.left = `${Math.max(10, left)}px`;
      tooltipEl.style.top = `${rect.top - 8}px`;
      tooltipEl.style.transform = 'translateY(-100%)';
    }

    tooltipEl.style.opacity = '1';
    tooltipEl.style.visibility = 'visible';
  };

  const hideTooltip = () => {
    const tooltipEl = getOrCreateTooltipEl();
    tooltipEl.style.opacity = '0';
    tooltipEl.style.visibility = 'hidden';
  };

  // 一覧画面の処理（💡なし・タイトルホバー / 固定ヘッダー両対応）
  const attachIndexTooltips = () => {
    Object.keys(TOOLTIP_MAP).forEach(id => {
      const text = TOOLTIP_MAP[id];
      if (!text) return;

      // 通常ヘッダーおよび固定ヘッダー（.gaia-app-recordlist-fixedheader）の両方を取得
      const thEls = document.querySelectorAll(`th.label-${id}`);
      if (!thEls || thEls.length === 0) return;

      thEls.forEach(thEl => {
        if (thEl.classList.contains('has-custom-tooltip')) return;

        thEl.classList.add('has-custom-tooltip');

        thEl.addEventListener('mouseenter', () => showTooltip(thEl, text));
        thEl.addEventListener('mouseleave', hideTooltip);
      });
    });
  };

  // 編集・詳細・追加・再利用画面の処理（タイトル横に💡アイコンを挿入してホバー）
  const attachFormTooltips = () => {
    Object.keys(TOOLTIP_MAP).forEach(id => {
      const text = TOOLTIP_MAP[id];
      if (!text) return;

      const selectors = [
        `.field-${id} .control-label-gaia`,
        `.label-${id}`,
        `.subtable-row-label-${id}`
      ].join(',');

      const labelEls = document.querySelectorAll(selectors);

      labelEls.forEach(labelEl => {
        if (labelEl.querySelector('.custom-tooltip-bulb-icon')) return;

        const bulbSpan = document.createElement('span');
        bulbSpan.className = 'custom-tooltip-bulb-icon';
        bulbSpan.textContent = '💡';
        bulbSpan.title = '';

        bulbSpan.addEventListener('mouseenter', (e) => {
          e.stopPropagation();
          showTooltip(bulbSpan, text);
        });

        bulbSpan.addEventListener('mouseleave', (e) => {
          e.stopPropagation();
          hideTooltip();
        });

        labelEl.appendChild(bulbSpan);

        console.log(`[Tooltip Custom] Inserted 💡 icon for field ID: ${id}`, labelEl);
      });
    });
  };

  // イベントに応じた振り分け処理
  const initTooltip = (event) => {
    console.log(`[Tooltip Custom] Event fired: ${event.type}`);
    injectStyles();

    if (event.type === 'app.record.index.show') {
      attachIndexTooltips();
      setTimeout(attachIndexTooltips, 300);
      setTimeout(attachIndexTooltips, 1000);
    } else {
      attachFormTooltips();
      setTimeout(attachFormTooltips, 300);
      setTimeout(attachFormTooltips, 1000);
    }

    return event;
  };

  // DOM監視（スクロール時の固定ヘッダー生成や編集画面の動的描画に対応）
  const startObserver = () => {
    const targetNode = document.getElementById('record-gaia') || document.body;
    const observer = new MutationObserver(() => {
      const isIndex = !document.getElementById('record-gaia');
      if (isIndex) {
        attachIndexTooltips();
      } else {
        attachFormTooltips();
      }
    });
    observer.observe(targetNode, { childList: true, subtree: true });
  };

  // 対応イベント登録
  const TARGET_EVENTS = [
    'app.record.index.show',
    'app.record.detail.show',
    'app.record.create.show',
    'app.record.edit.show'
  ];

  kintone.events.on(TARGET_EVENTS, (event) => {
    initTooltip(event);
    startObserver();
    return event;
  });

})();