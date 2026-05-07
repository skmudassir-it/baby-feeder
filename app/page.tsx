"use client";

import { useState, useEffect, useCallback, FormEvent, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import {
  Baby, Heart, Moon, Bed, Ruler, Droplets, Thermometer,
  Syringe, Target, Calendar, CalendarDays, Pill, Stethoscope,
  Footprints, Flower2, Smile, HeartPulse, Dumbbell, Activity,
  UtensilsCrossed, BarChart3, Home as HomeIcon, User, Settings, LogOut,
  ArrowLeft, Menu, X, Plus, ChevronRight, Check, CheckCircle,
  Sparkles, Scale, Play, AlertTriangle, ClipboardList,
  Save, Sun, Users, Edit3, Trash2, Clock, TrendingUp,
} from "lucide-react";

// ═══════════ API ═══════════════════════════════════════

async function api(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/proxy/${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> || {}) } });
  return res.json();
}

// ═══════════ TYPES ═════════════════════════════════════

interface User { id: number; email: string; name: string; role: string; baby_name: string; }
interface Child { id: number; name: string; birth_date: string; gender: string; }
interface OverviewData { mom: any; children: any[]; }
interface ProfileData { type: "mom" | "child"; profile: any; dashboard: any; }

// ═══════════ HELPERS ═══════════════════════════════════

function msgBox(text: string) {
  const ok = text.startsWith("✅");
  return <div className={ok ? "success-msg" : "error-msg"}>{text}</div>;
}

function StatBox({ icon: Icon, value, label, color = "#6366f1" }: { icon: any; value: any; label: string; color?: string }) {
  return (
    <div className="stat-box">
      <span className="stat-value" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
        <Icon size={18} color={color} /> {value}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

const tabIcons: Record<string, any> = {
  home: HomeIcon, cycle: Calendar, precon: Pill, pregnancy: Heart, postpartum: Flower2,
  feed: Baby, sleep: Moon, growth: Ruler, diaper: Droplets, temp: Thermometer,
  vax: Syringe, milestones: Target,
};

const tabLabels: Record<string, string> = {
  home: "Home", cycle: "Cycle", precon: "Pre-Con", pregnancy: "Preg", postpartum: "Postpartum",
  feed: "Feed", sleep: "Sleep", growth: "Growth", diaper: "Diaper", temp: "Temp",
  vax: "Vax", milestones: "Milestones",
};

// ═══════════ AUTH SCREEN ═══════════════════════════════

function AuthScreen({ onLogin }: { onLogin: (user: User, children: Child[]) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [name, setName] = useState(""); const [babyName, setBabyName] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const data = mode === "register"
        ? await api("register", { method: "POST", body: JSON.stringify({ email, password, name: name || "Mom", baby_name: babyName }) })
        : await api("login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (data.error) { setError(data.error); return; }
      localStorage.setItem("token", data.token);
      const meData = await api("me");
      onLogin(meData.user || data.user, meData.children || []);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <h1 style={{ fontSize: "1.9em", fontWeight: 800, background: "linear-gradient(135deg, #f472b6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Heart size={32} fill="#f472b6" color="#f472b6" /> Mom & Baby Care
        </h1>
        <p style={{ fontSize: "0.85em", color: "#94a3b8", marginTop: 4 }}>Complete maternal & infant health companion</p>
      </div>
      <div className="auth-tabs">
        <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Login</button>
        <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Register</button>
      </div>
      <div className="auth-card">
        <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}
          {mode === "register" && <>
            <div className="input-group"><label>Your Name</label><input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="input-group"><label>Baby's Name</label><input type="text" placeholder="Baby name" value={babyName} onChange={e => setBabyName(e.target.value)} /></div>
          </>}
          <div className="input-group"><label>Email</label><input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="input-group"><label>Password</label><input type="password" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={4} /></div>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}</button>
        </form>
      </div>
    </div>
  );
}

// ═══════════ MAIN APP SHELL ════════════════════════════

function AppShell({ user, children: initialChildren, onLogout }: {
  user: User; children: Child[]; onLogout: () => void;
}) {
  type View = "dashboard" | "profiles" | "profile" | "settings";
  type ProfileTab = "home" | "cycle" | "precon" | "pregnancy" | "postpartum" | "feed" | "sleep" | "growth" | "diaper" | "temp" | "vax" | "milestones";
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ProfileData | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTab>("home");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [childList, setChildList] = useState<Child[]>(initialChildren);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) setSidebarOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sidebarOpen]);

  const loadOverview = useCallback(async () => {
    const data = await api("overview");
    if (!data.error) setOverview(data);
  }, []);

  const refreshChildren = useCallback(async () => {
    const meData = await api("me");
    if (meData.children) setChildList(meData.children);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const openProfile = async (type: "mom" | "child", childId?: number) => {
    if (type === "mom") {
      const d = await api("profile/mom/dashboard");
      setActiveProfile({ type: "mom", profile: { name: user.name }, dashboard: d });
    } else if (childId) {
      const d = await api(`profile/child/${childId}/dashboard`);
      const child = childList.find(c => c.id === childId);
      setActiveProfile({ type: "child", profile: child || {}, dashboard: d });
    }
    setView("profile");
    setProfileTab("home");
    setSidebarOpen(false);
  };

  const goBack = () => { setView("profiles"); setActiveProfile(null); };
  const goDashboard = () => { setView("dashboard"); setSidebarOpen(false); loadOverview(); };
  const selectTab = (t: ProfileTab) => { setProfileTab(t); setSidebarOpen(false); };

  // Build profile-specific sidebar tabs
  const isMom = activeProfile?.type === "mom";
  const momTabs: { key: ProfileTab; icon: any; label: string }[] = [
    { key: "home", icon: HomeIcon, label: "Home" },
    { key: "cycle", icon: Calendar, label: "Cycle" },
    { key: "precon", icon: Pill, label: "Pre-Conception" },
    { key: "pregnancy", icon: Heart, label: "Pregnancy" },
    { key: "postpartum", icon: Flower2, label: "Postpartum" },
  ];
  const childTabs: { key: ProfileTab; icon: any; label: string }[] = [
    { key: "home", icon: HomeIcon, label: "Home" },
    { key: "feed", icon: Baby, label: "Feeding" },
    { key: "sleep", icon: Moon, label: "Sleep" },
    { key: "growth", icon: Ruler, label: "Growth" },
    { key: "diaper", icon: Droplets, label: "Diaper" },
    { key: "temp", icon: Thermometer, label: "Temperature" },
    { key: "vax", icon: Syringe, label: "Vaccines" },
    { key: "milestones", icon: Target, label: "Milestones" },
  ];
  const profileTabs = isMom ? momTabs : childTabs;

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`} ref={sidebarRef}>
        <div className="sidebar-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Heart size={20} fill="#f472b6" color="#f472b6" /> Mom & Baby
          </h2>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <div className="sidebar-nav">
          <button className={`sidebar-nav-item ${view === "dashboard" ? "active" : ""}`} onClick={goDashboard}>
            <BarChart3 size={18} /><span>Dashboard</span>
          </button>
          <button className={`sidebar-nav-item ${view === "profiles" || view === "profile" ? "active" : ""}`} onClick={() => { setView("profiles"); setActiveProfile(null); setSidebarOpen(false); }}>
            <Users size={18} /><span>Profiles</span>
          </button>
          <button className={`sidebar-nav-item ${view === "settings" ? "active" : ""}`} onClick={() => { setView("settings"); setSidebarOpen(false); }}>
            <Settings size={18} /><span>Settings</span>
          </button>
          {/* Profile sub-tabs */}
          {view === "profile" && activeProfile && (
            <>
              <div style={{ height: 1, background: "#e2e8f0", margin: "8px 16px" }} />
              <div style={{ padding: "4px 16px 8px", fontSize: "0.7em", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                {activeProfile.profile.name}
              </div>
              {profileTabs.map(t => (
                <button key={t.key} className={`sidebar-nav-item ${profileTab === t.key ? "active" : ""}`} onClick={() => selectTab(t.key)}>
                  <t.icon size={17} /><span>{t.label}</span>
                </button>
              ))}
            </>
          )}
          <button className="sidebar-nav-item logout" onClick={onLogout}>
            <LogOut size={18} /> <span>Logout</span>
          </button>
        </div>
        <div className="sidebar-footer">{user.name}</div>
      </div>

      <div className="container">
        <div className="header">
          <div className="header-left">
            <button className="hamburger" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            <h1>
              {view === "profile" && activeProfile ? (
                <>{activeProfile.profile.name}</>
              ) : view === "dashboard" ? "Dashboard" : view === "profiles" ? "Profiles" : "Settings"}
            </h1>
          </div>
        </div>

        {view === "dashboard" && <DashboardView overview={overview} user={user} openProfile={openProfile} refresh={refreshChildren} childList={childList} />}
        {view === "profiles" && <ProfilesView user={user} childList={childList} openProfile={openProfile} />}
        {view === "profile" && activeProfile && (
          <ProfileView data={activeProfile} profileTab={profileTab} openProfile={openProfile} refreshChildren={refreshChildren} childList={childList} />
        )}
        {view === "settings" && <SettingsView user={user} childList={childList} refresh={refreshChildren} />}
      </div>
    </>
  );
}

// ═══════════ DASHBOARD VIEW ════════════════════════════

function DashboardView({ overview, user, openProfile, refresh, childList }: {
  overview: OverviewData | null; user: User; openProfile: (type: "mom" | "child", childId?: number) => void;
  refresh: () => void; childList: Child[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBday, setNewBday] = useState("");
  const [newGender, setNewGender] = useState("");

  const addChild = async () => {
    if (!newName.trim()) return;
    await api("children", { method: "POST", body: JSON.stringify({ name: newName, birth_date: newBday || null, gender: newGender || null }) });
    setNewName(""); setNewBday(""); setNewGender(""); setShowAdd(false); refresh();
  };

  return (
    <div>
      {/* Mom Card */}
      <div className="card" onClick={() => openProfile("mom")} style={{ cursor: "pointer", borderLeft: "4px solid #f472b6" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Heart size={22} fill="#ec4899" color="#ec4899" />
            </div>
            <div>
              <h3>{user.name}</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.85em" }}>Mom Profile</p>
            </div>
          </div>
          <ChevronRight size={20} color="#94a3b8" />
        </div>
        {overview?.mom && (
          <div className="stats-row" style={{ marginTop: 8 }}>
            {overview.mom.has_pregnancy && <StatBox icon={Heart} value={`${overview.mom.gestational_weeks}w`} label="Pregnant" color="#ec4899" />}
            <StatBox icon={Pill} value={overview.mom.today_supplements} label="Supplements" color="#a855f7" />
          </div>
        )}
      </div>

      {/* Child Cards */}
      {childList.map(c => {
        const cs = overview?.children?.find(s => s.id === c.id) || {};
        return (
          <div key={c.id} className="card" onClick={() => openProfile("child", c.id)} style={{ cursor: "pointer", borderLeft: "4px solid #60a5fa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Baby size={22} color="#3b82f6" />
                </div>
                <div>
                  <h3>{c.name}</h3>
                  <p style={{ color: "#94a3b8", fontSize: "0.8em" }}>{c.gender || "Baby"} {c.birth_date ? `• Born ${c.birth_date}` : ""}</p>
                </div>
              </div>
              <ChevronRight size={20} color="#94a3b8" />
            </div>
            <div className="stats-row" style={{ marginTop: 8 }}>
              <StatBox icon={Baby} value={cs.today_feedings || 0} label="Feedings" color="#3b82f6" />
              <StatBox icon={Moon} value={`${Math.round((cs.today_sleep_min || 0) / 60)}h`} label="Sleep" color="#6366f1" />
              <StatBox icon={Droplets} value={cs.today_diapers || 0} label="Diapers" color="#06b6d4" />
              {cs.upcoming_vax > 0 && <StatBox icon={Syringe} value={cs.upcoming_vax} label="Vax Due" color="#f59e0b" />}
            </div>
          </div>
        );
      })}

      {/* Add Child */}
      {showAdd ? (
        <div className="card" style={{ background: "#f8fafc" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Plus size={18} /> Add Child</h3>
          <div className="input-group"><label>Name</label><input type="text" placeholder="Child name" value={newName} onChange={e => setNewName(e.target.value)} /></div>
          <div className="row">
            <div className="input-group"><label>Birth Date</label><input type="date" value={newBday} onChange={e => setNewBday(e.target.value)} /></div>
            <div className="input-group"><label>Gender</label><select value={newGender} onChange={e => setNewGender(e.target.value)}><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={addChild}><Plus size={14} /> Add</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: "Inter" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" style={{ width: "100%", padding: 14, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add Child
        </button>
      )}
    </div>
  );
}

// ═══════════ PROFILES LIST ═════════════════════════════

function ProfilesView({ user, childList, openProfile }: {
  user: User; childList: Child[]; openProfile: (type: "mom" | "child", childId?: number) => void;
}) {
  return (
    <div>
      <div className="card" onClick={() => openProfile("mom")} style={{ cursor: "pointer", borderLeft: "4px solid #f472b6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Heart size={26} fill="#ec4899" color="#ec4899" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "1.05em" }}>{user.name}</div>
            <div style={{ color: "#94a3b8", fontSize: "0.8em" }}>Mom • Health tracking, pregnancy & recovery</div>
          </div>
          <ChevronRight size={18} color="#94a3b8" />
        </div>
      </div>
      {childList.map(c => (
        <div key={c.id} className="card" onClick={() => openProfile("child", c.id)} style={{ cursor: "pointer", borderLeft: "4px solid #60a5fa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Baby size={26} color="#3b82f6" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "1.05em" }}>{c.name}</div>
              <div style={{ color: "#94a3b8", fontSize: "0.8em" }}>{c.gender || "Baby"} {c.birth_date ? `• ${c.birth_date}` : ""}</div>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════ PROFILE VIEW ══════════════════════════════

function ProfileView({ data, profileTab, openProfile, refreshChildren, childList }: {
  data: ProfileData; profileTab: string; openProfile: (type: "mom" | "child", childId?: number) => void;
  refreshChildren: () => void; childList: Child[];
}) {
  const [d, setD] = useState(data.dashboard || {});
  const isMom = data.type === "mom";
  const profileId = data.profile?.id;
  const [milestoneChecklist, setMilestoneChecklist] = useState<Record<string, string[]>>({});
  const tab = profileTab;

  // Refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    const url = isMom ? "profile/mom/dashboard" : `profile/child/${profileId}/dashboard`;
    const r = await api(url);
    if (!r.error) setD(r);
  }, [isMom, profileId]);

  // Load milestone checklist
  useEffect(() => {
    if (!isMom) {
      api("baby/milestones/checklist").then(r => {
        if (r.checklist) setMilestoneChecklist(r.checklist);
      });
    }
  }, [isMom]);

  // Calculate child's age in months for milestone filtering
  const childAgeMonths = !isMom && data.profile?.birth_date
    ? Math.floor((new Date().getTime() - new Date(data.profile.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;

  const getEligibleMilestones = (): string[] => {
    if (!childAgeMonths || !milestoneChecklist) return [];
    const eligible: string[] = [];
    for (const [range, milestones] of Object.entries(milestoneChecklist)) {
      const [min, max] = range.replace("_months", "").split("-").map(Number);
      if (childAgeMonths >= (min || 0) && childAgeMonths <= (max || 99)) {
        eligible.push(...milestones);
      }
    }
    return eligible;
  };
  const cname = isMom ? "" : (data.profile?.name || "");
  const [cyStart, setCyStart] = useState(""); const [cyEnd, setCyEnd] = useState(""); const [cyFlow, setCyFlow] = useState("medium"); const [cySymp, setCySymp] = useState("");
  const [cyMsg, setCyMsg] = useState(""); const [cySave, setCySave] = useState(false);
  const [sNm, setSNm] = useState(""); const [sDs, setSDs] = useState(""); const [sMsg, setSMsg] = useState(""); const [sSave, setSSave] = useState(false);
  const [mTp, setMTp] = useState("breakfast"); const [mFd, setMFd] = useState(""); const [mCal, setMCal] = useState("");
  const [mMsg, setMMsg] = useState(""); const [mSave, setMSave] = useState(false);
  const [psSt, setPsSt] = useState(""); const [psEn, setPsEn] = useState(""); const [psQl, setPsQl] = useState("good");
  const [psMsg, setPsMsg] = useState(""); const [psSave, setPsSave] = useState(false);
  const [exAct, setExAct] = useState(""); const [exDur, setExDur] = useState(""); const [exInt, setExInt] = useState("medium");
  const [exMsg, setExMsg] = useState(""); const [exSave, setExSave] = useState(false);
  const [lmp, setLmp] = useState(""); const [pMsg, setPMsg] = useState(""); const [pSave, setPSave] = useState(false);
  const [pw, setPw] = useState(""); const [pwMsg, setPwMsg] = useState(""); const [pwSave, setPwSave] = useState(false);
  const [symN, setSymN] = useState(""); const [symSev, setSymSev] = useState("mild"); const [symMsg, setSymMsg] = useState(""); const [symSave, setSymSave] = useState(false);
  const [bpS, setBpS] = useState(""); const [bpD, setBpD] = useState(""); const [bpMsg2, setBpMsg2] = useState(""); const [bpSave2, setBpSave2] = useState(false);
  const [glu, setGlu] = useState(""); const [gluMsg, setGluMsg] = useState(""); const [gluSave, setGluSave] = useState(false);
  const [kickS, setKickS] = useState<any>(null); const [kickC, setKickC] = useState(0);
  const [mdSc, setMdSc] = useState(""); const [edSc, setEdSc] = useState(""); const [mdNt, setMdNt] = useState("");
  const [mdMsg, setMdMsg] = useState(""); const [mdSave, setMdSave] = useState(false);
  const [rvBl, setRvBl] = useState("light"); const [rvPn, setRvPn] = useState(""); const [rvNt, setRvNt] = useState("");
  const [rvMsg, setRvMsg] = useState(""); const [rvSave, setRvSave] = useState(false);
  const [mdNm, setMdNm] = useState(""); const [mdDs, setMdDs] = useState(""); const [mdFr, setMdFr] = useState("");
  const [mdSMsg, setMdSMsg] = useState(""); const [mdSSave, setMdSSave] = useState(false);
  const [ppSt, setPpSt] = useState(""); const [ppEn, setPpEn] = useState(""); const [ppQl, setPpQl] = useState("fair");
  const [ppMsg, setPpMsg] = useState(""); const [ppSave, setPpSave] = useState(false);

  // ─── Child form states ──────────────────
  const [ftype, setFtype] = useState<"breast" | "bottle" | "food">("bottle");
  const [fName, setFName] = useState(""); const [fQty, setFQty] = useState(""); const [fUnit, setFUnit] = useState("oz");
  const [fTime, setFTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [fSide, setFSide] = useState(""); const [fMsg, setFMsg] = useState(""); const [fSave, setFSave] = useState(false);
  const [sTy, setSTy] = useState<"nap" | "nighttime">("nap");
  const [sSt, setSSt] = useState(() => new Date().toISOString().slice(0, 16));
  const [sEn, setSEn] = useState(() => new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [sQl, setSQl] = useState("good"); const [sMsg2, setSMsg2] = useState(""); const [sSave2, setSSave2] = useState(false);
  const [gH, setGH] = useState(""); const [gW, setGW] = useState(""); const [gHC, setGHC] = useState("");
  const [gDate, setGDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [gMsg, setGMsg] = useState(""); const [gSave, setGSave] = useState(false);
  const [dTy, setDTy] = useState<"wet" | "dirty" | "both">("wet");
  const [dCol, setDCol] = useState(""); const [dCon, setDCon] = useState("");
  const [dTime, setDTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [dMsg, setDMsg] = useState(""); const [dSave, setDSave] = useState(false);
  const [tVal, setTVal] = useState(""); const [tUnit, setTUnit] = useState("F");
  const [tMeth, setTMeth] = useState("oral"); const [tSymp, setTSymp] = useState("");
  const [tTime, setTTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [tMsg, setTMsg] = useState(""); const [tSave, setTSave] = useState(false);
  const [vNm, setVNm] = useState(""); const [vDate, setVDate] = useState("");
  const [vDose, setVDose] = useState("1"); const [vAdmin, setVAdmin] = useState("");
  const [vImageUrl, setVImageUrl] = useState("");
  const [vMsg, setVMsg] = useState(""); const [vSave, setVSave] = useState(false);
  const [msN, setMsN] = useState(""); const [msCat, setMsCat] = useState("motor");
  const [msAge, setMsAge] = useState(""); const [msDate, setMsDate] = useState("");
  const [msMsg, setMsMsg] = useState(""); const [msSave, setMsSave] = useState(false);

  // ─── Helper ──────────────────────────────

  const save = async (url: string, body: any, setMsg: (m: string) => void, setSave: (v: boolean) => void, onSuccess?: () => void) => {
    setSave(true); setMsg("");
    const r = await api(url, { method: "POST", body: JSON.stringify(body) });
    setMsg(r.error || "Saved!");
    if (!r.error) { onSuccess?.(); refreshDashboard(); }
    setSave(false);
  };

  const markVaxDone = async (id: number) => {
    await api(`vaccinations/${id}`, { method: "PUT", body: JSON.stringify({ administered_date: new Date().toISOString().slice(0, 10) }) });
  };

  // ─── Child chart data ──────────────────
  const sleepChart = (() => {
    const byDay: Record<string, any> = {};
    (d.recent_sleep || []).forEach((s: any) => {
      const day = s.start_time.slice(0, 10);
      if (!byDay[day]) byDay[day] = { day, nap: 0, night: 0 };
      if (s.sleep_type === "nap") byDay[day].nap += (s.duration_minutes || 0);
      else byDay[day].night += (s.duration_minutes || 0);
    });
    return Object.values(byDay).sort((a: any, b: any) => a.day.localeCompare(b.day));
  })();

  const diaperChart = (() => {
    const byDay: Record<string, any> = {};
    (d.recent_diapers || []).forEach((dp: any) => {
      const day = dp.recorded_at.slice(0, 10);
      if (!byDay[day]) byDay[day] = { day, wet: 0, dirty: 0 };
      if (dp.diaper_type === "wet" || dp.diaper_type === "both") byDay[day].wet++;
      if (dp.diaper_type === "dirty" || dp.diaper_type === "both") byDay[day].dirty++;
    });
    return Object.values(byDay).sort((a: any, b: any) => a.day.localeCompare(b.day));
  })();

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      {/* ========== MOM HOME ========== */}
      {isMom && tab === "home" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><BarChart3 size={18} color="#6366f1" /> Today</h3>
            <div className="stats-row">
              <StatBox icon={Pill} value={d.today?.supplements || 0} label="Supplements" color="#a855f7" />
              <StatBox icon={UtensilsCrossed} value={d.today?.meals || 0} label="Meals" color="#f59e0b" />
              <StatBox icon={Dumbbell} value={d.today?.exercise || 0} label="Exercise" color="#10b981" />
            </div>
          </div>
          {d.pregnancy && (
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Heart size={18} fill="#ec4899" color="#ec4899" /> Pregnancy</h3>
              <div className="stats-row">
                <StatBox icon={Calendar} value={`${d.pregnancy.gestational_age_weeks}w`} label="Weeks" color="#ec4899" />
                <StatBox icon={CalendarDays} value={d.pregnancy.due_date} label="Due" color="#6366f1" />
              </div>
            </div>
          )}
          {d.recent_mood?.id && (
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Smile size={18} color="#f59e0b" /> Last Mood</h3>
              <div style={{ textAlign: "center", fontSize: "2em", fontWeight: 800, color: d.recent_mood.mood_score >= 7 ? "#16a34a" : d.recent_mood.mood_score >= 4 ? "#f59e0b" : "#ef4444" }}>
                {d.recent_mood.mood_score}/10
                {d.recent_mood.edinburgh_score && <div style={{ fontSize: "0.4em", color: "#94a3b8" }}>Edinburgh: {d.recent_mood.edinburgh_score}/30</div>}
              </div>
            </div>
          )}
          {d.pending_meds > 0 && <div className="card" style={{ borderLeft: "4px solid #ef4444" }}><h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Pill size={18} color="#ef4444" /> {d.pending_meds} medication{d.pending_meds !== 1 ? "s" : ""} pending</h3></div>}
        </div>
      )}

      {/* ========== CHILD HOME ========== */}
      {!isMom && tab === "home" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><BarChart3 size={18} color="#6366f1" /> Today</h3>
            <div className="stats-row">
              <StatBox icon={Baby} value={d.today?.feedings || 0} label="Feedings" color="#3b82f6" />
              <StatBox icon={Moon} value={`${Math.round((d.today?.sleep_minutes || 0) / 60)}h`} label="Sleep" color="#6366f1" />
              <StatBox icon={Droplets} value={d.today?.diapers || 0} label="Diapers" color="#06b6d4" />
            </div>
          </div>
          {d.latest_growth?.id && (
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><TrendingUp size={18} color="#10b981" /> Latest Growth</h3>
              <div className="stats-row">
                {d.latest_growth.weight_kg && <StatBox icon={Scale} value={`${d.latest_growth.weight_kg}kg`} label="Weight" color="#f472b6" />}
                {d.latest_growth.height_cm && <StatBox icon={Ruler} value={`${d.latest_growth.height_cm}cm`} label="Height" color="#10b981" />}
                {d.latest_growth.head_circumference_cm && <StatBox icon={Ruler} value={`${d.latest_growth.head_circumference_cm}cm`} label="Head" color="#06b6d4" />}
              </div>
            </div>
          )}
          {d.latest_temp?.id && (
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Thermometer size={18} color="#ef4444" /> Last Temp</h3>
              <div style={{ textAlign: "center", fontSize: "2em", fontWeight: 800, padding: 10, color: d.latest_temp.temperature > (d.latest_temp.unit === "C" ? 38 : 100.4) ? "#ef4444" : "#16a34a" }}>
                {d.latest_temp.temperature}°{d.latest_temp.unit}
              </div>
            </div>
          )}
          {(d.upcoming_vaccines || []).length > 0 && (
            <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Syringe size={18} color="#f59e0b" /> {d.upcoming_vaccines.length} vaccines due</h3>
              {d.upcoming_vaccines.map((v: any) => (
                <div key={v.id} className="feed-item">
                  <div className="feed-icon" style={{ background: "#ede9fe" }}><Syringe size={18} color="#7c3aed" /></div>
                  <div className="feed-details">
                    <div className="feed-type">{v.vaccine_name} (Dose {v.dose_number})</div>
                    <div className="feed-meta">Due: {v.scheduled_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {d.recent_feedings?.length > 0 && (
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Baby size={18} color="#3b82f6" /> Recent</h3>
              {(d.recent_feedings || []).slice(0, 5).map((f: any) => (
                <div key={f.id} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.85em", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {f.feed_type === "breast" ? <Heart size={14} color="#f472b6" /> : f.feed_type === "bottle" ? <Baby size={14} color="#3b82f6" /> : <UtensilsCrossed size={14} color="#f59e0b" />}
                    {f.feed_type === "breast" ? `Breast ${f.breast_side || ""}` : f.feed_type === "bottle" ? "Bottle" : f.food_name || "Food"}
                  </span>
                  <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                    {f.quantity}{f.unit} <Clock size={12} /> {new Date(f.feed_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== MOM CYCLE ========== */}
      {isMom && tab === "cycle" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Calendar size={18} color="#ec4899" /> Log Cycle</h3>
            <div className="row"><div className="input-group"><label>Start</label><input type="date" value={cyStart} onChange={e => setCyStart(e.target.value)} /></div>
              <div className="input-group"><label>End</label><input type="date" value={cyEnd} onChange={e => setCyEnd(e.target.value)} /></div></div>
            <div className="row"><div className="input-group"><label>Flow</label><select value={cyFlow} onChange={e => setCyFlow(e.target.value)}><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option></select></div>
              <div className="input-group"><label>Symptoms</label><input type="text" value={cySymp} onChange={e => setCySymp(e.target.value)} /></div></div>
            {cyMsg && msgBox(cyMsg)}
            <button className="btn btn-primary" onClick={() => save("preconception/cycle", { start_date: cyStart, end_date: cyEnd || null, flow_intensity: cyFlow, symptoms: cySymp }, setCyMsg, setCySave, () => { setCyStart(""); setCyEnd(""); })} disabled={cySave}>
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      )}

      {/* ========== MOM PRE-CON ========== */}
      {isMom && tab === "precon" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Pill size={18} color="#a855f7" /> Supplement</h3>
            <div className="row"><div className="input-group"><label>Name</label><input type="text" placeholder="e.g. Folic Acid" value={sNm} onChange={e => setSNm(e.target.value)} /></div>
              <div className="input-group"><label>Dosage</label><input type="text" placeholder="e.g. 400mcg" value={sDs} onChange={e => setSDs(e.target.value)} /></div></div>
            {sMsg && msgBox(sMsg)}
            <button className="btn btn-primary" onClick={() => save("preconception/supplements", { supplement_name: sNm, dosage: sDs }, setSMsg, setSSave, () => { setSNm(""); setSDs(""); })} disabled={sSave}>
              <Save size={14} /> Save
            </button>
          </div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><UtensilsCrossed size={18} color="#f59e0b" /> Nutrition</h3>
            <div className="input-group"><label>Meal</label><select value={mTp} onChange={e => setMTp(e.target.value)}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></select></div>
            <div className="row"><div className="input-group"><label>Food</label><input type="text" placeholder="What did you eat?" value={mFd} onChange={e => setMFd(e.target.value)} /></div>
              <div className="input-group"><label>Cal</label><input type="number" value={mCal} onChange={e => setMCal(e.target.value)} /></div></div>
            {mMsg && msgBox(mMsg)}
            <button className="btn btn-primary" onClick={() => save("preconception/nutrition", { meal_type: mTp, food_items: mFd, calories: mCal ? parseFloat(mCal) : null }, setMMsg, setMSave, () => { setMFd(""); setMCal(""); })} disabled={mSave}>
              <Save size={14} /> Save
            </button>
          </div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Moon size={18} color="#6366f1" /> Sleep</h3>
            <div className="row"><div className="input-group"><label>Bed</label><input type="datetime-local" value={psSt} onChange={e => setPsSt(e.target.value)} /></div>
              <div className="input-group"><label>Wake</label><input type="datetime-local" value={psEn} onChange={e => setPsEn(e.target.value)} /></div></div>
            <div className="input-group"><label>Quality</label><select value={psQl} onChange={e => setPsQl(e.target.value)}><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option><option value="excellent">Excellent</option></select></div>
            {psMsg && msgBox(psMsg)}
            <button className="btn btn-primary" onClick={() => save("preconception/sleep", { start_time: psSt, end_time: psEn, quality: psQl }, setPsMsg, setPsSave)} disabled={psSave}>
              <Save size={14} /> Save
            </button>
          </div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Dumbbell size={18} color="#10b981" /> Exercise</h3>
            <div className="input-group"><label>Activity</label><input type="text" placeholder="e.g. Walking" value={exAct} onChange={e => setExAct(e.target.value)} /></div>
            <div className="row"><div className="input-group"><label>Duration (min)</label><input type="number" value={exDur} onChange={e => setExDur(e.target.value)} /></div>
              <div className="input-group"><label>Intensity</label><select value={exInt} onChange={e => setExInt(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div>
            {exMsg && msgBox(exMsg)}
            <button className="btn btn-primary" onClick={() => save("preconception/exercise", { activity: exAct, duration_minutes: exDur ? parseInt(exDur) : null, intensity: exInt }, setExMsg, setExSave, () => { setExAct(""); setExDur(""); })} disabled={exSave}>
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      )}

      {/* ========== MOM PREGNANCY ========== */}
      {isMom && tab === "pregnancy" && (
        <div>
          {!d.pregnancy?.id && (
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Heart size={18} fill="#ec4899" color="#ec4899" /> Confirm Pregnancy</h3>
              <div className="input-group"><label>Last Period</label><input type="date" value={lmp} onChange={e => setLmp(e.target.value)} /></div>
              {pMsg && msgBox(pMsg)}
              <button className="btn btn-primary" onClick={() => save("pregnancy/start", { lmp_date: lmp }, setPMsg, setPSave)} disabled={pSave}>
                <Heart size={14} /> Start
              </button>
            </div>
          )}
          {d.pregnancy?.id && (<>
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><BarChart3 size={18} color="#6366f1" /> Status</h3>
              <div className="stats-row">
                <StatBox icon={Calendar} value={`${d.pregnancy.gestational_age_weeks}w`} label="Weeks" color="#ec4899" />
                <StatBox icon={CalendarDays} value={d.pregnancy.due_date} label="Due" color="#6366f1" />
              </div>
            </div>
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Scale size={18} color="#f472b6" /> Weight</h3>
              <div className="input-group"><label>Weight (kg)</label><input type="number" step="0.1" value={pw} onChange={e => setPw(e.target.value)} /></div>
              {pwMsg && msgBox(pwMsg)}
              <button className="btn btn-primary" onClick={() => save("pregnancy/weight", { weight_kg: parseFloat(pw) }, setPwMsg, setPwSave, () => setPw(""))} disabled={pwSave}><Save size={14} /> Save</button>
            </div>
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Activity size={18} color="#f59e0b" /> Symptoms</h3>
              <div className="row"><div className="input-group"><label>Symptom</label><input type="text" value={symN} onChange={e => setSymN(e.target.value)} /></div>
                <div className="input-group"><label>Severity</label><select value={symSev} onChange={e => setSymSev(e.target.value)}><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select></div></div>
              {symMsg && msgBox(symMsg)}
              <button className="btn btn-primary" onClick={() => save("pregnancy/symptoms", { symptom: symN, severity: symSev }, setSymMsg, setSymSave, () => setSymN(""))} disabled={symSave}><Save size={14} /> Save</button>
            </div>
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Stethoscope size={18} color="#ef4444" /> Vitals</h3>
              <div className="row"><div className="input-group"><label>Systolic</label><input type="number" value={bpS} onChange={e => setBpS(e.target.value)} /></div>
                <div className="input-group"><label>Diastolic</label><input type="number" value={bpD} onChange={e => setBpD(e.target.value)} /></div></div>
              {bpMsg2 && msgBox(bpMsg2)}
              <button className="btn btn-primary" onClick={() => save("pregnancy/vitals/bp", { systolic: parseInt(bpS), diastolic: parseInt(bpD) }, setBpMsg2, setBpSave2, () => { setBpS(""); setBpD(""); })} disabled={bpSave2}><Save size={14} /> BP</button>
              <div style={{ marginTop: 14 }}><div className="input-group"><label>Glucose (mg/dL)</label><input type="number" value={glu} onChange={e => setGlu(e.target.value)} /></div>
                {gluMsg && msgBox(gluMsg)}
                <button className="btn btn-primary" onClick={() => save("pregnancy/vitals/glucose", { glucose_mgdl: parseFloat(glu) }, setGluMsg, setGluSave, () => setGlu(""))} disabled={gluSave}><Save size={14} /> Glucose</button>
              </div>
            </div>
            {d.pregnancy.gestational_age_weeks >= 24 && (
              <div className="card">
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Footprints size={18} color="#6366f1" /> Kick Counter</h3>
                {!kickS ? <button className="btn btn-primary" onClick={async () => { const r = await api("pregnancy/kicks/session", { method: "POST" }); if (!r.error) { setKickS(r); setKickC(0); } }}><Play size={14} /> Start</button>
                  : <div style={{ textAlign: "center" }}><div style={{ fontSize: "3em", fontWeight: 800, color: "#6366f1" }}>{kickC}</div>
                    <button className="btn btn-primary" onClick={async () => { if (!kickS) return; await api("pregnancy/kicks/log", { method: "POST", body: JSON.stringify({ session_id: kickS.id }) }); setKickC(c => c + 1); }}><Footprints size={14} /> Kick</button></div>}
              </div>
            )}
          </>)}
        </div>
      )}

      {/* ========== MOM POSTPARTUM ========== */}
      {isMom && tab === "postpartum" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Smile size={18} color="#f59e0b" /> Mood</h3>
            <div className="row"><div className="input-group"><label>Mood (1-10)</label><input type="number" min="1" max="10" value={mdSc} onChange={e => setMdSc(e.target.value)} /></div>
              <div className="input-group"><label>Edinburgh (0-30)</label><input type="number" min="0" max="30" value={edSc} onChange={e => setEdSc(e.target.value)} /></div></div>
            <div className="input-group"><label>Notes</label><input type="text" value={mdNt} onChange={e => setMdNt(e.target.value)} /></div>
            {mdMsg && msgBox(mdMsg)}
            <button className="btn btn-primary" onClick={() => save("postpartum/mood", { mood_score: parseInt(mdSc), edinburgh_score: edSc ? parseInt(edSc) : null, notes: mdNt }, setMdMsg, setMdSave, () => { setMdSc(""); setEdSc(""); setMdNt(""); })} disabled={mdSave}><Save size={14} /> Save</button>
          </div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><HeartPulse size={18} color="#ef4444" /> Recovery</h3>
            <div className="row"><div className="input-group"><label>Bleeding</label><select value={rvBl} onChange={e => setRvBl(e.target.value)}><option value="none">None</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="heavy">Heavy</option></select></div>
              <div className="input-group"><label>Pain (0-10)</label><input type="number" min="0" max="10" value={rvPn} onChange={e => setRvPn(e.target.value)} /></div></div>
            <div className="input-group"><label>Notes</label><input type="text" value={rvNt} onChange={e => setRvNt(e.target.value)} /></div>
            {rvMsg && msgBox(rvMsg)}
            <button className="btn btn-primary" onClick={() => save("postpartum/recovery", { bleeding_level: rvBl, pain_level: rvPn ? parseInt(rvPn) : null, notes: rvNt }, setRvMsg, setRvSave, () => setRvNt(""))} disabled={rvSave}><Save size={14} /> Save</button>
          </div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Pill size={18} color="#a855f7" /> Medication</h3>
            <div className="row"><div className="input-group"><label>Name</label><input type="text" value={mdNm} onChange={e => setMdNm(e.target.value)} /></div>
              <div className="input-group"><label>Dosage</label><input type="text" value={mdDs} onChange={e => setMdDs(e.target.value)} /></div></div>
            <div className="input-group"><label>Frequency</label><input type="text" value={mdFr} onChange={e => setMdFr(e.target.value)} /></div>
            {mdSMsg && msgBox(mdSMsg)}
            <button className="btn btn-primary" onClick={() => save("postpartum/medication", { medication_name: mdNm, dosage: mdDs, frequency: mdFr }, setMdSMsg, setMdSSave, () => { setMdNm(""); setMdDs(""); setMdFr(""); })} disabled={mdSSave}><Save size={14} /> Save</button>
          </div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Moon size={18} color="#6366f1" /> Sleep</h3>
            <div className="row"><div className="input-group"><label>Bed</label><input type="datetime-local" value={ppSt} onChange={e => setPpSt(e.target.value)} /></div>
              <div className="input-group"><label>Wake</label><input type="datetime-local" value={ppEn} onChange={e => setPpEn(e.target.value)} /></div></div>
            <div className="input-group"><label>Quality</label><select value={ppQl} onChange={e => setPpQl(e.target.value)}><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option><option value="excellent">Excellent</option></select></div>
            {ppMsg && msgBox(ppMsg)}
            <button className="btn btn-primary" onClick={() => save("postpartum/sleep", { start_time: ppSt, end_time: ppEn, quality: ppQl }, setPpMsg, setPpSave)} disabled={ppSave}><Save size={14} /> Save</button>
          </div>
        </div>
      )}

      {/* ========== CHILD FEED ========== */}
      {!isMom && tab === "feed" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Baby size={18} color="#3b82f6" /> Feeding</h3>
            <div className="toggle-group">
              <button className={ftype === "breast" ? "active" : ""} onClick={() => setFtype("breast")}><Heart size={14} /> Breast</button>
              <button className={ftype === "bottle" ? "active" : ""} onClick={() => setFtype("bottle")}><Baby size={14} /> Bottle</button>
              <button className={ftype === "food" ? "active" : ""} onClick={() => setFtype("food")}><UtensilsCrossed size={14} /> Food</button>
            </div>
            {ftype === "breast" && <div className="input-group"><label>Side</label><select value={fSide} onChange={e => setFSide(e.target.value)}><option value="">Both</option><option value="left">Left</option><option value="right">Right</option></select></div>}
            {ftype === "food" && <div className="input-group"><label>What food?</label><input type="text" value={fName} onChange={e => setFName(e.target.value)} /></div>}
            <div className="row"><div className="input-group"><label>Qty</label><input type="number" step="0.1" value={fQty} onChange={e => setFQty(e.target.value)} /></div>
              <div className="input-group"><label>Unit</label><select value={fUnit} onChange={e => setFUnit(e.target.value)}><option value="oz">oz</option><option value="ml">ml</option><option value="tbsp">tbsp</option></select></div></div>
            <div className="input-group"><label>When</label><input type="datetime-local" value={fTime} onChange={e => setFTime(e.target.value)} /></div>
            {fMsg && msgBox(fMsg)}
            <button className="btn btn-primary" onClick={() => {
              if (!fQty || parseFloat(fQty) <= 0) { setFMsg("Quantity required"); return; }
              const body: any = { feed_type: ftype, quantity: parseFloat(fQty), unit: fUnit, feed_time: fTime, child_name: cname };
              if (ftype === "food") body.food_name = fName || "Food";
              if (ftype === "breast") body.breast_side = fSide || null;
              save("feedings", body, setFMsg, setFSave, () => { setFQty(""); setFName(""); });
            }} disabled={fSave}><Save size={14} /> Save</button>
          </div>
          {(d.recent_feedings || []).map((f: any) => (
            <div className="card" key={f.id} style={{ padding: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {f.feed_type === "breast" ? <Heart size={20} color="#f472b6" /> : f.feed_type === "bottle" ? <Baby size={20} color="#3b82f6" /> : <UtensilsCrossed size={20} color="#f59e0b" />}
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: "0.9em" }}>{f.feed_type === "breast" ? `Breast ${f.breast_side || ""}` : f.feed_type === "bottle" ? "Bottle" : f.food_name || "Food"}</div>
                  <div style={{ fontSize: "0.75em", color: "#94a3b8" }}><Clock size={10} style={{ display: "inline", marginRight: 4 }} />{new Date(f.feed_time).toLocaleString()}</div></div>
                <div style={{ fontWeight: 600 }}>{f.quantity}{f.unit}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== CHILD SLEEP ========== */}
      {!isMom && tab === "sleep" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Moon size={18} color="#6366f1" /> Sleep</h3>
            <div className="toggle-group"><button className={sTy === "nap" ? "active" : ""} onClick={() => setSTy("nap")}><Sun size={14} /> Nap</button><button className={sTy === "nighttime" ? "active" : ""} onClick={() => setSTy("nighttime")}><Moon size={14} /> Night</button></div>
            <div className="row"><div className="input-group"><label>Start</label><input type="datetime-local" value={sSt} onChange={e => setSSt(e.target.value)} /></div>
              <div className="input-group"><label>End</label><input type="datetime-local" value={sEn} onChange={e => setSEn(e.target.value)} /></div></div>
            <div className="input-group"><label>Quality</label><select value={sQl} onChange={e => setSQl(e.target.value)}><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option><option value="excellent">Excellent</option></select></div>
            {sMsg2 && msgBox(sMsg2)}
            <button className="btn btn-primary" onClick={() => save("sleep", { sleep_type: sTy, start_time: sSt, end_time: sEn, quality: sQl, child_name: cname }, setSMsg2, setSSave2)} disabled={sSave2}><Save size={14} /> Save</button>
          </div>
          {sleepChart.length > 0 && <div className="card"><h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><BarChart3 size={16} color="#6366f1" /> Chart</h3><div style={{ height: 180 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={sleepChart} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#94a3b8" }} /><YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit="m" /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="nap" name="Nap" fill="#a78bfa" radius={[6, 6, 0, 0]} /><Bar dataKey="night" name="Night" fill="#6366f1" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>}
          {(d.recent_sleep || []).map((s: any) => (
            <div className="card" key={s.id} style={{ padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85em" }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}>{s.sleep_type === "nap" ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />} {s.sleep_type === "nap" ? "Nap" : "Night"}</span><span style={{ color: "#94a3b8" }}><Clock size={10} style={{ display: "inline", marginRight: 4 }} />{new Date(s.start_time).toLocaleDateString()} • {s.duration_minutes}m</span></div></div>
          ))}
        </div>
      )}

      {/* ========== CHILD GROWTH ========== */}
      {!isMom && tab === "growth" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Ruler size={18} color="#10b981" /> Growth</h3>
            <div className="row"><div className="input-group"><label>Height (cm)</label><input type="number" step="0.1" value={gH} onChange={e => setGH(e.target.value)} /></div>
              <div className="input-group"><label>Weight (kg)</label><input type="number" step="0.01" value={gW} onChange={e => setGW(e.target.value)} /></div></div>
            <div className="row"><div className="input-group"><label>Head (cm)</label><input type="number" step="0.1" value={gHC} onChange={e => setGHC(e.target.value)} /></div>
              <div className="input-group"><label>Date</label><input type="datetime-local" value={gDate} onChange={e => setGDate(e.target.value)} /></div></div>
            {gMsg && msgBox(gMsg)}
            <button className="btn btn-primary" onClick={() => save("growth", { height_cm: gH ? parseFloat(gH) : null, weight_kg: gW ? parseFloat(gW) : null, head_circumference_cm: gHC ? parseFloat(gHC) : null, recorded_at: gDate, child_name: cname }, setGMsg, setGSave, () => { setGH(""); setGW(""); setGHC(""); })} disabled={gSave}><Save size={14} /> Save</button>
          </div>
        </div>
      )}

      {/* ========== CHILD DIAPER ========== */}
      {!isMom && tab === "diaper" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Droplets size={18} color="#06b6d4" /> Diaper</h3>
            <div className="toggle-group"><button className={dTy === "wet" ? "active" : ""} onClick={() => setDTy("wet")}><Droplets size={14} /> Wet</button><button className={dTy === "dirty" ? "active" : ""} onClick={() => setDTy("dirty")}><AlertTriangle size={14} /> Dirty</button><button className={dTy === "both" ? "active" : ""} onClick={() => setDTy("both")}>Both</button></div>
            <div className="row"><div className="input-group"><label>Color</label><input type="text" value={dCol} onChange={e => setDCol(e.target.value)} /></div>
              <div className="input-group"><label>Consistency</label><input type="text" value={dCon} onChange={e => setDCon(e.target.value)} /></div></div>
            <div className="input-group"><label>When</label><input type="datetime-local" value={dTime} onChange={e => setDTime(e.target.value)} /></div>
            {dMsg && msgBox(dMsg)}
            <button className="btn btn-primary" onClick={() => save("diaper", { diaper_type: dTy, color: dCol, consistency: dCon, recorded_at: dTime, child_name: cname }, setDMsg, setDSave, () => { setDCol(""); setDCon(""); })} disabled={dSave}><Save size={14} /> Save</button>
          </div>
          {diaperChart.length > 0 && <div className="card"><h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><BarChart3 size={16} color="#06b6d4" /> Chart</h3><div style={{ height: 180 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={diaperChart} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#94a3b8" }} /><YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Bar dataKey="wet" name="Wet" fill="#60a5fa" radius={[6, 6, 0, 0]} /><Bar dataKey="dirty" name="Dirty" fill="#fbbf24" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>}
        </div>
      )}

      {/* ========== CHILD TEMP ========== */}
      {!isMom && tab === "temp" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Thermometer size={18} color="#ef4444" /> Temperature</h3>
            <div className="row"><div className="input-group"><label>Temp</label><input type="number" step="0.1" value={tVal} onChange={e => setTVal(e.target.value)} /></div>
              <div className="input-group"><label>Unit</label><select value={tUnit} onChange={e => setTUnit(e.target.value)}><option value="F">°F</option><option value="C">°C</option></select></div></div>
            <div className="input-group"><label>Method</label><select value={tMeth} onChange={e => setTMeth(e.target.value)}><option value="oral">Oral</option><option value="rectal">Rectal</option><option value="axillary">Axillary</option><option value="ear">Ear</option><option value="forehead">Forehead</option></select></div>
            <div className="input-group"><label>Symptoms</label><input type="text" value={tSymp} onChange={e => setTSymp(e.target.value)} /></div>
            <div className="input-group"><label>When</label><input type="datetime-local" value={tTime} onChange={e => setTTime(e.target.value)} /></div>
            {tMsg && msgBox(tMsg)}
            <button className="btn btn-primary" onClick={() => save("temperature", { temperature: parseFloat(tVal), unit: tUnit, method: tMeth, symptoms: tSymp, recorded_at: tTime, child_name: cname }, setTMsg, setTSave, () => { setTVal(""); setTSymp(""); })} disabled={tSave}><Save size={14} /> Save</button>
          </div>
        </div>
      )}

      {/* ========== CHILD VAX ========== */}
      {!isMom && tab === "vax" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Syringe size={18} color="#7c3aed" /> Vaccine</h3>
            <div className="input-group"><label>Name</label><input type="text" value={vNm} onChange={e => setVNm(e.target.value)} /></div>
            <div className="row"><div className="input-group"><label>Date</label><input type="date" value={vDate} onChange={e => setVDate(e.target.value)} /></div>
              <div className="input-group"><label>Dose #</label><input type="number" min="1" value={vDose} onChange={e => setVDose(e.target.value)} /></div></div>
            <div className="input-group"><label>Admin Date</label><input type="date" value={vAdmin} onChange={e => setVAdmin(e.target.value)} /></div>
            <div className="input-group">
              <label>Photo of vaccination card</label>
              <input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setVSave(true); setVMsg("Uploading...");
                const form = new FormData(); form.append("file", file);
                try {
                  const token = localStorage.getItem("token");
                  const r = await fetch("http://173.249.10.236:5003/api/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
                  const data = await r.json();
                  if (data.url) { setVImageUrl(data.url); setVMsg("✅ Photo uploaded!"); }
                  else setVMsg(data.error || "Upload failed");
                } catch { setVMsg("Upload failed"); }
                setVSave(false);
              }} style={{ fontSize: "0.85em", marginTop: 4 }} />
              {vImageUrl && <p style={{ fontSize: "0.8em", color: "#10b981", marginTop: 4 }}>Photo ready</p>}
            </div>
            {vMsg && msgBox(vMsg)}
            <button className="btn btn-primary" onClick={() => save("vaccinations", { vaccine_name: vNm, scheduled_date: vDate, administered_date: vAdmin || null, dose_number: parseInt(vDose) || 1, child_name: cname, image_url: vImageUrl }, setVMsg, setVSave, () => { setVNm(""); setVDate(""); setVAdmin(""); setVImageUrl(""); })} disabled={vSave}><Save size={14} /> Save</button>
          </div>
          {(d.upcoming_vaccines || []).map((v: any) => (
            <div className="card" key={v.id} style={{ padding: 10, opacity: v.administered_date ? 0.5 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85em" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Syringe size={14} color={v.administered_date ? "#10b981" : "#f59e0b"} /> {v.vaccine_name} (D{v.dose_number})</span>
                <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>{v.administered_date ? <><CheckCircle size={12} color="#10b981" /> {v.administered_date}</> : <><Calendar size={12} /> {v.scheduled_date}</>}</span>
              </div>
              {v.image_url && (
                <img src={`http://173.249.10.236:5003${v.image_url}`} alt="Vaccination card"
                  style={{ width: "100%", maxHeight: 200, objectFit: "contain", marginTop: 8, borderRadius: 8, cursor: "pointer" }}
                  onClick={() => window.open(`http://173.249.10.236:5003${v.image_url}`, "_blank")} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========== CHILD MILESTONES ========== */}
      {!isMom && tab === "milestones" && (
        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Target size={18} color="#f472b6" /> Log Milestone</h3>
            <div className="input-group"><label>Name</label><input type="text" value={msN} onChange={e => setMsN(e.target.value)} /></div>
            <div className="row"><div className="input-group"><label>Category</label><select value={msCat} onChange={e => setMsCat(e.target.value)}><option value="motor">Motor</option><option value="cognitive">Cognitive</option><option value="social">Social</option><option value="language">Language</option></select></div>
              <div className="input-group"><label>Expected (mo)</label><input type="number" value={msAge} onChange={e => setMsAge(e.target.value)} /></div></div>
            <div className="input-group"><label>Achieved</label><input type="date" value={msDate} onChange={e => setMsDate(e.target.value)} /></div>
            {msMsg && msgBox(msMsg)}
            <button className="btn btn-primary" onClick={() => save("milestones", { milestone: msN, category: msCat, expected_age_months: msAge ? parseInt(msAge) : null, achieved_date: msDate || null, child_name: cname }, setMsMsg, setMsSave, () => setMsN(""))} disabled={msSave}><Save size={14} /> Save</button>
          </div>
          {/* Age-based checklist */}
          {childAgeMonths !== null && (
            <div className="card">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Target size={16} color="#10b981" /> Milestones for {childAgeMonths} months
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.8em", marginBottom: 12 }}>
                Based on baby's birth date ({data.profile.birth_date}). Tap to log.
              </p>
              {getEligibleMilestones().length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.85em" }}>No checklist data for this age range yet.</p>
              ) : (
                getEligibleMilestones().map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                    onClick={() => { setMsN(m); }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Plus size={14} color="#16a34a" />
                    </div>
                    <span style={{ fontSize: "0.85em", color: "#1e293b" }}>{m}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════ SETTINGS VIEW ═══════════════════════════════

function SettingsView({ user, childList, refresh }: { user: User; childList: Child[]; refresh: () => void; }) {
  const [editing, setEditing] = useState<"mom" | "child" | null>(null);
  const [editChildId, setEditChildId] = useState<number | null>(null);
  const [momName, setMomName] = useState(user.name);
  const [momPhone, setMomPhone] = useState("");
  const [momDob, setMomDob] = useState("");
  const [momHt, setMomHt] = useState("");
  const [momWt, setMomWt] = useState("");
  const [momBt, setMomBt] = useState("");
  const [cName, setCName] = useState("");
  const [cBday, setCBday] = useState("");
  const [cGender, setCGender] = useState("");
  const [msg, setMsg] = useState(""); const [saving, setSaving] = useState(false);

  const saveMom = async () => {
    setSaving(true); setMsg("");
    await api(`users/${user.id}`, { method: "PUT", body: JSON.stringify({ name: momName, phone: momPhone }) });
    await api("users/profile/mom", { method: "POST", body: JSON.stringify({ dob: momDob, height_cm: momHt ? parseFloat(momHt) : null, pre_pregnancy_weight_kg: momWt ? parseFloat(momWt) : null, blood_type: momBt }) });
    setMsg("Saved!"); setSaving(false); setEditing(null);
  };

  const startEditChild = (c: Child) => { setEditChildId(c.id); setCName(c.name); setCBday(c.birth_date || ""); setCGender(c.gender || ""); setEditing("child"); };

  const saveChild = async () => {
    if (!editChildId) return;
    setSaving(true); setMsg("");
    await api(`children/${editChildId}`, { method: "PUT", body: JSON.stringify({ name: cName, birth_date: cBday || null, gender: cGender || null }) });
    setMsg("Saved!"); setSaving(false); setEditing(null); refresh();
  };

  const addChild = async () => {
    if (!cName.trim()) return;
    setSaving(true); setMsg("");
    const r = await api("children", { method: "POST", body: JSON.stringify({ name: cName, birth_date: cBday || null, gender: cGender || null }) });
    setMsg(r.error || "Added!"); setSaving(false); setEditing(null); setCName(""); setCBday(""); setCGender(""); refresh();
  };

  return (
    <div>
      <h3 style={{ marginBottom: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}><Edit3 size={18} /> Edit Profiles</h3>

      {/* Mom Profile */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Heart size={18} fill="#ec4899" color="#ec4899" /> Mom</h3>
          <button onClick={() => setEditing(editing === "mom" ? null : "mom")} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.9em", fontWeight: 600 }}>
            {editing === "mom" ? "Cancel" : "Edit"}
          </button>
        </div>
        {editing === "mom" ? (<div>
          <div className="input-group"><label>Name</label><input type="text" value={momName} onChange={e => setMomName(e.target.value)} /></div>
          <div className="input-group"><label>Phone</label><input type="text" value={momPhone} onChange={e => setMomPhone(e.target.value)} /></div>
          <div className="row"><div className="input-group"><label>DOB</label><input type="date" value={momDob} onChange={e => setMomDob(e.target.value)} /></div>
            <div className="input-group"><label>Blood Type</label><input type="text" placeholder="e.g. O+" value={momBt} onChange={e => setMomBt(e.target.value)} /></div></div>
          <div className="row"><div className="input-group"><label>Height (cm)</label><input type="number" value={momHt} onChange={e => setMomHt(e.target.value)} /></div>
            <div className="input-group"><label>Pre-Preg Wt (kg)</label><input type="number" value={momWt} onChange={e => setMomWt(e.target.value)} /></div></div>
          {msg && msgBox(msg)}<button className="btn btn-primary" onClick={saveMom} disabled={saving}><Save size={14} /> Save Mom</button>
        </div>) : <p style={{ color: "#94a3b8", fontSize: "0.85em" }}>{user.name} • {user.email}</p>}
      </div>

      {/* Children */}
      {childList.map(c => (
        <div key={c.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Baby size={18} color="#3b82f6" /> {c.name}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => startEditChild(c)} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.9em", fontWeight: 600 }}>Edit</button>
            </div>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.8em" }}>{c.gender || "N/A"} {c.birth_date ? `• ${c.birth_date}` : ""}</p>
        </div>
      ))}

      {/* Add/Edit Child Form */}
      {editing === "child" && (
        <div className="card" style={{ background: "#f8fafc" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>{editChildId ? <Edit3 size={16} /> : <Plus size={16} />} {editChildId ? `Edit ${cName}` : "Add Child"}</h3>
          <div className="input-group"><label>Name</label><input type="text" value={cName} onChange={e => setCName(e.target.value)} /></div>
          <div className="row"><div className="input-group"><label>Birth Date</label><input type="date" value={cBday} onChange={e => setCBday(e.target.value)} /></div>
            <div className="input-group"><label>Gender</label><select value={cGender} onChange={e => setCGender(e.target.value)}><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select></div></div>
          {msg && msgBox(msg)}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={editChildId ? saveChild : addChild} disabled={saving}><Save size={14} /> Save</button>
            <button onClick={() => { setEditing(null); setEditChildId(null); }} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: "Inter" }}>Cancel</button>
          </div>
        </div>
      )}

      {editing !== "child" && <button className="btn btn-primary" style={{ width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => { setEditChildId(null); setCName(""); setCBday(""); setCGender(""); setEditing("child"); }}>
        <Plus size={18} /> Add Child
      </button>}
    </div>
  );
}

// ═══════════ ROOT ══════════════════════════════════════

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api("me").then(meData => {
        if (meData.user) { setUser(meData.user); setChildren(meData.children || []); }
        else localStorage.removeItem("token");
      }).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  if (loading) return (
    <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <Heart size={40} fill="#f472b6" color="#f472b6" style={{ animation: "pulse 1.5s infinite" }} />
    </div>
  );
  if (!user) return <AuthScreen onLogin={(u, c) => { setUser(u); setChildren(c); }} />;
  return <AppShell user={user} children={children} onLogout={() => { localStorage.removeItem("token"); setUser(null); }} />;
}
