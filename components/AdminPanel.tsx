import React, {
  useEffect,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Clock,
  FileCheck,
} from "lucide-react";
import { HotelConfig } from "../types";
import { API_BASE } from "../config";

type AdminPanelProps = {
  config: HotelConfig; // we keep this so App.tsx does not break, but we only use hotelName
  onUpdateConfig?: Dispatch<SetStateAction<HotelConfig>>;
};

type TopicStat = {
  topic: string;
  count: number;
};

type SessionStat = {
  sessionId: string;
  questionCount: number;
  unansweredCount: number;
  startedAt: string;
  lastUnansweredQuestion?: string | null;
};

type CurrentPdfInfo = {
  filename: string;
  uploadedAt: string;
};

type AdminStats = {
  totalSessions: number;
  questionsByCategory: TopicStat[];
  recentSessions: SessionStat[];
  lastUpdated: string;
  currentPdf?: CurrentPdfInfo | null;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = useState<{
    fileName: string;
    fileSizeMB: string;
    uploadedAt?: string;
  } | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);

        const res = await fetch(`${API_BASE}/api/admin/stats`);
        if (!res.ok) {
          throw new Error(`Failed to load stats (${res.status})`);
        }

        const api = await res.json();
        const mapped: AdminStats = {
          totalSessions: api.totalSessions ?? 0,
          questionsByCategory: (api.topics ?? []).map((t: any) => ({
            topic: t.name ?? t.topic ?? "Unknown",
            count: t.count ?? 0,
          })),
          recentSessions: api.recentSessions ?? [],
          lastUpdated: api.lastUpdated ?? new Date().toISOString(),
          currentPdf: api.currentPdf ?? null,
        };
        setStats(mapped);
      } catch (error: any) {
        console.error("Stats error:", error);
        setStatsError(
          error?.message || "Could not load admin statistics from backend."
        );
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // basic client-side validation
    if (file.type !== "application/pdf") {
      setUploadStatus("error");
      setUploadError("Only PDF files are supported for the knowledge base.");
      setSelectedFile(null);
      setUploadInfo(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus("error");
      setUploadError("File size must be under 10MB.");
      setSelectedFile(null);
      setUploadInfo(null);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/admin/pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Upload failed with status ${res.status}`
        );
      }

      const data = await res.json();

      const uploadedAt = data.uploadedAt || new Date().toISOString(); // backend can send an uploadedAt field later

      setUploadStatus("success");
      setUploadInfo({
        fileName: data.fileName || file.name,
        fileSizeMB: (file.size / 1024 / 1024).toFixed(1),
        uploadedAt,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setUploadError(
        error?.message || "Something went wrong while uploading the PDF."
      );
      setUploadInfo(null);
    }
  };

  const shortSessionId = (id: string) =>
    id.length > 10 ? `${id.slice(0, 8)}…` : id;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden p-6 sm:p-8 flex flex-col gap-6">
      {/* Top: PDF upload + current file */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="text-indigo-600" size={18} />
              Hotel knowledge base (PDF)
            </h2>
            <span className="text-[11px] uppercase tracking-wide text-gray-400">
              Admin
            </span>
          </div>

          <div
            className="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-slate-50/70 px-4 py-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/70 transition-all"
            onClick={handleBrowseClick}
          >
            <Upload className="mb-2 text-indigo-500" size={24} />
            <p className="text-sm font-medium text-gray-800">
              Click to choose a PDF
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Upload a single PDF that contains all hotel information. Uploading
              a new file replaces the previous version used by the chatbot.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="mt-3 space-y-2">
            {uploadStatus === "uploading" && (
              <div className="flex items-start gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-800">
                <AlertCircle size={16} className="mt-0.5 animate-pulse" />
                <div>
                  <p className="font-medium">Uploading PDF to backend...</p>
                  <p className="mt-0.5 text-[11px] text-indigo-700">
                    This file will become the only knowledge source for the
                    Cincinnati Hotel chatbot.
                  </p>
                </div>
              </div>
            )}

            {uploadStatus === "success" && uploadInfo && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800">
                <CheckCircle2 size={16} className="mt-0.5" />
                <div>
                  <p className="font-medium">PDF uploaded successfully</p>
                  <p className="mt-0.5 text-[11px] text-emerald-700">
                    {uploadInfo.fileName} · {uploadInfo.fileSizeMB} MB
                  </p>
                  {uploadInfo.uploadedAt && (
                    <p className="mt-0.5 text-[11px] text-emerald-700">
                      Uploaded at:{" "}
                      {new Date(uploadInfo.uploadedAt).toLocaleString()}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-emerald-700">
                    The chatbot will answer only from this document, and say it
                    does not know if the answer is not found.
                  </p>
                </div>
              </div>
            )}

            {uploadStatus === "error" && uploadError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                <AlertCircle size={16} className="mt-0.5" />
                <p>{uploadError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-50 border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">Current hotel</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {config.hotelName}
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              The chatbot only answers about this hotel using the uploaded PDF.
            </p>

            {stats?.currentPdf ? (
              <p className="mt-2 text-[11px] text-gray-600">
                Knowledge base:{" "}
                <span className="font-medium">{stats.currentPdf.filename}</span>
                <br />
                Uploaded:{" "}
                {new Date(stats.currentPdf.uploadedAt).toLocaleString(
                  undefined,
                  {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }
                )}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-amber-600">
                No PDF uploaded yet. Upload a hotel guide so the assistant can
                answer correctly.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">Last stats update</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Clock size={14} className="text-indigo-500" />
              {stats?.lastUpdated
                ? new Date(stats.lastUpdated).toLocaleTimeString()
                : "Waiting for data"}
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              Stats are refreshed automatically every few seconds.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom: stats and sessions table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={18} />
            <h3 className="text-sm font-semibold text-gray-900">
              Chat activity and sessions
            </h3>
          </div>
          {statsLoading && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Clock size={12} />
              Updating...
            </span>
          )}
        </div>

        {statsError && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
            {statsError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-50 border border-gray-100 px-4 py-3 flex items-center gap-3">
            <FileCheck className="text-indigo-600" size={20} />
            <div>
              <p className="text-xs text-gray-500">Total chat sessions</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {stats?.totalSessions ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">Top topics</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-gray-700">
              {(stats?.questionsByCategory || []).slice(0, 3).map((t) => (
                <li key={t.topic} className="flex justify-between">
                  <span>{t.topic}</span>
                  <span className="font-medium">{t.count}</span>
                </li>
              ))}
              {(!stats || (stats.questionsByCategory?.length ?? 0) === 0) && (
                <li className="text-gray-400">No topic data yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">Unanswered questions</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {(stats?.recentSessions ?? []).reduce(
                (sum, s) => sum + (s.unansweredCount || 0),
                0
              )}
            </p>

            <p className="mt-1 text-[11px] text-gray-500">
              Questions where the bot could not find an answer in the PDF. These
              should trigger the contact form and email workflow.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-gray-100 overflow-hidden bg-slate-50/60">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-700">
              Recent chat sessions
            </p>
            <p className="text-[11px] text-gray-400">
              Session id, questions and unresolved count
            </p>
          </div>

          <div className="max-h-56 overflow-y-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">Session</th>
                  <th className="px-4 py-2 text-left font-medium">Questions</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Unanswered
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentSessions?.length ?? 0) > 0 ? (
                  stats.recentSessions.map((s) => (
                    <tr
                      key={s.sessionId}
                      className="border-t border-gray-100 text-gray-800"
                    >
                      <td className="px-4 py-2 font-mono text-[11px] sm:text-xs">
                        {shortSessionId(s.sessionId)}
                      </td>
                      <td className="px-4 py-2">
                        {s.lastUnansweredQuestion
                          ? s.lastUnansweredQuestion.length > 60
                            ? s.lastUnansweredQuestion.slice(0, 57) + "…"
                            : s.lastUnansweredQuestion
                          : s.questionCount ?? 0}
                      </td>
                      <td className="px-4 py-2">{s.unansweredCount ?? 0}</td>

                      <td className="px-4 py-2 text-[11px] text-gray-500">
                        {s.startedAt
                          ? new Date(s.startedAt).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-center text-xs text-gray-500"
                    >
                      No chat sessions recorded yet. Once users start chatting
                      with the Cincinnati Hotel assistant, each conversation
                      will appear here with its session id.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
