(function() {
    "use strict";

    console.log('[SmsGenerator] Script loaded. (Ver 2.4 - Timestamp Save & JP Date Fix)');

    const CONFIG = {
        SPACE_ID: 'SmsGenerator',
        BASE_URL: 'https://93ac276f.form.kintoneapp.com/public/confirmation',
        FIELDS: {
            PHONE: '電話1',
            REQ: '用件',
            RES_DATE: '確定予約日',
            RES_TIME: '確定予約時刻',
            DEPT: '診療科',
            CHART_NO: 'カルテNo',
            DOB: '生年月日', // 文字列フィールド：例「1977年 (昭和52年) 7月 7日」
            SMS_GEN_DT: 'SMS作成日時' // 【追加】作成日時保存用（文字列1行）
        },
        MESSAGES: {
            '初診': 'こちらは湘南東部病院予約センターです。\n初診予約を確定しますので下記よりお願いします。\n{URL}',
            '変更': 'こちらは湘南東部病院予約センターです。\n変更予約を確定しますので下記よりお願いします。\n{URL}',
            '取消': 'こちらは湘南東部病院予約センターです。\n予約を取消しました。下記よりご確認ください。\n{URL}',
            'default': 'こちらは湘南東部病院予約センターです。\n下記より内容をご確認ください。\n{URL}'
        },
        SALT: 'shonan_tobu_auth_v1_secret' 
    };

    // ハッシュ関数
    function generateHash(text) {
        let hash = 0;
        if (text.length === 0) return hash;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return Math.abs(hash).toString(16);
    }

    // 日時フォーマット関数
    function formatDateTime(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${min}`;
    }

    function copyToClipboard(text, btnElement) {
        if (!text) { alert('コピーする内容がありません。'); return; }
        navigator.clipboard.writeText(text).then(() => {
            const originalText = btnElement.innerText;
            btnElement.innerText = '完了!';
            btnElement.classList.add('copied');
            setTimeout(() => {
                btnElement.innerText = originalText;
                btnElement.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('[SmsGenerator] Copy failed:', err);
            alert('コピーに失敗しました。');
        });
    }

    function safeGetValue(record, fieldCode) {
        if (record && record[fieldCode]) {
            return record[fieldCode].value || '';
        }
        // SMS作成日時など、必須ではないフィールドのエラーログは抑制
        if (fieldCode !== CONFIG.FIELDS.SMS_GEN_DT) {
             console.error(`[SmsGenerator] Field not found: "${fieldCode}".`);
        }
        return '';
    }

    // モーダル表示
    function showDialog(data) {
        const existingModal = document.getElementById('sms-gen-modal');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'sms-gen-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0,0,0,0.5); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: #fff; padding: 20px; border-radius: 5px;
            width: 600px; max-width: 90%; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            font-family: sans-serif;
        `;

        const title = document.createElement('h2');
        title.innerText = 'SMS送信データ生成';
        title.style.margin = '0 0 10px 0';
        title.style.borderBottom = '1px solid #ccc';
        dialog.appendChild(title);

        const timeInfo = document.createElement('p');
        timeInfo.innerText = `生成日時: ${data.genDt}`;
        timeInfo.style.fontSize = '12px';
        timeInfo.style.color = '#666';
        timeInfo.style.textAlign = 'right';
        timeInfo.style.margin = '5px 0 15px 0';
        dialog.appendChild(timeInfo);

        const createRow = (label, value, rows = 1) => {
            const container = document.createElement('div');
            container.style.marginBottom = '15px';
            const labelEl = document.createElement('label');
            labelEl.innerText = label;
            labelEl.style.fontWeight = 'bold';
            labelEl.style.display = 'block';
            const flexBox = document.createElement('div');
            flexBox.style.display = 'flex';
            flexBox.style.gap = '10px';
            const textarea = document.createElement('textarea');
            textarea.value = value || '';
            textarea.readOnly = true;
            textarea.rows = rows;
            textarea.style.cssText = 'flex-grow: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;';
            const copyBtn = document.createElement('button');
            copyBtn.innerText = 'コピー';
            copyBtn.style.cssText = 'width: 80px; cursor: pointer; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px;';
            copyBtn.onclick = function() { copyToClipboard(textarea.value, this); };
            flexBox.appendChild(textarea);
            flexBox.appendChild(copyBtn);
            container.appendChild(labelEl);
            container.appendChild(flexBox);
            return container;
        };

        dialog.appendChild(createRow('① 送信先電話番号', data.phone, 1));
        dialog.appendChild(createRow('② 本文メッセージ', data.body, 4));
        dialog.appendChild(createRow('③ 短縮元URL', data.longUrl, 3));

        const btnContainer = document.createElement('div');
        btnContainer.style.textAlign = 'center';
        btnContainer.style.marginTop = '20px';
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '閉じる';
        closeBtn.style.cssText = 'padding: 10px 30px; background-color: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer;';
        closeBtn.onclick = () => overlay.remove();
        btnContainer.appendChild(closeBtn);
        dialog.appendChild(btnContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    function handleGenerate(event) {
        const record = event.record;
        const recordId = kintone.app.record.getId(); // 現在のレコードID
        
        const rawPhone = safeGetValue(record, CONFIG.FIELDS.PHONE);
        const req = safeGetValue(record, CONFIG.FIELDS.REQ);
        const resDate = safeGetValue(record, CONFIG.FIELDS.RES_DATE);
        const resTime = safeGetValue(record, CONFIG.FIELDS.RES_TIME);
        let dept = safeGetValue(record, CONFIG.FIELDS.DEPT);
        const chartNo = safeGetValue(record, CONFIG.FIELDS.CHART_NO);
        const dobString = safeGetValue(record, CONFIG.FIELDS.DOB);

        if (!resDate || !resTime) { alert('「確定予約日」と「確定予約時刻」が入力されていません。'); return; }
        if (!dobString) { alert('「生年月日」が入力されていません。'); return; }

        const phone = rawPhone.replace(/-/g, '');
        const now = new Date();
        const genDtStr = formatDateTime(now);
        const resDtStr = `${resDate} ${resTime}`;

        if (dept && dept.indexOf('/') !== -1) {
            const parts = dept.split('/');
            dept = parts[parts.length - 1].trim();
        }

        // DOB正規化 (Ver 2.3ロジック維持)
        let normalizedDob = "";
        try {
            const jpMatch = dobString.match(/([0-9]{4})年.*?([0-9]{1,2})月.*?([0-9]{1,2})日/);
            if (jpMatch) {
                const y = jpMatch[1];
                const m = jpMatch[2].padStart(2, '0');
                const d = jpMatch[3].padStart(2, '0');
                normalizedDob = `${y}-${m}-${d}`;
            } else {
                const simple = dobString.replace(/\//g, '-').replace(/[^\d-]/g, '');
                const parts = simple.split('-');
                if (parts.length === 3) {
                    const y = parts[0];
                    const m = parts[1].padStart(2, '0');
                    const d = parts[2].padStart(2, '0');
                    normalizedDob = `${y}-${m}-${d}`;
                }
            }
        } catch (e) {
            console.error('[SmsGenerator] DOB Parse Error:', e);
        }

        if (!normalizedDob) {
            alert('生年月日の形式を解析できませんでした。');
            return;
        }

        let messageBody = CONFIG.MESSAGES['default'];
        if (req === '初診' || req === '変更' || req === '取消') {
            messageBody = CONFIG.MESSAGES[req];
        }

        const params = new URLSearchParams();
        if (resDtStr) params.append('res_dt', resDtStr);
        if (dept) params.append('dept', dept);
        if (req) params.append('req', req);
        params.append('gen_dt', genDtStr);
        if (chartNo) params.append('ID', chartNo);
        
        const hashBase = normalizedDob + CONFIG.SALT;
        const authHash = generateHash(hashBase);
        params.append('auth', authHash);
        
        const longUrl = `${CONFIG.BASE_URL}?${params.toString()}`;

        // 【追加】Kintoneレコードへの保存処理
        const body = {
            app: kintone.app.getId(),
            id: recordId,
            record: {}
        };
        body.record[CONFIG.FIELDS.SMS_GEN_DT] = { value: genDtStr };

        kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
            console.log('[SmsGenerator] Timestamp saved to Kintone:', genDtStr);
            // 保存成功後にダイアログ表示
            showDialog({
                phone: phone,
                body: messageBody,
                longUrl: longUrl,
                genDt: genDtStr
            });
            
            // 画面上の値も更新してあげる（リロードなしで反映見えるように）
            const el = kintone.app.record.getFieldElement(CONFIG.FIELDS.SMS_GEN_DT);
            if(el) el.innerText = genDtStr;

        }, function(error) {
            console.error('[SmsGenerator] Save failed:', error);
            alert('「SMS作成日時」の保存に失敗しましたが、データ生成は続行します。\n(エラー: ' + error.message + ')');
            // 保存失敗してもダイアログは出す
            showDialog({
                phone: phone,
                body: messageBody,
                longUrl: longUrl,
                genDt: genDtStr
            });
        });
    }

    kintone.events.on('app.record.detail.show', function(event) {
        const spaceElement = kintone.app.record.getSpaceElement(CONFIG.SPACE_ID);
        if (!spaceElement || document.getElementById('sms-gen-btn')) return event;

        const btn = document.createElement('button');
        btn.id = 'sms-gen-btn';
        btn.innerText = 'SMSデータ生成';
        btn.style.cssText = 'padding: 10px 20px; background-color: #005a9e; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);';
        
        btn.onclick = () => {
            // REST APIを使うため、event.recordではなく最新を取得する
            const currentRecord = kintone.app.record.get();
            handleGenerate({ record: currentRecord ? currentRecord.record : event.record });
        };

        spaceElement.appendChild(btn);
        return event;
    });
})();