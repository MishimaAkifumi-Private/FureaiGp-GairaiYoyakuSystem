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
  const STORAGE_JSON_FIELD = '設定情報';   // 設定JSON格納フィールド

  // 公開済みデータのキャッシュ
  let publishedRecordsMap = new Map();
  let publishedDescriptions = {};
  let publishedDepartmentSettings = {}; // ★追加: 診療科単位の設定キャッシュ
  let lastPublishedAt = null;
  let isDataOldFormat = false;

  window.ShinryoApp.ConfigManager = {
    init: initConfigManager,
    fetchPublishedData: fetchPublishedData,
    saveConfig: saveConfig,
    checkDiff: checkDiff,
    hasUnsavedChanges: hasUnsavedChanges,
    updateStatusImmediately: updateStatusImmediately,
    updateStatusBatch: updateStatusBatch,
    updateDepartmentStatus: updateDepartmentStatus,
    updateDepartmentTerm: updateDepartmentTerm, // ★追加
    getLastPublishedAt: () => lastPublishedAt,
    getPublishedDescriptions: () => publishedDescriptions,
    getDepartmentSettings: () => publishedDepartmentSettings, // ★追加
    isOldFormat: () => isDataOldFormat
  };

  function initConfigManager() {
    console.log('ConfigManager initialized.');
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
        const jsonField = resp.records[0][STORAGE_JSON_FIELD];
        if (!jsonField) {
            console.warn(`ConfigManager: Field '${STORAGE_JSON_FIELD}' not found in App ${STORAGE_APP_ID}. Treating as empty.`);
        }
        const jsonStr = jsonField ? jsonField.value : null;
        const data = JSON.parse(jsonStr || '{}');
        
        // ★★★ デバッグ用ログ出力（取得データ） ★★★
        console.group('ConfigManager: fetchPublishedData Debug');
        console.log('[[DEBUG]] Raw JSON fetched from App 200 (Length):', jsonStr ? jsonStr.length : 0);
        console.log('[[DEBUG]] Parsed Data from App 200:', data);
        console.groupEnd();

        let records = [];
        if (Array.isArray(data)) {
            records = data;
            publishedDescriptions = {};
            publishedDepartmentSettings = {};
            isDataOldFormat = true;
        } else {
            records = data.records || [];
            publishedDescriptions = data.descriptions || {};
            publishedDepartmentSettings = data.departmentSettings || {}; // ★追加: 読み込み
            isDataOldFormat = false;
        }

di        // ★★★ 一時的対応: データ量が多すぎるため、取得時に一部のみに制限する ★★★
        if (records.length > 10) {
            console.warn('ConfigManager: [DEBUG] Fetching only top 10 records for debugging.');
            records = records.slice(0, 10);
        }

        publishedRecordsMap = new Map(records.map(r => [String(r.$id.value), r])); // ★変更: IDを文字列に統一

        console.log('ConfigManager: Published data fetched.', data);
      }
    } catch (e) {
      console.error('ConfigManager: Failed to fetch published data.', e);
      throw e; // エラー時は例外を投げて中断（空データでの上書き防止）
    }
    
    // データがない場合は空で初期化
    publishedRecordsMap = new Map();
    publishedDescriptions = {};
    publishedDepartmentSettings = {};
    lastPublishedAt = null;
    isDataOldFormat = false;
    return { records: [], descriptions: {}, departmentSettings: {} };
  }

  /**
   * 現在のアプリの状態をJSONとして共通設定保管アプリに保存（公開）する
   */
  async function saveConfig(currentRecords, currentDescriptions, currentDeptSettings) {
    const myAppId = kintone.app.getId();

    // ★★★ 一時的対応: データ量が多すぎるため、保存時に一部のみに制限する ★★★
    let recordsToSave = currentRecords;
    if (recordsToSave.length > 10) {
        console.warn('ConfigManager: [DEBUG] Saving only top 10 records for debugging.');
        recordsToSave = recordsToSave.slice(0, 10);
    }

    const data = {
      records: recordsToSave,
      descriptions: currentDescriptions,
      departmentSettings: currentDeptSettings || publishedDepartmentSettings // ★追加: 指定がなければキャッシュを使用
    };
    const jsonStr = JSON.stringify(data);

    // ★★★ デバッグ用ログ出力（保存データ） ★★★
    console.group('ConfigManager: saveConfig Debug');
    console.log('[[DEBUG]] Data Object to be saved (Local):', data);
    console.log('[[DEBUG]] JSON String to be saved (Length):', jsonStr.length);
    console.groupEnd();

    try {
      // 既存レコードの確認 (fetchPublishedDataのロジックを再利用または別途クエリ)
      // ここでは簡易的にGETしてレコードIDを取得
      const query = `${STORAGE_KEY_FIELD} = "${myAppId}" limit 1`;
      const apiPathGet = kintone.api.url('/k/v1/records', true);
      const baseUrlGet = /^https?:\/\//.test(apiPathGet) ? apiPathGet : window.location.origin + apiPathGet;
      const getUrl = baseUrlGet + `?app=${STORAGE_APP_ID}&query=${encodeURIComponent(query)}&_t=${new Date().getTime()}`; // ★変更: タイムスタンプ付与
      
      // GETリクエスト用ヘッダー (Content-Typeを含めない)
      const getHeaders = { 'X-Cybozu-API-Token': STORAGE_API_TOKEN };
      
      const [getBody, getStatus] = await kintone.proxy(getUrl, 'GET', getHeaders, {});
      if (getStatus !== 200) throw new Error(`Failed to check existing records. Status: ${getStatus}, Body: ${getBody}`);
      
      const getResp = JSON.parse(getBody);

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

      if (getResp.records && getResp.records.length > 0) {
        method = 'PUT';
        bodyParams = {
          app: STORAGE_APP_ID,
          id: getResp.records[0].$id.value,
          record: {
            [STORAGE_JSON_FIELD]: { value: jsonStr }
          }
        };
      } else {
        console.log('ConfigManager: Target record not found in App 200. Creating new record.');
      }

      const [saveBody, saveStatus] = await kintone.proxy(apiUrl, method, saveHeaders, JSON.stringify(bodyParams));
      if (saveStatus !== 200) throw new Error(`Save failed. Status: ${saveStatus}, Body: ${saveBody}`);

      console.log('ConfigManager: Config saved successfully.');
    } catch (e) {
      console.error('ConfigManager: Failed to save config.', e);
      throw e;
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
        
        await saveConfig(currentPublished.records, descriptions, currentPublished.departmentSettings);
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
        settings[deptName] = { start: start, duration: duration };
        
        await saveConfig(currentPublished.records, currentPublished.descriptions, settings);
        console.log(`ConfigManager: Department ${deptName} term updated to start:${start}, duration:${duration}`);
      }
    } catch (e) {
      console.error('ConfigManager: Failed to update department term.', e);
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
    const simpleFields = ['診療分野', '診療科', '医師名', '診療選択', '掲載', '施設名', '表示順'];
    
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