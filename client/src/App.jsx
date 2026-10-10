import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { GraduationCap, Bot, BookOpen, Ticket, PlusCircle, ChartNoAxesColumn, LogOut, ShieldCheck, Send, Search, RefreshCw, UserRound, LockKeyhole, Sparkles, CircleHelp, CheckCircle2, Clock3, AlertCircle, Menu } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const categories = ["IT Support", "Academics", "Examinations", "Facilities", "Accounts", "Other"];
const emptyStats = { total: 0, open: 0, inProgress: 0, resolved: 0 };
const dateLabel = value => new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("campushelp_token") || "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [faqs, setFaqs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [chat, setChat] = useState([{ role: "assistant", text: "Hi! I'm CampusHelp AI. Ask about exams, attendance, fees, Wi-Fi, facilities, or how to report an issue." }]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const [ticketForm, setTicketForm] = useState({ title: "", category: "IT Support", description: "" });
  const [ticketBusy, setTicketBusy] = useState(false);
  const [ticketSearch, setTicketSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const chatEnd = useRef(null);

  const api = useMemo(() => axios.create({ baseURL: API, headers: token ? { Authorization: `Bearer ${token}` } : {} }), [token]);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    api.get("/auth/me").then(r => setUser(r.data.user)).catch(() => logout());
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (user) refreshAll(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  function logout() {
    localStorage.removeItem("campushelp_token");
    setToken(""); setUser(null); setTickets([]); setStats(emptyStats); setFaqs([]);
    setError(""); setNotice("");
  }
  async function handleAuth(e) {
    e.preventDefault(); setError(""); setNotice(""); setAuthLoading(true);
    try {
      const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";
      const payload = authMode === "register" ? authForm : { email: authForm.email, password: authForm.password };
      const response = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("campushelp_token", response.data.token);
      setUser(response.data.user); setToken(response.data.token);
      setNotice(`Welcome, ${response.data.user.name}!`);
    } catch (e) { setError(e.response?.data?.message || "Unable to connect. Check that the backend is running and MongoDB Atlas is configured."); }
    finally { setAuthLoading(false); }
  }
  async function refreshAll() {
    try {
      const [t, s, f] = await Promise.all([api.get("/tickets"), api.get("/stats"), api.get("/faqs")]);
      setTickets(t.data.tickets); setStats(s.data); setFaqs(f.data.faqs);
    } catch (e) { setError(e.response?.data?.message || "Could not load dashboard data."); }
  }
  async function sendChat(e) {
    e.preventDefault(); const message = chatInput.trim(); if (!message || chatBusy) return;
    setChat([...chat, { role: "user", text: message }]); setChatInput(""); setChatBusy(true); setError("");
    try {
      const r = await api.post("/agent/chat", { message });
      setChat(prev => [...prev, { role: "assistant", text: r.data.answer }]);
    } catch (e) { setChat(prev => [...prev, { role: "assistant", text: e.response?.data?.message || "I couldn't reach the server. Please try again." }]); }
    finally { setChatBusy(false); }
  }
  async function createTicket(e) {
    e.preventDefault(); setTicketBusy(true); setError(""); setNotice("");
    try {
      const r = await api.post("/tickets", ticketForm);
      setNotice(`Ticket ${r.data.ticket.ticketCode} created successfully.`);
      setTicketForm({ title: "", category: "IT Support", description: "" });
      await refreshAll();
    } catch (e) { setError(e.response?.data?.message || "Could not create ticket."); }
    finally { setTicketBusy(false); }
  }
  async function updateTicket(id, patch) {
    try { await api.patch(`/tickets/${id}`, patch); setNotice("Ticket updated."); await refreshAll(); }
    catch (e) { setError(e.response?.data?.message || "Could not update ticket."); }
  }

  const filteredFaqs = faqs.filter(f => `${f.question} ${f.answer} ${f.category}`.toLowerCase().includes(faqSearch.toLowerCase()));
  const filteredTickets = tickets.filter(t => `${t.ticketCode} ${t.title} ${t.category} ${t.status} ${t.studentName || ""} ${t.studentEmail || ""}`.toLowerCase().includes(ticketSearch.toLowerCase()));

  if (!user) return <div className="auth-page"><div className="auth-decoration"><div className="brand-mark"><GraduationCap size={28}/></div><span className="eyebrow">STUDENT SUPPORT PORTAL</span><h1>CampusHelp <span>AI</span></h1><p>One place for campus questions, support requests, and exam guidance.</p><div className="auth-feature"><ShieldCheck size={19}/><span>Role-based student and administrator access</span></div><div className="auth-feature"><Bot size={19}/><span>Rule-based assistant — no external AI API key</span></div><div className="auth-feature"><Ticket size={19}/><span>Track every request from submission to resolution</span></div></div>
    <div className="auth-card-wrap"><form className="auth-card" onSubmit={handleAuth}><div className="mobile-brand"><GraduationCap/><b>CampusHelp <span>AI</span></b></div><span className="eyebrow">{authMode === "login" ? "WELCOME BACK" : "JOIN CAMPUSHELP"}</span><h2>{authMode === "login" ? "Sign in to your workspace" : "Create your student account"}</h2><p className="muted">{authMode === "login" ? "Use your registered email to continue." : "Registration creates a student account. Admins are provisioned securely by the server."}</p>
      {authMode === "register" && <label>Full name<input value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} required minLength={2} placeholder="Your name"/></label>}
      <label>Email address<input type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} required placeholder="you@college.edu"/></label>
      <label>Password<input type="password" value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} required minLength={8} placeholder="At least 8 characters"/></label>
      {error && <div className="alert error"><AlertCircle size={17}/>{error}</div>}{notice && <div className="alert success"><CheckCircle2 size={17}/>{notice}</div>}
      <button className="primary-btn full" disabled={authLoading}>{authLoading ? "Please wait…" : authMode === "login" ? <><LockKeyhole size={17}/> Sign in</> : "Create account"}</button>
      <p className="switch-auth">{authMode === "login" ? "New student?" : "Already have an account?"} <button type="button" onClick={()=>{setAuthMode(authMode==="login"?"register":"login");setError("");setNotice("");}}> {authMode === "login" ? "Create an account" : "Sign in"}</button></p>
      <div className="auth-note"><ShieldCheck size={16}/> Admin login is configured by the project administrator in the server .env file.</div>
    </form><p className="auth-footer">CampusHelp AI · Academic support workspace</p></div></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}><div className="brand"><div className="brand-mark"><GraduationCap size={25}/></div><div><b>CampusHelp <span>AI</span></b><small>STUDENT SUPPORT PORTAL</small></div></div>
      <div className="side-label">WORKSPACE</div><a href="#overview" onClick={()=>setMobileMenu(false)}><ChartNoAxesColumn size={18}/> Dashboard</a><a href="#assistant" onClick={()=>setMobileMenu(false)}><Bot size={18}/> AI Assistant</a><a href="#faqs" onClick={()=>setMobileMenu(false)}><BookOpen size={18}/> College FAQs</a><a href="#report" onClick={()=>setMobileMenu(false)}><PlusCircle size={18}/> Report a complaint</a><a href="#tickets" onClick={()=>setMobileMenu(false)}><Ticket size={18}/> Track complaints <span className="side-count">{tickets.length}</span></a>
      {user.role==="admin" && <div className="admin-tag"><ShieldCheck size={15}/> Administrator mode</div>}
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={19}/><b>Student-first support</b><p>Use sample information for demos. Never submit passwords, OTPs, or sensitive personal data.</p></div><div className="db-status"><span className="status-dot"/> MongoDB Atlas-backed</div></div>
    </aside>
    {mobileMenu && <button className="mobile-scrim" onClick={()=>setMobileMenu(false)} aria-label="Close menu"/>}
    <main className="main-area"><header className="topbar"><button className="mobile-menu-btn icon-btn" onClick={()=>setMobileMenu(!mobileMenu)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <b>Dashboard</b></div><div className="top-user"><span className="online-pill"><span className="status-dot"/> Agent ready</span><div className="avatar">{user.name?.[0]?.toUpperCase() || "U"}</div><div className="user-label"><b>{user.name}</b><small>{user.role==="admin"?"Administrator":"Student"}</small></div><button className="icon-btn logout-btn" title="Sign out" onClick={logout}><LogOut size={18}/></button></div></header>
      <div className="content">
        <section className="welcome-row" id="overview"><div><span className="eyebrow">CAMPUS SUPPORT WORKSPACE</span><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p className="muted">{user.role==="admin"?"Review incoming issues and keep campus support moving.":"Ask a question, browse college guidance, or raise a support request."}</p></div><button className="secondary-btn" onClick={refreshAll}><RefreshCw size={16}/> Refresh data</button></section>
        {error && <div className="alert error page-alert"><AlertCircle size={17}/>{error}<button onClick={()=>setError("")}>Dismiss</button></div>}{notice && <div className="alert success page-alert"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice("")}>Dismiss</button></div>}
        <section className="stats-grid" aria-label="Ticket statistics"><StatCard icon={<Ticket/>} label="Total tickets" value={stats.total} tone="blue"/><StatCard icon={<Clock3/>} label="Open" value={stats.open} tone="amber"/><StatCard icon={<RefreshCw/>} label="In progress" value={stats.inProgress} tone="purple"/><StatCard icon={<CheckCircle2/>} label="Resolved" value={stats.resolved} tone="green"/></section>
        <div className="section-heading"><div><span className="eyebrow">YOUR HELP DESK</span><h2>Support centre</h2><p className="muted">All tools are organized below on one page.</p></div><span className="role-chip"><UserRound size={15}/>{user.role==="admin"?"Admin workspace":"Student workspace"}</span></div>
        <section className="feature-grid">
          <article className="panel chat-panel" id="assistant"><PanelHeading icon={<Bot/>} title="AI Assistant" description="Ask about common college services" tag="RULE-BASED"/><div className="chat-messages">{chat.map((m,i)=><div key={i} className={`chat-line ${m.role}`}><div className="chat-avatar">{m.role==="assistant"?<Sparkles size={16}/>:<UserRound size={16}/>}</div><div className="chat-bubble"><small>{m.role==="assistant"?"CampusHelp AI":"You"}</small><p>{m.text}</p></div></div>)}{chatBusy&&<div className="typing">Searching college FAQs…</div>}<div ref={chatEnd}/></div><form className="chat-input" onSubmit={sendChat}><input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Ask about exams, fees, Wi-Fi…" maxLength={1200}/><button className="primary-btn" disabled={chatBusy||!chatInput.trim()} aria-label="Send question"><Send size={17}/></button></form><div className="helper-line"><CircleHelp size={14}/> No external AI API key. Answers use the college FAQ knowledge base.</div></article>
          <article className="panel faq-panel" id="faqs"><PanelHeading icon={<BookOpen/>} title="College FAQs & exam info" description="Browse the current sample knowledge base"/><div className="search-box"><Search size={16}/><input value={faqSearch} onChange={e=>setFaqSearch(e.target.value)} placeholder="Search FAQs or exam topics…"/></div><div className="faq-list">{filteredFaqs.map(f=><details className="faq-item" key={f.id}><summary><span><small>{f.category}</small>{f.question}</span><span className="faq-plus">+</span></summary><p>{f.answer}</p></details>)}{!filteredFaqs.length&&<p className="empty-state">No FAQs match that search.</p>}</div><div className="helper-line"><AlertCircle size={14}/> Replace sample answers with your college's official policies.</div></article>
          <article className="panel report-panel" id="report"><PanelHeading icon={<PlusCircle/>} title="Report a complaint" description="Submit a new support request"/><form className="ticket-form" onSubmit={createTicket}><label>Issue title<input required minLength={4} maxLength={160} value={ticketForm.title} onChange={e=>setTicketForm({...ticketForm,title:e.target.value})} placeholder="e.g. Classroom projector not working"/></label><label>Category<select value={ticketForm.category} onChange={e=>setTicketForm({...ticketForm,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Describe the issue<textarea required minLength={8} maxLength={3000} rows={3} value={ticketForm.description} onChange={e=>setTicketForm({...ticketForm,description:e.target.value})} placeholder="Include relevant details such as building or room number."/></label><button className="primary-btn" disabled={ticketBusy}>{ticketBusy?"Submitting…":<><PlusCircle size={17}/> Submit complaint</>}</button></form><div className="helper-line"><ShieldCheck size={14}/> A ticket code is generated after submission.</div></article>
          <article className="panel tickets-panel" id="tickets"><PanelHeading icon={<Ticket/>} title={user.role==="admin"?"All support tickets":"Track your complaints"} description={user.role==="admin"?"Review student requests and update their status.":"Your personal request history and latest status."}/><div className="ticket-toolbar"><div className="search-box"><Search size={16}/><input value={ticketSearch} onChange={e=>setTicketSearch(e.target.value)} placeholder="Search tickets…"/></div><span className="ticket-count">{filteredTickets.length} shown</span></div><div className="table-wrap"><table><thead><tr><th>Ticket</th>{user.role==="admin"&&<th>Student</th>}<th>Category</th><th>Priority</th><th>Status</th><th>Created</th>{user.role==="admin"&&<th>Update status</th>}</tr></thead><tbody>{filteredTickets.map(t=><tr key={t._id}><td><b className="ticket-code">{t.ticketCode}</b><span className="ticket-title">{t.title}</span><span className="ticket-desc">{t.description}</span></td>{user.role==="admin"&&<td><span className="student-name">{t.studentName}</span><span className="ticket-desc">{t.studentEmail}</span></td>}<td><span className="category-label">{t.category}</span></td><td><span className={`priority priority-${t.priority.toLowerCase()}`}>{t.priority}</span></td><td><span className={`status status-${t.status.toLowerCase().replace(" ","-")}`}>{t.status}</span></td><td className="date-cell">{dateLabel(t.createdAt)}</td>{user.role==="admin"&&<td><select className="status-select" value={t.status} onChange={e=>updateTicket(t._id,{status:e.target.value})}><option>Open</option><option>In Progress</option><option>Resolved</option></select></td>}</tr>)}</tbody></table>{!filteredTickets.length&&<div className="empty-state table-empty">No tickets found. {user.role==="student"?"Submit a complaint above to get started.":""}</div>}</div></article>
        </section>
        <footer className="footer"><span>CampusHelp AI · Student support made clearer</span><span><span className="status-dot"/> Session protected with role-based access</span></footer>
      </div>
    </main>
  </div>;
}

function StatCard({icon,label,value,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }
function PanelHeading({icon,title,description,tag}) { return <div className="panel-heading"><div className="panel-icon">{icon}</div><div className="panel-title"><h3>{title}</h3><p>{description}</p></div>{tag&&<span className="tiny-tag">{tag}</span>}</div>; }
