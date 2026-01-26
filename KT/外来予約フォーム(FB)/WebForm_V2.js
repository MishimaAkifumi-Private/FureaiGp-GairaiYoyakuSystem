(function() {
  "use strict";

  // 【デバッグ】起動確認ログ
  console.log('%c[Gemini Debug] Script Loaded. Version: Force-Visible-v4', 'background: #000; color: #bada55; padding: 5px; font-weight: bold;');

  try {
      if (typeof window.fb === 'undefined') { window.fb = { events: { form: {} } }; }
      else if (typeof window.fb.events === 'undefined') { window.fb.events = { form: {} }; }
      window.fb.events.form.submit = window.fb.events.form.submit || [];
      window.fb.events.form.mounted = window.fb.events.form.mounted || [];

      // ★追加: URLパラメータによるプレビューモード判定
      const urlParams = new URLSearchParams(window.location.search);
      const isPreviewMode = urlParams.has('preview') && urlParams.get('preview') === '1';

      if (isPreviewMode) {
          console.log('%c[Gemini] PREVIEW MODE ACTIVATED', 'background: #e74c3c; color: #fff; font-size: 14px; padding: 4px; font-weight: bold;');
          
          // プレビューバナーの表示
          const banner = document.createElement('div');
          banner.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; background-color: #e67e22; color: #fff; text-align: center; padding: 10px 0; font-weight: bold; z-index: 9999999; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-size: 14px; letter-spacing: 0.05em;';
          banner.innerHTML = '⚠️ 現在プレビューモードで表示しています';
          document.body.appendChild(banner);
          document.body.style.marginTop = '40px'; // バナー分下げる
      }

      let isProgrammaticChange = false;

      const config = {
          // kViewer API URLs (App200)
          API_URL_PUBLIC: 'https://9634221e.viewer.kintoneapp.com/public/api/records/5236d36cc13bb6a3c61fcea761caa6e258500fbfe1a2557b64f5deb46577685c/1',
          // ★TODO: プレビュー用ビュー(設定情報2のみ公開)を作成し、そのAPI URLを以下に設定してください。現在は本番用と同じURLになっています。
          API_URL_PREVIEW: 'https://9634221e.viewer.kintoneapp.com/public/api/records/5236d36cc13bb6a3c61fcea761caa6e258500fbfe1a2557b64f5deb46577685c/1',

          PUBLIC_HOLIDAY_API_URL: 'https://holidays-jp.github.io/api/v1/date.json',
          ZIPCLOUD_API_URL: 'https://zipcloud.ibsnet.co.jp/api/search',

          fbFields: {
              REQUIREMENT: '用件',
              FACILITY_NAME: '施設名',
              REFERRAL_HOSPITAL: '紹介元医療機関名',
              REFERRAL_TEL: '紹介元医療機関電話番号',
              REFERRAL_CD: '持参画像CD',
              DOCTOR: '担当医師',
              YOYAKU_METHOD: '希望指定方法',
              APPLICANT: '申込者',
              APPLICANT_SUPPLEMENT: '申込者補足',
              CHART_NO: 'カルテNo',
              LAST_NAME_KANJI: '姓漢字',
              FIRST_NAME_KANJI: '名漢字',
              LAST_NAME_KANA: '姓かな',
              FIRST_NAME_KANA: '名かな',
              DOB: '生年月日',
              GENDER: '性別',
              POSTAL_CODE: '郵便番号',
              ADDRESS: '住所',
              STREET: '丁目番地等',
              BUILDING: '建物',
              TEL1: '電話1',
              TEL2: '電話2',
              CONTACT_TIME: '連絡時間帯',
              EMAIL: 'メールアドレス',
              PRIVACY_AGREE: '個人情報同意',
              HIDDEN_SUBMIT_FLAG: '送信フラグ',
              FIXED_DATETIME: '予約日時',
              DEPARTMENT_COMBINED: '診療科',
              WISH_TIME_OMAKASE: 'おまかせ希望時間帯',
              REASON: '理由',
              SYMPTOM: '症状',
              WISH_1: '第1希望日時',
              WISH_2: '第2希望日時',
              WISH_3: '第3希望日時',
              WISH_4: '第4希望日時',
              WISH_5: '第5希望日時',
              OTHER_NOTES: 'その他備考',
          },

          jsonKeys: {
              BUNYA: '診療分野',
              DEPARTMENT: '診療科',
              TOKUTEI_SHINRYO: '診療選択',
              DOCTOR: '医師名',
              GUIDANCE: '留意案内',
              FACILITY_NAME: '施設名',
              OFFSET_DAYS: '予約開始',
              DURATION_DAYS: '予約可能期間',
              NG_DATES: '直近NG日指定',
              SCHEDULE_MAP_SUFFIX: '週診療日',
              CHART_CARD_IMAGE: '診察券イメージ',
              PUBLICATION_STATUS: '掲載',
          },

          uiIds: {
              WIZARD_CONTAINER: 'gemini-wizard-container',
              PATIENT_FORM_CONTAINER: 'gemini-patient-form-container',
              SUMMARY_CONTAINER: 'gemini-summary-container',
              NAVIGATION_CONTAINER: 'gemini-navigation-container',
              MAIN_CONTAINER: 'gemini-reservation-wizard',
              COMMON_LABEL_AREA: 'gemini-common-label-area',
              REQUIREMENT_SPECIFIC_LABEL_AREA: 'gemini-requirement-specific-label-area',
              REQUIREMENT_AREA: 'gemini-requirement-area',
              REFERRAL_AREA: 'gemini-referral-area',
              REASON_AREA: 'gemini-reason-area',
              REASON_TEXTAREA: 'gemini-reason-textarea',
              GUIDANCE_AREA: 'gemini-guidance-area',
              DOCTOR_GUIDANCE_AREA: 'gemini-doctor-guidance-area',
              FIXED_DATE_AREA: 'gemini-fixed-date-area',
              NEW_RESERVATION_AREA: 'gemini-new-reservation-area',
              MULTI_STAGE_AREA: 'gemini-multistage-select-area',
              DOCTOR_AREA: 'gemini-doctor-area',
              METHOD_AREA: 'gemini-method-area',
              WISH_DATES_AREA: 'gemini-wish-dates-area',
              OMAKASE_TIME_AREA: 'gemini-omakase-time-area',
              APPLICANT_SUPPLEMENT_AREA: 'gemini-applicant-supplement-area',
              APPLICANT_SUPPLEMENT_INPUT: 'gemini-applicant-supplement-input',
              CHART_NO: 'patient-chart-no',
              LAST_NAME_KANJI: 'patient-last-name-kanji',
              FIRST_NAME_KANJI: 'patient-first-name-kanji',
              LAST_NAME_KANA: 'patient-last-name-kana',
              FIRST_NAME_KANA: 'patient-first-name-kana',
              DOB_YEAR: 'patient-dob-year',
              DOB_MONTH: 'patient-dob-month',
              DOB_DAY: 'patient-dob-day',
              POSTAL_CODE: 'patient-postal-code',
              ADDRESS_SEARCH_BTN: 'patient-address-search-btn',
              ADDRESS: 'patient-address',
              STREET: 'patient-street',
              BUILDING: 'patient-building',
              TEL1: 'patient-tel1',
              TEL2: 'patient-tel2',
              CONTACT_TIME: 'patient-contact-time',
              EMAIL: 'patient-email',
              EMAIL_CONFIRM: 'patient-email-confirm',
              EMAIL_ERROR_MSG: 'patient-email-error-msg',
              PRIVACY_AGREE: 'patient-privacy-agree'
          },

          state: {
              currentStep: 1,
              submitData: {}, 
              kintoneCommonRecord: null,
              kintoneRecords: [],
              publicHolidays: {},
              companyHolidays: [],
              requirement: null,
              selectedBunya: null,
              selectedDepartment: null,
              selectedTokuteiShinryo: null,
              selectedDoctor: null,
              yoyakuMethod: null,
              selectedWishDateTimes: { 1: null, 2: null, 3: null, 4: null, 5: null },
              descriptions: {},
              labelSettings: {}, 
          },

          MAX_WISH_DATES: 5,
          WEEKDAYS_JP: ["日", "月", "火", "水", "木", "金", "土"],
          DEFAULT_DOCTOR_OPTION: 'おまかせ',
          SAME_DOCTOR_OPTION: '前回の医師',
          FLEXIBLE_TIME_OPTION: '午前でも午後でもよい',
          get TIME_OPTIONS() {
            return ['午前', '午後', this.FLEXIBLE_TIME_OPTION]
          },
          YOYAKU_METHOD_AUTO: 'おまかせ',
          YOYAKU_METHOD_SPECIFIC: '希望日を指定',
          TOOLTIPS: {
              omakase: '※最も早く予約できる日時を当院で調整し、ご連絡します。',
              specific: '※ご希望の予約日や時間帯を、第5希望まで指定できます。'
          }
      };

      /****************************************************************
       * ステップ管理・ナビゲーション
       ****************************************************************/
      function switchStep(step) {
        config.state.currentStep = step;
        
        // Host要素（bootstrapperで特定したもの）にクラスを付与
        const host = document.getElementById(config.uiIds.WIZARD_CONTAINER)?.parentNode;
        if (host) {
            host.classList.remove('gemini-step-1', 'gemini-step-2');
            host.classList.add(`gemini-step-${step}`);
        }

        const wizard = document.getElementById(config.uiIds.MAIN_CONTAINER);
        const patientForm = document.getElementById(config.uiIds.PATIENT_FORM_CONTAINER);
        const summary = document.getElementById(config.uiIds.SUMMARY_CONTAINER);
        
        const showMainForm = (step === 1);
        
        if(wizard) wizard.style.display = showMainForm ? 'block' : 'none';
        if(patientForm && config.state.requirement) patientForm.style.display = showMainForm ? 'block' : 'none';
        if(summary) summary.style.display = showMainForm ? 'none' : 'block';

        if (!showMainForm) {
            showFinalSummary();
        }
        
        updateNavigationButtons();
        window.scrollTo(0, 0);
      }

      function updateNavigationButtons() {
          const navContainer = document.getElementById(config.uiIds.NAVIGATION_CONTAINER);
          if (!navContainer) return;
          
          if (!config.state.requirement) {
              navContainer.innerHTML = '';
              navContainer.style.display = 'none';
              return;
          }
          
          navContainer.innerHTML = '';
          navContainer.style.display = 'block';

          const oldBackBtn = document.querySelector('.gemini-injected-back-btn');
          if (oldBackBtn) {
              oldBackBtn.remove();
          }

          if (config.state.currentStep === 1) {
              const nextBtn = document.createElement('button');
              nextBtn.type = 'button';
              nextBtn.className = 'gemini-nav-btn gemini-btn-primary';
              nextBtn.textContent = '入力内容を確認する';

              nextBtn.addEventListener('click', () => {
                  const isWishDateValid = isStep1Complete();
                  // ホスト内のバリデーションチェック（もし可能なら）
                  const form = document.querySelector('form'); 
                  const isFormValid = form ? form.checkValidity() : true;

                  if (isWishDateValid && isFormValid) {
                      switchStep(2);
                  } else {
                      if (form && !isFormValid) {
                          form.reportValidity();
                      }
                      
                      if (!isWishDateValid) {
                          alert('「希望日を指定」を選択した場合は、第1～5希望のうち少なくとも1つの日時を選択してください。');
                          const wishDatesArea = document.getElementById(config.uiIds.WISH_DATES_AREA);
                          if (wishDatesArea) {
                              wishDatesArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                      }
                  }
              });
              navContainer.appendChild(nextBtn);
          } else if (config.state.currentStep === 2) {
              navContainer.style.display = 'none';
              
              updateFbField(config.fbFields.HIDDEN_SUBMIT_FLAG, 'On');

              // ボタンの探索（複数パターン）
              const submitButton = document.querySelector('.fb-submit') || 
                                   document.querySelector('.fb-custom--button--submit button') ||
                                   document.querySelector('button[type="submit"]');
              
              if (submitButton) {
                  const parent = submitButton.closest('div') || submitButton.parentNode;
                  const oldBackBtn = parent.querySelector('.gemini-injected-back-btn');
                  if (!oldBackBtn) {
                      const backBtn = document.createElement('button');
                      backBtn.type = 'button';
                      backBtn.className = 'gemini-nav-btn gemini-injected-back-btn';
                      backBtn.textContent = '修正する';
                      backBtn.style.marginRight = '10px';
                      backBtn.addEventListener('click', () => {
                          switchStep(1);
                      });
                      parent.insertBefore(backBtn, submitButton);
                  }
              }
          }
      }

      function createSummaryRow(label, value) {
          let displayValue = '';
          if (value !== null && typeof value !== 'undefined' && value.toString().trim() !== '') {
              const valueStr = value.toString();
              if (valueStr.startsWith('_WISH_HTML_')) {
                  displayValue = valueStr.replace('_WISH_HTML_', '');
              } else {
                  displayValue = valueStr.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
              }
          }
          return `<tr><th>${label}</th><td>${displayValue}</td></tr>`;
      }
      
      function getReservationSummaryHtml() {
          const rec = config.state.submitData;
          let html = '';

          const requirement = rec[config.fbFields.REQUIREMENT] || '';
          
          const requirementDisplayMap = {
              '変更': '予約日時を変更したい',
              '取消': '予約を取り消したい',
              '初診': '初診で予約したい'
          };
          html += createSummaryRow('ご用件', requirementDisplayMap[requirement] || requirement);

          if (requirement === '初診') {
              html += createSummaryRow('紹介元医療機関名', rec[config.fbFields.REFERRAL_HOSPITAL]);
              html += createSummaryRow('紹介元医療機関電話番号', rec[config.fbFields.REFERRAL_TEL]);
              html += createSummaryRow('持参画像CD', rec[config.fbFields.REFERRAL_CD]);
          }

          if (requirement === '変更' || requirement === '取消') {
            html += createSummaryRow('現在の予約日時', rec[config.fbFields.FIXED_DATETIME]);
          }

          if (requirement !== '取消') {
            const combinedShinryo = rec[config.fbFields.DEPARTMENT_COMBINED] || '';
            html += createSummaryRow('診療科', combinedShinryo);
            html += createSummaryRow('担当医師', rec[config.fbFields.DOCTOR]);
            
            const yoyakuMethod = rec[config.fbFields.YOYAKU_METHOD] || '';
            html += createSummaryRow('予約方法', yoyakuMethod);

            if(yoyakuMethod === config.YOYAKU_METHOD_SPECIFIC) {
                let wishHtml = '<ul>';
                let hasWish = false;
                for(let i = 1; i <= config.MAX_WISH_DATES; i++){
                    const wishValue = rec[config.fbFields['WISH_' + i]];
                    if(wishValue) {
                        wishHtml += `<li>第${i}希望: ${wishValue}</li>`;
                        hasWish = true;
                    }
                }
                wishHtml += '</ul>';
                if(hasWish) html += createSummaryRow('希望日時', `_WISH_HTML_${wishHtml}`);
            } else {
                 html += createSummaryRow('希望時間帯', rec[config.fbFields.WISH_TIME_OMAKASE]);
            }
          }
          
          return html;
      }

      function showFinalSummary() {
          const summaryContainer = document.getElementById(config.uiIds.SUMMARY_CONTAINER);
          const rec = config.state.submitData;
          let html = '<p>以下の内容で申し込みます。よろしければページ下部の回答ボタンを押してください。</p>';
          
          html += `<h3>ご入力内容の確認</h3><div class="gemini-summary-box"><table>`;
          html += getReservationSummaryHtml();

          const requirement = rec[config.fbFields.REQUIREMENT] || '';
          if (requirement === '初診') {
              html += createSummaryRow('症状', rec[config.fbFields.SYMPTOM]);
          } else if (requirement === '変更' || requirement === '取消') {
              const reasonLabel = `${requirement}理由`;
              html += createSummaryRow(reasonLabel, rec[config.fbFields.REASON]);
          }
          
          html += createSummaryRow('申込者', rec[config.fbFields.APPLICANT]);
          html += createSummaryRow('申込者補足', rec[config.fbFields.APPLICANT_SUPPLEMENT]);
          html += createSummaryRow('カルテNo', rec[config.fbFields.CHART_NO]);
          const name = `${rec[config.fbFields.LAST_NAME_KANJI]} ${rec[config.fbFields.FIRST_NAME_KANJI]}`;
          html += createSummaryRow('お名前（漢字）', name);
          const kana = `${rec[config.fbFields.LAST_NAME_KANA]} ${rec[config.fbFields.FIRST_NAME_KANA]}`;
          html += createSummaryRow('お名前（ふりがな）', kana);
          html += createSummaryRow('生年月日', rec[config.fbFields.DOB]);
          html += createSummaryRow('性別', rec[config.fbFields.GENDER]);
          html += createSummaryRow('郵便番号', rec[config.fbFields.POSTAL_CODE]);
          
          const address = [
              rec[config.fbFields.ADDRESS],
              rec[config.fbFields.STREET],
              rec[config.fbFields.BUILDING]
          ].filter(Boolean).join(' ');
          html += createSummaryRow('住所', address);
          
          html += createSummaryRow('電話番号①', rec[config.fbFields.TEL1]);
          html += createSummaryRow('電話番号②', rec[config.fbFields.TEL2]);
          html += createSummaryRow('連絡時間帯', rec[config.fbFields.CONTACT_TIME]);
          html += createSummaryRow('メールアドレス', rec[config.fbFields.EMAIL]);
          html += createSummaryRow('その他何かありましたらご記入ください', rec[config.fbFields.OTHER_NOTES]);
          
          html += createSummaryRow('個人情報について', rec[config.fbFields.PRIVACY_AGREE]);

          html += '</table></div>';

          if (summaryContainer) {
            summaryContainer.innerHTML = html;
          }
      }

      async function fetchData() {
          try {
              console.log('[Gemini Debug] Start fetching data...');
              await Promise.all([fetchKintoneData(), fetchPublicHolidays()]);
              console.log('[Gemini Debug] Fetch data complete.');
          } catch (error) {
              console.error('[ERROR] データ取得中にエラーが発生しました:', error);
          }
      }

      function inflateRecord(compressedRecord) {
          const inflated = {};
          inflated.$id = { type: '__ID__', value: compressedRecord.$id || null };
          
          Object.keys(compressedRecord).forEach(key => {
              if (key === '$id') return;
              const val = compressedRecord[key];
              
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

      async function fetchKintoneData() {
          // ★変更: モードに応じてAPI URLを切り替え
          const url = isPreviewMode ? config.API_URL_PREVIEW : config.API_URL_PUBLIC;
          console.log(`[Gemini] Fetching Kintone data from: ${url} (Mode: ${isPreviewMode ? 'PREVIEW' : 'PUBLIC'})`);
          
          const response = await fetch(url);
          if (!response.ok) throw new Error(`kViewer API request failed: ${response.status}`);
          const data = await response.json();
          console.log('[Gemini] Kintone data received:', data);
          if (!data.records || data.records.length === 0) throw new Error('kViewerからレコードが見つかりません。');
          config.state.kintoneCommonRecord = data.records[0];
          
          const commonRecord = config.state.kintoneCommonRecord;
          // ★変更: モードに応じて読み込むフィールドを切り替え
          const jsonFieldKey = isPreviewMode ? '設定情報2' : '設定情報';
          console.log(`[Gemini] Reading JSON from field: ${jsonFieldKey}`);

          let jsonString = commonRecord[jsonFieldKey]?.value;
          if (isPreviewMode && !jsonString) {
              console.warn('[Gemini] Preview JSON field (設定情報2) is empty. Falling back to Public JSON (設定情報).');
              jsonString = commonRecord['設定情報']?.value;
          }

          if(!jsonString) throw new Error('設定情報フィールドにJSONデータがありません。');
          
          const parsedData = JSON.parse(jsonString);
          if (parsedData && !Array.isArray(parsedData) && parsedData.records) {
              config.state.kintoneRecords = parsedData.records.map(inflateRecord);
              config.state.descriptions = parsedData.descriptions || {};
              config.state.labelSettings = parsedData.labelSettings || {}; 
          } else {
              config.state.kintoneRecords = Array.isArray(parsedData) ? parsedData : [];
              config.state.descriptions = {};
          }

          const holidays = [];
          for (const key in commonRecord) {
              if ((key.startsWith('A休診DATE') || key.startsWith('B休診DATE')) && commonRecord[key].value) {
                  const holidayDate = new Date(commonRecord[key].value);
                  holidayDate.setHours(0, 0, 0, 0);
                  holidays.push(holidayDate);
              }
          }
          config.state.companyHolidays = holidays;
      }

      async function fetchPublicHolidays() {
          const response = await fetch(config.PUBLIC_HOLIDAY_API_URL);
          if (!response.ok) console.error(`[WARN] 祝日APIの取得に失敗しました: ${response.status}`);
          config.state.publicHolidays = await response.json();
      }

      async function fetchAddress(postalCode) {
        try {
          const response = await fetch(`${config.ZIPCLOUD_API_URL}?zipcode=${postalCode}`);
          if (!response.ok) throw new Error(`Status ${response.status}`);
          const data = await response.json();
          if (data.status === 200 && data.results && data.results.length > 0) return data.results[0];
          return null;
        } catch (error) {
          console.error('[郵便番号検索] エラー:', error);
          return null;
        }
      }
      
      function updateFbField(fieldCode, value) {
          config.state.submitData[fieldCode] = value;
      }
      
      function isStep1Complete() {
          const { yoyakuMethod } = config.state;
          if (yoyakuMethod === config.YOYAKU_METHOD_SPECIFIC) {
              return Object.values(config.state.selectedWishDateTimes).some(v => v && v.date && v.time);
          }
          return true;
      }
      
        function initializeWizardUI(container) {
          container.id = config.uiIds.MAIN_CONTAINER;
          container.innerHTML = `
              <div id="${config.uiIds.WIZARD_CONTAINER}" style="margin-bottom: 20px;"></div>
              <div id="${config.uiIds.COMMON_LABEL_AREA}" class="gemini-rich-text" style="margin-bottom: 20px;"></div>
              <div id="${config.uiIds.REQUIREMENT_AREA}"></div>
              <div id="${config.uiIds.REQUIREMENT_SPECIFIC_LABEL_AREA}" class="gemini-rich-text" style="margin-top: 15px;"></div>
              <div id="${config.uiIds.REFERRAL_AREA}" style="display: none; margin-top: 20px;"></div>
              <div id="${config.uiIds.FIXED_DATE_AREA}" style="display: none; margin-top: 20px;"></div>
              <div id="${config.uiIds.NEW_RESERVATION_AREA}" style="display: none; padding-top: 20px; margin-bottom: 20px;">
                  <div id="${config.uiIds.MULTI_STAGE_AREA}"></div>
                  <div id="${config.uiIds.METHOD_AREA}" style="display: none; margin-top: 20px;"></div>
                  <div id="${config.uiIds.WISH_DATES_AREA}" style="display: none; margin-top: 20px;"></div>
                  <div id="${config.uiIds.OMAKASE_TIME_AREA}" style="display: none; margin-top: 20px;"></div>
              </div>
          `;
          createRequirementSection();
      }

      function isAvailable(date, time, records) {
          if (!records || records.length === 0) return false;
          const dateStrYMD = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayOfWeek = date.getDay();
          if (dayOfWeek === 0) return false;
          if (dateStrYMD in config.state.publicHolidays) return false;
          if (config.state.companyHolidays.some(d => d.getTime() === date.getTime())) return false;
          
          return records.some(record => {
              const ngDates = record[config.jsonKeys.NG_DATES]?.value;
              if (Array.isArray(ngDates)) {
                  for (const row of ngDates) {
                      const rowDate = row.value['日付']?.value;
                      const rowTime = row.value['NG時間帯']?.value || [];
                      if (rowDate === dateStrYMD) {
                          if (time === '午前' && rowTime.includes('AM')) return false;
                          if (time === '午後' && rowTime.includes('PM')) return false;
                      }
                  }
              }
              const weekOfMonth = Math.floor((date.getDate() - 1) / 7) + 1;
              const weekDayChar = config.WEEKDAYS_JP[dayOfWeek];
              const scheduleKey = `${weekDayChar}${weekOfMonth}`;
              const schedule = record[scheduleKey]?.value;
              return schedule && schedule.includes(time);
          });
      }
      
      function getFilteredRecords() {
          let records = config.state.kintoneRecords;

          records = records.filter(r => {
              const val = r[config.jsonKeys.PUBLICATION_STATUS]?.value;
              const isStopped = val === '停止' || val === 'Off' || val === 'false';
              return !isStopped;
          });

          if (config.state.descriptions) {
              records = records.filter(r => {
                  const dept = r[config.jsonKeys.DEPARTMENT]?.value;
                  const statusKey = '__status__' + dept;
                  const statusVal = config.state.descriptions[statusKey];
                  const isStopped = statusVal === '停止' || statusVal === 'Off' || statusVal === 'false';
                  return !isStopped;
              });
          }

          if(config.state.selectedBunya) records = records.filter(r => r[config.jsonKeys.BUNYA]?.value?.trim() === config.state.selectedBunya);
          if(config.state.selectedDepartment) records = records.filter(r => r[config.jsonKeys.DEPARTMENT]?.value?.trim() === config.state.selectedDepartment);
          if(config.state.selectedTokuteiShinryo) records = records.filter(r => r[config.jsonKeys.TOKUTEI_SHINRYO]?.value?.trim() === config.state.selectedTokuteiShinryo);
          if(config.state.selectedDoctor && config.state.selectedDoctor !== config.DEFAULT_DOCTOR_OPTION && config.state.selectedDoctor !== config.SAME_DOCTOR_OPTION) {
              records = records.filter(r => r[config.jsonKeys.DOCTOR]?.value === config.state.selectedDoctor);
          }
          return records;
      }

      function normalizeKintoneFontSize(htmlString) {
        if (!htmlString) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const fontTags = doc.body.querySelectorAll('font[size]');
        fontTags.forEach(fontTag => {
          const size = fontTag.getAttribute('size');
          let cssClass = '';
          switch (size) {
            case '1': cssClass = 'fb-font-small'; break;
            case '2': cssClass = 'fb-font-normal'; break;
            case '4': cssClass = 'fb-font-large'; break;
            case '6': cssClass = 'fb-font-huge'; break;
          }
          if (cssClass) {
            const span = document.createElement('span');
            span.className = cssClass;
            while (fontTag.firstChild) span.appendChild(fontTag.firstChild);
            if (fontTag.hasAttribute('color')) span.style.color = fontTag.getAttribute('color');
            fontTag.parentNode.replaceChild(span, fontTag);
          }
        });
        return doc.body.innerHTML;
      }

      function updateProxyLabels(requirement = null) {
          const descriptions = config.state.descriptions;
          if (!descriptions) return;

          const processLabel = (areaId, content) => {
              const area = document.getElementById(areaId);
              if (area && content) {
                  area.innerHTML = normalizeKintoneFontSize(content);
                  toggleSection(areaId, true);
              } else if (area) {
                  area.innerHTML = '';
                  toggleSection(areaId, false);
              }
          };

          processLabel(config.uiIds.COMMON_LABEL_AREA, descriptions['__Global_Header__']);
          
          let requirementKey;
          if (requirement === '変更') requirementKey = '__Global_Change__';
          if (requirement === '初診') requirementKey = '__Global_FirstVisit__';
          if (requirement === '取消') requirementKey = '__Global_Cancel__';
          
          if (requirementKey) {
              processLabel(config.uiIds.REQUIREMENT_SPECIFIC_LABEL_AREA, descriptions[requirementKey]);
          } else {
              toggleSection(config.uiIds.REQUIREMENT_SPECIFIC_LABEL_AREA, false);
          }
      }

      function toggleSection(areaId, show) {
          const section = document.getElementById(areaId);
          if (section) section.style.display = show ? 'block' : 'none';
      }

      function createSelector(parent, type, name, options, defaultVal, isRequired = false) {
          parent.innerHTML = '';
          if (type === 'radio') {
              options.forEach(opt => {
                  const isObject = typeof opt === 'object' && opt !== null;
                  const value = isObject ? opt.value : opt;
                  const displayText = isObject ? opt.displayText : opt;

                  const label = document.createElement('label');
                  const radio = document.createElement('input');
                  radio.type = 'radio';
                  radio.name = name;
                  radio.value = value;
                  radio.checked = (value === defaultVal);
                  if (isRequired) radio.required = true;
                  label.appendChild(radio);
                  label.append(` ${displayText}`);
                  parent.appendChild(label);
              });
          }
      }

     function createRequirementSection() {
          const area = document.getElementById(config.uiIds.REQUIREMENT_AREA);
          area.innerHTML = '';
          
          const titleWrapper = document.createElement('div');
          titleWrapper.className = 'g-form-group required';
          const title = document.createElement('label');
          title.textContent = 'ご用件を選択してください';
          titleWrapper.appendChild(title);
          area.appendChild(titleWrapper);

          const radioContainer = document.createElement('div');
          radioContainer.className = 'g-radio-group';
          
          const options = [
              { value: '変更', displayText: '予約日時を変更したい' },
              { value: '取消', displayText: '予約を取り消したい' },
              { value: '初診', displayText: '初診で予約したい' }
          ];
          createSelector(radioContainer, 'radio', 'requirement', options, null, true);
          area.appendChild(radioContainer);
          radioContainer.addEventListener('change', (e) => {
              const fieldsToClear = [
                  config.fbFields.FIXED_DATETIME, config.fbFields.REFERRAL_HOSPITAL,
                  config.fbFields.REFERRAL_TEL, config.fbFields.REFERRAL_CD, config.fbFields.SYMPTOM,
                  config.fbFields.DEPARTMENT_COMBINED, config.fbFields.DOCTOR,
                  config.fbFields.YOYAKU_METHOD, config.fbFields.WISH_TIME_OMAKASE
              ];
              fieldsToClear.forEach(field => updateFbField(field, ''));
              for (let i = 1; i <= config.MAX_WISH_DATES; i++) {
                  updateFbField(config.fbFields['WISH_' + i], '');
              }
              resetSelections('requirement');

              const reasonTextarea = document.getElementById(config.uiIds.REASON_TEXTAREA);
              if (reasonTextarea) reasonTextarea.required = false;
              
              document.getElementById(config.uiIds.FIXED_DATE_AREA).innerHTML = '';
              document.getElementById(config.uiIds.MULTI_STAGE_AREA).innerHTML = '';
              document.getElementById(config.uiIds.REFERRAL_AREA).innerHTML = '';
              toggleSection(config.uiIds.FIXED_DATE_AREA, false);
              toggleSection(config.uiIds.NEW_RESERVATION_AREA, false);
              toggleSection(config.uiIds.REFERRAL_AREA, false);
              toggleSection(config.uiIds.REASON_AREA, false);

              const value = e.target.value;
              config.state.requirement = value;
              updateFbField(config.fbFields.REQUIREMENT, value);
              updateProxyLabels(value);
              
              if (value === '初診') {
                  toggleSection(config.uiIds.REFERRAL_AREA, true);
                  createReferralSection();
                  toggleSection(config.uiIds.NEW_RESERVATION_AREA, true);
                  toggleSection(config.uiIds.NEW_RESERVATION_AREA, false);
                  createMultiStageSelectSection();
              } else if (value === '変更' || value === '取消') {
                  toggleSection(config.uiIds.FIXED_DATE_AREA, true);
                  createFixedResvPullDown();
              }
              
              updateReasonSection(value);
              toggleSection(config.uiIds.REASON_AREA, true);
              const newReasonTextarea = document.getElementById(config.uiIds.REASON_TEXTAREA);
              if (newReasonTextarea) newReasonTextarea.required = true;
              
              const patientFormContainer = document.getElementById(config.uiIds.PATIENT_FORM_CONTAINER);
              if (patientFormContainer) {
                  patientFormContainer.style.display = 'block';
              }
              
              updateNavigationButtons();
          });
      }
     
      function createReferralSection() {
          const area = document.getElementById(config.uiIds.REFERRAL_AREA);
          area.innerHTML = '';
          area.style.paddingTop = '0px';

          const confirmWrapper = document.createElement('div');
          confirmWrapper.className = 'g-form-group required';
          const confirmLabel = document.createElement('label');
          confirmLabel.textContent = '紹介元機関について';
          confirmWrapper.appendChild(confirmLabel);
          
          const confirmRadioContainer = document.createElement('div');
          confirmRadioContainer.className = 'g-radio-group';
          createSelector(confirmRadioContainer, 'radio', 'referral_confirm', ['ある', 'ない'], null, true);
          confirmWrapper.appendChild(confirmRadioContainer);
          area.appendChild(confirmWrapper);

          const detailArea = document.createElement('div');
          detailArea.id = 'gemini-referral-detail-area';
          detailArea.style.display = 'none';
          area.appendChild(detailArea);

          const createFormGroup = (labelText, inputHtml, id) => {
              const div = document.createElement('div');
              div.className = 'form-group g-form-group'; 
              if (id) div.id = id;
              div.style.marginBottom = '15px';
              const label = document.createElement('label');
              label.textContent = labelText;
              label.style.display = 'block';
              label.style.marginBottom = '5px';
              div.appendChild(label);
              const inputWrapper = document.createElement('div');
              inputWrapper.innerHTML = inputHtml;
              div.appendChild(inputWrapper);
              return div;
          };

          const hospitalGroup = createFormGroup('紹介元医療機関名', `<input type="text" class="g-form-control" id="referral_hospital_name">`, 'group-referral-hospital');
          detailArea.appendChild(hospitalGroup);

          const telGroup = createFormGroup('紹介元医療機関電話番号', `<input type="text" class="g-form-control" id="referral_hospital_tel" autocomplete="off">`, 'group-referral-tel');
          detailArea.appendChild(telGroup);

          const cdGroup = document.createElement('div');
          cdGroup.className = 'form-group g-form-group';
          cdGroup.id = 'group-referral-cd';
          cdGroup.style.marginBottom = '15px';
          const cdLabel = document.createElement('label');
          cdLabel.textContent = '持参画像CD';
          cdLabel.style.display = 'block';
          cdLabel.style.marginBottom = '5px';
          cdGroup.appendChild(cdLabel);
          
          const cdRadioContainer = document.createElement('div');
          cdRadioContainer.className = 'g-radio-group';
          createSelector(cdRadioContainer, 'radio', 'referral_cd', ['ある', 'なし'], null);
          cdGroup.appendChild(cdRadioContainer);
          detailArea.appendChild(cdGroup);

          document.getElementById('referral_hospital_name').addEventListener('input', (e) => updateFbField(config.fbFields.REFERRAL_HOSPITAL, e.target.value));
          document.getElementById('referral_hospital_tel').addEventListener('input', (e) => updateFbField(config.fbFields.REFERRAL_TEL, e.target.value));
          cdRadioContainer.addEventListener('change', (e) => updateFbField(config.fbFields.REFERRAL_CD, e.target.value));

          confirmRadioContainer.addEventListener('change', (e) => {
              const val = e.target.value;
              const isExist = (val === 'ある');
              
              detailArea.style.display = isExist ? 'block' : 'none';
              
              const hospitalInput = document.getElementById('referral_hospital_name');
              const telInput = document.getElementById('referral_hospital_tel');
              const cdRadios = cdRadioContainer.querySelectorAll('input[type="radio"]');
              
              if (isExist) {
                  hospitalInput.required = true;
                  telInput.required = true;
                  cdRadios.forEach(r => r.required = true);
                  document.getElementById('group-referral-hospital').classList.add('required');
                  document.getElementById('group-referral-tel').classList.add('required');
                  document.getElementById('group-referral-cd').classList.add('required');
              } else {
                  hospitalInput.required = false;
                  hospitalInput.value = '';
                  updateFbField(config.fbFields.REFERRAL_HOSPITAL, '');
                  telInput.required = false;
                  telInput.value = '';
                  updateFbField(config.fbFields.REFERRAL_TEL, '');
                  cdRadios.forEach(r => { r.required = false; r.checked = false; });
                  updateFbField(config.fbFields.REFERRAL_CD, '');
                  document.getElementById('group-referral-hospital').classList.remove('required');
                  document.getElementById('group-referral-tel').classList.remove('required');
                  document.getElementById('group-referral-cd').classList.remove('required');
              }
              toggleSection(config.uiIds.NEW_RESERVATION_AREA, true);
          });
      }

      function updateReasonSection(requirement) {
        const area = document.getElementById(config.uiIds.REASON_AREA);
        area.innerHTML = '';
        
        updateFbField(config.fbFields.REASON, ''); 
        updateFbField(config.fbFields.SYMPTOM, ''); 

        if (!requirement) {
            toggleSection(config.uiIds.REASON_AREA, false);
            return;
        }
        let labelText = '', placeholderText = '';
        switch (requirement) {
            case '変更': labelText = '今回の変更理由をお聞かせください'; placeholderText = '例：急用がはいったため'; break;
            case '取消': labelText = '今回の取消理由をお聞かせください'; placeholderText = '例：急用がはいったため'; break;
            case '初診': labelText = '現在の症状等をお聞かせください'; placeholderText = '例：熱が37.5度あり頭痛がする。'; break;
        }
        if (!labelText) return;

        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'g-form-group required';
        titleWrapper.style.borderTop = '1px dashed #ccc';
        titleWrapper.style.paddingTop = '20px';
        titleWrapper.style.marginBottom = '8px';
        const titleLabel = document.createElement('label');
        titleLabel.textContent = labelText;
        titleWrapper.appendChild(titleLabel);
        area.appendChild(titleWrapper);

        const textarea = document.createElement('textarea');
        textarea.id = config.uiIds.REASON_TEXTAREA; 
        textarea.className = 'form-control g-form-control';
        textarea.rows = 4;
        textarea.placeholder = placeholderText;
        area.appendChild(textarea);
        
        textarea.addEventListener('input', (e) => {
            if (config.state.requirement === '初診') {
                updateFbField(config.fbFields.SYMPTOM, e.target.value);
            } else {
                updateFbField(config.fbFields.REASON, e.target.value);
            }
        });
      }
     
      function createMultiStageSelectSection() {
          const updateCombinedShinryoField = () => {
              const { selectedBunya, selectedDepartment, selectedTokuteiShinryo } = config.state;
              const finalSelect = document.getElementById('final-select');
              let finalValue = selectedTokuteiShinryo;
              if (finalSelect && finalSelect.value === '__GENERAL__') {
                  finalValue = `${selectedDepartment}（全般）`;
              }
              const parts = [selectedBunya, selectedDepartment, finalValue].filter(Boolean);
              const combinedValue = parts.join(' / ');
              updateFbField(config.fbFields.DEPARTMENT_COMBINED, combinedValue);
          };

          const area = document.getElementById(config.uiIds.MULTI_STAGE_AREA);
          area.innerHTML = '';
          
          const titleWrapper = document.createElement('div');
          titleWrapper.className = 'g-form-group required';
          const title = document.createElement('label');
          title.textContent = '診療内容を選択してください';
          titleWrapper.appendChild(title);
          area.appendChild(titleWrapper);
          
          const selectContainer = document.createElement('div');
          selectContainer.className = 'g-multistage-container';
          area.appendChild(selectContainer);

          const createLabeledSelect = (labelText, id, isRequired = false) => {
              const wrapper = document.createElement('div');
              const label = document.createElement('div');
              label.textContent = labelText;
              label.style.fontSize = '12px';
              label.style.fontWeight = 'bold';
              label.style.marginBottom = '4px';
              label.style.color = '#555';
              const select = document.createElement('select');
              select.id = id;
              select.className = 'g-form-control';
              if (isRequired) select.required = true;
              wrapper.appendChild(label);
              wrapper.appendChild(select);
              return [wrapper, select];
          };

          const [bunyaWrapper, bunyaSelect] = createLabeledSelect('診療分野', 'bunya-select', true);
          const [deptWrapper, departmentSelect] = createLabeledSelect('診療科', 'department-select', true);
          const [finalWrapper, finalSelect] = createLabeledSelect('診療選択', 'final-select');
          selectContainer.appendChild(bunyaWrapper);
          selectContainer.appendChild(deptWrapper);
          selectContainer.appendChild(finalWrapper);
          
          const guidanceArea = document.createElement('div');
          guidanceArea.id = config.uiIds.GUIDANCE_AREA;
          guidanceArea.style.display = 'none';
          area.appendChild(guidanceArea);

          const doctorArea = document.createElement('div');
          doctorArea.id = config.uiIds.DOCTOR_AREA;
          doctorArea.style.display = 'none';
          doctorArea.style.marginTop = '15px';
          area.appendChild(doctorArea);
          
          const doctorGuidanceArea = document.createElement('div');
          doctorGuidanceArea.id = config.uiIds.DOCTOR_GUIDANCE_AREA;
          doctorGuidanceArea.style.display = 'none';
          area.appendChild(doctorGuidanceArea);

          const uniqueBunya = [...new Set(config.state.kintoneRecords.map(r => r[config.jsonKeys.BUNYA]?.value?.trim()).filter(Boolean))];
          bunyaSelect.appendChild(createPlaceholderOption('選択してください'));
          uniqueBunya.forEach(bunya => bunyaSelect.appendChild(createSelectorOption(bunya, bunya)));
          
          departmentSelect.disabled = true;
          departmentSelect.appendChild(createPlaceholderOption('---'));
          
          finalWrapper.style.display = 'none';
          finalSelect.disabled = true;
          finalSelect.appendChild(createPlaceholderOption('---'));

          bunyaSelect.addEventListener('change', (e) => {
              resetSelections('bunya'); 
              config.state.selectedBunya = e.target.value;
              updateCombinedShinryoField();
              
              departmentSelect.innerHTML = '';
              departmentSelect.appendChild(createPlaceholderOption('選択してください'));
              finalWrapper.style.display = 'none';
              finalSelect.innerHTML = '';
              finalSelect.appendChild(createPlaceholderOption('---'));
              finalSelect.disabled = true;
              finalSelect.required = false;

              if (!e.target.value) {
                  departmentSelect.disabled = true;
                  return;
              }

              const bunyaRecords = getFilteredRecords();
              const uniqueDepts = [...new Set(bunyaRecords.map(r => r[config.jsonKeys.DEPARTMENT]?.value?.trim()).filter(Boolean))];
              if (uniqueDepts.length > 0) {
                  uniqueDepts.forEach(dept => departmentSelect.appendChild(createSelectorOption(dept, dept)));
                  departmentSelect.disabled = false;
              }
          });

          departmentSelect.addEventListener('change', (e) => {
              const selectedDept = e.target.value;
              resetSelections('department');
              
              if (!selectedDept) {
                  config.state.selectedDepartment = null;
                  updateCombinedShinryoField();
                  updateDepartmentGuidance();
                  return;
              }
              
              config.state.selectedDepartment = selectedDept;
              config.state.selectedTokuteiShinryo = null;
              updateCombinedShinryoField();
              updateDepartmentGuidance();
              updateDoctorGuidance();

              const deptRecords = getFilteredRecords();
              const tokuteiOptions = [...new Set(deptRecords.map(r => r[config.jsonKeys.TOKUTEI_SHINRYO]?.value?.trim()).filter(Boolean))];

              finalWrapper.style.display = 'none';
              finalSelect.innerHTML = '';
              finalSelect.appendChild(createPlaceholderOption('---'));
              finalSelect.disabled = true;
              finalSelect.required = false;

              if (tokuteiOptions.length === 0) {
                  updateDoctorOptions();
              } else {
                  finalWrapper.style.display = 'block';
                  finalSelect.innerHTML = '';
                  finalSelect.appendChild(createPlaceholderOption('選択してください'));
                  finalSelect.required = true;
                  
                  const hasGeneral = deptRecords.some(r => !r[config.jsonKeys.TOKUTEI_SHINRYO]?.value?.trim());
                  if (hasGeneral) {
                      finalSelect.appendChild(createSelectorOption('__GENERAL__', `${selectedDept}（全般）`));
                  }
                  tokuteiOptions.forEach(tokutei => {
                      finalSelect.appendChild(createSelectorOption(tokutei, `${selectedDept}（${tokutei}）`));
                  });
                  finalSelect.disabled = false;
              }
          });

          finalSelect.addEventListener('change', (e) => {
              const selectedTokutei = e.target.value;
              
              if (!selectedTokutei || selectedTokutei === '__GENERAL__') {
                  config.state.selectedTokuteiShinryo = null; 
              } else {
                  config.state.selectedTokuteiShinryo = selectedTokutei;
              }
              
              resetSelections('final');
              updateCombinedShinryoField();
              updateDoctorGuidance();
              updateDoctorOptions();
          });
      }

      function updateDepartmentGuidance() {
          const area = document.getElementById(config.uiIds.GUIDANCE_AREA);
          area.innerHTML = '';
          area.style.display = 'none';

          const dept = config.state.selectedDepartment;
          if (!dept) return;

          const setting = config.state.labelSettings ? config.state.labelSettings[dept] : 'both';
          const req = config.state.requirement;
          if (setting === 'first_visit' && req !== '初診') return;
          if (setting === 'change' && req !== '変更') return;

          const guidanceText = config.state.descriptions[dept];
          if (guidanceText) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = guidanceText;
              if (tempDiv.textContent.trim().length > 0 || tempDiv.querySelector('img')) {
                  area.style.cssText = 'margin-top: 15px; padding: 10px; border: 1px solid #e0e0e0; background-color: #f9f9f9; font-size: 13px; border-radius: 4px;';
                  const div = document.createElement('div');
                  div.className = 'gemini-rich-text';
                  div.innerHTML = guidanceText;
                  area.appendChild(div);
                  area.style.display = 'block';
              }
          }
      }

      function updateDoctorGuidance() {
          const area = document.getElementById(config.uiIds.DOCTOR_GUIDANCE_AREA);
          area.innerHTML = '';
          area.style.display = 'none';
          
          const filteredRecords = getFilteredRecords();
          if (filteredRecords.length === 1) {
              const record = filteredRecords[0];
              const guidanceText = record[config.jsonKeys.GUIDANCE]?.value;
              
              if (guidanceText && guidanceText.replace(/<p><br><\/p>/g, '').trim()) {
                  area.style.cssText = 'margin-top: 10px; padding: 8px; border: 1px solid #cce5ff; background-color: #f8fbff; font-size: 12px; border-radius: 4px;';
                  const div = document.createElement('div');
                  div.className = 'gemini-rich-text';
                  div.innerHTML = guidanceText;
                  area.appendChild(div);
                  area.style.display = 'block';
              }
              
              const facilityName = record[config.jsonKeys.FACILITY_NAME]?.value;
              if (facilityName) {
                  updateFbField(config.fbFields.FACILITY_NAME, facilityName);
              }

          } else {
              updateFbField(config.fbFields.FACILITY_NAME, '');
          }
      }
      
      function createPlaceholderOption(text) {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = text;
          option.disabled = true;
          option.selected = true;
          option.hidden = true;
          return option;
      }
      
      function createSelectorOption(value, text, disabled = false) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = text;
          option.disabled = disabled;
          if (disabled) option.style.color = '#ccc';
          return option;
      }

      function updateDoctorOptions() {
          const area = document.getElementById(config.uiIds.DOCTOR_AREA);
          const recordsForDoctor = getFilteredRecords();
          const uniqueDoctors = [...new Set(recordsForDoctor.map(r => r[config.jsonKeys.DOCTOR]?.value).filter(Boolean))];
          
          if (uniqueDoctors.length === 0) {
              config.state.selectedDoctor = null;
              updateFbField(config.fbFields.DOCTOR, '');
              area.innerHTML = '';
              toggleSection(config.uiIds.DOCTOR_AREA, false);
              updateDoctorGuidance();
              updateMethodSection();
              return;
          }
          
          area.innerHTML = '';
          toggleSection(config.uiIds.DOCTOR_AREA, true);
          const selectWrapper = document.createElement('div');
          const label = document.createElement('div');
          label.textContent = '担当医師';
          label.style.fontSize = '12px';
          label.style.fontWeight = 'bold';
          label.style.marginBottom = '4px';
          label.style.color = '#555';
          selectWrapper.appendChild(label);
          const select = document.createElement('select');
          select.className = 'g-form-control';
          selectWrapper.appendChild(select);
          area.appendChild(selectWrapper);
          
          if (uniqueDoctors.length === 1) {
              const doctorName = uniqueDoctors[0];
              select.innerHTML = '';
              select.appendChild(createSelectorOption(doctorName, `${doctorName} 医師`));
              select.disabled = true;
              config.state.selectedDoctor = doctorName;
              updateFbField(config.fbFields.DOCTOR, doctorName);
              updateDoctorGuidance();
              updateMethodSection();
              return;
          }
          
          let doctorOptions = [config.DEFAULT_DOCTOR_OPTION, config.SAME_DOCTOR_OPTION];
          const formattedDoctors = uniqueDoctors.map(name => `${name} 医師`);
          doctorOptions.push(...formattedDoctors);
          select.innerHTML = '';
          select.appendChild(createPlaceholderOption('選択してください'));
          doctorOptions.forEach(opt => {
              if (opt === config.SAME_DOCTOR_OPTION && config.state.requirement !== '変更') return;
              select.appendChild(createSelectorOption(opt, opt));
          });
          
          select.addEventListener('change', (e) => {
              const selectedValue = e.target.value;
              const doctorName = selectedValue.endsWith(' 医師') ? selectedValue.slice(0, -3) : selectedValue;
              config.state.selectedDoctor = doctorName;
              updateFbField(config.fbFields.DOCTOR, doctorName);
              resetSelections('doctor');
              updateDoctorGuidance();
              updateMethodSection();
          });
          
          let defaultValue = '';
          if (config.state.requirement === '変更') {
              defaultValue = config.SAME_DOCTOR_OPTION;
          } else if (config.state.requirement === '初診') {
              defaultValue = config.DEFAULT_DOCTOR_OPTION;
          }
          
          if (defaultValue && select.querySelector(`option[value="${defaultValue}"]`)) {
              select.value = defaultValue;
              const doctorName = defaultValue.endsWith(' 医師') ? defaultValue.slice(0, -3) : defaultValue;
              config.state.selectedDoctor = doctorName;
              updateFbField(config.fbFields.DOCTOR, doctorName);
          } else {
              updateFbField(config.fbFields.DOCTOR, '');
          }

          updateDoctorGuidance();
          updateMethodSection();
      }

      function updateMethodSection() {
          toggleSection(config.uiIds.METHOD_AREA, true);
          const area = document.getElementById(config.uiIds.METHOD_AREA);
          area.innerHTML = '';
          
          const titleWrapper = document.createElement('div');
          titleWrapper.className = 'g-form-group';
          const titleLabel = document.createElement('label');
          titleLabel.textContent = '希望日時の指定方法';
          titleWrapper.appendChild(titleLabel);
          area.appendChild(titleWrapper);

          const radioContainer = document.createElement('div');
          radioContainer.className = 'g-radio-group';
          const options = [
            { value: config.YOYAKU_METHOD_AUTO, displayText: config.YOYAKU_METHOD_AUTO },
            { value: config.YOYAKU_METHOD_SPECIFIC, displayText: config.YOYAKU_METHOD_SPECIFIC }
          ];
          createSelector(radioContainer, 'radio', 'yoyaku_method', options, config.state.yoyakuMethod);
          area.appendChild(radioContainer);

          const explanationContainer = document.createElement('div');
          explanationContainer.style.cssText = 'font-size: 11px; color: #555; margin-top: 10px; line-height: 1.5; padding-left: 5px;';
          const omakaseExplanation = document.createElement('p');
          omakaseExplanation.style.margin = '0 0 5px 0';
          omakaseExplanation.textContent = `※${config.YOYAKU_METHOD_AUTO}：${config.TOOLTIPS.omakase}`;
          const specificExplanation = document.createElement('p');
          specificExplanation.style.margin = '0';
          specificExplanation.textContent = `※${config.YOYAKU_METHOD_SPECIFIC}：${config.TOOLTIPS.specific}`;
          explanationContainer.appendChild(omakaseExplanation);
          explanationContainer.appendChild(specificExplanation);
          area.appendChild(explanationContainer);
          
          radioContainer.addEventListener('change', (e) => {
              config.state.yoyakuMethod = e.target.value;
              updateFbField(config.fbFields.YOYAKU_METHOD, config.state.yoyakuMethod);
              
              if (config.state.yoyakuMethod === config.YOYAKU_METHOD_SPECIFIC) {
                  updateFbField(config.fbFields.WISH_TIME_OMAKASE, '');
                  toggleSection(config.uiIds.OMAKASE_TIME_AREA, false);
                  updateWishDatesSection();
              } else { 
                  for (let i = 1; i <= config.MAX_WISH_DATES; i++) {
                      updateFbField(config.fbFields['WISH_' + i], '');
                  }
                  config.state.selectedWishDateTimes = { 1: null, 2: null, 3: null, 4: null, 5: null };
                  toggleSection(config.uiIds.WISH_DATES_AREA, false);
                  updateOmakaseTimeSection();
              }
          });
          
          const omakaseRadio = radioContainer.querySelector(`input[value="${config.YOYAKU_METHOD_AUTO}"]`);
          if (omakaseRadio && !config.state.yoyakuMethod) {
              omakaseRadio.checked = true;
              omakaseRadio.dispatchEvent(new Event('change', { bubbles: true }));
          }
      }
     
      function updateWishDatesSection() {
          toggleSection(config.uiIds.WISH_DATES_AREA, true);
          const area = document.getElementById(config.uiIds.WISH_DATES_AREA);
          area.innerHTML = '';

          const titleWrapper = document.createElement('div');
          titleWrapper.className = 'g-form-group required';
          const titleLabel = document.createElement('label');
          titleLabel.textContent = '希望日時を選択してください';
          titleWrapper.appendChild(titleLabel);
          area.appendChild(titleWrapper);

          for (let i = 1; i <= config.MAX_WISH_DATES; i++) {
              const wishContainer = document.createElement('div');
              wishContainer.className = 'g-wish-container';
              const label = document.createElement('label');
              label.textContent = `第${i}希望`;
              wishContainer.appendChild(label);
              const dateSelect = document.createElement('select');
              dateSelect.dataset.wishIndex = i;
              dateSelect.className = 'g-form-control';
              wishContainer.appendChild(dateSelect);
              const timeContainer = document.createElement('div');
              timeContainer.className = 'g-wish-time-options g-radio-group';
              wishContainer.appendChild(timeContainer);
              area.appendChild(wishContainer);
          }
          updateAllWishDateUIs();
          
          const updateWishFbField = (wishIndex) => {
              const selection = config.state.selectedWishDateTimes[wishIndex];
              const fieldCode = config.fbFields['WISH_' + wishIndex];
              
              if (selection && selection.date && selection.time) {
                  const dateSelect = document.querySelector(`select[data-wish-index='${wishIndex}']`);
                  const dateText = dateSelect.options[dateSelect.selectedIndex].textContent.split(' ')[0];
                  const output = `${dateText} ${selection.time}`;
                  updateFbField(fieldCode, output);
              } else {
                  updateFbField(fieldCode, '');
              }
          };
          
          area.addEventListener('change', (e) => {
              if (isProgrammaticChange) return;
              const target = e.target;
              let index;
              if (target.dataset.wishIndex) index = target.dataset.wishIndex;
              else if (target.name && target.name.startsWith('time_wish_')) index = target.name.split('_').pop();
              else return;
              
              if (target.tagName === 'SELECT') {
                  const dateStr = target.value;
                  const defaultTime = getDefaultTimeForDate(dateStr, index);
                  config.state.selectedWishDateTimes[index] = { date: dateStr, time: defaultTime };
              } else if (target.type === 'radio') {
                  if (config.state.selectedWishDateTimes[index]) {
                      config.state.selectedWishDateTimes[index].time = target.value;
                  }
              }
              
              updateWishFbField(index);
              updateAllWishDateUIs();
          });
      }

      function getDefaultTimeForDate(dateStr, index) {
          if (!dateStr) return null;
          const date = new Date(dateStr);
          const records = getFilteredRecords();
          const am_available = isAvailable(date, '午前', records);
          const pm_available = isAvailable(date, '午後', records);
          const am_selected = isDateTimeSelected(dateStr, '午前', index);
          const pm_selected = isDateTimeSelected(dateStr, '午後', index);
          const am_can_select = am_available && !am_selected;
          const pm_can_select = pm_available && !pm_selected;
          if (am_can_select && pm_can_select) return config.FLEXIBLE_TIME_OPTION;
          if (am_can_select) return '午前';
          if (pm_can_select) return '午後';
          return null;
      }

      function updateAllWishDateUIs() {
          updateAllWishDateOptions();
          for (let i = 1; i <= config.MAX_WISH_DATES; i++) {
              const sel = document.querySelector(`select[data-wish-index='${i}']`);
              if (sel && config.state.selectedWishDateTimes[i] && config.state.selectedWishDateTimes[i].date) {
                  updateTimeOptionsForWishDate(i, config.state.selectedWishDateTimes[i].date);
              } else {
                  const timeOptionsContainer = sel?.nextElementSibling;
                  if (timeOptionsContainer) timeOptionsContainer.innerHTML = '';
              }
          }
      }

      function isDateTimeSelected(dateStr, timeStr, ignoreIndex) {
        for (const index in config.state.selectedWishDateTimes) {
          if (String(index) === String(ignoreIndex)) continue;
          const selection = config.state.selectedWishDateTimes[index];
          if (selection && selection.date === dateStr && selection.time) {
              const flexibleOptions = [config.FLEXIBLE_TIME_OPTION];
              if (flexibleOptions.includes(selection.time) || selection.time === timeStr) return true;
          }
        }
        return false;
      }
      
      function updateAllWishDateOptions() {
          const dateOptions = generateDateOptions();
          const selects = document.querySelectorAll(`#${config.uiIds.WISH_DATES_AREA} select`);
          selects.forEach(select => {
              const currentIndex = select.dataset.wishIndex;
              const currentSelection = config.state.selectedWishDateTimes[currentIndex];
              const currentValue = currentSelection ? currentSelection.date : '';
              select.innerHTML = '';
              select.appendChild(createPlaceholderOption('日付を選択'));
              dateOptions.forEach(opt => {
                  const dateStr = opt.value;
                  const dateObj = new Date(dateStr);
                  const records = getFilteredRecords();
                  const availableSlots = [];
                  if (isAvailable(dateObj, '午前', records)) availableSlots.push('午前');
                  if (isAvailable(dateObj, '午後', records)) availableSlots.push('午後');
                  let isBookedByFlexibleOption = false;
                  const selectedSlots = new Set();
                  for (const i in config.state.selectedWishDateTimes) {
                      if (i === currentIndex) continue;
                      const selection = config.state.selectedWishDateTimes[i];
                      if (selection && selection.date === dateStr && selection.time) {
                          const flexibleOptions = [config.FLEXIBLE_TIME_OPTION];
                          if (flexibleOptions.includes(selection.time)) {
                              isBookedByFlexibleOption = true;
                              break;
                          }
                          selectedSlots.add(selection.time);
                      }
                  }
                  let remainingSlots = isBookedByFlexibleOption ? [] : availableSlots.filter(slot => !selectedSlots.has(slot));
                  const isFullyBooked = remainingSlots.length === 0;
                  let timeDisplayText = '';
                  if (remainingSlots.length === 2) timeDisplayText = '(午前/午後)';
                  else if (remainingSlots.length === 1) timeDisplayText = `(${remainingSlots[0]})`;
                  const baseDisplay = `${String(dateObj.getMonth() + 1)}月${dateObj.getDate()}日 (${config.WEEKDAYS_JP[dateObj.getDay()]})`;
                  const optionText = isFullyBooked ? `${baseDisplay} 選択済み` : `${baseDisplay} ${timeDisplayText}`;
                  select.appendChild(createSelectorOption(dateStr, optionText, isFullyBooked));
              });
              select.value = currentValue;
              const selectedOption = select.querySelector(`option[value="${currentValue}"]`);
              if (currentValue && selectedOption && selectedOption.disabled) {
                  select.value = '';
                  config.state.selectedWishDateTimes[currentIndex] = null;
                  updateFbField(config.fbFields['WISH_' + currentIndex], '');
              }
          });
      }
      
      function updateTimeOptionsForWishDate(index, dateStr) {
          const timeContainer = document.querySelector(`select[data-wish-index='${index}']`).nextElementSibling;
          timeContainer.innerHTML = '';
          if (!dateStr) return;
          const date = new Date(dateStr);
          const records = getFilteredRecords();
          const am_ok = isAvailable(date, '午前', records);
          const pm_ok = isAvailable(date, '午後', records);
          const currentSelection = config.state.selectedWishDateTimes[index];

          config.TIME_OPTIONS.forEach(opt => {
              const label = document.createElement('label');
              const radio = document.createElement('input');
              radio.type = 'radio';
              radio.name = `time_wish_${index}`;
              radio.value = opt;

              if (currentSelection && currentSelection.time === opt) {
                  radio.checked = true;
              }

              let isDisabled = false;
              const flexibleOptions = [config.FLEXIBLE_TIME_OPTION];
              
              if (opt === '午前') {
                  if (!am_ok || isDateTimeSelected(dateStr, '午前', index)) {
                      isDisabled = true;
                  }
              } else if (opt === '午後') {
                  if (!pm_ok || isDateTimeSelected(dateStr, '午後', index)) {
                      isDisabled = true;
                  }
              } else if (flexibleOptions.includes(opt)) {
                  if (!am_ok || !pm_ok || isDateTimeSelected(dateStr, '午前', index) || isDateTimeSelected(dateStr, '午後', index)) {
                      isDisabled = true;
                  }
              }
              
              radio.disabled = isDisabled;
              label.appendChild(radio);
              
              const labelText = document.createElement('span');
              labelText.textContent = ` ${opt}`;
              label.appendChild(labelText);
              
              if (isDisabled) {
                  label.classList.add('g-radio-label-disabled');
              }

              timeContainer.appendChild(label);
          });

          const checkedRadio = timeContainer.querySelector('input:checked');
          if (checkedRadio && checkedRadio.disabled) {
              checkedRadio.checked = false;
              if(config.state.selectedWishDateTimes[index]) {
                 config.state.selectedWishDateTimes[index].time = null;
                 updateFbField(config.fbFields['WISH_' + index], '');
              }
          }
      }
      
      function updateOmakaseTimeSection() {
        toggleSection(config.uiIds.OMAKASE_TIME_AREA, true);
        const area = document.getElementById(config.uiIds.OMAKASE_TIME_AREA);
        area.innerHTML = '';
        
        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'g-form-group';
        const titleLabel = document.createElement('label');
        titleLabel.textContent = '希望の時間帯';
        titleWrapper.appendChild(titleLabel);
        area.appendChild(titleWrapper);

        const records = getFilteredRecords();
        let am_possible = false, pm_possible = false;
        const today = new Date();
        for(let i=0; i < 90; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            if(!am_possible && isAvailable(checkDate, '午前', records)) am_possible = true;
            if(!pm_possible && isAvailable(checkDate, '午後', records)) pm_possible = true;
            if(am_possible && pm_possible) break;
        }
        const timeContainer = document.createElement('div');
        timeContainer.className = 'g-radio-group';
        config.TIME_OPTIONS.forEach(opt => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'time_omakase';
            radio.value = opt;
            let isDisabled = false;
            const flexibleOptions = [config.FLEXIBLE_TIME_OPTION];
            if (opt === '午前' && !am_possible) isDisabled = true;
            if (opt === '午後' && !pm_possible) isDisabled = true;
            if (flexibleOptions.includes(opt) && (!am_possible || !pm_possible)) isDisabled = true;
            radio.disabled = isDisabled;
            label.appendChild(radio);
            const labelText = document.createElement('span');
            labelText.textContent = ` ${opt}`;
            label.appendChild(labelText);
            if (isDisabled) {
                label.classList.add('g-radio-label-disabled');
            }
            timeContainer.appendChild(label);
        });
        area.appendChild(timeContainer);
        let defaultChecked = false;
        if (am_possible && !pm_possible) {
            timeContainer.querySelector('input[value="午前"]').checked = true;
            defaultChecked = true;
        }
        if (!am_possible && pm_possible) {
            timeContainer.querySelector('input[value="午後"]').checked = true;
            defaultChecked = true;
        }
        if (!defaultChecked) {
            const dochiraRadio = timeContainer.querySelector(`input[value="${config.FLEXIBLE_TIME_OPTION}"]`);
            if (dochiraRadio && !dochiraRadio.disabled) dochiraRadio.checked = true;
        }
        
        timeContainer.addEventListener('change', (e) => {
            updateFbField(config.fbFields.WISH_TIME_OMAKASE, e.target.value);
        });
        const checkedRadio = timeContainer.querySelector('input:checked');
        if (checkedRadio) {
            isProgrammaticChange = true;
            checkedRadio.dispatchEvent(new Event('change', { bubbles: true }));
            isProgrammaticChange = false;
        }
      } 
      
      function resetSelections(from) {
          const levels = ['requirement', 'bunya', 'department', 'final', 'doctor', 'method', 'wishes'];
          const fromIndex = levels.indexOf(from);
          for (let i = fromIndex + 1; i < levels.length; i++) {
              const level = levels[i];
              let area;
              switch (level) {
                  case 'bunya':
                      config.state.selectedBunya = null;
                  case 'department':
                      config.state.selectedDepartment = null;
                  case 'final':
                      config.state.selectedTokuteiShinryo = null;
                  case 'doctor':
                      config.state.selectedDoctor = null;
                      area = document.getElementById(config.uiIds.DOCTOR_AREA);
                      if (area) area.innerHTML = '';
                      toggleSection(config.uiIds.DOCTOR_AREA, false);
                      area = document.getElementById(config.uiIds.GUIDANCE_AREA);
                      if (area) area.innerHTML = '';
                      toggleSection(config.uiIds.GUIDANCE_AREA, false);
                  case 'method':
                      config.state.yoyakuMethod = null;
                      area = document.getElementById(config.uiIds.METHOD_AREA);
                      if (area) area.innerHTML = '';
                      toggleSection(config.uiIds.METHOD_AREA, false);
                  case 'wishes':
                      config.state.selectedWishDateTimes = {1:null, 2:null, 3:null, 4:null, 5:null};
                      area = document.getElementById(config.uiIds.WISH_DATES_AREA);
                      if (area) area.innerHTML = '';
                      toggleSection(config.uiIds.WISH_DATES_AREA, false);
                      area = document.getElementById(config.uiIds.OMAKASE_TIME_AREA);
                      if (area) area.innerHTML = '';
                      toggleSection(config.uiIds.OMAKASE_TIME_AREA, false);
                      break;
              }
          }
          
          updateFbField(config.fbFields.HIDDEN_SUBMIT_FLAG, 'Off');
      }

      function generateDateOptions() {
          const options = [];
          const records = getFilteredRecords();
          const commonRecord = config.state.kintoneCommonRecord;
          if (records.length === 0 && !commonRecord) return options;
          const individualOffsets = records.map(r => r[config.jsonKeys.OFFSET_DAYS]?.value).filter(v => v !== null && v !== '').map(Number);
          const individualDurations = records.map(r => r[config.jsonKeys.DURATION_DAYS]?.value).filter(v => v !== null && v !== '').map(Number);
          let offset = individualOffsets.length > 0 ? Math.min(...individualOffsets) : null;
          let duration = individualDurations.length > 0 ? Math.max(...individualDurations) : null;
          if (offset === null && commonRecord) offset = commonRecord['予約開始日']?.value || null;
          if (duration === null && commonRecord) duration = commonRecord['予約可能期間']?.value || null;
          offset = (offset !== null) ? Number(offset) : 3;
          duration = (duration !== null) ? Number(duration) : 90;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + offset);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + duration);
          let currentDate = new Date(startDate);
          while(currentDate <= endDate) {
              const am_ok = isAvailable(currentDate, '午前', records);
              const pm_ok = isAvailable(currentDate, '午後', records);
              if(am_ok || pm_ok) {
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                  const display = `${String(currentDate.getMonth() + 1)}月${currentDate.getDate()}日 (${config.WEEKDAYS_JP[currentDate.getDay()]})`;
                  options.push({ value: dateStr, display: display });
              }
              currentDate.setDate(currentDate.getDate() + 1);
          }
          return options;
      }
      
      function createFixedResvPullDown() {
          const area = document.getElementById(config.uiIds.FIXED_DATE_AREA);
          area.innerHTML = '';
          
          const titleWrapper = document.createElement('div');
          titleWrapper.className = 'g-form-group required';
          const title = document.createElement('label');
          title.textContent = '現在確定している予約の日時をお知らせください';
          titleWrapper.appendChild(title);
          area.appendChild(titleWrapper);

          const container = document.createElement('div');
          container.className = 'g-fixed-resv-container';
          container.style.paddingBottom = '20px';

          const createSelect = (id) => {
              const wrapper = document.createElement('div');
              const select = document.createElement('select');
              select.id = id;
              select.className = 'g-form-control';
              select.required = true;
              wrapper.appendChild(select);
              container.appendChild(wrapper);
              return select;
          };
          
          const monthSelect = createSelect('fixed_date_month_select');
          const daySelect = createSelect('fixed_date_day_select');
          const timeSelect = createSelect('fixed_date_time_select');
          
          area.appendChild(container);

          timeSelect.appendChild(createPlaceholderOption('時刻')); 
          for (let h = 9; h <= 16; h++) {
              for (let m = 0; m < 60; m += 30) { 
              const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; 
              if (['12:00', '12:30', '13:00', '13:30'].includes(t) || (h === 16 && m > 30)) continue; 
              timeSelect.appendChild(createSelectorOption(t, t));
              }
          }
          const today = new Date();
          const startDate = new Date();
          startDate.setDate(today.getDate() + 1);
          const endDate = new Date();
          endDate.setMonth(today.getMonth() + 3);
          const months = new Set();
          let d = new Date(startDate);
          while(d <= endDate) {
              months.add(d.getMonth() + 1);
              d.setDate(d.getDate() + 1);
          }
          monthSelect.appendChild(createPlaceholderOption('月'));
          Array.from(months).sort((a,b) => a-b).forEach(m => monthSelect.appendChild(createSelectorOption(m, `${m}月`)));
          daySelect.appendChild(createPlaceholderOption('日'));

          const updateFixedDateOutput = () => {
              const mVal = monthSelect.value;
              const dayVal = daySelect.value;
              const tVal = timeSelect.value;
              
              if (mVal && dayVal && tVal) {
                  const mText = monthSelect.options[monthSelect.selectedIndex].textContent;
                  const dayText = daySelect.options[daySelect.selectedIndex].textContent;
                  const tText = timeSelect.options[timeSelect.selectedIndex].textContent;
                  const output = `${mText} ${dayText} ${tText}`;
                  updateFbField(config.fbFields.FIXED_DATETIME, output);
              } else {
                  updateFbField(config.fbFields.FIXED_DATETIME, '');
              }
              
              if (config.state.requirement === '変更') {
                  const hasValue = !!config.state.submitData[config.fbFields.FIXED_DATETIME];
                  toggleSection(config.uiIds.NEW_RESERVATION_AREA, hasValue);
                  if (hasValue && !document.getElementById('bunya-select')) {
                      createMultiStageSelectSection();
                  }
              }
          };
          monthSelect.addEventListener('change', function() {
              const selectedMonth = parseInt(this.value, 10);
              daySelect.innerHTML = '';
              daySelect.appendChild(createPlaceholderOption('日')); 
              if (!selectedMonth) return;
              let d_loop = new Date(startDate);
              while(d_loop <= endDate) {
                  if (d_loop.getMonth() + 1 === selectedMonth) {
                      const dayText = `${d_loop.getDate()}日 (${config.WEEKDAYS_JP[d_loop.getDay()]})`;
                      daySelect.appendChild(createSelectorOption(d_loop.getDate(), dayText));
                  }
                  d_loop.setDate(d_loop.getDate() + 1);
              }
              updateFixedDateOutput();
          });
          daySelect.addEventListener('change', updateFixedDateOutput);
          timeSelect.addEventListener('change', updateFixedDateOutput);
      }

      /****************************************************************
       * 患者情報関連の関数群
       ****************************************************************/
      function createFormSection(id, innerHtml) {
          return `<div id="${id}">${innerHtml}</div>`;
      }

      function initializePatientFormUI(container) {
        const chartCardImageUrl = 'https://i.ibb.co/6kmdrf7/No.png';
        
        container.innerHTML = `
          <form class="g-patient-form" novalidate>
            <div style="margin-top: 0px;color: #008;font-weight:bold;">
              ◆ 患者様情報のご確認 ◆
            </div>
            <div id="gemini-section-applicant" style="margin-top: 20px;">
              ${createRadioGroup('申込者', config.fbFields.APPLICANT, ['本人', '家族', '医療機関', '他'], '', false, '本人')}
            </div>
            ${createFormSection('gemini-section-applicant-supplement', `<div id="${config.uiIds.APPLICANT_SUPPLEMENT_AREA}" style="display: none;">${createFormGroup('申込者補足',`<input type="text" id="${config.uiIds.APPLICANT_SUPPLEMENT_INPUT}" class="g-form-control">`,'続柄やお名前などの情報をご記入ください',false)}</div>`)}
            
      ${createFormSection('gemini-section-chart-no', createFormGroup(
                  'カルテNo', 
                  `<input type="text" id="${config.uiIds.CHART_NO}" class="g-form-control" placeholder="半角英数字8桁" pattern="[a-zA-Z0-9]{8}" maxlength="8" required>`,
                  'カルテNoは診察券の表の面に記載されています<br>' + '受診されたことがない場合や診察券を紛失などにより<br>' +　'カルテNoがわからない場合は、このフォームからは<br>' + '予約することはできません。' +  (chartCardImageUrl ? `<br><img src="${chartCardImageUrl}" alt="診察券サンプル" class="g-chart-card-sample">` : ''), 
                  true
              ))}

            ${createFormSection('gemini-section-name-kanji', `<div class="g-form-group required"><label>お名前（漢字）</label><div class="g-name-fields"><input type="text" id="${config.uiIds.LAST_NAME_KANJI}" class="g-form-control" placeholder="姓" required><input type="text" id="${config.uiIds.FIRST_NAME_KANJI}" class="g-form-control" placeholder="名" required></div><div class="g-error-msg"></div></div>`)}
            ${createFormSection('gemini-section-name-kana', `<div class="g-form-group required"><label>お名前（ふりがな）</label><div class="g-name-fields"><input type="text" id="${config.uiIds.LAST_NAME_KANA}" class="g-form-control" placeholder="せい" required><input type="text" id="${config.uiIds.FIRST_NAME_KANA}" class="g-form-control" placeholder="めい" required></div><div class="g-error-msg"></div></div>`)}
            ${createFormSection('gemini-section-dob', createDobFields())}
            ${createFormSection('gemini-section-gender', createRadioGroup(config.fbFields.GENDER, config.fbFields.GENDER, ['男性', '女性'], '', true))}
            
            <div class="g-address-container">
                ${createFormSection('gemini-section-postal-code', `<div class="g-form-group required"><label for="${config.uiIds.POSTAL_CODE}">郵便番号</label><div class="g-postal-code-wrapper"><input type="text" id="${config.uiIds.POSTAL_CODE}" class="g-form-control" placeholder="半角数字7桁" pattern="\\d{7}" maxlength="7" required></div><p class="g-form-note"></p><div class="g-error-msg"></div></div>`)}
                ${createFormSection('gemini-section-address', createFormGroup('住所', `<input type="text" id="${config.uiIds.ADDRESS}" class="g-form-control" class="g-form-control" placeholder="郵便番号から自動入力されます" readonly>`, false))}
                ${createFormSection('gemini-section-street', createFormGroup('丁目～番地', `<input type="text" id="${config.uiIds.STREET}" class="g-form-control" placeholder="例: ○○丁目○番○号" required>`, '', true))}
                ${createFormSection('gemini-section-building', createFormGroup('マンション/ビル名', `<input type="text" id="${config.uiIds.BUILDING}" class="g-form-control" placeholder="例: ○○マンション101号室">`, '', false))}
            </div>

            ${createFormSection('gemini-section-tel1', createFormGroup('電話番号①', `<input type="tel" id="${config.uiIds.TEL1}" class="g-form-control" placeholder="例: 09012345678" required>`, 'なるべく連絡が付きやすい携帯電話の番号を入力してください', true))}
            ${createFormSection('gemini-section-tel2', createFormGroup('電話番号②', `<input type="tel" id="${config.uiIds.TEL2}" class="g-form-control">`, '複数の電話番号をお持ちの方は入力してください', false))}
            ${createFormSection('gemini-section-contact-time', createFormGroup('連絡時間帯', `<input type="text" id="${config.uiIds.CONTACT_TIME}" class="g-form-control" placeholder="例: 平日12時～13時、土日終日">`, '電話連絡が付きやすい日時、曜日、時間帯などを記入してください', false))}
            ${createFormSection('gemini-section-email', createFormGroup('メールアドレス', `<input type="email" id="${config.uiIds.EMAIL}" class="g-form-control" placeholder="例: example@fureai-g.or.jp" required>`, '', true))}
            ${createFormSection('gemini-section-email-confirm', createFormGroup('メールアドレス（確認用）', `<input type="email" id="${config.uiIds.EMAIL_CONFIRM}" class="g-form-control" required autocomplete="new-password">`, '入力いただいたメール宛てに申し込み控えメールが届きます。', true))}
            ${createFormSection('gemini-section-reason', `<div id="${config.uiIds.REASON_AREA}" style="display: none; margin-top: 20px; margin-bottom: 20px;"></div>`)}
            ${createFormSection('gemini-section-other-notes', createFormGroup('その他何かありましたらご記入ください', `<textarea id="gemini-other-notes" class="g-form-control" rows="4"></textarea>`, '', false))}
            ${createFormSection('gemini-section-privacy', `<div class="g-form-group g-privacy-policy required"><label>個人情報について</label><div class="g-privacy-text">「<a href="https://fg-sthp.jp/hospital/right.html" target="_blank" rel="noopener noreferrer">個人情報保護方針</a>」をご確認の上、同意いただける場合のみご送信ください。</div><label class="g-checkbox-label"><input type="checkbox" id="${config.uiIds.PRIVACY_AGREE}" required> 同意する</label></div>`)}
          </form>
        `;
        attachPatientFormEventListeners();
      }
      
      function addLiveValidation(element, validationRegex, errorMessage, processFunc = null) {
        if (!element) return;
        const errorElement = element.closest('.g-form-group')?.querySelector('.g-error-msg');
        element.addEventListener('blur', (e) => {
            let value = e.target.value;
            if (value && processFunc) { value = processFunc(value); }
            if (value && !validationRegex.test(value)) {
                if (errorElement) errorElement.textContent = errorMessage;
                e.target.classList.add('g-input-error');
            } else {
                if (errorElement) errorElement.textContent = '';
                e.target.classList.remove('g-input-error');
            }
        });
      }

      function addCustomValidationMessage(element) {
          if (!element) return;
          const customMessage = 'この項目を入力してください';
          const setValidationMessage = () => {
              if (element.validity.valueMissing) {
                  element.setCustomValidity(customMessage);
              } else {
                  element.setCustomValidity('');
              }
          };
          element.addEventListener('invalid', setValidationMessage);
          element.addEventListener('input', setValidationMessage);
          element.addEventListener('change', setValidationMessage);
      }

      function attachPatientFormEventListeners() {
          addLiveValidation(document.getElementById(config.uiIds.TEL1), /^\d{10,11}$/, '電話番号は10桁または11桁の半角数字で入力してください。', (v) => v.replace(/-/g, ''));
          addLiveValidation(document.getElementById(config.uiIds.TEL2), /^\d{10,11}$/, '電話番号は10桁または11桁の半角数字で入力してください。', (v) => v.replace(/-/g, ''));
          addLiveValidation(document.getElementById(config.uiIds.EMAIL), /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, '有効なメールアドレスを入力してください。');
          addLiveValidation(document.getElementById(config.uiIds.LAST_NAME_KANJI), /^[\u4E00-\u9FAF\u3400-\u4DBF々\u3040-\u309F\u30A0-\u30FFー]+$/, '姓（漢字）は、漢字で入力してください。');
          addLiveValidation(document.getElementById(config.uiIds.FIRST_NAME_KANJI), /^[\u4E00-\u9FAF\u3400-\u4DBF々\u3040-\u309F\u30A0-\u30FFー]+$/, '名（漢字）は、漢字で入力してください。');
          addLiveValidation(document.getElementById(config.uiIds.LAST_NAME_KANA), /^[\u3040-\u309Fー]+$/, '姓（ふりがな）は、ひらがなのみで入力してください。');
          addLiveValidation(document.getElementById(config.uiIds.FIRST_NAME_KANA), /^[\u3040-\u309Fー]+$/, '名（ふりがな）は、ひらがなのみで入力してください。');
          
          const tel1Element = document.getElementById(config.uiIds.TEL1);
          const tel2Element = document.getElementById(config.uiIds.TEL2);
          if(tel1Element && tel2Element) {
              tel2Element.addEventListener('blur', () => {
                  const tel1Value = tel1Element.value.replace(/-/g, '');
                  const tel2Value = tel2Element.value.replace(/-/g, '');
                  const errorElement = tel2Element.closest('.g-form-group')?.querySelector('.g-error-msg');
                  
                  if (tel1Value && tel2Value && tel1Value === tel2Value) {
                      if(errorElement) errorElement.textContent = '電話番号①と電話番号②に同じ番号は入力できません。';
                      tel2Element.classList.add('g-input-error');
                  } else if (errorElement && errorElement.textContent.includes('同じ番号')) {
                      errorElement.textContent = '';
                      tel2Element.classList.remove('g-input-error');
                  }
              });
          }
          
          document.getElementById(config.uiIds.CHART_NO)?.addEventListener('input', e => updateFbField(config.fbFields.CHART_NO, e.target.value));
          document.getElementById(config.uiIds.LAST_NAME_KANJI)?.addEventListener('input', e => updateFbField(config.fbFields.LAST_NAME_KANJI, e.target.value));
          document.getElementById(config.uiIds.FIRST_NAME_KANJI)?.addEventListener('input', e => updateFbField(config.fbFields.FIRST_NAME_KANJI, e.target.value));
          document.getElementById(config.uiIds.LAST_NAME_KANA)?.addEventListener('input', e => updateFbField(config.fbFields.LAST_NAME_KANA, e.target.value));
          document.getElementById(config.uiIds.FIRST_NAME_KANA)?.addEventListener('input', e => updateFbField(config.fbFields.FIRST_NAME_KANA, e.target.value));
          
          document.getElementById(config.uiIds.POSTAL_CODE)?.addEventListener('input', e => {
            updateFbField(config.fbFields.POSTAL_CODE, e.target.value);
            if (e.target.value.length === 7) {
                handleAddressSearch();
            }
          });
          
          document.getElementById(config.uiIds.STREET)?.addEventListener('input', e => updateFbField(config.fbFields.STREET, e.target.value));
          document.getElementById(config.uiIds.BUILDING)?.addEventListener('input', e => updateFbField(config.fbFields.BUILDING, e.target.value));
          document.getElementById(config.uiIds.TEL1)?.addEventListener('input', e => updateFbField(config.fbFields.TEL1, e.target.value));
          document.getElementById(config.uiIds.TEL2)?.addEventListener('input', e => updateFbField(config.fbFields.TEL2, e.target.value));
          document.getElementById(config.uiIds.CONTACT_TIME)?.addEventListener('input', e => updateFbField(config.fbFields.CONTACT_TIME, e.target.value));
          document.getElementById(config.uiIds.EMAIL)?.addEventListener('input', e => updateFbField(config.fbFields.EMAIL, e.target.value));
          document.getElementById('gemini-other-notes')?.addEventListener('input', e => updateFbField(config.fbFields.OTHER_NOTES, e.target.value));
          
          document.querySelectorAll(`input[name="${config.fbFields.GENDER}"]`).forEach(radio => {
              radio.addEventListener('change', e => updateFbField(config.fbFields.GENDER, e.target.value));
          });
          
          const dobHandler = () => {
              updateDobDays();
              const yEl = document.getElementById(config.uiIds.DOB_YEAR);
              const mEl = document.getElementById(config.uiIds.DOB_MONTH);
              const dEl = document.getElementById(config.uiIds.DOB_DAY);
              if (yEl.value && mEl.value && dEl.value) {
                  const yText = yEl.options[yEl.selectedIndex].textContent;
                  const mText = mEl.options[mEl.selectedIndex].textContent;
                  const dText = dEl.options[dEl.selectedIndex].textContent;
                  const dobValue = `${yText} ${mText} ${dText}`;
                  updateFbField(config.fbFields.DOB, dobValue);
              }
          };
          
          document.getElementById(config.uiIds.DOB_YEAR)?.addEventListener('change', dobHandler);
          document.getElementById(config.uiIds.DOB_MONTH)?.addEventListener('change', dobHandler);
          document.getElementById(config.uiIds.DOB_DAY)?.addEventListener('change', dobHandler);
          
          document.getElementById(config.uiIds.PRIVACY_AGREE)?.addEventListener('change', e => {
              const isChecked = e.target.checked;
              const value = isChecked ? '同意する' : '';
              updateFbField(config.fbFields.PRIVACY_AGREE, value);

              if (isChecked && config.state.requirement !== '初診') {
                  updateFbField(config.fbFields.REFERRAL_HOSPITAL, '');
                  updateFbField(config.fbFields.REFERRAL_TEL, '');
                  updateFbField(config.fbFields.REFERRAL_CD, '');
                  updateFbField(config.fbFields.SYMPTOM, '');
              }
          });

          document.querySelectorAll(`input[name="${config.fbFields.APPLICANT}"]`).forEach(radio => radio.addEventListener('change', handleApplicantChange));
          
          const emailConfirmInput = document.getElementById(config.uiIds.EMAIL_CONFIRM);
          emailConfirmInput?.addEventListener('input', handleEmailVerification);
          emailConfirmInput?.addEventListener('paste', e => { e.preventDefault(); });
          document.getElementById(config.uiIds.EMAIL)?.addEventListener('input', handleEmailVerification);
          
          const supplementInput = document.getElementById(config.uiIds.APPLICANT_SUPPLEMENT_INPUT);
          if (supplementInput) {
              supplementInput.addEventListener('input', (e) => {
                  updateFbField(config.fbFields.APPLICANT_SUPPLEMENT, e.target.value);
              });
          }
          const form = document.querySelector('form');
          if(form) {
            const allInputs = form.querySelectorAll('input, select, textarea');
            allInputs.forEach(input => addCustomValidationMessage(input));
          }
      }
      
      function handleApplicantChange(e) {
        if (!e || !e.target) return;
        
        updateFbField(config.fbFields.APPLICANT, e.target.value);
        
        const supplementArea = document.getElementById(config.uiIds.APPLICANT_SUPPLEMENT_AREA);
        const supplementInput = document.getElementById(config.uiIds.APPLICANT_SUPPLEMENT_INPUT);
        const supplementFormGroup = supplementArea.querySelector('.g-form-group');

        if (e.target.value === '本人') {
            if(supplementArea) supplementArea.style.display = 'none';
            if(supplementInput) supplementInput.required = false;
            if(supplementFormGroup) supplementFormGroup.classList.remove('required');
        } else {
            if(supplementArea) supplementArea.style.display = 'block';
            if(supplementInput) supplementInput.required = true;
            if(supplementFormGroup) supplementFormGroup.classList.add('required');
        }
      }

      async function handleAddressSearch() {
        const postalCodeInput = document.getElementById(config.uiIds.POSTAL_CODE);
        const errorElement = postalCodeInput.closest('.g-form-group')?.querySelector('.g-error-msg');
        
        try {
            if (!postalCodeInput) return;
            const postalCode = postalCodeInput.value;
            if (!/^\d{7}$/.test(postalCode)) {
                if(errorElement) errorElement.textContent = '7桁の半角数字で入力。';
                return;
            }
            if(errorElement) errorElement.textContent = '';
            
            const result = await fetchAddress(postalCode);
            if (result) {
                const fullAddress = (result.address1 || '') + (result.address2 || '') + (result.address3 || '');
                document.getElementById(config.uiIds.ADDRESS).value = fullAddress;
                updateFbField(config.fbFields.ADDRESS, fullAddress);
            } else {
                if(errorElement) errorElement.textContent = '住所が見つかりませんでした。';
                document.getElementById(config.uiIds.ADDRESS).value = '';
            }
        } catch (error) {
            console.error('[住所検索] エラー:', error);
            if(errorElement) errorElement.textContent = 'エラーが発生しました。';
        }
      }

      function handleEmailVerification() {
        const emailInput = document.getElementById(config.uiIds.EMAIL);
        const confirmInput = document.getElementById(config.uiIds.EMAIL_CONFIRM);
        if (!emailInput || !confirmInput) return;

        const errorElement = confirmInput.closest('.g-form-group')?.querySelector('.g-error-msg');
        if (!errorElement) return;

        const email = emailInput.value;
        const confirmEmail = confirmInput.value;
        if (confirmEmail && email !== confirmEmail) {
          errorElement.textContent = 'メールアドレスが一致しません。';
          confirmInput.classList.add('g-input-error');
        } else {
          errorElement.textContent = '';
          confirmInput.classList.remove('g-input-error');
        }
      }
      
      function updateDobDays() {
        const year = document.getElementById(config.uiIds.DOB_YEAR)?.value;
        const month = document.getElementById(config.uiIds.DOB_MONTH)?.value;
        const daySelect = document.getElementById(config.uiIds.DOB_DAY);
        if (!daySelect) return;
        const currentDay = daySelect.value;
        if (!year || !month) return;
        const daysInMonth = new Date(year, month, 0).getDate();
        daySelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '日';
        placeholder.disabled = true;
        if (!currentDay) placeholder.selected = true;
        daySelect.appendChild(placeholder);
        for (let i = 1; i <= daysInMonth; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i + '日';
            daySelect.appendChild(option);
        }
        if (currentDay && currentDay <= daysInMonth) daySelect.value = currentDay;
      }

      function createFormGroup(labelText, inputHTML, noteText = '', isRequired = false, postInputHtml = '') {
        const requiredClass = isRequired ? 'required' : '';
        const noteHTML = noteText ? `<p class="g-form-note">${noteText}</p>` : '';
        const errorHTML = `<div class="g-error-msg"></div>`;
        return `
          <div class="g-form-group ${requiredClass}">
            <label>${labelText}</label>${inputHTML}${postInputHtml}${noteHTML}${errorHTML}
          </div>`;
      }

      function createRadioGroup(labelText, name, options, noteText = '', isRequired = false, defaultValue = null) {
        const requiredClass = isRequired ? 'required' : '';
        const noteHTML = noteText ? `<p class="g-form-note">${noteText}</p>` : '';
        const radiosHTML = options.map(opt => {
            const checkedAttr = (opt === defaultValue) ? 'checked' : '';
            const requiredAttr = isRequired ? 'required' : '';
            return `<label><input type="radio" name="${name}" value="${opt}" ${requiredAttr} ${checkedAttr}> ${opt}</label>`;
        }).join('');
        const errorHTML = `<div class="g-error-msg"></div>`;
        return `
          <div class="g-form-group ${requiredClass}">
            <label>${labelText}</label><div class="g-radio-group">${radiosHTML}</div>${noteHTML}${errorHTML}
          </div>`;
      }

      function createDobFields() {
          const currentYear = new Date().getFullYear();
          const startYear = currentYear - 100;
          const eras = [
              { name: '令和', start: 2019 }, { name: '平成', start: 1989 },
              { name: '昭和', start: 1926 }, { name: '大正', start: 1912 },
          ];
          let yearOptions = '<option value="" disabled selected>西暦/和暦</option>';
          for (let y = currentYear; y >= startYear; y--) {
              const era = eras.find(e => y >= e.start);
              const eraYear = y - era.start + 1;
              const eraDisplay = `${era.name}${eraYear === 1 ? '元' : eraYear}年`;
              yearOptions += `<option value="${y}">${y}年 (${eraDisplay})</option>`;
          }
          let monthOptions = '<option value="" disabled selected>月</option>';
          for (let m = 1; m <= 12; m++) monthOptions += `<option value="${m}">${m}月</option>`;
          let dayOptions = '<option value="" disabled selected>日</option>';
          for (let d = 1; d <= 31; d++) dayOptions += `<option value="${d}">${d}日</option>`;
          const errorHTML = `<div class="g-error-msg"></div>`;
          return `
              <div class="g-form-group required">
                  <label>生年月日</label>
                  <div class="g-dob-fields">
                      <select id="${config.uiIds.DOB_YEAR}" class="g-form-control" required>${yearOptions}</select>
                      <select id="${config.uiIds.DOB_MONTH}" class="g-form-control" required>${monthOptions}</select>
                      <select id="${config.uiIds.DOB_DAY}" class="g-form-control" required>${dayOptions}</select>
                  </div>
                  ${errorHTML}
              </div>`;
      }

    function injectStyles() {
          const styleId = 'gemini-patient-form-styles';
          if (document.getElementById(styleId)) return;
          
          const css = `
            /* デフォルトのFBフィールドを非表示にする強力な指定 */
            .fb-editor-item-row,
            .el-form-item,
            .fb-content .field,
            [data-vv-name],
            .fb-field-label,
            .fb-custom--content--divider,
            .fb-custom--button--submit {
                display: none !important;
            }

            /* 独自UIは表示を許可する */
            #${config.uiIds.WIZARD_CONTAINER},
            .gemini-nav-btn {
                display: block !important;
            }
            
            /* もしフォーム全体が消えてしまった場合の救済 */
            form, .fb-content {
                visibility: visible !important;
            }

            /* 以下はオリジナルのCSSと同じ */
            #gemini-navigation-container { text-align: center; margin: 30px 0; }
            .gemini-summary-box { border: 1px solid #ddd; padding: 20px; margin-bottom: 20px; border-radius: 5px; background: #f9f9f9; }
            .gemini-summary-box table { width: 100%; border-collapse: collapse; }
            .gemini-summary-box th, .gemini-summary-box td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #eee;
                vertical-align: top;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            .gemini-summary-box th { width: 30%; font-weight: bold; background-color: #f2f2f2; }
            .gemini-summary-box ul { padding-left: 20px; margin: 0; }
            .gemini-summary-nav { text-align: center; margin-top: 20px; }
            .g-patient-form { padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; }
            .g-patient-form h2 { margin-bottom: 20px; font-size: 1.5em; border-bottom: 2px solid #005a9e; padding-bottom: 10px; }
            .g-form-group { margin-bottom: 20px; display: block !important; }
            .g-form-group label { display: block; font-weight: bold; margin-bottom: 8px; }
            .g-form-group.required > label:first-child::after { content: '必須'; color: #fff; background-color: #d9534f; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-left: 8px; font-weight: normal; vertical-align: middle; }
            .g-form-control { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; background-color: #fff; }
            .g-form-control { max-width: 300px; }
            textarea.g-form-control { max-width: 100%; }
            .g-form-control[readonly] { background-color: #f0f0f0; }
            .g-form-control.g-input-error { border-color: #d9534f !important; }
            .g-name-fields, .g-dob-fields { display: flex; gap: 10px; align-items: center; }
            .g-postal-code-wrapper { display: flex; gap: 10px; align-items: center; }
            .g-postal-code-wrapper .g-form-control { flex: 0 0 200px; }
            .g-name-fields > .g-form-control, .g-dob-fields > .g-form-control { flex: 1; }
            .g-btn { padding: 10px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; height: 40px; white-space: nowrap; }
            .g-btn:hover { background-color: #0056b3; }
            .g-btn:disabled { background-color: #ccc; cursor: not-allowed; }
            .g-form-note { font-size: 12px; color: #666; margin-top: 5px; }
            .g-radio-group label, .g-checkbox-label { font-weight: normal; display: inline-flex; align-items: center; margin-right: 15px; }
            #${config.uiIds.REQUIREMENT_AREA} .g-radio-group label { font-weight: bold; }
            .g-radio-label-disabled { color: #ccc; }
            .g-radio-group input, .g-checkbox-label input { margin-right: 8px; }
            .g-dob-fields select { flex: 1; }
            .g-error-msg { color: #d9534f; font-size: 12px; margin-top: 5px; min-height: 1em; }
            .g-privacy-policy { border: 1px solid #ddd; padding: 15px; border-radius: 5px; background-color: #f9f9f9; }
            .g-privacy-text { margin-bottom: 10px; }
            .g-chart-card-sample { max-width: 280px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px; background-color: #fff; padding: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .g-address-container { display: flex; flex-wrap: wrap; gap: 10px 5px; align-items: flex-start; }
            .g-address-container .g-form-group { margin-bottom: 0; }
            .g-address-container > div { flex: 1 1 auto; min-width: 200px; }
            #gemini-section-postal-code { flex-grow: 0; }
            .g-multistage-container, .g-fixed-resv-container { display: flex; flex-wrap: wrap; gap: 10px; }
            .g-multistage-container > div, .g-fixed-resv-container > div { flex: 1; max-width: 300px; min-width: 120px; }
            .g-multistage-container > div .g-form-control, .g-fixed-resv-container > div .g-form-control { width: 100%; max-width: none; }
            .g-wish-container { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 20px; margin-bottom: 15px; }
            .g-wish-container > label { flex-shrink: 0; font-weight: bold; margin-bottom: 0; }
            .g-wish-container > .g-form-control { flex-grow: 1; flex-shrink: 1; width: auto; min-width: 240px; max-width: 300px; }
            .g-wish-time-options { display: flex; flex-wrap: wrap; align-items: center; }
            
            .gemini-nav-btn, form .fb-submit, .fb-custom--button--submit button {
                justify-content: center !important;
                align-items: center !important;
                height: 44px !important;
                padding: 0 24px !important;
                font-size: 16px !important;
                font-weight: bold !important;
                border-radius: 5px !important;
                border-width: 1px !important;
                border-style: solid !important;
                cursor: pointer !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                text-decoration: none !important;
                transition: opacity 0.2s !important;
                vertical-align: middle !important;
                display: inline-flex !important;
            }
            
            form .fb-submit { display: none !important; }
            form.gemini-step-2 .fb-submit, form.gemini-step-2 .fb-custom--button--submit button { display: inline-flex !important; }

            form.gemini-step-2 .fb-custom--content--divider,
            form.gemini-step-2 .fb-custom--button--submit {
                display: block !important;
            }

            .gemini-nav-btn:hover, form .fb-submit:hover { opacity: 0.85 !important; }
            form .fb-submit, .fb-custom--button--submit button { background-color: #1E8449 !important; border-color: #1A5276 !important; color: white !important; }
            .gemini-nav-btn.gemini-btn-primary { background-color: #007bff !important; border-color: #007bff !important; color: white !important; }
            .gemini-nav-btn.gemini-injected-back-btn { background-color: #6c757d !important; border-color: #6c757d !important; color: white !important; }
            
            form .fb-submit + .gemini-injected-back-btn { margin-left: 30px !important; }
            .gemini-nav-btn:disabled { opacity: 0.65 !important; cursor: not-allowed !important; }
            @media (max-width: 768px) {
                .g-address-container { flex-direction: column; gap: 0; }
                .g-multistage-container, .g-fixed-resv-container, .g-wish-container, .g-name-fields, .g-dob-fields { flex-direction: column; align-items: stretch; gap: 8px; }
                .g-address-container > div, .g-multistage-container > div, .g-multistage-container .g-form-control, .g-fixed-resv-container > div, .g-wish-container > .g-form-control, .g-name-fields > .g-form-control, .g-dob-fields > .g-form-control { width: 100%; max-width: none; }
            }
            .gemini-rich-text p { margin: 0 !important; padding: 0 !important; line-height: 1.5 !important; }

            .fb-custom--title { font-size: 1.8rem !important; }
            .fb-custom--title-layout { padding-bottom: 0px !important; }
          `;
          const style = document.createElement('style');
          style.id = styleId;
          style.type = 'text/css';
          style.appendChild(document.createTextNode(css));
          document.head.appendChild(style);
      }

      function handleDataInjection(state) {
          console.log('[Gemini] Submitting Data... Injecting custom fields.');
          const data = config.state.submitData;

          Object.keys(data).forEach(fieldCode => {
              if (state.record[fieldCode]) {
                  state.record[fieldCode].value = data[fieldCode];
              }
          });
          return state;
      }

      window.fb.events.form.submit.push(handleDataInjection);

      let retryCount = 0;
      let isInitializing = false; // ★追加: 初期化中フラグ
      const MAX_RETRIES = 50; 

      const bootstrapper = setInterval(async () => {
          retryCount++;
          
          let anchorElement = document.querySelector(`[data-vv-name="${config.fbFields.REQUIREMENT}"]`) ||
                              document.querySelector(`[data-field-code="${config.fbFields.REQUIREMENT}"]`) ||
                              document.querySelector('.fb-custom--button--submit button') ||
                              document.querySelector('.fb-submit');

          if (retryCount % 5 === 0) {
             console.log(`[Gemini Debug] Polling for anchor element (Field: ${config.fbFields.REQUIREMENT})... (Attempt: ${retryCount}) Found: ${!!anchorElement}`);
          }

          if (anchorElement && !document.getElementById(config.uiIds.WIZARD_CONTAINER)) {
              if (isInitializing) return; // 初期化中はスキップ
              console.log('[Gemini Debug] Anchor element detected. Finding host container...');
              
              let host = anchorElement.closest('form') || 
                         anchorElement.closest('.fb-content') || 
                         anchorElement.closest('.el-form');
              
              if (!host) {
                  console.warn('[Gemini Debug] Could not find standard host (form/.fb-content). Using generic parent.');
                  host = anchorElement.parentElement.parentElement; 
              }

              if (host) {
                  console.log('[Gemini Debug] Host container determined:', host);
                  isInitializing = true; // フラグON
                  
                  // ★重要修正: Hostコンテナが非表示(hidden)の場合、強制的に表示させる
                  if (host.classList.contains('hidden')) {
                      console.log('[Gemini Debug] Host is hidden! Removing hidden class.');
                      host.classList.remove('hidden');
                  }
                  host.style.display = 'block';
                  host.style.visibility = 'visible';
                  
                  const wizardContainer = document.createElement('div');
                  wizardContainer.id = config.uiIds.WIZARD_CONTAINER;
                  
                  const patientFormContainer = document.createElement('div');
                  patientFormContainer.id = config.uiIds.PATIENT_FORM_CONTAINER;
                  patientFormContainer.style.marginTop = '20px';
                  
                  const summaryContainer = document.createElement('div');
                  summaryContainer.id = config.uiIds.SUMMARY_CONTAINER;
                  summaryContainer.style.display = 'none';
                  
                  const navigationContainer = document.createElement('div');
                  navigationContainer.id = config.uiIds.NAVIGATION_CONTAINER;

                  host.prepend(navigationContainer);
                  host.prepend(summaryContainer);
                  host.prepend(patientFormContainer);
                  host.prepend(wizardContainer);
                  
                  injectStyles();
                  
                  try {
                      await fetchData();
                      initializeWizardUI(wizardContainer);
                      initializePatientFormUI(patientFormContainer);

                      patientFormContainer.style.display = 'none';
                      navigationContainer.style.display = 'none';

                      updateFbField(config.fbFields.APPLICANT, '本人');
                      const applicantRadio = document.querySelector('input[name="申込者"][value="本人"]');
                      if (applicantRadio) handleApplicantChange({ target: applicantRadio });

                      updateProxyLabels();
                      
                      setTimeout(() => {
                          switchStep(config.state.currentStep);
                      }, 100);
                      
                      clearInterval(bootstrapper); // ★追加: 初期化成功したらポーリング停止

                  } catch (e) {
                      console.error('[Gemini] Initialization Error:', e);
                      wizardContainer.innerHTML = `<p style="color:red">システムエラーが発生しました: ${e.message}</p>`;
                      isInitializing = false; // エラー時はリトライ可能にするならOFFに戻す（今回はコンテナが残るので実質リトライしないが念のため）
                  }
              }
          }
          
          if (retryCount >= MAX_RETRIES) {
             console.warn('[Gemini Debug] Max retries reached. Stopping poller.');
             clearInterval(bootstrapper);
          }
      }, 200);

  } catch (globalError) {
      console.error('[Gemini FATAL] Script crashed at top-level:', globalError);
  }

})();