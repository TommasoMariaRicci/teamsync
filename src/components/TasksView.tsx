import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';
import { Plus, Calendar as CalendarIcon, Flag, User as UserIcon, CheckCircle2, Circle } from 'lucide-react';
import { format, parseISO, isToday, isBefore, isAfter, startOfDay, endOfDay, subWeeks } from 'date-fns';
import { TaskModal } from './TaskModal';
import clsx from 'clsx';

export const TasksView: React.FC = () => {
  const { tasks, users, updateTask } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'my'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');

  const oneWeekAgo = subWeeks(new Date(), 1);

  const filteredTasks = tasks.filter(task => {
    // Hide completed tasks older than 1 week from task list
    if (task.status === 'done' && task.completed_at && isBefore(parseISO(task.completed_at), oneWeekAgo)) {
      return false;
    }

    if (filter === 'my' && task.assignee_id !== currentUser?.id) return false;

    if (dateFilter !== 'all') {
      if (!task.due_date) return false;
      const dueDate = parseISO(task.due_date);
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      if (dateFilter === 'overdue' && !isBefore(dueDate, todayStart)) return false;
      if (dateFilter === 'today' && !isToday(dueDate)) return false;
      if (dateFilter === 'upcoming' && !isAfter(dueDate, todayEnd)) return false;
    }

    return true;
  }).sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const toggleStatus = (task: Task) => {
    updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const getAssigneeName = (id?: string | null) => {
    if (!id) return 'Unassigned';
    return users.find(u => u.id === id)?.display_name || 'Unknown';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Tasks</h1>
          <p className="text-zinc-500 mt-2">Manage your team's tasks and priorities.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Task
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              filter === 'all' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            )}
          >
            All Tasks
          </button>
          <button
            onClick={() => setFilter('my')}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              filter === 'my' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
            )}
          >
            My Tasks
          </button>
        </div>

        <div className="h-9 w-px bg-zinc-200 hidden sm:block"></div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setDateFilter('all')} className={clsx('px-4 py-2 rounded-full text-sm font-medium transition-colors', dateFilter === 'all' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50')}>Any Date</button>
          <button onClick={() => setDateFilter('overdue')} className={clsx('px-4 py-2 rounded-full text-sm font-medium transition-colors', dateFilter === 'overdue' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50')}>Overdue</button>
          <button onClick={() => setDateFilter('today')} className={clsx('px-4 py-2 rounded-full text-sm font-medium transition-colors', dateFilter === 'today' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50')}>Today</button>
          <button onClick={() => setDateFilter('upcoming')} className={clsx('px-4 py-2 rounded-full text-sm font-medium transition-colors', dateFilter === 'upcoming' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50')}>Upcoming</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-2xl shadow-sm border border-zinc-100">
        <div className="divide-y divide-zinc-100">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">No tasks found. Create one to get started!</div>
          ) : (
            filteredTasks.map(task => (
              <div
                key={task.id}
                className={clsx(
                  "p-4 hover:bg-zinc-50 transition-colors flex items-start gap-4 group cursor-pointer",
                  task.status === 'done' && "opacity-60"
                )}
                onClick={() => openEditModal(task)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStatus(task); }}
                  className="mt-1 text-zinc-400 hover:text-indigo-600 transition-colors"
                >
                  {task.status === 'done' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6" />}
                </button>

                <div className="flex-1 min-w-0">
                  <h3 className={clsx("text-base font-medium text-zinc-900", task.status === 'done' && "line-through")}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-medium text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4" />
                      {getAssigneeName(task.assignee_id)}
                    </div>
                    {task.due_date && (
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-4 h-4" />
                        {format(parseISO(task.due_date), 'MMM d, yyyy')}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Flag className={clsx(
                        "w-4 h-4",
                        task.urgency === 'high' ? 'text-red-500' : task.urgency === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                      )} />
                      <span className="capitalize">{task.urgency}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
