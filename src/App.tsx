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
import type { Activity, AgentStatus, Approval, InitialData, MemoryCategory, MemoryItem, Message, Page, Skill } from './types';
import { demo, firstMessages } from './data/demo';
import { api, DEMO_MODE } from './lib/api';

type IconType = typeof Home;
type Toast = { message: string; type: 'success' | 'error' | 'info' } | null;
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const nowISO = () => new Date().toISOString();
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
  const [data, setData] = useState<InitialData>(() => DEMO_MODE ? demo : {
    profile: { display_name: 'User', profession: 'Not loaded', tagline: '', learning_focus: [] },
    memories: [], skills: [], integrations: [], approvals: [], activities: []
  });
  const [messages, setMessages] = useState<Message[]>(firstMessages);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [toast, setToast] = useState<Toast>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [hintLevel, setHintLevel] = useState(0);
  const [memoryFilter, setMemoryFilter] = useState('All');
  const [memorySearch, setMemorySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('All');
  const [memoryEdit, setMemoryEdit] = useState<MemoryItem | 'new' | null>(null);
  const [skillEdit, setSkillEdit] = useState<Skill | 'new' | null>(null);
  const [evolutionBusy, setEvolutionBusy] = useState(false);
  const evolutionLock = useRef(false);
  const [integrationBusy, setIntegrationBusy] = useState<string | null>(null);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const messageEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (DEMO_MODE) return;
    let mounted = true;
    api.initialize().then((live) => { if (mounted) setData(live); })
      .catch((e: Error) => { if (mounted) setError(`Cannot reach the FastAPI backend: ${e.message}`); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (page === 'chat') messageEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, page]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (message: string, type: NonNullable<Toast>['type'] = 'info') => setToast({ message, type });
  const go = (p: Page) => {
    setPage(p); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' });
    if (p === 'activity' && !DEMO_MODE) {
      void api.getActivity().then((activities) => setData((prev) => ({ ...prev, activities })))
        .catch((e: Error) => notify(`Could not refresh activity: ${e.message}`, 'error'));
    }
  };
  const log = (type: Activity['type'], title: string, detail: string, result: Activity['status'] = 'success') => {
    const entry: Activity = { id: makeId(), type, title, detail, status: result, created_at: nowISO() };
    setData((prev) => ({ ...prev, activities: [entry, ...prev.activities] }));
  };

  async function saveMemory(category: MemoryCategory, text: string, id?: string) {
    try {
      if (!DEMO_MODE) {
        const saved = id ? await api.updateMemory(id, { category, text }) : await api.createMemory({ category, text });
        setData((prev) => ({ ...prev, memories: id ? prev.memories.map((m) => m.id === id ? saved : m) : [saved, ...prev.memories] }));
      } else {
        const saved: MemoryItem = { id: id || makeId(), category, text, updated_at: nowISO() };
        setData((prev) => ({ ...prev, memories: id ? prev.memories.map((m) => m.id === id ? saved : m) : [saved, ...prev.memories] }));
        log('memory', id ? 'Memory updated' : 'Memory added', text);
      }
      setMemoryEdit(null); notify(`Memory ${id ? 'updated' : 'created'}${DEMO_MODE ? ' in demo' : ''}.`, 'success');
    } catch (e) { notify((e as Error).message, 'error'); }
  }
  async function deleteMemory(memory: MemoryItem) {
    if (!window.confirm('Delete this memory? This cannot be undone.')) return;
    try {
      if (!DEMO_MODE) await api.deleteMemory(memory.id);
      setData((prev) => ({ ...prev, memories: prev.memories.filter((m) => m.id !== memory.id) }));
      if (DEMO_MODE) log('memory', 'Memory deleted', memory.category);
      notify('Memory deleted.', 'success');
    } catch (e) { notify((e as Error).message, 'error'); }
  }
  async function saveSkill(payload: Omit<Skill, 'id' | 'executions' | 'version' | 'evolution'>, id?: string) {
    try {
      if (!DEMO_MODE) {
        const saved = id ? await api.updateSkill(id, payload) : await api.createSkill(payload);
        setData((prev) => ({ ...prev, skills: id ? prev.skills.map((s) => s.id === id ? saved : s) : [saved, ...prev.skills] }));
      } else {
        const original = data.skills.find((s) => s.id === id);
        const saved: Skill = { ...payload, id: id || makeId(), executions: original?.executions || 0, version: original?.version || 1, evolution: original?.evolution };
        setData((prev) => ({ ...prev, skills: id ? prev.skills.map((s) => s.id === id ? saved : s) : [saved, ...prev.skills] }));
        log('skill', id ? 'Skill edited' : 'New skill created', payload.name);
      }
      setSkillEdit(null); notify('Skill saved.', 'success');
    } catch (e) { notify((e as Error).message, 'error'); }
  }
  async function updateSkill(id: string, changes: Partial<Skill>) {
    try {
      const saved = DEMO_MODE ? undefined : await api.updateSkill(id, changes);
      setData((prev) => ({ ...prev, skills: prev.skills.map((s) => s.id === id ? saved || { ...s, ...changes } : s) }));
      if (DEMO_MODE) log('skill', 'Skill status changed', `${data.skills.find(s => s.id === id)?.name} · ${changes.enabled ? 'Enabled' : 'Disabled'}`);
    } catch (e) { notify((e as Error).message, 'error'); }
  }
  async function deleteSkill(skill: Skill) {
    if (!window.confirm(`Delete ${skill.name}?`)) return;
    try {
      if (!DEMO_MODE) await api.deleteSkill(skill.id);
      setData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.id !== skill.id) }));
      if (DEMO_MODE) log('skill', 'Skill deleted', skill.name);
      notify('Skill deleted.', 'success');
    } catch (e) { notify((e as Error).message, 'error'); }
  }
  function suggestEvolution(skill: Skill) {
    if (!DEMO_MODE || skill.evolution) return;
    const proposed_change = skill.instructions.includes('Check assumptions and verify the final result before responding.')
      ? 'Ask one clarifying question when essential information is missing.'
      : 'Check assumptions and verify the final result before responding.';
    setData(prev => ({ ...prev, skills: prev.skills.map(s => s.id === skill.id && !s.evolution
      ? { ...s, evolution: { id: makeId(), proposed_change } } : s) }));
    log('skill', 'Evolution suggested (demo)', `${skill.name} · ${proposed_change} · Awaiting approval`, 'pending');
    notify('Demo suggestion ready. Review it in Skill Evolution. Nothing has changed yet.');
  }
  async function respondEvolution(skill: Skill, approved: boolean) {
    if (!skill.evolution || evolutionLock.current) return;
    if (approved && !window.confirm(`Approve this change to ${skill.name}?\n\n${skill.evolution.proposed_change}\n\nVersion ${skill.version} will become ${skill.version + 1}.`)) return;
    evolutionLock.current = true;
    setEvolutionBusy(true);
    try {
      const saved = DEMO_MODE ? undefined : await api.evolveSkill(skill.id, skill.evolution.id, approved);
      setData(prev => ({ ...prev, skills: prev.skills.map(s => s.id === skill.id && s.evolution?.id === skill.evolution!.id
        ? saved || { ...s, version: approved ? s.version + 1 : s.version, evolution: null,
          instructions: approved ? `${s.instructions}\n${skill.evolution!.proposed_change}` : s.instructions } : s) }));
      if (DEMO_MODE) log('skill', approved ? 'Evolution approved (demo)' : 'Evolution rejected (demo)',
        `${skill.name} · ${skill.evolution.proposed_change} · ${approved ? `v${skill.version} → v${skill.version + 1}` : 'Instructions and version unchanged'}`, approved ? 'success' : 'info');
      notify(approved ? 'Approved improvement applied. Open skill details to review it.' : 'Suggestion rejected. Skill unchanged.', 'success');
    } catch (e) { notify((e as Error).message, 'error'); }
    finally { evolutionLock.current = false; setEvolutionBusy(false); }
  }
  async function decideApproval(approval: Approval, approved: boolean) {
    setDecisionBusy(approval.id);
    try {
      const result = DEMO_MODE ? { ...approval, state: approved ? 'approved' as const : 'denied' as const } : await api.decideApproval(approval.id, approved);
      setData((prev) => ({ ...prev, approvals: prev.approvals.map((a) => a.id === approval.id ? result : a) }));
      if (DEMO_MODE) log('security', approved ? 'Permission approved (simulation)' : 'Permission denied (simulation)', `${approval.tool} · ${approval.action}`, approved ? 'success' : 'blocked');
      setStatus(approved ? 'complete' : 'blocked');
      notify(approved ? (DEMO_MODE ? 'Simulated approval recorded. No external action occurred.' : 'Approval sent to backend.') : 'Action denied.', approved ? 'success' : 'info');
    } catch (e) { notify((e as Error).message, 'error'); }
    finally { setDecisionBusy(null); }
  }
  async function toggleIntegration(id: string, connected: boolean) {
    if (DEMO_MODE) { notify('Demo only: real app connections require FastAPI OAuth integration.', 'info'); return; }
    setIntegrationBusy(id);
    try {
      if (connected) {
        const updated = await api.disconnectIntegration(id);
        setData((prev) => ({ ...prev, integrations: prev.integrations.map((i) => i.id === id ? updated : i) }));
        notify('Disconnected successfully.', 'success');
      } else {
        const { authorization_url } = await api.connectIntegration(id);
        const parsed = new URL(authorization_url);
        if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid OAuth redirect URL');
        window.location.assign(parsed.href);
      }
    } catch (e) { notify((e as Error).message, 'error'); }
    finally { setIntegrationBusy(null); }
  }
  async function sendMessage(value = chatInput) {
    const text = value.trim();
    if (!text || loading) return;
    setChatInput(''); setPage('chat'); setStatus('thinking'); setLoading(true);
    setMessages((prev) => [...prev, { id: makeId(), role: 'user', content: text, time: toTime() }]);
    try {
      if (!DEMO_MODE) {
        const result = await api.chat(text, conversationId);
        setConversationId(result.conversation_id || conversationId);
        setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', content: result.response, time: toTime(), badge: result.status ? statusCopy[result.status] : undefined }]);
        setStatus(result.status || 'complete');
        setData((prev) => ({ ...prev,
          approvals: result.approval ? [result.approval, ...prev.approvals.filter(a => a.id !== result.approval!.id)] : prev.approvals,
          memories: result.memories ? [...result.memories, ...prev.memories.filter(m => !result.memories!.some(incoming => incoming.id === m.id))] : prev.memories,
          activities: result.activities ? [...result.activities, ...prev.activities.filter(a => !result.activities!.some(incoming => incoming.id === a.id))] : prev.activities
        }));
      } else {
        let response = '';
        let badge = 'AURA · Demo simulation';
        let nextStatus: AgentStatus = 'complete';
        const lower = text.toLowerCase();
        if (/^(next hint|another hint|hint [23]|show solution|final answer|explain the answer)/.test(lower)) {
          const next = /solution|final answer|explain the answer/.test(lower) ? 4 : Math.min(hintLevel + 1, 4);
          setHintLevel(next);
          response = next === 1 ? 'Hint 1/3: Start by listing the forces acting on the object. Which direction is the acceleration?'
            : next === 2 ? 'Hint 2/3: Draw a free-body diagram. Identify the net force in the direction of motion.'
            : next === 3 ? 'Hint 3/3: Newton’s second law connects net force, mass and acceleration: F = ma. Substitute your known values.'
            : 'Solution approach: Draw the free-body diagram, sum the forces in each direction, use F = ma, then solve the resulting equations and check your units. Share a specific problem for a numerical walkthrough.';
          badge = 'Physics Tutor · Guided learning';
        } else if (/remember|i prefer|my goal is|i am a/.test(lower)) {
          const item: MemoryItem = { id: makeId(), category: lower.includes('goal') ? 'Goal' : lower.includes('i am') ? 'Profile' : 'Preference', text, updated_at: nowISO() };
          setData((prev) => ({ ...prev, memories: [item, ...prev.memories] }));
          log('memory', 'New memory captured (simulation)', text);
          response = 'I’ve added that to your demo memories. You can review, edit, or delete it in AURA Memory Centre anytime. In a live deployment, memory saving follows your configured preferences.';
          badge = 'Memory retrieved & updated';
        } else if (/schedule|calendar|meeting|remind/.test(lower)) {
          const approval: Approval = { id: makeId(), tool: 'Google Calendar', action: 'Create calendar event', detail: text, state: 'pending', created_at: nowISO() };
          setData((prev) => ({ ...prev, approvals: [approval, ...prev.approvals] }));
          log('security', 'Permission requested (simulation)', 'Google Calendar · Create event', 'pending');
          response = 'I can prepare a calendar event for that. Before any action, you need to review and approve the request in Security Centre. This demo never creates a real calendar event.';
          badge = 'Permission required'; nextStatus = 'awaiting_permission';
        } else if (/physics|newton|solve|hint|study/.test(lower)) {
          setHintLevel(1);
          response = 'Let’s work through this rather than jump straight to the answer.\n\nHint 1/3: What facts are given, and which physics principle might connect them? Try writing the relevant quantities first.\n\nReply “next hint” when you’re ready, or share your attempt.';
          badge = 'Physics Tutor · Hint 1 of 3';
        } else if (/skill|research|review code|code review/.test(lower)) {
          response = 'I can route this through an enabled skill. Go to AURA Skills Centre to inspect instructions, create a custom workflow, or review the pending Research Assistant improvement. In a live setup, the orchestrator selects and executes the skill.';
          badge = 'Skill selection · Demo';
          log('skill', 'Skill route suggested (simulation)', text, 'info');
        } else {
          response = 'I can help with that. Your preferences and enabled skills shape how I respond, and I’ll ask before any sensitive external action. This is a scripted frontend demonstration; connect the FastAPI backend to receive actual NVIDIA Nemotron responses.\n\nTry asking for a physics hint, saying “Remember I prefer examples”, or requesting a calendar event.';
        }
        setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', content: response, time: toTime(), badge }]);
        setStatus(nextStatus);
        log('chat', 'Demo conversation completed', text, 'info');
      }
    } catch (e) {
      setStatus('blocked');
      setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', content: `The request could not be completed. ${(e as Error).message}`, time: toTime(), badge: 'Connection error' }]);
      notify('Chat request failed.', 'error');
    } finally { setLoading(false); }
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
      <div className="sidebar-bottom"><div className="system-card"><div className="system-top"><span className="green-led" />SYSTEM STATUS</div><strong>{DEMO_MODE ? 'Demo environment' : error ? 'Connection issue' : 'Backend connected'}</strong><span>{DEMO_MODE ? 'Interactive sandbox · No real actions' : error ? 'Check FastAPI service' : 'Live API mode enabled'}</span></div>
        <button className="profile-card" onClick={() => go('memory')}><div className="avatar">{avatarInitials}</div><div><strong>{data.profile.display_name}</strong><span>{data.profile.profession}</span></div><MoreHorizontal size={17}/></button>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={21}/></button><span className="breadcrumb">Workspace</span><ChevronRight size={15}/><strong>{pageTitles[page].title}</strong></div>
        <div className="topbar-right"><span className="env-tag"><span className={cx('green-led', !DEMO_MODE && error && 'led-red')}/>{DEMO_MODE ? 'DEMO MODE' : 'LIVE MODE'}</span><button className="top-icon" title="Pending approvals" aria-label="Go to pending approvals" onClick={() => go('security')}><Bell size={19}/>{pending.length > 0 && <i/>}</button><button className="avatar avatar-small" onClick={() => go('memory')} title="My profile">{avatarInitials}</button></div>
      </header>
      <main className={cx('content', page === 'chat' && 'chat-content')}>
        {error && <div className="error-banner"><CircleAlert size={18}/>{error}<button onClick={() => setError(null)} aria-label="Dismiss"><X size={15}/></button></div>}
        {DEMO_MODE && <div className="demo-strip"><Sparkles size={15}/><span><strong>Interactive demo</strong> — sample data and simulated AI/approvals. No real email, calendar, or external actions.</span><button onClick={() => go('integrations')}>Integration guide <ArrowRight size={14}/></button></div>}
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
          <section className="welcome-hero"><div className="hero-glow"/><div className="hero-content"><div className="hero-kicker"><Sparkles size={15}/> MEET AURA · YOUR AI ASSISTANT</div><h2>Meet AURA.<br/><span>Stay in control.</span></h2><p>Powered by CUDAREX, AURA remembers your preferences, helps you learn, and uses skills and apps with your approval.</p><div className="hero-actions"><Button icon={MessageCircle} onClick={() => go('chat')}>Start a conversation <ArrowRight size={16}/></Button><Button variant="secondary" icon={ShieldCheck} onClick={() => go('security')}>Review permissions</Button></div></div><div className="hero-orb" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orb-core"><Command size={61} strokeWidth={1.25}/></div><span className="orb-label orb-label-one"><BrainCircuit size={13}/> Memory</span><span className="orb-label orb-label-two"><Zap size={13}/> Skills</span><span className="orb-label orb-label-three"><Shield size={13}/> Secure</span></div></section>
          <section className="kpi-grid"><KpiCard icon={BrainCircuit} title="Stored memories" value={data.memories.length} footer="Under your control" tone="violet"/><KpiCard icon={Layers3} title="Active skills" value={data.skills.filter(s => s.enabled).length} footer="Ready to assist" tone="blue"/><KpiCard icon={Zap} title="Connected apps" value={data.integrations.filter(i => i.connected).length} footer="Authorized integrations" tone="green"/><KpiCard icon={ShieldAlert} title="Awaiting approval" value={pending.length} footer={pending.length ? 'Needs your decision' : 'All clear'} tone="amber"/></section>
          <div className="overview-grid"><section className="panel overview-panel"><div className="section-title"><div><h3><span className="title-icon"><Zap size={17}/></span>Quick actions</h3><p>Pick up where you left off</p></div></div><div className="quick-grid">
              <button className="quick-action" onClick={() => { go('chat'); void sendMessage('Help me study Newton’s laws with hints'); }}><IconTile icon={GraduationCap} tone="blue"/><strong>Study with AURA</strong><span>Work through a concept</span><ArrowUpRight size={15}/></button>
              <button className="quick-action" onClick={() => setSkillEdit('new')}><IconTile icon={WandSparkles} tone="violet"/><strong>Create a skill</strong><span>Automate your workflow</span><ArrowUpRight size={15}/></button>
              <button className="quick-action" onClick={() => setMemoryEdit('new')}><IconTile icon={BrainCircuit} tone="green"/><strong>Save a memory</strong><span>Personalize AURA</span><ArrowUpRight size={15}/></button>
              <button className="quick-action" onClick={() => go('integrations')}><IconTile icon={Layers3} tone="amber"/><strong>Connect an app</strong><span>Explore integrations</span><ArrowUpRight size={15}/></button>
            </div></section>
            <section className="panel overview-panel"><div className="section-title"><div><h3><span className="title-icon"><ShieldCheck size={17}/></span>Approval inbox</h3><p>Sensitive actions require your go-ahead</p></div><button className="text-link" onClick={() => go('security')}>View all <ArrowRight size={15}/></button></div>
              {pending.length ? <><div className="approval-preview"><div className="approval-preview-top"><IconTile icon={CalendarDays} tone="amber"/><span className="pending-label"><span className="amber-led"/> ACTION REQUEST</span></div><strong>{pending[0].action}</strong><p>{pending[0].detail}</p><div className="inline-actions"><Button onClick={() => void decideApproval(pending[0], true)} disabled={!!decisionBusy} icon={Check}>Approve</Button><Button variant="secondary" onClick={() => void decideApproval(pending[0], false)} disabled={!!decisionBusy} icon={X}>Deny</Button></div></div>{pending.length > 1 && <div className="muted-small">+{pending.length - 1} more request(s) need review</div>}</> : <EmptyState icon={ShieldCheck} title="All clear" description="No actions are awaiting your approval."/>}
            </section></div>
          <div className="overview-grid second-row"><section className="panel overview-panel"><div className="section-title"><div><h3><span className="title-icon"><History size={17}/></span>Recent activity</h3><p>Transparency at every step</p></div><button className="text-link" onClick={() => go('activity')}>View activity <ArrowRight size={15}/></button></div><div className="timeline-list small-timeline">{data.activities.slice(0, 4).map(a => <ActivityRow key={a.id} activity={a}/>)}</div></section>
            <section className="panel overview-panel"><div className="section-title"><div><h3><span className="title-icon"><BrainCircuit size={17}/></span>What AURA remembers</h3><p>Context that makes assistance personal</p></div><button className="text-link" onClick={() => go('memory')}>Manage <ArrowRight size={15}/></button></div><div className="mini-memory-list">{data.memories.slice(0, 3).map(m => <div key={m.id} className="mini-memory"><span className="mini-memory-dot"/><div><span className="chip">{m.category}</span><p>{m.text}</p></div></div>)}{data.memories.length === 0 && <EmptyState icon={Database} title="No memories yet" description="Add your first memory to personalize assistance."/>}</div></section></div>
        </>}

        {page === 'chat' && <section className="chat-panel panel"><div className="chat-header"><div className="chat-agent-logo"><Sparkles size={24}/></div><div><strong>AURA <span className="chat-agent-subtitle">· CUDAREX AI assistant</span></strong><p><span className="green-led"/>{statusCopy[status]} {DEMO_MODE && '· Simulated AI'}</p></div><div className="chat-header-spacer"/><button className="icon-btn" title="Clear conversation" onClick={() => { setMessages(firstMessages); setHintLevel(0); setConversationId(undefined); setStatus('idle'); notify('Conversation cleared.'); }}><History size={18}/></button></div>
          <div className="messages-area"><div className="conversation-date">TODAY · YOUR PRIVATE WORKSPACE</div>{messages.map(m => <div key={m.id} className={cx('message-row', m.role === 'user' && 'from-user')}>
            {m.role === 'assistant' && <span className="chat-message-avatar" aria-label="AURA"><Sparkles size={17}/></span>}<div className="message-body">{m.badge && <div className="message-badge"><Sparkles size={12}/>{m.badge}</div>}<div className={cx('bubble', m.role === 'user' ? 'user-bubble' : 'ai-bubble')}>{m.content}</div><div className="message-time">{m.time}{m.role === 'user' && <CheckCheck size={13}/>}</div></div>
          </div>)}{loading && <div className="message-row"><span className="chat-message-avatar" aria-label="AURA"><Sparkles size={17}/></span><div className="typing-bubble"><span/><span/><span/></div></div>}<div ref={messageEnd}/></div>
          <div className="chat-composer-wrap"><div className="prompt-chips">{['Give me a physics hint', 'Remember my preference', 'Schedule study time'].map((s, i) => <button key={s} onClick={() => void sendMessage(i === 0 ? 'Help me study Newton’s laws with hints' : i === 1 ? 'Remember I prefer examples in explanations' : 'Schedule a physics study session tomorrow at 5 PM')} disabled={loading}><Sparkles size={13}/>{s}</button>)}</div><form className="chat-compose" onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}><textarea aria-label="Message AURA" placeholder="Ask anything, use a skill, or plan an action..." value={chatInput} rows={2} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} /><button className="send-btn" type="submit" disabled={!chatInput.trim() || loading} aria-label="Send message"><Send size={19}/></button></form><div className="chat-disclaimer"><LockKeyhole size={13}/> Permission required for sensitive actions. {DEMO_MODE ? 'This sandbox does not contact an AI model.' : 'Backend security checks all tool calls.'}</div></div>
        </section>}

        {page === 'learning' && <><div className="learning-banner panel"><div><div className="eyebrow">GROW AT YOUR OWN PACE</div><h2>Learn by doing,<br/><span>not just by reading.</span></h2><p>Progressive hints help you reach your own answer. Your learning profile can adapt as you improve.</p><Button onClick={() => void sendMessage('Help me study Newton’s laws with hints')} icon={MessageCircle}>Start guided session <ArrowRight size={16}/></Button></div><div className="learning-symbol"><GraduationCap size={83} strokeWidth={1}/></div></div>
          <div className="learning-grid"><section className="panel padded"><div className="section-title"><div><h3>How guided learning works</h3><p>One step at a time</p></div></div><div className="hint-steps">{[{ t: '01', name: 'Your attempt', desc: 'Try solving the problem your way.' }, { t: '02', name: 'Progressive hints', desc: 'Ask for increasingly specific guidance.' }, { t: '03', name: 'Targeted feedback', desc: 'Understand errors and improve.' }, { t: '04', name: 'Learning update', desc: 'Keep track of what to revisit.' }].map((step, i) => <div className="hint-step" key={step.t}><div className="step-index">{step.t}</div><div><strong>{step.name}</strong><p>{step.desc}</p></div>{i < 3 && <div className="step-line"/>}</div>)}</div></section>
          <section className="panel padded"><div className="section-title"><div><h3>Your learning focus</h3><p>Topics from your capability profile</p></div></div><div className="focus-list">{data.profile.learning_focus.map((focus, i) => <div className="focus-row" key={focus}><IconTile icon={i === 0 ? BookOpen : i === 1 ? Code2 : BrainCircuit} tone={i === 0 ? 'blue' : i === 1 ? 'violet' : 'green'}/><strong>{focus}</strong><span>Learning focus</span></div>)}</div><div className="learn-note"><Lightbulb size={18}/><span>Live progress insights will come from Rounak’s adaptive learning API.</span></div></section></div>
        </>}

        {page === 'memory' && <><div className="info-banner"><IconTile icon={LockKeyhole} tone="green"/><div><strong>Your memory. Your rules.</strong><p>Every saved detail is visible and editable. Deleting a memory removes it from your frontend view; in live mode the backend must also delete stored records.</p></div></div><div className="toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search your memories..." value={memorySearch} onChange={(e) => setMemorySearch(e.target.value)}/></div><div className="filter-row">{['All', ...memoryCategories].map((item) => <button key={item} className={cx('filter-chip', memoryFilter === item && 'selected')} onClick={() => setMemoryFilter(item)}>{item}</button>)}</div></div>
            <div className="memory-grid">{selectedMemories.map((m) => <article className="panel memory-card" key={m.id}><div className="memory-card-top"><span className={cx('category-tag', `cat-${m.category.toLowerCase()}`)}>{m.category}</span><div className="item-actions"><button title="Edit memory" aria-label={`Edit ${m.category} memory`} onClick={() => setMemoryEdit(m)}><Edit3 size={16}/></button><button title="Delete memory" aria-label={`Delete ${m.category} memory`} onClick={() => void deleteMemory(m)}><Trash2 size={16}/></button></div></div><p>{m.text}</p><div className="card-meta"><Clock3 size={13}/>Updated {timeLabel(m.updated_at)}</div></article>)}
            {selectedMemories.length === 0 && <div className="span-full"><EmptyState icon={BrainCircuit} title="No matching memories" description="Try a different filter or add a new memory."/></div>}</div>
        </>}

        {page === 'skills' && <><div className="skills-summary"><div className="skills-summary-symbol"><Layers3 size={25}/></div><div><strong>Build your own capabilities</strong><p>Skills are reusable instructions and workflows. Evolution changes always need your explicit approval.</p></div><div className="summary-counter"><strong>{data.skills.filter(s => s.enabled).length}</strong><span>active skills</span></div></div>
          <section className="panel evolution-section" aria-labelledby="evolution-title">
            <h2 id="evolution-title"><WandSparkles size={22}/> Skill Evolution</h2>
            <p>AURA suggests improvements. Review the current instructions and proposed addition before choosing Approve or Reject. Only approval changes the skill.</p>
            <p className="muted-small">{DEMO_MODE ? 'Demo suggestions are simulated. All demo edits and decisions last until the page is reloaded.' : 'Suggestions come from your backend. Decisions use the existing approval endpoint; server authorization still applies.'}</p>
            {!evolutions.length && <EmptyState icon={WandSparkles} title="No suggestions waiting" description={DEMO_MODE ? 'Choose “Suggest improvement” on any skill below to try the approval flow.' : 'Backend suggestions will appear here when available.'}/>}
            {evolutions.map(evolution => <article className="evolution-card" key={evolution.evolution!.id}>
              <div className="evolution-copy"><span className="eyebrow">AWAITING YOUR APPROVAL</span><h3>{evolution.name}</h3>
                <span className="version-tag">v{evolution.version} → v{evolution.version + 1}</span>
                <h4>Current instructions</h4><pre className="instruction-preview">{evolution.instructions}</pre>
                <h4>Proposed addition</h4><p>{evolution.evolution!.proposed_change}</p>
                <div className="inline-actions"><Button icon={Check} disabled={evolutionBusy} onClick={() => void respondEvolution(evolution, true)}>Approve change</Button><Button variant="secondary" disabled={evolutionBusy} onClick={() => void respondEvolution(evolution, false)}>Reject suggestion</Button></div>
              </div>
            </article>)}
          </section>
          <div className="skills-grid">{data.skills.map(skill => <article className="panel skill-card" key={skill.id}><div className="skill-card-heading"><IconTile icon={skill.name.includes('Physics') ? BookOpen : skill.name.includes('Code') ? Code2 : skill.name.includes('Research') ? Search : GraduationCap} tone={skill.enabled ? 'violet' : 'muted'} size="large"/><div className="item-actions"><button title="Edit skill" aria-label={`Edit ${skill.name}`} onClick={() => setSkillEdit(skill)}><Edit3 size={16}/></button><button title="Delete skill" aria-label={`Delete ${skill.name}`} onClick={() => void deleteSkill(skill)}><Trash2 size={16}/></button></div></div><h3>{skill.name}</h3><p>{skill.purpose}</p><details className="skill-details"><summary>View skill details</summary><h4>Instructions</h4><pre className="instruction-preview">{skill.instructions}</pre><p>Workflow: {skill.workflow || 'None'}</p><p>Tools: {skill.tools.join(', ') || 'None'}</p><p>Permissions: {skill.permissions.join(', ') || 'None'}</p></details>{DEMO_MODE && <Button variant="secondary" disabled={!!skill.evolution} onClick={() => suggestEvolution(skill)}>{skill.evolution ? 'Suggestion awaiting review' : 'Suggest improvement'}</Button>}<div className="skill-chips"><span className="chip">v{skill.version}.0</span><span className="chip">{skill.executions} runs</span>{skill.evolution && <span className="chip chip-violet">Update suggested</span>}</div><div className="skill-bottom"><span className={skill.enabled ? 'enabled-label' : 'disabled-label'}><span className={cx('small-pulse', !skill.enabled && 'pulse-muted')}/>{skill.enabled ? 'Enabled' : 'Disabled'}</span><label className="toggle"><input type="checkbox" checked={skill.enabled} onChange={(e) => void updateSkill(skill.id, { enabled: e.target.checked })} aria-label={`${skill.enabled ? 'Disable' : 'Enable'} ${skill.name}`}/><span/></label></div></article>)}</div>
        </>}

        {page === 'integrations' && <><div className="info-banner"><IconTile icon={KeyRound} tone="blue"/><div><strong>Only connect what you trust.</strong><p>AURA requests your authorization before using private app data. CUDAREX’s backend security layer must also approve sensitive actions.</p></div></div><div className="integration-grid">{data.integrations.map(i => { const Icon = integrationIcons[i.id] || Zap; return <article className="panel integration-card" key={i.id}><div className="integration-top"><div className="integration-logo"><Icon size={25}/></div><span className={cx('connection-badge', i.connected ? 'connected' : 'disconnected')}><span className={cx('tiny-status', i.connected ? 'status-success' : 'status-info')}/>{i.connected ? 'Connected' : 'Not connected'}</span></div><h3>{i.name}</h3><p>{i.description}</p><div className="integration-bottom"><span><LockKeyhole size={13}/> OAuth required</span><Button variant={i.connected ? 'secondary' : 'primary'} onClick={() => void toggleIntegration(i.id, i.connected)} disabled={integrationBusy === i.id}>{i.connected ? 'Disconnect' : 'Connect'} {!i.connected && <ArrowUpRight size={15}/>}</Button></div></article>; })}</div>
            <div className="integrations-note"><ShieldCheck size={19}/><div><strong>Designed for least-privilege access</strong><p>Real OAuth connections and token storage are implemented by Smarto and Soumil. This frontend never stores provider credentials or access tokens.</p></div></div>
        </>}

        {page === 'security' && <><div className="security-banner"><div className="security-icon"><ShieldCheck size={31}/></div><div><span className="eyebrow">PERMISSION FIREWALL</span><h2>You're in control of every action.</h2><p>AURA requests permission first. CUDAREX’s backend enforces authorization before any tool action.</p></div><span className="security-safe"><CheckCircle2 size={15}/> Approval-first design</span></div>
          <div className="security-grid"><section className="panel padded"><div className="section-title"><div><h3>Permission requests <span className="title-counter">{pending.length}</span></h3><p>Review sensitive actions before they're performed</p></div></div><div className="approval-list">{pending.length ? pending.map(request => <div className="permission-card" key={request.id}><div className="permission-header"><IconTile icon={request.tool.includes('Calendar') ? CalendarDays : Mail} tone="amber"/><div><span className="eyebrow">AWAITING YOUR APPROVAL</span><h4>{request.action}</h4><span>{request.tool}</span></div></div><p>{request.detail}</p><div className="permission-actions"><Button icon={Check} onClick={() => void decideApproval(request, true)} disabled={decisionBusy === request.id}>Approve</Button><Button variant="secondary" icon={X} onClick={() => void decideApproval(request, false)} disabled={decisionBusy === request.id}>Deny</Button></div></div>) : <EmptyState icon={ShieldCheck} title="Nothing to approve" description="New sensitive actions will appear here before execution."/>}</div></section>
            <section className="panel padded"><div className="section-title"><div><h3>How protection works</h3><p>Permission is checked on the server</p></div></div><div className="security-steps"><div><span className="security-step-icon"><Search size={17}/></span><div><strong>01 · Action requested</strong><p>The agent selects the action it needs.</p></div></div><div><span className="security-step-icon"><Shield size={17}/></span><div><strong>02 · Firewall checks</strong><p>Security validates identity and scope.</p></div></div><div><span className="security-step-icon"><Fingerprint size={17}/></span><div><strong>03 · Your decision</strong><p>You approve or deny sensitive actions.</p></div></div><div><span className="security-step-icon"><History size={17}/></span><div><strong>04 · Logged outcome</strong><p>Only permitted actions can proceed.</p></div></div></div><div className="security-footer"><LockKeyhole size={16}/> Frontend approval alone never bypasses backend checks.</div></section></div>
          <section className="panel padded permission-history"><div className="section-title"><div><h3>Decision history</h3><p>Previously reviewed permission requests</p></div></div>{data.approvals.filter(a => a.state !== 'pending').length ? data.approvals.filter(a => a.state !== 'pending').map(a => <div key={a.id} className="history-line"><div><strong>{a.action}</strong><p>{a.tool} · {a.detail}</p></div><span className={cx('history-state', a.state === 'approved' ? 'approved' : 'denied')}>{a.state === 'approved' ? <Check size={14}/> : <X size={14}/>} {a.state === 'approved' ? 'Approved' : 'Denied'}</span></div>) : <p className="muted-small">No requests reviewed yet.</p>}</section>
        </>}

        {page === 'activity' && <><div className="activity-intro"><div><IconTile icon={History} tone="violet" size="large"/><div><strong>Complete activity visibility</strong><p>Understand the decisions behind every action.</p></div></div><div className="activity-total">{data.activities.length} events recorded</div></div><div className="toolbar"><div className="filter-row">{['All', 'Memory', 'Skill', 'Tool', 'Security', 'Chat', 'Learning'].map(item => <button className={cx('filter-chip', activityFilter === item && 'selected')} key={item} onClick={() => setActivityFilter(item)}>{item}</button>)}</div></div><section className="panel activity-panel"><div className="activity-date-heading">EVENT TIMELINE <span>{selectedActivities.length} RESULTS</span></div><div className="timeline-list full-timeline">{selectedActivities.map(a => <ActivityRow key={a.id} activity={a}/>)}{selectedActivities.length === 0 && <EmptyState icon={ActivityIcon} title="No events here" description="Activity will show up as you work with AURA in CUDAREX."/>}</div></section></>}
      </main>
    </div>

    {toast && <div className={cx('toast', `toast-${toast.type}`)} role="status">{toast.type === 'success' ? <CheckCircle2 size={17}/> : toast.type === 'error' ? <CircleAlert size={17}/> : <Sparkles size={17}/>}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={15}/></button></div>}
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
