import React, { useState } from 'react';
import { Task } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Save, Trash2, Link as LinkIcon, File, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
  const { addTask, updateTask, deleteTask, users, showToast } = useData();
  const { currentUser, userProfile } = useAuth();

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const initialDate = task?.due_date ? new Date(task.due_date) : null;
  const [dueDate, setDueDate] = useState(initialDate ? `${initialDate.getFullYear()}-${String(initialDate.getMonth() + 1).padStart(2, '0')}-${String(initialDate.getDate()).padStart(2, '0')}` : '');
  const [dueTime, setDueTime] = useState(initialDate ? initialDate.toTimeString().substring(0, 5) : '09:00');
  const [urgency, setUrgency] = useState<Task['urgency']>(task?.urgency || 'medium');
  const [status, setStatus] = useState<Task['status']>(task?.status || 'todo');

  const [newLink, setNewLink] = useState('');
  const [links, setLinks] = useState<string[]>(task?.links || []);
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<string[]>(task?.notes || []);
  const [newDoc, setNewDoc] = useState('');
  const [documents, setDocuments] = useState<string[]>(task?.documents || []);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !currentUser) return;
    setIsSaving(true);

    try {
      let finalDueDate: string | null = null;
      if (dueDate) {
        const time = dueTime || '09:00';
        finalDueDate = new Date(`${dueDate}T${time}:00`).toISOString();
      }

      const taskData: Partial<Task> = {
        title,
        description: description || null,
        assignee_id: assigneeId || null,
        due_date: finalDueDate,
        urgency,
        status,
        links,
        notes,
        documents,
      };

      if (task) {
        await updateTask(task.id, taskData);
        showToast('Task updated successfully!');
      } else {
        const newTask = {
          ...taskData,
          creator_id: currentUser.id,
        } as Omit<Task, 'id' | 'created_at'>;
        const newId = await addTask(newTask);
        showToast('Task created successfully!');

        // Integrations (only on create)
        if (newId && userProfile) {
          const assigneeEmail = users.find(u => u.id === assigneeId)?.email;
          const finalTask = { ...newTask, id: newId, created_at: new Date().toISOString() } as Task;

          // HubSpot
          if (userProfile.hubspot_enabled && userProfile.hubspot_token) {
            sendHubSpotTask(userProfile.hubspot_token, finalTask, assigneeEmail);
          }

          // Slack DM
          if (userProfile.slack_enabled && userProfile.slack_token && assigneeEmail) {
            sendSlackDM(userProfile.slack_token, finalTask, assigneeEmail);
          }
        }
      }

      onClose();
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const sendHubSpotTask = (token: string, finalTask: Task, assigneeEmail?: string) => {
    (async () => {
      try {
        let contactId = null;
        if (assigneeEmail) {
          const searchRes = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://api.hubapi.com/crm/v3/objects/contacts/search')}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: assigneeEmail }] }] })
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.results?.length > 0) contactId = searchData.results[0].id;
          }
        }

        const taskRes = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://api.hubapi.com/crm/v3/objects/tasks')}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            properties: {
              hs_task_subject: finalTask.title,
              hs_task_body: finalTask.description || '',
              hs_task_priority: finalTask.urgency.toUpperCase(),
              hs_task_status: 'NOT_STARTED',
              hs_timestamp: finalTask.due_date ? new Date(finalTask.due_date).getTime() : Date.now()
            }
          })
        });

        if (taskRes.ok && contactId) {
          const taskData = await taskRes.json();
          await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.hubapi.com/crm/v3/objects/tasks/${taskData.id}/associations/contacts/${contactId}/204`)}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {
        console.error('HubSpot error:', e);
      }
    })();
  };

  const sendSlackDM = (token: string, finalTask: Task, assigneeEmail: string) => {
    (async () => {
      try {
        const lookupRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(assigneeEmail)}`)}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const lookupData = await lookupRes.json();
        if (!lookupData.ok) return;

        const slackUserId = lookupData.user.id;
        const dmRes = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://slack.com/api/conversations.open')}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: slackUserId })
        });
        const dmData = await dmRes.json();
        if (!dmData.ok) return;

        await fetch(`https://corsproxy.io/?${encodeURIComponent('https://slack.com/api/chat.postMessage')}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: dmData.channel.id,
            blocks: [
              { type: "header", text: { type: "plain_text", text: "New Task Assigned: " + finalTask.title, emoji: true } },
              { type: "section", text: { type: "mrkdwn", text: `*Description:*\n${finalTask.description || 'No description provided.'}\n\n*Priority:* ${finalTask.urgency}\n*Due Date:* ${finalTask.due_date ? new Date(finalTask.due_date).toLocaleDateString() : 'None'}` } }
            ]
          })
        });
      } catch (e) {
        console.error('Slack error:', e);
      }
    })();
  };

  const handleDelete = async () => {
    if (task && window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
      onClose();
    }
  };

  const addLinkItem = () => { if (newLink) { setLinks([...links, newLink]); setNewLink(''); } };
  const addNoteItem = () => { if (newNote) { setNotes([...notes, newNote]); setNewNote(''); } };
  const addDocItem = () => { if (newDoc) { setDocuments([...documents, newDoc]); setNewDoc(''); } };

  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Task title" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]" placeholder="Add details..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Assignee</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.display_name || u.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Due Date & Time</label>
              <div className="flex gap-2">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Urgency</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value as Task['urgency'])} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Task['status'])} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Attachments & Notes</h3>

            <div>
              <div className="flex gap-2 mb-2">
                <input type="url" value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="Add a link..." className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={addLinkItem} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors">Add</button>
              </div>
              <ul className="space-y-1">
                {links.map((link, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-indigo-600">
                    <LinkIcon className="w-4 h-4" />
                    <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{link}</a>
                    <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} className="ml-auto text-zinc-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex gap-2 mb-2">
                <input type="url" value={newDoc} onChange={e => setNewDoc(e.target.value)} placeholder="Add document URL (Drive, Dropbox)..." className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={addDocItem} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors">Add</button>
              </div>
              <ul className="space-y-1">
                {documents.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-indigo-600">
                    <File className="w-4 h-4" />
                    <a href={d} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{d}</a>
                    <button onClick={() => setDocuments(documents.filter((_, idx) => idx !== i))} className="ml-auto text-zinc-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex gap-2 mb-2">
                <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a quick note..." className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={addNoteItem} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors">Add</button>
              </div>
              <ul className="space-y-2">
                {notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 bg-zinc-50 p-2 rounded-lg">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                    <span className="flex-1">{note}</span>
                    <button onClick={() => setNotes(notes.filter((_, idx) => idx !== i))} className="text-zinc-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 flex justify-between items-center bg-zinc-50">
          {task ? (
            <button onClick={handleDelete} className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
              <Trash2 className="w-5 h-5" />
              Delete
            </button>
          ) : <div></div>}

          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-zinc-600 font-medium hover:bg-zinc-100 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!title.trim() || isSaving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm">
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
