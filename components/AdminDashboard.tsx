import React, { useEffect, useState } from "react";
import { API, API_BASE } from "../config";
import { IconUpload, IconActivity, IconMessageSquare } from "./Icons";
import { HOTEL_NAME } from "../constants";

/** Types that match the backend payload */
type TopicStat = { topic: string; count: number };
type RecentSession = {
  id: string;
  questionCount: number;
  status: "Resolved" | "Needs Review";
  startTime: string;
};
type AdminStats = {
  sessions: number;
  unanswered: number;
  lastUpdate: string | null;
  hasFile: boolean;
  topics: TopicStat[];
  recentSessions: RecentSession[];
};

const ADMIN_BG_URL =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    sessions: 0,
    unanswered: 0,
    lastUpdate: null,
    hasFile: false,
    topics: [],
    recentSessions: [],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    try {
      const r = await fetch(API.stats);
      const d = await r.json();
      setStats({
        sessions: d.totalSessions ?? 0,
        unanswered: d.unansweredQuestions ?? 0,
        lastUpdate: d.lastUpdate ?? null,
        hasFile: !!d.currentPdf,
        topics: Array.isArray(d.topics) ? d.topics : [],
        recentSessions: (d.recentSessions ?? []).map((s: any) => ({
          id: s.id,
          questionCount: s.questionCount ?? 0,
          status: (s.status as "Resolved" | "Needs Review") ?? "Resolved",
          startTime: s.startTime ?? "",
        })),
      });
    } catch (e) {
      console.error("stats load error", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, 30000);
    return () => clearInterval(id);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    async function tryUpload(url: string, fieldName: "file" | "pdf") {
      const fd = new FormData();
      fd.append(fieldName, file);
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Upload failed → ${res.status} ${res.statusText} @ ${url} as "${fieldName}"\n${text}`
        );
      }
      return res.json();
    }

    try {
      try {
        await tryUpload(API.uploadPdf, "file");
      } catch {
        try {
          await tryUpload(API.uploadPdf, "pdf");
        } catch {
          await tryUpload(`${API_BASE}/api/admin/upload`, "file");
        }
      }
      await loadStats();
    } catch (err) {
      console.error(String(err));
      alert("Upload failed. Open DevTools → Network for details.");
    } finally {
      setIsUploading(false);
      e.currentTarget.value = "";
    }
  };

  const topTopic = stats.topics[0];

  return (
    <div className="relative min-h-screen font-sans text-slate-800">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={ADMIN_BG_URL}
          alt="Hotel lobby"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/45" />
      </div>

      {/* Foreground */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-6xl bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/40 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 bg-white/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-hotel-900 text-white flex items-center justify-center text-xs font-serif font-bold shadow-md">
                CH
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold text-slate-900">{HOTEL_NAME}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                  Admin console
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ocean-600 text-white text-sm shadow hover:bg-ocean-700 cursor-pointer">
              <IconUpload className="w-4 h-4" />
              {isUploading ? "Uploading..." : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Scroll area */}
          <div className="p-6 md:p-8 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload status */}
              <div className="lg:col-span-2 bg-slate-50/50 rounded-2xl border border-slate-200/60 overflow-hidden">
                <div className="p-5 border-b border-slate-200/60 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-white text-ocean-600 rounded-md shadow-sm border border-slate-100">
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" x2="8" y1="13" y2="13" />
                        <line x1="16" x2="8" y1="17" y2="17" />
                        <line x1="10" x2="8" y1="9" y2="9" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-700 text-sm">
                      Knowledge Base
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                    PDF
                  </span>
                </div>

                <div className="p-6">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      stats.hasFile
                        ? "border-green-200 bg-green-50/50"
                        : "border-slate-300 hover:border-ocean-400 hover:bg-white"
                    }`}
                  >
                    <p className="font-medium text-slate-900 mb-1 text-sm">
                      {stats.hasFile
                        ? "Knowledge base active"
                        : "Click Upload PDF to choose a file"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {stats.hasFile
                        ? "The assistant is using the current PDF."
                        : "Upload the hotel guide PDF to update the assistant."}
                    </p>
                    <div className="mt-3 text-xs text-slate-400">
                      Base API: <span className="font-mono">{API_BASE}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status mini cards */}
              <div className="flex flex-col gap-4">
                <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 flex-1 flex flex-col justify-center">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Status
                  </h4>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        stats.hasFile
                          ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                          : "bg-orange-500"
                      }`}
                    />
                    <span className="font-semibold text-slate-700 text-sm">
                      {stats.hasFile ? "System Online" : "Setup Required"}
                    </span>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg text-xs font-medium border text-center ${
                      stats.hasFile
                        ? "bg-green-50 border-green-100 text-green-700"
                        : "bg-orange-50 border-orange-100 text-orange-700"
                    }`}
                  >
                    {stats.hasFile
                      ? `Active${
                          stats.lastUpdate
                            ? ` · ${new Date(
                                stats.lastUpdate
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : ""
                        }`
                      : "Upload PDF to start"}
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Auto refresh
                  </h4>
                  <p className="text-xs text-slate-500">Every 30 seconds</p>
                </div>
              </div>

              {/* Overview cards */}
              <div className="lg:col-span-3 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <OverviewCard
                    label="Sessions"
                    value={loading ? "…" : String(stats.sessions)}
                    icon={
                      <IconMessageSquare className="w-4 h-4 text-hotel-500" />
                    }
                  />
                  <OverviewCard
                    label="Unanswered"
                    value={loading ? "…" : String(stats.unanswered)}
                    hint="Needs attention"
                    icon={
                      <svg
                        className="w-4 h-4 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    }
                  />
                  <OverviewCard
                    label="Top Topic"
                    value={topTopic?.topic ?? "—"}
                    hint={
                      topTopic ? `${topTopic.count} inquiries` : "No data yet"
                    }
                    icon={<IconActivity className="w-4 h-4 text-blue-500" />}
                  />
                </div>

                {/* Recent Sessions table */}
                <RecentSessionsTable rows={stats.recentSessions} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {hint ? (
          <span className="text-[10px] text-slate-400">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

function RecentSessionsTable({ rows }: { rows: RecentSession[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
        <h4 className="text-xs font-semibold text-slate-700">
          Recent Sessions
        </h4>
        <span className="text-xs text-slate-500">{rows.length}</span>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 bg-slate-50/50 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-medium">Session ID</th>
                <th className="px-5 py-3 font-medium">Questions</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500 break-all">
                    {s.id}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {s.questionCount}
                  </td>
                  <td className="px-5 py-3">
                    {s.status === "Needs Review" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100">
                        Needs Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                        Resolved
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-slate-400">
                    {s.startTime ? new Date(s.startTime).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm">
          {`No sessions yet${""}`}
        </div>
      )}
    </div>
  );
}
