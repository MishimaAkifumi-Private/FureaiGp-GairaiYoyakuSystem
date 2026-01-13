kintone.events.on('app.record.index.show', async (event) => {
  // ============================================================
  // Version 2.0移行用制御フラグ
  // true: V1.0処理を実行する / false: V1.0処理をスキップする
  // ============================================================
  const ENABLE_V1_PROCESSING = false;

  if (!ENABLE_V1_PROCESSING) {
    console.log('InitialPcUserRegist3: フラグ設定によりV1.0の処理をスキップします。');
    return event;
  }

  const storageValue = localStorage.getItem('customKey');
  const storageTimestamp = localStorage.getItem('customTimestamp');
  const maxRetries = 5;
  let retryCount = 0;
  let loginSuccessful = false;
  const guestSpaceId = '11';
  const memberAppId = '144';
  const tableFieldCode = 'システム利用者一覧';
  const nameFieldCode = 'ユーザー';
  const datetimeFieldCode = '登録日時';

  console.log('app.record.index.show イベント発火');
  console.log('localStorage の値:', { storageValue, storageTimestamp });

  // カスタムスペースの要素を取得または作成
  let customSpace = document.getElementById('myCustomSpace');
  if (!customSpace) {
    customSpace = document.createElement('div');
    customSpace.id = 'myCustomSpace';
    customSpace.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      width:334px;
      border: 0.0px solid #999; /* 枠線を追加 */
      border-radius: 0px;        /* 角を丸くする */
      background-color:#3498db;  /* 薄い灰色 */
      margin-bottom:-2px;
      padding: 2px 5px;
    `;

    // ツールバーのコンテナ要素を取得
    const toolbarContainer = document.querySelector('.gaia-argoui-app-toolbar');
    if (toolbarContainer) {
      // ツールバーの先頭にカスタムスペースを挿入
      toolbarContainer.insertBefore(customSpace, toolbarContainer.firstChild);
    } else {
      console.error('kintoneのツールバー要素が見つかりません。');
      return; // ツールバーがない場合は処理を中断
    }
  }

  // ユーザー名表示要素
  const userDisplay = document.createElement('span');
  userDisplay.id = 'userDisplay';
  userDisplay.style.fontWeight = 'normal';             /* 標準の太さ */
  userDisplay.innerHTML = `ユーザーは <span style="color:#ffff00; font-weight:bold;">${storageValue}</span> さんです。`; // ユーザー
  customSpace.appendChild(userDisplay);

  // 解除ボタン
  const deleteButton = document.createElement('button');
  deleteButton.id = 'deleteUserButton';
  deleteButton.textContent = '解除';
  deleteButton.style.cssText = `
    background-color: #2f4f4f;
    color: white;
    border: none;
    padding: 2px 2px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.6em;
  `;
  deleteButton.onclick = () => {
    const confirmation = confirm('本当にこのユーザーを解除しますか？');
    if (confirmation) {
      localStorage.removeItem('customKey');
      localStorage.removeItem('customTimestamp');
      userDisplay.textContent = 'ユーザーは 未設定 です。'; // 解除後の表示を更新
      customSpace.removeChild(deleteButton);
      console.log('ユーザーを解除しました。');
    } else {
      console.log('解除がキャンセルされました。');
    }
  };

  // 5回までリトライ
  while (retryCount < maxRetries) {
    console.log(`リトライ回数: ${retryCount + 1}/${maxRetries}`);
    if (storageValue === 'cancel' && retryCount > 0) {
      console.log('前回のポップアップでキャンセルが選択されたため、処理を終了します。');
      localStorage.removeItem('customKey');
      localStorage.removeItem('customTimestamp');
      return event;
    }

    // ローカルストレージにユーザー情報があるか確認
    if (storageValue) {
      // ユーザー情報があれば、APIを呼び出さずにログイン成功とする
      console.log('ローカルストレージにユーザー情報が存在します。API呼び出しをスキップしてログイン成功とします。');
      loginSuccessful = true;
      userDisplay.innerHTML = `ユーザーは <span style="color:#ffff00; font-weight:bold;">${storageValue}</span> さんです。`; // ユーザー
      customSpace.appendChild(deleteButton); // ユーザー情報がある場合、常に表示
      break; // リトライループを抜ける
    } else {
      // ローカルストレージにユーザー情報がない場合、ポップアップを表示 (初期ログインと同様)
      console.log('ローカルストレージにユーザー情報がないため、ポップアップを表示 (初期ログイン)。');
      let nameList = [];
      try {
        // 144アプリからユーザーリストを取得
        console.log('kintone API 呼び出し開始:', { guestSpaceId, memberAppId, tableFieldCode, nameFieldCode });
        const apiPath = `/k/guest/${guestSpaceId}/v1/records`;
        const resp = await kintone.api(apiPath, 'GET', {
          app: memberAppId,
        });
        console.log('kintone API 呼び出し成功:', resp);
        console.log('取得したレコード:', resp.records);

        if (
          resp.records.length > 0 &&
          resp.records[0][tableFieldCode] &&
          Array.isArray(resp.records[0][tableFieldCode].value)
        ) {
          nameList = resp.records[0][tableFieldCode].value
            .map(row => row.value[nameFieldCode]?.value)
            .filter(Boolean);
        }

        console.log('取得した氏名一覧:', nameList);

        if (nameList.length === 0) {
          console.warn('144アプリに利用者が登録されていません');
          console.log('144アプリに利用者が登録されていません。');
        }
      } catch (e) {
        console.error('kintone API エラー:', e);
        //alert('氏名一覧の取得に失敗しました。');
        return event;
      }

      // ポップアップ用DOM作成
      const overlay = document.createElement('div');
      overlay.style = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
      `;

      const modal = document.createElement('div');
      modal.style = `
        background: white;
        padding: 24px 32px;
        border-radius: 8px;
        min-width: 320px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        text-align: center;
      `;

      const message = document.createElement('div');
      message.textContent = `このパソコンで予約システムを利用する方を選択してください。\n選択後、決定ボタンを押してください。`;
      message.style = `
        font-size: 1.07em;
        margin-bottom: 18px;
        color: #333;
        white-space: pre-line;
      `;

      const selectEl = document.createElement('select');
      selectEl.style = 'width: 90%; padding: 8px; margin-bottom: 18px; font-size: 1em;';
      if (nameList && nameList.length > 0) {
        nameList.forEach(name => {
          const option = document.createElement('option');
          option.value = name;
          option.textContent = name;
          selectEl.appendChild(option);
        });
        console.log('ドロップダウンに設定する氏名一覧:', nameList);
      } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '選択可能なユーザーがいません';
        selectEl.appendChild(option);
        selectEl.disabled = true;
        console.log('ドロップダウンに選択肢がありません');
      }

      const buttonContainer = document.createElement('div'); // ボタンコンテナを定義
      buttonContainer.style = `
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-top: 10px;
      `;

      const okButton = document.createElement('button');
      okButton.textContent = '決定';
      okButton.style = `
        background: #3498db;
        color: white;
        border: none;
        padding: 8px 28px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1em;
        min-width: 80px;
      `;
      if (nameList.length === 0) {
        okButton.disabled = true;
        okButton.style.opacity = 0.5;
      }

      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'キャンセル';
      cancelButton.style = `
        background: #e74c3c;
        color: white;
        border: none;
        padding: 8px 28px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1em;
        min-width: 80px;
      `;

      okButton.onclick = async () => {
        const selectedName = selectEl.value;
        // 決定ボタンが押されたときのタイムスタンプを生成 (日本時間)
        const timestamp = new Date().toLocaleString('ja-JP');
        console.log('選択された氏名:', selectedName);
        localStorage.setItem('customKey', selectedName);
        localStorage.setItem('customTimestamp', timestamp);
        console.log('localStorage に保存:', { customKey: selectedName, customTimestamp: timestamp });

        try {
          // 既存レコードの取得 (ユーザー名で検索)
          const getResp = await kintone.api(`/k/guest/${guestSpaceId}/v1/records`, 'GET', {
            app: memberAppId,
          });
          console.log('ユーザー名で検索した結果:', getResp.records);

          // 取得したレコードから、選択されたユーザー名と一致するレコードを検索
          const targetRecord = getResp.records.find(record => {
            return record[tableFieldCode]?.value?.some(item => {
              return item.value[nameFieldCode]?.value === selectedName;
            });
          });

          if (targetRecord) {
            // レコードが存在する場合、登録日時を更新
            console.log('更新対象レコード:', targetRecord);

            // サブテーブルの値を更新するための配列を作成
            const subTableRows = targetRecord[tableFieldCode].value.map(row => {
              if (row.value[nameFieldCode].value === selectedName) {
                // 選択されたユーザーの行の登録日時を更新
                return {
                  value: {
                    ...row.value,
                    [datetimeFieldCode]: { value: timestamp } // 日本時間を設定
                  }
                };
              }
              return row;
            });

            const updateData = {
              app: memberAppId,
              id: targetRecord.$id.value,
              record: {
                [tableFieldCode]: {
                  value: subTableRows
                }
              }
            };

            const updateResp = await kintone.api(`/k/guest/${guestSpaceId}/v1/record`, 'PUT', updateData);
            console.log('レコード更新API 応答:', updateResp);
            document.body.removeChild(overlay);
            localStorage.setItem('customKey', selectedName);
            localStorage.setItem('customTimestamp', timestamp); // 日本時間を設定
            console.log('レコード更新成功、ポップアップ削除');
            loginSuccessful = true;
            retryCount = maxRetries;
            userDisplay.innerHTML = `ユーザーは <span style="color:#ffff00; font-weight:bold;">${selectedName}</span> さんです。`; // ログイン成功後の表示
            customSpace.appendChild(deleteButton); // ログイン成功後も削除ボタンを表示
            return event;

          } else {
            console.error('更新対象のレコードが見つかりません');
            //alert('更新対象のレコードが見つかりませんでした。');
            retryCount++;
            console.log('レコードが見つからず、リトライカウント+1');
          }
        } catch (error) {
          console.error('kintone API エラー:', error);
          //alert('レコードの更新に失敗しました。');
          retryCount++;
          console.log('レコード更新APIエラー、リトライカウント+1');
        }
      };

      cancelButton.onclick = () => {
        localStorage.setItem('customKey', 'cancel');
        document.body.removeChild(overlay);
        retryCount = maxRetries;
        console.log('キャンセルボタンクリック、ポップアップ削除、リトライ終了');
        return event;
      };

      modal.appendChild(message);
      modal.appendChild(selectEl);
      buttonContainer.appendChild(okButton);  // ボタンコンテナにボタンを追加
      buttonContainer.appendChild(cancelButton); // ボタンコンテナにボタンを追加
      modal.appendChild(buttonContainer);    // ボタンコンテナをモーダルに追加
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      console.log('初回起動または144アプリにユーザー情報がないため、ポップアップを表示');

      await new Promise(resolve => {
        const observer = new MutationObserver(mutations => {
          if (!document.body.contains(overlay)) {
            resolve();
            observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
      break; // ポップアップ表示後、リトライループを抜ける
    }

    if (loginSuccessful) {
      break;
    }
    retryCount++;
  }

  if (!loginSuccessful) {
    //alert('ログインに失敗しました。');
    localStorage.removeItem('customKey');
    localStorage.removeItem('customTimestamp');
    return event;
  }
});