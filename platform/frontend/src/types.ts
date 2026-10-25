export type Page = 'overview' | 'chat' | 'learning' | 'memory' | 'skills' | 'integrations' | 'security' | 'activity';
export type MemoryCategory = 'Preference' | 'Goal' | 'Profile' | 'Learning' | 'Project';
export type AgentStatus = 'idle' | 'thinking' | 'retrieving_memory' | 'using_skill' | 'calling_tool' | 'awaiting_permission' | 'blocked' | 'complete';
export type PermissionState = 'pending' | 'approved' | 'denied';

export interface MemoryItem { id: string; category: MemoryCategory; text: string; updated_at: string }
export interface Skill { id: string; name: string; purpose: string; instructions: string; workflow: string; tools: string[]; permissions: string[]; enabled: boolean; executions: number; version: number; history?: { version: number; instructions: string; changed_at: string; reason: string }[]; evolution?: { id: string; proposed_change: string } | null }
export interface Integration { id: string; name: string; description: string; connected: boolean; provider: string }
export interface Approval { id: string; tool: string; action: string; detail: string; state: PermissionState; created_at: string; expires_at?: string; payload?: { title: string; start: string; end: string; timezone: string }; conflicts?: Array<string | {id?: string; title?: string; start?: string; end?: string}> }
export interface Activity { id: string; type: 'memory' | 'skill' | 'tool' | 'security' | 'chat' | 'learning'; title: string; detail: string; status: 'success' | 'blocked' | 'pending' | 'info'; created_at: string }
export interface Message { id: string; role: 'user' | 'assistant'; content: string; time: string; badge?: string }
export interface Permission { id: string; enabled: boolean; description: string }
export interface MockEvent { id: string; title: string; start: string; end: string; timezone: string; mock: boolean }
export interface Profile { display_name: string; profession: string; tagline: string; learning_focus: string[]; attempts?: number; successes?: number; assisted_successes?: number; mistakes?: number; hint_requests?: number; strengths?: string[]; weak_topics?: string[]; difficulty?: string }
export interface ChatResponse { response: string; route?: string; status?: AgentStatus; conversation_id?: string; approval?: Approval; memories?: MemoryItem[]; activities?: Activity[] }
export interface InitialData { memories: MemoryItem[]; skills: Skill[]; integrations: Integration[]; approvals: Approval[]; activities: Activity[]; profile: Profile; permissions: Permission[]; events: MockEvent[] }

export interface Health { ok: boolean; mode: string; model: string; model_evidence?: { status: string; configured: boolean; nvidia_model_requested: boolean; evidence: null | { requested_model: string; returned_model: string; verified_at: string; latency_ms: number; input_tokens: number; output_tokens: number }; note: string } }
export interface Insight { id: string; title: string; detail: string; target: 'learning' | 'skills' | 'security' | 'memory' }
export interface LearningProblem { id: string; title: string; topic: string; prompt: string; unit: string; difficulty: string; recommended?: boolean }
export interface LearningSession { id: string; problem_id: string; problem: LearningProblem; level: number; hint: string; feedback: string; solved: boolean; solution_shown: boolean; solution?: string; attempts: { answer: string; correct: boolean; feedback: string; created_at: string }[]; created_at: string }
export type CalendarProposal = { title: string; start: string; end: string; timezone: 'Asia/Kolkata' };
