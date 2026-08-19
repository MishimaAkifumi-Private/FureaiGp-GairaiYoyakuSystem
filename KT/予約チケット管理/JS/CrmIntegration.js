/**
 * CrmIntegration.js
 * チケット管理アプリ(App 142)からCRMアプリ(App 309)へのアーカイブ連携と削除処理
 */
(function() {
    'use strict';

    if (window.CrmIntegration) return;

    /**
     * チケット完了時にCRMへ転送し、元レコードを削除する
     * @param {Object} app142Record - App 142のレコード全体
     */
    async function transferToCrmAndDelete(app142Record) {
        try {
            // 1. 環境設定の取得
            const crmSettings = window.ShinryoApp?.ConfigManager?.getCrmSettings 
                ? window.ShinryoApp.ConfigManager.getCrmSettings() 
                : { crmAppId: 309, crmHistoryCount: 30 };
            
            const CRM_APP_ID = crmSettings.crmAppId;
            const MAX_ROWS = crmSettings.crmHistoryCount;

            // 2. マッピング用データの抽出・整形
            const ticketId = app142Record['$id'].value;
            const chartNo = app142Record['カルテNo'] ? app142Record['カルテNo'].value : '';

            // 患者ID生成 (カルテNoがある場合は 施設ID_カルテNo、ない場合は 施設ID_TEMP_チケットID)
            const facilityId = kintone.app.getId();
            const patientId = chartNo ? `${facilityId}_${chartNo}` : `${facilityId}_TEMP_${ticketId}`;

            // 日付・日時のフォーマットヘルパー (Kintone DATE / DATETIME 型準拠)
            const formatToDateOnly = (val) => {
                if (!val || typeof val !== 'string') return null;
                val = val.trim();
                if (!val) return null;
                const isoMatch = val.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
                if (isoMatch) {
                    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
                }
                const jpMatch = val.match(/(\d{4})年.*?(\d{1,2})月\s*(\d{1,2})日/);
                if (jpMatch) {
                    return `${jpMatch[1]}-${jpMatch[2].padStart(2, '0')}-${jpMatch[3].padStart(2, '0')}`;
                }
                const dObj = new Date(val);
                return !isNaN(dObj.getTime()) ? dObj.toISOString().split('T')[0] : null;
            };

            const formatToUtcDateTime = (dateStr, timeStr) => {
                const d = formatToDateOnly(dateStr);
                if (!d) return null;
                let hh = '00';
                let mm = '00';
                if (timeStr) {
                    const parts = timeStr.includes(':') ? timeStr.split(':') : [timeStr.slice(0, 2), timeStr.slice(2)];
                    hh = String(parts[0] || '0').padStart(2, '0');
                    mm = String(parts[1] || '00').padStart(2, '0');
                }
                const dObj = new Date(`${d}T${hh}:${mm}:00+09:00`);
                return !isNaN(dObj.getTime()) ? dObj.toISOString() : null;
            };

            // 基本情報
            const lastName = app142Record['姓漢字'] ? app142Record['姓漢字'].value : '';
            const firstName = app142Record['名漢字'] ? app142Record['名漢字'].value : '';
            const lastKana = app142Record['姓かな'] ? app142Record['姓かな'].value : '';
            const firstKana = app142Record['名かな'] ? app142Record['名かな'].value : '';
            const dob = formatToDateOnly(app142Record['生年月日'] ? app142Record['生年月日'].value : '');
            const gender = app142Record['性別'] ? app142Record['性別'].value : '';

            // 連絡先情報
            const zip = (app142Record['郵便番号'] ? app142Record['郵便番号'].value : '') || (app142Record['postal_code'] ? app142Record['postal_code'].value : '');
            const addr1 = app142Record['住所'] ? app142Record['住所'].value : '';
            const addr2 = app142Record['丁目番地等'] ? app142Record['丁目番地等'].value : '';
            const addr3 = app142Record['建物'] ? app142Record['建物'].value : '';
            const fullAddress = `${addr1} ${addr2} ${addr3}`.trim();
            const phone1 = (app142Record['電話1'] ? app142Record['電話1'].value : '') || (app142Record['電話番号'] ? app142Record['電話番号'].value : '');
            const phone2 = app142Record['電話2'] ? app142Record['電話2'].value : '';
            const email1 = app142Record['メールアドレス'] ? app142Record['メールアドレス'].value : '';
            const applicant = app142Record['申込者'] ? app142Record['申込者'].value : '';
            const applicantNote = (app142Record['申込者補足'] ? app142Record['申込者補足'].value : '') || (app142Record['補足'] ? app142Record['補足'].value : '');
            const fullApplicant = `${applicant}${applicantNote ? `（${applicantNote}）` : ''}`.trim();

            // 申込記録
            const applyDate = formatToDateOnly((app142Record['申込日'] ? app142Record['申込日'].value : '') || (app142Record['作成日時'] ? app142Record['作成日時'].value.split('T')[0] : ''));
            const dept = app142Record['診療科'] ? app142Record['診療科'].value : '';
            const purpose = app142Record['用件'] ? app142Record['用件'].value : '';
            const method = app142Record['対応方法'] ? app142Record['対応方法'].value : '';
            
            // 受診日時 (確定予約日 + 確定予約時刻)
            const resDate = app142Record['確定予約日'] ? app142Record['確定予約日'].value : '';
            const resTime = app142Record['確定予約時刻'] ? app142Record['確定予約時刻'].value : '';
            const visitDateTime = formatToUtcDateTime(resDate, resTime);

            // 人物評価 (JSON文字列化)
            const commonEval = app142Record['共通評価'] && app142Record['共通評価'].value ? app142Record['共通評価'].value : [];
            const memo = app142Record['人物メモ'] ? app142Record['人物メモ'].value : '';
            const evalJsonStr = JSON.stringify({ common: commonEval, memo: memo });

            // 経過情報 (JSON文字列化)
            const historyTable = app142Record['経過情報'] ? app142Record['経過情報'].value : [];
            const progressArr = historyTable.map(row => {
                return {
                    datetime: row.value['経過情報_日時'] ? row.value['経過情報_日時'].value : '',
                    staff: row.value['経過情報_担当者'] ? row.value['経過情報_担当者'].value : '',
                    status: row.value['経過情報_管理状態'] ? row.value['経過情報_管理状態'].value : '',
                    reason: row.value['経過情報_理由'] ? row.value['経過情報_理由'].value : ''
                };
            });
            const progressJsonStr = JSON.stringify(progressArr);

            // 3. CRMアプリの既存レコード確認
            const getResp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                app: CRM_APP_ID,
                query: `患者ID = "${patientId}"`,
                fields: ['$id', '連絡先記録', '申込記録']
            });

            const newContactRow = {
                value: {
                    '連絡先番号': { value: "1" },
                    '郵便番号': { value: zip },
                    '住所': { value: fullAddress },
                    '電話番号1': { value: phone1 },
                    '電話番号2': { value: phone2 },
                    'メール1': { value: email1 }
                }
            };

            const newApplyRow = {
                value: {
                    '申込番号': { value: "1" },
                    '申込日': { value: applyDate },
                    '用件': { value: purpose },
                    '診療科': { value: dept },
                    '対応方法': { value: method },
                    '受診日時': { value: visitDateTime },
                    '申込者': { value: fullApplicant },
                    '人物評価': { value: evalJsonStr },
                    '経過情報': { value: progressJsonStr }
                }
            };

            if (getResp.records.length > 0) {
                // 既存患者 -> UPDATE
                const crmRecordId = getResp.records[0].$id.value;
                let contactTable = getResp.records[0]['連絡先記録'].value || [];
                let applyTable = getResp.records[0]['申込記録'].value || [];

                // 新しい行を先頭に追加 (unshift)
                contactTable.unshift(newContactRow);
                applyTable.unshift(newApplyRow);

                // 連番振り直し & 行数制限
                contactTable = contactTable.slice(0, MAX_ROWS).map((row, idx) => {
                    row.value['連絡先番号'] = { value: String(idx + 1) };
                    delete row.id; // API更新時にIDは不要/エラーの原因になる
                    return row;
                });

                applyTable = applyTable.slice(0, MAX_ROWS).map((row, idx) => {
                    row.value['申込番号'] = { value: String(idx + 1) };
                    delete row.id;
                    return row;
                });

                const putPayload = {
                    app: CRM_APP_ID,
                    id: crmRecordId,
                    record: {
                        '氏名': { value: `${lastName} ${firstName}`.trim() },
                        'かな': { value: `${lastKana} ${firstKana}`.trim() },
                        '生年月日': { value: dob },
                        '性別': { value: gender },
                        '連絡先記録': { value: contactTable },
                        '申込記録': { value: applyTable }
                    }
                };
                await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', putPayload);
            } else {
                // 新規患者 -> POST
                newContactRow.value['連絡先番号'] = { value: "1" };
                newApplyRow.value['申込番号'] = { value: "1" };

                const postPayload = {
                    app: CRM_APP_ID,
                    record: {
                        '患者ID': { value: patientId },
                        '氏名': { value: `${lastName} ${firstName}`.trim() },
                        'かな': { value: `${lastKana} ${firstKana}`.trim() },
                        '生年月日': { value: dob },
                        '性別': { value: gender },
                        '連絡先記録': { value: [newContactRow] },
                        '申込記録': { value: [newApplyRow] }
                    }
                };
                await kintone.api(kintone.api.url('/k/v1/record', true), 'POST', postPayload);
            }

            // 4. 元のチケットを削除する
            await kintone.api(kintone.api.url('/k/v1/records', true), 'DELETE', {
                app: kintone.app.getId(),
                ids: [ticketId]
            });

            return true;
        } catch (e) {
            console.error('[CrmIntegration] Failed to transfer or delete:', e);
            // エラーを投げて上位で処理させる
            throw e;
        }
    }

    window.CrmIntegration = {
        transferToCrmAndDelete: transferToCrmAndDelete
    };

})();
