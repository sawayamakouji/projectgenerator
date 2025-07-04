# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`



  g02 は、どうやら プロジェクト管理やタスク管理を行うウェブアプリケーション のようですね。

  ファイル構成から推測すると、以下のような特徴があります。


   * 技術スタック: ReactとViteを使って開発されたモダンなフロントエンドアプリケーションです。
   * バックエンド: Google Firebase（Firestoreを含む）を利用して、データの保存や認証などのバ
     ックエンド機能を実現しているようです。
   * 機能:
       * タスクリストやガントチャート表示など、プロジェクトの進捗を管理する機能。
       * チャットインターフェースがあり、プロジェクトメンバー間のコミュニケーションをサポー
         トする可能性があります。
       * Geminiサービスとの連携も見られるので、AIを活用した機能（例えば、タスクの自動生成や
         進捗の分析など）も含まれているかもしれません。


  簡単に言うと、FirebaseとGemini
  APIを活用した、AI機能付きのウェブベースのプロジェクト/タスク管理ツール と考えられます。
