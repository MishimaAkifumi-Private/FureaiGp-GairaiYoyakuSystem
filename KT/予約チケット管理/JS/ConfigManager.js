/**
 * ConfigManager.js
 * 共通設定および公開データの管理マネージャー
 * 
 * [機能]
 * - Kintoneアプリ(ID:156等)の「PublishedConfig」フィールドにJSONデータを保存・読込します。
 * - スタッフリストや施設設定をアプリ間で共有するために使用します。
 */
(function() {
    'use strict';
    
    // 名前空間の初期化
    window.ShinryoApp = window.ShinryoApp || {};

    // 設定
    const FIELD_CODE = 'PublishedConfig'; // Kintone側のフィールドコード
    const DEFAULT_APP_ID = 156; // デフォルトの保存先アプリID (診療シフト管理アプリ)

    // 保存先アプリIDを取得 (localStorageの設定を優先)
    const getTargetAppId = () => {
        try {
            const config = JSON.parse(localStorage.getItem('shinryo_ticket_config') || '{}');
            return config.appId ? parseInt(config.appId, 10) : DEFAULT_APP_ID;
        } catch(e) {
            return DEFAULT_APP_ID;
        }
    };

    // 内部キャッシュ
    let cachedData = null;

    const ConfigManager = {
        /**
         * 設定データを取得する
         */
        fetchPublishedData: async function() {
            const appId = getTargetAppId();
            try {
                // レコードを1件取得 (通常はレコードID=1、または最新のレコードを使用)
                const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                    app: appId,
                    query: 'limit 1',
                    fields: ['$id', FIELD_CODE]
                });

                if (resp.records.length > 0) {
                    const record = resp.records[0];
                    const jsonStr = record[FIELD_CODE]?.value;
                    cachedData = jsonStr ? JSON.parse(jsonStr) : {};
                    cachedData._recordId = record.$id.value; // 更新用にIDを保持
                    return cachedData;
                } else {
                    // レコードが存在しない場合は空のオブジェクトを返す（初回）
                    cachedData = {};
                    return cachedData;
                }
            } catch (e) {
                console.error('[ConfigManager] Fetch failed:', e);
                // エラー時は空オブジェクトを返して動作を止めない
                return {}; 
            }
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
            const appId = getTargetAppId();
            const jsonStr = JSON.stringify(data);
            
            // 保存容量チェック
            if (jsonStr.length > 1000000) {
                console.warn('[ConfigManager] Data size is large:', jsonStr.length);
            }

            try {
                if (data._recordId) {
                    // 既存レコード更新
                    await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
                        app: appId,
                        id: data._recordId,
                        record: {
                            [FIELD_CODE]: { value: jsonStr }
                        }
                    });
                } else {
                    // 新規レコード作成 (初回のみ)
                    await kintone.api(kintone.api.url('/k/v1/record', true), 'POST', {
                        app: appId,
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
            return (cachedData && cachedData.commonSettings) ? cachedData.commonSettings : {};
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
    console.log('[ConfigManager] Loaded.');

})();