export type Page = 'overview' | 'chat' | 'learning' | 'memory' | 'skills' | 'integrations' | 'security' | 'activity';
export type MemoryCategory = 'Preference' | 'Goal' | 'Profile' | 'Learning' | 'Project';
export type AgentStatus = 'idle' | 'thinking' | 'retrieving_memory' | 'using_skill' | 'calling_tool' | 'awaiting_permission' | 'blocked' | 'complete';
export type PermissionState = 'pending' | 'approved' | 'denied';

export interface MemoryItem { id: string; category: MemoryCategory; text: string; updated_at: string }
export interface Skill { id: string; name: string; purpose: string; instructions: string; workflow: string; tools: string[]; permissions: string[]; enabled: boolean; executions: number; version: number; evolution?: { id: string; proposed_change: string } | null }
export interface Integration { id: string; name: string; description: string; connected: boolean; provider: string }
export interface Approval { id: string; tool: string; action: string; detail: string; state: PermissionState; created_at: string }
export interface Activity { id: string; type: 'memory' | 'skill' | 'tool' | 'security' | 'chat' | 'learning'; title: string; detail: string; status: 'success' | 'blocked' | 'pending' | 'info'; created_at: string }
export interface Message { id: string; role: 'user' | 'assistant'; content: string; time: string; badge?: string }
export interface Profile { display_name: string; profession: string; tagline: string; learning_focus: string[] }
export interface ChatResponse { response: string; status?: AgentStatus; conversation_id?: string; approval?: Approval; memories?: MemoryItem[]; activities?: Activity[] }
export interface InitialData { memories: MemoryItem[]; skills: Skill[]; integrations: Integration[]; approvals: Approval[]; activities: Activity[]; profile: Profile }
