/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  initAuth, 
  googleSignIn, 
  getAccessToken, 
  logout 
} from "./auth";
import { googleService } from "./googleService";
import { DailyLog, SheetConfig } from "./types";
import { MetricCards } from "./components/MetricCards";
import { LogsTable } from "./components/LogsTable";
import { LogModal } from "./components/LogModal";
import { AIAnalyst } from "./components/AIAnalyst";
import { SheetSelector } from "./components/SheetSelector";
import { 
  Sparkles, 
  LogOut, 
  Database, 
  Settings, 
  SlidersHorizontal, 
  Plus, 
  RefreshCw, 
  LayoutDashboard, 
  Loader2, 
  TrendingUp, 
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

// Recharts components setup
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  // States for application
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [config, setConfig] = useState<SheetConfig | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "logs" | "ai" | "settings">("dashboard");
  
  // Modals operations
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedEditLog, setSelectedEditLog] = useState<DailyLog | null>(null);

  // Load standard auth & cached settings inside useEffect
  useEffect(() => {
    // Read session storage token if any
    const savedToken = getAccessToken();
    const savedConfig = localStorage.getItem("google_sheets_config");

    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Failed to parse stored sheet config:", e);
      }
    }

    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setToken(accessToken);
        setUser(currentUser);
        setNeedsAuth(false);
        setAuthChecking(false);
        
        // Auto-load logs if config exists
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig) as SheetConfig;
          loadLogs(accessToken, parsedConfig);
        } else {
          // If no config, redirect them to settings tab
          setActiveTab("settings");
        }
      },
      () => {
        // Fallback: see if we have token saved in sessionStorage relative to active reload
        if (savedToken) {
          setToken(savedToken);
          // Fetch current firebase user details
          const fbUser = initAuth((u) => setUser(u));
          setNeedsAuth(false);
          setAuthChecking(false);
          if (savedConfig) {
            loadLogs(savedToken, JSON.parse(savedConfig));
          } else {
            setActiveTab("settings");
          }
        } else {
          setNeedsAuth(true);
          setAuthChecking(false);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const loadLogs = async (accessToken: string, targetConfig: SheetConfig) => {
    setLoadingLogs(true);
    try {
      const fetchedLogs = await googleService.fetchDailyLogs(accessToken, targetConfig.spreadsheetId, targetConfig.sheetName);
      setLogs(fetchedLogs);
    } catch (err) {
      console.error("Failed to load logs from sheet: ", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleLogin = async () => {
    setAuthChecking(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        
        // Load connected sheet if any
        if (config) {
          loadLogs(result.accessToken, config);
        } else {
          setActiveTab("settings");
        }
      }
    } catch (err) {
      console.error("OAuth login failed:", err);
      setNeedsAuth(true);
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setToken(null);
    setUser(null);
    setNeedsAuth(true);
    setLogs([]);
  };

  const handleConfigSelected = (newConfig: SheetConfig) => {
    setConfig(newConfig);
    localStorage.setItem("google_sheets_config", JSON.stringify(newConfig));
    if (token) {
      loadLogs(token, newConfig);
      setActiveTab("dashboard");
    }
  };

  // Mutating Operations (Requires confirm step inside LogModal or window confirm before executing)
  const handleLogSubmit = async (logData: Omit<DailyLog, "id" | "rowIndex" | "achievement">) => {
    if (!token || !config) return;
    
    if (selectedEditLog) {
      // UPDATE OPERATION
      await googleService.updateDailyLog(token, config.spreadsheetId, config.sheetName, selectedEditLog.rowIndex, logData);
    } else {
      // APPEND OPERATION
      await googleService.appendDailyLog(token, config.spreadsheetId, config.sheetName, logData);
    }

    // Refresh metrics
    await loadLogs(token, config);
  };

  const handleEditLogTrigger = (log: DailyLog) => {
    setSelectedEditLog(log);
    setIsLogModalOpen(true);
  };

  const handleClearLogTrigger = async (log: DailyLog) => {
    if (!token || !config) return;
    
    // Explicit user confirmation before deleting/clearing standard data!
    const confirmed = window.confirm(
      `DELETE CONFIRMATION REQUIRED:\nAre you sure you want to clear Row #${log.rowIndex} ("${log.taskName}") from Google Sheets?\n\nThis will clear its cells in the workbook directly. This action cannot be undone.`
    );
    if (!confirmed) return;

    setLoadingLogs(true);
    try {
      await googleService.clearDailyLog(token, config.spreadsheetId, config.sheetName, log.rowIndex);
      // Reload logs
      await loadLogs(token, config);
    } catch (err: any) {
      alert("Failed to clear row: " + (err.message || err));
    } finally {
      setLoadingLogs(false);
    }
  };

  // Calculations for graphs
  const getDailyAchievementTrendData = () => {
    // Group logs by date, sort Ascending, compute average achievement rate
    const datesMap: Record<string, { date: string; sumAch: number; count: number }> = {};
    
    logs.forEach(log => {
      if (!datesMap[log.date]) {
        datesMap[log.date] = { date: log.date, sumAch: 0, count: 0 };
      }
      datesMap[log.date].sumAch += log.achievement;
      datesMap[log.date].count += 1;
    });

    return Object.values(datesMap)
      .map(d => ({
        date: d.date,
        Achievement: Math.round(d.sumAch / d.count)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getShiftAnalysisData = () => {
    // Group target vs actual achievements by Shift
    const shiftsMap: Record<string, { shift: string; Target: number; Actual: number }> = {};
    
    logs.forEach(log => {
      const s = log.shift || "Full Day";
      if (!shiftsMap[s]) {
        shiftsMap[s] = { shift: s, Target: 0, Actual: 0 };
      }
      shiftsMap[s].Target += log.target;
      shiftsMap[s].Actual += log.actual;
    });

    return Object.values(shiftsMap);
  };

  // Auth checking indicator screen
  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center p-32 h-screen bg-[#f8fafc] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-semibold tracking-wider font-mono-val">Initializing Security Credentials...</span>
      </div>
    );
  }

  // LOGIN PANEL (Needs Auth)
  if (needsAuth || !token) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 select-none animate-fade-in relative overflow-hidden">
        
        {/* Ambient top light ball gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-50 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-md w-full text-center space-y-8 relative z-10">
          
          {/* Central Logo */}
          <div className="mx-auto w-16 h-16 bg-white rounded-2xl border border-slate-100 flex items-center justify-center shadow-md shadow-indigo-50/50">
            <Database className="w-7 h-7 text-indigo-600" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 font-display">
              Google Sheets Daily Monitor
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed font-normal max-w-sm mx-auto">
              Welcome back to your daily operations checkpoint. Synchronize spreadsheets, analyse shift metrics with Gemini, and log targets securely.
            </p>
          </div>

          {/* Login container */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100/30 rounded-2xl text-left space-y-2">
                <p className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" /> Enterprise Connection Permissions
                </p>
                <p className="text-[11px] text-slate-600 leading-normal font-normal">
                  Logging in connects your workspace securely. The application will, with permission from your account, allow you to browse spreadsheets, append daily logs, and edit target metrics.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <button 
                onClick={handleLogin}
                className="gsi-material-button w-full shadow-sm hover:shadow-md py-5.5 flex items-center justify-center"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-display">Sign In via Google Enterprise</span>
                </div>
              </button>
            </div>
          </div>

          {/* Corporate credits line */}
          <p className="text-[10px] text-slate-400 font-normal">
            Secure client-side sandbox authentication — No keys are shared.
          </p>

        </div>
      </div>
    );
  }

  // ACTIVE INTERACTIVE WORKSPACE (Logged in)
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      
      {/* 1. Header Toolbar */}
      <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-40 shadow-sm shadow-slate-100/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* App title logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-150">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display block leading-none">Enterprise Tracker</span>
              <h1 className="text-sm font-black text-slate-800 tracking-tight font-display mt-1">Daily Monitor V1</h1>
            </div>
            {config && (
              <span className="hidden h-5 md:flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                CONNECTED: "{config.sheetName}"
              </span>
            )}
          </div>

          {/* Navigation link triggers */}
          <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-100">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`p-2 px-4 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === "dashboard" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Summary Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab("logs")}
              className={`p-2 px-4 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === "logs" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Sheet Logs
            </button>
            
            <button
              onClick={() => setActiveTab("ai")}
              className={`p-2 px-4 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === "ai" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> AI operational Analysis
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`p-2 px-4 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === "settings" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Config Sheets
            </button>
          </nav>

          {/* Header Action Button & User Info Details */}
          <div className="flex items-center gap-3">
            
            {/* Quick action: Add Log Button */}
            {config && logs.length > 0 && (
              <button
                onClick={() => {
                  setSelectedEditLog(null);
                  setIsLogModalOpen(true);
                }}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" /> Add entry
              </button>
            )}

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-[11px] font-bold text-slate-800 truncate max-w-[124px]">
                  {user?.displayName || "Supervisor team"}
                </span>
                <span className="text-[9px] text-slate-400 font-mono-val">{user?.email}</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-slate-200 shadow-xs flex items-center justify-center font-display font-bold text-sm text-indigo-700 overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  user?.email?.charAt(0).toUpperCase() || "U"
                )}
              </div>
              
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Mobile navigation rail header */}
      <div className="md:hidden bg-white border-b border-slate-100 p-2 text-center flex items-center justify-around z-30">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1.5 p-1.5 text-[10px] font-bold ${activeTab === "dashboard" ? "text-indigo-600" : "text-slate-400"}`}
        >
          <LayoutDashboard className="w-4 h-4" /> Summary
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex flex-col items-center gap-1.5 p-1.5 text-[10px] font-bold ${activeTab === "logs" ? "text-indigo-600" : "text-slate-400"}`}
        >
          <SlidersHorizontal className="w-4 h-4" /> Logs
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex flex-col items-center gap-1.5 p-1.5 text-[10px] font-bold ${activeTab === "ai" ? "text-indigo-600" : "text-slate-400"}`}
        >
          <Sparkles className="w-4 h-4" /> AI Analytics
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center gap-1.5 p-1.5 text-[10px] font-bold ${activeTab === "settings" ? "text-indigo-600" : "text-slate-400"}`}
        >
          <Settings className="w-4 h-4" /> Config
        </button>
      </div>

      {/* 2. Main Workspace Content wrapper */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* If first time or disconnected, show setup message */}
        {!config ? (
          <div className="text-center p-12 lg:p-24 bg-white border border-slate-150 rounded-3xl max-w-xl mx-auto shadow-sm flex flex-col items-center justify-center gap-5 my-12 animate-fade-in">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Settings className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">Assign Operations Workbook</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-normal max-w-xs mx-auto">
                Connect your dashboard to a Google Spreadsheet. You can search files in your Drive, link existing logs, or initialize an optimized enterprise monitoring template.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("settings")}
              className="mt-2 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-100"
            >
              Configure Sheet Connection <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Loading / Refreshing dynamic sheet overlay indicator */}
            {loadingLogs && (
              <div className="bg-slate-900/5 border border-indigo-105 p-3.5 rounded-2xl text-xs text-indigo-700 font-semibold flex items-center justify-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Pulling live spreadsheet data cells...
              </div>
            )}

            {/* TAB 1: DASHBOARD OVERVIEW */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Metric Quick Stats cards */}
                <MetricCards logs={logs} />

                {/* KPI Graphs and Diagrams segment */}
                {logs.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Graph A: Weekly Achievement Rate */}
                    <div className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between h-[360px]">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Date-by-Date Trend</h3>
                        <h2 className="text-md font-bold text-slate-800 mt-0.5">Average Daily Achievement Rates</h2>
                      </div>
                      <div className="w-full h-[240px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={getDailyAchievementTrendData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontFamily="JetBrains Mono" />
                            <YAxis stroke="#94a3b8" fontSize={10} fontFamily="JetBrains Mono" unit="%" />
                            <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'Inter', borderRadius: 10, border: '1px solid #e2e8f0' }} />
                            <Line type="monotone" dataKey="Achievement" name="Avg Achievement" stroke="#4f46e5" strokeWidth={3} fill="#4f46e5" dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Graph B: Shift target vs actual */}
                    <div className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between h-[360px]">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Shift Target Breakdown</h3>
                        <h2 className="text-md font-bold text-slate-800 mt-0.5">Aggregate Target vs. Actual Completed metrics</h2>
                      </div>
                      <div className="w-full h-[240px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getShiftAnalysisData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="shift" stroke="#94a3b8" fontSize={11} fontFamily="Inter" />
                            <YAxis stroke="#94a3b8" fontSize={11} fontFamily="JetBrains Mono" />
                            <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'Inter', borderRadius: 10, border: '1px solid #e2e8f0' }} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="Target" name="Assigned Targets" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Actual" name="Actual Achieved" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">No operational records found inside connected tab.</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-normal">
                      Verify that your workspace Google sheet tab contains the appropriate standard daily columns, or trigger template creation inside details settings.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SHEET LOGS EXPLORER */}
            {activeTab === "logs" && (
              <div className="animate-fade-in flex flex-col h-full">
                <LogsTable 
                  logs={logs} 
                  onEdit={handleEditLogTrigger} 
                  onClear={handleClearLogTrigger} 
                />
              </div>
            )}

            {/* TAB 3: GEMINI AI OPERATIONS ANALYST */}
            {activeTab === "ai" && (
              <div className="animate-fade-in flex flex-col h-full">
                <AIAnalyst logs={logs} />
              </div>
            )}

            {/* TAB 4: CONFIGURATION CONNECTION */}
            {activeTab === "settings" && (
              <div className="animate-fade-in flex flex-col h-full">
                <SheetSelector 
                  token={token} 
                  config={config} 
                  onSelectConfig={handleConfigSelected} 
                />
              </div>
            )}
          </>
        )}

      </main>

      {/* 3. Operational Log edit/append dialog Modal */}
      <LogModal 
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setSelectedEditLog(null);
        }}
        onSubmit={handleLogSubmit}
        editLog={selectedEditLog}
        sheetName={config?.sheetName || "Sheet1"}
      />

    </div>
  );
}
