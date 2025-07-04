import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Task } from '@/types';
import { TaskStatus } from '@/types';
import { TASK_STATUS_OPTIONS, TASK_STATUS_COLORS, TASK_STATUS_TEXT_COLORS } from '@/constants';
import { formatDate, parseDate, getDifferenceInDays } from '@/utils/dateUtils';

// ★ 変更点: isEditable を props に追加
interface TaskItemProps {
  task: Task;
  allTasks?: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onUpdate: (updatedTask: Task) => void;
  onRequestDelete: (taskId: string, taskName: string) => void;
  projectStartDate?: string;
  projectDueDate?: string;
  isEditable: boolean; // ★ 追加
}

const today = new Date();
const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());

// ★ 変更点: isEditable を受け取る
export const TaskItem = ({ task, allTasks, onStatusChange, onUpdate, onRequestDelete, projectStartDate, projectDueDate, isEditable }: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(task.name);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [editedPurpose, setEditedPurpose] = useState(task.purpose || '');
  const [editedAcceptanceCriteria, setEditedAcceptanceCriteria] = useState(task.acceptanceCriteria || '');
  const [editedStartDate, setEditedStartDate] = useState(task.startDate);
  const [editedDueDate, setEditedDueDate] = useState(task.dueDate);
  const [editedAssignee, setEditedAssignee] = useState(task.assignee || '');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditedName(task.name);
      setEditedDescription(task.description);
      setEditedPurpose(task.purpose || '');
      setEditedAcceptanceCriteria(task.acceptanceCriteria || '');
      setEditedStartDate(task.startDate);
      setEditedDueDate(task.dueDate);
      setEditedAssignee(task.assignee || '');
      nameInputRef.current?.focus();
    }
  }, [isEditing, task]);

  const handleSave = () => {
    if (!editedName.trim()) {
        alert("タスク名は空にできません。");
        return;
    }
    if (!editedStartDate || !editedDueDate) {
        alert("タスクの開始日と期日は必須です。");
        return;
    }
    if (new Date(editedStartDate) > new Date(editedDueDate)) {
        alert("タスクの開始日は期日より後に設定できません。");
        return;
    }
    if (projectStartDate && new Date(editedStartDate) < new Date(projectStartDate)) {
        alert(`タスクの開始日はプロジェクト開始日（${formatDate(projectStartDate)}）より前に設定できません。`);
        return;
    }
    if (projectDueDate && new Date(editedDueDate) > new Date(projectDueDate)) {
        alert(`タスクの期日はプロジェクト期日（${formatDate(projectDueDate)}）より後に設定できません。`);
        return;
    }

    onUpdate({ 
        ...task, 
        name: editedName.trim(), 
        description: editedDescription.trim(),
        purpose: editedPurpose.trim() || undefined,
        acceptanceCriteria: editedAcceptanceCriteria.trim() || undefined,
        startDate: editedStartDate,
        dueDate: editedDueDate,
        assignee: editedAssignee.trim() || undefined 
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(task.name);
    setEditedDescription(task.description);
    setEditedPurpose(task.purpose || '');
    setEditedAcceptanceCriteria(task.acceptanceCriteria || '');
    setEditedStartDate(task.startDate);
    setEditedDueDate(task.dueDate);
    setEditedAssignee(task.assignee || '');
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    onRequestDelete(task.id, task.name);
  };

  const statusTagBgColor = TASK_STATUS_COLORS[task.status] || 'bg-gray-200';
  const statusTagTextColor = TASK_STATUS_TEXT_COLORS[task.status] || 'text-gray-700';
  
  const minDateForEdit = projectStartDate || today.toISOString().split('T')[0];
  const maxDateForEdit = projectDueDate;

  const dependencyNames = useMemo(() => {
    if (!task.dependsOn || task.dependsOn.length === 0 || !allTasks) {
      return null;
    }
    return task.dependsOn
      .map(depId => allTasks.find(t => t.id === depId)?.name)
      .filter(name => !!name)
      .join(', ');
  }, [task.dependsOn, allTasks]);

  const taskDueDate = parseDate(task.dueDate);
  const isOverdue = taskDueDate < todayNormalized && task.status !== TaskStatus.COMPLETED;
  const daysUntilDue = getDifferenceInDays(todayNormalized, taskDueDate);
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3 && task.status !== TaskStatus.COMPLETED;

  let itemStyleClasses = "p-3 md:p-4 rounded-md shadow-sm border border-l-4 bg-white hover:shadow-md transition-shadow group";
  let alertInfo = null;

  if (isOverdue) {
    itemStyleClasses += ` border-red-500 bg-red-50`;
    alertInfo = (
      <div className="flex items-center text-xs text-red-700 font-medium mt-2">
        <ExclamationTriangleIcon className="w-3.5 h-3.5 mr-1" />
        期限切れ
      </div>
    );
  } else if (isDueSoon) {
    itemStyleClasses += ` border-yellow-500 bg-yellow-50`;
     alertInfo = (
      <div className="flex items-center text-xs text-yellow-700 font-medium mt-2">
        <ClockIcon className="w-3.5 h-3.5 mr-1" />
        期限間近 ({daysUntilDue === 0 ? '本日' : `${daysUntilDue}日後`})
      </div>
    );
  } else {
     itemStyleClasses += task.status === TaskStatus.COMPLETED ? ' border-green-500' :
                         task.status === TaskStatus.IN_PROGRESS ? ' border-blue-500' :
                         ' border-gray-400';
  }


  if (isEditing) {
    // ★ 変更点: isEditable でない場合は編集フォームを表示しない
    if (!isEditable) {
        // isEditingをfalseに戻して無限ループを防ぐ
        useEffect(() => setIsEditing(false), []);
        return null; // Or a read-only view
    }
    return (
      <div className="bg-white p-4 rounded-md shadow-lg border border-gray-300 space-y-3">
        <div>
            <label htmlFor={`taskCode-${task.id}`} className="block text-xs font-medium text-gray-500 mb-0.5">タスクコード (システム割当)</label>
            <p id={`taskCode-${task.id}`} className="w-full p-2 bg-gray-100 border border-gray-200 rounded-md text-sm font-mono text-gray-600 select-all cursor-text">{task.code}</p>
        </div>
        <div>
          <label htmlFor={`taskName-${task.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">タスク名</label>
          <input
            id={`taskName-${task.id}`}
            ref={nameInputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-lg font-medium text-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor={`taskDesc-${task.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">説明 / メモ</label>
          <textarea
            id={`taskDesc-${task.id}`}
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            rows={2}
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor={`taskPurpose-${task.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">目的</label>
          <textarea
            id={`taskPurpose-${task.id}`}
            value={editedPurpose}
            onChange={(e) => setEditedPurpose(e.target.value)}
            rows={2}
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="このタスクがなぜ重要か"
          />
        </div>
        <div>
          <label htmlFor={`taskAcceptanceCriteria-${task.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">達成基準</label>
          <textarea
            id={`taskAcceptanceCriteria-${task.id}`}
            value={editedAcceptanceCriteria}
            onChange={(e) => setEditedAcceptanceCriteria(e.target.value)}
            rows={3}
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="このタスクの「完了」状態とは"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`taskStartDate-${task.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">開始日</label>
              <input
                type="date"
                id={`taskStartDate-${task.id}`}
                value={editedStartDate}
                onChange={(e) => setEditedStartDate(e.target.value)}
                min={minDateForEdit}
                max={editedDueDate || maxDateForEdit}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor={`taskDueDate-${task.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">期日</label>
              <input
                type="date"
                id={`taskDueDate-${task.id}`}
                value={editedDueDate}
                onChange={(e) => setEditedDueDate(e.target.value)}
                min={editedStartDate || minDateForEdit}
                max={maxDateForEdit}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
        </div>
        {projectStartDate && projectDueDate && (
            <p className="text-xs text-gray-500 -mt-2">
                タスクの日付はプロジェクト開始日（{projectStartDate ? formatDate(projectStartDate) : '未設定'}）と期日（{projectDueDate ? formatDate(projectDueDate) : '未設定'}）の間である必要があります。
            </p>
        )}
         <div>
          <label htmlFor={`taskAssignee-${task.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">担当者 (任意)</label>
          <input
            id={`taskAssignee-${task.id}`}
            type="text"
            value={editedAssignee}
            onChange={(e) => setEditedAssignee(e.target.value)}
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="担当者名"
          />
        </div>
        <div className="flex justify-end space-x-2 pt-2">
          <button onClick={handleCancel} className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">キャンセル</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors">保存</button>
        </div>
      </div>
    );
  }

  return (
    <div className={itemStyleClasses}>
      <div className="flex flex-col sm:flex-row justify-between items-start">
        <div className="flex-grow mb-2 sm:mb-0 pr-2 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className="text-base md:text-lg font-medium text-gray-800 break-words flex-1 min-w-0 mr-2">{task.name}</h4>
            <span className="text-xs font-mono text-gray-400 select-all whitespace-nowrap pt-1">{task.code}</span>
          </div>
          {task.description && <p className="text-sm text-gray-600 mt-1 break-words whitespace-pre-wrap">{task.description}</p>}
          
          {task.purpose && (
            <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-md">
                <h5 className="text-xs font-semibold text-indigo-700 flex items-center">
                    <LightBulbIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                    目的
                </h5>
                <p className="text-xs text-indigo-600 mt-0.5 whitespace-pre-wrap">{task.purpose}</p>
            </div>
          )}

          {task.acceptanceCriteria && (
            <div className="mt-2 p-2 bg-teal-50 border border-teal-200 rounded-md">
                <h5 className="text-xs font-semibold text-teal-700 flex items-center">
                    <CheckCircleIcon className="w-3.5 h-3.5 mr-1.5 text-teal-500" />
                    達成基準
                </h5>
                <p className="text-xs text-teal-600 mt-0.5 whitespace-pre-wrap">{task.acceptanceCriteria}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-3">
            <p>
              <CalendarDaysIcon className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              開始: {formatDate(task.startDate)}
            </p>
            <p>
              <CalendarDaysIcon className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              期日: {formatDate(task.dueDate)}
            </p>
          </div>
           {alertInfo}
          {dependencyNames && (
            <p className="text-xs text-blue-600 mt-2 italic">
              <LinkIcon className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              依存先: {dependencyNames}
            </p>
          )}
          {task.assignee && (
            <p className="text-xs text-purple-600 mt-2">
              <UserCircleIcon className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              担当者: {task.assignee}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 mt-2 sm:mt-0 self-start sm:self-center">
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
            // ★ 変更点: isEditable でない場合は無効化
            disabled={!isEditable}
            className={`${statusTagBgColor} ${statusTagTextColor} text-xs font-medium py-0.5 px-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-400 appearance-none disabled:opacity-70 disabled:cursor-not-allowed`}
            style={{ WebkitAppearance: 'none', appearance: 'none' }}
            aria-label={`タスク「${task.name}」のステータス`}
          >
            {TASK_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status} className="bg-white text-gray-800">
                {status}
              </option>
            ))}
          </select>
          {/* ★ 変更点: isEditable でない場合はボタンを非表示 */}
          {isEditable && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`タスク「${task.name}」を編集`}
              >
                <EditIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteClick}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`タスク「${task.name}」を削除`}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- (Icons は変更なし) ---
const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);
const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);
const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);
const LinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
  </svg>
);
const UserCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
const ExclamationTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
  </svg>
);
const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);
