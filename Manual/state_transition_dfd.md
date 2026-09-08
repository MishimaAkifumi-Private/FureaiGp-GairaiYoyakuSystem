# データフロー図（DFD）形式：予約チケット管理 状態遷移

システム全体が複雑にならないよう、全体を俯瞰する「第1レイヤー」と、各ブロック内の詳細を描く「第2レイヤー」に分けて整理しました。

---

## 【第1レイヤー】機能ブロック間の繋がり（全体俯瞰）
まずはシステム全体がどのようなブロックで構成され、チケットがどう流れていくかの概要図です。

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
    %% ブロックの定義と概要説明
    B1["【受付・初期設定】
新規チケットの受け取りと
担当スタッフの割り当て"]
    B2["【電話対応】
電話による連絡と
日時の直接合意"]
    B3["【メール対応】
システム経由での
日時確保メール送信と
期限管理"]
    B4["【完了・評価】
受診日通過後の実績確認と
チケットのクローズ"]
    B5["【各種中断処理】
患者やスタッフによる手動
キャンセルや強制終了"]

    %% メインフロー
    B1 -->|"電話連絡が必要な場合"| B2
    B1 -->|"メールで案内する場合"| B3

    B2 -->|"合意後、受診日を通過"| B4
    B3 -->|"既読後、受診日を通過"| B4

    %% 中断フロー
    B1 -.->|"手動キャンセル・強制終了"| B5
    B2 -.->|"キャンセル依頼・強制終了"| B5
    B3 -.->|"キャンセル・期限切れ"| B5
    
    %% 中断フローからの復帰と完了
    B5 -.->|"取下中止（復活）"| B1
    B5 -->|"破棄してクローズ"| B4
```

---

## 【第2レイヤー】各ブロック内の詳細フロー

ここから下は、上の5つのブロックそれぞれの内部詳細です。「どの状態」から「どのアクション」を経て遷移するのかを網羅しています。

### 1. 【受付・初期設定】ブロック内のフロー

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
    classDef stateNode fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,font-weight:bold,color:#1565c0;
    classDef actionNode fill:#f8f9fa,stroke:#6c757d,stroke-width:1px,stroke-dasharray: 5 5,color:#111111;
    classDef externalNode fill:#fff3cd,stroke:#856404,stroke-width:2px,color:#856404;

    IN_Web("Web・電話からの
新規チケット到着"):::stateNode
    s_untouched("未着手"):::stateNode
    s_assigned("担当設定"):::stateNode
    
    IN_Web --> a_receive["新規受付処理"]:::actionNode --> s_untouched
    s_untouched --> a_assign["担当者を設定する"]:::actionNode --> s_assigned
    s_assigned --> a_unassign["担当者を
未設定に戻す"]:::actionNode --> s_untouched

    %% 他ブロックへの進行
    s_assigned --> OUT_Phone(["【電話対応】
ブロックへ"]):::externalNode
    s_assigned --> OUT_Mail(["【メール対応】
ブロックへ"]):::externalNode
    
    s_untouched -.-> OUT_Cancel(["【各種中断処理】
ブロックへ"]):::externalNode
    s_assigned -.-> OUT_Cancel

    %% 復帰
    IN_Revive(["【各種中断処理】
からの復活"]):::externalNode -.->|"元の状態へ戻す"| s_assigned
```

### 2. 【電話対応】ブロック内のフロー

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
    classDef stateNode fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,font-weight:bold,color:#1565c0;
    classDef actionNode fill:#f8f9fa,stroke:#6c757d,stroke-width:1px,stroke-dasharray: 5 5,color:#111111;
    classDef externalNode fill:#fff3cd,stroke:#856404,stroke-width:2px,color:#856404;

    IN_Assigned(["【受付・初期設定】
ブロックから"]):::externalNode 
    
    s_phone_no_answer("電話不通"):::stateNode
    s_phone_agreed("電話合意済"):::stateNode
    
    IN_Assigned --> a_phone_fail["電話不通案内
メールを送信"]:::actionNode --> s_phone_no_answer
    IN_Assigned --> a_phone_agree["電話にて
日時に合意"]:::actionNode --> s_phone_agreed
    
    s_phone_no_answer --> a_phone_agree2["折り返し連絡が
あり合意"]:::actionNode --> s_phone_agreed

    s_phone_agreed --> OUT_Eval(["【完了・評価】
ブロックへ"]):::externalNode
    
    s_phone_no_answer -.-> OUT_Cancel(["【各種中断処理】
ブロックへ"]):::externalNode
    s_phone_agreed -.-> OUT_Cancel
```

### 3. 【メール対応】ブロック内のフロー

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
    classDef stateNode fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,font-weight:bold,color:#1565c0;
    classDef actionNode fill:#f8f9fa,stroke:#6c757d,stroke-width:1px,stroke-dasharray: 5 5,color:#111111;
    classDef externalNode fill:#fff3cd,stroke:#856404,stroke-width:2px,color:#856404;

    IN_Assigned(["【受付・初期設定】
ブロックから"]):::externalNode

    s_mail_sent("メール送信済"):::stateNode
    s_mail_read("メール既読"):::stateNode
    s_expired("閲覧期限切れ"):::stateNode
    s_re_requested("申込者再依頼"):::stateNode

    IN_Assigned --> a_send_mail["仮予約の案内
メールを送信"]:::actionNode --> s_mail_sent

    s_mail_sent --> a_read_mail["患者が案内
メールを開封"]:::actionNode --> s_mail_read
    s_mail_sent --> a_expire["未開封のまま
期限が経過"]:::actionNode --> s_expired
    
    s_expired --> a_re_request["改めて日時確保
依頼が届く"]:::actionNode --> s_re_requested
    s_re_requested --> a_resend_mail["再度案内
メールを送信"]:::actionNode --> s_mail_sent

    s_mail_read --> OUT_Eval(["【完了・評価】
ブロックへ"]):::externalNode
    
    s_mail_sent -.-> OUT_Cancel(["【各種中断処理】
ブロックへ"]):::externalNode
    s_mail_read -.-> OUT_Cancel
    s_expired -.-> OUT_Cancel
    s_re_requested -.-> OUT_Cancel
```

### 4. 【完了・評価】ブロック内のフロー

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
    classDef stateNode fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,font-weight:bold,color:#1565c0;
    classDef actionNode fill:#f8f9fa,stroke:#6c757d,stroke-width:1px,stroke-dasharray: 5 5,color:#111111;
    classDef externalNode fill:#fff3cd,stroke:#856404,stroke-width:2px,color:#856404;

    IN_Phone(["【電話対応】
ブロックから"]):::externalNode
    IN_Mail(["【メール対応】
ブロックから"]):::externalNode
    IN_Cancel(["【各種中断処理】
ブロックから"]):::externalNode

    s_eval_wait("評価待ち"):::stateNode
    s_finished("終了"):::stateNode

    IN_Phone --> a_pass_date["診療予定日が
経過する（翌朝自動）"]:::actionNode --> s_eval_wait
    IN_Mail --> a_pass_date

    s_eval_wait --> a_evaluate["受診確認とメモ入力を
完了する"]:::actionNode --> s_finished
    
    IN_Cancel --> a_confirm_discard["破棄・終了として
確定する"]:::actionNode --> s_finished
```

### 5. 【各種中断処理】ブロック内のフロー

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
    classDef stateNode fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,font-weight:bold,color:#1565c0;
    classDef actionNode fill:#f8f9fa,stroke:#6c757d,stroke-width:1px,stroke-dasharray: 5 5,color:#111111;
    classDef externalNode fill:#fff3cd,stroke:#856404,stroke-width:2px,color:#856404;

    IN_All(["【他の各ブロック】
から"]):::externalNode

    s_url_withdrawn("URL取下"):::stateNode
    s_web_withdrawn("WEB取下"):::stateNode
    s_staff_withdrawn("スタッフ取下"):::stateNode
    s_staff_revived("スタッフ
取下中止"):::stateNode
    s_force_finished("強制終了"):::stateNode

    IN_All -.-> a_url_cancel["案内URLから
直接取下"]:::actionNode --> s_url_withdrawn
    IN_All -.-> a_web_cancel["Webからの
取下依頼処理"]:::actionNode --> s_web_withdrawn
    IN_All -.-> a_manual_cancel["手動で
取下処理"]:::actionNode --> s_staff_withdrawn
    IN_All -.-> a_force_close["強制的に
打ち切り処理"]:::actionNode --> s_force_finished

    s_staff_withdrawn --> a_revive["取下を中止
して復活"]:::actionNode --> s_staff_revived
    
    s_staff_revived --> OUT_B1(["【受付・初期設定】
ブロックへ復帰"]):::externalNode
    s_staff_withdrawn --> OUT_B4(["【完了・評価】
ブロックへ進み
クローズ"]):::externalNode
```
