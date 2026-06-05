import { DailyLog, SheetConfig } from "./types";

/**
 * Service class to wrap Google Workspace APIs (Sheets & Drive metadata)
 */

export const googleService = {
  /**
   * Search for Google Sheets in the user's Google Drive.
   */
  async listUserSpreadsheets(accessToken: string): Promise<Array<{ id: string; name: string; url: string; modifiedTime: string }>> {
    try {
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=30`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to list spreadsheets: ${res.statusText}`);
      }

      const data = await res.json();
      return (data.files || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
        modifiedTime: new Date(file.modifiedTime).toLocaleDateString(),
      }));
    } catch (error) {
      console.error("Error listing spreadsheets:", error);
      throw error;
    }
  },

  /**
   * Fetch all sheet tabs (names) of a Google Spreadsheet to let user choose which tab to monitor.
   */
  async getSpreadsheetSheets(accessToken: string, spreadsheetId: string): Promise<string[]> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch sheet tabs: ${res.statusText}`);
      }

      const data = await res.json();
      return (data.sheets || []).map((s: any) => s.properties.title);
    } catch (error) {
      console.error("Error fetching spreadsheets tabs:", error);
      return ["Sheet1"]; // safe fallback
    }
  },

  /**
   * Create a new "DAILY MONITORING V1" Spreadsheet template in the user's Drive.
   */
  async createStandardTemplate(accessToken: string): Promise<SheetConfig> {
    try {
      const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
      
      // 1. Create spreadsheet with custom name and tabs
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            title: "DAILY MONITORING V1 - with sir REsti (Dashboard Connected)",
          },
          sheets: [
            {
              properties: {
                title: "DAILY MONITORING V1",
              },
            },
          ],
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create spreadsheet template: ${createRes.statusText}`);
      }

      const spreadsheet = await createRes.json();
      const id = spreadsheet.spreadsheetId;
      const url = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${id}/edit`;
      const sheetName = "DAILY MONITORING V1";

      // 2. Load it up with elegant starting headers and sample operational metrics
      // Columns: Date, Task/Site Name, Shift, Target, Actual, Achievement %, Status, Remarks
      const headersAndSampleData = [
        ["Date", "Task / Site Name", "Shift", "Target", "Actual Achieve", "Achievement %", "Status", "Operational Remarks"],
        ["2026-06-01", "Metro Rail Site A - Digital Billboard Setup", "Morning", "100", "95", "95%", "Completed", "Perfect alignment and installation."],
        ["2026-06-01", "Epifanio de los Santos Ave (EDSA) LED Calibration", "Evening", "80", "45", "56%", "Delayed", "Power delivery failure interrupted calibration shift."],
        ["2026-06-02", "Shaw Blvd Crossing Support Frames Inspection", "Morning", "120", "120", "100%", "Completed", "Inspection done on time under supervision."],
        ["2026-06-02", "C5 Out-Of-Home (OOH) Spot Checking", "Evening", "50", "48", "96%", "Completed", "Minor static interference resolved quickly."],
        ["2026-06-03", "BGC High Street Gantry Maintenance", "Morning", "60", "20", "33%", "Delayed", "Delayed due to heavy tropical rain storm."],
        ["2026-06-03", "North Luzon Expressway (NLEX) Advertising Board Audit", "Evening", "150", "145", "97%", "In Progress", "Partially pending formal signage sign-off."],
        ["2026-06-04", "South Luzon Expressway (SLEX) Gantry Maintenance", "Morning", "90", "90", "100%", "Completed", "Smooth structural updates completed by shift team."],
        ["2026-06-04", "Quezon Avenue Gantries Signal Checks", "Evening", "110", "105", "95%", "Completed", "Signal stability verified. Ready for launch."],
      ];

      // Write samples to Sheet
      const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/'${sheetName}'!A1:H10?valueInputOption=USER_ENTERED`;
      const writeRes = await fetch(writeUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: `'${sheetName}'!A1:H10`,
          majorDimension: "ROWS",
          values: headersAndSampleData,
        }),
      });

      if (!writeRes.ok) {
        console.warn("Failed to write sample rows to sheet template:", await writeRes.text());
      }

      return {
        spreadsheetId: id,
        spreadsheetUrl: url,
        sheetName,
        range: "A1:H100",
      };
    } catch (error) {
      console.error("Error creating standard sheet template:", error);
      throw error;
    }
  },

  /**
   * Fetch daily logs from a specific spreadsheet ID and tab name.
   */
  async fetchDailyLogs(accessToken: string, spreadsheetId: string, sheetName: string): Promise<DailyLog[]> {
    try {
      const range = `${sheetName}!A1:H200`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch sheet values: ${res.statusText}`);
      }

      const data = await res.json();
      const rows = data.values || [];

      if (rows.length === 0) {
        return [];
      }

      // Check if Row 1 is a header row, we'll map indexes but ignore it for calculation.
      const hasHeader = rows[0] && rows[0].some((val: any) => typeof val === "string" && val.toLowerCase().includes("date") || val.toLowerCase().includes("task") || val.toLowerCase().includes("target"));
      const startIndex = hasHeader ? 1 : 0;

      const parsedLogs: DailyLog[] = [];

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

        const rowIndex = i + 1; // Google sheets rows are 1-indexed
        const date = row[0] || "";
        const taskName = row[1] || "";
        const shift = row[2] || "Full Day";
        
        // Ensure numeric parsing
        const target = parseFloat(row[3]) || 0;
        const actual = parseFloat(row[4]) || 0;
        
        // Percentage achievement can be parsed or calculated
        let achievement = 100;
        if (target > 0) {
          achievement = Math.round((actual / target) * 100);
        } else if (actual > 0) {
          achievement = 100;
        } else {
          achievement = 0;
        }

        // Status column
        const rawStatus = row[6] || "";
        let status = "Completed";
        if (rawStatus) {
          status = rawStatus;
        } else {
          // auto-compute status if missing
          if (achievement >= 100) status = "Completed";
          else if (achievement > 0) status = "In Progress";
          else status = "Pending";
        }

        const remarks = row[7] || "";

        parsedLogs.push({
          id: `${spreadsheetId}_row_${rowIndex}`,
          rowIndex,
          date,
          taskName,
          shift,
          target,
          actual,
          achievement,
          status,
          remarks,
        });
      }

      return parsedLogs;
    } catch (error) {
      console.error("Error fetching daily logs:", error);
      throw error;
    }
  },

  /**
   * Append a new daily log row to the Google Sheet.
   */
  async appendDailyLog(accessToken: string, spreadsheetId: string, sheetName: string, log: Omit<DailyLog, "id" | "rowIndex" | "achievement">): Promise<void> {
    try {
      const range = `'${sheetName}'!A:H`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
      
      const achievementPercentageStr = log.target > 0 ? `${Math.round((log.actual / log.target) * 100)}%` : "0%";

      const payload = {
        range,
        majorDimension: "ROWS",
        values: [
          [
            log.date,
            log.taskName,
            log.shift,
            log.target.toString(),
            log.actual.toString(),
            achievementPercentageStr,
            log.status,
            log.remarks,
          ],
        ],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to append log: ${res.statusText}`);
      }
    } catch (error) {
      console.error("Error appending daily log:", error);
      throw error;
    }
  },

  /**
   * Update an existing daily log row in the Google Sheet.
   */
  async updateDailyLog(accessToken: string, spreadsheetId: string, sheetName: string, rowIndex: number, log: Omit<DailyLog, "id" | "rowIndex" | "achievement">): Promise<void> {
    try {
      const range = `'${sheetName}'!A${rowIndex}:H${rowIndex}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
      
      const achievementPercentageStr = log.target > 0 ? `${Math.round((log.actual / log.target) * 100)}%` : "0%";

      const payload = {
        range,
        majorDimension: "ROWS",
        values: [
          [
            log.date,
            log.taskName,
            log.shift,
            log.target.toString(),
            log.actual.toString(),
            achievementPercentageStr,
            log.status,
            log.remarks,
          ],
        ],
      };

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to update log: ${res.statusText}`);
      }
    } catch (error) {
      console.error("Error updating daily log:", error);
      throw error;
    }
  },

  /**
   * Delete or clear a daily log row in the Google Sheet.
   */
  async clearDailyLog(accessToken: string, spreadsheetId: string, sheetName: string, rowIndex: number): Promise<void> {
    try {
      // Rather than deleting row structures which can break sheet formulas, we can Clear its content values or set status to "Archived/Deleted"
      const range = `'${sheetName}'!A${rowIndex}:H${rowIndex}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to clear row: ${res.statusText}`);
      }
    } catch (error) {
      console.error("Error clearing daily log row:", error);
      throw error;
    }
  },
};
