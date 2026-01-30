/*
 * ConfigManager.js (v31)
 * 診療シフト管理アプリ(ID:156)用 - 設定管理マネージャー
 */
window.ShinryoApp = window.ShinryoApp || {};

(function() {
  'use strict';
  console.log('ConfigManager.js: Loading...');

  // 共通設定保管アプリ(App200)の設定
  const STORAGE_APP_ID = 200; 
  const STORAGE_API_TOKEN = 'qGQAy2d3TcicQ8t73Oknv5BZU7gGO9aBvhAD9aY8'; // CRUD Full Permission
  const STORAGE_KEY_FIELD = 'AppID';       // 検索キー（各病院のAppID）
  const STORAGE_JSON_FIELD = '設定情報2';   // 設定JSON格納フィールド

  // 公開済みデータのキャッシュ
  let publishedRecordsMap = new Map();
  let publishedDescriptions = {};
  let publishedDepartmentSettings = {}; // ★追加: 診療科単位の設定キャッシュ
  let publishedCommonSettings = {}; // ★追加: 病院共通の設定キャッシュ
  let publishedLabelSettings = {}; // ★追加: ラベル表示制御設定キャッシュ
  let lastPublishedAt = null;
  let lastJsonLength = 0;
  let isDataOldFormat = false;
  let isProductionDiff = false; // ★追加: 本番環境との差分有無

  window.ShinryoApp.ConfigManager = {
    init: initConfigManager,
    fetchPublishedData: fetchPublishedData,
    saveConfig: saveConfig,
    checkDiff: checkDiff,
    hasUnsavedChanges: hasUnsavedChanges,
    deployToProduction: deployToProduction, // ★追加
    revertFromProduction: revertFromProduction, // ★追加: 本番から戻す
    updateStatusImmediately: updateStatusImmediately,
    updateStatusBatch: updateStatusBatch,
    updateDepartmentStatus: updateDepartmentStatus,
    updateDepartmentTerm: updateDepartmentTerm, // ★追加
    updateDepartmentDescription: updateDepartmentDescription, // ★追加
    updateCommonTerm: updateCommonTerm, // ★追加
    updateCommonCalendarSettings: updateCommonCalendarSettings, // ★変更: 休診日・例外日・土曜設定をまとめて更新
    updateCommonFacilities: updateCommonFacilities, // ★追加
    updateCommonStaffs: updateCommonStaffs, // ★追加
    syncAppDropdown: syncAppDropdown, // ★追加: アプリ設定同期用
    syncExternalAppDropdown: syncExternalAppDropdown, // ★追加: 外部アプリ設定同期用
    getStorageStatus: () => ({ 
      length: lastJsonLength, 
      limit: 64000, 
      recordCount: publishedRecordsMap.size,
      lastPublishedAt: lastPublishedAt,
      isOldFormat: isDataOldFormat
    }),
    getPublishedDescriptions: () => publishedDescriptions,
    getLabelSettings: () => publishedLabelSettings, // ★追加
    getDepartmentSettings: () => publishedDepartmentSettings, // ★追加
    getCommonSettings: () => publishedCommonSettings, // ★追加
    isOldFormat: () => isDataOldFormat,
    hasProductionDiff: () => isProductionDiff, // ★追加
  };

  function initConfigManager() {
    console.log('ConfigManager initialized.');
  }

  // ★追加: レコード圧縮ヘルパー (保存用)
  function compressRecord(kintoneRecord) {
    const compressed = {};
    if (kintoneRecord.$id) {
        compressed.$id = kintoneRecord.$id.value;
    }
    Object.keys(kintoneRecord).forEach(key => {
        // 不要なシステムフィールドとデバッグ情報を除外
        if (['レコード番号', '作成者', '更新者', '作成日時', '更新日時', '$revision', '$id'].includes(key)) {
            return;
        }
        
        // ★追加: _debug_info は特別扱い (raw objectとして保存)
        if (key === '_debug_info') {
            compressed[key] = kintoneRecord[key];
            return;
        }

        const field = kintoneRecord[key];
        if (!field) return;

        if (field.type === 'SUBTABLE') {
            compressed[key] = field.value.map(row => {
                const rowObj = {};
                Object.keys(row.value).forEach(rowFieldKey => {
                    rowObj[rowFieldKey] = row.value[rowFieldKey].value;
                });
                return rowObj;
            });
        } else {
            compressed[key] = field.value;
        }
    });
    return compressed;
  }

  // ★追加: レコード復元ヘルパー (読込用)
  function inflateRecord(compressedRecord) {
      const inflated = {};
      inflated.$id = { type: '__ID__', value: compressedRecord.$id || null };
      Object.keys(compressedRecord).forEach(key => {
          if (key === '$id') return;
          const val = compressedRecord[key];
          // 直近NG日指定のみサブテーブルとして特別扱い、それ以外は汎用的な値として復元
          if (key === '直近NG日指定' && Array.isArray(val)) {
              inflated[key] = {
                  type: 'SUBTABLE',
                  value: val.map((row, idx) => ({
                      id: String(idx),
                      value: Object.keys(row).reduce((acc, k) => { acc[k] = { type: 'UNKNOWN', value: row[k] }; return acc; }, {})
                  }))
              };
          } else {
              inflated[key] = { type: 'UNKNOWN', value: val };
          }
      });
      return inflated;
  }

  // ★追加: オブジェクトの正規化（キーソート）による比較用ヘルパー
  function canonicalize(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(canonicalize);
      return Object.keys(obj).sort().reduce((acc, key) => {
          if (key === '$id' || key === '_debug_info') return acc; // ★変更: IDとデバッグ情報は比較から除外
          acc[key] = canonicalize(obj[key]);
          return acc;
      }, {});
  }

  /**
   * 共通設定保管アプリから、このアプリ(App156)用の設定JSONを取得する
   * APIトークンを使用してkintone.proxy経由で取得
   */
  async function fetchPublishedData() {
    const myAppId = kintone.app.getId();
    const query = `${STORAGE_KEY_FIELD} = "${myAppId}" limit 1`;
    const apiPath = kintone.api.url('/k/v1/records', true);
    const baseUrl = /^https?:\/\//.test(apiPath) ? apiPath : window.location.origin + apiPath;
    const url = baseUrl + `?app=${STORAGE_APP_ID}&query=${encodeURIComponent(query)}&_t=${new Date().getTime()}`; // ★変更: タイムスタンプ付与
    const headers = {
      'X-Cybozu-API-Token': STORAGE_API_TOKEN
    };

    try {
      const [body, status] = await kintone.proxy(url, 'GET', headers, {});
      if (status !== 200) throw new Error(`Status: ${status}, Body: ${body}`);
      
      const resp = JSON.parse(body);
      if (resp.records.length > 0) {
        lastPublishedAt = resp.records[0]['更新日時'].value;
        
        // フィールドの存在チェックを行い、存在しない場合は空文字として扱う
        let jsonField = resp.records[0][STORAGE_JSON_FIELD];
        if (!jsonField) {
            console.warn(`ConfigManager: Field '${STORAGE_JSON_FIELD}' not found in App ${STORAGE_APP_ID}. Searching for alternative...`);
            // ★追加: フィールドコードが異なる場合のフォールバック探索
            const keys = Object.keys(resp.records[0]);
            for (const key of keys) {
                const val = resp.records[0][key];
                // 文字列（複数行）で、かつJSONっぽい（{で始まる）値を探す
                if (val && val.type === 'MULTI_LINE_TEXT' && val.value && val.value.trim().startsWith('{')) {
                    console.log(`ConfigManager: Found potential JSON in field '${key}'`);
                    jsonField = val;
                    break;
                }
            }
        }
        const jsonStr = jsonField ? jsonField.value : null;

        lastJsonLength = jsonStr ? jsonStr.length : 0;
        const data = JSON.parse(jsonStr || '{}');

        // ★変更: 本番環境(設定情報)とプレビュー環境(設定情報2)の差分チェック (オブジェクト正規化比較)
        const prodJsonStr = resp.records[0]['設定情報']?.value || null;
        let prodData = {};
        try { prodData = JSON.parse(prodJsonStr || '{}'); } catch(e) { console.warn('Prod JSON parse error', e); }
        
        const norm1 = JSON.stringify(canonicalize(data));
        const norm2 = JSON.stringify(canonicalize(prodData));
        isProductionDiff = (norm1 !== norm2);
        
        // ★★★ デバッグ用ログ出力（取得データ） ★★★
        console.group('ConfigManager: fetchPublishedData Debug');
        console.log('[[DEBUG]] Raw JSON fetched from App 200 (Length):', jsonStr ? jsonStr.length : 0);
        console.log('[[DEBUG]] Parsed Data from App 200:', data);
        console.groupEnd();

        let records = [];
        if (Array.isArray(data)) {
            records = data; // 旧形式(配列)の場合はそのまま(互換性維持は困難だが、通常はここには来ない想定)
            publishedDescriptions = {};
            publishedDepartmentSettings = {};
            publishedCommonSettings = {};
            isDataOldFormat = true;
        } else {
            // ★変更: 圧縮されたレコードをKintone形式に復元して読み込む
            records = (data.records || []).map(inflateRecord);
            publishedDescriptions = data.descriptions || {};
            publishedDepartmentSettings = data.departmentSettings || {}; // ★追加: 読み込み
            publishedCommonSettings = data.commonSettings || {}; // ★追加: 読み込み
            publishedLabelSettings = data.labelSettings || {}; // ★追加: 読み込み
            isDataOldFormat = false;
        }

        publishedRecordsMap = new Map(records.map(r => [String(r.$id.value), r])); // ★変更: IDを文字列に統一

        // ★デバッグ: 読込直後のデータ確認（診療分野のみ）
        console.groupCollapsed('ConfigManager: [DEBUG] Read Data (診療分野)');
        records.forEach(r => {
            const v = r['診療分野']?.value || '';
            console.log(`ID:${r.$id.value} Val:'${v}' (len:${v.length})`);
        });
        console.groupEnd();

        console.log('ConfigManager: Published data fetched.', data);

        // ★修正: 取得成功時にデータを返却する（これがないと下の初期化処理に流れて空になる）
        return { 
            records: records, 
            descriptions: publishedDescriptions, 
            departmentSettings: publishedDepartmentSettings,
            commonSettings: publishedCommonSettings,
            labelSettings: publishedLabelSettings
        };
      }
    } catch (e) {
      console.error('ConfigManager: Failed to fetch published data.', e);
      throw e; // エラー時は例外を投げて中断（空データでの上書き防止）
    }
    
    // データがない場合は空で初期化
    publishedRecordsMap = new Map();
    publishedDescriptions = {};
    publishedDepartmentSettings = {};
    publishedCommonSettings = {};
    publishedLabelSettings = {};
    lastPublishedAt = null;
    isDataOldFormat = false;
    isProductionDiff = false;
    return { records: [], descriptions: {}, departmentSettings: {}, commonSettings: {}, labelSettings: {} };
  }

  /**
   * 現在のアプリの状態をJSONとして共通設定保管アプリに保存（公開）する
   */
  async function saveConfig(currentRecords, currentDescriptions, currentDeptSettings, currentCommonSettings, currentLabelSettings, targetRecordId = null) {
    const myAppId = kintone.app.getId();

    // 設定の解決
    const deptSettings = currentDeptSettings || publishedDepartmentSettings;
    const commonSettings = currentCommonSettings || publishedCommonSettings;
    const labelSettings = currentLabelSettings || publishedLabelSettings;

    // ★Webフォーム互換対応: レコード内の「予約開始」「予約可能期間」フィールドを設定値で上書き同期する
    if (currentRecords && Array.isArray(currentRecords)) {
        currentRecords.forEach(r => {
            const dept = r['診療科']?.value;
            let s = null, d = null;

            // 1. 個別設定
            if (dept && deptSettings[dept] && deptSettings[dept].start !== undefined && deptSettings[dept].start !== null) {
                s = deptSettings[dept].start;
                d = deptSettings[dept].duration;
            } 
            // 2. 共通設定
            else if (commonSettings && commonSettings.start !== undefined && commonSettings.start !== null) {
                s = commonSettings.start;
                d = commonSettings.duration;
            }

            // ★修正: 医師個人の着任日・離任日を考慮して、予約開始日・期間を補正する
            // 設定値がない場合はデフォルト(0日後, 365日間)として計算開始
            let sInt = (s !== null && s !== undefined && s !== '') ? parseInt(s, 10) : 0;
            let dInt = (d !== null && d !== undefined && d !== '') ? parseInt(d, 10) : 365;

            {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // 基準となる予約期間（診療科設定）
                const baseStartDate = new Date(today);
                baseStartDate.setDate(baseStartDate.getDate() + sInt);
                
                const baseEndDate = new Date(baseStartDate);
                baseEndDate.setDate(baseEndDate.getDate() + dInt);
                
                // 補正後の開始日（着任日が未来なら遅らせる）
                let actualStartDate = new Date(baseStartDate);
                if (r['着任日']?.value) {
                    // "YYYY-MM-DD" を分解してDate生成（タイムゾーン影響回避）
                    const parts = r['着任日'].value.split('-');
                    const arrDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    if (arrDate > actualStartDate) {
                        actualStartDate = arrDate;
                    }
                }
                
                // 補正後の終了日（離任日が期間内なら早める）
                let actualEndDate = new Date(baseEndDate);
                if (r['離任日']?.value) {
                    const parts = r['離任日'].value.split('-');
                    const depDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    if (depDate < actualEndDate) {
                        actualEndDate = depDate;
                    }
                }
                
                // 新しい開始日・期間を計算（日数）
                const diffTimeStart = actualStartDate.getTime() - today.getTime();
                s = Math.max(0, Math.ceil(diffTimeStart / (1000 * 60 * 60 * 24)));
                
                const diffTimeDuration = actualEndDate.getTime() - actualStartDate.getTime();
                d = Math.max(0, Math.ceil(diffTimeDuration / (1000 * 60 * 60 * 24)));

                // ★追加: 安全策 - 着任日が未来の場合、予約開始日(s)が着任日までの日数より短くならないように強制補正
                if (r['着任日']?.value) {
                    const parts = r['着任日'].value.split('-');
                    const arrDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    
                    if (arrDate > now) {
                        const minDays = Math.ceil((arrDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        if (s < minDays) {
                            console.warn(`[ConfigManager] Force correction for ${r['医師名']?.value}: s=${s} -> ${minDays} (Arrival: ${r['着任日'].value})`);
                            s = minDays;
                        }
                    }
                }

                // デバッグログ（鈴木医師など）
                if (r['医師名']?.value?.indexOf('鈴木') > -1) {
                    console.group(`[ConfigManager] Debug: ${r['医師名'].value}`);
                    console.log(`Arrival Date: ${r['着任日']?.value}`);
                    console.log(`Base Start Date: ${baseStartDate.toLocaleString()}`);
                    console.log(`Actual Start Date: ${actualStartDate.toLocaleString()}`);
                    console.log(`Today: ${today.toLocaleString()}`);
                    console.log(`Calculated s (offset): ${s}`);
                    console.log(`Calculated d (duration): ${d}`);
                    console.groupEnd();
                }
            }

            // フィールド更新
            if (!r['予約開始']) r['予約開始'] = { type: 'NUMBER', value: '' };
            r['予約開始'].value = (s !== null && s !== undefined && s !== '') ? String(s) : '';

            if (!r['予約可能期間']) r['予約可能期間'] = { type: 'NUMBER', value: '' };
            r['予約可能期間'].value = (d !== null && d !== undefined && d !== '') ? String(d) : '';

            // ★追加: Webフォームデバッグ用情報（JSONにのみ保存され、Kintoneアプリには影響しません）
            r['_debug_info'] = {
                doctor: r['医師名']?.value,
                calculated_start_days: s,
                calculated_duration: d,
                arrival_date: r['着任日']?.value,
                base_start_days: sInt
            };
        });
    }

    const data = {
      records: currentRecords.map(compressRecord), // ★変更: 圧縮して保存
      descriptions: currentDescriptions,
      departmentSettings: deptSettings,
      commonSettings: commonSettings,
      labelSettings: labelSettings
    };
    const jsonStr = JSON.stringify(data);
    lastJsonLength = jsonStr.length;

    // ★★★ デバッグ用ログ出力（保存データ） ★★★
    console.group('ConfigManager: saveConfig Debug');
    console.log('[[DEBUG]] Data Object to be saved (Local):', data);
    console.log('[[DEBUG]] JSON String to be saved (Length):', jsonStr.length);
    console.groupEnd();

    // ★デバッグ: 保存直前のデータ確認（診療分野のみ）
    console.groupCollapsed('ConfigManager: [DEBUG] Write Data (診療分野)');
    currentRecords.forEach(r => {
        const v = r['診療分野']?.value || '';
        console.log(`ID:${r.$id.value} Val:'${v}' (len:${v.length})`);
    });
    console.groupEnd();

    try {
      let recordId = targetRecordId;

      // IDが指定されていない場合は検索して特定する
      if (!recordId) {
          const query = `${STORAGE_KEY_FIELD} = "${myAppId}" limit 1`;
          const apiPathGet = kintone.api.url('/k/v1/records', true);
          const baseUrlGet = /^https?:\/\//.test(apiPathGet) ? apiPathGet : window.location.origin + apiPathGet;
          const getUrl = baseUrlGet + `?app=${STORAGE_APP_ID}&query=${encodeURIComponent(query)}&_t=${new Date().getTime()}`;
      
          // GETリクエスト用ヘッダー (Content-Typeを含めない)
          const getHeaders = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN };
      
          const [getBody, getStatus] = await kintone.proxy(getUrl, 'GET', getHeaders, {});
          if (getStatus !== 200) throw new Error(`Failed to check existing records. Status: ${getStatus}, Body: ${getBody}`);
      
          const getResp = JSON.parse(getBody);
          if (getResp.records && getResp.records.length > 0) {
              recordId = getResp.records[0].$id.value;
          }
      }

      let method = 'POST';
      const apiPathSave = kintone.api.url('/k/v1/record', true);
      const apiUrl = /^https?:\/\//.test(apiPathSave) ? apiPathSave : window.location.origin + apiPathSave;
      let bodyParams = {
        app: STORAGE_APP_ID,
        record: {
          [STORAGE_KEY_FIELD]: { value: String(myAppId) },
          [STORAGE_JSON_FIELD]: { value: jsonStr }
        }
      };

      // 保存用ヘッダー (Content-Typeが必要)
      const saveHeaders = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN, 'Content-Type': 'application/json' };

      if (recordId) {
        method = 'PUT';
        bodyParams = {
          app: STORAGE_APP_ID,
          id: recordId,
          record: {
            [STORAGE_JSON_FIELD]: { value: jsonStr }
          }
        };
      } else {
        console.log('ConfigManager: Target record not found in App 200. Creating new record.');
      }

      const [saveBody, saveStatus] = await kintone.proxy(apiUrl, method, saveHeaders, JSON.stringify(bodyParams));
      if (saveStatus !== 200) throw new Error(`Save failed. Status: ${saveStatus}, Body: ${saveBody}`);

      // ★追加: 保存成功時に最終更新日時を現在時刻で更新
      lastPublishedAt = new Date().toISOString();

      console.log('ConfigManager: Config saved successfully.');
    } catch (e) {
      console.error('ConfigManager: Failed to save config.', e);
      throw e;
    }
  }

  /**
   * ★追加: 「設定情報2」(プレビュー) の内容を 「設定情報」(本番) に上書きコピーする
   */
  async function deployToProduction() {
    console.log('ConfigManager: Deploying to Production (Copying 設定情報2 to 設定情報)...');
    const myAppId = kintone.app.getId();
    const query = `${STORAGE_KEY_FIELD} = "${myAppId}" limit 1`;
    const apiPath = kintone.api.url('/k/v1/records', true);
    const baseUrl = /^https?:\/\//.test(apiPath) ? apiPath : window.location.origin + apiPath;
    const url = baseUrl + `?app=${STORAGE_APP_ID}&query=${encodeURIComponent(query)}&_t=${new Date().getTime()}`;
    const headers = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN };

    try {
      // 1. 現在のレコードを取得 (設定情報2の値を取得)
      const [body, status] = await kintone.proxy(url, 'GET', headers, {});
      if (status !== 200) throw new Error(`Fetch failed. Status: ${status}`);
      const resp = JSON.parse(body);
      if (resp.records.length === 0) throw new Error('Target record not found in App 200.');

      const rec = resp.records[0];
      const previewJson = rec[STORAGE_JSON_FIELD].value; // 設定情報2
      const recId = rec.$id.value;

      // 2. 設定情報フィールドを更新
      const updateUrl = kintone.api.url('/k/v1/record', true);
      const updateBody = {
        app: STORAGE_APP_ID,
        id: recId,
        record: {
          '設定情報': { value: previewJson }
        }
      };
      const updateHeaders = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN, 'Content-Type': 'application/json' };
      
      const [putBody, putStatus] = await kintone.proxy(updateUrl, 'PUT', updateHeaders, JSON.stringify(updateBody));
      if (putStatus !== 200) throw new Error(`Update failed. Status: ${putStatus}`);
      
      console.log('ConfigManager: Deployed to Production successfully.');
    } catch (e) {
      console.error('ConfigManager: Deploy failed.', e);
      throw e;
    }
  }

  /**
   * ★追加: 「設定情報」(本番) の内容を 「設定情報2」(プレビュー) に上書きコピーし、
   * さらに現在のアプリ(App156)のレコードも本番データに合わせて復元する (Revert)
   */
  async function revertFromProduction() {
    console.log('ConfigManager: Reverting from Production...');
    const myAppId = kintone.app.getId();
    
    // 1. App200から本番データ(設定情報)を取得
    const query = `${STORAGE_KEY_FIELD} = "${myAppId}" limit 1`;
    const apiPath = kintone.api.url('/k/v1/records', true);
    const baseUrl = /^https?:\/\//.test(apiPath) ? apiPath : window.location.origin + apiPath;
    const url = baseUrl + `?app=${STORAGE_APP_ID}&query=${encodeURIComponent(query)}&_t=${new Date().getTime()}`;
    const headers = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN };

    try {
      const [body, status] = await kintone.proxy(url, 'GET', headers, {});
      if (status !== 200) throw new Error(`Fetch failed. Status: ${status}`);
      const resp = JSON.parse(body);
      if (resp.records.length === 0) throw new Error('Target record not found in App 200.');

      const rec = resp.records[0];
      const recId = rec.$id.value; // ★追加: レコードIDを取得
      const prodJsonStr = rec['設定情報']?.value; // 設定情報 (本番)
      
      if (!prodJsonStr) throw new Error('Production data (設定情報) is empty.');
      
      const prodData = JSON.parse(prodJsonStr);
      const prodRecords = (prodData.records || []).map(inflateRecord); // 展開

      // 2. App156のレコードを本番データに合わせて同期(復元)
      await syncAppRecords(prodRecords);

      // 3. 同期後の最新レコードをApp156から再取得
      // ※ syncAppRecordsでレコードが再作成された場合、IDが変わっているため、
      //    prodRecords(旧ID)ではなく、実際のアプリ上のレコード(新ID)を保存する必要がある
      let currentRecords = [];
      let offset = 0;
      while(true) {
          const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', { app: myAppId, query: `limit 500 offset ${offset}` });
          currentRecords = currentRecords.concat(resp.records);
          if(resp.records.length < 500) break;
          offset += 500;
      }

      // ★追加: 保存前にソートして順序を安定させる (本番データとの差分誤検知を防止)
      currentRecords.sort((a, b) => {
          const oa = parseInt(a['表示順']?.value || 9999, 10);
          const ob = parseInt(b['表示順']?.value || 9999, 10);
          if (oa !== ob) return oa - ob;
          return parseInt(a.$id.value, 10) - parseInt(b.$id.value, 10);
      });

      // 4. 設定情報2(プレビュー)を最新のアプリ状態で上書き保存
      // ※ 本番データの設定値でプレビューを上書きする (undefinedの場合は空オブジェクトで上書き)
      await saveConfig(
          currentRecords, 
          prodData.descriptions || {}, 
          prodData.departmentSettings || {}, 
          prodData.commonSettings || {}, 
          prodData.labelSettings || {},
          recId // ★追加: 特定したレコードIDを渡して更新を強制する
      );
      
      console.log('ConfigManager: Reverted from Production successfully.');
    } catch (e) {
      console.error('ConfigManager: Revert failed.', e);
      throw e;
    }
  }

  // App156のレコードを同期する内部関数
  async function syncAppRecords(targetRecords) {
      const appId = kintone.app.getId();
      
      // 現在のレコードを全取得
      let currentRecords = [];
      let offset = 0;
      while(true) {
          const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', { app: appId, query: `limit 500 offset ${offset}` });
          currentRecords = currentRecords.concat(resp.records);
          if(resp.records.length < 500) break;
          offset += 500;
      }

      const requests = [];
      const targetMap = new Map(targetRecords.map(r => [String(r.$id.value), r]));
      const currentMap = new Map(currentRecords.map(r => [String(r.$id.value), r]));
      
      // ★修正: ゲストスペース環境に対応したAPI URLを取得
      const recordsApiUrl = kintone.api.url('/k/v1/records', true).replace(/^https?:\/\/[^\/]+/, '');

      // 削除対象 (現在あるが、ターゲットにない)
      const deleteIds = currentRecords.filter(r => !targetMap.has(String(r.$id.value))).map(r => r.$id.value);
      if (deleteIds.length > 0) {
          // 100件ずつ
          for (let i = 0; i < deleteIds.length; i += 100) {
              requests.push({
                  method: 'DELETE',
                  api: recordsApiUrl, // ★修正: 正しいURLを使用
                  payload: { app: appId, ids: deleteIds.slice(i, i + 100) }
              });
          }
      }

      // 更新・追加対象
      const recordsToUpdate = [];
      const recordsToAdd = [];

      targetRecords.forEach(tRec => {
          const tId = String(tRec.$id.value);
          const cRec = currentMap.get(tId);
          
          // API用ペイロード作成
          const recordPayload = {};
          Object.keys(tRec).forEach(key => {
              if (['$id', 'レコード番号', '作成者', '更新者', '作成日時', '更新日時', '$revision'].includes(key)) return;
              if (key.startsWith('_')) return; // ★追加: _debug_info などの内部プロパティを除外
              
              if (tRec[key].type === 'SUBTABLE') {
                  recordPayload[key] = {
                      value: tRec[key].value.map(row => {
                          const rowVal = {};
                          Object.keys(row.value).forEach(f => {
                              rowVal[f] = { value: row.value[f].value };
                          });
                          return { value: rowVal };
                      })
                  };
              } else {
                  recordPayload[key] = { value: tRec[key].value };
              }
          });

          if (cRec) {
              recordsToUpdate.push({ id: tId, record: recordPayload });
          } else {
              recordsToAdd.push(recordPayload);
          }
      });

      // Updateリクエスト (100件ずつ)
      for (let i = 0; i < recordsToUpdate.length; i += 100) {
          requests.push({
              method: 'PUT',
              api: recordsApiUrl, // ★修正: 正しいURLを使用
              payload: { app: appId, records: recordsToUpdate.slice(i, i + 100) }
          });
      }

      // Addリクエスト (100件ずつ)
      for (let i = 0; i < recordsToAdd.length; i += 100) {
          requests.push({
              method: 'POST',
              api: recordsApiUrl, // ★修正: 正しいURLを使用
              payload: { app: appId, records: recordsToAdd.slice(i, i + 100) }
          });
      }

      // 実行 (bulkRequestの上限は20リクエスト)
      if (requests.length > 0) {
          for (let i = 0; i < requests.length; i += 20) {
              const bulkBody = { requests: requests.slice(i, i + 20) };
              await kintone.api(kintone.api.url('/k/v1/bulkRequest', true), 'POST', bulkBody);
          }
      }
  }

  /**
   * 受付ステータスのみを即時更新し、公開データにも反映させる（他のドラフト変更は無視）
   */
  async function updateStatusImmediately(recordId, newStatus) {
    try {
      // 1. App156 (自アプリ) のレコードを更新
      await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
        app: kintone.app.getId(),
        id: recordId,
        record: { '掲載': { value: newStatus } }
      });

      // 2. App200 (保管庫) の公開済みJSONを取得してパッチ当て
      // ※現在のドラフト(App156全体)ではなく、公開中のデータ(App200)をベースにする
      const currentPublished = await fetchPublishedData();
      
      if (currentPublished && currentPublished.records) {
        const targetRecord = currentPublished.records.find(r => r.$id.value == recordId);
        if (targetRecord) {
          // JSON内の該当レコードのステータスを書き換え
          targetRecord['掲載'].value = newStatus;
          // 書き換えたJSONを保存 (descriptionsはそのまま維持)
          await saveConfig(currentPublished.records, currentPublished.descriptions);
          console.log(`ConfigManager: Status updated immediately for record ${recordId} to ${newStatus}`);
        }
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update status immediately.', e);
      throw e;
    }
  }

  /**
   * 複数のレコードのステータスを一括更新し、公開データにも反映させる
   * @param {Array<{id: string, status: string}>} updates
   */
  async function updateStatusBatch(updates) {
    try {
      // 1. App156 (自アプリ) のレコードを一括更新
      const app156Records = updates.map(u => ({
        id: u.id,
        record: { '掲載': { value: u.status } }
      }));
      
      // 100件ずつ分割処理
      for (let i = 0; i < app156Records.length; i += 100) {
        const chunk = app156Records.slice(i, i + 100);
        await kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', {
          app: kintone.app.getId(),
          records: chunk
        });
      }

      // 2. App200 (保管庫) の公開済みJSONを取得してパッチ当て
      const currentPublished = await fetchPublishedData();
      
      if (currentPublished && currentPublished.records) {
        let changed = false;
        updates.forEach(u => {
            const targetRecord = currentPublished.records.find(r => r.$id.value == u.id);
            if (targetRecord) {
                targetRecord['掲載'].value = u.status;
                changed = true;
            }
        });

        if (changed) {
            await saveConfig(currentPublished.records, currentPublished.descriptions);
            console.log(`ConfigManager: Batch status update completed for ${updates.length} records.`);
        }
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update status batch.', e);
      throw e;
    }
  }

  /**
   * 診療科全体のステータスを更新し、公開データ（descriptions）に保存する
   * ※レコード自体は変更せず、表示制御用のフラグとして保存
   */
  async function updateDepartmentStatus(deptName, newStatus) {
    try {
      const currentPublished = await fetchPublishedData();
      if (currentPublished) {
        const descriptions = currentPublished.descriptions || {};
        // 診療科ステータス用の特殊キーを使用
        descriptions['__status__' + deptName] = newStatus;
        
        await saveConfig(currentPublished.records, descriptions, currentPublished.departmentSettings, currentPublished.commonSettings, currentPublished.labelSettings);
        console.log(`ConfigManager: Department ${deptName} status updated to ${newStatus}`);
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update department status.', e);
      throw e;
    }
  }

  /**
   * ★追加: 診療科ごとの予約開始・期間設定を更新し、公開データに保存する
   */
  async function updateDepartmentTerm(deptName, start, duration) {
    try {
      const currentPublished = await fetchPublishedData();
      if (currentPublished) {
        const settings = currentPublished.departmentSettings || {};
        // startがnullの場合は設定を削除（共通設定に戻す）
        if (start === null) {
            delete settings[deptName];
        } else {
            settings[deptName] = { start: start, duration: duration };
        }
        
        await saveConfig(currentPublished.records, currentPublished.descriptions, settings, currentPublished.commonSettings, currentPublished.labelSettings);
        console.log(`ConfigManager: Department ${deptName} term updated.`);
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update department term.', e);
      throw e;
    }
  }

  /**
   * ★追加: 診療科ごとの案内ラベル(HTML)と表示制御設定を更新し、公開データに保存する
   */
  async function updateDepartmentDescription(deptName, html, targetRequirement) {
    try {
      const currentPublished = await fetchPublishedData();
      if (currentPublished) {
        const descriptions = currentPublished.descriptions || {};
        descriptions[deptName] = html;

        const labelSettings = currentPublished.labelSettings || {};
        if (targetRequirement !== undefined) {
            labelSettings[deptName] = targetRequirement;
        }
        
        await saveConfig(currentPublished.records, descriptions, currentPublished.departmentSettings, currentPublished.commonSettings, labelSettings);
        console.log(`ConfigManager: Department ${deptName} description updated.`);
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update department description.', e);
      throw e;
    }
  }

  /**
   * ★追加: 病院共通の予約開始・期間設定を更新し、公開データに保存する
   */
  async function updateCommonTerm(start, duration) {
    try {
      const currentPublished = await fetchPublishedData();
      if (currentPublished) {
        const common = { start: start, duration: duration };
        await saveConfig(currentPublished.records, currentPublished.descriptions, currentPublished.departmentSettings, common, currentPublished.labelSettings);
        console.log(`ConfigManager: Common term updated to start:${start}, duration:${duration}`);
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update common term.', e);
      throw e;
    }
  }

  /**
   * ★変更: 病院共通のカレンダー設定（休診日、例外診療日、土曜設定、予約期間）を更新し、公開データに保存する
   */
  async function updateCommonCalendarSettings(holidays, exceptionalDays, closeSaturdays, start, duration) {
    try {
      const currentPublished = await fetchPublishedData();
      if (currentPublished) {
        const common = currentPublished.commonSettings || {};
        common.holidays = holidays;
        common.exceptionalDays = exceptionalDays; // ★追加
        common.closeSaturdays = closeSaturdays;   // ★追加
        common.start = start;                     // ★追加: 予約開始
        common.duration = duration;               // ★追加: 予約期間
        await saveConfig(currentPublished.records, currentPublished.descriptions, currentPublished.departmentSettings, common, currentPublished.labelSettings);
        console.log(`ConfigManager: Common calendar settings updated.`);
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update common calendar settings.', e);
      throw e;
    }
  }

  /**
   * ★追加: 病院共通の管轄施設設定を更新し、公開データに保存する
   */
  async function updateCommonFacilities(facilities) {
    try {
      const currentPublished = await fetchPublishedData();
      if (currentPublished) {
        const common = currentPublished.commonSettings || {};
        common.facilities = facilities;
        await saveConfig(currentPublished.records, currentPublished.descriptions, currentPublished.departmentSettings, common, currentPublished.labelSettings);
        console.log(`ConfigManager: Common facilities updated. Count: ${facilities ? facilities.length : 0}`);
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update common facilities.', e);
      throw e;
    }
  }

  /**
   * ★追加: 病院共通のスタッフ設定を更新し、公開データに保存する
   */
  async function updateCommonStaffs(staffs) {
    try {
      const currentPublished = await fetchPublishedData();
      if (currentPublished) {
        const common = currentPublished.commonSettings || {};
        common.staffs = staffs;
        await saveConfig(currentPublished.records, currentPublished.descriptions, currentPublished.departmentSettings, common, currentPublished.labelSettings);
        console.log(`ConfigManager: Common staffs updated. Count: ${staffs ? staffs.length : 0}`);
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update common staffs.', e);
      throw e;
    }
  }

  /**
   * ★追加: アプリのドロップダウンフィールドの選択肢を更新し、デプロイする
   * ※実行にはアプリ管理者権限が必要です
   */
  async function syncAppDropdown(fieldCode, options) {
    try {
      const appId = kintone.app.getId();
      
      // 1. 現在のフィールド設定を取得（プレビュー）
      const getResp = await kintone.api(kintone.api.url('/k/v1/preview/app/form/fields.json', true), 'GET', {
          app: appId,
          fields: [fieldCode]
      });
      
      if (!getResp.properties || !getResp.properties[fieldCode]) {
          throw new Error(`Field ${fieldCode} not found.`);
      }
      
      const currentType = getResp.properties[fieldCode].type; // ★追加: 現在のフィールドタイプを取得
      const currentDefault = getResp.properties[fieldCode].defaultValue; // ★追加: 現在のデフォルト値を取得

      // 2. 選択肢を構築
      const newOptions = {};
      options.forEach((opt, idx) => {
          // 既存の選択肢設定があれば引き継ぐことも可能だが、今回は順序通りに再構築
          newOptions[opt] = { label: opt, index: idx };
      });

      // ★追加: デフォルト値の決定ロジック
      let newDefault = "";
      if (currentType === 'RADIO_BUTTON') {
          // ラジオボタンは必須選択のため、選択肢がある場合は必ず値を設定する
          if (options.length > 0) {
              // 既存のデフォルト値が新しい選択肢に含まれていればそれを維持、なければ先頭を選択
              newDefault = options.includes(currentDefault) ? currentDefault : options[0];
          }
          // 選択肢が0個の場合は空文字のままとする（通常ありえないがエラー回避）
      } else {
          // ドロップダウン等は空文字で選択解除が可能。既存値があれば維持。
          if (options.includes(currentDefault)) {
              newDefault = currentDefault;
          }
      }

      // 3. フィールド設定を更新
      await kintone.api(kintone.api.url('/k/v1/preview/app/form/fields.json', true), 'PUT', {
          app: appId,
          properties: { 
              [fieldCode]: { 
                  type: currentType, // ★変更: 取得したタイプ(RADIO_BUTTON等)をそのまま使う
                  options: newOptions,
                  defaultValue: newDefault // ★変更: 適切なデフォルト値を設定
              } 
          }
      });

      // 4. アプリをデプロイ
      await kintone.api(kintone.api.url('/k/v1/preview/app/deploy.json', true), 'POST', {
          apps: [{ app: appId }]
      });

      console.log('ConfigManager: App dropdown synced and deploy requested.');
    } catch (e) {
      console.error('ConfigManager: Failed to sync app dropdown.', e);
      throw e;
    }
  }

  /**
   * ★追加: 指定したアプリのドロップダウンフィールドの選択肢を更新し、デプロイする
   * ※実行にはアプリ管理者権限が必要です
   */
  async function syncExternalAppDropdown(targetAppId, fieldCode, options) {
    try {
      // 1. 現在のフィールド設定を取得（プレビュー）
      const getResp = await kintone.api(kintone.api.url('/k/v1/preview/app/form/fields.json', true), 'GET', {
          app: targetAppId,
          fields: [fieldCode]
      });
      
      if (!getResp.properties || !getResp.properties[fieldCode]) {
          throw new Error(`Field ${fieldCode} not found in App ${targetAppId}.`);
      }
      
      const currentType = getResp.properties[fieldCode].type;
      const currentDefault = getResp.properties[fieldCode].defaultValue;

      // 2. 選択肢を構築
      const newOptions = {};
      options.forEach((opt, idx) => {
          newOptions[opt] = { label: opt, index: idx };
      });

      // デフォルト値の決定ロジック
      let newDefault = "";
      if (currentType === 'RADIO_BUTTON') {
          if (options.length > 0) {
              newDefault = options.includes(currentDefault) ? currentDefault : options[0];
          }
      } else {
          if (options.includes(currentDefault)) {
              newDefault = currentDefault;
          }
      }

      // 3. フィールド設定を更新
      await kintone.api(kintone.api.url('/k/v1/preview/app/form/fields.json', true), 'PUT', {
          app: targetAppId,
          properties: { 
              [fieldCode]: { 
                  type: currentType,
                  options: newOptions,
                  defaultValue: newDefault
              } 
          }
      });

      // 4. アプリをデプロイ
      await kintone.api(kintone.api.url('/k/v1/preview/app/deploy.json', true), 'POST', {
          apps: [{ app: targetAppId }]
      });

      console.log(`ConfigManager: App ${targetAppId} dropdown synced and deploy requested.`);
    } catch (e) {
      console.error(`ConfigManager: Failed to sync app ${targetAppId} dropdown.`, e);
      throw e;
    }
  }

  /**
   * 現在のレコードと公開済みレコードを比較し、差異があるか判定する
   */
  function checkDiff(currentRecord, columnDef) {
    if (publishedRecordsMap.size === 0) return false;
    const recId = String(currentRecord.$id.value); // ★変更: IDを文字列に統一
    const pubRec = publishedRecordsMap.get(recId);
    if (!pubRec) return true; // 新規レコードは変更扱い

    return isDiff(currentRecord, pubRec, columnDef, true); // ★変更: ログ出力を有効化
  }
  
  /**
   * アプリ全体で未保存の変更があるか判定する
   */
  function hasUnsavedChanges(currentRecords) {
    if (publishedRecordsMap.size === 0) {
        return currentRecords.length > 0;
    }

    // 1. 削除されたレコードのチェック
    const currentIds = new Set(currentRecords.map(r => String(r.$id.value))); // ★変更: IDを文字列に統一
    for (const pubId of publishedRecordsMap.keys()) {
        if (!currentIds.has(pubId)) {
            console.warn(`[ConfigManager] Detected DELETED record: ID ${pubId}`);
            return true;
        }
    }

    // 2. 変更・追加のチェック
    const simpleFields = ['診療分野', '診療科', '医師名', '診療選択', '掲載', '施設名', '表示順', '着任日', '離任日', '集合'];
    
    for (const rec of currentRecords) {
        const recId = String(rec.$id.value); // ★変更: IDを文字列に統一
        const pubRec = publishedRecordsMap.get(recId);
        if (!pubRec) {
            console.warn(`[ConfigManager] Detected NEW record: ID ${recId}`);
            return true; // 新規レコード
        }

        if (isDiff(rec, pubRec, { type: 'schedule' }, true)) return true;
        if (isDiff(rec, pubRec, { type: 'term' }, true)) return true;
        if (isDiff(rec, pubRec, { type: 'info' }, true)) return true;
        
        for (const field of simpleFields) {
            if (isDiff(rec, pubRec, { field: field }, true)) return true;
        }
    }
    return false;
  }

  // 内部比較ロジック
  function isDiff(rec1, rec2, col, logDiff = false) {
    const field = col.field;
    const type = col.type;

    // ★変更: 正規化ヘルパー (強化版: 空白文字の完全正規化)
    const normalize = (val) => {
        if (val === null || val === undefined) return '';
        return String(val)
            .replace(/\r\n/g, '\n').replace(/\r/g, '\n') // 改行コード統一
            .replace(/[\s\u3000]+/g, ' ') // 全角・半角スペース、タブ等を「1つの半角スペース」に置換
            .trim();
    };

    // スケジュール比較
    if (type === 'schedule') {
      const days = ['月', '火', '水', '木', '金', '土'];
      const weeks = ['1', '2', '3', '4', '5'];
      for (const w of weeks) {
        for (const d of days) {
          const key = `${d}${w}`;
          const v1 = (rec1[key]?.value || []).slice().sort();
          const v2 = (rec2[key]?.value || []).slice().sort();
          if (JSON.stringify(v1) !== JSON.stringify(v2)) {
              if(logDiff) console.warn(`[Diff] Schedule ${key} (ID:${rec1.$id.value}):`, v1, v2);
              return true;
          }
        }
      }
      return false;
    }
    
    // 期間比較
    if (type === 'term') {
      return false; // ★変更: レコード単位の期間設定は廃止されたため比較しない
    }

    // 案内比較
    if (type === 'info') {
      const v1 = normalize(rec1['留意案内']?.value);
      const v2 = normalize(rec2['留意案内']?.value);
      if (v1 !== v2) {
          if(logDiff) console.warn(`[Diff] Info (ID:${rec1.$id.value}):`, v1, v2);
          return true;
      }
    }

    // 通常フィールド比較
    if (field) {
      const v1 = normalize(rec1[field]?.value);
      const v2 = normalize(rec2[field]?.value);

      if (v1 !== v2) {
          if(logDiff) console.warn(`[Diff] Field ${field} (ID:${rec1.$id.value}):`, v1, v2);
          return true;
      }
    }

    return false;
  }

  console.log('ConfigManager.js: Loaded successfully.');
})();