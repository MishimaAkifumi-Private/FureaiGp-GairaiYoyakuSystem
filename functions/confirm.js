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
    from: `"予約センター" <${config.user}@fureai-g.or.jp>`,
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
    
    const headerHtml = `<p>${recipientName} 様</p><p>当病院をご利用いただきありがとうございます。</p>`;
    const footerHtml = `<br><hr><p>湘南東部病院 予約センター</p>`;

    switch (data.type) {
      case "初診":
        subject = "【予約確定】診療のご予約（初診）について";
        htmlBody = `
          ${headerHtml}
          <p>診療のご予約（初診）につきまして確定しましたので<br>
          以下のURLをクリックしてご確認ください。</p>
          <p><a href="${targetUrl}">${targetUrl}</a></p>
          ${footerHtml}
        `;
        break;

      case "変更":
        subject = "【予約変更】診療予約の変更について";
        htmlBody = `
          ${headerHtml}
          <p>診療のご予約（変更）につきまして確定しましたので<br>
          以下のURLをクリックしてご確認ください。</p>
          <p><a href="${targetUrl}">${targetUrl}</a></p>
          ${footerHtml}
        `;
        break;

      case "取消":
        const resDate = data.reservationDate || "（日付未定）";
        const resTime = data.reservationTime || "";
        const resDept = data.department || "（診療科不明）";

        subject = "【予約取消】診療予約の取り消しについて";
        htmlBody = `
          ${headerHtml}
          <p>以下のご予約を取消しさせていただきました。</p>
          <p><strong>取り消したご予約:</strong></p>
          <ul>
            <li>日時: ${resDate} ${resTime}</li>
            <li>診療科: ${resDept}</li>
          </ul>
          <p>通知のみとなりますので、URLのクリックは不要です。</p>
          ${footerHtml}
        `;
        break;

      default:
        console.warn(`[WARN] 未定義の用件タイプ: ${data.type}`);
        subject = "【お知らせ】予約センターからのご連絡";
        htmlBody = `
          ${headerHtml}
          <p>下記より内容をご確認ください。</p>
          <p><a href="${targetUrl}">${targetUrl}</a></p>
          ${footerHtml}
        `;
        break;
    }

    const mailOptions = {
      from: `"予約センター" <${config.user}@fureai-g.or.jp>`,
      to: data.to,
      bcc: "akifumi.mishima@gmail.com",
      subject: subject,
      html: htmlBody,
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
  const recordId = req.query.id || req.body.id;
  const token = req.query.token; // トークン取得
  

  if (!recordId) {
    console.error("[ERROR] パラメータ 'id' が不足しています。");
    res.status(400).send("エラー: 不正なアクセスです (ID不足)");
    return;
  }

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

    // ---------------------------------------------------------
    // POSTリクエスト処理 (キャンセル実行)
    // ---------------------------------------------------------
    if (req.method === 'POST') {
      const action = req.body.action;
      
      if (action === 'cancel') {
        console.log(`[LOG] キャンセル処理開始: RecordID=${recordId}`);

        // 既にキャンセル済みの場合は専用画面へ
        if (currentStatus === "キャンセル") {
            res.status(200).send(getAlreadyCancelledHtml());
            return;
        }

        const nowISO = new Date().toISOString();

        // Kintone更新: ステータス変更 & キャンセル日時記録
        const updateBody = {
            app: APP_ID,
            id: recordId,
            record: {
                "管理状況": { value: "キャンセル" },
                "キャンセル日時": { value: nowISO },
                "キャンセル実行者": { value: "本人" }
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

        // キャンセル完了メール送信
        const email = (record["メールアドレス"] && record["メールアドレス"].value) || "";
        const lastName = (record["姓漢字"] && record["姓漢字"].value) || "";
        const firstName = (record["名漢字"] && record["名漢字"].value) || "";
        const name = lastName + " " + firstName;

        // 予約情報のフォーマット（メール本文用）
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

        if (email) {
            const mailOptions = {
                from: `"予約センター" <${config.user}@fureai-g.or.jp>`,
                to: email,
                bcc: "akifumi.mishima@gmail.com",
                subject: "【予約キャンセル完了】診療予約のキャンセルについて",
                html: `
                    <p>${name} 様</p>
                    <p>いつもご利用ありがとうございます。</p>
                    <p>ご依頼いただきました以下の診療予約のキャンセル手続きが完了いたしました。</p>
                    <br>
                    <p><strong>【キャンセルされた予約】</strong></p>
                    <ul>
                        <li>日時: ${dateTimeStr}</li>
                        <li>診療科: ${dept}</li>
                    </ul>
                    <br>
                    <p>またのご利用をお待ちしております。</p>
                    <br><hr><p>湘南東部病院 予約センター</p>
                `
            };
            await sendMailCore(mailOptions);
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
    if (recordUrlToken !== (token || "")) {
        console.warn(`[WARN] Token Mismatch: Record='${recordUrlToken}', Query='${token}'`);
        res.status(200).send(getAlreadyCancelledHtml());
        return;
    }

    // 1. 既にキャンセル済みの場合
    if (currentStatus === "キャンセル") {
        res.status(200).send(getAlreadyCancelledHtml());
        return;
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
        // ステータスがまだ既読検知になっていなければ更新
        if (currentStatus !== "メール既読検知") {
            updateBody.record["管理状況"] = { value: "メール既読検知" };
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
    const isAlreadyRead = (currentStatus === "メール既読検知");
    const isPhoneConfirmed = !!phoneConfirmDate;
    const showCancel = isAlreadyRead || isPhoneConfirmed;

    const html = getConfirmedHtml(record, recordId, showCancel);
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
 */
function getConfirmedHtml(record, recordId, showCancel) {
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

    // キャンセルボタンのHTML (POSTフォーム)
    const cancelBtnHtml = showCancel ? `
        <form method="POST" action="?id=${recordId}" onsubmit="return confirm('本当に予約をキャンセルしますか？');">
            <input type="hidden" name="action" value="cancel">
            <button type="submit" class="btn-cancel">予約をキャンセルする</button>
        </form>
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
          .btn-cancel { display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #e74c3c; color: white; text-decoration: none; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 14px; transition: background-color 0.3s; }
          .btn-cancel:hover { background-color: #c0392b; }
          .footer { margin-top: 30px; font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
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
            湘南東部病院 予約センター<br>
            ※キャンセルは上記ボタン、またはお電話にてご連絡ください。
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
          <p>この予約は無効となったか、既に取り消し手続きが完了しています。<br>ご不明な点がございましたら、予約センターまでお問い合わせください。</p>
        </div>
      </body>
      </html>
    `;
}

/**
 * キャンセル完了時のHTML
 */
function getCancellationCompletedHtml() {
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
          h1 { color: #e74c3c; font-size: 20px; }
          p { color: #555; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>キャンセル処理が完了しました</h1>
          <p>予約の取り消しを受け付けました。<br>確認メールを送信しましたのでご確認ください。</p>
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
        ご不明な点がございましたら、予約センターまでお問い合わせください。</p>
      </div>
    </body>
    </html>
  `;
}