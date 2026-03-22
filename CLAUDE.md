# 旅行割り勘アプリ

## プロジェクト概要

旅行グループの支出を記録し、精算方法を自動計算するNext.jsアプリ。
メンバーごとに負担割合（比率）を設定でき、子供など費用を抑えたいメンバーにも対応。

## 技術スタック

- フレームワーク: Next.js 14（App Router）
- DB: Turso（libSQL / SQLite互換）+ Prisma ORM
- スタイル: Tailwind CSS（Apple HIG準拠デザイン）
- ホスティング: Vercel（無料）

## デザイン原則（Apple HIG）

- フォント: システムフォント（-apple-system, SF Pro）
- カラー: iOS標準カラー（blue #007AFF, red #FF3B30, green #34C759, gray #8E8E93）
- コンポーネント: iOS風リスト・タブバー・モーダル
- タッチターゲット: 最小44px
- 角丸: 10〜16px
- アニメーション: 控えめ（0.2s ease）
- 初めてでも迷わないシンプルなUI

## 画面構成（タブ切り替え）

```
/          → トップ：グループ新規作成 or ID入力で参加
/trip/[id] → メイン画面（タブ3つ）
  タブ1: メンバー管理
  タブ2: 支出追加・一覧
  タブ3: 精算結果
```

## DBスキーマ

```prisma
model Trip {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  members   Member[]
  expenses  Expense[]
}

model Member {
  id           String        @id @default(cuid())
  tripId       String
  name         String
  ratio        Float         @default(1.0)  // 負担割合（子供=0.5など）
  trip         Trip          @relation(fields: [tripId], references: [id])
  paidExpenses Expense[]     @relation("PaidBy")
  splits       ExpenseSplit[]
}

model Expense {
  id          String         @id @default(cuid())
  tripId      String
  description String
  amount      Int
  paidById    String
  createdAt   DateTime       @default(now())
  trip        Trip           @relation(fields: [tripId], references: [id])
  paidBy      Member         @relation("PaidBy", fields: [paidById], references: [id])
  splits      ExpenseSplit[]
}

model ExpenseSplit {
  id        String  @id @default(cuid())
  expenseId String
  memberId  String
  expense   Expense @relation(fields: [expenseId], references: [id])
  member    Member  @relation(fields: [memberId], references: [id])
}
```

## 精算計算ロジック

各メンバーの負担額 = 支出額 × (そのメンバーのratio / 割り勘対象メンバーのratioの合計)

例：大人2人(ratio=1.0)、子供1人(ratio=0.5)で3000円を割り勘
- ratio合計 = 1.0 + 1.0 + 0.5 = 2.5
- 大人1人の負担 = 3000 × (1.0/2.5) = 1200円
- 子供の負担 = 3000 × (0.5/2.5) = 600円

精算方法は最小送金回数アルゴリズム（greedy）で計算。

## サブエージェント運用ルール

このプロジェクトでは以下の3エージェントに分担して実装する。
並列で実行し、終了後に親エージェントが統合・動作確認を行う。

### Agent A：DB・API層
担当: Prismaスキーマ、Turso接続設定、全APIルート（/api/trips, /api/members, /api/expenses）
完了条件: `curl`でAPIが正常レスポンスを返すこと

### Agent B：UI層
担当: 全Reactコンポーネント、タブナビゲーション、Apple HIGデザイン適用
前提: Agent AのAPI仕様（エンドポイントとレスポンス型）が確定していること
完了条件: 全タブが表示され、スマホ画面で違和感がないこと

### Agent C：精算ロジック・テスト
担当: ratio対応の精算計算関数、Jest単体テスト
完了条件: 大人・子供混在パターンのテストが全て通ること

## 環境変数

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

## 注意事項

- 金額は整数（円）で扱う
- ratioは0.1〜2.0の範囲で設定可能（デフォルト1.0）
- グループIDはcuidを使用（推測困難なURL）
- エラー時はiOS風のアラート表示
