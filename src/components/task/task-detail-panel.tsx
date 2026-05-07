"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Calendar, Clock, User, Flag, MessageSquare, Plus, Play, Square, Loader2, Send, CheckCircle2, Circle, Trash2, ChevronDown, Check } from "lucide-react";
import { formatDuration, formatTimerDisplay, getInitials, timeAgo } from "@/lib/utils";

interface TaskDetailPanelProps { taskId: string; onClose: () => void; }

interface ProjectMember { id: string; user: { id: string; name: string; email: string; avatar: string | null } }
interface TimeEntry { id: string; startTime: string; duration: number | null; isRunning: boolean; user: { name: string; avatar: string | null } }
interface Comment { id: string; content: string; createdAt: string; author: { name: string; avatar: string | null } }
interface Subtask { id: string; title: string; status: string }
interface TaskData {
  id: string; title: string; description: string | null; priority: string; dueDate: string | null; status: string; totalTimeLogged: number;
  projectId: string;
  column?: { name: string; color: string };
  assignee?: { id: string; name: string; avatar: string | null } | null;
  timeEntries?: TimeEntry[];
  subtasks?: Subtask[];
  comments?: Comment[];
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState<"subtasks" | "comments" | "activity" | "time">("subtasks");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        setTitle(data.title);
        setDescription(data.description || "");
        
        // Fetch project members
        const projectRes = await fetch(`/api/projects/${data.projectId}`);
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          // Include owner in members list if not already there
          const allMembers = [...projectData.members];
          const ownerExists = allMembers.some(m => m.user.id === projectData.owner.id);
          if (!ownerExists) {
            allMembers.unshift({ id: "owner", user: projectData.owner });
          }
          setMembers(allMembers);
        }

        const runningEntry = data.timeEntries?.find((e: TimeEntry) => e.isRunning);
        if (runningEntry) {
          setIsTimerRunning(true);
          setTimerSeconds(Math.floor((Date.now() - new Date(runningEntry.startTime).getTime()) / 1000));
        }
      }
    } catch { } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setShowAssigneeDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const updateTask = async (updates: Record<string, unknown>) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      fetchTask();
    } catch {}
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await fetch(`/api/tasks/${taskId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment }) });
      setComment("");
      fetchTask();
    } catch {}
  };

  const addSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    try {
      await fetch(`/api/tasks/${taskId}/subtasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: subtaskTitle }) });
      setSubtaskTitle("");
      setShowSubtaskInput(false);
      fetchTask();
    } catch {}
  };

  const toggleTimer = async () => {
    if (isTimerRunning) {
      await fetch(`/api/tasks/${taskId}/time-entries`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endTime: new Date().toISOString() }) });
      setIsTimerRunning(false);
      setTimerSeconds(0);
      fetchTask();
    } else {
      await fetch(`/api/tasks/${taskId}/time-entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startTime: new Date().toISOString(), isRunning: true }) });
      setIsTimerRunning(true);
      setTimerSeconds(0);
    }
  };

  const toggleSubtaskDone = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    await fetch(`/api/tasks/${subtaskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    fetchTask();
  };

  const priorityOptions = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];
  const priorityColors: Record<string, string> = { URGENT: "#ff5630", HIGH: "#ff8b00", MEDIUM: "#ffab00", LOW: "#36b37e", NONE: "var(--text-tertiary)" };

  const sectionBtn = (tab: typeof activeTab, label: string, icon: React.ReactNode) => (
    <button onClick={() => setActiveTab(tab)} style={{ padding: "8px 16px", fontSize: "13px", fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)", background: activeTab === tab ? "var(--accent-muted)" : "transparent", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "var(--transition-fast)" }}>
      {icon} {label}
    </button>
  );

  if (loading) return (
    <div style={{ position: "fixed", right: 0, top: 0, width: "520px", height: "100vh", background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
      <Loader2 size={24} className="animate-spin" color="var(--accent)" />
    </div>
  );

  if (!task) return null;

  const completedSubtasks = task.subtasks?.filter((s: Subtask) => s.status === "DONE").length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 39 }} />

      {/* Panel */}
      <div className="animate-slide-in-right" style={{ position: "fixed", right: 0, top: 0, width: "560px", height: "100vh", background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", zIndex: 40, display: "flex", flexDirection: "column", boxShadow: "var(--shadow-xl)" }}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: task.column?.color || "var(--accent)" }} />
            <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{task.column?.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button onClick={() => { if(confirm("Delete this task?")) { fetch(`/api/tasks/${taskId}`, { method: "DELETE" }); onClose(); } }} style={{ width: "32px", height: "32px", borderRadius: "var(--radius-md)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}><Trash2 size={16} /></button>
            <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "var(--radius-md)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}><X size={18} /></button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
          {/* Title */}
          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => { if (title !== task.title) updateTask({ title }); }}
            style={{ width: "100%", fontSize: "20px", fontWeight: 600, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", padding: "0", marginBottom: "16px" }} />

          {/* Meta Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "12px", marginBottom: "24px", fontSize: "13px" }}>
            {/* Priority */}
            <span style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "6px" }}><Flag size={14} /> Priority</span>
            <select value={task.priority} onChange={(e) => updateTask({ priority: e.target.value })}
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "6px 10px", color: priorityColors[task.priority], fontSize: "13px", outline: "none", cursor: "pointer" }}>
              {priorityOptions.map((p) => <option key={p} value={p}>{p === "NONE" ? "No priority" : p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
            </select>

            {/* Due Date */}
            <span style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14} /> Due date</span>
            <input type="date" value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""} onChange={(e) => updateTask({ dueDate: e.target.value || null })}
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "6px 10px", color: "var(--text-primary)", fontSize: "13px", outline: "none", cursor: "pointer" }} />

            {/* Assignee Selection */}
            <span style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "6px" }}><User size={14} /> Assignee</span>
            <div ref={assigneeRef} style={{ position: "relative" }}>
              <button onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)} 
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer", color: task.assignee ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: "13px", textAlign: "left", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: task.assignee?.avatar ? `url(${task.assignee.avatar}) center/cover` : (task.assignee ? "var(--accent)" : "var(--bg-tertiary)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, color: "#fff" }}>
                    {!task.assignee?.avatar && (task.assignee ? getInitials(task.assignee.name) : <User size={12} />)}
                  </div>
                  <span>{task.assignee?.name || "Unassigned"}</span>
                </div>
                <ChevronDown size={14} />
              </button>

              {showAssigneeDropdown && (
                <div style={{ position: "absolute", left: 0, top: "calc(100% + 4px)", width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", zIndex: 50, maxHeight: "200px", overflowY: "auto" }}>
                  <button onClick={() => { updateTask({ assigneeId: null }); setShowAssigneeDropdown(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} /></div>
                    <span>Unassigned</span>
                    {!task.assignee && <Check size={14} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
                  </button>
                  {members.map((m) => (
                    <button key={m.user.id} onClick={() => { updateTask({ assigneeId: m.user.id }); setShowAssigneeDropdown(false); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: m.user.avatar ? `url(${m.user.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "10px", fontWeight: 600 }}>
                        {!m.user.avatar && getInitials(m.user.name)}
                      </div>
                      <span>{m.user.name}</span>
                      {task.assignee?.id === m.user.id && <Check size={14} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time */}
            <span style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "6px" }}><Clock size={14} /> Time</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{formatDuration(task.totalTimeLogged || 0)}</span>
            </div>
          </div>

          {/* Timer */}
          <div style={{ background: "var(--bg-primary)", borderRadius: "var(--radius-md)", padding: "16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", border: isTimerRunning ? "1px solid var(--accent)" : "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Time Tracker</div>
              <div className="font-mono" style={{ fontSize: "24px", fontWeight: 600, color: isTimerRunning ? "var(--accent)" : "var(--text-primary)" }}>
                {formatTimerDisplay(timerSeconds)}
              </div>
            </div>
            <button onClick={toggleTimer}
              style={{ width: "44px", height: "44px", borderRadius: "50%", background: isTimerRunning ? "var(--danger)" : "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: `0 4px 12px ${isTimerRunning ? "rgba(255,86,48,0.3)" : "rgba(255,88,74,0.3)"}`, transition: "var(--transition-fast)" }}
              className={isTimerRunning ? "animate-pulse-glow" : ""}>
              {isTimerRunning ? <Square size={18} /> : <Play size={18} style={{ marginLeft: "2px" }} />}
            </button>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>Description</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => updateTask({ description })} placeholder="Add a description..."
              style={{ width: "100%", minHeight: "80px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px", fontSize: "13px", color: "var(--text-primary)", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
          </div>

          {/* Tab Buttons */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            {sectionBtn("subtasks", `Subtasks (${totalSubtasks})`, <CheckCircle2 size={14} />)}
            {sectionBtn("comments", `Comments (${task.comments?.length || 0})`, <MessageSquare size={14} />)}
            {sectionBtn("time", `Time Log (${task.timeEntries?.length || 0})`, <Clock size={14} />)}
          </div>

          {/* Tab Content */}
          {activeTab === "subtasks" && (
            <div>
              {totalSubtasks > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ height: "4px", background: "var(--bg-tertiary)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%`, background: "var(--success)", transition: "width 300ms ease", borderRadius: "2px" }} />
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>{completedSubtasks}/{totalSubtasks} completed</div>
                </div>
              )}
              {task.subtasks?.map((sub: Subtask) => (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 4px", borderBottom: "1px solid var(--border)" }}>
                  <button onClick={() => toggleSubtaskDone(sub.id, sub.status)} style={{ background: "none", border: "none", cursor: "pointer", color: sub.status === "DONE" ? "var(--success)" : "var(--text-tertiary)", display: "flex" }}>
                    {sub.status === "DONE" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>
                  <span style={{ fontSize: "13px", textDecoration: sub.status === "DONE" ? "line-through" : "none", color: sub.status === "DONE" ? "var(--text-tertiary)" : "var(--text-primary)" }}>{sub.title}</span>
                </div>
              ))}
              {showSubtaskInput ? (
                <form onSubmit={addSubtask} style={{ marginTop: "8px" }}>
                  <input type="text" value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} placeholder="Subtask title..." autoFocus
                    style={{ width: "100%", height: "36px", background: "var(--bg-primary)", border: "1px solid var(--accent)", borderRadius: "var(--radius-md)", padding: "0 12px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }}
                    onKeyDown={(e) => { if (e.key === "Escape") { setShowSubtaskInput(false); setSubtaskTitle(""); } }} />
                </form>
              ) : (
                <button onClick={() => setShowSubtaskInput(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 4px", color: "var(--text-tertiary)", fontSize: "13px", background: "none", border: "none", cursor: "pointer" }}>
                  <Plus size={14} /> Add subtask
                </button>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div>
              <form onSubmit={addComment} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..."
                  style={{ flex: 1, height: "40px", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0 14px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }} />
                <button type="submit" disabled={!comment.trim()} style={{ width: "40px", height: "40px", borderRadius: "var(--radius-md)", background: comment.trim() ? "var(--accent)" : "var(--bg-tertiary)", border: "none", cursor: comment.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <Send size={16} />
                </button>
              </form>
              {task.comments?.map((c: Comment) => (
                <div key={c.id} style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: c.author.avatar ? `url(${c.author.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 600, color: "#fff", flexShrink: 0 }}>{!c.author.avatar && getInitials(c.author.name)}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{c.author.name}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.5 }}>{c.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "time" && (
            <div>
              {task.timeEntries?.map((entry: TimeEntry) => (
                <div key={entry.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: entry.user.avatar ? `url(${entry.user.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 600, color: "#fff" }}>{!entry.user.avatar && getInitials(entry.user.name)}</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500 }}>{entry.user.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{new Date(entry.startTime).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="font-mono" style={{ fontSize: "14px", fontWeight: 500, color: entry.isRunning ? "var(--accent)" : "var(--text-primary)" }}>
                    {entry.isRunning ? "Running..." : formatDuration(entry.duration || 0)}
                  </div>
                </div>
              ))}
              {(!task.timeEntries || task.timeEntries.length === 0) && (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--text-tertiary)", fontSize: "13px" }}>No time entries yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
