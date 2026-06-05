import React, { useState } from "react";
import { DailyLog } from "../types";
import { Search, Filter, Edit2, Trash2, SlidersHorizontal, ArrowUpDown } from "lucide-react";

interface LogsTableProps {
  logs: DailyLog[];
  onEdit: (log: DailyLog) => void;
  onClear: (log: DailyLog) => void;
}

export function LogsTable({ logs, onEdit, onClear }: LogsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShift, setSelectedShift] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "achievement" | "target" | "actual">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter & Search Logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.date.includes(searchTerm);

    const matchesShift = 
      selectedShift === "all" || 
      log.shift.toLowerCase() === selectedShift.toLowerCase();

    const matchesStatus = 
      selectedStatus === "all" || 
      log.status.toLowerCase() === selectedStatus.toLowerCase() ||
      (selectedStatus === "completed" && log.status.toLowerCase().includes("complete")) ||
      (selectedStatus === "delayed" && log.status.toLowerCase().includes("delay")) ||
      (selectedStatus === "progress" && log.status.toLowerCase().includes("progress"));

    return matchesSearch && matchesShift && matchesStatus;
  });

  // Sort Logic
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let comparative = 0;
    if (sortBy === "date") {
      comparative = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else {
      comparative = (a[sortBy] as number) - (b[sortBy] as number);
    }
    return sortOrder === "asc" ? comparative : -comparative;
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Status tag badge styles helper
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("complete")) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center w-fit gap-1.5 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed
        </span>
      );
    }
    if (s.includes("progress") || s.includes("active")) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-50 text-sky-700 border border-sky-100 flex items-center w-fit gap-1.5 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> In Progress
        </span>
      );
    }
    if (s.includes("delay") || s.includes("fail") || s.includes("stop")) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-100 flex items-center w-fit gap-1.5 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Delayed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center w-fit gap-1.5 justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending
      </span>
    );
  };

  return (
    <div id="logs-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in flex flex-col h-full">
      {/* Header controls */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800">Operational Logs</h2>
          <span className="bg-slate-200 text-slate-700 font-mono-val px-2 py-0.5 rounded text-xs font-bold">
            {sortedLogs.length} shown
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:max-w-3xl">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs/remarks..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Shift Filter */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-600"
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
              <option value="full day">Full Day</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              className="w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-600"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="progress">In Progress</option>
              <option value="delayed">Delayed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto flex-1 h-full min-h-[400px]">
        {sortedLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <SlidersHorizontal className="w-12 h-12 text-slate-300" />
            <div>
              <p className="font-semibold text-slate-600">No logs found</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting your filters or check your Google Sheet tabs.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold text-xs tracking-wider uppercase">
                <th className="px-5 py-3 h-11 w-16">Row</th>
                <th className="px-5 py-3 cursor-pointer select-none h-11 hover:bg-slate-100 text-slate-600 transition" onClick={() => toggleSort("date")}>
                  <span className="flex items-center gap-1">Date {sortBy === "date" && (sortOrder === "asc" ? "▲" : "▼")}</span>
                </th>
                <th className="px-5 py-3 h-11">Site/Task Name</th>
                <th className="px-5 py-3 h-11">Shift</th>
                <th className="px-5 py-3 cursor-pointer select-none h-11 hover:bg-slate-100 text-slate-600 transition" onClick={() => toggleSort("target")}>
                  <span className="flex items-center gap-1">Target {sortBy === "target" && (sortOrder === "asc" ? "▲" : "▼")}</span>
                </th>
                <th className="px-5 py-3 cursor-pointer select-none h-11 hover:bg-slate-100 text-slate-600 transition" onClick={() => toggleSort("actual")}>
                  <span className="flex items-center gap-1">Actual {sortBy === "actual" && (sortOrder === "asc" ? "▲" : "▼")}</span>
                </th>
                <th className="px-5 py-3 cursor-pointer select-none h-11 hover:bg-slate-100 text-slate-600 transition" onClick={() => toggleSort("achievement")}>
                  <span className="flex items-center gap-1">Achievement % {sortBy === "achievement" && (sortOrder === "asc" ? "▲" : "▼")}</span>
                </th>
                <th className="px-5 py-3 h-11">Status</th>
                <th className="px-5 py-3 h-11 max-w-[200px]">Remarks</th>
                <th className="px-5 py-3 text-right h-11 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {sortedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-4 font-mono-val font-semibold text-xs text-slate-400">#{log.rowIndex}</td>
                  <td className="px-5 py-4 font-mono-val whitespace-nowrap text-slate-600 font-medium">{log.date}</td>
                  <td className="px-5 py-4 font-medium text-slate-800 truncate max-w-[220px]" title={log.taskName}>
                    {log.taskName}
                  </td>
                  <td className="px-5 py-4">
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded">
                      {log.shift}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono-val text-slate-600 font-medium">{log.target}</td>
                  <td className="px-5 py-4 font-mono-val text-slate-800 font-semibold">{log.actual}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-slate-100 rounded-full h-1.5 flex overflow-hidden">
                        <div 
                          className={`h-full ${log.achievement >= 100 ? 'bg-emerald-500' : log.achievement >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(log.achievement, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`font-mono-val text-xs font-semibold ${log.achievement >= 100 ? 'text-emerald-600' : log.achievement >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {log.achievement}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">{getStatusBadge(log.status)}</td>
                  <td className="px-5 py-4 text-xs text-slate-500 truncate max-w-[200px]" title={log.remarks}>
                    {log.remarks || "--"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => onEdit(log)}
                        className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                        title="Edit Row"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onClear(log)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Clear Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
