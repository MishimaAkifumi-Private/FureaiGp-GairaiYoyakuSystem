/*
 * ListRowStyler.js
 * 一覧画面の行スタイル制御
 * 管理ステータスが「キャンセル」のレコードをグレーアウトします。
 * キャンセル実行者が「本人」の場合はピンク色にします。
 * 【追加機能】予約日が過ぎた（昨日以前の）チケットを自動的に「終了」ステータスに更新します。
 */
(function() {
  'use strict';

  const CONFIG = {
    STATUS_FIELD: '管理状況', // 判定に使うフィールドコード
    EXECUTOR_FIELD: 'キャンセル実行者', // キャンセル実行者フィールド
    RES_DATE_FIELD: '確定予約日',   // 予約日フィールド
    STAFF_CONFIRM_FIELD: 'スタッフ確認', // スタッフ確認フィールド
    RESERVE_LOCK_FIELD: 'ReserveLock', // ロックフィールド
    METHOD_FIELD: '対応方法',
    RES_TIME_FIELD: '確定予約時刻',
    READ_DATE_FIELD: 'メール既読日時',
    PHONE_CONFIRM_FIELD: '電話確認日時',
    TIMEOUT_FIELD: 'タイムアウト', // タイムアウトフィールド
    SEND_DATE_FIELD: 'メール送信日時', // 送信日時フィールド
    CANCEL_VALUE: 'キャンセル',     // グレーアウトする値
    FINISH_VALUE: '終了',           // 終了ステータス（グレーアウト）
    EVALUATION_WAIT_VALUE: '評価待ち', // 評価待ちステータス
    FORCE_FINISH_VALUE: '強制終了', // 強制終了ステータス
    UNTOUCHED_VALUE: '未着手',      // 未着手ステータス
    READ_VALUE: 'メール既読',        // メール既読ステータス
    PHONE_AGREE_VALUE: '電話合意済', // 電話合意済ステータス
    EXECUTOR_SELF: '本人',            // 本人キャンセルの値
    CONFIRMED_VALUE: '確認済',      // 確認済の値
    GRAY_COLOR: '#cccccc',        // 背景色（薄いグレー）
    BLUE_COLOR: '#e3f2fd',        // 背景色（青）
    PINK_COLOR: '#ffe4e1',        // 背景色（ピンク）
    LIGHT_PINK_COLOR: '#fff0f5',  // 背景色（薄いピンク）
    LIGHT_GREEN_COLOR: '#e8f5e9', // 背景色（薄い緑）
    LIGHT_YELLOW_COLOR: '#fff9c4', // 背景色（薄い黄色）
    TEXT_COLOR: '#000'            // 文字色
  };

  // 日時フォーマット関数
  const formatDateTime = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const s = String(date.getSeconds()).padStart(2, '0');
      return `${y}/${m}/${d} ${h}:${min}:${s}`;
  };

  kintone.events.on('app.record.index.show', function(event) {
    const records = event.records;
    
    if (!records || records.length === 0) return event;

    // 管理ステータスフィールドの要素を取得（一覧に表示されている必要があります）
    const statusElements = kintone.app.getFieldElements(CONFIG.STATUS_FIELD);
    const methodElements = kintone.app.getFieldElements(CONFIG.METHOD_FIELD);
    if (!statusElements) return event;

    // --- 1. 同期的なDOM操作（スタイル適用とアイコン化） ---
    // Kintoneの再描画によるDOM参照切れを防ぐため、イベント発火後すぐに実行する
    const applyStylesSync = (record, index, executorVal, staffConfirmVal) => {
        const status = record[CONFIG.STATUS_FIELD]?.value || '';
        const methodVal = (record[CONFIG.METHOD_FIELD]?.value || '').trim().toLowerCase();
        const isStaffConfirmed = Array.isArray(staffConfirmVal) && staffConfirmVal.includes(CONFIG.CONFIRMED_VALUE);
        
        const el = statusElements[index];
        const row = el ? el.closest('tr') : null;
        let isGrayOut = false;

        if (row) {
            // 行の境界をはっきりさせるため、各セルの下部に2pxの白色ボーダーを付与
            Array.from(row.children).forEach(cell => {
                cell.style.borderBottom = '1px solid #ffffff';
            });

            if (status === CONFIG.UNTOUCHED_VALUE) {
                row.style.backgroundColor = CONFIG.LIGHT_PINK_COLOR;
                row.style.color = CONFIG.TEXT_COLOR;
            } else if (status === CONFIG.CANCEL_VALUE && executorVal === CONFIG.EXECUTOR_SELF && !isStaffConfirmed) {
                row.style.backgroundColor = CONFIG.PINK_COLOR;
                row.style.color = CONFIG.TEXT_COLOR;
            } else if (status === CONFIG.EVALUATION_WAIT_VALUE) {
                row.style.backgroundColor = CONFIG.BLUE_COLOR;
                row.style.color = CONFIG.TEXT_COLOR;
            } else if (status === CONFIG.CANCEL_VALUE || status === CONFIG.FINISH_VALUE || status === CONFIG.FORCE_FINISH_VALUE) {
                row.style.backgroundColor = CONFIG.GRAY_COLOR;
                row.style.color = CONFIG.TEXT_COLOR;
                isGrayOut = true;
                
                const links = row.querySelectorAll('a');
                links.forEach(link => link.style.color = CONFIG.TEXT_COLOR);
            } else if (status === CONFIG.READ_VALUE || status === CONFIG.PHONE_AGREE_VALUE) {
                row.style.backgroundColor = CONFIG.LIGHT_GREEN_COLOR;
                row.style.color = CONFIG.TEXT_COLOR;
            } else {
                row.style.backgroundColor = CONFIG.LIGHT_YELLOW_COLOR;
                row.style.color = CONFIG.TEXT_COLOR;
            }
        }

        // 対応方法アイコンの書き換え
        if (methodElements && methodElements[index]) {
            const methodEl = methodElements[index];
            let iconHtml = '';
            if (methodVal === 'phone' || methodVal === '電話対応') {
                const shadowColor = '#000000';
                iconHtml = `<div style="font-size:20px; color:transparent; text-shadow:0 0 0 ${shadowColor}; line-height:1;">📞</div>`;
            } else if (methodVal === 'email' || methodVal === 'mail' || methodVal === 'メール対応') {
                iconHtml = `<div style="font-size:20px; line-height:1;">📩</div>`;
            } else {
                iconHtml = ''; // staffなどその他の場合は非表示
            }
            methodEl.innerHTML = iconHtml;
        }
    };

    // 最初に同期的に実行して画面に即反映させる
    records.forEach((record, index) => {
        const executor = record[CONFIG.EXECUTOR_FIELD]?.value || '';
        const staffConfirm = record[CONFIG.STAFF_CONFIRM_FIELD]?.value || [];
        applyStylesSync(record, index, executor, staffConfirm);
    });

    // 非同期で処理を実行（DOM操作およびデータ補完）
    (async () => {
        // 必要なフィールドが一覧にあるか確認
        const hasExecutor = records[0].hasOwnProperty(CONFIG.EXECUTOR_FIELD);
        const hasStaffConfirm = records[0].hasOwnProperty(CONFIG.STAFF_CONFIRM_FIELD);
        const hasLock = records[0].hasOwnProperty(CONFIG.RESERVE_LOCK_FIELD);
        const hasTimeout = records[0].hasOwnProperty(CONFIG.TIMEOUT_FIELD);
        const hasSendDate = records[0].hasOwnProperty(CONFIG.SEND_DATE_FIELD);
        const hasHistory = records[0].hasOwnProperty('経過情報');
        
        let recordMap = {};

        // フィールドが不足している場合はAPIで取得
        if (!hasExecutor || !hasStaffConfirm || !hasLock || !hasTimeout || !hasSendDate || !hasHistory) {
            const ids = records.map(r => r.$id.value);
            try {
                const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                    app: kintone.app.getId(),
                    query: `$id in ("${ids.join('","')}")`,
                    fields: ['$id', CONFIG.EXECUTOR_FIELD, CONFIG.STAFF_CONFIRM_FIELD, CONFIG.RESERVE_LOCK_FIELD, CONFIG.TIMEOUT_FIELD, CONFIG.SEND_DATE_FIELD, '経過情報', '共通評価', 'キャンセル日時']
                });
                resp.records.forEach(r => {
                    recordMap[r.$id.value] = r;
                });
            } catch(e) {
                console.error('[ListRowStyler] データ補完取得に失敗しました', e);
            }
        }

        // 自動終了更新用のリスト
        const recordsToUpdate = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        records.forEach((record, index) => {
            const recordId = record.$id.value;
            const status = record[CONFIG.STATUS_FIELD].value;
            
            // 値の取得（一覧データ or 補完データ）
            let executor = '';
            if (hasExecutor) {
                executor = (record[CONFIG.EXECUTOR_FIELD] && record[CONFIG.EXECUTOR_FIELD].value) || '';
            } else if (recordMap[recordId]) {
                executor = (recordMap[recordId][CONFIG.EXECUTOR_FIELD] && recordMap[recordId][CONFIG.EXECUTOR_FIELD].value) || '';
            }

            let staffConfirm = [];
            if (hasStaffConfirm) {
                staffConfirm = (record[CONFIG.STAFF_CONFIRM_FIELD] && record[CONFIG.STAFF_CONFIRM_FIELD].value) || [];
            } else if (recordMap[recordId]) {
                staffConfirm = (recordMap[recordId][CONFIG.STAFF_CONFIRM_FIELD] && recordMap[recordId][CONFIG.STAFF_CONFIRM_FIELD].value) || [];
            }

            let lockStatus = '';
            let timeoutVal = '';
            let sendDateVal = '';
            
            const getVal = (key) => (record[key] && record[key].value) || (recordMap[recordId] && recordMap[recordId][key] && recordMap[recordId][key].value) || '';
            
            lockStatus = getVal(CONFIG.RESERVE_LOCK_FIELD);
            timeoutVal = getVal(CONFIG.TIMEOUT_FIELD);
            sendDateVal = getVal(CONFIG.SEND_DATE_FIELD);

            const isStaffConfirmed = Array.isArray(staffConfirm) && staffConfirm.includes(CONFIG.CONFIRMED_VALUE);
            const resDateStr = (record[CONFIG.RES_DATE_FIELD] && record[CONFIG.RES_DATE_FIELD].value) ? record[CONFIG.RES_DATE_FIELD].value : null;

            // データ補完が必要だった場合のみ、スタイルを再適用（DOMが残っていれば）
            if (!hasExecutor || !hasStaffConfirm) {
                try { applyStylesSync(record, index, executor, staffConfirm); } catch(e){}
            }

            // 3. 自動更新ロジック (終了判定 & ロック解除)
            let updatePayload = {};
            let needsUpdate = false;

            // (A) 自動終了判定
            if (status !== CONFIG.FINISH_VALUE && status !== CONFIG.EVALUATION_WAIT_VALUE && resDateStr) {
                const resDate = new Date(resDateStr);
                if (resDate < today) {
                    updatePayload[CONFIG.STATUS_FIELD] = { value: CONFIG.EVALUATION_WAIT_VALUE };
                    
                    // 経過情報に「診療日時通過」と「評価待ち」の記録を追加
                    let currentHistories = getVal('経過情報');
                    if (!Array.isArray(currentHistories)) currentHistories = [];
                    const nowStr = formatDateTime(new Date());
                    
                    currentHistories.push({
                        value: { "経過情報_日時": { value: nowStr }, "経過情報_担当者": { value: 'システム' }, "経過情報_管理状態": { value: '診療日時通過' } }
                    });
                    currentHistories.push({
                        value: { "経過情報_日時": { value: nowStr }, "経過情報_担当者": { value: 'システム' }, "経過情報_管理状態": { value: CONFIG.EVALUATION_WAIT_VALUE } }
                    });
                    
                    updatePayload['経過情報'] = { value: currentHistories };
                    needsUpdate = true;
                }
            }

            // (B) ロック解除判定 (unlock条件)
            // 条件: WEB取下, URL取下(キャンセル), 自動終了(上記でカバー), 手動取下(スタッフ取下), 終了, 強制終了
            // ※URL取下は「キャンセル」ステータスと仮定
            const unlockStatuses = ['WEB取下', 'キャンセル', 'スタッフ取下', '終了', '強制終了'];
            
            if (unlockStatuses.includes(status) && lockStatus !== 'unlock') {
                updatePayload[CONFIG.RESERVE_LOCK_FIELD] = { value: 'unlock' };
                needsUpdate = true;
            }

            // (C) 閲覧期限切れ & 翌日判定
            if (status === '閲覧期限切れ' && lockStatus !== 'unlock' && sendDateVal) {
                const sentTime = new Date(sendDateVal);
                let expireDate = new Date(sentTime);

                // タイムアウト計算
                if (timeoutVal === '今日中') {
                    expireDate.setHours(23, 59, 59, 999);
                } else if (timeoutVal === '明日中') {
                    expireDate.setDate(expireDate.getDate() + 1);
                    expireDate.setHours(23, 59, 59, 999);
                } else {
                    // 時間指定 (例: 2時間)
                    // 期限切れ日の「翌日」になったらunlock
                    // 2時間後の日付を取得
                    const match = (timeoutVal || '2時間').match(/(\d+)/);
                    const num = match ? parseInt(match[1], 10) : 2;
                    if ((timeoutVal || '').includes('分')) expireDate.setMinutes(expireDate.getMinutes() + num);
                    else expireDate.setHours(expireDate.getHours() + num);
                }

                // 期限切れ日の翌日0時
                const nextDayOfExpire = new Date(expireDate);
                nextDayOfExpire.setDate(nextDayOfExpire.getDate() + 1);
                nextDayOfExpire.setHours(0, 0, 0, 0);

                if (new Date() >= nextDayOfExpire) {
                    // タイムアウト翌日になったら、電話対応に切り替える
                    updatePayload[CONFIG.STATUS_FIELD] = { value: '要電話対応' };
                    updatePayload[CONFIG.METHOD_FIELD] = { value: 'phone' };
                    updatePayload[CONFIG.SEND_DATE_FIELD] = { value: null };
                    updatePayload[CONFIG.READ_DATE_FIELD] = { value: null };
                    updatePayload[CONFIG.TIMEOUT_FIELD] = { value: null };
                    updatePayload[CONFIG.PHONE_CONFIRM_FIELD] = { value: null };
                    
                    // 経過情報に追加
                    let currentHistories = getVal('経過情報');
                    if (updatePayload['経過情報']) currentHistories = updatePayload['経過情報'].value;
                    else if (!Array.isArray(currentHistories)) currentHistories = [];
                    const nowStr = formatDateTime(new Date());
                    
                    currentHistories.push({
                        value: { "経過情報_日時": { value: nowStr }, "経過情報_担当者": { value: 'システム' }, "経過情報_管理状態": { value: '要電話対応' } }
                    });
                    
                    updatePayload['経過情報'] = { value: currentHistories };
                    needsUpdate = true;
                }
            }

            // (D) 直前キャンセル判定 (WEB取下 or URL取下時)
            if (status === 'WEB取下' || status === 'キャンセル') {
                const currentCommonEvalStr = getVal('共通評価');
                let currentCommonEval = Array.isArray(currentCommonEvalStr) ? currentCommonEvalStr : [];
                
                if (resDateStr && !currentCommonEval.includes('直前に受診キャンセル')) {
                    const parts = resDateStr.split('-');
                    const resDate = parts.length === 3 
                        ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
                        : new Date(resDateStr);
                    resDate.setHours(0, 0, 0, 0); // 予約日の0時
                    
                    // キャンセル日時の取得 (キャンセルフィールドがあればそれ、なければ現在時刻)
                    let cancelDate = new Date();
                    const cancelDateVal = record['キャンセル日時']?.value || getVal('キャンセル日時');
                    if (cancelDateVal) {
                        cancelDate = new Date(cancelDateVal);
                    }
                    cancelDate.setHours(0, 0, 0, 0); // キャンセル日の0時

                    // 差分(ミリ秒)を日数に変換
                    const diffTime = resDate.getTime() - cancelDate.getTime();
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);

                    // 前日(diffDays === 1) または 当日以降(diffDays <= 0)
                    if (diffDays <= 1) {
                        currentCommonEval.push('直前に受診キャンセル');
                        updatePayload['共通評価'] = { value: currentCommonEval };
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                recordsToUpdate.push({ id: recordId, record: updatePayload });
            }
        });

        // 更新対象があれば一括更新を実行
        if (recordsToUpdate.length > 0) {
            kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', {
                app: kintone.app.getId(),
                records: recordsToUpdate
            }).then(() => {
                console.log(`[Auto Update] ${recordsToUpdate.length}件のレコードを更新しました。`);
                location.reload();
            }).catch(err => {
                console.error('[Auto Update] 自動更新処理に失敗しました:', err);
            });
        }
    })();

    return event;
  });
})();