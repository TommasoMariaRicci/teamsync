import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const SettingsView: React.FC = () => {
  const { userProfile, updateUserProfile } = useAuth();

  const [hubspotToken, setHubspotToken] = useState('');
  const [hubspotEnabled, setHubspotEnabled] = useState(false);
  const [slackToken, setSlackToken] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackChannelId, setSlackChannelId] = useState('C0AMKG3RTL1');

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (userProfile) {
      setHubspotToken(userProfile.hubspot_token || '');
      setHubspotEnabled(userProfile.hubspot_enabled || false);
      setSlackToken(userProfile.slack_token || '');
      setSlackEnabled(userProfile.slack_enabled || false);
      if (userProfile.slack_completed_channel_id) {
        setSlackChannelId(userProfile.slack_completed_channel_id);
      }
    }
  }, [userProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await updateUserProfile({
        hubspot_token: hubspotToken,
        hubspot_enabled: hubspotEnabled,
        slack_token: slackToken,
        slack_enabled: slackEnabled,
        slack_completed_channel_id: slackChannelId,
      });
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-600" />
            Integrations
          </h1>
          <p className="text-zinc-500 mt-2">Connect TeamSync with your favorite tools.</p>
        </div>
        <div className="flex items-center gap-4">
          {saveMessage && (
            <span className={`text-sm font-medium ${saveMessage.includes('Failed') ? 'text-red-500' : 'text-emerald-600'}`}>
              {saveMessage}
            </span>
          )}
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#ff7a59] rounded-xl flex items-center justify-center text-white font-bold text-xl">H</div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">HubSpot</h3>
                <p className="text-sm text-zinc-500">Sync contacts and deals with your tasks.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={hubspotEnabled} onChange={(e) => setHubspotEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-sm font-medium text-zinc-900">Enable</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Private App Token</label>
              <div className="flex gap-2">
                <input type="text" value={hubspotToken} onChange={(e) => setHubspotToken(e.target.value)} placeholder="pat-na1-..." className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://api.hubapi.com/crm/v3/objects/contacts?limit=1')}`, {
                        headers: { 'Authorization': `Bearer ${hubspotToken}` }
                      });
                      if (res.ok) alert('HubSpot connection successful!');
                      else alert('HubSpot connection failed.');
                    } catch { alert('HubSpot connection failed.'); }
                  }}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg font-medium transition-colors"
                >Test</button>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Create a Private App in HubSpot with crm.objects.contacts.read and crm.objects.tasks.write scopes.</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#4A154B] rounded-xl flex items-center justify-center text-white font-bold text-xl">S</div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Slack</h3>
                <p className="text-sm text-zinc-500">Get notifications for task updates and new notes.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={slackEnabled} onChange={(e) => setSlackEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-sm font-medium text-zinc-900">Enable</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Bot User OAuth Token</label>
              <div className="flex gap-2">
                <input type="text" value={slackToken} onChange={(e) => setSlackToken(e.target.value)} placeholder="xoxb-..." className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://slack.com/api/auth.test')}`, {
                        method: 'POST', headers: { 'Authorization': `Bearer ${slackToken}` }
                      });
                      const data = await res.json();
                      if (data.ok) alert('Slack connection successful!');
                      else alert('Slack connection failed: ' + (data.error || 'Unknown error'));
                    } catch { alert('Slack connection failed.'); }
                  }}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg font-medium transition-colors"
                >Test</button>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Create a Slack App with users:read.email, chat:write, and im:write scopes.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Completed Tasks Channel ID</label>
              <input type="text" value={slackChannelId} onChange={(e) => setSlackChannelId(e.target.value)} placeholder="C0AMKG3RTL1" className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <p className="text-xs text-zinc-500 mt-1">The ID of the channel where completed task notifications will be sent.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
