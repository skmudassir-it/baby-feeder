"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";

// ═══════════════════════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════════════════════

async function api(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/proxy/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface User { id: number; email: string; name: string; baby_name: string; }
interface Child { id: number; name: string; birth_date: string; gender: string; }
interface AppData {
  user: User; children: Child[];
  feedings: any[]; growth: any[]; sleep: any[]; diapers: any[];
  temps: any[]; vax: any[]; milestones: any[];
  dashboard: any;
}

// ═══════════════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════════════

function AuthScreen({ onLogin }: { onLogin: (data: AppData) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [name, setName] = useState(""); const [babyName, setBabyName] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const data = mode === "register"
        ? await api("register", { method: "POST", body: JSON.stringify({ email, password, name: name || "Parent", baby_name: babyName }) })
        : await api("login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (data.error) { setError(data.error); return; }
      localStorage.setItem("token", data.token);
      const meData = await api("me");
      onLogin({ user: data.user || meData.user, children: meData.children || [], feedings: [], growth: [], sleep: [], diapers: [], temps: [], vax: [], milestones: [], dashboard: {} });
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ justifyContent: "center" }}>
      <div className="header"><h1>🍼 Baby Tracker</h1><div className="subtitle">Complete baby care companion</div></div>
      <div className="auth-tabs">
        <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Login</button>
        <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Register</button>
      </div>
      <div className="auth-card">
        <h2>{mode === "login" ? "👋 Welcome back" : "✨ Create account"}</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}
          {mode === "register" && <>
            <div className="input-group"><label>Your Name</label><input type="text" placeholder="Parent name" value={name} onChange={e => setName(e.target.value)} /></div>
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

// ═══════════════════════════════════════════════════════════════
// TAB ICONS MAP
// ═══════════════════════════════════════════════════════════════

const TABS = [
  { key: "home", icon: "🏠", label: "Home" },
  { key: "feed", icon: "🍼", label: "Feed" },
  { key: "sleep", icon: "😴", label: "Sleep" },
  { key: "growth", icon: "📏", label: "Growth" },
  { key: "diaper", icon: "💩", label: "Diaper" },
  { key: "temp", icon: "🌡️", label: "Temp" },
  { key: "vax", icon: "💉", label: "Vax" },
  { key: "milestones", icon: "🎯", label: "Milestones" },
] as const;

type TabKey = typeof TABS[number]["key"];

// ═══════════════════════════════════════════════════════════════
// SHARED: Child Selector
// ═══════════════════════════════════════════════════════════════

function ChildPicker({ children, selected, onSelect, onAdd }: {
  children: Child[]; selected: string; onSelect: (n: string) => void; onAdd: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
      {children.map(c => (
        <button key={c.id}
          className={selected === c.name ? "active-tab" : ""}
          style={{ padding: "6px 14px", borderRadius: 20, fontSize: "0.8em", border: "1px solid rgba(255,255,255,0.2)", background: selected === c.name ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", fontFamily: "Inter" }}
          onClick={() => onSelect(c.name)}>
          👶 {c.name}
        </button>
      ))}
      <button onClick={onAdd} style={{ padding: "6px 12px", borderRadius: 20, fontSize: "0.8em", border: "1px dashed rgba(255,255,255,0.3)", background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "Inter" }}>+ Add Child</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════

function Dashboard({ data, onLogout, refresh, child, setChild }: {
  data: AppData; onLogout: () => void; refresh: () => void;
  child: string; setChild: (n: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");

  const d = data.dashboard || {};
  const t = d.today || {};

  // ─── Feed Form State ────────────────────────────
  const [feedType, setFeedType] = useState<"milk" | "food">("milk");
  const [foodName, setFoodName] = useState("");
  const [feedQty, setFeedQty] = useState("");
  const [feedUnit, setFeedUnit] = useState("oz");
  const [feedTime, setFeedTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [feedMsg, setFeedMsg] = useState(""); const [feedSaving, setFeedSaving] = useState(false);

  // ─── Sleep Form State ────────────────────────────
  const [sleepType, setSleepType] = useState<"nap" | "nighttime">("nap");
  const [sleepStart, setSleepStart] = useState(() => new Date().toISOString().slice(0, 16));
  const [sleepEnd, setSleepEnd] = useState(() => new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [sleepQuality, setSleepQuality] = useState("good");
  const [sleepMsg, setSleepMsg] = useState(""); const [sleepSaving, setSleepSaving] = useState(false);

  // ─── Growth Form State ───────────────────────────
  const [growthH, setGrowthH] = useState(""); const [growthW, setGrowthW] = useState("");
  const [growthHC, setGrowthHC] = useState(""); const [growthDate, setGrowthDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [growthMsg, setGrowthMsg] = useState(""); const [growthSaving, setGrowthSaving] = useState(false);

  // ─── Diaper Form State ───────────────────────────
  const [diaperType, setDiaperType] = useState<"wet" | "dirty" | "both">("wet");
  const [diaperColor, setDiaperColor] = useState(""); const [diaperConsistency, setDiaperConsistency] = useState("");
  const [diaperTime, setDiaperTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [diaperMsg, setDiaperMsg] = useState(""); const [diaperSaving, setDiaperSaving] = useState(false);

  // ─── Temp Form State ─────────────────────────────
  const [tempVal, setTempVal] = useState(""); const [tempUnit, setTempUnit] = useState("F");
  const [tempMethod, setTempMethod] = useState("oral"); const [tempSymptoms, setTempSymptoms] = useState("");
  const [tempTime, setTempTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [tempMsg, setTempMsg] = useState(""); const [tempSaving, setTempSaving] = useState(false);

  // ─── Vax Form State ──────────────────────────────
  const [vaxName, setVaxName] = useState(""); const [vaxDate, setVaxDate] = useState("");
  const [vaxDose, setVaxDose] = useState("1"); const [vaxAdmin, setVaxAdmin] = useState("");
  const [vaxMsg, setVaxMsg] = useState(""); const [vaxSaving, setVaxSaving] = useState(false);

  // ─── Milestone Form State ────────────────────────
  const [msName, setMsName] = useState(""); const [msCat, setMsCat] = useState("motor");
  const [msAge, setMsAge] = useState(""); const [msDate, setMsDate] = useState("");
  const [msMsg, setMsMsg] = useState(""); const [msSaving, setMsSaving] = useState(false);

  // ─── Data Save Handlers ──────────────────────────

  const saveFeeding = async () => {
    if (!feedQty || parseFloat(feedQty) <= 0) { setFeedMsg("Valid quantity required"); return; }
    if (feedType === "food" && !foodName.trim()) { setFeedMsg("Food name required"); return; }
    setFeedSaving(true); setFeedMsg("");
    const res = await api("feedings", { method: "POST", body: JSON.stringify({ feed_type: feedType, food_name: feedType === "food" ? foodName : null, quantity: parseFloat(feedQty), unit: feedUnit, feed_time: feedTime, child_name: child }) });
    if (res.error) { setFeedMsg(res.error); } else { setFeedMsg("✅ Saved!"); setFeedQty(""); setFoodName(""); refresh(); }
    setFeedSaving(false);
  };

  const saveSleep = async () => {
    if (!sleepStart || !sleepEnd) { setSleepMsg("Start and end time required"); return; }
    setSleepSaving(true); setSleepMsg("");
    const res = await api("sleep", { method: "POST", body: JSON.stringify({ sleep_type: sleepType, start_time: sleepStart, end_time: sleepEnd, quality: sleepQuality, child_name: child }) });
    if (res.error) { setSleepMsg(res.error); } else { setSleepMsg("✅ Saved!"); refresh(); }
    setSleepSaving(false);
  };

  const saveGrowth = async () => {
    if (!growthDate) { setGrowthMsg("Date required"); return; }
    setGrowthSaving(true); setGrowthMsg("");
    const res = await api("growth", { method: "POST", body: JSON.stringify({ height_cm: growthH ? parseFloat(growthH) : null, weight_kg: growthW ? parseFloat(growthW) : null, head_circumference_cm: growthHC ? parseFloat(growthHC) : null, recorded_at: growthDate, child_name: child }) });
    if (res.error) { setGrowthMsg(res.error); } else { setGrowthMsg("✅ Saved!"); setGrowthH(""); setGrowthW(""); setGrowthHC(""); refresh(); }
    setGrowthSaving(false);
  };

  const saveDiaper = async () => {
    if (!diaperTime) { setDiaperMsg("Time required"); return; }
    setDiaperSaving(true); setDiaperMsg("");
    const res = await api("diaper", { method: "POST", body: JSON.stringify({ diaper_type: diaperType, color: diaperColor, consistency: diaperConsistency, recorded_at: diaperTime, child_name: child }) });
    if (res.error) { setDiaperMsg(res.error); } else { setDiaperMsg("✅ Saved!"); setDiaperColor(""); setDiaperConsistency(""); refresh(); }
    setDiaperSaving(false);
  };

  const saveTemp = async () => {
    if (!tempVal || parseFloat(tempVal) <= 0) { setTempMsg("Valid temperature required"); return; }
    setTempSaving(true); setTempMsg("");
    const res = await api("temperature", { method: "POST", body: JSON.stringify({ temperature: parseFloat(tempVal), unit: tempUnit, method: tempMethod, symptoms: tempSymptoms, recorded_at: tempTime, child_name: child }) });
    if (res.error) { setTempMsg(res.error); } else { setTempMsg("✅ Saved!"); setTempVal(""); setTempSymptoms(""); refresh(); }
    setTempSaving(false);
  };

  const saveVax = async () => {
    if (!vaxName.trim() || !vaxDate) { setVaxMsg("Name and date required"); return; }
    setVaxSaving(true); setVaxMsg("");
    const res = await api("vaccinations", { method: "POST", body: JSON.stringify({ vaccine_name: vaxName, scheduled_date: vaxDate, administered_date: vaxAdmin || null, dose_number: parseInt(vaxDose) || 1, child_name: child }) });
    if (res.error) { setVaxMsg(res.error); } else { setVaxMsg("✅ Saved!"); setVaxName(""); setVaxDate(""); refresh(); }
    setVaxSaving(false);
  };

  const saveMilestone = async () => {
    if (!msName.trim()) { setMsMsg("Milestone name required"); return; }
    setMsSaving(true); setMsMsg("");
    const res = await api("milestones", { method: "POST", body: JSON.stringify({ milestone: msName, category: msCat, expected_age_months: msAge ? parseInt(msAge) : null, achieved_date: msDate || null, child_name: child }) });
    if (res.error) { setMsMsg(res.error); } else { setMsMsg("✅ Saved!"); setMsName(""); refresh(); }
    setMsSaving(false);
  };

  const addChild = async () => {
    if (!newChildName.trim()) return;
    await api("children", { method: "POST", body: JSON.stringify({ name: newChildName }) });
    setNewChildName(""); setShowAddChild(false); refresh();
  };

  const markVaxDone = async (id: number) => {
    await api(`vaccinations/${id}`, { method: "PUT", body: JSON.stringify({ administered_date: new Date().toISOString().slice(0, 10) }) });
    refresh();
  };

  // ─── Chart Data ─────────────────────────────────

  const diaperChartData = (() => {
    const byDate: Record<string, any> = {};
    (data.diapers || []).forEach((d: any) => {
      const day = d.recorded_at.slice(0, 10);
      if (!byDate[day]) byDate[day] = { day, wet: 0, dirty: 0 };
      if (d.diaper_type === "wet" || d.diaper_type === "both") byDate[day].wet++;
      if (d.diaper_type === "dirty" || d.diaper_type === "both") byDate[day].dirty++;
    });
    return Object.values(byDate).sort((a: any, b: any) => a.day.localeCompare(b.day));
  })();

  const sleepChartData = (() => {
    const byDate: Record<string, any> = {};
    (data.sleep || []).forEach((s: any) => {
      const day = s.start_time.slice(0, 10);
      if (!byDate[day]) byDate[day] = { day, nap: 0, night: 0 };
      if (s.sleep_type === "nap") byDate[day].nap += (s.duration_minutes || 0);
      else byDate[day].night += (s.duration_minutes || 0);
    });
    return Object.values(byDate).sort((a: any, b: any) => a.day.localeCompare(b.day));
  })();

  const growthChartData = (() => {
    return (data.growth || []).map((g: any) => ({
      date: g.recorded_at.slice(0, 10),
      weight: g.weight_kg,
      height: g.height_cm,
    })).reverse();
  })();

  const tempChartData = (() => {
    return (data.temps || []).map((t: any) => ({
      time: t.recorded_at.slice(0, 16).replace("T", " "),
      temp: t.temperature,
    })).reverse().slice(0, 20);
  })();

  // ─── Render ─────────────────────────────────────

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div className="header">
        <h1>🍼 Baby Tracker</h1>
        <div className="logout-row">
          <span className="baby-name">{child ? `👶 ${child}` : `👋 ${data.user.name}`}</span>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "6px 16px", borderRadius: 20, fontSize: "0.85em", cursor: "pointer" }}>Logout</button>
        </div>
        <ChildPicker children={data.children} selected={child} onSelect={setChild}
          onAdd={() => setShowAddChild(true)} />
        {showAddChild && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder="Child name"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: "Inter" }} />
            <button onClick={addChild} className="btn btn-primary" style={{ width: "auto", padding: "8px 16px", fontSize: "0.85em" }}>Add</button>
            <button onClick={() => setShowAddChild(false)} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: "0.85em" }}>✕</button>
          </div>
        )}
      </div>

      {/* ─── HOME TAB ─────────────────────────── */}
      {activeTab === "home" && (
        <div>
          <div className="card">
            <h3>📊 Today's Summary {child ? `for ${child}` : ""}</h3>
            <div className="stats-row">
              <div className="stat-box"><span className="stat-value">🍼 {t.feedings_count || 0}</span><span className="stat-label">Feedings</span></div>
              <div className="stat-box"><span className="stat-value">😴 {Math.round((t.sleep_minutes || 0) / 60)}h</span><span className="stat-label">Sleep</span></div>
              <div className="stat-box"><span className="stat-value">💩 {t.diapers || 0}</span><span className="stat-label">Diapers</span></div>
            </div>
          </div>
          {d.latest_growth && (
            <div className="card">
              <h3>📏 Latest Growth</h3>
              <div className="stats-row">
                <div className="stat-box"><span className="stat-value">{d.latest_growth.weight_kg}kg</span><span className="stat-label">Weight</span></div>
                <div className="stat-box"><span className="stat-value">{d.latest_growth.height_cm}cm</span><span className="stat-label">Height</span></div>
                <div className="stat-box"><span className="stat-value">{d.latest_growth.head_circumference_cm}cm</span><span className="stat-label">Head</span></div>
              </div>
            </div>
          )}
          {d.recent_temperature && (
            <div className="card">
              <h3>🌡️ Last Temperature</h3>
              <div style={{ textAlign: "center", fontSize: "2em", fontWeight: 800, padding: 10 }}>
                {d.recent_temperature.temperature}°{d.recent_temperature.unit}
                <div style={{ fontSize: "0.4em", opacity: 0.6 }}>{d.recent_temperature.method} • {d.recent_temperature.recorded_at?.slice(0, 16)}</div>
              </div>
            </div>
          )}
          {(d.upcoming_vaccines || []).length > 0 && (
            <div className="card">
              <h3>💉 Upcoming Vaccines</h3>
              {(d.upcoming_vaccines || []).map((v: any) => (
                <div key={v.id} className="feed-item">
                  <div className="feed-icon" style={{ background: "rgba(167,139,250,0.25)" }}>💉</div>
                  <div className="feed-details">
                    <div className="feed-type">{v.vaccine_name} (Dose {v.dose_number})</div>
                    <div className="feed-meta">Due: {v.scheduled_date}</div>
                  </div>
                  <button onClick={() => markVaxDone(v.id)} className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.75em", whiteSpace: "nowrap" }}>✓ Done</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── FEED TAB ─────────────────────────── */}
      {activeTab === "feed" && (
        <div>
          <div className="card">
            <h3>🍽 Log Feeding</h3>
            <div className="toggle-group">
              <button className={feedType === "milk" ? "active" : ""} onClick={() => setFeedType("milk")}>🍼 Milk</button>
              <button className={feedType === "food" ? "active" : ""} onClick={() => setFeedType("food")}>🥣 Food</button>
            </div>
            {feedType === "food" && <div className="input-group"><label>What food?</label><input type="text" placeholder="e.g. Banana puree" value={foodName} onChange={e => setFoodName(e.target.value)} /></div>}
            <div className="row">
              <div className="input-group"><label>Quantity</label><input type="number" step="0.1" min="0" placeholder="0" value={feedQty} onChange={e => setFeedQty(e.target.value)} /></div>
              <div className="input-group"><label>Unit</label><select value={feedUnit} onChange={e => setFeedUnit(e.target.value)}><option value="oz">oz</option><option value="ml">ml</option><option value="tbsp">tbsp</option><option value="cup">cup</option></select></div>
            </div>
            <div className="input-group"><label>When?</label><input type="datetime-local" value={feedTime} onChange={e => setFeedTime(e.target.value)} /></div>
            {feedMsg && <div className={feedMsg.startsWith("✅") ? "success-msg" : "error-msg"}>{feedMsg}</div>}
            <button className="btn btn-primary" onClick={saveFeeding} disabled={feedSaving}>{feedSaving ? "Saving..." : "💾 Save"}</button>
          </div>
          {(data.feedings || []).slice(0, 20).map((f: any) => (
            <div className="card" key={f.id} style={{ padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className={`feed-icon ${f.feed_type}`}>{f.feed_type === "milk" ? "🍼" : "🥣"}</div>
                <div className="feed-details">
                  <div className="feed-type">{f.feed_type === "milk" ? "Milk" : f.food_name || "Food"}{f.child_name ? ` • 👶 ${f.child_name}` : ""}</div>
                  <div className="feed-meta">{new Date(f.feed_time).toLocaleString()}</div>
                </div>
                <div className="feed-qty">{f.quantity} {f.unit}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── SLEEP TAB ────────────────────────── */}
      {activeTab === "sleep" && (
        <div>
          <div className="card">
            <h3>😴 Log Sleep</h3>
            <div className="toggle-group">
              <button className={sleepType === "nap" ? "active" : ""} onClick={() => setSleepType("nap")}>😴 Nap</button>
              <button className={sleepType === "nighttime" ? "active" : ""} onClick={() => setSleepType("nighttime")}>🌙 Night</button>
            </div>
            <div className="row">
              <div className="input-group"><label>Start</label><input type="datetime-local" value={sleepStart} onChange={e => setSleepStart(e.target.value)} /></div>
              <div className="input-group"><label>End</label><input type="datetime-local" value={sleepEnd} onChange={e => setSleepEnd(e.target.value)} /></div>
            </div>
            <div className="input-group"><label>Quality</label><select value={sleepQuality} onChange={e => setSleepQuality(e.target.value)}><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option><option value="excellent">Excellent</option></select></div>
            {sleepMsg && <div className={sleepMsg.startsWith("✅") ? "success-msg" : "error-msg"}>{sleepMsg}</div>}
            <button className="btn btn-primary" onClick={saveSleep} disabled={sleepSaving}>{sleepSaving ? "Saving..." : "💾 Save"}</button>
          </div>
          {sleepChartData.length > 0 && (
            <div className="card">
              <h3>📊 Sleep Chart</h3>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} unit="m" />
                    <Tooltip contentStyle={{ background: "rgba(30,10,60,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: "#fff" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="nap" name="Nap" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="night" name="Night" fill="#312e81" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {(data.sleep || []).slice(0, 20).map((s: any) => (
            <div className="card" key={s.id} style={{ padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="feed-icon" style={{ background: s.sleep_type === "nap" ? "rgba(167,139,250,0.25)" : "rgba(49,46,129,0.25)" }}>{s.sleep_type === "nap" ? "😴" : "🌙"}</div>
                <div className="feed-details">
                  <div className="feed-type">{s.sleep_type === "nap" ? "Nap" : "Nighttime"}{s.child_name ? ` • 👶 ${s.child_name}` : ""}</div>
                  <div className="feed-meta">{new Date(s.start_time).toLocaleString()} → {new Date(s.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="feed-qty">{s.duration_minutes || 0}m</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── GROWTH TAB ───────────────────────── */}
      {activeTab === "growth" && (
        <div>
          <div className="card">
            <h3>📏 Log Growth</h3>
            <div className="row">
              <div className="input-group"><label>Height (cm)</label><input type="number" step="0.1" placeholder="e.g. 52" value={growthH} onChange={e => setGrowthH(e.target.value)} /></div>
              <div className="input-group"><label>Weight (kg)</label><input type="number" step="0.01" placeholder="e.g. 3.5" value={growthW} onChange={e => setGrowthW(e.target.value)} /></div>
            </div>
            <div className="row">
              <div className="input-group"><label>Head Circ. (cm)</label><input type="number" step="0.1" placeholder="e.g. 35" value={growthHC} onChange={e => setGrowthHC(e.target.value)} /></div>
              <div className="input-group"><label>Date</label><input type="datetime-local" value={growthDate} onChange={e => setGrowthDate(e.target.value)} /></div>
            </div>
            {growthMsg && <div className={growthMsg.startsWith("✅") ? "success-msg" : "error-msg"}>{growthMsg}</div>}
            <button className="btn btn-primary" onClick={saveGrowth} disabled={growthSaving}>{growthSaving ? "Saving..." : "💾 Save"}</button>
          </div>
          {growthChartData.length > 1 && (
            <div className="card">
              <h3>📊 Growth Trends</h3>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} />
                    <Tooltip contentStyle={{ background: "rgba(30,10,60,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: "#fff" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#f472b6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="height" name="Height (cm)" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {(data.growth || []).slice(0, 20).map((g: any) => (
            <div className="card" key={g.id} style={{ padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="feed-icon" style={{ background: "rgba(52,211,153,0.25)" }}>📏</div>
                <div className="feed-details">
                  <div className="feed-type">Growth Check{g.child_name ? ` • 👶 ${g.child_name}` : ""}</div>
                  <div className="feed-meta">{new Date(g.recorded_at).toLocaleDateString()}</div>
                </div>
                <div className="feed-qty" style={{ fontSize: "0.8em", textAlign: "right" }}>
                  {g.weight_kg && <div>{g.weight_kg}kg</div>}
                  {g.height_cm && <div>{g.height_cm}cm</div>}
                  {g.head_circumference_cm && <div>{g.head_circumference_cm}cm HC</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── DIAPER TAB ───────────────────────── */}
      {activeTab === "diaper" && (
        <div>
          <div className="card">
            <h3>💩 Log Diaper</h3>
            <div className="toggle-group">
              <button className={diaperType === "wet" ? "active" : ""} onClick={() => setDiaperType("wet")}>💧 Wet</button>
              <button className={diaperType === "dirty" ? "active" : ""} onClick={() => setDiaperType("dirty")}>💩 Dirty</button>
              <button className={diaperType === "both" ? "active" : ""} onClick={() => setDiaperType("both")}>Both</button>
            </div>
            <div className="row">
              <div className="input-group"><label>Color</label><input type="text" placeholder="e.g. yellow" value={diaperColor} onChange={e => setDiaperColor(e.target.value)} /></div>
              <div className="input-group"><label>Consistency</label><input type="text" placeholder="e.g. soft" value={diaperConsistency} onChange={e => setDiaperConsistency(e.target.value)} /></div>
            </div>
            <div className="input-group"><label>When?</label><input type="datetime-local" value={diaperTime} onChange={e => setDiaperTime(e.target.value)} /></div>
            {diaperMsg && <div className={diaperMsg.startsWith("✅") ? "success-msg" : "error-msg"}>{diaperMsg}</div>}
            <button className="btn btn-primary" onClick={saveDiaper} disabled={diaperSaving}>{diaperSaving ? "Saving..." : "💾 Save"}</button>
          </div>
          {diaperChartData.length > 0 && (
            <div className="card">
              <h3>📊 Diaper Chart</h3>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diaperChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "rgba(30,10,60,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: "#fff" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="wet" name="Wet" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="dirty" name="Dirty" fill="#fbbf24" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {(data.diapers || []).slice(0, 20).map((d: any) => (
            <div className="card" key={d.id} style={{ padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="feed-icon" style={{ background: d.diaper_type === "wet" ? "rgba(96,165,250,0.25)" : d.diaper_type === "dirty" ? "rgba(251,191,36,0.25)" : "rgba(167,139,250,0.25)" }}>
                  {d.diaper_type === "wet" ? "💧" : d.diaper_type === "dirty" ? "💩" : "💧💩"}
                </div>
                <div className="feed-details">
                  <div className="feed-type">{d.diaper_type === "wet" ? "Wet" : d.diaper_type === "dirty" ? "Dirty" : "Both"}{d.child_name ? ` • 👶 ${d.child_name}` : ""}</div>
                  <div className="feed-meta">{new Date(d.recorded_at).toLocaleString()}{d.color ? ` • ${d.color}` : ""}{d.consistency ? ` • ${d.consistency}` : ""}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TEMP TAB ─────────────────────────── */}
      {activeTab === "temp" && (
        <div>
          <div className="card">
            <h3>🌡️ Log Temperature</h3>
            <div className="row">
              <div className="input-group"><label>Temperature</label><input type="number" step="0.1" placeholder="e.g. 98.6" value={tempVal} onChange={e => setTempVal(e.target.value)} /></div>
              <div className="input-group"><label>Unit</label><select value={tempUnit} onChange={e => setTempUnit(e.target.value)}><option value="F">°F</option><option value="C">°C</option></select></div>
            </div>
            <div className="input-group"><label>Method</label><select value={tempMethod} onChange={e => setTempMethod(e.target.value)}><option value="oral">Oral</option><option value="rectal">Rectal</option><option value="axillary">Axillary</option><option value="ear">Ear</option><option value="forehead">Forehead</option></select></div>
            <div className="input-group"><label>Symptoms</label><input type="text" placeholder="e.g. cough, fussy" value={tempSymptoms} onChange={e => setTempSymptoms(e.target.value)} /></div>
            <div className="input-group"><label>When?</label><input type="datetime-local" value={tempTime} onChange={e => setTempTime(e.target.value)} /></div>
            {tempMsg && <div className={tempMsg.startsWith("✅") ? "success-msg" : "error-msg"}>{tempMsg}</div>}
            <button className="btn btn-primary" onClick={saveTemp} disabled={tempSaving}>{tempSaving ? "Saving..." : "💾 Save"}</button>
          </div>
          {tempChartData.length > 1 && (
            <div className="card">
              <h3>📊 Temperature Trend</h3>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tempChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.6)" }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                    <Tooltip contentStyle={{ background: "rgba(30,10,60,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: "#fff" }} />
                    <Line type="monotone" dataKey="temp" name="Temp" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {(data.temps || []).slice(0, 20).map((t: any) => (
            <div className="card" key={t.id} style={{ padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="feed-icon" style={{ background: parseFloat(t.temperature) > (t.unit === "C" ? 38 : 100.4) ? "rgba(248,113,113,0.3)" : "rgba(96,165,250,0.25)" }}>🌡️</div>
                <div className="feed-details">
                  <div className="feed-type">{t.temperature}°{t.unit} {t.method}{t.child_name ? ` • 👶 ${t.child_name}` : ""}</div>
                  <div className="feed-meta">{new Date(t.recorded_at).toLocaleString()}{t.symptoms ? ` • ${t.symptoms}` : ""}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── VAX TAB ──────────────────────────── */}
      {activeTab === "vax" && (
        <div>
          <div className="card">
            <h3>💉 Add Vaccine</h3>
            <div className="input-group"><label>Vaccine Name</label><input type="text" placeholder="e.g. Hepatitis B" value={vaxName} onChange={e => setVaxName(e.target.value)} /></div>
            <div className="row">
              <div className="input-group"><label>Scheduled Date</label><input type="date" value={vaxDate} onChange={e => setVaxDate(e.target.value)} /></div>
              <div className="input-group"><label>Dose #</label><input type="number" min="1" value={vaxDose} onChange={e => setVaxDose(e.target.value)} /></div>
            </div>
            <div className="input-group"><label>Administered Date (optional)</label><input type="date" value={vaxAdmin} onChange={e => setVaxAdmin(e.target.value)} /></div>
            {vaxMsg && <div className={vaxMsg.startsWith("✅") ? "success-msg" : "error-msg"}>{vaxMsg}</div>}
            <button className="btn btn-primary" onClick={saveVax} disabled={vaxSaving}>{vaxSaving ? "Saving..." : "💾 Save"}</button>
          </div>
          {(data.vax || []).map((v: any) => (
            <div className="card" key={v.id} style={{ padding: 12, opacity: v.administered_date ? 0.6 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="feed-icon" style={{ background: v.administered_date ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)" }}>
                  {v.administered_date ? "✅" : "📅"}
                </div>
                <div className="feed-details">
                  <div className="feed-type">{v.vaccine_name} (Dose {v.dose_number}){v.child_name ? ` • 👶 ${v.child_name}` : ""}</div>
                  <div className="feed-meta">
                    {v.administered_date ? `✅ Done: ${v.administered_date}` : `📅 Due: ${v.scheduled_date}`}
                  </div>
                </div>
                {!v.administered_date && (
                  <button onClick={() => markVaxDone(v.id)} className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.75em", whiteSpace: "nowrap" }}>✓ Done</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MILESTONES TAB ───────────────────── */}
      {activeTab === "milestones" && (
        <div>
          <div className="card">
            <h3>🎯 Log Milestone</h3>
            <div className="input-group"><label>Milestone</label><input type="text" placeholder="e.g. First smile, Rolling over" value={msName} onChange={e => setMsName(e.target.value)} /></div>
            <div className="row">
              <div className="input-group"><label>Category</label><select value={msCat} onChange={e => setMsCat(e.target.value)}><option value="motor">Motor</option><option value="cognitive">Cognitive</option><option value="social">Social</option><option value="language">Language</option></select></div>
              <div className="input-group"><label>Expected (months)</label><input type="number" min="0" placeholder="e.g. 3" value={msAge} onChange={e => setMsAge(e.target.value)} /></div>
            </div>
            <div className="input-group"><label>Achieved Date</label><input type="date" value={msDate} onChange={e => setMsDate(e.target.value)} /></div>
            {msMsg && <div className={msMsg.startsWith("✅") ? "success-msg" : "error-msg"}>{msMsg}</div>}
            <button className="btn btn-primary" onClick={saveMilestone} disabled={msSaving}>{msSaving ? "Saving..." : "💾 Save"}</button>
          </div>
          {(data.milestones || []).map((m: any) => (
            <div className="card" key={m.id} style={{ padding: 12, opacity: m.achieved_date ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="feed-icon" style={{
                  background: m.category === "motor" ? "rgba(52,211,153,0.25)" :
                    m.category === "cognitive" ? "rgba(96,165,250,0.25)" :
                    m.category === "social" ? "rgba(251,191,36,0.25)" :
                    "rgba(244,114,182,0.25)"
                }}>
                  {m.category === "motor" ? "🏃" : m.category === "cognitive" ? "🧠" : m.category === "social" ? "👋" : "💬"}
                </div>
                <div className="feed-details">
                  <div className="feed-type">{m.milestone}{m.child_name ? ` • 👶 ${m.child_name}` : ""}</div>
                  <div className="feed-meta">
                    {m.achieved_date ? `✅ Achieved: ${m.achieved_date}` : `Expected: ${m.expected_age_months}mo`}
                    <span style={{ marginLeft: 8, fontSize: "0.85em", opacity: 0.6, textTransform: "capitalize" }}>{m.category}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── BOTTOM TAB BAR ────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(30,10,60,0.95)", backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex", justifyContent: "space-around", padding: "6px 0 10px",
        zIndex: 100, maxWidth: 480, margin: "0 auto",
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              background: activeTab === t.key ? "rgba(255,255,255,0.15)" : "transparent",
              border: "none", borderRadius: 12, padding: "6px 8px",
              color: activeTab === t.key ? "#fff" : "rgba(255,255,255,0.45)",
              cursor: "pointer", fontFamily: "Inter", fontSize: "0.65em",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              minWidth: 0, transition: "all 0.2s",
            }}>
            <span style={{ fontSize: "1.3em" }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

export default function Home() {
  const [data, setData] = useState<AppData | null>(null);
  const [child, setChild] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!data?.user) return;
    const childParam = child ? `?child=${encodeURIComponent(child)}` : "";
    const [feedings, growth, sleep, diapers, temps, vax, milestones, dashboard, meData] = await Promise.all([
      api(`feedings${childParam}`),
      api(`growth${childParam}`),
      api(`sleep${childParam}`),
      api(`diaper${childParam}`),
      api(`temperature${childParam}`),
      api(`vaccinations${childParam}`),
      api(`milestones${childParam}`),
      api(`dashboard${childParam}`),
      api("me"),
    ]);
    setData(prev => prev ? {
      ...prev,
      feedings: Array.isArray(feedings) ? feedings : [],
      growth: Array.isArray(growth) ? growth : [],
      sleep: Array.isArray(sleep) ? sleep : [],
      diapers: Array.isArray(diapers) ? diapers : [],
      temps: Array.isArray(temps) ? temps : [],
      vax: Array.isArray(vax) ? vax : [],
      milestones: Array.isArray(milestones) ? milestones : [],
      dashboard,
      children: meData.children || prev.children,
    } : prev);
  }, [child, data?.user]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api("me").then(meData => {
        if (meData.user) {
          const u = meData.user;
          const children = meData.children || [];
          const defChild = children.length > 0 ? children[0].name : (u.baby_name || "");
          setChild(defChild);
          setData({ user: u, children, feedings: [], growth: [], sleep: [], diapers: [], temps: [], vax: [], milestones: [], dashboard: {} });
        } else { localStorage.removeItem("token"); }
      }).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  useEffect(() => { if (data?.user) refresh(); }, [child]); // eslint-disable-line

  const handleLogin = (d: AppData) => {
    setData(d);
    if (d.children.length > 0 && !child) setChild(d.children[0].name);
  };

  if (loading) return <div className="container" style={{ justifyContent: "center", alignItems: "center" }}><div style={{ fontSize: "2em" }}>🍼</div></div>;
  if (!data) return <AuthScreen onLogin={handleLogin} />;
  return <Dashboard data={data} onLogout={() => { localStorage.removeItem("token"); setData(null); }} refresh={refresh} child={child} setChild={setChild} />;
}
