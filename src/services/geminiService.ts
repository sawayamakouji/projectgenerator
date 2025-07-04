// geminiService.ts  ✨完全版（2025-07-04 修正版）
//
// - Google GenAI JS SDK v0.7.x 準拠
// - Vite 用 env 読み込み (`VITE_GEMINI_API_KEY`)
// - .text アクセサを使用して TypeError を回避
// - JSON モードは文字列で返るので呼び出し側で JSON.parse する設計
// ---------------------------------------------------------------------

import {
  GoogleGenAI,
  GenerateContentResult,
  Part,
  Content,
} from "@google/genai";

import { GEMINI_MODEL_TEXT } from "../constants";
import type { Task, ChatMessage } from "../types";

// ──────────────────────────
// 0. SDK インスタンス生成
// ──────────────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let gemini: GoogleGenAI | null = null;

if (API_KEY && API_KEY.length > 0) {
  try {
    gemini = new GoogleGenAI({ apiKey: API_KEY });
  } catch (err) {
    console.error("GoogleGenAI init error:", err);
  }
} else {
  console.error(
    "VITE_GEMINI_API_KEY が設定されていません。AI 機能は利用できません。"
  );
}

export const ai = gemini;

// ──────────────────────────
// 1. チャット補完
// ──────────────────────────
export async function getChatCompletion(
  projectOverview: string,
  chatHistory: ChatMessage[]
): Promise<string> {
  if (!ai) throw new Error("Gemini AI SDK が初期化されていません。");

  // system-prompt 相当を手動で先頭に挿入
  const historyWithSystem: Content[] = [
    {
      role: "user",
      parts: [
        {
          text: `あなたはプロジェクト「${projectOverview}」に関する質問に答えるアシスタントです。`,
        },
      ],
    },
    {
      role: "model",
      parts: [
        {
          text: "はい、承知いたしました。プロジェクトについて何でも質問してください。",
        },
      ],
    },
    ...chatHistory.map<Content>((m) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: m.parts as Part[],
    })),
  ];

  const res = await ai.models.generateContent({
    model: GEMINI_MODEL_TEXT,
    contents: historyWithSystem,
    generationConfig: { maxOutputTokens: 1000 },
  });

  // SDK v0.7+ では .text が最短アクセサ
  return res.text ?? "(返答が空でした)";
}

// ──────────────────────────
// 2. タスクリスト初回生成
//    ※ 呼び出し側で JSON.parse(result.text) して Task[] に変換する想定
// ──────────────────────────
export async function generateTasksWithGemini(
  projectOverviewContent: string,
  projectStartDate: string,
  projectDueDate: string,
  groundingContent?: string
): Promise<GenerateContentResult> {
  if (!ai) throw new Error("Gemini AI SDK が初期化されていません。");

  const prompt = `
あなたは熟練したプロジェクト計画アシスタントです。
以下の情報に基づいて、このプロジェクトを完了するために必要な実行可能なタスクのリストを生成してください。

# プロジェクト概要
${projectOverviewContent}

# 補足情報
${groundingContent || "特になし"}

# プロジェクト期間
開始日: ${projectStartDate}
期日: ${projectDueDate}

# 指示
出力をJSONオブジェクトの配列として提供してください。配列内の各オブジェクトは単一のタスクを表すものとします。
あなたの応答全体は、このJSON配列のみでなければなりません。JSONの周囲に他のテキスト、説明、マークダウンフォーマットを含めないでください。
各タスクオブジェクトは以下のプロパティを持たなければなりません：
1. "name": (string, 日本語) タスク名。
2. "description": (string, 日本語) タスクの要約。
3. "purpose": (string, 日本語, 任意) タスクの目的。
4. "acceptanceCriteria": (string, 日本語, 任意) タスクの完了基準。
5. "startDate": (string: YYYY-MM-DD) 推奨開始日。
6. "dueDate": (string: YYYY-MM-DD) 推奨期日。
7. "prerequisiteTaskNames": (string配列) 先行タスク名の配列。
8. "assignee": (string または null) 担当者名。
`;

  return ai.models.generateContent({
    model: GEMINI_MODEL_TEXT,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });
}

// ──────────────────────────
// 3. タスクリスト再生成（改善版）
//    ※ こちらも JSON モードで返す
// ──────────────────────────
export async function regenerateTasks(
  overview: string,
  projectStartDate: string,
  projectDueDate: string,
  existingTasks: Task[]
): Promise<GenerateContentResult> {
  if (!ai) throw new Error("Gemini AI SDK が初期化されていません。");

  const existingTasksString = JSON.stringify(
    existingTasks.map(({ name, description, startDate, dueDate }) => ({
      name,
      description,
      startDate,
      dueDate,
    })),
    null,
    2
  );

  const prompt = `
あなたは熟練したプロジェクト計画アシスタントです。
以下のプロジェクト概要と既存のタスクリストをレビューし、タスクリストを改善・再生成してください。

# プロジェクト概要
「${overview}」

# プロジェクト期間
開始日: ${projectStartDate}
期日: ${projectDueDate}

# 既存タスクリスト（改善対象）
${existingTasksString}

# 指示
既存のリストの問題点を特定し、より良く包括的なタスクリストを生成してください。依存関係の見直し、タスクの分割・結合、新規追加、不要なタスクの削除を行ってください。
最終的な出力をJSONオブジェクトの配列として提供してください。あなたの応答全体は、このJSON配列のみでなければなりません。
各タスクオブジェクトは、generateTasksWithGemini 関数で指定されたものと同じプロパティ（name, description, purpose, acceptanceCriteria, startDate, dueDate, prerequisiteTaskNames, assignee）を持つ必要があります。
`;

  return ai.models.generateContent({
    model: GEMINI_MODEL_TEXT,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  });
}
