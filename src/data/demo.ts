import type { InitialData, Message } from '../types';

export const demo: InitialData = {
  profile: { display_name: 'Alex Morgan', profession: 'Student & Developer', tagline: 'Building better workflows, one day at a time.', learning_focus: ['Physics', 'Python', 'System design'] },
  memories: [
    { id: 'm1', category: 'Preference', text: 'Prefers explanations with practical examples and clear steps.', updated_at: '2026-10-20T15:30:00' },
    { id: 'm2', category: 'Goal', text: 'Prepare for the upcoming physics assessment.', updated_at: '2026-10-19T10:10:00' },
    { id: 'm3', category: 'Profile', text: 'Student who is also learning software development.', updated_at: '2026-10-18T08:00:00' },
    { id: 'm4', category: 'Learning', text: 'Working on Newton’s laws and free-body diagrams.', updated_at: '2026-10-18T13:45:00' },
    { id: 'm5', category: 'Project', text: 'Developing an AI-powered study planner.', updated_at: '2026-10-17T12:00:00' }
  ],
  skills: [
    { id: 's1', name: 'Physics Tutor', purpose: 'Guide learners through physics problems using progressive hints.', instructions: 'Give a direction first, then an explanation only when requested.', workflow: 'Understand → hint → retry → feedback', tools: [], permissions: [], enabled: true, executions: 28, version: 2 },
    { id: 's2', name: 'Code Reviewer', purpose: 'Review code for readability, bugs and maintainability.', instructions: 'Prioritize actionable feedback and small code samples.', workflow: 'Read → analyze → report', tools: [], permissions: [], enabled: true, executions: 16, version: 1 },
    { id: 's3', name: 'Research Assistant', purpose: 'Summarize sources into clear, useful findings.', instructions: 'Provide detailed research summaries with citations.', workflow: 'Retrieve → verify → summarize', tools: ['web_search'], permissions: ['read_public'], enabled: true, executions: 42, version: 1, evolution: { id: 'e1', proposed_change: 'Start with a three-bullet summary, with details available on request.' } },
    { id: 's4', name: 'Interview Coach', purpose: 'Practice interviews and provide constructive feedback.', instructions: 'Use one interview question at a time.', workflow: 'Question → response → feedback', tools: [], permissions: [], enabled: false, executions: 3, version: 1 }
  ],
  integrations: [
    { id: 'google-calendar', name: 'Google Calendar', description: 'Manage schedules and avoid conflicts.', connected: false, provider: 'Google' },
    { id: 'gmail', name: 'Gmail', description: 'Summarize mail and prepare approved replies.', connected: false, provider: 'Google' },
    { id: 'google-drive', name: 'Google Drive', description: 'Search and use files you authorize.', connected: false, provider: 'Google' },
    { id: 'github', name: 'GitHub', description: 'Access project repositories and issues.', connected: false, provider: 'GitHub' }
  ],
  approvals: [
    { id: 'p1', tool: 'Google Calendar', action: 'Create study session', detail: 'Physics revision · Tomorrow at 5:00 PM · 60 minutes', state: 'pending', created_at: '2026-10-21T04:00:00' }
  ],
  activities: [
    { id: 'a1', type: 'security', title: 'Approval requested', detail: 'Calendar · Create study session', status: 'pending', created_at: '2026-10-21T04:00:00' },
    { id: 'a2', type: 'skill', title: 'Skill improvement suggested', detail: 'Research Assistant · Summarize first', status: 'info', created_at: '2026-10-20T21:30:00' },
    { id: 'a3', type: 'learning', title: 'Learning session completed', detail: 'Newton’s laws · Level 2 hints', status: 'success', created_at: '2026-10-20T17:20:00' },
    { id: 'a4', type: 'memory', title: 'Preference updated', detail: 'Learning explanation style', status: 'success', created_at: '2026-10-20T15:30:00' },
    { id: 'a5', type: 'security', title: 'Unauthorized action blocked', detail: 'Email send without approval', status: 'blocked', created_at: '2026-10-19T14:00:00' }
  ]
};

export const firstMessages: Message[] = [
  { id: 'welcome', role: 'assistant', content: 'Welcome back! I’m AURA, your AI assistant in CUDAREX. I can help you learn, organize your work, and use custom skills. I’ll ask for approval before sensitive actions. What would you like to do today?', time: 'Now', badge: 'Personalized response' }
];
