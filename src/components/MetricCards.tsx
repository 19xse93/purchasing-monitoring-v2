import React from "react";
import { DailyLog, OperationalSummary } from "../types";
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, BarChart3, Database } from "lucide-react";

interface MetricCardsProps {
  logs: DailyLog[];
}

export function MetricCards({ logs }: MetricCardsProps) {
  // Calculators
  const totalLogs = logs.length;
  
  const completed = logs.filter(l => l.status.toLowerCase().includes("complete")).length;
  const inProgress = logs.filter(l => l.status.toLowerCase().includes("progress") || l.status.toLowerCase().includes("active")).length;
  const delayed = logs.filter(l => l.status.toLowerCase().includes("delay") || l.status.toLowerCase().includes("fail") || l.status.toLowerCase().includes("stop")).length;
  const pending = totalLogs - completed - inProgress - delayed;

  let totalTarget = 0;
  let totalActual = 0;
  let sumAchievement = 0;

  logs.forEach(log => {
    totalTarget += log.target;
    totalActual += log.actual;
    sumAchievement += log.achievement;
  });

  const averageAchievement = totalLogs > 0 ? Math.round(sumAchievement / totalLogs) : 0;
  const aggregateAchievement = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  return (
    <div id="metric-cards-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      {/* CARD 1: Total Logs */}
      <div id="card-total-logs" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Entries</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-1 font-mono-val">{totalLogs}</h3>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Database className="w-3 h-3" /> Live sheets tracking
          </p>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <BarChart3 className="w-6 h-6" />
        </div>
      </div>

      {/* CARD 2: Average Achievement */}
      <div id="card-avg-achievement" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg. Achievement</p>
          <h3 className={`text-3xl font-bold mt-1 font-mono-val ${averageAchievement >= 90 ? 'text-emerald-600' : averageAchievement >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
            {averageAchievement}%
          </h3>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Aggregate: {aggregateAchievement}% ({totalActual}/{totalTarget})
          </p>
        </div>
        <div className={`p-3 rounded-xl ${averageAchievement >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>

      {/* CARD 3: Quick Status Overview */}
      <div id="card-completed" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed Shifts</p>
          <h3 className="text-3xl font-bold text-emerald-600 mt-1 font-mono-val">{completed}</h3>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
              {totalLogs > 0 ? Math.round((completed / totalLogs) * 100) : 0}% Rate
            </span>
            <span>{inProgress} active task(s)</span>
          </p>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      {/* CARD 4: Delay Concerns */}
      <div id="card-delays" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delayed Shifts</p>
          <h3 className={`text-3xl font-bold mt-1 font-mono-val ${delayed > 0 ? "text-rose-600" : "text-slate-600"}`}>{delayed}</h3>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {pending} pending / not started
          </p>
        </div>
        <div className={`p-3 rounded-xl ${delayed > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-500'}`}>
          {delayed > 0 ? <AlertTriangle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
        </div>
      </div>
    </div>
  );
}
