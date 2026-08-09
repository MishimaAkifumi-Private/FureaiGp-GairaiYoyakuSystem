(function() {
  'use strict';

  // ツールチップ定義情報 (ツールチップ プラグイン-config.json からマッピング)
  const TOOLTIP_CONFIG = {
    '対応方法': '依頼者に対して「メール」で対応するか「電話」で対応するかを表示しています。チケットが到着直後は未設定で、この患者に対応することになる担当者によって決定されます。',
    '担当者': 'チケットを担当するスタッフです。',
    'メール送信日時': '担当者が依頼者にメールを送信した日時です。',
    '確定予約日': '患者が診療科を受診する日付です。',
    '確定予約時刻': '患者が診療科を受診する時刻です。',
    '人物情報': '依頼者の傾向や特徴を記録蓄積し、将来機能として依頼者の特徴に応じた対応方針に役立てます。',
    '人物評価': '依頼者の傾向や特徴を記録蓄積し、将来機能として依頼者の特徴に応じた対応方針に役立てます。',
    '業務連絡': 'スタッフ間でこのチケットに関して情報を共有します。たとえば、途中から担当が変わる場合など、前の担当者からの引継ぎ事項などを記載します。',
    '作成日時': 'チケットが作成された日時になります（依頼された日時）。',
    '経過情報': 'このチケットの管理状況の経過を時系列で表示しています。',
    '管理状況': '上部のツールバーにある【管理状況凡例】の説明を参照してください。',
    '用件': '患者からの依頼の内容として【初診】【変更】【取消】の3通りあります。',
    'タイムアウト': '患者へ送信した仮予約メールの有効期限が切れるまでの時間です。たとえば「2時間」であればメールを送信した時刻から2時間後に期限が切れることになります。',
    'チケット情報': 'このチケットの詳細情報を表示します。'
  };

  // 共通のツールチップ表示用HTML要素を作成
  let tooltipEl = document.getElementById('custom-system-tooltip');
  if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'custom-system-tooltip';
      tooltipEl.style.cssText = 'position: absolute; display: none; background-color: #4b5563; color: #f9fafb; padding: 8px 12px; border-radius: 4px; font-size: 12px; line-height: 1.4; z-index: 99999; max-width: 320px; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.15); box-sizing: border-box;';
      document.body.appendChild(tooltipEl);
  }

  // イベント委譲を使用して、マウスホバー時のみツールチップを表示する
  document.body.addEventListener('mouseover', function(e) {
      const target = e.target;
      if (!target) return;

      // 対象セグメント（カラム、フィールドラベル枠、グループ枠）のチェック
      const headerCell = target.closest('.recordlist-header-cell-gaia');
      const formLabelContainer = target.closest('.control-label-gaia');
      const groupLabel = target.closest('.group-label-gaia');

      let textElement = null;
      let eventTarget = null; // マウス離脱イベントを監視するターゲット要素
      
      if (headerCell) {
          textElement = headerCell.querySelector('.recordlist-header-label-gaia');
          eventTarget = headerCell;
      } else if (formLabelContainer) {
          textElement = formLabelContainer.querySelector('.control-label-text-gaia');
          eventTarget = formLabelContainer;
      } else if (groupLabel) {
          textElement = groupLabel;
          eventTarget = groupLabel;
      }

      if (textElement && eventTarget) {
          // 純粋なフィールド名を取得 (💡などのツールチップ用アイコンがあれば除去)
          const fieldName = textElement.textContent.replace(/[💡✖]/g, '').trim();
          
          if (TOOLTIP_CONFIG[fieldName]) {
              // ツールチップの内容を設定して表示
              tooltipEl.innerHTML = TOOLTIP_CONFIG[fieldName].replace(/\n/g, '<br>');
              tooltipEl.style.display = 'block';
              
              // マウス追従用の座標更新関数
              const moveHandler = function(evt) {
                  // 画面端で見切れないように位置を微調整
                  const xOffset = 15;
                  const yOffset = 15;
                  tooltipEl.style.left = (evt.pageX + xOffset) + 'px';
                  tooltipEl.style.top = (evt.pageY + yOffset) + 'px';
              };
              
              // マウス離脱時の初期化関数
              const leaveHandler = function() {
                  tooltipEl.style.display = 'none';
                  eventTarget.removeEventListener('mousemove', moveHandler);
                  eventTarget.removeEventListener('mouseleave', leaveHandler);
              };

              eventTarget.addEventListener('mousemove', moveHandler);
              eventTarget.addEventListener('mouseleave', leaveHandler);
              
              // 初期位置を設定
              tooltipEl.style.left = (e.pageX + 15) + 'px';
              tooltipEl.style.top = (e.pageY + 15) + 'px';
          }
      }
  });

})();
