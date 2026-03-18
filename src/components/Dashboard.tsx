import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { isToday, isPast, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Link } from 'react-router';

export const Dashboard: React.FC = () => {
  const { tasks, notes } = useData();
  const { currentUser } = useAuth();

  const myTasks = tasks.filter(t => t.assignee_id === currentUser?.id);
  const pendingTasks = myTasks.filter(t => t.status !== 'done');

  const urgentTasks = pendingTasks.filter(t => t.urgency === 'high');
  const overdueTasks = pendingTasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
  const todayTasks = pendingTasks.filter(t => t.due_date && isToday(parseISO(t.due_date)));

  const recentNotes = [...notes].sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  ).slice(0, 5);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Welcome back!</h1>
        <p className="text-zinc-500 mt-2">Here's your overview for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Pending Tasks</p>
            <p className="text-2xl font-bold text-zinc-900">{pendingTasks.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Urgent</p>
            <p className="text-2xl font-bold text-zinc-900">{urgentTasks.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Overdue</p>
            <p className="text-2xl font-bold text-zinc-900">{overdueTasks.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Total Notes</p>
            <p className="text-2xl font-bold text-zinc-900">{notes.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-zinc-900">Due Today</h2>
            <Link to="/tasks" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {todayTasks.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">No tasks due today. Enjoy your day!</div>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className="p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${task.urgency === 'high' ? 'bg-red-500' : task.urgency === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className="font-medium text-zinc-900">{task.title}</span>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-zinc-900">Recent Notes</h2>
            <Link to="/notes" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          <div className="divide-y divide-zinc-100">
            {recentNotes.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">No notes yet.</div>
            ) : (
              recentNotes.map(note => (
                <div key={note.id} className="p-4 hover:bg-zinc-50 transition-colors">
                  <h3 className="font-medium text-zinc-900">{note.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
