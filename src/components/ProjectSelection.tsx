import React, { useState } from 'react';
import type { Project } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { deleteProject } from '@/services/firestoreService';

// ★ 変更点: propsの型定義を修正
interface ProjectSelectionProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  // プロジェクト作成のロジックをApp.tsxに集約するため、引数をオブジェクトにまとめる
  onStartProjectCreation: (details: {
    projectName: string;
    projectOverview: string;
    startDate: string;
    dueDate: string;
    additionalNotes: string;
  }) => void;
  isCreating: boolean;
  isApiKeyAvailable: boolean;
  onProjectDeleted: () => void;
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({
  projects,
  onSelectProject,
  onStartProjectCreation, // ★ 変更点: props名を変更
  isApiKeyAvailable,
  onProjectDeleted,
  isCreating,
}) => {
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectOverview, setProjectOverview] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [projectToDeleteName, setProjectToDeleteName] = useState<string | null>(null);

  const handleDeleteClick = (projectId: string, projectName: string) => {
    setProjectToDeleteId(projectId);
    setProjectToDeleteName(projectName);
    setShowConfirmationModal(true);
  };

  const handleConfirmDelete = async () => {
    if (projectToDeleteId) {
      try {
        await deleteProject(projectToDeleteId);
        onProjectDeleted();
        alert(`プロジェクト「${projectToDeleteName}」を削除しました。`);
      } catch (error) {
        console.error("プロジェクトの削除に失敗しました: ", error);
        alert("プロジェクトの削除に失敗しました。もう一度お試しください。");
      }
    }
    setShowConfirmationModal(false);
    setProjectToDeleteId(null);
    setProjectToDeleteName(null);
  };

  const handleCancelDelete = () => {
    setShowConfirmationModal(false);
    setProjectToDeleteId(null);
    setProjectToDeleteName(null);
  };

  // ★ 変更点: App.tsxに処理を移譲する
  const handleCreateProjectClick = () => {
    if (!projectName.trim() || !projectOverview.trim() || !startDate.trim() || !dueDate.trim()) {
      alert('プロジェクト名、概要、開始日、期日は必須です。');
      return;
    }
    // App.tsxにフォームのデータを渡すだけ
    onStartProjectCreation({
      projectName,
      projectOverview,
      startDate,
      dueDate,
      additionalNotes,
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">プロジェクトを選択</h2>
        <p className="text-gray-500 mt-2">既存のプロジェクトを編集するか、新しいプロジェクトを開始してください。</p>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50 transition-all duration-150 ease-in-out flex justify-between items-center"
          >
            <button
              onClick={() => onSelectProject(project)}
              className="flex-grow text-left focus:outline-none"
            >
              <h3 className="font-semibold text-lg text-gray-900 truncate">{project.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                期間: {formatDate(project.startDate)} 〜 {formatDate(project.dueDate)}
              </p>
              <p className="text-sm text-gray-600 mt-1">{project.overview}</p>
            </button>
            <button
              onClick={() => handleDeleteClick(project.id, project.name)}
              className="ml-4 p-2 text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded-md"
              aria-label={`プロジェクト ${project.name} を削除`}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        {!showNewProjectForm ? (
          <button
            onClick={() => setShowNewProjectForm(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-400 transition-colors flex items-center justify-center w-full sm:w-auto mx-auto"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            新しいプロジェクトを開始
          </button>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">新しいプロジェクトを作成</h3>
            <div className="space-y-4 text-left">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">プロジェクト名</label>
                <input
                  type="text"
                  id="projectName"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="projectOverview" className="block text-sm font-medium text-gray-700">プロジェクト概要</label>
                <textarea
                  id="projectOverview"
                  rows={3}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={projectOverview}
                  onChange={(e) => setProjectOverview(e.target.value)}
                ></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">開始日</label>
                  <input
                    type="date"
                    id="startDate"
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">期日</label>
                  <input
                    type="date"
                    id="dueDate"
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700">備考（タスク生成の参考情報）</label>
                <textarea
                  id="additionalNotes"
                  rows={2}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="例: このプロジェクトは〇〇の目的で、〇〇の技術を使用します。"
                ></textarea>
              </div>
              <div className="flex flex-col space-y-2 pt-2">
                <button
                  onClick={handleCreateProjectClick} // ★ 変更点: 呼び出す関数を変更
                  disabled={isCreating || !isApiKeyAvailable}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  {isCreating ? (
                    <>
                      <SpinnerIcon className="w-5 h-5 mr-2 animate-spin" />
                      <span>作成中...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5 mr-2" />
                      <span>プロジェクトを作成し、タスクを自動生成</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowNewProjectForm(false)}
                  disabled={isCreating}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showConfirmationModal}
        title="プロジェクトの削除"
        message={`本当にプロジェクト「${projectToDeleteName}」を削除しますか？\nこの操作は元に戻せません。`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmButtonText="削除"
        confirmButtonVariant="destructive"
      />
    </div>
  );
};

// --- Icons (no changes) ---
const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
  </svg>
);
const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.927a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.14-2.04-2.293a1.5 1.5 0 0 0-1.404.145L12 4.999l-.364-.234a1.5 1.5 0 0 0-1.404-.145C8.91 2.75 8 3.71 8 4.999v1.75M19.5 10.5c0 .66-.33 1.26-.84 1.64L12 17.25l-6.66-5.11c-.51-.38-.84-.98-.84-1.64M12 12.75h.008v.008H12v-.008Z" />
  </svg>
);
const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
