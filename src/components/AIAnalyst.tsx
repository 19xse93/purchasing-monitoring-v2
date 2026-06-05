import React, { useState } from "react";
import { DailyLog } from "../types";
import { Sparkles, Send, Loader2, Cpu, FileText, TrendingUp, AlertCircle } from "lucide-react";

interface AIAnalystProps {
  logs: DailyLog[];
}

export function AIAnalyst({ logs }: AIAnalystProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick Preset Prompts
  const presets = [
    {
      title: "Shift Bottlenecks",
      desc: "Compare Morning vs Evening productivity problems.",
      promptText: "Compare Morning vs Evening shift targets, actual achievements, and average completion rates. Tell us which shift has more bottlenecks and recommend strategies for John and sir Resti to optimize manpower.",
      icon: Cpu,
    },
    {
      title: "Anomalies & Delays Audit",
      desc: "Audit delayed shifts and review remarks reason logs.",
      promptText: "Audit all operations marked as 'Delayed' or having completion rates below 80%. Categorize the reasons for these delays based on the remarks logs and provide sir Resti & John with a root-cause remediation report.",
      icon: AlertCircle,
    },
    {
      title: "Optimized Roadmap",
      desc: "Create specific optimization guidelines for the leads.",
      promptText: "Create a customized daily monitoring roadmap for supervisor John Diraya and director sir Resti. Suggest how to structure daily check-ins, what metrics to prioritize, and concrete target-setting policies to lift overall achievement rate.",
      icon: FileText,
    },
    {
      title: "Historical Forecasts",
      desc: "Project next week's completion capabilities.",
      promptText: "Given the historical targets and achievement logs, forecast next week's operational completion capabilities. Highlight expected target achievement levels and provide advice on setting sustainable weekly goals.",
      icon: TrendingUp,
    },
  ];

  const handleRunAnalysis = async (userPrompt: string) => {
    if (logs.length === 0) {
      setError("Please connect a Google Sheet containing data logs before running analysis.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logs,
          prompt: userPrompt,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate AI operational analysis.");
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during AI analysis.");
    } finally {
      setLoading(false);
    }
  };

  // Safe and beautifully styled Markdown-like simplified parser to avoid package dependency conflicts
  const renderMarkdownText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, index) => {
      let trimmed = line.trim();

      // Headers
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={index} className="text-sm font-bold text-slate-800 mt-5 mb-2 flex items-center gap-1.5 font-display">
            <span className="w-1.5 h-3 bg-indigo-500 rounded"></span>
            {parseBoldText(trimmed.replace(/^###\s*/, ""))}
          </h4>
        );
      }
      if (trimmed.startsWith("##")) {
        return (
          <h3 key={index} className="text-base font-bold text-slate-800 mt-6 mb-3 flex items-center gap-2 border-b border-slate-100 pb-1.5 font-display">
            <span className="w-2 h-4 bg-indigo-600 rounded"></span>
            {parseBoldText(trimmed.replace(/^##\s*/, ""))}
          </h3>
        );
      }
      if (trimmed.startsWith("#")) {
        return (
          <h2 key={index} className="text-lg font-extrabold text-slate-900 mt-7 mb-4 flex items-center gap-2 font-display">
            {parseBoldText(trimmed.replace(/^#\s*/, ""))}
          </h2>
        );
      }

      // Bullet points
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const content = trimmed.replace(/^[-*]\s*/, "");
        return (
          <li key={index} className="list-none pl-6 relative py-1 text-xs text-slate-600 border-l border-slate-100 leading-relaxed font-normal">
            <span className="absolute left-2 top-3 w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
            {parseBoldText(content)}
          </li>
        );
      }

      // Numbered List
      if (/^\d+\.\s*/.test(trimmed)) {
        const num = trimmed.match(/^\d+/)?.[0] || "";
        const content = trimmed.replace(/^\d+\.\s*/, "");
        return (
          <div key={index} className="flex gap-2.5 py-1.5 text-xs text-slate-600 leading-relaxed font-normal">
            <span className="font-mono-val font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md min-w-[24px] text-center shrink-0 h-fit">
              {num}
            </span>
            <div className="flex-1">{parseBoldText(content)}</div>
          </div>
        );
      }

      // Empty Lines
      if (!trimmed) {
        return <div key={index} className="h-2" />;
      }

      // Normal paragraph
      return (
        <p key={index} className="text-xs text-slate-600 leading-relaxed font-normal py-1">
          {parseBoldText(trimmed)}
        </p>
      );
    });
  };

  // Helper inside parser to replace **text** with styled bold elements
  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      // odd indexes are the matching text inside **
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div id="ai-analyst-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in flex flex-col h-full min-h-[500px]">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-md font-bold text-slate-800">Gemini operations Analyst</h2>
            <p className="text-[11px] text-slate-400">Deep performance metrics auditor & roadmap planner</p>
          </div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-5 overflow-y-auto">
        {/* Preset Query Options */}
        {!report && !loading && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select operational audit standard:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.title}
                    onClick={() => {
                      setPrompt(preset.promptText);
                      handleRunAnalysis(preset.promptText);
                    }}
                    className="p-4 text-left border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 hover:shadow-xs rounded-xl flex gap-3 transition group cursor-pointer"
                  >
                    <div className="p-2 bg-white text-indigo-500 rounded-lg group-hover:bg-indigo-50 shrink-0 h-fit transition border border-slate-100">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1 group-hover:text-indigo-600">
                        {preset.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal font-normal">{preset.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <div>
              <p className="font-semibold text-xs text-slate-700">Analysing operational logs...</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-sm font-normal">
                Gemini is auditing date entries, compiling shift KPIs, noting comments in remarks, and formatting sir Resti's roadmap.
              </p>
            </div>
          </div>
        )}

        {/* Error Screen */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Generated Analysis Report */}
        {report && !loading && (
          <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-6 overflow-y-auto max-h-[500px]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Audit Report Released</span>
              <button 
                onClick={() => setReport(null)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Reset Analysis
              </button>
            </div>
            <div className="space-y-2 prose max-w-none text-left">
              {renderMarkdownText(report)}
            </div>
          </div>
        )}
      </div>

      {/* Manual Prompt Input Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (!prompt.trim()) return;
            handleRunAnalysis(prompt);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Ask Gemini to write a report, suggest changes or audit logs..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer text-xs flex items-center justify-center font-bold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
