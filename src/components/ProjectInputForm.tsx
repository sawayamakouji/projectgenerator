
import React, { useState, useEffect } from 'react';
import type { ProjectInput } from '@/types';

interface ProjectInputFormProps {
  onSubmit: (data: ProjectInput) => void;
  isLoading: boolean;
  initialOverview?: string; // New prop
}

const today = new Date().toISOString().split('T')[0];

export const ProjectInputForm: React.FC<ProjectInputFormProps> = ({ onSubmit, isLoading, initialOverview }) => {
  const [overview, setOverview] = useState(initialOverview || '');
  const [startDate, setStartDate] = useState(today);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialOverview !== undefined && overview === '') {
      setOverview(initialOverview);
    }
    if (initialOverview === undefined && overview !== '') {
        // No action needed here for now, user might be typing.
    }
  }, [initialOverview]); 


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview.trim() || !startDate || !dueDate) {
      alert("すべての項目（プロジェクト概要、開始日、期日）を入力してください。");
      return;
    }
    if (new Date(startDate) > new Date(dueDate)) {
      alert("開始日は期日より後に設定できません。");
      return;
    }
    onSubmit({ overview: overview.trim(), startDate, dueDate });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-white p-6 md:p-8 rounded-lg shadow-md border border-gray-200 space-y-6">
      <div>
        <label htmlFor="overview" className="block text-sm font-medium text-gray-700 mb-1">
          プロジェクト概要
        </label>
        <textarea
          id="overview"
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          rows={initialOverview || overview ? 8 : 5} 
          className="w-full p-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-gray-900 transition-colors"
          placeholder="プロジェクトの概要、目標、主要な成果物などを記述してください...（前のステップでAIがこの生成を支援できます）"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          {initialOverview !== undefined && initialOverview !== '' ? "AIが提案した上記の概要を確認・修正してください。" : "詳細を記述するほど、AIはタスク生成をより効果的に支援できます。"}
          簡潔かつ情報量豊かに記述してください。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            開始日
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            required
          />
        </div>
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
            期日
          </label>
          <input
            type="date"
            id="dueDate"
            value={dueDate}
            min={startDate || today}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full p-3 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-400 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed group"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            プロジェクト計画を生成中...
          </>
        ) : (
          <>
            <SparklesIcon className="w-5 h-5 mr-2 text-white group-hover:opacity-100 transition-opacity" />
            プロジェクト計画を生成
          </>
        )}
      </button>
    </form>
  );
};

const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
  </svg>
);