"use client";

import { useState, useEffect, useCallback, FormEvent, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";

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
        <h1 style={{ fontSize: "1.9em", fontWeight: 800, background: "linear-gradient(135deg, #f472b6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>🤰 Mom & Baby Care</h1>
        <p style={{ fontSize: "0.85em", color: "#94a3b8", marginTop: 4 }}>Complete maternal & infant health companion</p>
      </div>
      <div className="auth-tabs">
        <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Login</button>
        <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Register</button>
      </div>
      <div className="auth-card">
        <h2>{mode === "login" ? "👋 Welcome back" : "✨ Create account"}</h2>
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
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ProfileData | null>(null);
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
    setSidebarOpen(false);
  };

  const goBack = () => { setView("profiles"); setActiveProfile(null); };
  const goDashboard = () => { setView("dashboard"); setSidebarOpen(false); loadOverview(); };

  return (
    <>
      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`} ref={sidebarRef}>
        <div className="sidebar-header"><h2>🤰 Mom & Baby</h2><button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button></div>
        <div className="sidebar-nav">
          <button className={`sidebar-nav-item ${view === "dashboard" ? "active" : ""}`} onClick={goDashboard}>📊 Dashboard</button>
          <button className={`sidebar-nav-item ${view === "profiles" || view === "profile" ? "active" : ""}`} onClick={() => { setView("profiles"); setActiveProfile(null); setSidebarOpen(false); }}>👤 Profiles</button>
          <button className={`sidebar-nav-item ${view === "settings" ? "active" : ""}`} onClick={() => { setView("settings"); setSidebarOpen(false); }}>⚙️ Settings</button>
          <button className="sidebar-nav-item logout" onClick={onLogout}>🚪 Logout</button>
        </div>
        <div className="sidebar-footer">{user.name}</div>
      </div>

      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
            <h1>
              {view === "profile" && activeProfile ? (
                <><button onClick={goBack} style={{ background: "none", border: "none", fontSize: "1em", cursor: "pointer", padding: 0, marginRight: 8 }}>←</button>{activeProfile.profile.name}</>
              ) : view === "dashboard" ? "Dashboard" : view === "profiles" ? "Profiles" : "Settings"}
            </h1>
          </div>
        </div>

        {/* ─── DASHBOARD ─────────────────────── */}
        {view === "dashboard" && <DashboardView overview={overview} user={user} openProfile={openProfile} refresh={refreshChildren} childList={childList} />}

        {/* ─── PROFILES LIST ─────────────────── */}
        {view === "profiles" && <ProfilesView user={user} childList={childList} openProfile={openProfile} />}

        {/* ─── PROFILE VIEW ──────────────────── */}
        {view === "profile" && activeProfile && (
          <ProfileView data={activeProfile} openProfile={openProfile} refreshChildren={refreshChildren} childList={childList} />
        )}

        {/* ─── SETTINGS ──────────────────────── */}
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
          <div>
            <h3>🤰 {user.name}</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.85em" }}>Mom Profile</p>
          </div>
          <span style={{ fontSize: "1.5em" }}>→</span>
        </div>
        {overview?.mom && (
          <div className="stats-row" style={{ marginTop: 8 }}>
            {overview.mom.has_pregnancy && <div className="stat-box"><span className="stat-value">{overview.mom.gestational_weeks}w</span><span className="stat-label">Pregnant</span></div>}
            <div className="stat-box"><span className="stat-value">{overview.mom.today_supplements}</span><span className="stat-label">Supplements</span></div>
          </div>
        )}
      </div>

      {/* Child Cards */}
      {childList.map(c => {
        const cs = overview?.children?.find(s => s.id === c.id) || {};
        return (
          <div key={c.id} className="card" onClick={() => openProfile("child", c.id)} style={{ cursor: "pointer", borderLeft: "4px solid #60a5fa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3>👶 {c.name}</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.8em" }}>{c.gender || "Baby"} {c.birth_date ? `• Born ${c.birth_date}` : ""}</p>
              </div>
              <span style={{ fontSize: "1.5em" }}>→</span>
            </div>
            <div className="stats-row" style={{ marginTop: 8 }}>
              <div className="stat-box"><span className="stat-value">🍼 {cs.today_feedings || 0}</span><span className="stat-label">Feedings</span></div>
              <div className="stat-box"><span className="stat-value">😴 {Math.round((cs.today_sleep_min || 0) / 60)}h</span><span className="stat-label">Sleep</span></div>
              <div className="stat-box"><span className="stat-value">💩 {cs.today_diapers || 0}</span><span className="stat-label">Diapers</span></div>
              {cs.upcoming_vax > 0 && <div className="stat-box"><span className="stat-value">💉 {cs.upcoming_vax}</span><span className="stat-label">Vax Due</span></div>}
            </div>
          </div>
        );
      })}

      {/* Add Child */}
      {showAdd ? (
        <div className="card" style={{ background: "#f8fafc" }}>
          <h3>➕ Add Child</h3>
          <div className="input-group"><label>Name</label><input type="text" placeholder="Child name" value={newName} onChange={e => setNewName(e.target.value)} /></div>
          <div className="row">
            <div className="input-group"><label>Birth Date</label><input type="date" value={newBday} onChange={e => setNewBday(e.target.value)} /></div>
            <div className="input-group"><label>Gender</label><select value={newGender} onChange={e => setNewGender(e.target.value)}><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={addChild}>Add</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: "Inter" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" style={{ width: "100%", padding: 14, marginTop: 8 }} onClick={() => setShowAdd(true)}>+ Add Child</button>
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
          <div style={{ fontSize: "2em" }}>🤰</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "1.05em" }}>{user.name}</div>
            <div style={{ color: "#94a3b8", fontSize: "0.8em" }}>Mom • Health tracking, pregnancy & recovery</div>
          </div>
          <span style={{ color: "#94a3b8" }}>→</span>
        </div>
      </div>
      {childList.map(c => (
        <div key={c.id} className="card" onClick={() => openProfile("child", c.id)} style={{ cursor: "pointer", borderLeft: "4px solid #60a5fa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: "2em" }}>👶</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "1.05em" }}>{c.name}</div>
              <div style={{ color: "#94a3b8", fontSize: "0.8em" }}>{c.gender || "Baby"} {c.birth_date ? `• ${c.birth_date}` : ""}</div>
            </div>
            <span style={{ color: "#94a3b8" }}>→</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════ PROFILE VIEW ══════════════════════════════

function ProfileView({ data, openProfile, refreshChildren, childList }: {
  data: ProfileData; openProfile: (type: "mom" | "child", childId?: number) => void;
  refreshChildren: () => void; childList: Child[];
}) {
  const d = data.dashboard || {};
  const isMom = data.type === "mom";

  const MOM_TABS = ["home", "cycle", "precon", "pregnancy", "postpartum"] as const;
  const CHILD_TABS = ["home", "feed", "sleep", "growth", "diaper", "temp", "vax", "milestones"] as const;
  const tabs = isMom ? MOM_TABS : CHILD_TABS;
  type Tab = typeof tabs[number];
  const [tab, setTab] = useState<Tab>("home");

  // ─── Mom form states ───────────────────
  const [cyStart, setCyStart] = useState(""); const [cyEnd, setCyEnd] = useState("");
  const [cyFlow, setCyFlow] = useState("medium"); const [cySymp, setCySymp] = useState("");
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
  const [mdSc, setMdSc] = useState(""); const [edSc, setEdSc] = useState("");
  const [mdNt, setMdNt] = useState(""); const [mdMsg, setMdMsg] = useState(""); const [mdSave, setMdSave] = useState(false);
  const [rvBl, setRvBl] = useState("light"); const [rvPn, setRvPn] = useState("");
  const [rvNt, setRvNt] = useState(""); const [rvMsg, setRvMsg] = useState(""); const [rvSave, setRvSave] = useState(false);
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
  const [gH, setGH] = useState(""); const [gW, setGW] = useState("");
  const [gHC, setGHC] = useState(""); const [gDate, setGDate] = useState(() => new Date().toISOString().slice(0, 16));
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
  const [vMsg, setVMsg] = useState(""); const [vSave, setVSave] = useState(false);
  const [msN, setMsN] = useState(""); const [msCat, setMsCat] = useState("motor");
  const [msAge, setMsAge] = useState(""); const [msDate, setMsDate] = useState("");
  const [msMsg, setMsMsg] = useState(""); const [msSave, setMsSave] = useState(false);

  // ─── Mom save handlers ──────────────────
  const cname = isMom ? "" : (data.profile?.name || "");

  const saveCycle = async () => {
    if (!cyStart) { setCyMsg("Start date required"); return; }
    setCySave(true); setCyMsg("");
    const r = await api("preconception/cycle", { method: "POST", body: JSON.stringify({ start_date: cyStart, end_date: cyEnd || null, flow_intensity: cyFlow, symptoms: cySymp }) });
    setCyMsg(r.error ? r.error : "✅ Saved!"); setCyStart(""); setCyEnd(""); setCySave(false);
  };
  const saveSupp = async () => {
    if (!sNm.trim()) return setSMsg("Name required");
    setSSave(true); setSMsg("");
    const r = await api("preconception/supplements", { method: "POST", body: JSON.stringify({ supplement_name: sNm, dosage: sDs }) });
    setSMsg(r.error ? r.error : "✅ Saved!"); setSNm(""); setSDs(""); setSSave(false);
  };
  const saveMeal = async () => {
    if (!mFd.trim()) return setMMsg("Food required");
    setMSave(true); setMMsg("");
    const r = await api("preconception/nutrition", { method: "POST", body: JSON.stringify({ meal_type: mTp, food_items: mFd, calories: mCal ? parseFloat(mCal) : null }) });
    setMMsg(r.error ? r.error : "✅ Saved!"); setMFd(""); setMCal(""); setMSave(false);
  };
  const savePcSleep = async () => {
    if (!psSt || !psEn) return setPsMsg("Times required");
    setPsSave(true); setPsMsg("");
    const r = await api("preconception/sleep", { method: "POST", body: JSON.stringify({ start_time: psSt, end_time: psEn, quality: psQl }) });
    setPsMsg(r.error ? r.error : "✅ Saved!"); setPsSave(false);
  };
  const saveEx = async () => {
    if (!exAct.trim()) return setExMsg("Activity required");
    setExSave(true); setExMsg("");
    const r = await api("preconception/exercise", { method: "POST", body: JSON.stringify({ activity: exAct, duration_minutes: exDur ? parseInt(exDur) : null, intensity: exInt }) });
    setExMsg(r.error ? r.error : "✅ Saved!"); setExAct(""); setExDur(""); setExSave(false);
  };
  const startPreg = async () => {
    if (!lmp) return setPMsg("LMP required");
    setPSave(true); setPMsg("");
    const r = await api("pregnancy/start", { method: "POST", body: JSON.stringify({ lmp_date: lmp }) });
    setPMsg(r.error ? r.error : `✅ Started! Week ${r.gestational_age_weeks}`); setPSave(false);
  };
  const savePW = async () => {
    if (!pw) return setPwMsg("Weight required");
    setPwSave(true); setPwMsg("");
    const r = await api("pregnancy/weight", { method: "POST", body: JSON.stringify({ weight_kg: parseFloat(pw) }) });
    setPwMsg(r.error ? r.error : "✅ Saved!"); setPw(""); setPwSave(false);
  };
  const saveSym = async () => {
    if (!symN.trim()) return setSymMsg("Symptom required");
    setSymSave(true); setSymMsg("");
    const r = await api("pregnancy/symptoms", { method: "POST", body: JSON.stringify({ symptom: symN, severity: symSev }) });
    setSymMsg(r.error ? r.error : "✅ Saved!"); setSymN(""); setSymSave(false);
  };
  const saveBP = async () => {
    if (!bpS || !bpD) return setBpMsg2("Both values required");
    setBpSave2(true); setBpMsg2("");
    const r = await api("pregnancy/vitals/bp", { method: "POST", body: JSON.stringify({ systolic: parseInt(bpS), diastolic: parseInt(bpD) }) });
    setBpMsg2(r.error ? r.error : "✅ Saved!"); setBpS(""); setBpD(""); setBpSave2(false);
  };
  const saveGlu = async () => {
    if (!glu) return setGluMsg("Value required");
    setGluSave(true); setGluMsg("");
    const r = await api("pregnancy/vitals/glucose", { method: "POST", body: JSON.stringify({ glucose_mgdl: parseFloat(glu) }) });
    setGluMsg(r.error ? r.error : "✅ Saved!"); setGlu(""); setGluSave(false);
  };
  const startKicks = async () => { const r = await api("pregnancy/kicks/session", { method: "POST" }); if (!r.error) { setKickS(r); setKickC(0); } };
  const logKick = async () => { if (!kickS) return; await api("pregnancy/kicks/log", { method: "POST", body: JSON.stringify({ session_id: kickS.id }) }); setKickC(c => c + 1); };
  const saveMood = async () => {
    if (!mdSc) return setMdMsg("Score required");
    setMdSave(true); setMdMsg("");
    const r = await api("postpartum/mood", { method: "POST", body: JSON.stringify({ mood_score: parseInt(mdSc), edinburgh_score: edSc ? parseInt(edSc) : null, notes: mdNt }) });
    setMdMsg(r.error ? r.error : "✅ Saved!"); setMdSc(""); setEdSc(""); setMdNt(""); setMdSave(false);
  };
  const saveRecov = async () => {
    setRvSave(true); setRvMsg("");
    const r = await api("postpartum/recovery", { method: "POST", body: JSON.stringify({ bleeding_level: rvBl, pain_level: rvPn ? parseInt(rvPn) : null, notes: rvNt }) });
    setRvMsg(r.error ? r.error : "✅ Saved!"); setRvNt(""); setRvSave(false);
  };
  const saveMed = async () => {
    if (!mdNm.trim()) return setMdSMsg("Name required");
    setMdSSave(true); setMdSMsg("");
    const r = await api("postpartum/medication", { method: "POST", body: JSON.stringify({ medication_name: mdNm, dosage: mdDs, frequency: mdFr }) });
    setMdSMsg(r.error ? r.error : "✅ Saved!"); setMdNm(""); setMdDs(""); setMdFr(""); setMdSSave(false);
  };
  const savePpSleep = async () => {
    if (!ppSt || !ppEn) return setPpMsg("Times required");
    setPpSave(true); setPpMsg("");
    const r = await api("postpartum/sleep", { method: "POST", body: JSON.stringify({ start_time: ppSt, end_time: ppEn, quality: ppQl }) });
    setPpMsg(r.error ? r.error : "✅ Saved!"); setPpSave(false);
  };

  // ─── Child save handlers ────────────────
  const saveFeed = async () => {
    if (!fQty || parseFloat(fQty) <= 0) return setFMsg("Quantity required");
    setFSave(true); setFMsg("");
    const body: any = { feed_type: ftype, quantity: parseFloat(fQty), unit: fUnit, feed_time: fTime, child_name: cname };
    if (ftype === "food") body.food_name = fName || "Food";
    if (ftype === "breast") body.breast_side = fSide || null;
    const r = await api("feedings", { method: "POST", body: JSON.stringify(body) });
    setFMsg(r.error ? r.error : "✅ Saved!"); setFQty(""); setFName(""); setFSave(false);
  };
  const saveSleep2 = async () => {
    if (!sSt || !sEn) return setSMsg2("Times required");
    setSSave2(true); setSMsg2("");
    const r = await api("sleep", { method: "POST", body: JSON.stringify({ sleep_type: sTy, start_time: sSt, end_time: sEn, quality: sQl, child_name: cname }) });
    setSMsg2(r.error ? r.error : "✅ Saved!"); setSSave2(false);
  };
  const saveGrowth = async () => {
    setGSave(true); setGMsg("");
    const r = await api("growth", { method: "POST", body: JSON.stringify({ height_cm: gH ? parseFloat(gH) : null, weight_kg: gW ? parseFloat(gW) : null, head_circumference_cm: gHC ? parseFloat(gHC) : null, recorded_at: gDate, child_name: cname }) });
    setGMsg(r.error ? r.error : "✅ Saved!"); setGH(""); setGW(""); setGHC(""); setGSave(false);
  };
  const saveDiaper = async () => {
    setDSave(true); setDMsg("");
    const r = await api("diaper", { method: "POST", body: JSON.stringify({ diaper_type: dTy, color: dCol, consistency: dCon, recorded_at: dTime, child_name: cname }) });
    setDMsg(r.error ? r.error : "✅ Saved!"); setDCol(""); setDCon(""); setDSave(false);
  };
  const saveTemp = async () => {
    if (!tVal) return setTMsg("Temperature required");
    setTSave(true); setTMsg("");
    const r = await api("temperature", { method: "POST", body: JSON.stringify({ temperature: parseFloat(tVal), unit: tUnit, method: tMeth, symptoms: tSymp, recorded_at: tTime, child_name: cname }) });
    setTMsg(r.error ? r.error : "✅ Saved!"); setTVal(""); setTSymp(""); setTSave(false);
  };
  const saveVax = async () => {
    if (!vNm.trim() || !vDate) return setVMsg("Name and date required");
    setVSave(true); setVMsg("");
    const r = await api("vaccinations", { method: "POST", body: JSON.stringify({ vaccine_name: vNm, scheduled_date: vDate, administered_date: vAdmin || null, dose_number: parseInt(vDose) || 1, child_name: cname }) });
    setVMsg(r.error ? r.error : "✅ Saved!"); setVNm(""); setVDate(""); setVAdmin(""); setVSave(false);
  };
  const saveMs = async () => {
    if (!msN.trim()) return setMsMsg("Name required");
    setMsSave(true); setMsMsg("");
    const r = await api("milestones", { method: "POST", body: JSON.stringify({ milestone: msN, category: msCat, expected_age_months: msAge ? parseInt(msAge) : null, achieved_date: msDate || null, child_name: cname }) });
    setMsMsg(r.error ? r.error : "✅ Saved!"); setMsN(""); setMsSave(false);
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
      {/* Tab bar */}
      <div className="toggle-group" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)} style={{ fontSize: "0.82em", padding: "8px 12px" }}>
            {t === "home" ? "🏠 Home" : t === "cycle" ? "📅 Cycle" : t === "precon" ? "💊 Pre-Con" : t === "pregnancy" ? "🤰 Preg" : t === "postpartum" ? "🌸 Postpartum" :
              t === "feed" ? "🍼 Feed" : t === "sleep" ? "😴 Sleep" : t === "growth" ? "📏 Growth" : t === "diaper" ? "💩 Diaper" : t === "temp" ? "🌡️ Temp" : t === "vax" ? "💉 Vax" : "🎯 Milestones"}
          </button>
        ))}
      </div>

      {/* ========== MOM HOME ========== */}
      {isMom && tab === "home" && (
        <div>
          <div className="card">
            <h3>📊 Today's Summary</h3>
            <div className="stats-row">
              <div className="stat-box"><span className="stat-value">{d.today?.supplements || 0}</span><span className="stat-label">Supplements</span></div>
              <div className="stat-box"><span className="stat-value">{d.today?.meals || 0}</span><span className="stat-label">Meals</span></div>
              <div className="stat-box"><span className="stat-value">{d.today?.exercise || 0}</span><span className="stat-label">Exercise</span></div>
            </div>
          </div>
          {d.pregnancy && (
            <div className="card">
              <h3>🤰 Pregnancy</h3>
              <div className="stats-row">
                <div className="stat-box"><span className="stat-value">{d.pregnancy.gestational_age_weeks}w</span><span className="stat-label">Weeks</span></div>
                <div className="stat-box"><span className="stat-value">{d.pregnancy.due_date}</span><span className="stat-label">Due</span></div>
              </div>
            </div>
          )}
          {d.recent_mood?.id && (
            <div className="card">
              <h3>😊 Last Mood</h3>
              <div style={{ textAlign: "center", fontSize: "2em", fontWeight: 800, color: d.recent_mood.mood_score >= 7 ? "#16a34a" : d.recent_mood.mood_score >= 4 ? "#f59e0b" : "#ef4444" }}>
                {d.recent_mood.mood_score}/10
                {d.recent_mood.edinburgh_score && <div style={{ fontSize: "0.4em", color: "#94a3b8" }}>Edinburgh: {d.recent_mood.edinburgh_score}/30</div>}
              </div>
            </div>
          )}
          {d.pending_meds > 0 && <div className="card" style={{ borderLeft: "4px solid #ef4444" }}><h3>💊 {d.pending_meds} medication{ d.pending_meds !== 1 ? "s" : ""} pending</h3></div>}
        </div>
      )}

      {/* ========== CHILD HOME ========== */}
      {!isMom && tab === "home" && (
        <div>
          <div className="card">
            <h3>📊 Today's Summary</h3>
            <div className="stats-row">
              <div className="stat-box"><span className="stat-value">🍼 {d.today?.feedings || 0}</span><span className="stat-label">Feedings</span></div>
              <div className="stat-box"><span className="stat-value">😴 {Math.round((d.today?.sleep_minutes || 0) / 60)}h</span><span className="stat-label">Sleep</span></div>
              <div className="stat-box"><span className="stat-value">💩 {d.today?.diapers || 0}</span><span className="stat-label">Diapers</span></div>
            </div>
          </div>
          {d.latest_growth?.id && (
            <div className="card">
              <h3>📏 Latest Growth</h3>
              <div className="stats-row">
                {d.latest_growth.weight_kg && <div className="stat-box"><span className="stat-value">{d.latest_growth.weight_kg}kg</span><span className="stat-label">Weight</span></div>}
                {d.latest_growth.height_cm && <div className="stat-box"><span className="stat-value">{d.latest_growth.height_cm}cm</span><span className="stat-label">Height</span></div>}
                {d.latest_growth.head_circumference_cm && <div className="stat-box"><span className="stat-value">{d.latest_growth.head_circumference_cm}cm</span><span className="stat-label">Head</span></div>}
              </div>
            </div>
          )}
          {d.latest_temp?.id && (
            <div className="card">
              <h3>🌡️ Last Temp</h3>
              <div style={{ textAlign: "center", fontSize: "2em", fontWeight: 800, padding: 10, color: d.latest_temp.temperature > (d.latest_temp.unit === "C" ? 38 : 100.4) ? "#ef4444" : "#16a34a" }}>
                {d.latest_temp.temperature}°{d.latest_temp.unit}
              </div>
            </div>
          )}
          {(d.upcoming_vaccines || []).length > 0 && (
            <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <h3>💉 {d.upcoming_vaccines.length} vaccines due</h3>
              {d.upcoming_vaccines.map((v: any) => (
                <div key={v.id} className="feed-item">
                  <div className="feed-icon" style={{ background: "#ede9fe" }}>💉</div>
                  <div className="feed-details">
                    <div className="feed-type">{v.vaccine_name} (Dose {v.dose_number})</div>
                    <div className="feed-meta">Due: {v.scheduled_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Recent activity */}
          {d.recent_feedings?.length > 0 && (
            <div className="card"><h3>🍼 Recent</h3>{(d.recent_feedings || []).slice(0, 5).map((f: any) => (
              <div key={f.id} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.85em", display: "flex", justifyContent: "space-between" }}>
                <span>{f.feed_type === "breast" ? `🤱 ${f.breast_side || "breast"}` : f.feed_type === "bottle" ? "🍼 Bottle" : `🥣 ${f.food_name || "Food"}`}</span>
                <span style={{ color: "#94a3b8" }}>{f.quantity}{f.unit} • {new Date(f.feed_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* ========== MOM CYCLE ========== */}
      {isMom && tab === "cycle" && (
        <div>
          <div className="card"><h3>📅 Log Cycle</h3>
            <div className="row"><div className="input-group"><label>Start</label><input type="date" value={cyStart} onChange={e => setCyStart(e.target.value)} /></div>
              <div className="input-group"><label>End</label><input type="date" value={cyEnd} onChange={e => setCyEnd(e.target.value)} /></div></div>
            <div className="row"><div className="input-group"><label>Flow</label><select value={cyFlow} onChange={e => setCyFlow(e.target.value)}><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option></select></div>
              <div className="input-group"><label>Symptoms</label><input type="text" value={cySymp} onChange={e => setCySymp(e.target.value)} /></div></div>
            {cyMsg && msgBox(cyMsg)}<button className="btn btn-primary" onClick={saveCycle} disabled={cySave}>💾 Save</button>
          </div>
        </div>
      )}

      {/* ========== MOM PRE-CON ========== */}
      {isMom && tab === "precon" && (
        <div>
          <div className="card"><h3>💊 Supplement</h3>
            <div className="row"><div className="input-group"><label>Name</label><input type="text" placeholder="e.g. Folic Acid" value={sNm} onChange={e => setSNm(e.target.value)} /></div>
              <div className="input-group"><label>Dosage</label><input type="text" placeholder="e.g. 400mcg" value={sDs} onChange={e => setSDs(e.target.value)} /></div></div>
            {sMsg && msgBox(sMsg)}<button className="btn btn-primary" onClick={saveSupp} disabled={sSave}>💾 Save</button></div>
          <div className="card"><h3>🍽 Nutrition</h3>
            <div className="input-group"><label>Meal</label><select value={mTp} onChange={e => setMTp(e.target.value)}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></select></div>
            <div className="row"><div className="input-group"><label>Food</label><input type="text" placeholder="What did you eat?" value={mFd} onChange={e => setMFd(e.target.value)} /></div>
              <div className="input-group"><label>Cal</label><input type="number" value={mCal} onChange={e => setMCal(e.target.value)} /></div></div>
            {mMsg && msgBox(mMsg)}<button className="btn btn-primary" onClick={saveMeal} disabled={mSave}>💾 Save</button></div>
          <div className="card"><h3>😴 Sleep</h3>
            <div className="row"><div className="input-group"><label>Bed</label><input type="datetime-local" value={psSt} onChange={e => setPsSt(e.target.value)} /></div>
              <div className="input-group"><label>Wake</label><input type="datetime-local" value={psEn} onChange={e => setPsEn(e.target.value)} /></div></div>
            <div className="input-group"><label>Quality</label><select value={psQl} onChange={e => setPsQl(e.target.value)}><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option><option value="excellent">Excellent</option></select></div>
            {psMsg && msgBox(psMsg)}<button className="btn btn-primary" onClick={savePcSleep} disabled={psSave}>💾 Save</button></div>
          <div className="card"><h3>🏃 Exercise</h3>
            <div className="input-group"><label>Activity</label><input type="text" placeholder="e.g. Walking" value={exAct} onChange={e => setExAct(e.target.value)} /></div>
            <div className="row"><div className="input-group"><label>Duration (min)</label><input type="number" value={exDur} onChange={e => setExDur(e.target.value)} /></div>
              <div className="input-group"><label>Intensity</label><select value={exInt} onChange={e => setExInt(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div>
            {exMsg && msgBox(exMsg)}<button className="btn btn-primary" onClick={saveEx} disabled={exSave}>💾 Save</button></div>
        </div>
      )}

      {/* ========== MOM PREGNANCY ========== */}
      {isMom && tab === "pregnancy" && (
        <div>
          {!d.pregnancy?.id && (
            <div className="card"><h3>🤰 Confirm Pregnancy</h3>
              <div className="input-group"><label>Last Period</label><input type="date" value={lmp} onChange={e => setLmp(e.target.value)} /></div>
              {pMsg && msgBox(pMsg)}<button className="btn btn-primary" onClick={startPreg} disabled={pSave}>🤰 Start</button></div>
          )}
          {d.pregnancy?.id && (<>
            <div className="card"><h3>📊 Status</h3>
              <div className="stats-row"><div className="stat-box"><span className="stat-value">{d.pregnancy.gestational_age_weeks}w</span><span className="stat-label">Weeks</span></div>
                <div className="stat-box"><span className="stat-value">{d.pregnancy.due_date}</span><span className="stat-label">Due</span></div></div></div>
            <div className="card"><h3>⚖️ Weight</h3>
              <div className="input-group"><label>Weight (kg)</label><input type="number" step="0.1" value={pw} onChange={e => setPw(e.target.value)} /></div>
              {pwMsg && msgBox(pwMsg)}<button className="btn btn-primary" onClick={savePW} disabled={pwSave}>💾 Save</button></div>
            <div className="card"><h3>🤒 Symptoms</h3>
              <div className="row"><div className="input-group"><label>Symptom</label><input type="text" value={symN} onChange={e => setSymN(e.target.value)} /></div>
                <div className="input-group"><label>Severity</label><select value={symSev} onChange={e => setSymSev(e.target.value)}><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select></div></div>
              {symMsg && msgBox(symMsg)}<button className="btn btn-primary" onClick={saveSym} disabled={symSave}>💾 Save</button></div>
            <div className="card"><h3>🩺 Vitals</h3>
              <div className="row"><div className="input-group"><label>Systolic</label><input type="number" value={bpS} onChange={e => setBpS(e.target.value)} /></div>
                <div className="input-group"><label>Diastolic</label><input type="number" value={bpD} onChange={e => setBpD(e.target.value)} /></div></div>
              {bpMsg2 && msgBox(bpMsg2)}<button className="btn btn-primary" onClick={saveBP} disabled={bpSave2}>💾 BP</button>
              <div style={{ marginTop: 14 }}><div className="input-group"><label>Glucose (mg/dL)</label><input type="number" value={glu} onChange={e => setGlu(e.target.value)} /></div>
                {gluMsg && msgBox(gluMsg)}<button className="btn btn-primary" onClick={saveGlu} disabled={gluSave}>💾 Glucose</button></div></div>
            {d.pregnancy.gestational_age_weeks >= 24 && (
              <div className="card"><h3>🦶 Kick Counter</h3>
                {!kickS ? <button className="btn btn-primary" onClick={startKicks}>▶ Start</button> : <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "3em", fontWeight: 800, color: "#6366f1" }}>{kickC}</div>
                  <button className="btn btn-primary" onClick={logKick}>👣 Kick</button></div>}</div>
            )}
          </>)}
        </div>
      )}

      {/* ========== MOM POSTPARTUM ========== */}
      {isMom && tab === "postpartum" && (
        <div>
          <div className="card"><h3>😊 Mood</h3>
            <div className="row"><div className="input-group"><label>Mood (1-10)</label><input type="number" min="1" max="10" value={mdSc} onChange={e => setMdSc(e.target.value)} /></div>
              <div className="input-group"><label>Edinburgh (0-30)</label><input type="number" min="0" max="30" value={edSc} onChange={e => setEdSc(e.target.value)} /></div></div>
            <div className="input-group"><label>Notes</label><input type="text" value={mdNt} onChange={e => setMdNt(e.target.value)} /></div>
            {mdMsg && msgBox(mdMsg)}<button className="btn btn-primary" onClick={saveMood} disabled={mdSave}>💾 Save</button></div>
          <div className="card"><h3>🩹 Recovery</h3>
            <div className="row"><div className="input-group"><label>Bleeding</label><select value={rvBl} onChange={e => setRvBl(e.target.value)}><option value="none">None</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="heavy">Heavy</option></select></div>
              <div className="input-group"><label>Pain (0-10)</label><input type="number" min="0" max="10" value={rvPn} onChange={e => setRvPn(e.target.value)} /></div></div>
            <div className="input-group"><label>Notes</label><input type="text" value={rvNt} onChange={e => setRvNt(e.target.value)} /></div>
            {rvMsg && msgBox(rvMsg)}<button className="btn btn-primary" onClick={saveRecov} disabled={rvSave}>💾 Save</button></div>
          <div className="card"><h3>💊 Medication</h3>
            <div className="row"><div className="input-group"><label>Name</label><input type="text" value={mdNm} onChange={e => setMdNm(e.target.value)} /></div>
              <div className="input-group"><label>Dosage</label><input type="text" value={mdDs} onChange={e => setMdDs(e.target.value)} /></div></div>
            <div className="input-group"><label>Frequency</label><input type="text" value={mdFr} onChange={e => setMdFr(e.target.value)} /></div>
            {mdSMsg && msgBox(mdSMsg)}<button className="btn btn-primary" onClick={saveMed} disabled={mdSSave}>💾 Save</button></div>
          <div className="card"><h3>😴 Sleep</h3>
            <div className="row"><div className="input-group"><label>Bed</label><input type="datetime-local" value={ppSt} onChange={e => setPpSt(e.target.value)} /></div>
              <div className="input-group"><label>Wake</label><input type="datetime-local" value={ppEn} onChange={e => setPpEn(e.target.value)} /></div></div>
            <div className="input-group"><label>Quality</label><select value={ppQl} onChange={e => setPpQl(e.target.value)}><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option><option value="excellent">Excellent</option></select></div>
            {ppMsg && msgBox(ppMsg)}<button className="btn btn-primary" onClick={savePpSleep} disabled={ppSave}>💾 Save</button></div>
        </div>
      )}

      {/* ========== CHILD FEED ========== */}
      {!isMom && tab === "feed" && (
        <div>
          <div className="card"><h3>🍽 Feeding</h3>
            <div className="toggle-group"><button className={ftype === "breast" ? "active" : ""} onClick={() => setFtype("breast")}>🤱 Breast</button><button className={ftype === "bottle" ? "active" : ""} onClick={() => setFtype("bottle")}>🍼 Bottle</button><button className={ftype === "food" ? "active" : ""} onClick={() => setFtype("food")}>🥣 Food</button></div>
            {ftype === "breast" && <div className="input-group"><label>Side</label><select value={fSide} onChange={e => setFSide(e.target.value)}><option value="">Both</option><option value="left">Left</option><option value="right">Right</option></select></div>}
            {ftype === "food" && <div className="input-group"><label>What food?</label><input type="text" value={fName} onChange={e => setFName(e.target.value)} /></div>}
            <div className="row"><div className="input-group"><label>Qty</label><input type="number" step="0.1" value={fQty} onChange={e => setFQty(e.target.value)} /></div>
              <div className="input-group"><label>Unit</label><select value={fUnit} onChange={e => setFUnit(e.target.value)}><option value="oz">oz</option><option value="ml">ml</option><option value="tbsp">tbsp</option></select></div></div>
            <div className="input-group"><label>When</label><input type="datetime-local" value={fTime} onChange={e => setFTime(e.target.value)} /></div>
            {fMsg && msgBox(fMsg)}<button className="btn btn-primary" onClick={saveFeed} disabled={fSave}>💾 Save</button></div>
          {(d.recent_feedings || []).map((f: any) => (
            <div className="card" key={f.id} style={{ padding: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: "1.5em" }}>{f.feed_type === "breast" ? "🤱" : f.feed_type === "bottle" ? "🍼" : "🥣"}</div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: "0.9em" }}>{f.feed_type === "breast" ? `Breast ${f.breast_side || ""}` : f.feed_type === "bottle" ? "Bottle" : f.food_name || "Food"}</div>
                  <div style={{ fontSize: "0.75em", color: "#94a3b8" }}>{new Date(f.feed_time).toLocaleString()}</div></div>
                <div style={{ fontWeight: 600 }}>{f.quantity}{f.unit}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== CHILD SLEEP ========== */}
      {!isMom && tab === "sleep" && (
        <div>
          <div className="card"><h3>😴 Sleep</h3>
            <div className="toggle-group"><button className={sTy === "nap" ? "active" : ""} onClick={() => setSTy("nap")}>😴 Nap</button><button className={sTy === "nighttime" ? "active" : ""} onClick={() => setSTy("nighttime")}>🌙 Night</button></div>
            <div className="row"><div className="input-group"><label>Start</label><input type="datetime-local" value={sSt} onChange={e => setSSt(e.target.value)} /></div>
              <div className="input-group"><label>End</label><input type="datetime-local" value={sEn} onChange={e => setSEn(e.target.value)} /></div></div>
            <div className="input-group"><label>Quality</label><select value={sQl} onChange={e => setSQl(e.target.value)}><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option><option value="excellent">Excellent</option></select></div>
            {sMsg2 && msgBox(sMsg2)}<button className="btn btn-primary" onClick={saveSleep2} disabled={sSave2}>💾 Save</button></div>
          {sleepChart.length > 0 && <div className="card"><h3>📊 Chart</h3><div style={{ height: 180 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={sleepChart} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#94a3b8" }} /><YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit="m" /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="nap" name="Nap" fill="#a78bfa" radius={[6, 6, 0, 0]} /><Bar dataKey="night" name="Night" fill="#6366f1" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>}
          {(d.recent_sleep || []).map((s: any) => (
            <div className="card" key={s.id} style={{ padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85em" }}><span>{s.sleep_type === "nap" ? "😴 Nap" : "🌙 Night"}</span><span style={{ color: "#94a3b8" }}>{new Date(s.start_time).toLocaleDateString()} • {s.duration_minutes}m</span></div></div>
          ))}
        </div>
      )}

      {/* ========== CHILD GROWTH ========== */}
      {!isMom && tab === "growth" && (
        <div>
          <div className="card"><h3>📏 Growth</h3>
            <div className="row"><div className="input-group"><label>Height (cm)</label><input type="number" step="0.1" value={gH} onChange={e => setGH(e.target.value)} /></div>
              <div className="input-group"><label>Weight (kg)</label><input type="number" step="0.01" value={gW} onChange={e => setGW(e.target.value)} /></div></div>
            <div className="row"><div className="input-group"><label>Head (cm)</label><input type="number" step="0.1" value={gHC} onChange={e => setGHC(e.target.value)} /></div>
              <div className="input-group"><label>Date</label><input type="datetime-local" value={gDate} onChange={e => setGDate(e.target.value)} /></div></div>
            {gMsg && msgBox(gMsg)}<button className="btn btn-primary" onClick={saveGrowth} disabled={gSave}>💾 Save</button></div>
        </div>
      )}

      {/* ========== CHILD DIAPER ========== */}
      {!isMom && tab === "diaper" && (
        <div>
          <div className="card"><h3>💩 Diaper</h3>
            <div className="toggle-group"><button className={dTy === "wet" ? "active" : ""} onClick={() => setDTy("wet")}>💧 Wet</button><button className={dTy === "dirty" ? "active" : ""} onClick={() => setDTy("dirty")}>💩 Dirty</button><button className={dTy === "both" ? "active" : ""} onClick={() => setDTy("both")}>Both</button></div>
            <div className="row"><div className="input-group"><label>Color</label><input type="text" value={dCol} onChange={e => setDCol(e.target.value)} /></div>
              <div className="input-group"><label>Consistency</label><input type="text" value={dCon} onChange={e => setDCon(e.target.value)} /></div></div>
            <div className="input-group"><label>When</label><input type="datetime-local" value={dTime} onChange={e => setDTime(e.target.value)} /></div>
            {dMsg && msgBox(dMsg)}<button className="btn btn-primary" onClick={saveDiaper} disabled={dSave}>💾 Save</button></div>
          {diaperChart.length > 0 && <div className="card"><h3>📊</h3><div style={{ height: 180 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={diaperChart} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#94a3b8" }} /><YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Bar dataKey="wet" name="Wet" fill="#60a5fa" radius={[6, 6, 0, 0]} /><Bar dataKey="dirty" name="Dirty" fill="#fbbf24" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>}
        </div>
      )}

      {/* ========== CHILD TEMP ========== */}
      {!isMom && tab === "temp" && (
        <div>
          <div className="card"><h3>🌡️ Temperature</h3>
            <div className="row"><div className="input-group"><label>Temp</label><input type="number" step="0.1" value={tVal} onChange={e => setTVal(e.target.value)} /></div>
              <div className="input-group"><label>Unit</label><select value={tUnit} onChange={e => setTUnit(e.target.value)}><option value="F">°F</option><option value="C">°C</option></select></div></div>
            <div className="input-group"><label>Method</label><select value={tMeth} onChange={e => setTMeth(e.target.value)}><option value="oral">Oral</option><option value="rectal">Rectal</option><option value="axillary">Axillary</option><option value="ear">Ear</option><option value="forehead">Forehead</option></select></div>
            <div className="input-group"><label>Symptoms</label><input type="text" value={tSymp} onChange={e => setTSymp(e.target.value)} /></div>
            <div className="input-group"><label>When</label><input type="datetime-local" value={tTime} onChange={e => setTTime(e.target.value)} /></div>
            {tMsg && msgBox(tMsg)}<button className="btn btn-primary" onClick={saveTemp} disabled={tSave}>💾 Save</button></div>
        </div>
      )}

      {/* ========== CHILD VAX ========== */}
      {!isMom && tab === "vax" && (
        <div>
          <div className="card"><h3>💉 Vaccine</h3>
            <div className="input-group"><label>Name</label><input type="text" value={vNm} onChange={e => setVNm(e.target.value)} /></div>
            <div className="row"><div className="input-group"><label>Date</label><input type="date" value={vDate} onChange={e => setVDate(e.target.value)} /></div>
              <div className="input-group"><label>Dose #</label><input type="number" min="1" value={vDose} onChange={e => setVDose(e.target.value)} /></div></div>
            <div className="input-group"><label>Admin Date</label><input type="date" value={vAdmin} onChange={e => setVAdmin(e.target.value)} /></div>
            {vMsg && msgBox(vMsg)}<button className="btn btn-primary" onClick={saveVax} disabled={vSave}>💾 Save</button></div>
          {(d.upcoming_vaccines || []).map((v: any) => (
            <div className="card" key={v.id} style={{ padding: 10, opacity: v.administered_date ? 0.5 : 1 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85em" }}>
                <span>{v.vaccine_name} (D{v.dose_number})</span>
                <span style={{ color: "#94a3b8" }}>{v.administered_date ? `✅ ${v.administered_date}` : `📅 ${v.scheduled_date}`}</span>
            </div></div>
          ))}
        </div>
      )}

      {/* ========== CHILD MILESTONES ========== */}
      {!isMom && tab === "milestones" && (
        <div>
          <div className="card"><h3>🎯 Milestone</h3>
            <div className="input-group"><label>Name</label><input type="text" value={msN} onChange={e => setMsN(e.target.value)} /></div>
            <div className="row"><div className="input-group"><label>Category</label><select value={msCat} onChange={e => setMsCat(e.target.value)}><option value="motor">Motor</option><option value="cognitive">Cognitive</option><option value="social">Social</option><option value="language">Language</option></select></div>
              <div className="input-group"><label>Expected (mo)</label><input type="number" value={msAge} onChange={e => setMsAge(e.target.value)} /></div></div>
            <div className="input-group"><label>Achieved</label><input type="date" value={msDate} onChange={e => setMsDate(e.target.value)} /></div>
            {msMsg && msgBox(msMsg)}<button className="btn btn-primary" onClick={saveMs} disabled={msSave}>💾 Save</button></div>
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
    setMsg("✅ Mom profile saved!"); setSaving(false); setEditing(null);
  };

  const startEditChild = (c: Child) => { setEditChildId(c.id); setCName(c.name); setCBday(c.birth_date || ""); setCGender(c.gender || ""); setEditing("child"); };

  const saveChild = async () => {
    if (!editChildId) return;
    setSaving(true); setMsg("");
    await api(`children/${editChildId}`, { method: "PUT", body: JSON.stringify({ name: cName, birth_date: cBday || null, gender: cGender || null }) });
    setMsg("✅ Child saved!"); setSaving(false); setEditing(null); refresh();
  };

  const addChild = async () => {
    if (!cName.trim()) return;
    setSaving(true); setMsg("");
    const r = await api("children", { method: "POST", body: JSON.stringify({ name: cName, birth_date: cBday || null, gender: cGender || null }) });
    setMsg(r.error ? r.error : "✅ Child added!"); setSaving(false); setEditing(null); setCName(""); setCBday(""); setCGender(""); refresh();
  };

  return (
    <div>
      <h3 style={{ marginBottom: 12, color: "#64748b" }}>Edit Profiles</h3>

      {/* Mom Profile */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>🤰 Mom Profile</h3>
          <button onClick={() => setEditing(editing === "mom" ? null : "mom")} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.9em", fontWeight: 600 }}>
            {editing === "mom" ? "Cancel" : "Edit"}
          </button>
        </div>
        {editing === "mom" ? (
          <div>
            <div className="input-group"><label>Name</label><input type="text" value={momName} onChange={e => setMomName(e.target.value)} /></div>
            <div className="input-group"><label>Phone</label><input type="text" value={momPhone} onChange={e => setMomPhone(e.target.value)} /></div>
            <div className="row"><div className="input-group"><label>Date of Birth</label><input type="date" value={momDob} onChange={e => setMomDob(e.target.value)} /></div>
              <div className="input-group"><label>Blood Type</label><input type="text" placeholder="e.g. O+" value={momBt} onChange={e => setMomBt(e.target.value)} /></div></div>
            <div className="row"><div className="input-group"><label>Height (cm)</label><input type="number" value={momHt} onChange={e => setMomHt(e.target.value)} /></div>
              <div className="input-group"><label>Pre-Preg Weight (kg)</label><input type="number" value={momWt} onChange={e => setMomWt(e.target.value)} /></div></div>
            {msg && msgBox(msg)}<button className="btn btn-primary" onClick={saveMom} disabled={saving}>💾 Save Mom</button>
          </div>
        ) : <p style={{ color: "#94a3b8", fontSize: "0.85em" }}>{user.name} • {user.email}</p>}
      </div>

      {/* Children */}
      {childList.map(c => (
        <div key={c.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>👶 {c.name}</h3>
            <button onClick={() => startEditChild(c)} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.9em", fontWeight: 600 }}>Edit</button>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.8em" }}>{c.gender || "N/A"} {c.birth_date ? `• ${c.birth_date}` : ""}</p>
        </div>
      ))}

      {/* Add/Edit Child Form */}
      {editing === "child" && (
        <div className="card" style={{ background: "#f8fafc" }}>
          <h3>{editChildId ? `Edit ${cName}` : "➕ Add Child"}</h3>
          <div className="input-group"><label>Name</label><input type="text" value={cName} onChange={e => setCName(e.target.value)} /></div>
          <div className="row"><div className="input-group"><label>Birth Date</label><input type="date" value={cBday} onChange={e => setCBday(e.target.value)} /></div>
            <div className="input-group"><label>Gender</label><select value={cGender} onChange={e => setCGender(e.target.value)}><option value="">—</option><option value="male">Male</option><option value="female">Female</option></select></div></div>
          {msg && msgBox(msg)}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={editChildId ? saveChild : addChild} disabled={saving}>💾 Save</button>
            <button onClick={() => { setEditing(null); setEditChildId(null); }} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", fontFamily: "Inter" }}>Cancel</button>
          </div>
        </div>
      )}

      {editing !== "child" && <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={() => { setEditChildId(null); setCName(""); setCBday(""); setCGender(""); setEditing("child"); }}>+ Add Child</button>}
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

  if (loading) return <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}><div style={{ fontSize: "2em" }}>🤰</div></div>;
  if (!user) return <AuthScreen onLogin={(u, c) => { setUser(u); setChildren(c); }} />;
  return <AppShell user={user} children={children} onLogout={() => { localStorage.removeItem("token"); setUser(null); }} />;
}
