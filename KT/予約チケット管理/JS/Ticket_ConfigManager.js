/**
 * ConfigManager.js
 * 共通設定および公開データの管理マネージャー
 * 
 * [機能]
 * - Kintoneアプリ(ID:200等)の「PublishedConfig」フィールドにJSONデータを保存・読込します。
 * - スタッフリストや施設設定をアプリ間で共有するために使用します。
 */
(function() {
    'use strict';
    
    // 名前空間の初期化
    window.ShinryoApp = window.ShinryoApp || {};

    // 設定
    const FIELD_CODE = '設定情報'; // Kintone側のフィールドコード
    const DEFAULT_APP_ID = 200; // デフォルトの保存先アプリID (診療シフト管理アプリ)

    // CRM設定 (App 309連携)
    const CRM_APP_ID = 309;
    const DEFAULT_CRM_HISTORY_COUNT = 30;

    // 保存先アプリIDを取得 (常にデフォルトアプリIDを使用)
    const getTargetAppId = () => {
        return DEFAULT_APP_ID;
    };

    // 内部キャッシュ
    let cachedData = null;

    const ConfigManager = {
        /**
         * 設定データを取得する
         */
        fetchPublishedData: async function() {
            const STORAGE_APP_ID = 200;
            const STORAGE_API_TOKEN = 'qGQAy2d3TcicQ8t73Oknv5BZU7gGO9aBvhAD9aY8';
            const myMainAppId = '156';

            const query = `AppID = "${myMainAppId}" limit 1`;
            const apiPath = kintone.api.url('/k/v1/records', true);
            const baseUrl = /^https?:\/\//.test(apiPath) ? apiPath : window.location.origin + apiPath;
            const url = baseUrl + `?app=${STORAGE_APP_ID}&query=${encodeURIComponent(query)}&_t=${new Date().getTime()}`;
            const headers = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN };

            try {
                const [body, status] = await kintone.proxy(url, 'GET', headers, {});
                if (status === 200) {
                    const resp = JSON.parse(body);
                    if (resp.records && resp.records.length > 0) {
                        const record = resp.records[0];
                        const jsonStr = record['設定情報']?.value || record['設定情報2']?.value;
                        cachedData = jsonStr ? JSON.parse(jsonStr) : {};
                        cachedData._recordId = record.$id.value;
                        return cachedData;
                    }
                }
            } catch (proxyErr) {
                console.warn('[ConfigManager] Proxy fetch failed, falling back to kintone.api:', proxyErr);
            }

            try {
                // Fallback to kintone.api
                const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                    app: STORAGE_APP_ID,
                    query: `AppID = "${myMainAppId}" limit 1`,
                    fields: ['$id', '設定情報', '設定情報2']
                });
                if (resp.records.length > 0) {
                    const record = resp.records[0];
                    const jsonStr = record['設定情報']?.value || record['設定情報2']?.value;
                    cachedData = jsonStr ? JSON.parse(jsonStr) : {};
                    cachedData._recordId = record.$id.value;
                    return cachedData;
                }
            } catch (e) {
                console.error('[ConfigManager] Fetch failed:', e);
            }
            cachedData = cachedData || {};
            return cachedData;
        },

        /**
         * 共通設定（スタッフリスト等）を更新する
         * @param {Array} newStaffs スタッフオブジェクトの配列
         */
        updateCommonStaffs: async function(newStaffs) {
            const data = await this.fetchPublishedData();
            
            // データ構造の初期化
            data.commonSettings = data.commonSettings || {};
            data.commonSettings.staffs = newStaffs;

            await this._saveToKintone(data);
        },

        /**
         * 共通設定（予約センター情報）を更新する
         * @param {string} centerName センター名
         * @param {string} phoneNumber 電話番号
         */
        updateCommonCenterInfo: async function(centerName, phoneNumber) {
            const data = await this.fetchPublishedData();
            data.commonSettings = data.commonSettings || {};
            data.commonSettings.centerName = centerName;
            data.commonSettings.phoneNumber = phoneNumber;
            await this._saveToKintone(data);
        },

        /**
         * 共通設定（施設リスト等）を更新する
         * @param {Array} newFacilities 施設オブジェクトの配列
         */
        updateCommonFacilities: async function(newFacilities) {
            const data = await this.fetchPublishedData();
            
            data.commonSettings = data.commonSettings || {};
            data.commonSettings.facilities = newFacilities;

            await this._saveToKintone(data);
        },

        /**
         * 共通設定（カレンダー設定）を更新する
         */
        updateCommonCalendarSettings: async function(holidays, exceptions, closeSaturdays, start, duration) {
            const data = await this.fetchPublishedData();
            
            data.commonSettings = data.commonSettings || {};
            data.commonSettings.holidays = holidays;
            data.commonSettings.exceptionalDays = exceptions;
            data.commonSettings.closeSaturdays = closeSaturdays;
            data.commonSettings.start = start;
            data.commonSettings.duration = duration;

            await this._saveToKintone(data);
        },

        /**
         * アプリのドロップダウン選択肢を更新する (管理者権限が必要)
         * @param {string} fieldCode 更新対象のフィールドコード
         * @param {Array<string>} options 新しい選択肢のリスト
         */
        syncAppDropdown: async function(fieldCode, options) {
            const appId = kintone.app.getId(); // 現在のアプリ
            const uniqueOptions = Array.from(new Set(options)).filter(o => o);
            
            // 選択肢オブジェクトの形式に変換
            const newOptions = {};
            uniqueOptions.forEach((opt, index) => {
                newOptions[opt] = {
                    label: opt,
                    index: index
                };
            });

            try {
                await kintone.api(kintone.api.url('/k/v1/preview/app/form/fields', true), 'PUT', {
                    app: appId,
                    properties: {
                        [fieldCode]: {
                            options: newOptions
                        }
                    }
                });
                // アプリの更新反映
                await kintone.api(kintone.api.url('/k/v1/preview/app/deploy', true), 'POST', {
                    apps: [{ app: appId }]
                });
            } catch (e) {
                console.error('[ConfigManager] Dropdown sync failed:', e);
                throw new Error('ドロップダウンの更新に失敗しました。権限を確認してください。');
            }
        },

        /**
         * 内部メソッド: KintoneにJSONを保存
         */
        _saveToKintone: async function(data) {
            const STORAGE_APP_ID = 200;
            const STORAGE_API_TOKEN = 'qGQAy2d3TcicQ8t73Oknv5BZU7gGO9aBvhAD9aY8';
            const jsonStr = JSON.stringify(data);
            
            try {
                if (data._recordId) {
                    const updateUrl = kintone.api.url('/k/v1/record', true);
                    const apiUrl = /^https?:\/\//.test(updateUrl) ? updateUrl : window.location.origin + updateUrl;
                    const updateBody = {
                        app: STORAGE_APP_ID,
                        id: data._recordId,
                        record: {
                            '設定情報': { value: jsonStr },
                            '設定情報2': { value: jsonStr }
                        }
                    };
                    const updateHeaders = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN, 'Content-Type': 'application/json' };
                    const [putBody, putStatus] = await kintone.proxy(apiUrl, 'PUT', updateHeaders, JSON.stringify(updateBody));
                    if (putStatus !== 200) {
                        await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
                            app: STORAGE_APP_ID,
                            id: data._recordId,
                            record: {
                                [FIELD_CODE]: { value: jsonStr }
                            }
                        });
                    }
                } else {
                    await kintone.api(kintone.api.url('/k/v1/record', true), 'POST', {
                        app: STORAGE_APP_ID,
                        record: {
                            [FIELD_CODE]: { value: jsonStr }
                        }
                    });
                }
                cachedData = data; // キャッシュ更新
            } catch (e) {
                console.error('[ConfigManager] Save failed:', e);
                throw new Error('設定データの保存に失敗しました。アプリIDやフィールドコードを確認してください。');
            }
        },

        /**
         * キャッシュ済みの共通設定を取得（同期的）
         */
        getCommonSettings: function() {
            return cachedData ? (cachedData.commonSettings || {}) : {};
        },

        /**
         * CRM設定を取得する
         */
        getCrmSettings: function() {
            const settings = cachedData ? (cachedData.commonSettings || {}) : {};
            return {
                crmAppId: CRM_APP_ID,
                crmHistoryCount: settings.crmHistoryCount ? parseInt(settings.crmHistoryCount, 10) : DEFAULT_CRM_HISTORY_COUNT,
                finishedTicketLimit: settings.finishedTicketLimit ? parseInt(settings.finishedTicketLimit, 10) : 100
            };
        },

        /**
         * CRM設定を更新する (主にメインアプリ側から呼ばれる想定)
         */
        updateCrmSettings: async function(historyCount, finishedLimit) {
            const data = await this.fetchPublishedData();
            data.commonSettings = data.commonSettings || {};
            data.commonSettings.crmHistoryCount = historyCount;
            if (finishedLimit !== undefined) {
                data.commonSettings.finishedTicketLimit = finishedLimit;
            }
            await this._saveToKintone(data);
        },
        
        /**
         * ストレージ使用状況を取得 (ViewModeSwitcher.js用)
         */
        getStorageStatus: function() {
            const jsonStr = cachedData ? JSON.stringify(cachedData) : '';
            return {
                length: jsonStr.length,
                limit: 64000, // 目安
                recordCount: (cachedData && cachedData.records) ? cachedData.records.length : 0,
                lastPublishedAt: (cachedData && cachedData.lastPublishedAt) || null
            };
        },

        /**
         * 設定全体を保存 (ViewModeSwitcher.js用)
         */
        saveConfig: async function(records, descriptions) {
            const data = await this.fetchPublishedData();
            data.records = records;
            data.descriptions = descriptions;
            data.lastPublishedAt = new Date().toISOString();
            await this._saveToKintone(data);
        },
        
        /**
         * 本番環境へ反映 (ViewModeSwitcher.js用 - スタブ)
         */
        deployToProduction: async function() {
            // 必要に応じて実装 (例: 別アプリへのコピーなど)
            console.log('[ConfigManager] Deploy to production (stub)');
            return true;
        },

        /**
         * 本番環境から戻す (ViewModeSwitcher.js用 - スタブ)
         */
        revertFromProduction: async function() {
            console.log('[ConfigManager] Revert from production (stub)');
            return true;
        }
    };

    // グローバル公開
    window.ShinryoApp.ConfigManager = ConfigManager;

})();