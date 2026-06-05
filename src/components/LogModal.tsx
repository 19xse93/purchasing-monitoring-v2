import React, { useState, useEffect } from "react";
import { DailyLog } from "../types";
import { X, CheckCircle, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (log: Omit<DailyLog, "id" | "rowIndex" | "achievement">) => Promise<void>;
  editLog?: DailyLog | null;
  sheetName: string;
}

export function LogModal({ isOpen, onClose, onSubmit, editLog, sheetName }: LogModalProps) {
  const [date, setDate] = useState("");
  const [taskName, setTaskName] = useState("");
  const [shift, setShift] = useState("Morning");
  const [target, setTarget] = useState("");
  const [actual, setActual] = useState("");
  const [status, setStatus] = useState("Completed");
  const [remarks, setRemarks] = useState("");
  
  // Step 1: Form entry. Step 2: Confirmation screen.
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editLog) {
        setDate(editLog.date);
        setTaskName(editLog.taskName);
        setShift(editLog.shift);
        setTarget(editLog.target.toString());
        setActual(editLog.actual.toString());
        setStatus(editLog.status);
        setRemarks(editLog.remarks);
      } else {
        // Default values
        setDate(new Date().toISOString().split("T")[0]);
        setTaskName("");
        setShift("Morning");
        setTarget("");
        setActual("");
        setStatus("In Progress");
        setRemarks("");
      }
      setStep(1);
      setError(null);
    }
  }, [isOpen, editLog]);

  if (!isOpen) return null;

  // Compute calculated values
  const numTarget = parseFloat(target) || 0;
  const numActual = parseFloat(actual) || 0;
  const calculatedAchievement = numTarget > 0 ? Math.round((numActual / numTarget) * 100) : 0;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !taskName || !target || !actual) {
      setError("Please fill out all required fields (*).");
      return;
    }
    setError(null);
    setStep(2); // Go to write confirmation screen!
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        date,
        taskName,
        shift,
        target: numTarget,
        actual: numActual,
        status,
        remarks,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save to Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md w-fit">
              Sheet: {sheetName}
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">
              {editLog ? `Edit Log (Row #${editLog.rowIndex})` : "Add New Operational Log"}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-2.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full text-lg cursor-pointer"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: FORM INPUTS */
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date *</label>
                <input 
                  type="date"
                  required
                  className="w-full text-sm bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Site / Task Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. EDSA LED Signage Inspection"
                  className="w-full text-sm bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shift</label>
                  <select 
                    className="w-full text-sm bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                    <option value="Full Day">Full Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select 
                    className="w-full text-sm bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="Delayed">Delayed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Metrics (Goal) *</label>
                  <input 
                    type="number"
                    required
                    placeholder="e.g. 100"
                    className="w-full text-sm bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Actual Achieved *</label>
                  <input 
                    type="number"
                    required
                    placeholder="e.g. 85"
                    className="w-full text-sm bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              {numTarget > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-100">
                  <span className="text-slate-500">Auto-calculated Achievement Rate:</span>
                  <span className={`font-bold font-mono-val bg-white px-2 py-1 rounded border border-slate-200 ${calculatedAchievement >= 100 ? 'text-emerald-600' : calculatedAchievement >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {calculatedAchievement}%
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Operational Remarks / Delay Logs</label>
                <textarea 
                  placeholder="Describe details: why was it delayed, materials missing, team details, supervisor name..."
                  className="w-full text-sm bg-slate-50/50 border border-slate-200 rounded-xl p-3 h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition resize-none"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              {/* Step 1 Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 hover:text-slate-800 transition shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
                >
                  Confirm Operations <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: MANDATORY CONFIRMATION SCREEN */
            <div className="space-y-4 py-2 animate-fade-in">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-800">
                <CheckCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Write Confirmation Required</h4>
                  <p className="text-xs text-amber-700/90 mt-1">
                    You are syncing data directly with your enterprise Google Worksheet. This operation overrides or appends cell values securely.
                  </p>
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Operational Value Checklist</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {editLog ? "Row Update" : "Database Append"}
                  </span>
                </div>
                
                <div className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Sheet Tab</span>
                    <span className="font-extrabold text-slate-700">{sheetName}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Date</span>
                    <span className="font-mono-val font-bold text-slate-700">{date}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 min-w-[70px]">site/Task Name</span>
                    <span className="font-bold text-slate-700 truncate max-w-[240px]">{taskName}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Shift</span>
                    <span className="font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">{shift}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Target goal</span>
                    <span className="font-mono-val font-extrabold text-slate-700">{target}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Actual Done</span>
                    <span className="font-mono-val font-extrabold text-slate-700">{actual}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Achievement rate</span>
                    <span className="font-mono-val font-semibold text-emerald-600">{calculatedAchievement}%</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Status status</span>
                    <span className="text-slate-700 font-semibold">{status}</span>
                  </div>
                  <div className="flex flex-col py-1">
                    <span className="text-slate-400 mb-1">Operational Remarks</span>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-slate-500 leading-relaxed font-normal min-h-[44px]">
                      {remarks || <em className="text-slate-300">No remarks logged.</em>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                  disabled={loading}
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Syncing with Sheet...
                    </>
                  ) : (
                    <>Confirm & Sync Sheet</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
