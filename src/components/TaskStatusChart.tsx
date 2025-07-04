import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { Task } from '@/types';
import { TaskStatus } from '@/types';
import { TASK_STATUS_CHART_BAR_COLORS } from '@/constants'; // Use new constant for bar colors

interface TaskStatusChartProps {
  tasks: Task[];
}

export const TaskStatusChart: React.FC<TaskStatusChartProps> = ({ tasks }) => {
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);


  const chartData = Object.values(TaskStatus).map(status => ({
    name: status,
    tasks: statusCounts[status] || 0,
    fill: TASK_STATUS_CHART_BAR_COLORS[status] || '#9ca3af' // Default to a gray if status somehow not in map
  }));


  if (tasks.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500 text-sm">No task data to display chart.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /> {/* gray-200 */}
        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} /> {/* gray-500 */}
        <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} /> {/* gray-500 */}
        <Tooltip
            cursor={{fill: 'rgba(229, 231, 235, 0.5)'}} // gray-200 with opacity
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }} // white bg, gray-200 border
            labelStyle={{ color: '#374151', fontWeight: '500', marginBottom: '0.25rem', fontSize: '0.875rem' }} // gray-700
            itemStyle={{ color: '#4b5563', fontSize: '0.875rem' }} // gray-600
        />
        <Legend wrapperStyle={{fontSize: "11px", color: '#6b7280', paddingTop: '4px'}} /> {/* gray-500 */}
        <Bar dataKey="tasks" name="Tasks" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};