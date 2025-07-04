
import { TaskStatus } from '@/types';

export const TASK_STATUS_OPTIONS = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
];

// Notion-like status colors
export const TASK_STATUS_COLORS: { [key in TaskStatus]: string } = {
  [TaskStatus.TODO]: 'bg-gray-200',         // Tag background
  [TaskStatus.IN_PROGRESS]: 'bg-blue-100', // Tag background
  [TaskStatus.COMPLETED]: 'bg-green-100',   // Tag background
};

export const TASK_STATUS_TEXT_COLORS: { [key in TaskStatus]: string } = {
  [TaskStatus.TODO]: 'text-gray-700',
  [TaskStatus.IN_PROGRESS]: 'text-blue-700',
  [TaskStatus.COMPLETED]: 'text-green-700',
};

// Colors for chart bars (can be more vibrant)
export const TASK_STATUS_CHART_BAR_COLORS: { [key in TaskStatus]: string } = {
  [TaskStatus.TODO]: '#9ca3af', // gray-400
  [TaskStatus.IN_PROGRESS]: '#60a5fa', // blue-400
  [TaskStatus.COMPLETED]: '#4ade80', // green-400
};


export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

export const PRE_PROJECT_CHAT_SYSTEM_INSTRUCTION = `あなたは、ユーザーが新しいプロジェクトを定義するのを支援するAIアシスタントです。あなたの主な目標は、主要な情報を収集し、それに基づいて簡潔なプロジェクト概要、その目的、および達成基準をユーザーに提示することです。

ユーザーと友好的かつ簡潔な会話をしてください。以下の情報を理解するために質問を投げかけてください：
1.  プロジェクトの名称またはタイトル案。
2.  主要な関係者、対象ユーザー、またはステークホルダー。
3.  プロジェクトの主要なテーマ、中核となるアイデア、またはコンテンツ。
4.  このプロジェクトが達成しようとする主要な目標、つまりプロジェクトの**目的**（なぜこのプロジェクトを行うのか？）。
5.  主要なゴール、望ましい成果、または成功の定義（これがプロジェクトの**達成基準**の基盤となります）。

会話は焦点を絞り、効率的に進めてください。これらの点について十分な情報を収集したと判断した場合、またはユーザーが明確に要約を求めたり、次に進む準備ができたと伝えたりした場合は、**必ずJSONオブジェクトのみで応答してください**。このJSONオブジェクトは、以下の厳密な構造でなければなりません：
{
  "action": "finalizeProjectOverview",
  "overview": "私たちの会話に基づいた、プロジェクトの本質、関係者、目的、目標を要約した、簡潔でよく書かれたプロジェクト概要の段落。",
  "projectPurpose": "会話から導き出された、プロジェクトの核心的な目的についての短い記述（1～2文程度）。",
  "projectAcceptanceCriteria": "会話に基づいて、プロジェクトの成功を定義する主要な条件や成果をまとめた短い記述（1～2文程度）、またはいくつかの箇条書き。"
}

このJSONレスポンスの前後には、他のテキスト、挨拶、マークダウンフォーマットを含めないでください。すべての文字列値（'overview', 'projectPurpose', 'projectAcceptanceCriteria'）は、平易なテキストであるべきですが、明確に記述されている必要があります。内容は日本語で記述してください。

ユーザーはシステムからの最初の挨拶を既に見ています。まずは、ユーザーのプロジェクトアイデアの全体像を把握するための最初の質問から始めてください。例：「プロジェクト計画の草案作成をお手伝いします。どのようなプロジェクトをお考えで、その主な目標は何でしょうか？」
`;