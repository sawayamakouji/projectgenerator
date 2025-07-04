import React, { useState, useMemo } from 'react';
import type { Task, TaskStatus } from '@/types';
import { TaskItem } from '@/components/TaskItem';
import { formatDate } from '@/utils/dateUtils';
import { TASK_STATUS_OPTIONS } from '@/constants';

// ★ 変更点: isEditable を props に追加
interface TaskListProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onTaskUpdate: (updatedTask: Task) => void;
  onAddTask: (newTaskData: Omit<Task, 'id' | 'status' | 'dependsOn' | 'code'> & { startDate: string; dueDate: string; assignee?: string; purpose?: string; acceptanceCriteria?: string; }) => void;
  onRequestTaskDelete: (taskId: string, taskName: string) => void;
  isLoading: boolean;
  projectStartDate?: string;
  projectDueDate?: string;
  isEditable: boolean; // ★★★ ここが抜けていました！
}

type SortKey = 'default' | 'name' | 'startDate' | 'dueDate' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const today = new Date().toISOString().split('T')[0];

// ★ 変更点: isEditable を引数で受け取る
export const TaskList = ({ 
    tasks, 
    onTaskStatusChange, 
    onTaskUpdate, 
    onAddTask, 
    onRequestTaskDelete, 
    isLoading,
    projectStartDate,
    projectDueDate,
    isEditable // ★★★ ここが抜けていました！
}: TaskListProps) => {
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPurpose, setNewTaskPurpose] = useState('');
  const [newTaskAcceptanceCriteria, setNewTaskAcceptanceCriteria] = useState('');
  const [newTaskStartDate, setNewTaskStartDate] = useState(projectStartDate || today);
  const [newTaskDueDate, setNewTaskDueDate] = useState(projectDueDate || '');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'default', direction: 'asc' });

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) {
      alert("タスク名は空にできません。");
      return;
    }
    if (!newTaskStartDate || !newTaskDueDate) {
        alert("タスクの開始日と期日は必須です。");
        return;
    }
    if (new Date(newTaskStartDate) > new Date(newTaskDueDate)) {
        alert("タスクの開始日は期日より後に設定できません。");
        return;
    }
    if (projectStartDate && new Date(newTaskStartDate) < new Date(projectStartDate)) {
        alert(`タスクの開始日はプロジェクト開始日（${formatDate(projectStartDate)}）より前に設定できません。`);
        return;
    }
    if (projectDueDate && new Date(newTaskDueDate) > new Date(projectDueDate)) {
        alert(`タスクの期日はプロジェクト期日（${formatDate(projectDueDate)}）より後に設定できません。`);
        return;
    }

    onAddTask({ 
        name: newTaskName.trim(), 
        description: newTaskDescription.trim(),
        purpose: newTaskPurpose.trim() || undefined,
        acceptanceCriteria: newTaskAcceptanceCriteria.trim() || undefined,
        startDate: newTaskStartDate,
        dueDate: newTaskDueDate,
        assignee: newTaskAssignee.trim() || undefined
    });
    resetAddTaskForm();
    setShowAddTaskForm(false);
  };
  
  const resetAddTaskForm = () => {
    setNewTaskName('');
    setNewTaskDescription('');
    setNewTaskPurpose('');
    setNewTaskAcceptanceCriteria('');
    setNewTaskStartDate(projectStartDate || today);
    setNewTaskDueDate(projectDueDate || '');
    setNewTaskAssignee('');
  };

  const minDateForNewTask = projectStartDate || today;
  const maxDateForNewTask = projectDueDate;

  const displayedTasks = useMemo(() => {
    let filteredTasks = tasks.filter(task => 
      task.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.purpose && task.purpose.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.acceptanceCriteria && task.acceptanceCriteria.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.assignee && task.assignee.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortConfig.key !== 'default') {
      filteredTasks.sort((a, b) => {
        let comparison = 0;
        switch (sortConfig.key) {
          case 'name':
            comparison = a.name.localeCompare(b.name, 'ja');
            break;
          case 'startDate':
            comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            break;
          case 'dueDate':
            comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            break;
          case 'status':
            comparison = TASK_STATUS_OPTIONS.indexOf(a.status) - TASK_STATUS_OPTIONS.indexOf(b.status);
            break;
        }
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    } else { 
        filteredTasks.sort((a,b) => {
            const [, aNumStr] = a.code.split('-T');
            const [, bNumStr] = b.code.split('-T');
            return parseInt(aNumStr) - parseInt(bNumStr);
        });
    }
    return filteredTasks;
  }, [tasks, searchTerm, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (key === 'default') { 
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-800">タスク</h3>
        {isEditable && (
          <button
            onClick={() => {
              setShowAddTaskForm(!showAddTaskForm);
              if (!showAddTaskForm) {
                  if (projectStartDate) setNewTaskStartDate(projectStartDate);
                  if (projectDueDate) setNewTaskDueDate(projectDueDate);
              } else {
                  resetAddTaskForm();
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-400 transition-colors flex items-center w-full sm:w-auto justify-center text-sm"
            aria-expanded={showAddTaskForm}
            aria-controls="add-task-form"
          >
            {showAddTaskForm ? (
              <>
               <MinusIcon className="w-4 h-4 mr-2" /> キャンセル
              </>
            ):(
              <>
               <PlusIcon className="w-4 h-4 mr-2" /> タスク追加
              </>
            )}
          </button>
        )}
      </div>

      {isEditable && showAddTaskForm && (
        <form onSubmit={handleAddTaskSubmit} id="add-task-form" className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200 space-y-4">
          <div>
            <label htmlFor="newTaskName" className="block text-sm font-medium text-gray-700 mb-1">タスク名</label>
            <input
              type="text"
              id="newTaskName"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="タスク名を入力"
              required
            />
          </div>
          <div>
            <label htmlFor="newTaskDescription" className="block text-sm font-medium text-gray-700 mb-1">説明 / メモ</label>
            <textarea
              id="newTaskDescription"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              rows={2}
              className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="タスクの簡単な要約やメモ"
            />
          </div>
           <div>
            <label htmlFor="newTaskPurpose" className="block text-sm font-medium text-gray-700 mb-1">目的 (任意)</label>
            <textarea
              id="newTaskPurpose"
              value={newTaskPurpose}
              onChange={(e) => setNewTaskPurpose(e.target.value)}
              rows={2}
              className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="このタスクを行う理由"
            />
          </div>
          <div>
            <label htmlFor="newTaskAcceptanceCriteria" className="block text-sm font-medium text-gray-700 mb-1">達成基準 (任意)</label>
            <textarea
              id="newTaskAcceptanceCriteria"
              value={newTaskAcceptanceCriteria}
              onChange={(e) => setNewTaskAcceptanceCriteria(e.target.value)}
              rows={2}
              className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="このタスクの「完了」状態とは"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="newTaskStartDate" className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
              <input
                type="date"
                id="newTaskStartDate"
                value={newTaskStartDate}
                onChange={(e) => setNewTaskStartDate(e.target.value)}
                min={minDateForNewTask}
                max={newTaskDueDate || maxDateForNewTask}
                className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              />
            </div>
            <div>
              <label htmlFor="newTaskDueDate" className="block text-sm font-medium text-gray-700 mb-1">期日</label>
              <input
                type="date"
                id="newTaskDueDate"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                min={newTaskStartDate || minDateForNewTask}
                max={maxDateForNewTask}
                className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              />
            </div>
          </div>
           {projectStartDate && projectDueDate && (
              <p className="text-xs text-gray-500">
                  タスクの日付はプロジェクト開始日（{projectStartDate ? formatDate(projectStartDate) : '未設定'}）とプロジェクト期日（{projectDueDate ? formatDate(projectDueDate) : '未設定'}）の間である必要があります。
              </p>
          )}
           <div>
            <label htmlFor="newTaskAssignee" className="block text-sm font-medium text-gray-700 mb-1">担当者 (任意)</label>
            <input
              type="text"
              id="newTaskAssignee"
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="担当者名"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowAddTaskForm(false);
                resetAddTaskForm();
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
            >
              タスク追加
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-grow w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="w-4 h-4 text-gray-400" />
          </div>
          <input 
            type="text"
            placeholder="タスク名、コード、担当者で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-9 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 text-sm"
            aria-label="タスク名、コード、担当者で検索"
          />
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
          <label htmlFor="sort-key" className="text-sm text-gray-600">並び替え:</label>
          <select 
            id="sort-key"
            value={sortConfig.key}
            onChange={(e) => requestSort(e.target.value as SortKey)}
            className="p-2 bg-white border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-1 focus:ring-blue-500"
          >
            <option value="default">デフォルト (コード順)</option>
            <option value="name">タスク名</option>
            <option value="startDate">開始日</option>
            <option value="dueDate">期日</option>
            <option value="status">ステータス</option>
          </select>
          <button 
            onClick={() => requestSort(sortConfig.key)} 
            className="p-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-200"
            aria-label={`並び替え ${sortConfig.direction === 'asc' ? '降順' : '昇順'}`}
            disabled={sortConfig.key === 'default'} 
          >
            {sortConfig.direction === 'asc' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto pr-1">
        {isLoading && tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-sm">AIが初期タスクを生成中です...</p>
          </div>
        )}
        
        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <NoTasksIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h4 className="text-lg font-medium text-gray-700">タスクがありません！</h4>
            <p className="text-gray-500 mt-1 text-sm">
              {showAddTaskForm ? "上のフォームに入力して最初のタスクを追加してください。" : "「タスク追加」ボタンをクリックするか、AIチャットを使用してタスクを作成してください。"}
            </p>
          </div>
        )}

        {tasks.length > 0 && displayedTasks.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <SearchIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h4 className="text-lg font-medium text-gray-700">検索に一致するタスクがありません。</h4>
            <p className="text-gray-500 mt-1 text-sm">別の検索語を試すか、並び替えオプションを調整してください。</p>
          </div>
        )}

        {displayedTasks.length > 0 && (
          <div className="space-y-3">
            {displayedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                allTasks={tasks}
                onStatusChange={onTaskStatusChange}
                onUpdate={onTaskUpdate}
                onRequestDelete={onRequestTaskDelete}
                projectStartDate={projectStartDate}
                projectDueDate={projectDueDate}
                isEditable={isEditable} // ★★★ ここでisEditableを渡す！
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- (Iconsは変更なし) ---
const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
const MinusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
);
const NoTasksIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25v8.25a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V8.25M3 16.5V6.231C3 5.385 3.53 4.637 4.303 4.303l7.5-3.334a1.875 1.875 0 0 1 1.394 0l7.5 3.334c.773.334 1.303 1.082 1.303 1.928V16.5" />
  </svg>
);
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);
const SortAscIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h1.5M3 7.5h4.5M3 10.5h7.5M3 13.5h10.5M3 16.5h13.5M3 19.5h16.5M15 15l-3-3m0 0l-3 3m3-3v12" />
 </svg>
);
const SortDescIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h1.5M3 7.5h4.5M3 10.5h7.5M3 13.5h10.5M3 16.5h13.5M3 19.5h16.5M15 9l-3 3m0 0l-3-3m3 3V3" />
  </svg>
);