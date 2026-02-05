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
    TIMEOUT_FIELD: 'タイムアウト', // タイムアウトフィールド
    SEND_DATE_FIELD: 'メール送信日時', // 送信日時フィールド
    CANCEL_VALUE: 'キャンセル',     // グレーアウトする値
    FINISH_VALUE: '終了',           // 終了ステータス（グレーアウト）
    EXECUTOR_SELF: '本人',            // 本人キャンセルの値
    CONFIRMED_VALUE: '確認済',      // 確認済の値
    GRAY_COLOR: '#838383',        // 背景色（薄いグレー）
    PINK_COLOR: '#ffe4e1',        // 背景色（ピンク）
    TEXT_COLOR: '#000'            // 文字色
  };

  kintone.events.on('app.record.index.show', function(event) {
    const records = event.records;
    
    if (!records || records.length === 0) return event;

    // 管理ステータスフィールドの要素を取得（一覧に表示されている必要があります）
    const statusElements = kintone.app.getFieldElements(CONFIG.STATUS_FIELD);
    if (!statusElements) return event;

    // 非同期で処理を実行（DOM操作およびデータ補完）
    (async () => {
        // 必要なフィールドが一覧にあるか確認
        const hasExecutor = records[0].hasOwnProperty(CONFIG.EXECUTOR_FIELD);
        const hasStaffConfirm = records[0].hasOwnProperty(CONFIG.STAFF_CONFIRM_FIELD);
        const hasLock = records[0].hasOwnProperty(CONFIG.RESERVE_LOCK_FIELD);
        const hasTimeout = records[0].hasOwnProperty(CONFIG.TIMEOUT_FIELD);
        const hasSendDate = records[0].hasOwnProperty(CONFIG.SEND_DATE_FIELD);
        
        let recordMap = {};

        // フィールドが不足している場合はAPIで取得
        if (!hasExecutor || !hasStaffConfirm || !hasLock || !hasTimeout || !hasSendDate) {
            const ids = records.map(r => r.$id.value);
            try {
                const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                    app: kintone.app.getId(),
                    query: `$id in ("${ids.join('","')}")`,
                    fields: ['$id', CONFIG.EXECUTOR_FIELD, CONFIG.STAFF_CONFIRM_FIELD, CONFIG.RESERVE_LOCK_FIELD, CONFIG.TIMEOUT_FIELD, CONFIG.SEND_DATE_FIELD]
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

            // スタイル適用
            const el = statusElements[index];
            const row = el.closest('tr');

            if (row) {
                // 1. 本人キャンセルの場合（未確認） -> ピンク色
                if (status === CONFIG.CANCEL_VALUE && executor === CONFIG.EXECUTOR_SELF && !isStaffConfirmed) {
                    row.style.backgroundColor = CONFIG.PINK_COLOR;
                    row.style.color = CONFIG.TEXT_COLOR;
                }
                // 2. それ以外のキャンセル（スタッフ実行 OR 本人確認済） または 終了ステータス -> グレーアウト
                else if (status === CONFIG.CANCEL_VALUE || status === CONFIG.FINISH_VALUE) {
                    row.style.backgroundColor = CONFIG.GRAY_COLOR;
                    row.style.color = CONFIG.TEXT_COLOR;
                    
                    const links = row.querySelectorAll('a');
                    links.forEach(link => link.style.color = CONFIG.TEXT_COLOR);
                }
            }

            // 3. 自動更新ロジック (終了判定 & ロック解除)
            let updatePayload = {};
            let needsUpdate = false;

            // (A) 自動終了判定
            if (status !== CONFIG.FINISH_VALUE && resDateStr) {
                const resDate = new Date(resDateStr);
                if (resDate < today) {
                    updatePayload[CONFIG.STATUS_FIELD] = { value: CONFIG.FINISH_VALUE };
                    // 自動終了時はunlock
                    if (lockStatus !== 'unlock') {
                        updatePayload[CONFIG.RESERVE_LOCK_FIELD] = { value: 'unlock' };
                    }
                    needsUpdate = true;
                }
            }

            // (B) ロック解除判定 (unlock条件)
            // 条件: WEB取下, URL取下(キャンセル), 自動終了(上記でカバー), 手動取下(スタッフ取下), 終了
            // ※URL取下は「キャンセル」ステータスと仮定
            const unlockStatuses = ['WEB取下', 'キャンセル', 'スタッフ取下', '終了'];
            
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
                    updatePayload[CONFIG.RESERVE_LOCK_FIELD] = { value: 'unlock' };
                    needsUpdate = true;
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