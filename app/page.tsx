"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ─── API helper ───────────────────────────────────
async function api(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`https://173.249.10.236/api/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });
  return res.json();
}

// ─── Types ─────────────────────────────────────────
interface Feeding {
  id: number;
  feed_type: "milk" | "food";
  food_name: string | null;
  quantity: number;
  unit: string;
  feed_time: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  baby_name: string;
}

// ─── Auth Screen ───────────────────────────────────
function AuthScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [babyName, setBabyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const data = await api("register", {
          method: "POST",
          body: JSON.stringify({ email, password, name: name || "Parent", baby_name: babyName }),
        });
        if (data.error) { setError(data.error); return; }
        localStorage.setItem("token", data.token);
        onLogin(data.user);
      } else {
        const data = await api("login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        if (data.error) { setError(data.error); return; }
        localStorage.setItem("token", data.token);
        onLogin(data.user);
      }
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ justifyContent: "center" }}>
      <div className="header">
        <h1>🍼 Baby Feeder</h1>
        <div className="subtitle">Track every sip & bite</div>
      </div>

      <div className="auth-tabs">
        <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>
          Login
        </button>
        <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>
          Register
        </button>
      </div>

      <div className="auth-card">
        <h2>{mode === "login" ? "👋 Welcome back" : "✨ Create account"}</h2>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          {mode === "register" && (
            <>
              <div className="input-group">
                <label>Your Name</label>
                <input type="text" placeholder="Parent name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Baby's Name</label>
                <input type="text" placeholder="Baby name" value={babyName} onChange={(e) => setBabyName(e.target.value)} />
              </div>
            </>
          )}

          <div className="input-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────
function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"feed" | "history" | "chart">("feed");
  const [feedType, setFeedType] = useState<"milk" | "food">("milk");
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("oz");
  const [feedTime, setFeedTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFeedings = useCallback(async () => {
    const data = await api("feedings");
    if (data.feedings) setFeedings(data.feedings);
  }, []);

  useEffect(() => { loadFeedings(); }, [loadFeedings]);

  const handleSave = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      setMsg("Please enter a valid quantity");
      return;
    }
    if (feedType === "food" && !foodName.trim()) {
      setMsg("Please enter the food name");
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      const data = await api("feedings", {
        method: "POST",
        body: JSON.stringify({
          feed_type: feedType,
          food_name: feedType === "food" ? foodName : null,
          quantity: parseFloat(quantity),
          unit,
          feed_time: feedTime,
        }),
      });

      if (data.feeding) {
        setMsg("✅ Saved!");
        setQuantity("");
        setFoodName("");
        setFeedTime(new Date().toISOString().slice(0, 16));
        setFeedings((prev) => [data.feeding, ...prev]);
      } else {
        setMsg(data.error || "Error saving");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  };

  // Chart data — group by date, separate milk/food totals
  const chartData = (() => {
    const byDate: Record<string, { date: string; milk: number; food: number }> = {};
    feedings.forEach((f) => {
      const date = f.feed_time.slice(0, 10);
      if (!byDate[date]) byDate[date] = { date, milk: 0, food: 0 };
      if (f.feed_type === "milk") byDate[date].milk += f.quantity;
      else byDate[date].food += f.quantity;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const totalMilk = feedings.filter((f) => f.feed_type === "milk").reduce((s, f) => s + f.quantity, 0);
  const totalFood = feedings.filter((f) => f.feed_type === "food").reduce((s, f) => s + f.quantity, 0);

  return (
    <div className="container">
      <div className="header">
        <h1>🍼 Baby Feeder</h1>
        <div className="logout-row">
          <span className="baby-name">👶 {user.baby_name || "Baby"}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-row">
        {(["feed", "history", "chart"] as const).map((t) => (
          <button key={t} className={activeTab === t ? "active-tab" : ""} onClick={() => setActiveTab(t)}>
            {t === "feed" ? "🍽 Feed" : t === "history" ? "📋 History" : "📊 Chart"}
          </button>
        ))}
      </div>

      {/* Feed Form */}
      {activeTab === "feed" && (
        <div className="card" key="feed">
          <h3>Log a Feeding</h3>

          <div className="toggle-group">
            <button className={feedType === "milk" ? "active" : ""} onClick={() => setFeedType("milk")}>
              🍼 Milk
            </button>
            <button className={feedType === "food" ? "active" : ""} onClick={() => setFeedType("food")}>
              🥣 Food
            </button>
          </div>

          {feedType === "food" && (
            <div className="input-group">
              <label>What food?</label>
              <input
                type="text"
                placeholder="e.g. Banana puree, Rice cereal..."
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
              />
            </div>
          )}

          <div className="row">
            <div className="input-group">
              <label>Quantity</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="oz">oz</option>
                <option value="ml">ml</option>
                <option value="tbsp">tbsp</option>
                <option value="cup">cup</option>
                <option value="piece">piece</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>When?</label>
            <input type="datetime-local" value={feedTime} onChange={(e) => setFeedTime(e.target.value)} />
          </div>

          {msg && (
            <div className={msg.startsWith("✅") ? "success-msg" : "error-msg"} style={{ marginTop: 8 }}>
              {msg}
            </div>
          )}

          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Feeding"}
          </button>
        </div>
      )}

      {/* History */}
      {activeTab === "history" && (
        <div className="card" key="history">
          <h3>Feeding History</h3>
          {feedings.length === 0 ? (
            <div className="empty-state">
              <span className="emoji">📝</span>
              No feedings yet. Log your first one!
            </div>
          ) : (
            feedings.map((f) => (
              <div className="feed-item" key={f.id}>
                <div className={`feed-icon ${f.feed_type}`}>
                  {f.feed_type === "milk" ? "🍼" : "🥣"}
                </div>
                <div className="feed-details">
                  <div className="feed-type">
                    {f.feed_type === "milk" ? "Milk" : f.food_name || "Food"}
                  </div>
                  <div className="feed-meta">
                    {new Date(f.feed_time).toLocaleString()}
                  </div>
                </div>
                <div className="feed-qty">
                  {f.quantity} {f.unit}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Chart */}
      {activeTab === "chart" && (
        <div className="card" key="chart">
          <h3>Daily Progress</h3>
          {chartData.length === 0 ? (
            <div className="empty-state">
              <span className="emoji">📊</span>
              Add some feedings to see the chart!
            </div>
          ) : (
            <>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                      tickFormatter={(d: string) => {
                        const dt = new Date(d + "T00:00:00");
                        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(30,10,60,0.95)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}
                    />
                    <Bar dataKey="milk" name="Milk" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="food" name="Food" fill="#fbbf24" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="stats-row">
                <div className="stat-box">
                  <span className="stat-value">🍼 {totalMilk}</span>
                  <span className="stat-label">Total Milk (oz)</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">🥣 {totalFood}</span>
                  <span className="stat-label">Total Food (oz)</span>
                </div>
                <div className="stat-box">
                  <span className="stat-value">📅 {chartData.length}</span>
                  <span className="stat-label">Days Tracked</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Root App ──────────────────────────────────────
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api("me")
        .then((data) => {
          if (data.user) setUser(data.user);
          else localStorage.removeItem("token");
        })
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="container" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontSize: "2em" }}>🍼</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
