import React, { useState, useEffect, useRef } from 'react';
import type { Task } from '@/types';
import { TaskStatus } from '@/types';
import { TASK_STATUS_CHART_BAR_COLORS } from '@/constants';
import { parseDate, getDaysBetweenDates, addDays, getMonthAndDay, isWeekend, getDayOfWeek, formatDate, getDifferenceInDays } from '@/utils/dateUtils';

interface GanttChartViewProps {
  tasks: Task[];
  projectStartDate: string;
  projectDueDate: string;
  onTaskDatesChange: (taskId: string, newStartDate: string, newDueDate: string) => void;
}

const DAY_WIDTH_PX = 35; // Width of a single day cell in pixels
const TASK_BAR_HEIGHT_PX = 28;
const TASK_ROW_GAP_PX = 8;
const HEADER_HEIGHT_PX = 60; // For month/day headers
const RESIZE_HANDLE_WIDTH_PX = 8; // Width of the clickable resize handle area

type DragMode = 'move' | 'resize-left' | 'resize-right';

interface DraggingTaskInfo {
  id: string;
  initialTaskStartDate: string; // Task's start date when drag began
  initialTaskDueDate: string;   // Task's due date when drag began
  initialMouseX: number;    // Mouse X position when drag began
  originalLeftPx: number;     // Original CSS left position of the task bar (pixels)
  originalWidthPx: number;    // Original CSS width of the task bar (pixels)
  dragMode: DragMode;
  taskIndex: number; // To calculate ghost bar's top position
}

interface GhostTaskPosition {
  leftPx: number;
  widthPx: number;
  startDateStr: string; // Current start date of the ghost
  dueDateStr: string;   // Current due date of the ghost
  topPx: number;
}


export const GanttChartView: React.FC<GanttChartViewProps> = ({ tasks, projectStartDate, projectDueDate, onTaskDatesChange }) => {
  const [draggingTaskInfo, setDraggingTaskInfo] = useState<DraggingTaskInfo | null>(null);
  const [ghostTaskPosition, setGhostTaskPosition] = useState<GhostTaskPosition | null>(null);
  const ganttChartContainerRef = useRef<HTMLDivElement>(null);
  
  const latestDraggedDatesRef = useRef<{ startDate: string, dueDate: string } | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        ガントチャートに表示するタスクがありません。
      </div>
    );
  }

  const overallStartDateObj = parseDate(projectStartDate);
  const overallEndDateObj = parseDate(projectDueDate);
  const totalProjectDays = getDaysBetweenDates(projectStartDate, projectDueDate);
  const today = new Date(); 
  const todayNormalized = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const timelineDays: string[] = [];
  for (let i = 0; i < totalProjectDays; i++) {
    timelineDays.push(addDays(projectStartDate, i));
  }
  
  const getTaskPositionAndWidth = (taskStartDateStr: string, taskDueDateStr: string) => {
    const taskStartObj = parseDate(taskStartDateStr);
    const taskDueObj = parseDate(taskDueDateStr);

    // Ensure task dates are valid before calculating position
    if (taskStartObj > taskDueObj) {
        console.warn(`Invalid task dates for position calculation: Start ${taskStartDateStr} is after Due ${taskDueDateStr}`);
        // Return a zero-width bar at the start if dates are invalid to avoid errors
        return { left: 0, width: 0};
    }
    
    const offsetDays = Math.max(0, getDifferenceInDays(overallStartDateObj, taskStartObj));
    const durationDays = getDaysBetweenDates(taskStartDateStr, taskDueDateStr);
    
    return {
      left: offsetDays * DAY_WIDTH_PX,
      width: durationDays * DAY_WIDTH_PX,
    };
  };

  const todayMarkerPosition = getDifferenceInDays(overallStartDateObj, todayNormalized);
  const showTodayMarker = todayMarkerPosition >= 0 && todayMarkerPosition < totalProjectDays;

  const monthHeaders: { name: string, days: number, year: number }[] = [];
  let currentMonth = -1;
  timelineDays.forEach(dayStr => {
    const date = parseDate(dayStr);
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    if (month !== currentMonth) {
      currentMonth = month;
      monthHeaders.push({ name: date.toLocaleDateString('ja-JP', { month: 'long', timeZone: 'UTC' }), days: 0, year: year });
    }
    monthHeaders[monthHeaders.length - 1].days++;
  });

  const initializeDrag = (
    e: React.MouseEvent<HTMLDivElement>, 
    task: Task, 
    taskIndex: number, 
    mode: DragMode
  ) => {
    if (!isEditable) return; // ★ 編集不可ならドラッグを開始しない
    e.preventDefault();
    e.stopPropagation(); // Important to prevent conflicts if handles are inside another draggable

    const { left: originalLeftPx, width: originalWidthPx } = getTaskPositionAndWidth(task.startDate, task.dueDate);
    
    setDraggingTaskInfo({
      id: task.id,
      initialTaskStartDate: task.startDate,
      initialTaskDueDate: task.dueDate,
      initialMouseX: e.clientX,
      originalLeftPx,
      originalWidthPx,
      dragMode: mode,
      taskIndex,
    });
    
    latestDraggedDatesRef.current = { startDate: task.startDate, dueDate: task.dueDate };

    const topPositionPx = taskIndex * (TASK_BAR_HEIGHT_PX + TASK_ROW_GAP_PX);
    setGhostTaskPosition({ 
        leftPx: originalLeftPx,
        widthPx: originalWidthPx,
        startDateStr: task.startDate,
        dueDateStr: task.dueDate,
        topPx: topPositionPx
    });
  };


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingTaskInfo || !ganttChartContainerRef.current) return;

      const { 
        initialMouseX, 
        initialTaskStartDate, 
        initialTaskDueDate, 
        originalLeftPx, 
        originalWidthPx, 
        dragMode 
      } = draggingTaskInfo;

      const mouseXOffset = e.clientX - initialMouseX;
      const dayOffset = Math.round(mouseXOffset / DAY_WIDTH_PX);

      let newStartDateStr = initialTaskStartDate;
      let newDueDateStr = initialTaskDueDate;

      if (dragMode === 'move') {
        const currentDurationDays = getDaysBetweenDates(initialTaskStartDate, initialTaskDueDate);
        newStartDateStr = addDays(initialTaskStartDate, dayOffset);
        newDueDateStr = addDays(newStartDateStr, currentDurationDays - 1);

        // Clamp within project boundaries while maintaining duration
        if (parseDate(newStartDateStr) < overallStartDateObj) {
          newStartDateStr = projectStartDate;
          newDueDateStr = addDays(newStartDateStr, currentDurationDays - 1);
        }
        if (parseDate(newDueDateStr) > overallEndDateObj) {
          newDueDateStr = projectDueDate;
          newStartDateStr = addDays(newDueDateStr, -(currentDurationDays - 1));
          // Recalculate if clamping dueDate pushed startDate before project start
          if (parseDate(newStartDateStr) < overallStartDateObj) {
               newStartDateStr = projectStartDate;
               const reCalcNewDueDateStr = addDays(newStartDateStr, currentDurationDays -1);
               newDueDateStr = (parseDate(reCalcNewDueDateStr) > overallEndDateObj) ? projectDueDate : reCalcNewDueDateStr;
          }
        }
      } else if (dragMode === 'resize-left') {
        newStartDateStr = addDays(initialTaskStartDate, dayOffset);
        // Clamp: newStartDate >= projectStartDate and newStartDate <= initialTaskDueDate
        if (parseDate(newStartDateStr) < overallStartDateObj) newStartDateStr = projectStartDate;
        if (parseDate(newStartDateStr) > parseDate(initialTaskDueDate)) newStartDateStr = initialTaskDueDate;
        // dueDate remains initialTaskDueDate
      } else if (dragMode === 'resize-right') {
        newDueDateStr = addDays(initialTaskDueDate, dayOffset);
        // Clamp: newDueDate <= projectDueDate and newDueDate >= initialTaskStartDate
        if (parseDate(newDueDateStr) > overallEndDateObj) newDueDateStr = projectDueDate;
        if (parseDate(newDueDateStr) < parseDate(initialTaskStartDate)) newDueDateStr = initialTaskStartDate;
        // startDate remains initialTaskStartDate
      }
      
      const { left: finalNewLeftPx, width: finalNewWidthPx } = getTaskPositionAndWidth(newStartDateStr, newDueDateStr);
      latestDraggedDatesRef.current = { startDate: newStartDateStr, dueDate: newDueDateStr };
      
      setGhostTaskPosition(prev => prev ? {
        ...prev,
        leftPx: finalNewLeftPx,
        widthPx: finalNewWidthPx,
        startDateStr: newStartDateStr,
        dueDateStr: newDueDateStr,
      } : null);
    };

    const handleMouseUp = () => {
      if (draggingTaskInfo && latestDraggedDatesRef.current) {
        const { startDate: finalStartDateStr, dueDate: finalDueDateStr } = latestDraggedDatesRef.current;

        const finalStartObj = parseDate(finalStartDateStr);
        const finalEndObj = parseDate(finalDueDateStr);
        
        // Final validation
        if (finalStartObj >= overallStartDateObj && 
            finalEndObj <= overallEndDateObj && 
            finalStartObj <= finalEndObj) {
             onTaskDatesChange(draggingTaskInfo.id, finalStartDateStr, finalDueDateStr);
        } else {
            console.warn("ドラッグ/リサイズされた日付が無効です。変更は適用されません。", {
                taskId: draggingTaskInfo.id,
                finalStartDateStr, finalDueDateStr,
                projectStartDate, projectDueDate
            });
        }
      }
      document.body.style.cursor = 'default';
      setDraggingTaskInfo(null);
      setGhostTaskPosition(null);
      latestDraggedDatesRef.current = null; 
    };

    if (draggingTaskInfo) {
      document.body.style.cursor = draggingTaskInfo.dragMode === 'move' ? 'grabbing' : 'ew-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true }); // Use once: true for robust cleanup
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Reset cursor if component unmounts during drag
      if (draggingTaskInfo) document.body.style.cursor = 'default';
    };
  }, [draggingTaskInfo, onTaskDatesChange, projectStartDate, projectDueDate, overallStartDateObj, overallEndDateObj]);


  return (
    <div ref={ganttChartContainerRef} className="p-2 md:p-4 overflow-x-auto relative min-h-[300px]" style={{ paddingBottom: '20px' }}>
      <div style={{ width: totalProjectDays * DAY_WIDTH_PX, position: 'relative' }}>
        {/* Header: Months and Days */}
        <div style={{ height: HEADER_HEIGHT_PX, position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'white' }}>
            <div className="flex border-b border-gray-300">
                {monthHeaders.map((month, index) => (
                <div 
                    key={`${month.name}-${month.year}-${index}`} 
                    className="text-xs font-medium text-gray-600 text-center border-r border-gray-300 flex items-center justify-center"
                    style={{ width: month.days * DAY_WIDTH_PX, height: HEADER_HEIGHT_PX / 2 }}
                >
                    {month.year}年 {month.name}
                </div>
                ))}
            </div>
            <div className="flex border-b-2 border-gray-300">
                {timelineDays.map((dayStr) => (
                <div 
                    key={dayStr} 
                    className={`text-xs text-center border-r border-gray-200 ${isWeekend(dayStr) ? 'bg-gray-100' : 'bg-white'}`}
                    style={{ width: DAY_WIDTH_PX, height: HEADER_HEIGHT_PX / 2, lineHeight: `${HEADER_HEIGHT_PX / 2}px` }}
                    title={getDayOfWeek(dayStr)}
                >
                    {parseDate(dayStr).getUTCDate()}
                </div>
                ))}
            </div>
        </div>

        {/* Task Rows Grid Background */}
        <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 1, paddingTop: HEADER_HEIGHT_PX }}>
          {timelineDays.map((_, index) => (
            <div
              key={`gridline-${index}`}
              className="absolute top-0 bottom-0 border-r border-gray-200"
              style={{ left: (index + 1) * DAY_WIDTH_PX, width: 0, zIndex: 1 }}
            ></div>
          ))}
        </div>
        
        {/* Today Marker Line */}
        {showTodayMarker && (
          <div 
            className="absolute top-0 bottom-0 border-r-2 border-red-500 opacity-75"
            style={{ left: (todayMarkerPosition + 0.5) * DAY_WIDTH_PX, zIndex: 15, paddingTop: HEADER_HEIGHT_PX/2 }}
            title={`今日: ${formatDate(today.toISOString().split('T')[0])}`}
          >
             <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xxs text-red-500 bg-white px-0.5 rounded-sm">今日</div>
          </div>
        )}

        {/* Task Bars */}
        <div className="relative" style={{ paddingTop: '10px', zIndex: 10 }}>
          {tasks.map((task, index) => {
            const { left: currentLeftPx, width: currentWidthPx } = getTaskPositionAndWidth(task.startDate, task.dueDate);
            const taskColor = TASK_STATUS_CHART_BAR_COLORS[task.status] || '#9ca3af';
            const topPositionPx = index * (TASK_BAR_HEIGHT_PX + TASK_ROW_GAP_PX);

            const isCompleted = task.status === TaskStatus.COMPLETED;
            const progressPercentage = isCompleted ? 100 : (task.status === TaskStatus.IN_PROGRESS ? 50 : 0);
            const progressWidth = (currentWidthPx * progressPercentage) / 100;
            
            // Do not render task bar if width is zero or negative (e.g. invalid dates)
            if (currentWidthPx <=0) {
                 console.warn(`Task ${task.code} has zero or negative width, not rendering. Start: ${task.startDate}, Due: ${task.dueDate}`);
                 return null;
            }

            return (
              <div 
                key={task.id} 
                className={`absolute rounded group transition-shadow duration-100 ease-in-out flex items-center
                            ${draggingTaskInfo && draggingTaskInfo.id === task.id ? 'opacity-50 shadow-xl' : 'hover:shadow-md'}`}
                style={{ 
                    left: currentLeftPx, 
                    width: Math.max(0, currentWidthPx -1), // -1 for border visual
                    height: TASK_BAR_HEIGHT_PX, 
                    top: topPositionPx,
                    backgroundColor: taskColor,
                    userSelect: 'none', 
                }}
                onMouseDown={(e) => initializeDrag(e, task, index, 'move')}
                draggable="false" 
                title={`${task.code}: ${task.name}\n開始: ${formatDate(task.startDate)}\n期日: ${formatDate(task.dueDate)}\nステータス: ${task.status}${task.assignee ? `\n担当者: ${task.assignee}` : ''}`}
              >
                {/* Resize Handle: Left */}
                <div
                  className="absolute left-0 top-0 h-full hover:bg-black/10 group-hover:bg-black/5 w-2 cursor-ew-resize flex items-center justify-start"
                  style={{ width: RESIZE_HANDLE_WIDTH_PX }}
                  onMouseDown={(e) => initializeDrag(e, task, index, 'resize-left')}
                >
                    <div className="w-0.5 h-3/5 bg-white/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>

                {/* Progress Bar within Task Bar */}
                {progressWidth > 0 && currentWidthPx > 0 && (
                     <div 
                        className="h-full rounded opacity-40 pointer-events-none" 
                        style={{ width: `${Math.min(100, (progressWidth / Math.max(1,currentWidthPx-1)) * 100)}%`, backgroundColor: 'rgba(0,0,0,0.25)'}}
                     ></div>
                )}
                <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate pointer-events-none" style={{ marginLeft: RESIZE_HANDLE_WIDTH_PX, marginRight: RESIZE_HANDLE_WIDTH_PX }}>
                  {task.code} - {task.name}
                </span>

                {/* Resize Handle: Right */}
                <div
                  className="absolute right-0 top-0 h-full hover:bg-black/10 group-hover:bg-black/5 w-2 cursor-ew-resize flex items-center justify-end"
                  style={{ width: RESIZE_HANDLE_WIDTH_PX }}
                  onMouseDown={(e) => initializeDrag(e, task, index, 'resize-right')}
                >
                    <div className="w-0.5 h-3/5 bg-white/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            );
          })}
          {/* Ghost Bar for Dragging Feedback */}
          {ghostTaskPosition && draggingTaskInfo && (
            <div
              className="absolute rounded opacity-70 border-2 border-dashed border-blue-500 bg-blue-200 pointer-events-none"
              style={{
                left: ghostTaskPosition.leftPx,
                width: Math.max(0, ghostTaskPosition.widthPx -1),
                height: TASK_BAR_HEIGHT_PX,
                top: ghostTaskPosition.topPx,
                zIndex: 25, 
              }}
              title={`仮配置: ${draggingTaskInfo.id.substring(draggingTaskInfo.id.length - 3)}\n開始: ${formatDate(ghostTaskPosition.startDateStr)}\n期日: ${formatDate(ghostTaskPosition.dueDateStr)}`}
            >
                <span className="absolute inset-0 flex items-center justify-center px-2 text-xs font-medium text-blue-700 truncate">
                  {formatDate(ghostTaskPosition.startDateStr)} - {formatDate(ghostTaskPosition.dueDateStr)}
                </span>
            </div>
          )}
        </div>
        <div style={{ height: tasks.length * (TASK_BAR_HEIGHT_PX + TASK_ROW_GAP_PX) + HEADER_HEIGHT_PX + TASK_ROW_GAP_PX + 40 }}></div>
      </div>
    </div>
  );
};
