import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  addWeeks, subWeeks, addDays, subDays, parseISO, isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, LayoutGrid, X, CheckCircle2, Circle, Edit2, Trash2, Clock, Flag, User as UserIcon } from 'lucide-react';
import { TaskModal } from './TaskModal';
import { Task, Profile } from '../types';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

const getAssigneeColor = (userId?: string) => {
  if (!userId) return { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200', dot: 'bg-zinc-400' };
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
    { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500' },
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  ];
  return colors[Math.abs(hash) % colors.length];
};

export const CalendarView: React.FC = () => {
  const { tasks, users, updateTask, deleteTask } = useData();
  const { currentUser } = useAuth();
  
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  
  const [selectedTaskPopup, setSelectedTaskPopup] = useState<Task | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<{ date: Date, tasks: Task[] } | null>(null);

  const [filter, setFilter] = useState<'all' | 'my'>('all');

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure currentDate is a weekday on initial load if it's a weekend
  useEffect(() => {
    if (currentDate.getDay() === 0) {
      setCurrentDate(addDays(currentDate, 1));
    } else if (currentDate.getDay() === 6) {
      setCurrentDate(subDays(currentDate, 1));
    }
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.status === 'done') return false;
      if (filter === 'my') return task.assignee_id === currentUser?.id;
      return true;
    });
  }, [tasks, filter, currentUser]);

  const getTasksForDay = (day: Date) => {
    return filteredTasks.filter(task => task.due_date && isSameDay(parseISO(task.due_date), day));
  };

  const nextPeriod = () => {
    if (isMobile) {
      let next = addDays(currentDate, 1);
      if (next.getDay() === 6) next = addDays(next, 2); // Skip weekend
      setCurrentDate(next);
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const prevPeriod = () => {
    if (isMobile) {
      let prev = subDays(currentDate, 1);
      if (prev.getDay() === 0) prev = subDays(prev, 2); // Skip weekend
      setCurrentDate(prev);
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const openNewTask = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTaskPopup(null);
    setSelectedDayTasks(null);
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleToggleTaskStatus = async (task: Task) => {
    await updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
    if (selectedTaskPopup?.id === task.id) {
      if (task.status !== 'done') {
        setSelectedTaskPopup(null);
      } else {
        setSelectedTaskPopup({ ...task, status: 'todo' });
      }
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
      setSelectedTaskPopup(null);
    }
  };

  // Week View Calculations (Mon-Fri only)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  // Month View Calculations (Mon-Fri only)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd }).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  // Legend users (only those who have tasks or are part of the team)
  const activeUsers = useMemo(() => {
    const userIdsWithTasks = new Set(filteredTasks.map(t => t.assignee_id).filter(Boolean));
    return users.filter(u => userIdsWithTasks.has(u.id));
  }, [filteredTasks, users]);

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="px-4 sm:px-8 pt-4 sm:pt-8 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Calendar</h1>
          <p className="text-sm sm:text-base text-zinc-500 mt-1 sm:mt-2">Track deadlines and team schedules.</p>
        </div>
        <button
          onClick={openNewTask}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm text-sm sm:text-base"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      <div className="px-4 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
          <button onClick={prevPeriod} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 min-w-[180px] sm:min-w-[200px] text-center">
            {isMobile 
              ? format(currentDate, 'EEEE, MMM d')
              : viewMode === 'week' 
                ? `${format(weekStart, 'MMM d')} - ${format(weekDays[weekDays.length - 1], 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')
            }
          </h2>
          <button onClick={nextPeriod} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
          {/* Legend */}
          {activeUsers.length > 0 && !isMobile && (
            <div className="flex items-center gap-3 mr-4 hidden md:flex">
              {activeUsers.slice(0, 4).map(user => {
                const colors = getAssigneeColor(user.id);
                return (
                  <div key={user.id} className="flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    <div className={clsx("w-2.5 h-2.5 rounded-full", colors.dot)}></div>
                    <span className="truncate max-w-[80px]">{user.display_name?.split(' ')[0] || 'User'}</span>
                  </div>
                );
              })}
              {activeUsers.length > 4 && (
                <div className="text-xs font-medium text-zinc-500">+{activeUsers.length - 4} more</div>
              )}
            </div>
          )}

          <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg w-full sm:w-auto justify-center">
            <button
              onClick={() => setFilter('all')}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none',
                filter === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              Team
            </button>
            <button
              onClick={() => setFilter('my')}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none',
                filter === 'my' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              Mine
            </button>
          </div>

          {!isMobile && (
            <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('week')}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  viewMode === 'week' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                  viewMode === 'month' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                Month
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white border-t border-zinc-200 overflow-hidden flex flex-col w-full">
        {isMobile ? (
          <div 
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const startX = touch.clientX;
              const handleTouchEnd = (e: TouchEvent) => {
                const endX = e.changedTouches[0].clientX;
                const diffX = startX - endX;
                if (Math.abs(diffX) > 50) {
                  if (diffX > 0) nextPeriod();
                  else prevPeriod();
                }
                document.removeEventListener('touchend', handleTouchEnd);
              };
              document.addEventListener('touchend', handleTouchEnd);
            }}
          >
            {getTasksForDay(currentDate).length === 0 ? (
              <div className="text-center text-zinc-500 mt-10">No tasks for this day.</div>
            ) : (
              getTasksForDay(currentDate).map(task => {
                const colors = getAssigneeColor(task.assignee_id);
                const assignee = users.find(u => u.id === task.assignee_id);
                const timeString = task.due_date && task.due_date.includes('T') && task.due_date.length > 10 
                  ? format(parseISO(task.due_date), 'h:mm a') 
                  : null;
                
                return (
                  <div 
                    key={task.id}
                    onClick={() => setSelectedTaskPopup(task)}
                    className={clsx(
                      "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md w-full",
                      colors.bg, colors.border, colors.text,
                      task.status === 'done' && "opacity-60"
                    )}
                  >
                    <div className="font-semibold text-base mb-2">{task.title}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 text-sm opacity-80">
                        {timeString && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {timeString}</span>}
                        <span className="flex items-center gap-1">
                          <Flag className={clsx(
                            "w-4 h-4",
                            task.urgency === 'high' ? 'text-red-500' : task.urgency === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                          )} />
                          <span className="capitalize">{task.urgency}</span>
                        </span>
                      </div>
                      {assignee && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium opacity-80">{assignee.display_name?.split(' ')[0]}</span>
                          <div className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center text-xs font-bold border border-white/20">
                            {assignee.display_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : viewMode === 'week' ? (
          <div className="flex-1 grid grid-cols-5 overflow-y-auto w-full" style={{ gridTemplateRows: 'auto 1fr' }}>
            {weekDays.map((day, i) => (
              <div key={`header-${day.toISOString()}`} className={clsx(
                "sticky top-0 z-10 py-3 text-center border-b border-r border-zinc-200",
                isToday(day) ? "bg-indigo-50/90 backdrop-blur-sm" : "bg-zinc-50/90 backdrop-blur-sm",
                i === 4 && "border-r-0"
              )}>
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{format(day, 'EEEE')}</div>
                <div className={clsx(
                  "text-lg font-bold mt-0.5",
                  isToday(day) ? "text-indigo-600" : "text-zinc-900"
                )}>{format(day, 'd')}</div>
              </div>
            ))}
            {weekDays.map((day, i) => {
              const dayTasks = getTasksForDay(day);
              return (
                <div key={`body-${day.toISOString()}`} className={clsx(
                  "border-r border-zinc-200 p-1 min-h-[120px]",
                  isToday(day) && "bg-indigo-50/30",
                  i === 4 && "border-r-0"
                )}>
                  <div className="flex flex-col gap-1">
                    {dayTasks.map(task => {
                      const colors = getAssigneeColor(task.assignee_id);
                      const assignee = users.find(u => u.id === task.assignee_id);
                      const timeString = task.due_date && task.due_date.includes('T') && task.due_date.length > 10 
                        ? format(parseISO(task.due_date), 'h:mm a') 
                        : null;
                      
                      return (
                        <div 
                          key={task.id}
                          onClick={() => setSelectedTaskPopup(task)}
                          className={clsx(
                            "p-1 rounded border text-sm cursor-pointer transition-all hover:shadow-md w-full",
                            colors.bg, colors.border, colors.text,
                            task.status === 'done' && "opacity-60"
                          )}
                        >
                          <div className="font-semibold line-clamp-3 leading-tight mb-1 px-0.5">{task.title}</div>
                          <div className="flex items-center justify-between px-0.5">
                            <div className="text-[10px] opacity-80 flex items-center gap-1">
                              {timeString && <><Clock className="w-3 h-3" /> {timeString}</>}
                            </div>
                            {assignee && (
                              <div className="w-4 h-4 rounded-full bg-white/50 flex items-center justify-center text-[9px] font-bold border border-white/20 shrink-0" title={assignee.display_name}>
                                {assignee.display_name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-5 overflow-y-auto w-full" style={{ gridTemplateRows: `auto repeat(${monthDays.length / 5}, minmax(0, 1fr))` }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
              <div key={`header-${day}`} className={clsx(
                "sticky top-0 z-10 bg-zinc-50 py-3 text-center text-sm font-semibold text-zinc-500 uppercase tracking-wider border-b border-r border-zinc-200",
                i === 4 && "border-r-0"
              )}>
                {day}
              </div>
            ))}
            {monthDays.map((day, i) => {
              const dayTasks = getTasksForDay(day);
              return (
                <div 
                  key={`body-${day.toISOString()}`} 
                  className={clsx(
                    "border-b border-r border-zinc-200 p-1 flex flex-col min-h-[80px] sm:min-h-[100px]",
                    !isSameMonth(day, monthStart) && "bg-zinc-50/50 text-zinc-400",
                    isToday(day) && "bg-indigo-50/30",
                    i % 5 === 4 && "border-r-0"
                  )}
                >
                  <div className="flex justify-between items-start mb-1 px-1">
                    <span className={clsx(
                      "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      isToday(day) ? "bg-indigo-600 text-white" : "text-zinc-700"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayTasks.slice(0, 3).map(task => {
                      const colors = getAssigneeColor(task.assignee_id);
                      return (
                        <div 
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedTaskPopup(task); }}
                          className={clsx(
                            "text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 w-full",
                            colors.bg, colors.text,
                            task.status === 'done' && "opacity-50 line-through"
                          )}
                        >
                          <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", colors.dot)}></div>
                          <span className="truncate">{task.title}</span>
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div 
                        className="text-xs text-zinc-500 font-medium px-1 cursor-pointer hover:text-zinc-800"
                        onClick={() => setSelectedDayTasks({ date: day, tasks: dayTasks })}
                      >
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Popup Overlay */}
      <AnimatePresence>
        {selectedTaskPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              onClick={() => setSelectedTaskPopup(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              {(() => {
                const task = selectedTaskPopup;
                const assignee = users.find(u => u.id === task.assignee_id);
                const colors = getAssigneeColor(task.assignee_id);
                
                return (
                  <div>
                    <div className={clsx("h-2 w-full", colors.bg)}></div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-zinc-900 pr-8">{task.title}</h3>
                        <button 
                          onClick={() => setSelectedTaskPopup(null)}
                          className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="space-y-4 mb-8">
                        {task.description && (
                          <p className="text-zinc-600 text-sm whitespace-pre-wrap">{task.description}</p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-zinc-600">
                            <CalendarIcon className="w-4 h-4 text-zinc-400" />
                            <span>{task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy h:mm a') : 'No due date'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Flag className={clsx(
                              "w-4 h-4",
                              task.urgency === 'high' ? 'text-red-500' : task.urgency === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                            )} />
                            <span className="capitalize">{task.urgency} Priority</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-zinc-600">
                            <ProfileIcon className="w-4 h-4 text-zinc-400" />
                            <span>{assignee?.display_name || 'Unassigned'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-zinc-600">
                            {task.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-zinc-400" />}
                            <span className="capitalize">{task.status.replace('-', ' ')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            task.status === 'done' 
                              ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200" 
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          )}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {task.status === 'done' ? 'Mark Undone' : 'Mark Complete'}
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTask(task)}
                            className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Task"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Day Expansion Popup (Month View) */}
      <AnimatePresence>
        {selectedDayTasks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              onClick={() => setSelectedDayTasks(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="font-bold text-zinc-900">{format(selectedDayTasks.date, 'EEEE, MMMM d, yyyy')}</h3>
                <button 
                  onClick={() => setSelectedDayTasks(null)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-2">
                {selectedDayTasks.tasks.map(task => {
                  const colors = getAssigneeColor(task.assignee_id);
                  return (
                    <div 
                      key={task.id}
                      onClick={() => {
                        setSelectedDayTasks(null);
                        setSelectedTaskPopup(task);
                      }}
                      className={clsx(
                        "p-3 rounded-xl border text-sm cursor-pointer transition-all hover:shadow-md",
                        colors.bg, colors.border, colors.text,
                        task.status === 'done' && "opacity-60"
                      )}
                    >
                      <div className="font-semibold">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1 opacity-80 text-xs">
                        {task.due_date && task.due_date.includes('T') && task.due_date.length > 10 && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(task.due_date), 'h:mm a')}</span>
                        )}
                        <span className="flex items-center gap-1"><ProfileIcon className="w-3 h-3" /> {users.find(u => u.id === task.assignee_id)?.display_name || 'Unassigned'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isTaskModalOpen && (
        <TaskModal 
          task={taskToEdit} 
          onClose={() => setIsTaskModalOpen(false)} 
        />
      )}
    </div>
  );
};
