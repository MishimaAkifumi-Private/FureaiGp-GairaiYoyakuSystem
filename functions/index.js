/**
 * 外来予約システム - 共通メール送信 & 予約確認基盤 (Functions)
 *
 * [機能一覧]
 * 1. sendTestMail: 疎通確認用 (GETリクエスト)
 * 2. sendReservationMail: 予約メール送信 (POSTリクエスト, HTMLメール, BCC)
 * 3. confirmReservation: 予約確認 & 既読処理 (GETリクエスト, HTML返却, Kintone連携)
 *
 * [変更履歴]
 * 2026-01-07: 初版作成
 * 2026-01-07: sendReservationMail 実装
 * 2026-01-07: confirmReservation 実装 (Kintone API連携を追加)
 * 2026-01-07: HTML表示改良 (和暦表示, 診療科短縮, 不要項目削除)
 * 2026-01-23: confirmReservation 自動キャンセル機能・ステートマシン実装
 */

// ver 3.0 update
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

// --- 1. 共通設定 (Common Configuration) ---
// ※本番環境へ移行する際は、これらの値を環境変数 (process.env) に移すことを推奨します。
const config = {
  host: "mail.fureai-g.or.jp",
  port: 587,
  secure: false, // port 587 uses STARTTLS
  user: "is-support",
  pass: "tK8kBVEh",
};

// メーラーオブジェクトの作成 (シングルトン的扱い)
const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: {
    user: config.user,
    pass: config.pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// --- 2. 内部関数: メール送信実行部 (Core Logic) ---
async function sendMailCore(mailOptions) {
  console.log(`[Mailer] 送信開始: To=${mailOptions.to}, Subject=${mailOptions.subject}`);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] 送信成功: MessageID=${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Mailer] 送信エラー:`, error);
    throw error;
  }
}

// ======================================================================
//  Function 1: 疎通確認用 (sendTestMail)
// ======================================================================
exports.sendTestMail = functions.https.onRequest(async (req, res) => {
  console.log("--- [sendTestMail] Execution Started ---");
  const to = req.query.to;

  if (!to) {
    console.warn("[sendTestMail] エラー: 'to' パラメータがありません。");
    res.status(400).send({ status: "error", message: "パラメータ 'to' が必要です。" });
    return;
  }

  const mailOptions = {
    from: `"ふれあいグループ 湘南東部病院予約センター" <${config.user}@fureai-g.or.jp>`,
    to: to,
    subject: "【疎通テスト】Firebase Functions -> Kagoya SMTP",
    text: `このメールは、共通基盤/Mailerモジュールを使用して送信されています。\n送信時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
  };

  try {
    const result = await sendMailCore(mailOptions);
    res.status(200).send({ status: "success", message: "メールを送信しました。", data: result });
  } catch (error) {
    res.status(500).send({ status: "error", message: "送信に失敗しました。", error: error.toString() });
  }
  console.log("--- [sendTestMail] Execution Finished ---");
});


// ======================================================================
//  Function 2: 予約通知メール送信 (sendReservationMail)
// ======================================================================
exports.sendReservationMail = functions.https.onRequest(async (req, res) => {
  // 1. CORSヘッダーを最優先でセット
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Preflight (OPTIONS) は即座に返す
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log("--- [sendReservationMail] Execution Started ---");

    if (req.method !== 'POST') {
      console.warn(`[sendReservationMail] Method Not Allowed: ${req.method}`);
      res.status(405).send({ status: "error", message: "POSTメソッドのみ許可されています。" });
      return;
    }

    const data = req.body;
    console.log("[LOG] 受信データ:", JSON.stringify(data, null, 2));

    if (!data.to || !data.type || !data.name) {
      console.error("[ERROR] 必須パラメータ不足");
      res.status(400).send({ status: "error", message: "必須パラメータが不足しています。" });
      return;
    }

    const recipientName = data.name;
    const targetUrl = data.url || "(URL生成未定)";
    let subject = "";
    let htmlBody = "";
    let textBody = ""; // テキストメール用変数を追加
    
    const headerHtml = `<p>${recipientName} 様</p><p>当病院をご利用いただきありがとうございます。</p>`;
    const footerHtml = `<br><hr><p>ふれあいグループ 湘南東部病院予約センター</p>`;

    // ボタン表示用HTML (インラインスタイル)
    const btnHtml = `
      <div style="margin: 20px 0;">
        <a href="${targetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #005a9e; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold;">ご予約情報</a>
      </div>
      <p style="font-size: 12px; color: #777;">※上記ボタンがクリックできない場合は、以下のURLをご確認ください。<br><a href="${targetUrl}">${targetUrl}</a></p>
    `;

    // テキストメール用ヘッダー・フッター
    const headerText = `${recipientName} 様\n\n当病院をご利用いただきありがとうございます。\n`;
    const footerText = `\n\n--------------------------------------------------\nふれあいグループ 湘南東部病院予約センター`;

    switch (data.type) {
      case "初診":
        subject = "【予約確定】診療のご予約（初診）について";
        htmlBody = `
          ${headerHtml}
          <p>診療のご予約（初診）についてお知らせします。<br>
          以下のボタンをクリックして内容をご確認ください。</p>
          ${btnHtml}
          ${footerHtml}
        `;
        textBody = `${headerText}\n診療のご予約（初診）についてお知らせします。\n以下のURLより内容をご確認ください。\n\n${targetUrl}${footerText}`;
        break;

      case "変更":
        subject = "【予約変更】診療予約の変更について";
        htmlBody = `
          ${headerHtml}
          <p>診療のご予約（変更）につきましてお知らせします。<br>
          以下のボタンをクリックして内容をご確認ください。</p>
          ${btnHtml}
          ${footerHtml}
        `;
        textBody = `${headerText}\n診療のご予約（変更）につきましてお知らせします。\n以下のURLより内容をご確認ください。\n\n${targetUrl}${footerText}`;
        break;

      case "取消":
        const resDate = data.reservationDate || "（日付未定）";
        const resTime = data.reservationTime || "";
        const resDept = data.department || "（診療科不明）";
        const resMessage = data.message || "";
        const resMessageHtml = resMessage ? `<br><p>${resMessage.replace(/\n/g, '<br>')}</p>` : "";
        const resMessageText = resMessage ? `\n\n${resMessage}` : "";

        subject = "【予約取消】診療予約の取り消しについて";
        htmlBody = `
          ${headerHtml}
          <p>以下のご予約を取消しさせていただきました。</p>
          <p><strong>取り消したご予約:</strong></p>
          <ul>
            <li>日時: ${resDate} ${resTime}</li>
            <li>診療科: ${resDept}</li>
          </ul>
          ${resMessageHtml}
          <p>本メールは手続き完了の通知のみとなります。\n\n別途お手続きは不要です。\n\nお大事になさってください。</p>
          ${footerHtml}
        `;
        textBody = `${headerText}\n以下のご予約を取消しさせていただきました。\n\n[取り消したご予約]\n日時: ${resDate} ${resTime}\n診療科: ${resDept}${resMessageText}\n\n通知のみとなりますので、URLのクリックは不要です。${footerText}`;
        break;

      default:
        console.warn(`[WARN] 未定義の用件タイプ: ${data.type}`);
        subject = "【お知らせ】ふれあいグループ 湘南東部病院予約センターからのご連絡";
        htmlBody = `
          ${headerHtml}
          <p>下記より内容をご確認ください。</p>
          ${btnHtml}
          ${footerHtml}
        `;
        textBody = `${headerText}\n下記より内容をご確認ください。\n\n${targetUrl}${footerText}`;
        break;
    }

    const mailOptions = {
      from: `"ふれあいグループ 湘南東部病院予約センター" <${config.user}@fureai-g.or.jp>`,
      to: data.to,
      bcc: "akifumi.mishima@gmail.com",
      subject: subject,
      html: htmlBody,
      text: textBody, // テキストパートを追加
    };

    const result = await sendMailCore(mailOptions);
    res.status(200).send({ status: "success", message: "予約メールを送信しました。", data: result });
    console.log("--- [sendReservationMail] Execution Finished ---");

  } catch (error) {
    console.error(`[CRITICAL ERROR] sendReservationMail failed:`, error);
    // エラー時もCORSヘッダー付きでレスポンスを返す
    res.status(500).send({ status: "error", message: "内部エラーが発生しました。", error: error.toString() });
  }
});


// ======================================================================
//  Function 3: 予約確認 & 既読処理 (confirmReservation)
// ======================================================================
exports.confirmReservation = functions.https.onRequest(async (req, res) => {
  console.log("--- [confirmReservation] Execution Started ---");

  // CORS設定 (POSTリクエストを受け付けるため)
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // クエリパラメータの取得 (?id=xxx)
  let recordId = req.query.id || req.body.id;
  const token = req.query.token;
  let mode = req.query.mode; // URLパラメータがあれば優先

  // --- Kintone API 設定 ---
  // 環境変数から設定を取得 (デフォルト値は既存環境に合わせています)
  const GUEST_SPACE_ID = process.env.KINTONE_GUEST_SPACE_ID || "11";
  const APP_ID = process.env.KINTONE_APP_ID || "142";
  const API_TOKEN = process.env.KINTONE_API_TOKEN || "lzGrrquqznrH0cpPIzmzvLKdn4PhyebSRyYKMxSE";
  const SUBDOMAIN = process.env.KINTONE_SUBDOMAIN || "w60013hke2ct";
  const BASE_URI = `https://${SUBDOMAIN}.cybozu.com/k/guest/${GUEST_SPACE_ID}/v1`;

  // IDがなくトークンがある場合、トークンからレコードIDを検索・特定する
  if (!recordId && token) {
    try {
      const searchResp = await fetch(`${BASE_URI}/records.json?app=${APP_ID}&query=${encodeURIComponent(`URLトークン="${token}"`)}`, {
        method: "GET",
        headers: { "X-Cybozu-API-Token": API_TOKEN }
      });
      if (searchResp.ok) {
        const searchData = await searchResp.json();
        if (searchData.records && searchData.records.length > 0) {
          recordId = searchData.records[0].$id.value;
          console.log(`[LOG] トークンからレコード特定: ID=${recordId}`);
        }
      }
    } catch (e) {
      console.error("[ERROR] トークン検索失敗:", e);
    }
  }

  if (!recordId) {
    console.error("[ERROR] パラメータ 'id' または有効な 'token' が不足しています。");
    res.status(400).send("エラー: 不正なアクセスです (ID/Token不足)");
    return;
  }

  try {
    // 1. 最新レコードの取得 (GET)
    console.log(`[LOG] レコード取得開始: RecordID=${recordId}`);
    const getResponse = await fetch(`${BASE_URI}/record.json?app=${APP_ID}&id=${recordId}`, {
        method: "GET",
        headers: { "X-Cybozu-API-Token": API_TOKEN }
    });

    if (!getResponse.ok) {
        throw new Error(`レコード取得失敗: ${getResponse.status}`);
    }

    const getData = await getResponse.json();
    const record = getData.record;
    const currentStatus = (record["管理状況"] && record["管理状況"].value) || "";
    const phoneConfirmDate = (record["電話確認日時"] && record["電話確認日時"].value) || "";
    const mailReadDate = (record["メール既読日時"] && record["メール既読日時"].value) || "";
    const sendDateVal = (record["メール送信日時"] && record["メール送信日時"].value) || "";
    const timeoutVal = (record["タイムアウト"] && record["タイムアウト"].value) || "2時間";
    const recordUrlToken = (record["URLトークン"] && record["URLトークン"].value) || "";
    const methodVal = (record["応対方法"] && record["応対方法"].value) || "";

    // ---------------------------------------------------------
    // POSTリクエスト処理 (キャンセル実行)
    // ---------------------------------------------------------
    if (req.method === 'POST') {
      const action = req.body.action;
      
      if (action === 'cancel' || action === 'cancel_timeout') {
        console.log(`[LOG] キャンセル処理開始: RecordID=${recordId}, Action=${action}`);

        // 既にキャンセル済みの場合は専用画面へ
        if (currentStatus === "キャンセル" || currentStatus === "URL取下") {
            res.status(200).send(getAlreadyCancelledHtml());
            return;
        }

        const nowISO = new Date().toISOString();

        // Kintone更新: ステータス変更 & キャンセル日時記録
        const updateBody = {
            app: APP_ID,
            id: recordId,
            record: {
                "管理状況": { value: "URL取下" },
                "キャンセル日時": { value: nowISO },
                "キャンセル実行者": { value: "本人" },
                "ReserveLock": { value: "unlock" } // ★追加: URL取下(キャンセル)時はunlock
            }
        };

        const updateResponse = await fetch(`${BASE_URI}/record.json`, {
            method: "PUT",
            headers: {
                "X-Cybozu-API-Token": API_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updateBody)
        });

        if (!updateResponse.ok) {
            const errText = await updateResponse.text();
            throw new Error(`Kintone Update Failed (Cancel): ${errText}`);
        }

        // URL取下完了画面へ (メール送信はしない)
        if (action === 'cancel') {
            res.status(200).send(getWithdrawnHtml());
            return;
        }

        // タイムアウトキャンセルならWEBフォームへリダイレクト
        if (action === 'cancel_timeout') {
            const formUrl = "https://93ac276f.form.kintoneapp.com/waiting/?_formCode=34f65f5aac95cf65e480602f89cf3846c2dfd4345bc2b4cb05d97a20dea6c46d";
            res.redirect(formUrl);
            return;
        }

        res.status(200).send(getCancellationCompletedHtml());
        return;
      }

      // 再依頼実行 (タイムアウト後の当日再依頼)
      if (action === 're_request') {
        console.log(`[LOG] 再依頼処理開始: RecordID=${recordId}`);
        
        const updateBody = {
            app: APP_ID,
            id: recordId,
            record: {
                "管理状況": { value: "申込者再依頼" }
            }
        };

        const updateResponse = await fetch(`${BASE_URI}/record.json`, {
            method: "PUT",
            headers: {
                "X-Cybozu-API-Token": API_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updateBody)
        });

        if (!updateResponse.ok) {
            const errText = await updateResponse.text();
            throw new Error(`Kintone Update Failed (ReRequest): ${errText}`);
        }

        res.status(200).send(getReRequestCompletedHtml());
        return;
      }
    }

    // ---------------------------------------------------------
    // GETリクエスト処理 (画面表示)
    // ---------------------------------------------------------
    
    // 0.5 トークン検証 (URL再利用防止)
    // レコードにトークンが設定されている場合、クエリのトークンと一致しなければ無効とする
    if (recordUrlToken && recordUrlToken !== token) {
        console.warn(`[WARN] Token Mismatch: Record=${recordUrlToken}, Query=${token}`);
        res.status(200).send(getExpiredHtml());
        return;
    }

    // ★ 既読日時の更新 (順序変更: ステータス判定の前に実行)
    // 未読の場合、アクセスがあった時点で既読日時を記録する
    if (!mailReadDate) {
        const nowISO = new Date().toISOString();
        const updateBody = {
            app: APP_ID,
            id: recordId,
            record: {
                "メール既読日時": { value: nowISO }
            }
        };
        
        // ステータス更新判定
        // 以下のステータスの場合は、ステータス自体は変更せず、既読日時のみ記録する
        const keepStatusList = ["キャンセル", "URL取下", "スタッフ取下", "閲覧期限切れ", "電話合意済", "完了", "終了", "メール既読", "メール合意済"];
        
        // ステータスが上記以外（主に「メール送信済」）の場合のみ「メール既読」に変更
        if (!keepStatusList.includes(currentStatus)) {
            updateBody.record["管理状況"] = { value: "メール既読" };
        }

        try {
            const updateResponse = await fetch(`${BASE_URI}/record.json`, {
                method: "PUT",
                headers: { "X-Cybozu-API-Token": API_TOKEN, "Content-Type": "application/json" },
                body: JSON.stringify(updateBody)
            });
            if (!updateResponse.ok) console.error(`[ERROR] 既読更新失敗: ${await updateResponse.text()}`);
        } catch (e) { console.error(`[ERROR] 既読更新エラー:`, e); }
    }

    // 1. 既にキャンセル済みの場合
    if (currentStatus === "キャンセル" || currentStatus === "URL取下" || currentStatus === "スタッフ取下") {
        res.status(200).send(getAlreadyCancelledHtml());
        return;
    }

    // 1.2 再依頼済みの場合
    if (currentStatus === "申込者再依頼") {
        res.status(200).send(getReRequestProcessingHtml());
        return;
    }

    // 1.5 タイムアウト判定
    // ステータスが「閲覧期限切れ」の場合、または期限切れの場合
    if (currentStatus === "閲覧期限切れ") {
        // 日付判定 (日本時間で当日中かどうか)
        const fmt = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' });
        const sendDateStr = sendDateVal ? fmt.format(new Date(sendDateVal)) : "";
        const nowDateStr = fmt.format(new Date());

        if (sendDateStr === nowDateStr) {
            // 当日中なら再依頼ボタンを表示
            res.status(200).send(getTimeoutRetryHtml(recordId));
        } else {
            // 翌日以降ならフォーム誘導
            res.status(200).send(getTimeoutHtml());
        }
        return;
    }

    if (sendDateVal && !mailReadDate) {
        let isTimedOut = false;
        const sentTime = new Date(sendDateVal);
        const now = new Date();

        if (timeoutVal === '今日中') {
            const endOfToday = new Date(sentTime);
            endOfToday.setHours(23, 59, 59, 999);
            if (now > endOfToday) isTimedOut = true;
        } else if (timeoutVal === '明日中') {
            const endOfTomorrow = new Date(sentTime);
            endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
            endOfTomorrow.setHours(23, 59, 59, 999);
            if (now > endOfTomorrow) isTimedOut = true;
        } else {
            let timeoutHours = 2; // デフォルト
            const match = timeoutVal.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (timeoutVal.includes('分')) {
                    timeoutHours = num / 60;
                } else { // 時間と仮定
                    timeoutHours = num;
                }
            }
            const diffHours = (now.getTime() - sentTime.getTime()) / (1000 * 60 * 60);
            if (diffHours >= timeoutHours) isTimedOut = true;
        }

        if (isTimedOut) {
            // タイムアウト発生: ステータスを更新してエラー画面へ
            const updateBody = {
                app: APP_ID,
                id: recordId,
                record: {
                    "管理状況": { value: "閲覧期限切れ" }
                }
            };
            await fetch(`${BASE_URI}/record.json`, {
                method: "PUT",
                headers: {
                    "X-Cybozu-API-Token": API_TOKEN,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updateBody)
            });
            res.status(200).send(getTimeoutHtml());
            return;
        }
    }

    // 2. 既読日時の更新 (未読の場合、または電話調整済みだがメールリンクを初めて踏んだ場合)
    // ステータスが既に「メール既読検知」でも、メール既読日時が空なら更新する
    if (!mailReadDate) {
        const nowISO = new Date().toISOString();
        const updateBody = {
            app: APP_ID,
            id: recordId,
            record: {
                "メール既読日時": { value: nowISO }
            }
        };
        
        // ステータス更新 (キャンセル等でなければ「メール既読」へ)
        const keepStatusList = ["キャンセル", "URL取下", "スタッフ取下", "閲覧期限切れ", "電話合意済", "完了", "終了", "メール既読", "メール合意済"];
        if (!keepStatusList.includes(currentStatus)) {
            updateBody.record["管理状況"] = { value: "メール既読" };
        }

        const updateResponse = await fetch(`${BASE_URI}/record.json`, {
            method: "PUT",
            headers: {
                "X-Cybozu-API-Token": API_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updateBody)
        });

        if (!updateResponse.ok) {
            const errText = await updateResponse.text();
            console.error(`[ERROR] 既読更新失敗: ${errText}`);
        }
    }

    // 3. キャンセルボタンの表示判定
    // - 既にステータスが「メール既読検知」だった場合 (再アクセス)
    // - または、電話確認日時が入っている場合 (電話調整済みなら初回アクセスでもキャンセル可)
    // - mode=phone の場合 (電話対応での案内メール) は初回からキャンセル可能
    // 既読日時が入っている場合も既読とみなす
    const isAlreadyRead = !!mailReadDate || (currentStatus === "メール既読");
    const isPhoneConfirmed = !!phoneConfirmDate;
    // URLパラメータのmode、またはレコードの応対方法が「phone/電話対応」の場合
    const showCancel = isAlreadyRead || isPhoneConfirmed || (mode === 'phone') || (methodVal === 'phone' || methodVal === '電話対応');

    const html = getConfirmedHtml(record, recordId, showCancel, mode);
    res.status(200).send(html);

  } catch (error) {
    console.error(`[CRITICAL ERROR] confirmReservation failed:`, error);
    res.status(500).send(getErrorHtml(error.message));
  }
});

// --- HTML Helper Functions ---

/**
 * 予約確定画面のHTMLを生成
 * @param {object} record Kintoneレコード
 * @param {string} recordId レコードID
 * @param {boolean} showCancel キャンセルボタンを表示するかどうか
 * @param {string} mode 表示モード (phone/mail)
 */
function getConfirmedHtml(record, recordId, showCancel, mode) {
    const lastName = (record["姓漢字"] && record["姓漢字"].value) || "";
    const firstName = (record["名漢字"] && record["名漢字"].value) || "";
    const name = lastName + " " + firstName;
    const resTime = (record["確定予約時刻"] && record["確定予約時刻"].value) || "";
    
    let dept = (record["診療科"] && record["診療科"].value) || "-";
    if (dept.includes('/')) {
        const parts = dept.split('/');
        dept = parts[parts.length - 1].trim();
    }

    let formattedDate = (record["確定予約日"] && record["確定予約日"].value) || "未定";
    if (record["確定予約日"] && record["確定予約日"].value) {
        try {
            const d = new Date(record["確定予約日"].value);
            formattedDate = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
                era: 'long', year: 'numeric', month: 'long', day: 'numeric'
            }).format(d);
        } catch (e) { /* ignore */ }
    }
    const dateTimeStr = `${formattedDate} ${resTime}`;

    // フッター注釈の出し分け
    const footerNote = showCancel ? '※キャンセルは上記ボタン、またはお電話にてご連絡ください。' : '';

    // キャンセルボタンのHTML (POSTフォーム)
    const cancelBtnHtml = showCancel ? `
        <div class="btn-area">
            <form method="POST" action="?id=${recordId}" onsubmit="return confirm('本当に予約を取り下げますか？');">
                <input type="hidden" name="action" value="cancel">
                <button type="submit" class="btn-cancel">予約をキャンセルする</button>
            </form>
        </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>予約確定</title>
        <style>
          body { font-family: "Helvetica Neue", Arial, sans-serif; background-color: #f4f7f6; color: #333; padding: 20px; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          h1 { color: #005a9e; font-size: 22px; margin-top: 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; }
          .message { margin-bottom: 25px; line-height: 1.6; }
          .info-box { background: #f9f9f9; border-radius: 6px; padding: 20px; }
          .info-row { display: flex; border-bottom: 1px solid #eee; padding: 12px 0; }
          .info-row:last-child { border-bottom: none; }
          .label { width: 100px; font-weight: bold; color: #777; font-size: 14px; }
          .value { flex: 1; font-weight: bold; font-size: 15px; color: #333; }
          .btn-area { text-align: center; margin-top: 20px; }
          .btn-cancel { display: inline-block; padding: 12px 24px; background-color: #e74c3c; color: white; text-decoration: none; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 14px; transition: background-color 0.3s; }
          .btn-cancel:hover { background-color: #c0392b; }
          .footer { margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
          .footer-signature { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 8px; }
          .footer-note { font-size: 12px; color: #aaa; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>予約が確定しました</h1>
          <div class="message">
            <strong>${name} 様</strong><br>
            以下の内容で予約が確定しております。<br>
            当日はお気をつけてお越しください。
          </div>
          
          <div class="info-box">
            <div class="info-row">
              <div class="label">予約日時</div>
              <div class="value">${dateTimeStr}</div>
            </div>
            <div class="info-row">
              <div class="label">診療科</div>
              <div class="value">${dept}</div>
            </div>
          </div>

          ${cancelBtnHtml}

          <div class="footer">
            <div class="footer-signature">ふれあいグループ 湘南東部病院予約センター</div>
            <div class="footer-note">${footerNote}</div>
          </div>
        </div>
      </body>
      </html>
    `;
}

/**
 * 既にキャンセル済みの場合のHTML
 */
function getAlreadyCancelledHtml() {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>キャンセル済み</title>
        <style>
          body { font-family: sans-serif; background-color: #f4f7f6; padding: 20px; text-align: center; }
          .container { max-width: 500px; margin: 50px auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          h1 { color: #7f8c8d; font-size: 20px; }
          p { color: #555; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>この予約は無効になりました</h1>
          <p>この予約は無効となったか、既に取り下げ手続きが完了しています。<br>ご不明な点がございましたら、ふれあいグループ 湘南東部病院予約センターまでお問い合わせください。</p>
        </div>
      </body>
      </html>
    `;
}

/**
 * URL取下完了時のHTML (新規追加)
 */
function getWithdrawnHtml() {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>キャンセル完了</title>
        <style>
          body { font-family: sans-serif; background-color: #f4f7f6; padding: 20px; text-align: center; }
          .container { max-width: 500px; margin: 50px auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          h1 { color: #7f8c8d; font-size: 20px; }
          p { color: #555; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>予約を取り下げました</h1>
          <p>ご予約の取り下げを受け付けました。<br>またのご利用をお待ちしております。</p>
        </div>
      </body>
      </html>
    `;
}

/**
 * タイムアウト時の再依頼可能画面 (当日用)
 */
function getTimeoutRetryHtml(recordId) {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>予約確認期限切れ</title>
        <style>
          body { font-family: "Helvetica Neue", Arial, sans-serif; background-color: #f4f7f6; padding: 20px; text-align: center; color: #333; }
          .container { max-width: 600px; margin: 50px auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          h1 { color: #e74c3c; font-size: 20px; margin-bottom: 20px; }
          p { line-height: 1.8; margin-bottom: 20px; text-align: left; }
          .btn-retry { display: inline-block; padding: 15px 40px; background-color: #3498db; color: #fff; text-decoration: none; border: none; border-radius: 6px; font-weight: bold; font-size: 16px; cursor: pointer; transition: background-color 0.2s; }
          .btn-retry:hover { background-color: #2980b9; }
          .btn-cancel { display: inline-block; padding: 15px 40px; background-color: #95a5a6; color: #fff; text-decoration: none; border: none; border-radius: 6px; font-weight: bold; font-size: 16px; cursor: pointer; transition: background-color 0.2s; }
          .btn-cancel:hover { background-color: #7f8c8d; }
          .btn-group { display: flex; justify-content: center; gap: 15px; margin-top: 30px; flex-wrap: wrap; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>予約確認の期限が切れました</h1>
          <p>所定の時間内にご確認いただけなかったため、予約枠の確保を解除いたしました。</p>
          <p>本日中であれば以下のボタンから<strong>再依頼</strong>を行うことが可能です。<br>再依頼を行うと、すでに頂ている希望内容をもとに再調整してご連絡いたします。</p>
          <p>再依頼を行わない場合は「再依頼しない」を選択してください。<br>この予約はキャンセル扱いとなりますが、明日まで待つことなくWEBフォームから新たな予約を行うことができます。</p>
          <div class="btn-group">
            <form method="POST" action="?id=${recordId}">
              <input type="hidden" name="action" value="re_request">
              <button type="submit" class="btn-retry">再依頼する</button>
            </form>
            <form method="POST" action="?id=${recordId}" onsubmit="return confirm('再依頼を行わずに終了しますか？\\nこの予約はキャンセル扱いとなります。');">
              <input type="hidden" name="action" value="cancel_timeout">
              <button type="submit" class="btn-cancel">再依頼しない</button>
            </form>
          </div>
        </div>
      </body>
      </html>
    `;
}

/**
 * 再依頼完了画面
 */
function getReRequestCompletedHtml() {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>再依頼完了</title>
        <style>
          body { font-family: sans-serif; background-color: #f4f7f6; padding: 20px; text-align: center; }
          .container { max-width: 500px; margin: 50px auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          h1 { color: #27ae60; font-size: 20px; }
          p { color: #555; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>再依頼を受け付けました</h1>
          <p>担当者が内容を確認し、改めてご連絡いたします。<br>しばらくお待ちください。</p>
        </div>
      </body>
      </html>
    `;
}

/**
 * 再依頼手続き中画面
 */
function getReRequestProcessingHtml() {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>再依頼手続き中</title>
        <style>
          body { font-family: sans-serif; background-color: #f4f7f6; padding: 20px; text-align: center; }
          .container { max-width: 500px; margin: 50px auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          h1 { color: #27ae60; font-size: 20px; }
          p { color: #555; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>現在再依頼手続き中です</h1>
          <p>担当者が内容を確認し、改めてご連絡いたします。<br>しばらくお待ちください。</p>
        </div>
      </body>
      </html>
    `;
}

/**
 * タイムアウト（閲覧期限切れ）時のHTML
 */
function getTimeoutHtml() {
    const formUrl = "https://93ac276f.form.kintoneapp.com/waiting/?_formCode=34f65f5aac95cf65e480602f89cf3846c2dfd4345bc2b4cb05d97a20dea6c46d";
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>予約取り消しのお知らせ</title>
        <style>
          body { font-family: "Helvetica Neue", Arial, sans-serif; background-color: #f4f7f6; padding: 20px; text-align: center; color: #333; }
          .container { max-width: 600px; margin: 50px auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          h1 { color: #e74c3c; font-size: 20px; margin-bottom: 20px; }
          p { line-height: 1.8; margin-bottom: 20px; text-align: left; }
          a { color: #3498db; text-decoration: underline; }
          /* ボタン用スタイル */
          .btn-retry {
            display: inline-block;
            padding: 15px 40px;
            background-color: #3498db;
            color: #fff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            margin-top: 10px;
            margin-bottom: 10px;
            transition: background-color 0.2s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .btn-retry:hover { background-color: #2980b9; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>予約取り消しのお知らせ</h1>
          <p>診療のご予約をいただき、誠にありがとうございました。</p>
          <p>予約センターよりご提示させていただいた予約枠について、ご本人様による閲覧確認が期限内に行われなかったため、誠に恐縮ながら、お申し込みは一度取り消しの扱いとさせていただきました。<br>他の患者様との予約調整の兼ね合いもあり、ご本人様の閲覧確認が取れない状態での長時間の予約枠の維持が難しく、このような対応となりましたことを何卒ご容赦ください。</p>
          <p>つきましては、再度受診をご希望される場合、お手数ではございますが、<br>以下のボタンより改めてお申し込みをいただけますでしょうか。</p>
          <div style="text-align: center;">
            <a href="${formUrl}" class="btn-retry">再依頼</a>
          </div>
          <p>再度のご予約を心よりお待ちしております。</p>
        </div>
      </body>
      </html>
    `;
}

/**
 * エラー画面のHTML
 */
function getErrorHtml(message) {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>システムエラー</title>
        <style>
          body { font-family: sans-serif; background-color: #f4f7f6; padding: 20px; text-align: center; }
          .container { max-width: 500px; margin: 50px auto; background: #fff; padding: 40px; border-radius: 8px; }
          h1 { color: #e74c3c; }
          p { color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
            <h1>システムエラー</h1>
            <p>処理中にエラーが発生しました。</p>
            <p style="font-size:12px; color:#999;">${message}</p>
        </div>
      </body>
      </html>
    `;
}

/**
 * 有効期限切れ画面のHTMLを生成するヘルパー関数
 */
function getExpiredHtml() {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>リンク有効期限切れ</title>
      <style>
        body { font-family: "Helvetica Neue", Arial, sans-serif; background-color: #f4f7f6; color: #333; padding: 20px; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .container { max-width: 500px; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; }
        h1 { color: #e74c3c; font-size: 20px; margin-bottom: 20px; }
        p { font-size: 14px; line-height: 1.6; color: #555; }
        .icon { font-size: 48px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠️</div>
        <h1>このリンクは無効です</h1>
        <p>予約日時を過ぎているため、詳細を表示できません。<br>
        ご不明な点がございましたら、ふれあいグループ 湘南東部病院予約センターまでお問い合わせください。</p>
      </div>
    </body>
    </html>
  `;
}