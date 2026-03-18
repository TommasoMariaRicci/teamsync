import React, { createContext, useContext, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Task, Note, Profile } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  tasks: Task[];
  notes: Note[];
  users: Profile[];
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<string | void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addNote: (note: Omit<Note, 'id' | 'created_at'>) => Promise<string | void>;
  updateNote: (id: string, note: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  showToast: (message: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthReady, userProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initial data fetch + realtime subscriptions
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    // Fetch initial data
    const fetchData = async () => {
      const [tasksRes, notesRes, usersRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('notes').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
      ]);

      if (tasksRes.data) setTasks(tasksRes.data);
      if (notesRes.data) setNotes(notesRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    };

    fetchData();

    // Realtime subscriptions
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new as Task, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === (payload.new as Task).id ? payload.new as Task : t));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    const notesChannel = supabase
      .channel('notes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotes(prev => [payload.new as Note, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setNotes(prev => prev.map(n => n.id === (payload.new as Note).id ? payload.new as Note : n));
        } else if (payload.eventType === 'DELETE') {
          setNotes(prev => prev.filter(n => n.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    const usersChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUsers(prev => [...prev, payload.new as Profile]);
        } else if (payload.eventType === 'UPDATE') {
          setUsers(prev => prev.map(u => u.id === (payload.new as Profile).id ? payload.new as Profile : u));
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(u => u.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [currentUser, isAuthReady]);

  const addTask = async (task: Omit<Task, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return;
    }

    // Fire integrations after successful creation
    const createdTask = data as Task;
    sendHubSpotTask(createdTask);
    sendSlackDMNotification(createdTask);

    return data.id;
  };

  // HubSpot: create task + associate to contact
  const sendHubSpotTask = async (task: Task) => {
    if (!userProfile?.hubspot_enabled || !userProfile?.hubspot_token) return;

    try {
      const dueDate = task.due_date ? new Date(task.due_date).getTime() : Date.now() + 7 * 24 * 60 * 60 * 1000;
      const priorityMap: Record<string, string> = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
      const assignee = users.find(u => u.id === task.assignee_id);

      // Create HubSpot task
      const taskRes = await fetch(
        `https://corsproxy.io/?${encodeURIComponent('https://api.hubapi.com/crm/v3/objects/tasks')}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userProfile.hubspot_token}`,
          },
          body: JSON.stringify({
            properties: {
              hs_task_subject: task.title,
              hs_task_body: task.description || '',
              hs_task_status: 'NOT_STARTED',
              hs_task_priority: priorityMap[task.urgency] || 'MEDIUM',
              hs_timestamp: dueDate.toString(),
            },
          }),
        }
      );

      if (!taskRes.ok) {
        console.error('HubSpot task creation failed:', await taskRes.text());
        return;
      }

      const hubspotTask = await taskRes.json();
      console.log('HubSpot task created:', hubspotTask.id);

      // If assignee has email, search for HubSpot contact and associate
      if (assignee?.email) {
        const searchRes = await fetch(
          `https://corsproxy.io/?${encodeURIComponent('https://api.hubapi.com/crm/v3/objects/contacts/search')}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userProfile.hubspot_token}`,
            },
            body: JSON.stringify({
              filterGroups: [{
                filters: [{
                  propertyName: 'email',
                  operator: 'EQ',
                  value: assignee.email,
                }],
              }],
            }),
          }
        );

        const searchData = await searchRes.json();
        if (searchData.total > 0) {
          const contactId = searchData.results[0].id;
          // Associate task to contact (type 204)
          await fetch(
            `https://corsproxy.io/?${encodeURIComponent(`https://api.hubapi.com/crm/v3/objects/tasks/${hubspotTask.id}/associations/contacts/${contactId}/204`)}`,
            {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${userProfile.hubspot_token}` },
            }
          );
          console.log('HubSpot task associated with contact:', contactId);
        }
      }
    } catch (err) {
      console.error('HubSpot integration error:', err);
    }
  };

  // Slack: DM the assignee when a task is created
  const sendSlackDMNotification = async (task: Task) => {
    if (!userProfile?.slack_enabled || !userProfile?.slack_token) return;
    if (!task.assignee_id) return;

    const assignee = users.find(u => u.id === task.assignee_id);
    if (!assignee?.email) return;

    try {
      // Look up Slack user by email
      const lookupRes = await fetch(
        `https://corsproxy.io/?${encodeURIComponent(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(assignee.email)}`)}`,
        {
          headers: { 'Authorization': `Bearer ${userProfile.slack_token}` },
        }
      );
      const lookupData = await lookupRes.json();
      if (!lookupData.ok) {
        console.warn('Slack user not found for:', assignee.email);
        return;
      }

      const slackUserId = lookupData.user.id;

      // Open DM conversation
      const dmRes = await fetch(
        `https://corsproxy.io/?${encodeURIComponent('https://slack.com/api/conversations.open')}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userProfile.slack_token}`,
          },
          body: JSON.stringify({ users: slackUserId }),
        }
      );
      const dmData = await dmRes.json();
      if (!dmData.ok) return;

      const channelId = dmData.channel.id;
      const priority = (task.urgency || 'medium').charAt(0).toUpperCase() + (task.urgency || 'medium').slice(1);
      const dueDate = task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date';
      const creatorName = userProfile.display_name || currentUser?.email || 'Someone';

      // Send DM with Block Kit
      const blocks = [
        { type: "header", text: { type: "plain_text", text: "📋 New Task Assigned", emoji: true } },
        { type: "section", text: { type: "mrkdwn", text: `*${task.title}*` } },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Assigned by:*\n${creatorName}` },
            { type: "mrkdwn", text: `*Priority:*\n${priority}` },
            { type: "mrkdwn", text: `*Due:*\n${dueDate}` },
            { type: "mrkdwn", text: `*Status:*\nTo Do` },
          ],
        },
        { type: "divider" },
      ];

      await fetch(
        `https://corsproxy.io/?${encodeURIComponent('https://slack.com/api/chat.postMessage')}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userProfile.slack_token}`,
          },
          body: JSON.stringify({ channel: channelId, blocks }),
        }
      );
      console.log('Slack DM sent to:', assignee.email);
    } catch (err) {
      console.error('Slack DM error:', err);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const oldTask = tasks.find(t => t.id === id);

    // If completing, set completed_at
    if (oldTask && oldTask.status !== 'done' && updates.status === 'done') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating task:', error);
      return;
    }

    // Send Slack notification on completion
    if (oldTask && oldTask.status !== 'done' && updates.status === 'done') {
      sendSlackCompletionNotification(oldTask);
    }
  };

  const sendSlackCompletionNotification = (task: Task) => {
    if (!userProfile?.slack_enabled || !userProfile?.slack_token) return;

    const channelId = userProfile.slack_completed_channel_id || 'C0AMKG3RTL1';
    const assignee = users.find(u => u.id === task.assignee_id)?.display_name || 'Unassigned';
    const priority = (task.urgency || 'medium').charAt(0).toUpperCase() + (task.urgency || 'medium').slice(1);

    const blocks = [
      { type: "header", text: { type: "plain_text", text: "Task Completed", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*${task.title}*` } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Completed by:*\n${userProfile.display_name || currentUser?.email || 'Unknown'}` },
          { type: "mrkdwn", text: `*Original Assignee:*\n${assignee}` },
          { type: "mrkdwn", text: `*Priority:*\n${priority}` },
          { type: "mrkdwn", text: `*Time:*\n${format(new Date(), 'MMM d, yyyy h:mm a')}` },
        ],
      },
      { type: "divider" },
    ];

    fetch(`https://corsproxy.io/?${encodeURIComponent('https://slack.com/api/chat.postMessage')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userProfile.slack_token}`,
      },
      body: JSON.stringify({ channel: channelId, blocks }),
    }).catch(err => console.error('Slack notification error:', err));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('Error deleting task:', error);
  };

  const addNote = async (note: Omit<Note, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('notes')
      .insert(note)
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return;
    }
    return data.id;
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const { error } = await supabase.from('notes').update(updates).eq('id', id);
    if (error) console.error('Error updating note:', error);
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) console.error('Error deleting note:', error);
  };

  return (
    <DataContext.Provider value={{ tasks, notes, users, addTask, updateTask, deleteTask, addNote, updateNote, deleteNote, showToast }}>
      {children}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg font-medium flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}
    </DataContext.Provider>
  );
};
