export interface Profile {
  id: string;
  display_name: string | null;
  email: string;
  photo_url: string | null;
  role: 'admin' | 'member';
  hubspot_token: string | null;
  hubspot_enabled: boolean;
  slack_token: string | null;
  slack_enabled: boolean;
  slack_completed_channel_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  creator_id: string | null;
  due_date: string | null;
  urgency: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  notes: string[];
  links: string[];
  documents: string[];
  completed_at: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  author_id: string | null;
  created_at: string;
}
