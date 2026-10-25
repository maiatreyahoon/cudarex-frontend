import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Activity as ActivityIcon, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, BrainCircuit,
  CalendarDays, Check, CheckCheck, CheckCircle2, ChevronRight, CircleAlert,
  Clock3, Code2, Command, Database, Edit3, Fingerprint, Github, GraduationCap, HardDrive,
  History, Home, KeyRound, Layers3, Lightbulb, LockKeyhole, Mail, Menu, MessageCircle,
  MoreHorizontal, Plus, Search, Send, Shield, ShieldAlert, ShieldCheck, Sparkles,
  Trash2, WandSparkles, X, Zap
} from 'lucide-react';
import type { Activity, AgentStatus, Approval, InitialData, MemoryCategory, MemoryItem, Message, Page, Skill, Health, Insight, LearningProblem, LearningSession, CalendarProposal } from './types';
const firstMessages: Message[] = [{ id: 'welcome', role: 'assistant', content: 'I’m AURA in CUDAREX. I can remember your preferences, guide practice, and route enabled skills. External integrations are mocks, and every local calendar event requires approval. What would you like to work on?', time: 'Now', badge: 'Your workspace assistant' }];
import { api } from './lib/api';

type IconType = typeof Home;
type Toast = { message: string; type: 'success' | 'error' | 'info' } | null;
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const timeLabel = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const toTime = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const cx = (...classes: Array<string | false | undefined | null>) => classes.filter(Boolean).join(' ');

const nav: { label: string; page: Page; icon: IconType; group: 'workspace' | 'intelligence' | 'control' }[] = [
  { label: 'Overview', page: 'overview', icon: Home, group: 'workspace' },
  { label: 'Chat with AURA', page: 'chat', icon: MessageCircle, group: 'workspace' },
  { label: 'Learning Studio', page: 'learning', icon: GraduationCap, group: 'workspace' },
  { label: 'Memory Centre', page: 'memory', icon: BrainCircuit, group: 'intelligence' },
  { label: 'Skills Centre', page: 'skills', icon: Layers3, group: 'intelligence' },
  { label: 'Integrations', page: 'integrations', icon: Zap, group: 'control' },
  { label: 'Security Centre', page: 'security', icon: ShieldCheck, group: 'control' },
  { label: 'Activity Centre', page: 'activity', icon: History, group: 'control' }
];
const pageTitles: Record<Page, { title: string; eyebrow: string; description: string }> = {
  overview: { title: 'CUDAREX Dashboard', eyebrow: 'YOUR WORKSPACE', description: 'AURA and your workspace, together in one place.' },
  chat: { title: 'Chat with AURA', eyebrow: 'YOUR AI ASSISTANT', description: 'Talk to AURA about learning, skills and approved actions.' },
  learning: { title: 'Learning Studio', eyebrow: 'LEARN WITH AURA', description: 'Build understanding with AURA, one hint at a time.' },
  memory: { title: 'AURA Memory Centre', eyebrow: 'PERSONALIZATION', description: 'You control what AURA remembers in CUDAREX.' },
  skills: { title: 'AURA Skills Centre', eyebrow: 'EXTENSIBILITY', description: 'Create, refine and manage how AURA works.' },
  integrations: { title: 'Integrations', eyebrow: 'CONNECTED APPS', description: 'Connect apps for AURA to use, with your authorization.' },
  security: { title: 'CUDAREX Security Centre', eyebrow: 'YOUR CONTROL', description: 'Review permissions before AURA can act.' },
  activity: { title: 'Activity Centre', eyebrow: 'TRANSPARENCY', description: 'A clear record of AURA’s decisions and actions.' }
};
const statusCopy: Record<AgentStatus, string> = {
  idle: 'Ready to assist', thinking: 'Thinking', retrieving_memory: 'Retrieving memory',
  using_skill: 'Using a skill', calling_tool: 'Calling a tool', awaiting_permission: 'Awaiting permission',
  blocked: 'Action blocked', complete: 'Task completed'
};
const activityIcons: Record<Activity['type'], IconType> = {
  memory: BrainCircuit, skill: Layers3, tool: Zap, security: ShieldCheck, chat: MessageCircle, learning: GraduationCap
};
const memoryCategories: MemoryCategory[] = ['Preference', 'Goal', 'Profile', 'Learning', 'Project'];
const integrationIcons: Record<string, IconType> = { gmail: Mail, 'google-calendar': CalendarDays, 'google-drive': HardDrive, github: Github };

function Button({ children, onClick, variant = 'primary', disabled, icon: Icon, type = 'button', className = '' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean;
  icon?: IconType; type?: 'button' | 'submit'; className?: string
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={cx('btn', `btn-${variant}`, className)}>
    {Icon && <Icon size={16} strokeWidth={2} />}{children}
  </button>;
}
function IconTile({ icon: Icon, tone = 'violet', size = 'normal' }: { icon: IconType; tone?: string; size?: 'normal' | 'large' }) {
  return <span className={cx('icon-tile', `tone-${tone}`, size === 'large' && 'icon-tile-lg')}><Icon size={size === 'large' ? 23 : 18} /></span>;
}
function StatusDot({ kind }: { kind: 'success' | 'blocked' | 'pending' | 'info' }) {
  return <span className={cx('tiny-status', `status-${kind}`)} />;
}
function EmptyState({ icon: Icon, title, description }: { icon: IconType; title: string; description: string }) {
  return <div className="empty-state"><Icon size={30} /><h3>{title}</h3><p>{description}</p></div>;
}
function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={19}/></button></div>
      {children}
    </section>
  </div>;
}
function KpiCard({ icon: Icon, title, value, footer, tone }: { icon: IconType; title: string; value: string | number; footer: string; tone: string }) {
  return <div className="panel kpi-card"><div className="kpi-top"><span>{title}</span><IconTile icon={Icon} tone={tone}/></div><strong>{value}</strong><div className="kpi-foot"><span className="small-pulse" />{footer}</div></div>;
}
function ActivityRow({ activity }: { activity: Activity }) {
  const Icon = activityIcons[activity.type];
  return <div className="timeline-item"><div className={cx('timeline-icon', `timeline-${activity.status}`)}><Icon size={17}/></div>
    <div className="timeline-copy"><div className="timeline-row"><strong>{activity.title}</strong><span className="timeline-time">{timeLabel(activity.created_at)}</span></div>
      <p>{activity.detail}</p><div className="timeline-state"><StatusDot kind={activity.status}/>{activity.status === 'info' ? 'Information' : activity.status === 'success' ? 'Completed' : activity.status === 'blocked' ? 'Blocked' : 'Pending'}</div>
    </div></div>;
}

export default function App() {
  const [page, setPage] = useState<Page>('overview');
  const [data, setData] = useState<InitialData>({ profile: { display_name: 'User', profession: 'Not loaded', tagline: '', learning_focus: [] }, memories: [], skills: [], integrations: [], approvals: [], activities: [], permissions: [], events: [] });
  const [health, setHealth] = useState<Health | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [messages, setMessages] = useState<Message[]>(firstMessages);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [toast, setToast] = useState<Toast>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [memoryFilter, setMemoryFilter] = useState('All');
  const [memorySearch, setMemorySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('All');
  const [memoryEdit, setMemoryEdit] = useState<MemoryItem | 'new' | null>(null);
  const [skillEdit, setSkillEdit] = useState<Skill | 'new' | null>(null);
  const [evolutionBusy, setEvolutionBusy] = useState(false);
  const [feedbackSkill, setFeedbackSkill] = useState<Skill | null>(null);
  const evolutionLock = useRef(false);
  const [integrationBusy, setIntegrationBusy] = useState<string | null>(null);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState(Date.now());
  const messageEnd = useRef<HTMLDivElement>(null);
  const isExpired = (approval: Approval) => !!approval.expires_at && new Date(approval.expires_at).getTime() <= clockTick;

  useEffect(() => {
    let mounted = true;
    let generation = 0;
    const refresh = () => {
      const current = ++generation;
      Promise.all([api.initialize(), api.health(), api.insights()]).then(([live, service, suggestions]) => {
        if (mounted && current === generation) { setData(live); setHealth(service); setInsights(suggestions); setError(null); }
      }).catch((e: Error) => { if (mounted) setError(`Cannot reach backend. Use START-CUDAREX.command or the Mac guide. ${e.message}`); });
    };
    refresh(); window.addEventListener('cudarex:changed', refresh);
    const timer = window.setInterval(() => setClockTick(Date.now()), 15000);
    return () => { mounted = false; window.clearInterval(timer); window.removeEventListener('cudarex:changed', refresh); };
  }, []);
  useEffect(() => { if (page === 'chat') messageEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, page]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);
  const notify = (message: string, type: NonNullable<Toast>['type'] = 'info') => setToast({ message, type });
  const go = (p: Page) => { setPage(p); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' });
    if (p === 'activity') void api.getActivity().then(activities => setData(prev => ({ ...prev, activities }))).catch((e: Error) => notify(e.message, 'error'));
  };
  async function saveMemory(category: MemoryCategory, text: string, id?: string) {
    try { await (id ? api.updateMemory(id, { category, text }) : api.createMemory({ category, text })); setMemoryEdit(null); notify('Memory saved.', 'success'); }
    catch (e) { notify((e as Error).message, 'error'); }
  }
  async function deleteMemory(memory: MemoryItem) {
    if (!window.confirm('Delete this memory? This cannot be undone.')) return;
    try { await api.deleteMemory(memory.id); notify('Memory deleted.', 'success'); } catch (e) { notify((e as Error).message, 'error'); }
  }
  async function saveSkill(payload: Omit<Skill, 'id' | 'executions' | 'version' | 'evolution'>, id?: string) {
    try { await (id ? api.updateSkill(id, payload) : api.createSkill(payload)); setSkillEdit(null); notify('Skill saved.', 'success'); }
    catch (e) { notify((e as Error).message, 'error'); }
  }
  async function updateSkill(id: string, changes: Partial<Skill>) {
    try { await api.updateSkill(id, changes); } catch (e) { notify((e as Error).message, 'error'); }
  }
  async function deleteSkill(skill: Skill) {
    if (!window.confirm(`Delete ${skill.name}?`)) return;
    try { await api.deleteSkill(skill.id); notify('Skill deleted.', 'success'); } catch (e) { notify((e as Error).message, 'error'); }
  }
  async function suggestEvolution(skill: Skill, feedback: string) {
    if (!feedback.trim()) return;
    try { await api.suggestEvolution(skill.id, feedback.trim()); setFeedbackSkill(null); window.scrollTo({ top: 0, behavior: 'smooth' }); notify('Suggestion ready. Instructions stay unchanged until approval.'); }
    catch (e) { notify((e as Error).message, 'error'); }
  }
  async function respondEvolution(skill: Skill, approved: boolean) {
    if (!skill.evolution || evolutionLock.current) return;
    evolutionLock.current = true; setEvolutionBusy(true);
    try { await api.evolveSkill(skill.id, skill.evolution.id, approved); notify(approved ? 'Approved improvement applied.' : 'Suggestion rejected. Instructions unchanged.', 'success'); }
    catch (e) { notify((e as Error).message, 'error'); } finally { evolutionLock.current = false; setEvolutionBusy(false); }
  }
  async function decideApproval(approval: Approval, approved: boolean) {
    if (decisionBusy) return;
    setDecisionBusy(approval.id);
    try { await api.decideApproval(approval.id, approved); setStatus(approved ? 'complete' : 'blocked'); notify(approved ? 'Approved: local mock event recorded. Your real calendar is unchanged.' : 'Action denied. No event created.', 'success'); }
    catch (e) { notify((e as Error).message, 'error'); } finally { setDecisionBusy(null); }
  }
  async function toggleIntegration(id: string, connected: boolean) {
    setIntegrationBusy(id);
    try { await (connected ? api.disconnectIntegration(id) : api.connectIntegration(id)); notify(connected ? 'Mock disabled.' : 'Mock enabled. No OAuth or account access.', 'success'); }
    catch (e) { notify((e as Error).message, 'error'); } finally { setIntegrationBusy(null); }
  }
  async function sendMessage(value = chatInput) {
    const text = value.trim(); if (!text || loading) return;
    setChatInput(''); setPage('chat'); setStatus('thinking'); setLoading(true);
    setMessages(prev => [...prev, { id: makeId(), role: 'user', content: text, time: toTime() }]);
    try { const result = await api.chat(text, conversationId); setConversationId(result.conversation_id || conversationId);
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: result.response, time: toTime(), badge: `${statusCopy[result.status || 'complete']} · ${result.route || 'assistant'}` }]);
      setStatus(result.status || 'complete');
    } catch (e) { setStatus('blocked'); setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: `Request failed. ${(e as Error).message}`, time: toTime(), badge: 'Connection error' }]); }
    finally { setLoading(false); }
  }
  const avatarInitials = data.profile.display_name.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase();
  const pending = data.approvals.filter((a) => a.state === 'pending');
  const evolutions = data.skills.filter((s) => s.evolution);
  const selectedMemories = data.memories.filter((m) => (memoryFilter === 'All' || m.category === memoryFilter) && `${m.text} ${m.category}`.toLowerCase().includes(memorySearch.toLowerCase()));
  const selectedActivities = data.activities.filter((a) => activityFilter === 'All' || a.type === activityFilter.toLowerCase());

  return <div className="app-shell">
    {sidebarOpen && <div className="mobile-scrim" onClick={() => setSidebarOpen(false)} />}
    <aside className={cx('sidebar', sidebarOpen && 'sidebar-open')}>
      <button className="brand" onClick={() => go('overview')} aria-label="CUDAREX Dashboard"><div className="brand-mark"><Command size={25} strokeWidth={2.3}/></div><div className="brand-name">CUDA<span>REX</span><small>POWERED BY AURA</small></div></button>
      <div className="sidebar-space">
        {(['workspace', 'intelligence', 'control'] as const).map((group) => <div className="nav-group" key={group}>
          <div className="nav-group-label">{group === 'workspace' ? 'WORKSPACE' : group === 'intelligence' ? 'INTELLIGENCE' : 'CONTROL & TRUST'}</div>
          {nav.filter((item) => item.group === group).map(({ label, page: target, icon: Icon }) =>
            <button key={target} className={cx('nav-link', page === target && 'active')} onClick={() => go(target)} aria-current={page === target ? 'page' : undefined}>
              <Icon size={18} strokeWidth={1.9}/><span>{label}</span>{target === 'security' && pending.length > 0 && <span className="nav-count">{pending.length}</span>}
            </button>)}
        </div>)}
      </div>
      <div className="sidebar-bottom"><div className="system-card"><div className="system-top"><span className="green-led" />SYSTEM STATUS</div><strong>{error ? 'Connection issue' : health ? 'Local backend connected' : 'Connecting…'}</strong><span>{error ? 'Check the Mac launcher' : health?.model === 'deterministic-demo' ? 'No-key mode · Mock tools' : health?.model === 'nebius-verified' ? 'AI call verified · Mock tools' : health ? 'AI configured · Test pending' : 'Checking model settings'}</span></div>
        <button className="profile-card" onClick={() => go('memory')}><div className="avatar">{avatarInitials}</div><div><strong>{data.profile.display_name}</strong><span>{data.profile.profession}</span></div><MoreHorizontal size={17}/></button>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={21}/></button><span className="breadcrumb">Workspace</span><ChevronRight size={15}/><strong>{pageTitles[page].title}</strong></div>
        <div className="topbar-right"><span className="env-tag"><span className={cx('green-led', error && 'led-red')}/>LOCAL MVP · MOCK TOOLS</span><button className="top-icon" title="Pending approvals" aria-label="Go to pending approvals" onClick={() => go('security')}><Bell size={19}/>{pending.length > 0 && <i/>}</button><button className="avatar avatar-small" onClick={() => go('memory')} title="My profile">{avatarInitials}</button></div>
      </header>
      <main className={cx('content', page === 'chat' && 'chat-content')}>
        {error && <div className="error-banner"><CircleAlert size={18}/>{error}<button onClick={() => setError(null)} aria-label="Dismiss"><X size={15}/></button></div>}
        {<div className="demo-strip"><Sparkles size={15}/><span><strong>Local hackathon MVP</strong> — persistent data, deterministic demo or optional Nebius text. All integrations are mocks. No real email or calendar access.</span><button onClick={() => go('integrations')}>Mock integrations <ArrowRight size={14}/></button></div>}
        {page !== 'chat' && <div className="page-heading"><div><div className="eyebrow">{pageTitles[page].eyebrow}</div><h1>{pageTitles[page].title}<span className="heading-period">.</span></h1><p>{pageTitles[page].description}</p></div>
          {page === 'memory' && <Button icon={Plus} onClick={() => setMemoryEdit('new')}>Add memory</Button>}
          {page === 'skills' && <Button icon={Plus} onClick={() => setSkillEdit('new')}>Create skill</Button>}
          {page === 'activity' && <Button variant="secondary" icon={ArrowDownLeft} onClick={() => {
            const contents = JSON.stringify(data.activities, null, 2);
            const blob = new Blob([contents], { type: 'application/json' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'cudarex-activity.json'; a.click(); URL.revokeObjectURL(url);
          }}>Export log</Button>}
        </div>}

        {page === 'overview' && <>
          <section className="panel padded progress-panel"><h3>AI connection & runtime evidence</h3><p>{health?.model === 'nebius-verified' ? 'A model request succeeded. The details below describe the last successful call.' : health?.model === 'nebius-configured-unverified' ? 'AI is configured. A successful live generation still needs verification.' : 'No AI key configured. Local practice, memory, skills, approvals and calendar export work without one.'}</p>
          {health?.model_evidence?.evidence && <p>Requested model: {health.model_evidence.evidence.requested_model}<br/>Returned model: {health.model_evidence.evidence.returned_model}<br/>Last successful call: {timeLabel(health.model_evidence.evidence.verified_at)} · {health.model_evidence.evidence.latency_ms} ms</p>}
          <p className="muted-small">Account integrations remain mocks. Generated text cannot approve or execute tools.</p></section>
          {!!insights.length && <section className="panel insight-panel"><div className="section-title"><div><h3><Lightbulb size={18}/> Suggested next steps</h3><p>Based on your local profile, skills and pending decisions</p></div></div><div className="insight-grid">{insights.map(insight => <button key={insight.id} onClick={() => go(insight.target)}><strong>{insight.title}</strong><span>{insight.detail}</span><ArrowRight size={17}/></button>)}</div></section>}
          <section className="welcome-hero"><div className="hero-glow"/><div className="hero-content"><div className="hero-kicker"><Sparkles size={15}/> MEET AURA · YOUR AI ASSISTANT</div><h2>Meet AURA.<br/><span>Stay in control.</span></h2><p>Powered by CUDAREX, AURA remembers your preferences, helps you learn, and uses skills and apps with your approval.</p><div className="hero-actions"><Button icon={MessageCircle} onClick={() => go('chat')}>Start a conversation <ArrowRight size={16}/></Button><Button variant="secondary" icon={ShieldCheck} onClick={() => go('security')}>Review permissions</Button></div></div><div className="hero-orb" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orb-core"><Command size={61} strokeWidth={1.25}/></div><span className="orb-label orb-label-one"><BrainCircuit size={13}/> Memory</span><span className="orb-label orb-label-two"><Zap size={13}/> Skills</span><span className="orb-label orb-label-three"><Shield size={13}/> Secure</span></div></section>
          <section className="kpi-grid"><KpiCard icon={BrainCircuit} title="Stored memories" value={data.memories.length} footer="Under your control" tone="violet"/><KpiCard icon={Layers3} title="Active skills" value={data.skills.filter(s => s.enabled).length} footer="Ready to assist" tone="blue"/><KpiCard icon={Zap} title="Enabled mock apps" value={data.integrations.filter(i => i.connected).length} footer="Simulation switches only" tone="green"/><KpiCard icon={ShieldAlert} title="Awaiting approval" value={pending.length} footer={pending.length ? 'Needs your decision' : 'All clear'} tone="amber"/></section>
          <div className="overview-grid"><section className="panel overview-panel"><div className="section-title"><div><h3><span className="title-icon"><Zap size={17}/></span>Quick actions</h3><p>Pick up where you left off</p></div></div><div className="quick-grid">
              <button className="quick-action" onClick={() => go('learning')}><IconTile icon={GraduationCap} tone="blue"/><strong>Study with AURA</strong><span>Work through a concept</span><ArrowUpRight size={15}/></button>
              <button className="quick-action" onClick={() => setSkillEdit('new')}><IconTile icon={WandSparkles} tone="violet"/><strong>Create a skill</strong><span>Define your workflow</span><ArrowUpRight size={15}/></button>
              <button className="quick-action" onClick={() => setMemoryEdit('new')}><IconTile icon={BrainCircuit} tone="green"/><strong>Save a memory</strong><span>Personalize AURA</span><ArrowUpRight size={15}/></button>
              <button className="quick-action" onClick={() => go('integrations')}><IconTile icon={Layers3} tone="amber"/><strong>Connect an app</strong><span>Explore integrations</span><ArrowUpRight size={15}/></button>
            </div></section>
            <section className="panel overview-panel"><div className="section-title"><div><h3><span className="title-icon"><ShieldCheck size={17}/></span>Approval inbox</h3><p>Sensitive actions require your go-ahead</p></div><button className="text-link" onClick={() => go('security')}>View all <ArrowRight size={15}/></button></div>
              {pending.length ? <><div className="approval-preview"><div className="approval-preview-top"><IconTile icon={CalendarDays} tone="amber"/><span className="pending-label"><span className="amber-led"/> ACTION REQUEST</span></div><strong>{pending[0].action}</strong><p>{pending[0].detail}</p>{isExpired(pending[0]) && <p className="approval-expired">Expired. Deny this request and create a new one.</p>}<div className="inline-actions"><Button onClick={() => void decideApproval(pending[0], true)} disabled={!!decisionBusy || isExpired(pending[0])} icon={Check}>Approve</Button><Button variant="secondary" onClick={() => void decideApproval(pending[0], false)} disabled={!!decisionBusy} icon={X}>Deny</Button></div></div>{pending.length > 1 && <div className="muted-small">+{pending.length - 1} more request(s) need review</div>}</> : <EmptyState icon={ShieldCheck} title="All clear" description="No actions are awaiting your approval."/>}
            </section></div>
          <div className="overview-grid second-row"><section className="panel overview-panel"><div className="section-title"><div><h3><span className="title-icon"><History size={17}/></span>Recent activity</h3><p>Transparency at every step</p></div><button className="text-link" onClick={() => go('activity')}>View activity <ArrowRight size={15}/></button></div><div className="timeline-list small-timeline">{data.activities.slice(0, 4).map(a => <ActivityRow key={a.id} activity={a}/>)}</div></section>
            <section className="panel overview-panel"><div className="section-title"><div><h3><span className="title-icon"><BrainCircuit size={17}/></span>What AURA remembers</h3><p>Context that makes assistance personal</p></div><button className="text-link" onClick={() => go('memory')}>Manage <ArrowRight size={15}/></button></div><div className="mini-memory-list">{data.memories.slice(0, 3).map(m => <div key={m.id} className="mini-memory"><span className="mini-memory-dot"/><div><span className="chip">{m.category}</span><p>{m.text}</p></div></div>)}{data.memories.length === 0 && <EmptyState icon={Database} title="No memories yet" description="Add your first memory to personalize assistance."/>}</div></section></div>
        </>}

        {page === 'chat' && <section className="chat-panel panel"><div className="chat-header"><div className="chat-agent-logo"><Sparkles size={24}/></div><div><strong>AURA <span className="chat-agent-subtitle">· CUDAREX AI assistant</span></strong><p><span className="green-led"/>{statusCopy[status]} </p></div><div className="chat-header-spacer"/><button className="icon-btn" title="Clear conversation" onClick={() => { setMessages(firstMessages); setConversationId(undefined); setStatus('idle'); notify('Conversation cleared.'); }}><History size={18}/></button></div>
          <div className="messages-area"><div className="conversation-date">TODAY · YOUR PRIVATE WORKSPACE</div>{messages.map(m => <div key={m.id} className={cx('message-row', m.role === 'user' && 'from-user')}>
            {m.role === 'assistant' && <span className="chat-message-avatar" aria-label="AURA"><Sparkles size={17}/></span>}<div className="message-body">{m.badge && <div className="message-badge"><Sparkles size={12}/>{m.badge}</div>}<div className={cx('bubble', m.role === 'user' ? 'user-bubble' : 'ai-bubble')}>{m.content}</div><div className="message-time">{m.time}{m.role === 'user' && <CheckCheck size={13}/>}</div></div>
          </div>)}{loading && <div className="message-row"><span className="chat-message-avatar" aria-label="AURA"><Sparkles size={17}/></span><div className="typing-bubble"><span/><span/><span/></div></div>}<div ref={messageEnd}/></div>
          <div className="chat-composer-wrap"><div className="prompt-chips">{['Give me a physics hint', 'Remember my preference', 'Schedule study time'].map((s, i) => <button key={s} onClick={() => void sendMessage(i === 0 ? 'Help me study Newton’s laws with hints' : i === 1 ? 'Remember I prefer examples in explanations' : 'Schedule a physics study session tomorrow at 5 PM')} disabled={loading}><Sparkles size={13}/>{s}</button>)}</div><form className="chat-compose" onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}><textarea aria-label="Message AURA" placeholder="Ask anything, use a skill, or plan an action..." value={chatInput} rows={2} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} /><button className="send-btn" type="submit" disabled={!chatInput.trim() || loading} aria-label="Send message"><Send size={19}/></button></form><div className="chat-disclaimer"><LockKeyhole size={13}/> Permission required for sensitive actions. Backend validates every action. Text responses do not execute tools.</div></div>
        </section>}

        {page === 'learning' && <><PracticeStudio onError={message => notify(message, 'error')}/><ProfileEditor profile={data.profile} onSave={async payload => {
          try { await api.updateProfile(payload); notify('Profile saved.', 'success'); }
          catch (e) { notify((e as Error).message, 'error'); }
        }}/><section className="panel padded progress-panel"><h3>Capability profile · practice evidence</h3>
          <p>{data.profile.attempts || 0} attempts · {data.profile.successes || 0} solved before reveal · {data.profile.assisted_successes || 0} assisted · {data.profile.mistakes || 0} incorrect attempts · {data.profile.hint_requests || 0} hints</p>
          <p>Practice level: {data.profile.difficulty || 'Foundation'}</p>
          <p>Strengths: {data.profile.strengths?.join(', ') || 'No evidence yet'}</p>
          <p>Revisit: {data.profile.weak_topics?.join(', ') || 'No gaps recorded yet'}</p>
        </section><div className="learning-banner panel"><div><div className="eyebrow">GROW AT YOUR OWN PACE</div><h2>Learn by doing,<br/><span>not just by reading.</span></h2><p>Progressive hints help you reach your own answer. Your learning profile can adapt as you improve.</p><Button onClick={() => void sendMessage('Help me study Newton’s laws with hints')} icon={MessageCircle}>Start guided session <ArrowRight size={16}/></Button></div><div className="learning-symbol"><GraduationCap size={83} strokeWidth={1}/></div></div>
          <div className="learning-grid"><section className="panel padded"><div className="section-title"><div><h3>How guided learning works</h3><p>One step at a time</p></div></div><div className="hint-steps">{[{ t: '01', name: 'Your attempt', desc: 'Try solving the problem your way.' }, { t: '02', name: 'Progressive hints', desc: 'Ask for increasingly specific guidance.' }, { t: '03', name: 'Targeted feedback', desc: 'Understand errors and improve.' }, { t: '04', name: 'Learning update', desc: 'Keep track of what to revisit.' }].map((step, i) => <div className="hint-step" key={step.t}><div className="step-index">{step.t}</div><div><strong>{step.name}</strong><p>{step.desc}</p></div>{i < 3 && <div className="step-line"/>}</div>)}</div></section>
          <section className="panel padded"><div className="section-title"><div><h3>Your learning focus</h3><p>Topics from your capability profile</p></div></div><div className="focus-list">{data.profile.learning_focus.map((focus, i) => <div className="focus-row" key={focus}><IconTile icon={i === 0 ? BookOpen : i === 1 ? Code2 : BrainCircuit} tone={i === 0 ? 'blue' : i === 1 ? 'violet' : 'green'}/><strong>{focus}</strong><span>Learning focus</span></div>)}</div><div className="learn-note"><Lightbulb size={18}/><span>This profile records practice in the curated problem bank. It is a learning aid, not a validated assessment.</span></div></section></div>
        </>}

        {page === 'memory' && <><div className="info-banner"><IconTile icon={LockKeyhole} tone="green"/><div><strong>Your memory. Your rules.</strong><p>Every saved detail is visible and editable. Deleting a memory removes its active SQLite record. The audit does not store memory text. SQLite disk remnants and your own exports are not securely erased.</p></div></div><div className="toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search your memories..." value={memorySearch} onChange={(e) => setMemorySearch(e.target.value)}/></div><div className="filter-row">{['All', ...memoryCategories].map((item) => <button key={item} className={cx('filter-chip', memoryFilter === item && 'selected')} onClick={() => setMemoryFilter(item)}>{item}</button>)}</div></div>
            <div className="memory-grid">{selectedMemories.map((m) => <article className="panel memory-card" key={m.id}><div className="memory-card-top"><span className={cx('category-tag', `cat-${m.category.toLowerCase()}`)}>{m.category}</span><div className="item-actions"><button title="Edit memory" aria-label={`Edit ${m.category} memory`} onClick={() => setMemoryEdit(m)}><Edit3 size={16}/></button><button title="Delete memory" aria-label={`Delete ${m.category} memory`} onClick={() => void deleteMemory(m)}><Trash2 size={16}/></button></div></div><p>{m.text}</p><div className="card-meta"><Clock3 size={13}/>Updated {timeLabel(m.updated_at)}</div></article>)}
            {selectedMemories.length === 0 && <div className="span-full"><EmptyState icon={BrainCircuit} title="No matching memories" description="Try a different filter or add a new memory."/></div>}</div>
        </>}

        {page === 'skills' && <><div className="skills-summary"><div className="skills-summary-symbol"><Layers3 size={25}/></div><div><strong>Build your own capabilities</strong><p>Skills are reusable instructions and workflows. Evolution changes always need your explicit approval.</p></div><div className="summary-counter"><strong>{data.skills.filter(s => s.enabled).length}</strong><span>active skills</span></div></div>
          <section className="panel evolution-section" aria-labelledby="evolution-title">
            <h2 id="evolution-title"><WandSparkles size={22}/> Skill Evolution</h2>
            <p>AURA suggests improvements. Review the current instructions and proposed addition before choosing Approve or Reject. Only approval changes the skill.</p>
            <p className="muted-small">Suggestions use a feedback rule. Only approval updates instructions; stale decisions are rejected.</p>
            {!evolutions.length && <EmptyState icon={WandSparkles} title="No suggestions waiting" description='Choose “Suggest improvement” on a skill below and share your feedback.'/>}
            {evolutions.map(evolution => <article className="evolution-card" key={evolution.evolution!.id}>
              <div className="evolution-copy"><span className="eyebrow">AWAITING YOUR APPROVAL</span><h3>{evolution.name}</h3>
                <span className="version-tag">v{evolution.version} → v{evolution.version + 1}</span>
                <h4>Current instructions</h4><pre className="instruction-preview">{evolution.instructions}</pre>
                <h4>Proposed addition</h4><p>{evolution.evolution!.proposed_change}</p>
                <div className="inline-actions"><Button icon={Check} disabled={evolutionBusy} onClick={() => void respondEvolution(evolution, true)}>Approve change</Button><Button variant="secondary" disabled={evolutionBusy} onClick={() => void respondEvolution(evolution, false)}>Reject suggestion</Button></div>
              </div>
            </article>)}
          </section>
          <div className="skills-grid">{data.skills.map(skill => <article className="panel skill-card" key={skill.id}><div className="skill-card-heading"><IconTile icon={skill.name.includes('Physics') ? BookOpen : skill.name.includes('Code') ? Code2 : skill.name.includes('Research') ? Search : GraduationCap} tone={skill.enabled ? 'violet' : 'muted'} size="large"/><div className="item-actions"><button title="Edit skill" aria-label={`Edit ${skill.name}`} onClick={() => setSkillEdit(skill)}><Edit3 size={16}/></button><button title="Delete skill" aria-label={`Delete ${skill.name}`} onClick={() => void deleteSkill(skill)}><Trash2 size={16}/></button></div></div><h3>{skill.name}</h3><p>{skill.purpose}</p><details className="skill-details"><summary>View skill details</summary><h4>Instructions</h4><pre className="instruction-preview">{skill.instructions}</pre><p>Workflow: {skill.workflow || 'None'}</p><p>Tools: {skill.tools.join(', ') || 'None'}</p><p>Permissions: {skill.permissions.join(', ') || 'None'}</p>{!!skill.history?.length && <><h4>Previous instructions</h4>{skill.history.map(entry => <div key={entry.version}><p>v{entry.version} · {entry.reason} · {timeLabel(entry.changed_at)}</p><pre className="instruction-preview">{entry.instructions}</pre></div>)}</>}</details>{<Button variant="secondary" disabled={!!skill.evolution} onClick={() => setFeedbackSkill(skill)}>{skill.evolution ? 'Suggestion awaiting review' : 'Suggest improvement'}</Button>}<div className="skill-chips"><span className="chip">v{skill.version}.0</span><span className="chip">{skill.executions} runs</span>{skill.evolution && <span className="chip chip-violet">Update suggested</span>}</div><div className="skill-bottom"><span className={skill.enabled ? 'enabled-label' : 'disabled-label'}><span className={cx('small-pulse', !skill.enabled && 'pulse-muted')}/>{skill.enabled ? 'Enabled' : 'Disabled'}</span><label className="toggle"><input type="checkbox" checked={skill.enabled} onChange={(e) => void updateSkill(skill.id, { enabled: e.target.checked })} aria-label={`${skill.enabled ? 'Disable' : 'Enable'} ${skill.name}`}/><span/></label></div></article>)}</div>
        </>}

        {page === 'integrations' && <><div className="info-banner"><IconTile icon={KeyRound} tone="blue"/><div><strong>Only connect what you trust.</strong><p>All connections below are mock switches. They do not open OAuth, request credentials, or access accounts. Only the calendar has a local action adapter.</p></div></div><div className="integration-grid">{data.integrations.map(i => { const Icon = integrationIcons[i.id] || Zap; return <article className="panel integration-card" key={i.id}><div className="integration-top"><div className="integration-logo"><Icon size={25}/></div><span className={cx('connection-badge', i.connected ? 'connected' : 'disconnected')}><span className={cx('tiny-status', i.connected ? 'status-success' : 'status-info')}/>{i.connected ? 'Mock enabled' : 'Mock disabled'}</span></div><h3>{i.name}</h3><p>{i.description}</p><div className="integration-bottom"><span><LockKeyhole size={13}/> Simulation only</span><Button variant={i.connected ? 'secondary' : 'primary'} onClick={() => void toggleIntegration(i.id, i.connected)} disabled={integrationBusy === i.id}>{i.connected ? 'Disable mock' : 'Enable mock'} {!i.connected && <ArrowUpRight size={15}/>}</Button></div></article>; })}</div>
            <div className="integrations-note"><ShieldCheck size={19}/><div><strong>Designed for least-privilege access</strong><p>Real OAuth and external service adapters are not implemented. Gmail, Drive and GitHub show simulation state only. The mock calendar stores events locally after approval.</p></div></div>
        </>}

        {page === 'security' && <><CalendarEditor enabled={!!data.integrations.find(i => i.id === 'google-calendar')?.connected && !!data.permissions.find(p => p.id === 'calendar.create')?.enabled} onCreated={() => { notify('Proposal saved. Review it below before approval.'); }} onError={message => notify(message, 'error')}/><section className="panel padded progress-panel"><h3>Server permissions</h3>
          {data.permissions.map(permission => <div className="permission-setting" key={permission.id}><div><strong>{permission.id}</strong><p>{permission.description}</p></div>
            <label className="toggle"><input type="checkbox" checked={permission.enabled} aria-label={`Toggle ${permission.id}`} onChange={async e => {
              try { await api.setPermission(permission.id, e.target.checked); }
              catch (error) { notify((error as Error).message, 'error'); }
            }}/><span/></label></div>)}
          <h3>Local mock calendar · {data.events.length} event(s)</h3>
          {data.events.length ? data.events.map(event => <div className="mock-event-row" key={event.id}><p><strong>{event.title}</strong><br/>{event.start} → {event.end}<br/>{event.timezone} · MOCK ONLY</p><a className="btn btn-secondary" href={api.eventDownload(event.id)} download>Download calendar file</a><small>Import manually into your calendar if you choose. Downloading does not create an external event.</small></div>) : <p>No events created. Approval is required for every event.</p>}
        </section><div className="security-banner"><div className="security-icon"><ShieldCheck size={31}/></div><div><span className="eyebrow">PERMISSION FIREWALL</span><h2>You're in control of every action.</h2><p>AURA requests permission first. CUDAREX’s backend enforces authorization before any tool action.</p></div><span className="security-safe"><CheckCircle2 size={15}/> Approval-first design</span></div>
          <div className="security-grid"><section className="panel padded"><div className="section-title"><div><h3>Permission requests <span className="title-counter">{pending.length}</span></h3><p>Review sensitive actions before they're performed</p></div></div><div className="approval-list">{pending.length ? pending.map(request => <div className="permission-card" key={request.id}><div className="permission-header"><IconTile icon={request.tool.includes('Calendar') ? CalendarDays : Mail} tone="amber"/><div><span className="eyebrow">AWAITING YOUR APPROVAL</span><h4>{request.action}</h4><span>{request.tool}</span></div></div><p>{request.detail}</p>{request.expires_at && <p className={isExpired(request) ? 'approval-expired' : 'muted-small'}>{isExpired(request) ? 'Expired. Deny this request and prepare another.' : `Expires ${timeLabel(request.expires_at)}`}</p>}{!!request.conflicts?.length && <p className="approval-expired">Schedule conflict: {request.conflicts.map(c => typeof c === 'string' ? c : c.title || 'Existing event').join(', ')}. Review the time before approving.</p>}<div className="permission-actions"><Button icon={Check} onClick={() => void decideApproval(request, true)} disabled={!!decisionBusy || isExpired(request)}>Approve</Button><Button variant="secondary" icon={X} onClick={() => void decideApproval(request, false)} disabled={decisionBusy === request.id}>Deny</Button></div></div>) : <EmptyState icon={ShieldCheck} title="Nothing to approve" description="New sensitive actions will appear here before execution."/>}</div></section>
            <section className="panel padded"><div className="section-title"><div><h3>How protection works</h3><p>Permission is checked on the server</p></div></div><div className="security-steps"><div><span className="security-step-icon"><Search size={17}/></span><div><strong>01 · Action requested</strong><p>The agent selects the action it needs.</p></div></div><div><span className="security-step-icon"><Shield size={17}/></span><div><strong>02 · Firewall checks</strong><p>Server checks connection, scope, expiry and decision state. This is a single-user local app; there is no login.</p></div></div><div><span className="security-step-icon"><Fingerprint size={17}/></span><div><strong>03 · Your decision</strong><p>You approve or deny sensitive actions.</p></div></div><div><span className="security-step-icon"><History size={17}/></span><div><strong>04 · Logged outcome</strong><p>Only permitted actions can proceed.</p></div></div></div><div className="security-footer"><LockKeyhole size={16}/> Frontend approval alone never bypasses backend checks.</div></section></div>
          <section className="panel padded permission-history"><div className="section-title"><div><h3>Decision history</h3><p>Previously reviewed permission requests</p></div></div>{data.approvals.filter(a => a.state !== 'pending').length ? data.approvals.filter(a => a.state !== 'pending').map(a => <div key={a.id} className="history-line"><div><strong>{a.action}</strong><p>{a.tool} · {a.detail}</p></div><span className={cx('history-state', a.state === 'approved' ? 'approved' : 'denied')}>{a.state === 'approved' ? <Check size={14}/> : <X size={14}/>} {a.state === 'approved' ? 'Approved' : 'Denied'}</span></div>) : <p className="muted-small">No requests reviewed yet.</p>}</section>
        </>}

        {page === 'activity' && <><div className="activity-intro"><div><IconTile icon={History} tone="violet" size="large"/><div><strong>Complete activity visibility</strong><p>Understand the decisions behind every action.</p></div></div><div className="activity-total">{data.activities.length} events recorded</div></div><div className="toolbar"><div className="filter-row">{['All', 'Memory', 'Skill', 'Tool', 'Security', 'Chat', 'Learning'].map(item => <button className={cx('filter-chip', activityFilter === item && 'selected')} key={item} onClick={() => setActivityFilter(item)}>{item}</button>)}</div></div><section className="panel activity-panel"><div className="activity-date-heading">EVENT TIMELINE <span>{selectedActivities.length} RESULTS</span></div><div className="timeline-list full-timeline">{selectedActivities.map(a => <ActivityRow key={a.id} activity={a}/>)}{selectedActivities.length === 0 && <EmptyState icon={ActivityIcon} title="No events here" description="Activity will show up as you work with AURA in CUDAREX."/>}</div></section></>}
      </main>
    </div>

    {toast && <div className={cx('toast', `toast-${toast.type}`)} role="status">{toast.type === 'success' ? <CheckCircle2 size={17}/> : toast.type === 'error' ? <CircleAlert size={17}/> : <Sparkles size={17}/>}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={15}/></button></div>}
    {feedbackSkill && <FeedbackEditor skill={feedbackSkill} onClose={() => setFeedbackSkill(null)} onSave={feedback => void suggestEvolution(feedbackSkill, feedback)}/>}
    {memoryEdit && <MemoryEditor original={memoryEdit === 'new' ? undefined : memoryEdit} onClose={() => setMemoryEdit(null)} onSave={(category, text) => void saveMemory(category, text, typeof memoryEdit === 'string' ? undefined : memoryEdit.id)}/>}
    {skillEdit && <SkillEditor original={skillEdit === 'new' ? undefined : skillEdit} onClose={() => setSkillEdit(null)} onSave={(payload) => void saveSkill(payload, typeof skillEdit === 'string' ? undefined : skillEdit.id)}/>}
  </div>;
}

function MemoryEditor({ original, onClose, onSave }: { original?: MemoryItem; onClose: () => void; onSave: (category: MemoryCategory, text: string) => void }) {
  const [category, setCategory] = useState<MemoryCategory>(original?.category || 'Preference');
  const [text, setText] = useState(original?.text || '');
  return <Modal title={original ? 'Edit memory' : 'Add a memory'} subtitle="The details you choose to keep, always editable." onClose={onClose}><form className="editor-form" onSubmit={(e: FormEvent) => { e.preventDefault(); if (text.trim()) onSave(category, text.trim()); }}><label>Memory category<select value={category} onChange={(e) => setCategory(e.target.value as MemoryCategory)}>{memoryCategories.map(c => <option key={c}>{c}</option>)}</select></label><label>What should AURA remember?<textarea rows={5} maxLength={1000} placeholder="For example: I prefer short answers with examples." value={text} onChange={(e) => setText(e.target.value)} required/></label><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Check} type="submit" disabled={!text.trim()}>Save memory</Button></div></form></Modal>;
}
function SkillEditor({ original, onClose, onSave }: { original?: Skill; onClose: () => void; onSave: (payload: Omit<Skill, 'id' | 'executions' | 'version' | 'evolution'>) => void }) {
  const [name, setName] = useState(original?.name || '');
  const [purpose, setPurpose] = useState(original?.purpose || '');
  const [instructions, setInstructions] = useState(original?.instructions || '');
  const [workflow, setWorkflow] = useState(original?.workflow || '');
  const [tools, setTools] = useState(original?.tools.join(', ') || '');
  const [permissions, setPermissions] = useState(original?.permissions.join(', ') || '');
  return <Modal title={original ? 'Edit skill' : 'Create a skill'} subtitle="Define a reusable capability with explicit tools and permissions." onClose={onClose}><form className="editor-form" onSubmit={(e: FormEvent) => { e.preventDefault(); if (name.trim() && purpose.trim() && instructions.trim()) onSave({ name: name.trim(), purpose: purpose.trim(), instructions: instructions.trim(), workflow: workflow.trim(), tools: tools.split(',').map(s => s.trim()).filter(Boolean), permissions: permissions.split(',').map(s => s.trim()).filter(Boolean), enabled: original?.enabled ?? true }); }}><div className="form-two"><label>Skill name<input maxLength={80} placeholder="e.g. Project Planner" value={name} onChange={e => setName(e.target.value)} required/></label><label>Workflow<input placeholder="Plan → execute → review" value={workflow} onChange={e => setWorkflow(e.target.value)}/></label></div><label>Purpose<input maxLength={240} placeholder="What problem does it solve?" value={purpose} onChange={e => setPurpose(e.target.value)} required/></label><label>Instructions<textarea rows={4} maxLength={4000} placeholder="Tell the agent how this skill should behave..." value={instructions} onChange={e => setInstructions(e.target.value)} required/></label><div className="form-two"><label>Required tools (comma-separated)<input placeholder="web_search, calendar" value={tools} onChange={e => setTools(e.target.value)}/></label><label>Permissions (comma-separated)<input placeholder="read_public" value={permissions} onChange={e => setPermissions(e.target.value)}/></label></div><div className="skill-permission-note"><Shield size={15}/> Listing a tool here does not grant authorization. Security checks are enforced by the backend.</div><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Check} type="submit" disabled={!name.trim() || !purpose.trim() || !instructions.trim()}>Save skill</Button></div></form></Modal>;
}

function ProfileEditor({ profile, onSave }: { profile: InitialData['profile']; onSave: (value: Pick<InitialData['profile'], 'display_name' | 'profession' | 'tagline' | 'learning_focus'>) => Promise<void> }) {
  const [name, setName] = useState(profile.display_name);
  const [role, setRole] = useState(profile.profession);
  const [focus, setFocus] = useState(profile.learning_focus.join(', '));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setName(profile.display_name); setRole(profile.profession); setFocus(profile.learning_focus.join(', ')); }, [profile]);
  return <section className="panel padded progress-panel"><h3>Your role & learning preferences</h3><form className="editor-form" onSubmit={async e => {
    e.preventDefault(); setSaving(true);
    try { await onSave({ display_name: name, profession: role, tagline: profile.tagline, learning_focus: focus.split(',').map(v => v.trim()).filter(Boolean) }); }
    finally { setSaving(false); }
  }}><div className="form-two"><label>Name<input value={name} onChange={e => setName(e.target.value)} maxLength={80} required/></label>
    <label>Profession<select value={role} onChange={e => setRole(e.target.value)}>{['Student','Developer','Researcher','Teacher','Office professional'].map(r => <option key={r}>{r}</option>)}</select></label></div>
    <label>Learning focus (comma-separated)<input value={focus} onChange={e => setFocus(e.target.value)}/></label><Button type="submit" disabled={saving || !name.trim()}>Save profile</Button></form></section>;
}

function FeedbackEditor({ skill, onClose, onSave }: { skill: Skill; onClose: () => void; onSave: (value: string) => void }) {
  const [feedback, setFeedback] = useState('');
  return <Modal title={`Improve ${skill.name}`} subtitle="Feedback creates a proposal. Your skill changes only when you approve it." onClose={onClose}>
    <form className="editor-form" onSubmit={e => { e.preventDefault(); onSave(feedback); }}>
      <label>What should improve?<textarea rows={4} value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={1000} required placeholder="For example: the response is too long."/></label>
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!feedback.trim()}>Create suggestion</Button></div>
    </form></Modal>;
}

function PracticeStudio({ onError }: { onError: (message: string) => void }) {
  const [problems, setProblems] = useState<LearningProblem[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [selected, setSelected] = useState('');
  const [session, setSession] = useState<LearningSession | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    const refresh = () => Promise.all([api.problems(), api.learningSessions()]).then(([bank, history]) => {
      if (!mounted) return;
      setProblems(bank); setSessions(history); setError('');
      setSelected(current => current || bank.find(p => p.recommended)?.id || bank[0]?.id || '');
    }).catch((e: Error) => { if (mounted) setError(e.message); });
    void refresh(); window.addEventListener('cudarex:changed', refresh);
    return () => { mounted = false; window.removeEventListener('cudarex:changed', refresh); };
  }, []);
  async function run(action: () => Promise<LearningSession>) {
    if (busy) return;
    setBusy(true); setError('');
    try { setSession(await action()); setAnswer(''); }
    catch (e) { setError((e as Error).message); onError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="panel practice-studio" aria-labelledby="practice-title">
    <div className="section-title"><div><div className="eyebrow">ADAPTIVE PRACTICE</div><h2 id="practice-title">Try it. Get a hint. Try again.</h2><p>A curated problem bank with checked numerical answers. No AI key required.</p></div><IconTile icon={GraduationCap} tone="blue" size="large"/></div>
    {error && <p className="approval-expired" role="alert">{error}</p>}
    <form className="practice-picker" onSubmit={e => { e.preventDefault(); void run(() => api.startPractice(selected)); }}>
      <label>Choose a practice problem<select value={selected} onChange={e => setSelected(e.target.value)} disabled={busy || !problems.length}>{problems.map(problem => <option key={problem.id} value={problem.id}>{problem.recommended ? 'Recommended: ' : ''}{problem.title} · {problem.difficulty}</option>)}</select></label>
      <Button type="submit" disabled={busy || !selected} icon={Plus}>Start practice</Button>
    </form>
    {session ? <div className="practice-workspace">
      <div className="practice-topic"><span className="chip">{session.problem.topic}</span><span className="chip">{session.problem.difficulty}</span><span className={cx('chip', session.solved && 'chip-violet')}>{session.solved ? 'Solved' : session.solution_shown ? 'Solution reviewed' : 'In progress'}</span></div>
      <h3>{session.problem.title}</h3><p className="problem-prompt">{session.problem.prompt}</p>
      {session.hint && <div className="practice-hint"><Lightbulb size={20}/><div><strong>{session.level ? `Hint ${session.level} of 3` : 'Your starting point'}</strong><p>{session.hint}</p></div></div>}
      <form className="practice-answer" onSubmit={e => { e.preventDefault(); void run(() => api.practiceAttempt(session.id, answer)); }}>
        <label>Your numerical answer {session.problem.unit && <span>({session.problem.unit})</span>}<input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Enter a number, optionally with the shown unit" maxLength={120} disabled={busy || session.solved} required/></label>
        <Button type="submit" disabled={busy || session.solved || !answer.trim()} icon={Check}>Check answer</Button>
      </form>
      <div className="inline-actions"><Button variant="secondary" icon={Lightbulb} disabled={busy || session.solved || session.solution_shown || session.level >= 3} onClick={() => void run(() => api.practiceHint(session.id))}>Next hint</Button><Button variant="ghost" icon={BookOpen} disabled={busy || session.solution_shown} onClick={() => void run(() => api.practiceSolution(session.id))}>Show solution</Button></div>
      {session.feedback && <div className={cx('practice-feedback', session.solved && 'feedback-correct')} role="status"><CheckCircle2 size={20}/><p>{session.feedback}</p></div>}
      {session.solution && (session.solution_shown || session.solved) && <div className="practice-solution"><h4>Worked solution</h4><p>{session.solution}</p></div>}
      {session.solution_shown && <p className="muted-small">Reviewing a solution helps you learn. A later answer to this session does not count as independent mastery.</p>}
      {!!session.attempts.length && <details className="practice-attempts"><summary>{session.attempts.length} saved attempt(s)</summary>{session.attempts.map((attempt, index) => <div key={`${index}-${attempt.created_at}`}><strong>{attempt.correct ? 'Correct' : 'Revisit'}: {attempt.answer}</strong><p>{attempt.feedback}</p></div>)}</details>}
    </div> : <div className="practice-start"><BookOpen size={25}/><p>Choose a problem and start. AURA tracks your hints and attempts locally, and suggests topics to revisit.</p></div>}
    {!!sessions.length && <details className="practice-history"><summary>Resume a saved session ({sessions.length})</summary><div>{sessions.map(saved => <button key={saved.id} disabled={busy} onClick={() => void run(() => api.getPractice(saved.id))}><strong>{saved.problem?.title || saved.problem_id}</strong><span>{saved.solved ? 'Solved' : saved.solution_shown ? 'Reviewed' : 'In progress'} · {timeLabel(saved.created_at)}</span><ArrowRight size={15}/></button>)}</div></details>}
    <div className="learn-note"><Shield size={17}/><span>Practice evaluates the problems in this bank. For an open-ended explanation, use Chat and “Ask AI:” with optional Nebius configuration.</span></div>
  </section>;
}

function CalendarEditor({ enabled, onCreated, onError }: { enabled: boolean; onCreated: () => void; onError: (message: string) => void }) {
  const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(Date.now() + 86400000));
  const dateValue = (type: string) => dateParts.find(part => part.type === type)?.value || '';
  const tomorrow = `${dateValue('year')}-${dateValue('month')}-${dateValue('day')}`;
  const [title, setTitle] = useState('Physics study session');
  const [start, setStart] = useState(`${tomorrow}T17:00`);
  const [end, setEnd] = useState(`${tomorrow}T18:00`);
  const [busy, setBusy] = useState(false);
  return <section className="panel padded progress-panel"><div className="section-title"><div><div className="eyebrow">CALENDAR PROPOSAL</div><h3>Plan study time, then review it</h3><p>Creates a proposal only. Approval creates a local mock event.</p></div><IconTile icon={CalendarDays} tone="amber"/></div>
    <form className="editor-form" onSubmit={async e => {
      e.preventDefault(); if (busy) return;
      if (end <= start) { onError('End time must be after start time.'); return; }
      setBusy(true);
      const proposal: CalendarProposal = { title: title.trim(), start: `${start}:00+05:30`, end: `${end}:00+05:30`, timezone: 'Asia/Kolkata' };
      try { await api.proposeCalendar(proposal); onCreated(); } catch (error) { onError((error as Error).message); } finally { setBusy(false); }
    }}><label>Event title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required/></label>
      <div className="form-two"><label>Start time<input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required/></label><label>End time<input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required/></label></div>
      <p className="muted-small">All times use Asia/Kolkata (UTC+05:30). Nothing is added to a real account.</p>
      {!enabled && <p className="approval-expired">Enable the Google Calendar mock in Integrations and calendar.create below to request a proposal.</p>}
      <div><Button type="submit" disabled={busy || !enabled || !title.trim()} icon={ShieldCheck}>{busy ? 'Preparing…' : 'Request approval'}</Button></div>
    </form>
  </section>;
}
