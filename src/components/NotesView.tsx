import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Note } from '../types';
import { Plus, FileText, Trash2, Edit3, X, Save } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, users } = useData();
  const { currentUser } = useAuth();
  
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const sortedNotes = [...notes].sort((a, b) => 
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  const handleCreateNew = () => {
    setSelectedNote(null);
    setTitle('');
    setContent('');
    setIsEditing(true);
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || !currentUser) return;

    if (selectedNote) {
      await updateNote(selectedNote.id, { title, content });
      setSelectedNote({ ...selectedNote, title, content });
    } else {
      const newNote: Omit<Note, 'id'> = {
        title,
        content,
        author_id: currentUser.id,
        created_at: new Date().toISOString(),
      };
      await addNote(newNote);
      // We don't have the ID immediately, so we just clear selection
      setSelectedNote(null);
    }
    setIsEditing(false);
  };

  const handleDelete = async (note: Note) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(note.id);
      if (selectedNote?.id === note.id) {
        setSelectedNote(null);
        setIsEditing(false);
      }
    }
  };

  const getAuthorName = (id: string) => {
    return users.find(u => u.id === id)?.display_name || 'Unknown';
  };

  return (
    <div className="flex h-full bg-zinc-50">
      {/* Sidebar for Notes List */}
      <div className="w-80 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Notes
          </h2>
          <button
            onClick={handleCreateNew}
            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
          {sortedNotes.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">No notes yet.</div>
          ) : (
            sortedNotes.map(note => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={clsx(
                  "p-4 cursor-pointer transition-colors hover:bg-zinc-50",
                  selectedNote?.id === note.id && "bg-indigo-50/50 border-l-4 border-indigo-600"
                )}
              >
                <h3 className="font-medium text-zinc-900 line-clamp-1">{note.title}</h3>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{note.content}</p>
                <div className="flex justify-between items-center mt-3 text-xs text-zinc-400">
                  <span>{getAuthorName(note.author_id)}</span>
                  <span>{note.created_at ? format(new Date(note.created_at), 'MMM d') : ''}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white">
        {isEditing ? (
          <div className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full">
            <div className="flex justify-between items-center mb-8">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Note Title"
                className="text-3xl font-bold text-zinc-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full placeholder:text-zinc-300"
              />
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <button onClick={handleSave} disabled={!title.trim() || !content.trim()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Start typing your note here..."
              className="flex-1 w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-zinc-700 text-lg leading-relaxed placeholder:text-zinc-300"
            />
          </div>
        ) : selectedNote ? (
          <div className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 mb-2">{selectedNote.title}</h1>
                <p className="text-sm text-zinc-500">
                  By {getAuthorName(selectedNote.author_id)} on {selectedNote.created_at ? format(new Date(selectedNote.created_at), 'MMMM d, yyyy') : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="p-2 text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600 rounded-lg transition-colors"
                  title="Edit Note"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(selectedNote)} 
                  className="p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                  title="Delete Note"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="prose prose-zinc max-w-none">
              {selectedNote.content.split('\n').map((paragraph, i) => (
                <p key={i} className="text-zinc-700 text-lg leading-relaxed mb-4">{paragraph}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-zinc-400">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a note to read or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};
