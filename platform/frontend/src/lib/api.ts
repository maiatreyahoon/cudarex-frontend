import type { Activity, Approval, ChatResponse, InitialData, Integration, MemoryItem, Profile, Skill, Health, Insight, LearningProblem, LearningSession, CalendarProposal } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'omit',
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Cudarex-Client': 'local-ui', ...options?.headers }
  });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const error = JSON.parse(body) as { detail?: unknown };
      if (typeof error.detail === 'string') message = error.detail;
      else if (Array.isArray(error.detail)) message = error.detail.map((entry: { msg?: string }) => entry.msg || 'Check the form values.').join(' ');
    } catch { /* Keep the readable server response if it is not JSON. */ }
    throw new Error(message.slice(0, 300) || 'The request could not be completed.');
  }
  const result = await response.json() as T;
  if (options?.method && options.method !== 'GET') window.dispatchEvent(new Event('cudarex:changed'));
  return result;
}
const json = (value: unknown): RequestInit => ({ body: JSON.stringify(value), method: 'POST' });

export const api = {
  async initialize(): Promise<InitialData> {
    const [profile, memories, skills, integrations, approvals, activities, permissions, events] = await Promise.all([
      request<Profile>('/profile'), request<MemoryItem[]>('/memories'), request<Skill[]>('/skills'),
      request<Integration[]>('/integrations'), request<Approval[]>('/approvals'), request<Activity[]>('/activity'), request<InitialData['permissions']>('/permissions'), request<InitialData['events']>('/events')
    ]);
    return { profile, memories, skills, integrations, approvals, activities, permissions, events };
  },
  chat: (message: string, conversation_id?: string) => request<ChatResponse>('/chat', { ...json({ message, conversation_id }) }),
  createMemory: (data: Pick<MemoryItem, 'category' | 'text'>) => request<MemoryItem>('/memories', json(data)),
  updateMemory: (id: string, data: Pick<MemoryItem, 'category' | 'text'>) => request<MemoryItem>(`/memories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMemory: (id: string) => request<{ ok: boolean }>(`/memories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createSkill: (data: Omit<Skill, 'id' | 'executions' | 'version' | 'evolution'>) => request<Skill>('/skills', json(data)),
  updateSkill: (id: string, changes: Partial<Skill>) => request<Skill>(`/skills/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  deleteSkill: (id: string) => request<{ ok: boolean }>(`/skills/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  evolveSkill: (id: string, evolutionId: string, approved: boolean) => request<Skill>(`/skills/${encodeURIComponent(id)}/evolution/respond`, json({ evolution_id: evolutionId, approved })),
  connectIntegration: (id: string) => request<Integration>(`/integrations/${encodeURIComponent(id)}/connect`, json({})),
  disconnectIntegration: (id: string) => request<Integration>(`/integrations/${encodeURIComponent(id)}/disconnect`, json({})),
  decideApproval: (id: string, approved: boolean) => request<Approval>(`/approvals/${encodeURIComponent(id)}/decision`, json({ approved })),
  updateProfile: (data: Pick<Profile, 'display_name' | 'profession' | 'tagline' | 'learning_focus'>) => request<Profile>('/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  setPermission: (id: string, enabled: boolean) => request(`/permissions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  suggestEvolution: (id: string, feedback: string) => request<Skill>(`/skills/${encodeURIComponent(id)}/feedback`, json({ feedback })),
  health: () => request<Health>('/health'),
  insights: () => request<Insight[]>('/insights'),
  problems: () => request<LearningProblem[]>('/learning/problems'),
  learningSessions: () => request<LearningSession[]>('/learning/sessions'),
  startPractice: (problem_id: string) => request<LearningSession>('/learning/sessions', json({ problem_id })),
  getPractice: (id: string) => request<LearningSession>(`/learning/sessions/${encodeURIComponent(id)}`),
  practiceHint: (id: string) => request<LearningSession>(`/learning/sessions/${encodeURIComponent(id)}/hint`, json({})),
  practiceAttempt: (id: string, answer: string) => request<LearningSession>(`/learning/sessions/${encodeURIComponent(id)}/attempt`, json({ answer })),
  practiceSolution: (id: string) => request<LearningSession>(`/learning/sessions/${encodeURIComponent(id)}/solution`, json({})),
  proposeCalendar: (data: CalendarProposal) => request<Approval>('/calendar/proposals', json(data)),
  eventDownload: (id: string) => `${BASE}/events/${encodeURIComponent(id)}/ics`,
  getActivity: () => request<Activity[]>('/activity')
};
