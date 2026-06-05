/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DailyLog {
  id: string; // Internal identifier
  rowIndex: number; // Row number in Google Sheet (for updates/deletes)
  date: string; // YYYY-MM-DD
  taskName: string; // Name of task, activity or site
  shift: "Morning" | "Evening" | "Night" | "Full Day" | string;
  target: number; // Target quantity or target meter
  actual: number; // Actual amount done
  achievement: number; // calculated actual / target * 100
  status: "Completed" | "In Progress" | "Pending" | "Delayed" | string;
  remarks: string; // Operational remarks or reason for delays
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
  range: string;
}

export interface ShiftStats {
  shift: string;
  count: number;
  avgTarget: number;
  avgActual: number;
  avgAchievement: number;
}

export interface OperationalSummary {
  totalLogs: number;
  completedLogs: number;
  inProgressLogs: number;
  pendingLogs: number;
  delayedLogs: number;
  averageAchievement: number;
  totalTarget: number;
  totalActual: number;
}
