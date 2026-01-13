(function() {
    'use strict';

    const LOG_APP_ID = 65; // ログアプリのID
    const PHONE_BOOK_APP_ID = 60; // 電話帳アプリのID
    const CHECK_INTERVAL = 30000; // チェック間隔（ミリ秒）
    const PHONE_BOOK_API_TOKEN = 'C6eApHpXFkGkUHhkQcHgqBMt0kyc7XzGsJCyJBb8';

    let lastCheckedId = 0;

    function checkLogAppUpdates() {
        const query = `$id > ${lastCheckedId} order by $id asc limit 500`;

        kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
            app: LOG_APP_ID,
            query: query
        }).then(function(resp) {
            if (resp.records.length > 0) {
                lastCheckedId = resp.records[resp.records.length - 1].$id.value;
                updatePhoneBookRecords(resp.records);
            }
        }).catch(function(error) {
            console.error('ログアプリのチェックに失敗しました:', error);
        });
    }

    function updatePhoneBookRecords(logRecords) {
        const updateRecords = logRecords.map(function(logRecord) {
            return {
                id: logRecord.address_id.value,
                record: {
                    mail_open_check: {
                        value: ['既読']
                    }
                }
            };
        });

        kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', {
            app: PHONE_BOOK_APP_ID,
            records: updateRecords
        }).then(function(resp) {
            console.log('電話帳アプリの更新が完了しました');
        }).catch(function(error) {
            console.error('電話帳アプリの更新に失敗しました:', error);
        });
    }

    // 電話帳アプリの一覧画面と詳細画面で定期更新を開始
    kintone.events.on(['app.record.index.show', 'app.record.detail.show'], function(event) {
        setInterval(checkLogAppUpdates, CHECK_INTERVAL);
        return event;
    });

    // 電話帳アプリの編集画面でチェックボックスを初期化
    kintone.events.on('app.record.edit.show', function(event) {
        const checkboxFieldCode = 'sendmail_checkbox';
        event.record[checkboxFieldCode].value = [];
        return event;
    });

    // 電話帳アプリのレコード編集保存後、1秒後にチェックボックスを初期化
    kintone.events.on('app.record.edit.submit.success', function(event) {
        setTimeout(function() {
            const checkboxFieldCode = 'sendmail_checkbox';
            const body = {
                app: PHONE_BOOK_APP_ID,
                id: event.recordId,
                record: {
                    [checkboxFieldCode]: {
                        value: []
                    }
                }
            };

            kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body).then(function(resp) {
                console.log('チェックボックスの初期化が完了しました');
            }).catch(function(error) {
                console.error('チェックボックスの初期化に失敗しました:', error);
            });
        }, 1000); // 1秒後に実行

        return event;
    });
})();