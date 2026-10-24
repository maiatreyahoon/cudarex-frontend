import type { Activity, Approval, ChatResponse, InitialData, Integration, MemoryItem, Profile, Skill } from '../types';

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body.slice(0, 240)}`);
  }
  return response.json() as Promise<T>;
}
const json = (value: unknown): RequestInit => ({ body: JSON.stringify(value), method: 'POST' });

export const api = {
  async initialize(): Promise<InitialData> {
    const [profile, memories, skills, integrations, approvals, activities] = await Promise.all([
      request<Profile>('/profile'), request<MemoryItem[]>('/memories'), request<Skill[]>('/skills'),
      request<Integration[]>('/integrations'), request<Approval[]>('/approvals'), request<Activity[]>('/activity')
    ]);
    return { profile, memories, skills, integrations, approvals, activities };
  },
  chat: (message: string, conversation_id?: string) => request<ChatResponse>('/chat', { ...json({ message, conversation_id }) }),
  createMemory: (data: Pick<MemoryItem, 'category' | 'text'>) => request<MemoryItem>('/memories', json(data)),
  updateMemory: (id: string, data: Pick<MemoryItem, 'category' | 'text'>) => request<MemoryItem>(`/memories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMemory: (id: string) => request<{ ok: boolean }>(`/memories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createSkill: (data: Omit<Skill, 'id' | 'executions' | 'version' | 'evolution'>) => request<Skill>('/skills', json(data)),
  updateSkill: (id: string, changes: Partial<Skill>) => request<Skill>(`/skills/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  deleteSkill: (id: string) => request<{ ok: boolean }>(`/skills/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  evolveSkill: (id: string, evolutionId: string, approved: boolean) => request<Skill>(`/skills/${encodeURIComponent(id)}/evolution/respond`, json({ evolution_id: evolutionId, approved })),
  connectIntegration: (id: string) => request<{ authorization_url: string }>(`/integrations/${encodeURIComponent(id)}/connect`, json({})),
  disconnectIntegration: (id: string) => request<Integration>(`/integrations/${encodeURIComponent(id)}/disconnect`, json({})),
  decideApproval: (id: string, approved: boolean) => request<Approval>(`/approvals/${encodeURIComponent(id)}/decision`, json({ approved })),
  getActivity: () => request<Activity[]>('/activity')
};
