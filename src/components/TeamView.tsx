import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { UserPlus, Mail, Shield, User as UserIcon, Trash2, Edit2, X } from 'lucide-react';
import { Profile } from '../types';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const TeamView = () => {
  const { users, showToast } = useData();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    setIsSubmitting(true);
    try {
      const tempId = crypto.randomUUID();
      const { error } = await supabase.from('profiles').insert({
        id: tempId,
        email: inviteEmail,
        display_name: inviteName,
        role: inviteRole,
      });

      if (error) throw error;

      showToast('Team member invited successfully!');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
    } catch (error) {
      console.error('Error inviting user:', error);
      showToast('Failed to invite team member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: editingUser.role })
        .eq('id', editingUser.id);

      if (error) throw error;

      showToast('Role updated successfully!');
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating role:', error);
      showToast('Failed to update role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      showToast('Team member removed.');
    } catch (error) {
      console.error('Error removing user:', error);
      showToast('Failed to remove team member.');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Team Members</h1>
          <p className="text-zinc-500 mt-1">Manage your team and their roles</p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          <UserPlus className="w-5 h-5" />
          Invite Member
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt={user.display_name || 'User'} className="w-10 h-10 rounded-full object-cover border border-zinc-200" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200">
                          {(user.display_name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-zinc-900">{user.display_name || 'Unnamed User'}</div>
                        <div className="text-sm text-zinc-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                      user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-zinc-100 text-zinc-700"
                    )}>
                      {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                      <span className="capitalize">{user.role || 'Member'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setEditingUser(user)} className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors mr-2" title="Edit Role">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRemoveMember(user.id)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Remove Member">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">No team members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setIsInviteModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-zinc-900">Invite Team Member</h2>
                <button onClick={() => setIsInviteModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleInvite} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                  <input type="text" required value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                  <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">{isSubmitting ? 'Inviting...' : 'Send Invite'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-zinc-900">Edit Role</h2>
                <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleUpdateRole} className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-zinc-600 mb-4">Updating role for <span className="font-semibold text-zinc-900">{editingUser.display_name || editingUser.email}</span></p>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
                  <select value={editingUser.role || 'member'} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'member' })} className="w-full px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
