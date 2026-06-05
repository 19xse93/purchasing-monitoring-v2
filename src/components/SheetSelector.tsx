import React, { useState, useEffect } from "react";
import { googleService } from "../googleService";
import { SheetConfig } from "../types";
import { Database, Plus, Search, Loader2, Link2, Check, RefreshCw } from "lucide-react";

interface SheetSelectorProps {
  token: string;
  config: SheetConfig | null;
  onSelectConfig: (config: SheetConfig) => void;
}

export function SheetSelector({ token, config, onSelectConfig }: SheetSelectorProps) {
  const [spreadsheets, setSpreadsheets] = useState<Array<{ id: string; name: string; url: string; modifiedTime: string }>>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState("");
  const [sheetTabs, setSheetTabs] = useState<string[]>([]);
  const [selectedSheetTab, setSelectedSheetTab] = useState("");
  const [manualId, setManualId] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (token) {
      loadUserSpreadsheets();
    }
  }, [token]);

  useEffect(() => {
    if (selectedSpreadsheetId) {
      loadSheetTabs(selectedSpreadsheetId);
    } else {
      setSheetTabs([]);
    }
  }, [selectedSpreadsheetId]);

  const loadUserSpreadsheets = async () => {
    setLoadingList(true);
    try {
      const files = await googleService.listUserSpreadsheets(token);
      setSpreadsheets(files);
      if (files.length > 0 && !selectedSpreadsheetId && !config) {
        // Auto-select the first sheet as starting default
        setSelectedSpreadsheetId(files[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  const loadSheetTabs = async (id: string) => {
    setLoadingTabs(true);
    try {
      const tabs = await googleService.getSpreadsheetSheets(token, id);
      setSheetTabs(tabs);
      if (tabs.length > 0) {
        setSelectedSheetTab(tabs[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTabs(false);
    }
  };

  const handleConnectSelected = () => {
    if (!selectedSpreadsheetId || !selectedSheetTab) return;
    
    const matched = spreadsheets.find(s => s.id === selectedSpreadsheetId);
    const url = matched ? matched.url : `https://docs.google.com/spreadsheets/d/${selectedSpreadsheetId}/edit`;
    
    onSelectConfig({
      spreadsheetId: selectedSpreadsheetId,
      spreadsheetUrl: url,
      sheetName: selectedSheetTab,
      range: "A1:H100"
    });
  };

  const handleConnectManual = () => {
    if (!manualId.trim()) return;
    let extractedId = manualId.trim();
    
    // Check if it is a full Google Sheets URL
    // e.g. https://docs.google.com/spreadsheets/d/1B4C584A-C9A6-4CB7-ACE6-2CFBEAA1AA1D/edit#gid=0
    if (extractedId.includes("/d/")) {
      const parts = extractedId.split("/d/");
      if (parts[1]) {
        extractedId = parts[1].split("/")[0];
      }
    }

    onSelectConfig({
      spreadsheetId: extractedId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
      sheetName: "Sheet1", // standard fallback tab name
      range: "A1:H100"
    });
  };

  const handleCreateTemplate = async () => {
    setCreatingTemplate(true);
    try {
      const newConfig = await googleService.createStandardTemplate(token);
      onSelectConfig(newConfig);
      // reload lists to include the freshly created template
      await loadUserSpreadsheets();
      setSelectedSpreadsheetId(newConfig.spreadsheetId);
      setSelectedSheetTab(newConfig.sheetName);
    } catch (err) {
      console.error(err);
      alert("Failed to auto-create standard template. Please verify Google Drive or Sheets APIs are active.");
    } finally {
      setCreatingTemplate(false);
    }
  };

  // Filter spreadsheets list based on simple search query
  const filteredSpreadsheets = spreadsheets.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="sheet-selector-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-fade-in space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-md font-bold text-slate-800">Connection Settings</h2>
            <p className="text-[11px] text-slate-400">Map dashboard metrics directly to active Google Sheets</p>
          </div>
        </div>
        <button 
          onClick={loadUserSpreadsheets}
          disabled={loadingList}
          className="p-1 px-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-100 transition cursor-pointer"
          title="Reload lists"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Active connected sheet banner */}
      {config && (
        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-3">
          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
            <Check className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              Connected Dashboard
            </p>
            <p className="text-[11px] text-slate-600 mt-1 leading-normal truncate max-w-md font-semibold">
              Tab: <span className="text-emerald-700">"{config.sheetName}"</span> within ID {config.spreadsheetId}
            </p>
            <div className="mt-2.5 flex gap-2">
              <a 
                href={config.spreadsheetUrl} 
                target="_blank" 
                referrerPolicy="no-referrer"
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-150 px-2 py-1 rounded transition shrink-0 inline-flex items-center gap-1"
              >
                <Link2 className="w-2.5 h-2.5" /> Open Google Worksheets tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2 Modes layout: select from list OR create template */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        
        {/* Box A: Auto selector */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select tracker from drive :</label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Sheet File search List */}
            <div className="space-y-2 border border-slate-150 rounded-xl p-3 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter spreadsheets..."
                  className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1">
                {loadingList ? (
                  <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" /> Loading Google documents...
                  </div>
                ) : filteredSpreadsheets.length === 0 ? (
                  <p className="text-[11px] text-slate-400 p-3 text-center">No spreadsheets found matching criteria.</p>
                ) : (
                  filteredSpreadsheets.map(sheet => (
                    <button
                      key={sheet.id}
                      onClick={() => setSelectedSpreadsheetId(sheet.id)}
                      className={`w-full text-left p-2 rounded-lg text-xs leading-normal font-normal transition truncate ${
                        selectedSpreadsheetId === sheet.id 
                          ? 'bg-indigo-50 border border-indigo-150 text-indigo-800 font-semibold' 
                          : 'bg-white hover:bg-slate-100 border border-slate-100 text-slate-600'
                      }`}
                    >
                      📁 {sheet.name}
                      <span className="block text-[9px] text-slate-400 mt-0.5">Updated: {sheet.modifiedTime}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Sheet Tabs dropdown */}
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Sheet tab :</label>
                {loadingTabs ? (
                  <div className="py-2.5 text-xs text-slate-400 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" /> Fetching sheet tabs...
                  </div>
                ) : sheetTabs.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Select a spreadsheet on the left to load its tabs.</p>
                ) : (
                  <select
                    className="w-full text-xs bg-slate-50/50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedSheetTab}
                    onChange={(e) => setSelectedSheetTab(e.target.value)}
                  >
                    {sheetTabs.map(tab => (
                      <option key={tab} value={tab}>{tab}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConnectSelected}
                  disabled={!selectedSpreadsheetId || !selectedSheetTab || loadingTabs}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 border border-transparent rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Connect Active Tab
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 text-xs text-slate-400 my-1">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span>OR QUICK TEMPLATE START</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>

        {/* Box B: Create template and paste URL */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 space-y-1 max-w-md">
            <h4 className="font-bold text-xs text-slate-700">Daily Monitoring Template (Recommended)</h4>
            <p className="text-[11px] text-slate-400 font-normal leading-normal">
              Click the button below to auto-provision an elegant DAILY MONITORING V1 tracker pre-loaded with sir Resti & John's sample operational metrics.
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleCreateTemplate}
            disabled={creatingTemplate}
            className="w-full md:w-auto px-5 py-3 text-xs font-bold bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white hover:text-white rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            {creatingTemplate ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" /> Provisioning template...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Create Daily Monitor template
              </>
            )}
          </button>
        </div>

        {/* Box C: Manual ID input */}
        <div className="flex flex-col gap-2 pt-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Manual URL / Spreadsheet ID connection:</label>
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Paste Google sheet spreadsheet URL or ID here..."
              className="flex-1 text-xs bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
            <button
              onClick={handleConnectManual}
              disabled={!manualId.trim()}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 text-white disabled:text-slate-400 border border-transparent rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Connect ID
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
