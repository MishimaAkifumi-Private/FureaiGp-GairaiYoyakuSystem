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
 */

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
  console.log("--- [sendReservationMail] Execution Started ---");

  // CORS設定
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

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

  try {
    const result = await sendMailCore(mailOptions);
    res.status(200).send({ status: "success", message: "予約メールを送信しました。", data: result });
  } catch (error) {
    res.status(500).send({ status: "error", message: "予約メールの送信に失敗しました。", error: error.toString() });
  }
  console.log("--- [sendReservationMail] Execution Finished ---");
});


// ======================================================================
//  Function 3: 予約確認 & 既読処理 (confirmReservation)
// ======================================================================
exports.confirmReservation = functions.https.onRequest(async (req, res) => {
  console.log("--- [confirmReservation] Execution Started ---");

  // クエリパラメータの取得 (?id=xxx)
  const recordId = req.query.id;

  if (!recordId) {
    console.error("[ERROR] パラメータ 'id' が不足しています。");
    res.status(400).send("エラー: 不正なアクセスです (ID不足)");
    return;
  }

  // --- Kintone API 設定 ---
  // ゲストスペースID: 11, アプリID: 142
  const GUEST_SPACE_ID = 11;
  const APP_ID = 142;
  const API_TOKEN = "lzGrrquqznrH0cpPIzmzvLKdn4PhyebSRyYKMxSE";
  const BASE_URI = `https://w60013hke2ct.cybozu.com/k/guest/${GUEST_SPACE_ID}/v1`;

  try {
    // 1. 既読日時の更新 (PUT)
    const now = new Date();
    const nowISO = now.toISOString(); 

    console.log(`[LOG] 既読日時更新開始: RecordID=${recordId}, Time=${nowISO}`);
    
    const updateBody = {
      app: APP_ID,
      id: recordId,
      record: {
        "メール既読日時": { value: nowISO },
        "管理ステータス": { value: "メール既読検知" }
      }
    };

    // Node.js 18+ の fetch を使用
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
        console.error(`[ERROR] 既読更新失敗: ${updateResponse.status} ${errText}`);
        // 続行して閲覧はさせる
    } else {
        console.log("[SUCCESS] 既読日時を更新しました。");
    }

    // 2. 予約情報の取得 (GET)
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
    
    // 値の取り出し
    const name = (record["姓漢字"]?.value || "") + " " + (record["名漢字"]?.value || "");
    const resTime = record["確定予約時刻"]?.value || "";
    
    // 【New!】予約日時過ぎのチェック (有効期限切れ判定)
    const resDateVal = record["確定予約日"]?.value; // YYYY-MM-DD
    const resTimeVal = record["確定予約時刻"]?.value; // HH:mm

    if (resDateVal && resTimeVal) {
      // 予約日時を日本時間(+09:00)としてDateオブジェクト化
      const targetDate = new Date(`${resDateVal}T${resTimeVal}:00+09:00`);
      const now = new Date(); // 現在時刻 (UTC)

      // 現在時刻が予約日時を過ぎている場合
      if (now > targetDate) {
        console.log(`[INFO] 予約日時超過: Now=${now.toISOString()}, Target=${targetDate.toISOString()}`);
        res.status(200).send(getExpiredHtml());
        return;
      }
    }

    // 【修正】診療科の短縮処理 (例: "外科系 / 歯科口腔外科" -> "歯科口腔外科")
    let dept = record["診療科"]?.value || "-";
    if (dept.includes('/')) {
        const parts = dept.split('/');
        dept = parts[parts.length - 1].trim();
    }

    // 【修正】日付の和暦変換 (例: 2026-01-14 -> 令和8年1月14日)
    let formattedDate = record["確定予約日"]?.value || "未定";
    if (record["確定予約日"]?.value) {
        try {
            const d = new Date(record["確定予約日"].value);
            // 日本時間かつ和暦でフォーマット
            formattedDate = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
                era: 'long', year: 'numeric', month: 'long', day: 'numeric'
            }).format(d);
        } catch (e) {
            console.warn("和暦変換エラー:", e);
        }
    }
    const dateTimeStr = `${formattedDate} ${resTime}`;

    // 3. HTMLレスポンスの生成
    // 変更点: 「状況」欄削除、SystemId削除、和暦表示、診療科短縮
    const html = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>予約内容の確認</title>
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
          .footer { margin-top: 30px; font-size: 12px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>予約内容の確認</h1>
          <div class="message">
            <strong>${name} 様</strong><br>
            いつもご利用ありがとうございます。<br>
            以下の内容で予約を承っております。
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

          <div class="footer">
            湘南東部病院 予約センター<br>
            ※この画面を閉じても予約は有効です。
          </div>
        </div>
      </body>
      </html>
    `;

    res.status(200).send(html);
    console.log("--- [confirmReservation] Execution Finished (Success) ---");

  } catch (error) {
    console.error(`[CRITICAL ERROR] 処理中にエラーが発生しました:`, error);
    res.status(500).send(`<h1>システムエラー</h1><p>申し訳ありません。情報の取得に失敗しました。</p><p>Error: ${error.message}</p>`);
  }
});

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