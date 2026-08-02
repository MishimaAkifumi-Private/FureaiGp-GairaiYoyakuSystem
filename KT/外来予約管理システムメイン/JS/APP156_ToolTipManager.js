(function() {
  'use strict';

  // [DEBUG LOG] スクリプト読み込み確認
  console.log('[Tooltip Custom] Script loaded.');

  // 各フィールド・列ヘッダーの説明テキストマッピング（ラベル名およびフィールドID対応）
  const TOOLTIP_TEXT_MAP = {
    // ★ ラベル名（ヘッダー名）ベースのマッピング
    '表示順': 'この一覧上の医師や診療科の表示順です。\n表示順を変更する場合は、移動したい行の「表示順」の中間の数値を設定します。\n【例】現在の表示順が「40」の医師を、「100」の後に移動したい場合\n移動先（100の後）となる「101〜109」のいずれかの数字（例：105）を入力し、保存します。これで指定した位置に一旦移動します。\n保存後に画面上部に「表示順をリセット」ボタンが表示されるので、クリックするとすべての行の表示順を維持したままで10の倍数（10, 20, 30...）になるように再設定されます。',

    '掲載': '患者が閲覧する予約Webフォーム上で当科/当医師の予約受付（掲載）を有効・無効にする制御設定です。\nたとえば、平時は診療スケジュールは「受付」としているが、何らかの理由で予約受付を臨時に停止させる場合などには「停止」に切り替えます。',
    '予約受付': '患者が閲覧する予約Webフォーム上で当科/当医師の予約受付（掲載）を有効・無効にする制御設定です。\nたとえば、平時は診療スケジュールは「受付」としているが、何らかの理由で予約受付を臨時に停止させる場合などには「停止」に切り替えます。',

    '診療分野': '当診療科・医師が扱う専門分野や対象領域です。',
    '診療科': '診療科名です。',

    '診療選択': '対象の診療科で患者に対してさらに選択肢や特定の病室等を案内する場合などに利用します（任意）。',

    '施設名': '実際に診察が行われる施設名（病院・クリニック等）です。通常は１診療科１施設になりますが、例えば湘南東部総合病院と湘南東部クリニックのように同一診療科でも別の施設（建物）にまたがって診療を行う場合には、担当医師の診療スケジュール上ではそれぞれの施設を区別します。',
    '診察施設': '実際に診察が行われる施設名（病院・クリニック等）です。通常は１診療科１施設になりますが、例えば湘南東部総合病院と湘南東部クリニックのように同一診療科でも別の施設（建物）にまたがって診療を行う場合には、担当医師の診療スケジュール上ではそれぞれの施設を区別します。',

    'タグ': '検索や分類・絞り込みに利用するタグ情報です。\n診療スケジュール毎にあらかじめ用意された目印(タグ)を付けられます(任意)。たとえばA医師が３つの診療科を担当しているような場合に、A医師の診療スケジュールのすべてを💛の目印を付与することとすれば💛3と表示されます（💛の横の３の数字は担当する診療科の総数です）。',
    '集合': '検索や分類・絞り込みに利用するタグ情報です。\n診療スケジュール毎にあらかじめ用意された目印(タグ)を付けられます(任意)。たとえばA医師が３つの診療科を担当しているような場合に、A医師の診療スケジュールのすべてを💛の目印を付与することとすれば💛3と表示されます（💛の横の３の数字は担当する診療科の総数です）。',
    '医師名': '担当する医師の氏名です。',
    '臨時NG日': '通常は月間の診療スケジュールの設定に従うものの、何らかの都合で臨時に診療を行わない日を設定する場合に記載します。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。',
    '直近NG日指定': '通常は月間の診療スケジュールの設定に従うものの、何らかの都合で臨時に診療を行わない日を設定する場合に記載します。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。',

    '着任日': 'その診療科の担当を開始する日です。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。未記載の場合はパターンの作成日から担当開始となります。',
    '離任日': 'その診療科の担当を終了する日です。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。未記載の場合は現時点では終了の期限が設定されていないという意味になります。',
    '担当終了日': 'その診療科の担当を終了する日です。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。未記載の場合は現時点では終了の期限が設定されていないという意味になります（無期限）。',

    'メッセージ': '医師等から受診に際してメッセージ等予約しようとしている患者に対して事前に伝えたいことを記載します（任意）。',

    // ★ フィールドIDベースのマッピング
    '8246260': '一覧画面等で医師や診療科の並び順を決定する順序番号です。\n表示順を変更する場合は、移動先の前後にある「表示順」の中間の数値を設定します。\n【例】現在の表示順が「40」の医師を、「100」の後に移動したい場合\n移動先（100の後）に該当する「101〜109」のいずれかの数字（例：105）を入力し、保存します。これで指定した位置に移動します。\n※保存後、画面上部に「表示順をリセット」ボタンが表示されます。このボタンをクリックすると、すべての行の表示順が自動的に10の倍数（10, 20, 30...）に再整列されます。',
    '8246259': '予約Webフォーム等で当科/当医師の予約受付を有効・無効にする制御設定です。\n予定表では通常は予約受付となっているものの、何らかの事情で一時的な理由で予約受付を緊急で停止させる場合などには「停止」にします。',
    '8246266': '当診療科・医師が扱う専門分野や対象領域です。',
    '8245769': '当診療パターンの対象となる診療科名です。',
    '8246275': '対象の診療科で患者に対してさらに選択肢や特定の病室等を案内する場合などに利用します（任意）。',
    '8246138': '実際に診察が行われる施設名（病院・クリニック等）です。通常は１診療科１施設になりますが、例えば湘南東部総合病院と湘南東部クリニックでは同一診療科でも別の施設（建物）にまたがって診療を行う場合等では、担当医師の月間診療曜日パターン上ではそれぞれの施設を区別して管理されます。',
    '8248202': '検索や分類・絞り込みに利用するタグ情報です。\n月間診療曜日パターン毎にあらかじめ用意された目印(タグ)を付けられます(任意)。たとえばA医師が３つの診療科を担当しているような場合に、A医師の月間診療曜日パターンのすべてを💛の目印を付与することとすれば💛3と表示されます（💛の横の３の数字は担当する診療科の総数です）。',
    '8246272': '担当する医師の氏名です。',
    '8245802': '通常は月間の診療スケジュールの設定に従うものの、何らかの都合で臨時に診療を行わない日を設定する場合に記載します。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。',
    '8248181': 'その診療科の担当を開始する日です。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。未記載の場合はパターンの作成日から担当開始となります。',
    '8248182': 'その診療科の担当を終了する日です。予約Webフォーム上で患者が希望日を選択する画面ではこの日付情報をもとに自動的に候補日を表示しています。未記載の場合は現時点では終了の期限が設定されていないという意味になります（無期限）。',
    '8245804': '医師等から受診に際してメッセージ等予約しようとしている患者に伝えたい場合に記載します（任意）。'
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
        padding: 10px 14px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: normal;
        line-height: 1.6;
        white-space: pre-wrap;
        width: 320px;
        max-width: calc(100vw - 30px);
        box-sizing: border-box;
        word-break: break-word;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
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
    const tooltipWidth = 320;
    const left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    const clampedLeft = Math.max(10, Math.min(window.innerWidth - tooltipWidth - 10, left));

    // ヘッダー固定モード（または画面上端付近）の判定
    const isFixedHeader = !!targetEl.closest('.gaia-app-recordlist-fixedheader') || rect.top < 130;

    if (isFixedHeader) {
      // 下側に表示（矢印は上向き）
      tooltipEl.classList.add('is-bottom');
      tooltipEl.style.left = `${clampedLeft}px`;
      tooltipEl.style.top = `${rect.bottom + 8}px`;
      tooltipEl.style.transform = 'translateY(0)';
    } else {
      // 上側に表示（矢印は下向き）
      tooltipEl.classList.remove('is-bottom');
      tooltipEl.style.left = `${clampedLeft}px`;
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

  // 該当するツールチップ説明文を取得するヘルパー
  const getTooltipTextForElement = (el, textContent) => {
    const cleanText = (textContent || '').trim();
    if (!cleanText) return null;

    // 1. ラベル名の完全一致 / 部分一致照合
    for (const key of Object.keys(TOOLTIP_TEXT_MAP)) {
      if (isNaN(Number(key))) { // キーが数値文字列でない（ラベル名）
        if (cleanText === key || cleanText.includes(key)) {
          return TOOLTIP_TEXT_MAP[key];
        }
      }
    }

    // 2. Class名（label-XXXXXXX や field-XXXXXXX）照合
    if (el && el.classList) {
      for (const className of Array.from(el.classList)) {
        const match = className.match(/(?:label|field)-(\d+)/);
        if (match && TOOLTIP_TEXT_MAP[match[1]]) {
          return TOOLTIP_TEXT_MAP[match[1]];
        }
      }
    }

    return null;
  };

  // 一覧画面の処理（ヘッダーセル要素のテキスト・クラス名両対応）
  const attachIndexTooltips = () => {
    const thEls = document.querySelectorAll('th.recordlist-header-cell-gaia, th[class*="label-"], .gaia-app-recordlist-fixedheader th');
    thEls.forEach(thEl => {
      if (thEl.classList.contains('has-custom-tooltip')) return;

      const labelSpan = thEl.querySelector('.recordlist-header-label-gaia') || thEl;
      const text = getTooltipTextForElement(thEl, labelSpan.textContent);
      if (!text) return;

      thEl.classList.add('has-custom-tooltip');
      thEl.addEventListener('mouseenter', () => showTooltip(thEl, text));
      thEl.addEventListener('mouseleave', hideTooltip);
    });
  };

  // 編集・詳細・追加・再利用画面の処理（タイトル横に💡アイコンを挿入してホバー）
  const attachFormTooltips = () => {
    const labelEls = document.querySelectorAll('.control-label-gaia, .subtable-row-label-gaia, [class*="label-"]');
    labelEls.forEach(labelEl => {
      if (labelEl.querySelector('.custom-tooltip-bulb-icon')) return;

      const text = getTooltipTextForElement(labelEl, labelEl.textContent);
      if (!text) return;

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
    });
  };

  // イベントに応じた振り分け処理
  const initTooltip = (event) => {
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