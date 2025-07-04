import React, { useState, useEffect, useMemo } from 'react';
import type { Project, Task, TaskStatus, GroundingChunk, ChatMessage, ProjectVisibility } from '@/types';
import { TaskList } from '@/components/TaskList';
import { ProgressBar } from '@/components/ProgressBar';
import { TaskStatusChart } from '@/components/TaskStatusChart';
import { ChatInterface } from '@/components/ChatInterface';
import { GanttChartView } from '@/components/GanttChartView';
import { formatDate } from '@/utils/dateUtils';

// ★ 変更点: onVisibilityChange を props に追加
interface DashboardProps {
  project: Project;
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onTaskUpdate: (updatedTask: Task) => void;
  onAddTask: (newTaskData: Omit<Task, 'id' | 'status' | 'dependsOn' | 'code'> & { startDate: string; dueDate: string; assignee?: string; purpose?: string; acceptanceCriteria?: string; }) => void;
  onRequestTaskDelete: (taskId: string, taskName: string) => void;
  onResetProject: () => void;
  onProjectMetaUpdate: (updatedMeta: Partial<Pick<Project, 'overview' | 'purpose' | 'acceptanceCriteria'>>) => void;
  onTaskDatesChange: (taskId: string, newStartDate: string, newDueDate: string) => void;
  onVisibilityChange: (newVisibility: ProjectVisibility) => void; // ★ 追加
  isLoading: boolean;
  isRegeneratingTasks: boolean;
  onRequestTaskRegenerate: () => void;
  isApiKeyAvailable: boolean;
  groundingChunks: GroundingChunk[];
  chatHistory: ChatMessage[];
  onSendChatMessage: (message: string) => void;
  isChatLoading: boolean;
  isChatAvailable: boolean;
  currentUserId: string;
}

// --- (Icon定義は変更なし) ---
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
const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
 </svg>
);
const QueueListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
 </svg>
);
const ChartBarSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V5.25A2.25 2.25 0 0 0 18 3H6A2.25 2.25 0 0 0 3.75 5.25v12.75A2.25 2.25 0 0 0 6 20.25Z" />
  </svg>
);
const PencilSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);
const LightBulbIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.355a7.5 7.5 0 0 1-3 0m3 0a7.5 7.5 0 0 0-3 0m.375 0a7.5 7.5 0 0 1-3 0m0 0H9.375m0 0a7.5 7.5 0 0 1 3.75 0m0 0h-.375m0 0a7.5 7.5 0 0 0 3.75 0M12 12.75H9.375L12 18V9.75Zm0 0L14.625 12.75H12V9.75Z" />
 </svg>
);
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
</svg>
);
const ArrowUturnLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
  </svg>
);

type TaskViewMode = 'list' | 'gantt';
type EditableProjectField = 'overview' | 'purpose' | 'acceptanceCriteria';

const Dashboard: React.FC<DashboardProps> = ({
  project,
  onTaskStatusChange,
  onTaskUpdate,
  onAddTask,
  onRequestTaskDelete,
  onResetProject,
  onProjectMetaUpdate,
  onTaskDatesChange,
  onVisibilityChange, // ★ 追加
  isLoading,
  isRegeneratingTasks,
  onRequestTaskRegenerate,
  isApiKeyAvailable,
  groundingChunks,
  chatHistory,
  onSendChatMessage,
  isChatLoading,
  isChatAvailable,
  currentUserId,
}) => {
  const [editableOverview, setEditableOverview] = useState(project.overview);
  const [editablePurpose, setEditablePurpose] = useState(project.purpose || '');
  const [editableAC, setEditableAC] = useState(project.acceptanceCriteria || '');
  const [editingField, setEditingField] = useState<EditableProjectField | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('list');

  // ★ 変更点: 編集権限のロジック
  const isOwner = project.ownerId === currentUserId;
  const isEditable = useMemo(() => {
    if (isOwner) return true;
    return project.visibility === 'public_edit';
  }, [project.visibility, isOwner]);

  useEffect(() => {
    setEditableOverview(project.overview);
    setEditablePurpose(project.purpose || '');
    setEditableAC(project.acceptanceCriteria || '');
  }, [project.overview, project.purpose, project.acceptanceCriteria]);

  const completedTasks = project.tasks.filter(task => task.status === '完了').length;
  const totalTasks = project.tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleEditField = (field: EditableProjectField) => {
    if (!isEditable) return; // 編集不可なら何もしない
    setEditingField(field);
  };

  const handleSaveField = (field: EditableProjectField) => {
    let updatedValue = '';
    if (field === 'overview') updatedValue = editableOverview;
    else if (field === 'purpose') updatedValue = editablePurpose;
    else if (field === 'acceptanceCriteria') updatedValue = editableAC;

    if (field === 'overview' && !updatedValue.trim()) {
      alert("プロジェクト概要は空にできません。");
      setEditableOverview(project.overview);
      return;
    }

    onProjectMetaUpdate({ [field]: updatedValue.trim() || undefined });
    setEditingField(null);
  };

  const handleCancelEdit = (field: EditableProjectField) => {
    if (field === 'overview') setEditableOverview(project.overview);
    else if (field === 'purpose') setEditablePurpose(project.purpose || '');
    else if (field === 'acceptanceCriteria') setEditableAC(project.acceptanceCriteria || '');
    setEditingField(null);
  };

  const renderEditableProjectDetail = (
    field: EditableProjectField,
    label: string,
    value: string | undefined,
    currentEditValue: string,
    setter: (val: string) => void,
    IconComponent?: React.FC<React.SVGProps<SVGSVGElement>>,
    iconColorClass: string = 'text-gray-500'
  ) => {
    if (editingField === field) {
      return (
        <div className="mt-2 space-y-2">
          <label htmlFor={`edit-${field}`} className="block text-xs font-medium text-gray-500">{label}</label>
          <textarea
            id={`edit-${field}`}
            value={currentEditValue}
            onChange={(e) => setter(e.target.value)}
            rows={field === 'overview' ? 4 : 3}
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <div className="flex justify-end space-x-2">
            <button onClick={() => handleCancelEdit(field)} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">キャンセル</button>
            <button onClick={() => handleSaveField(field)} className="px-3 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md">保存</button>
          </div>
        </div>
      );
    }
    return (
      <div className={`mt-2 group relative ${value ? 'p-2 bg-slate-50 border border-slate-200 rounded-md' : ''}`}>
        {value && IconComponent && (
          <h5 className={`text-xs font-semibold ${iconColorClass} flex items-center mb-0.5`}>
            <IconComponent className={`w-3.5 h-3.5 mr-1.5 ${iconColorClass}`} />
            {label}
          </h5>
        )}
        <p className={`text-sm ${value ? (label === 'プロジェクト概要' ? 'text-gray-700 font-medium' : 'text-gray-600') : 'text-gray-500 italic'} whitespace-pre-wrap break-words`}>
          {value || `${label}は未定義です。編集して追加してください。`}
        </p>
        {isEditable && (
          <button
            onClick={() => handleEditField(field)}
            className="absolute top-1 right-1 p-1 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            aria-label={`${label}を編集`}
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  // ★ 追加: 公開設定の表示テキスト
  const visibilityTextMap: Record<ProjectVisibility, string> = {
    private: '非公開 (オーナーのみ)',
    public_view: '公開 (閲覧のみ)',
    public_edit: '公開 (編集も可)',
  };

  return (
    <div className="w-full max-w-7xl space-y-6 md:space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div className="flex-grow min-w-0">
            {renderEditableProjectDetail('overview', 'プロジェクト概要', project.overview, editableOverview, setEditableOverview)}
            <p className="text-gray-500 mt-2 text-sm md:text-base">
              <span className="font-medium">開始日:</span> {formatDate(project.startDate)} | <span className="font-medium">期日:</span> {formatDate(project.dueDate)}
            </p>
            {/* ★ 追加: 公開設定の表示と変更UI */}
            <div className="mt-3">
              {isOwner ? (
                <div className="flex items-center gap-2">
                  <label htmlFor="visibility-select" className="text-sm font-medium text-gray-700">公開設定:</label>
                  <select
                    id="visibility-select"
                    value={project.visibility}
                    onChange={(e) => onVisibilityChange(e.target.value as ProjectVisibility)}
                    className="block w-auto pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="private">非公開 (オーナーのみ)</option>
                    <option value="public_view">公開 (閲覧のみ)</option>
                    <option value="public_edit">公開 (編集も可)</option>
                  </select>
                </div>
              ) : (
                <p className="text-sm text-gray-600">公開設定: <span className="font-semibold">{visibilityTextMap[project.visibility]}</span></p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 flex-shrink-0 w-full sm:w-auto self-start md:self-center pt-2 md:pt-0">
            {isEditable && (
              <button
                onClick={onRequestTaskRegenerate}
                disabled={!isApiKeyAvailable || isRegeneratingTasks || isLoading}
                className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-yellow-500 transition-colors flex items-center justify-center border border-yellow-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed group"
                aria-label="AIで全タスクを再生成"
                title={!isApiKeyAvailable ? "AI機能無効（APIキーがありません）" : "AIを使用して全タスクを再生成します"}
              >
                {isRegeneratingTasks ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                    再生成中...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    タスク再生成
                  </>
                )}
              </button>
            )}
            <button
              onClick={onResetProject}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 transition-colors flex items-center justify-center border border-gray-300 text-sm"
              aria-label="プロジェクト選択へ戻る"
            >
              <ArrowUturnLeftIcon className="w-4 h-4 mr-2 inline-block" />
              プロジェクト選択へ戻る
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
          {renderEditableProjectDetail('purpose', 'プロジェクト目的', project.purpose, editablePurpose, setEditablePurpose, LightBulbIcon, 'text-indigo-700')}
          {renderEditableProjectDetail('acceptanceCriteria', 'プロジェクト達成基準', project.acceptanceCriteria, editableAC, setEditableAC, CheckCircleIcon, 'text-teal-700')}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-base font-medium text-gray-700 mb-2">プロジェクト進捗 ({completedTasks}/{totalTasks} タスク)</h3>
            <ProgressBar progress={progressPercentage} />
          </div>
          {project.tasks.length > 0 && (
            <div className="h-56 md:h-64 bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-base font-medium text-gray-700 mb-1 text-center">タスクステータス概要</h3>
              <TaskStatusChart tasks={project.tasks} />
            </div>
          )}
        </div>
      </div>

      {groundingChunks && groundingChunks.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">AI検索参照元</h3>
          <p className="text-sm text-gray-500 mb-3">
            AIはタスク生成の補助として、以下のウェブソースからの情報を使用した可能性があります：
          </p>
          <ul className="space-y-2">
            {groundingChunks.map((chunk, index) => {
              const source = chunk.web || chunk.retrievedContext;
              if (source && source.uri) {
                return (
                  <li key={index} className="text-sm">
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 hover:underline break-all"
                      title={source.title || source.uri}
                    >
                      {source.title ? (source.title.length > 80 ? source.title.substring(0, 80) + "..." : source.title) : source.uri}
                    </a>
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 md:gap-8">
        <div className="xl:col-span-3 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl md:text-2xl font-semibold text-gray-800">
                {taskViewMode === 'list' ? 'タスク一覧' : 'タイムライン (ガントチャート)'}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTaskViewMode('list')}
                  disabled={taskViewMode === 'list'}
                  className={`p-2 rounded-md text-sm font-medium transition-colors ${taskViewMode === 'list'
                      ? 'bg-blue-500 text-white cursor-default'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  aria-pressed={taskViewMode === 'list'}
                  title="リスト表示"
                >
                  <QueueListIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setTaskViewMode('gantt')}
                  disabled={taskViewMode === 'gantt'}
                  className={`p-2 rounded-md text-sm font-medium transition-colors ${taskViewMode === 'gantt'
                      ? 'bg-blue-500 text-white cursor-default'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  aria-pressed={taskViewMode === 'gantt'}
                  title="ガントチャート表示"
                >
                  <ChartBarSquareIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex-grow overflow-hidden">
            {taskViewMode === 'list' ? (
              <TaskList
                tasks={project.tasks}
                onTaskStatusChange={onTaskStatusChange}
                onTaskUpdate={onTaskUpdate}
                onAddTask={onAddTask}
                onRequestTaskDelete={onRequestTaskDelete}
                isLoading={isLoading && project.tasks.length === 0}
                projectStartDate={project.startDate}
                projectDueDate={project.dueDate}
                isEditable={isEditable} // ★ 編集権限を渡す
              />
            ) : (
              <GanttChartView
                tasks={project.tasks}
                projectStartDate={project.startDate}
                projectDueDate={project.dueDate}
                onTaskDatesChange={onTaskDatesChange}
                isEditable={isEditable} // ★ 編集権限を渡す
              />
            )}
          </div>
        </div>
        <div className="xl:col-span-2">
          <ChatInterface
            chatHistory={chatHistory}
            onSendMessage={onSendChatMessage}
            isLoading={isChatLoading}
            projectOverview={project.overview}
            isChatAvailable={isChatAvailable}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
