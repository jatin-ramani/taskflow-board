"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { X, Calendar as CalendarIcon, Clock, User, Flag, MessageSquare, Plus, Play, Square, Loader2, Send, CheckCircle2, Circle, Trash2, ChevronDown, Check, Star, Link as LinkIcon, Maximize2, AtSign, Lock, History, Bold, Italic, List as ListIcon, Type, AlertTriangle, Edit2, PlayCircle } from "lucide-react";
import { formatDuration, formatTimerDisplay, getInitials, timeAgo } from "@/lib/utils";
import { useToast } from "@/components/layout/toast-provider";
import { TooltipSimple } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
interface TaskDetailPanelProps { taskId: string; onClose: () => void; onUpdate?: () => void; }

interface ProjectMember { id: string; role: string; user: { id: string; name: string; email: string; avatar: string | null } }
interface TimeEntry { id: string; startTime: string; duration: number | null; isRunning: boolean; user: { name: string; avatar: string | null } }
interface Comment { id: string; content: string; createdAt: string; author: { id: string; name: string; avatar: string | null }; authorId?: string }
interface Subtask { id: string; title: string; status: string }
interface Activity { id: string; action: string; createdAt: string; user: { name: string; avatar: string | null }; details?: string }
interface TaskData {
  id: string; title: string; description: string | null; priority: string; dueDate: string | null; startDate: string | null; status: string; totalTimeLogged: number; isFavorite: boolean;
  projectId: string; creatorId: string;
  column?: { name: string; color: string };
  assignee?: { id: string; name: string; avatar: string | null } | null;
  timeEntries?: TimeEntry[];
  subtasks?: Subtask[];
  comments?: Comment[];
  activities?: Activity[];
}

export function TaskDetailPanel({ taskId, onClose, onUpdate }: TaskDetailPanelProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [task, setTask] = useState<TaskData | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [userRole, setUserRole] = useState<string>("VIEWER");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  
  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerLoading, setIsTimerLoading] = useState(false);
  
  // Dropdowns
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(-1);
  
  const assigneeRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = members.filter(m => 
    m.user.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    m.user.email.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        setTitle(data.title);
        setDescription(data.description || "");
        
        const projectRes = await fetch(`/api/projects/${data.projectId}`);
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          // Include owner in the members list for mentions
          const ownerMember = { 
            id: projectData.owner.id, 
            role: "OWNER", 
            user: projectData.owner 
          };
          const allMembers = [ownerMember, ...projectData.members.filter((m: any) => m.user.id !== projectData.owner.id)];
          setMembers(allMembers);
          const currentMember = allMembers.find((m: any) => m.user.id === session?.user?.id);
          if (projectData.ownerId === session?.user?.id) setUserRole("OWNER");
          else if (currentMember) setUserRole(currentMember.role);
        }

        const runningEntry = data.timeEntries?.find((e: TimeEntry) => e.isRunning);
        if (runningEntry) {
          setIsTimerRunning(true);
          const start = new Date(runningEntry.startTime).getTime();
          setTimerSeconds(Math.floor((Date.now() - start) / 1000));
        } else {
          setIsTimerRunning(false);
          setTimerSeconds(0);
        }
      }
    } catch { } finally { setLoading(false); }
  }, [taskId, session]);

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
    if (isTimerRunning) interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const canEdit = userRole === "OWNER" || userRole === "ADMIN" || task?.creatorId === session?.user?.id;

  const updateTask = async (updates: Record<string, unknown>) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
      if (updates.status === "DONE") toast("Task marked as completed!", "success");
      if (updates.isFavorite !== undefined) toast(updates.isFavorite ? "Added to favorites" : "Removed from favorites", "info");
      fetchTask();
      if (onUpdate) onUpdate();
    } catch {}
  };

  const toggleTimer = async () => {
    if (!task) return;
    if (task.status !== "IN_PROGRESS") {
      if (confirm("You must move the task to 'In Progress' to track time. Move it now?")) {
        await updateTask({ status: "IN_PROGRESS" });
      } else return;
    }

    setIsTimerLoading(true);
    try {
      if (isTimerRunning) {
        await fetch(`/api/tasks/${taskId}/time-entries`, { method: "PUT", body: JSON.stringify({ endTime: new Date() }) });
        toast("Timer stopped and time logged.", "info");
      } else {
        await fetch(`/api/tasks/${taskId}/time-entries`, { method: "POST", body: JSON.stringify({ isRunning: true }) });
        toast("Timer started.", "success");
      }
      fetchTask();
    } catch {} finally { setIsTimerLoading(false); }
  };

  const handleMarkComplete = async () => {
    const isDone = task?.status === "DONE";
    await updateTask({ status: isDone ? "TODO" : "DONE" });
  };

  const toggleFavorite = async () => {
    await updateTask({ isFavorite: !task?.isFavorite });
  };

  const toggleSubtask = async (subtaskId: string, currentStatus: string) => {
    try {
      await fetch(`/api/tasks/${subtaskId}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ status: currentStatus === "DONE" ? "TODO" : "DONE" }) 
      });
      fetchTask();
    } catch {}
  };

  const applyFormat = (prefix: string, suffix: string = prefix) => {
    if (!descriptionRef.current) return;
    const start = descriptionRef.current.selectionStart;
    const end = descriptionRef.current.selectionEnd;
    const text = descriptionRef.current.value;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = before + prefix + selected + suffix + after;
    setDescription(newText);
    
    setTimeout(() => {
      descriptionRef.current?.focus();
      descriptionRef.current?.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setComment(value);
    
    // Detect trigger '@' at cursor
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");
    
    // Check if we should show the mention list
    if (lastAtPos !== -1 && (lastAtPos === 0 || textBeforeCursor[lastAtPos - 1] === " ")) {
      const query = textBeforeCursor.slice(lastAtPos + 1);
      if (!query.includes("]") && !query.includes("[")) { // Ensure we're not inside an existing mention
        setMentionSearch(query);
        setShowMentionList(true);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentionList(false);
  };

  const insertMention = (memberName: string) => {
    const cursorPosition = commentInputRef.current?.selectionStart || 0;
    const textBeforeCursor = comment.slice(0, cursorPosition);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");
    
    // Use structured format for multi-word names
    const newValue = comment.slice(0, lastAtPos) + "@[" + memberName + "] " + comment.slice(cursorPosition);
    setComment(newValue);
    setShowMentionList(false);
    
    setTimeout(() => {
      if (commentInputRef.current) {
        const newPos = lastAtPos + memberName.length + 3; // +3 for @, [, ]
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const addComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!comment.trim()) return;
    
    const newComment = comment;
    setComment("");
    
    const tempComment = {
      id: "temp-" + Date.now(),
      content: newComment,
      createdAt: new Date().toISOString(),
      author: { name: session?.user?.name || "Me", avatar: session?.user?.image || (session?.user as any)?.avatar || null },
      authorId: session?.user?.id
    };
    setTask(prev => prev ? { ...prev, comments: [tempComment, ...(prev.comments || [])] } : null);

    try {
      await fetch(`/api/tasks/${taskId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: newComment }) });
      fetchTask();
    } catch {
      toast("Failed to post comment", "error");
      fetchTask();
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" });
      toast("Comment deleted", "info");
      fetchTask();
    } catch {}
  };

  const startEditComment = (c: Comment) => {
    setEditingCommentId(c.id);
    setEditingCommentContent(c.content);
  };

  const saveEditComment = async (commentId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ content: editingCommentContent }) 
      });
      setEditingCommentId(null);
      toast("Comment updated", "success");
      fetchTask();
    } catch {}
  };

  const addSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    try {
      await fetch(`/api/tasks/${taskId}/subtasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: subtaskTitle }) });
      setSubtaskTitle("");
      toast("Subtask added.", "success");
      fetchTask();
    } catch {}
  };

  const parseMentions = (content: string) => {
    if (!content) return "";
    
    const parts = content.split(/(@\[[\w\s]+?\])/g);
    
    return parts.map((part, i) => {
      let name = "";
      if (part.startsWith("@[")) {
        name = part.slice(2, -1);
      }

      if (name) {
        const member = members.find(m => m.user.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (member) {
          const isSelf = member.user.id === session?.user?.id;
          const memberAvatar = member.user.avatar || (member.user as any).image;
          
          // Exact design from USER
          const bg = isSelf ? "rgba(255, 86, 48, 0.15)" : "rgba(0, 102, 255, 0.12)";
          const color = isSelf ? "rgb(255, 86, 48)" : "rgb(0, 102, 255)";
          const avatarBg = isSelf ? "rgb(255, 86, 48)" : "rgb(0, 102, 255)";

          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: bg, color: color, padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, verticalAlign: "middle", margin: "0px 2px" }}>
              <div style={{ width: "15px", height: "15px", borderRadius: "50%", background: memberAvatar ? `url(${memberAvatar}) center/cover` : avatarBg, fontSize: "8px", color: "rgb(255, 255, 255)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 500 }}>
                {!memberAvatar && getInitials(member.user.name).charAt(0)}
              </div>
              {member.user.name}
            </span>
          );
        }
      }
      return part;
    });
  };


  if (loading) return (
    <div style={{ position: "fixed", right: 0, top: 0, width: "700px", height: "100vh", background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
      <Loader2 size={24} className="animate-spin" color="var(--accent)" />
    </div>
  );

  if (!task) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.1)", zIndex: 39 }} />
      <div className="animate-slide-in-right" style={{ position: "fixed", right: 0, top: 0, width: "700px", height: "100vh", background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", zIndex: 40, display: "flex", flexDirection: "column", boxShadow: "var(--shadow-xl)" }}>
        
        {/* Top Header Bar */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <TooltipSimple label={task.status === "DONE" ? "Mark as active" : "Mark as complete"} side="bottom">
            <button 
              onClick={handleMarkComplete} 
              style={{ height: "34px", padding: "0 14px", borderRadius: "var(--radius-full)", border: "1px solid var(--border)", background: task.status === "DONE" ? "#36b37e" : "transparent", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: task.status === "DONE" ? "#fff" : "var(--text-primary)", transition: "var(--transition-fast)" }}
            >
              {task.status === "DONE" ? <Check size={18} strokeWidth={3} /> : <Circle size={18} color="var(--text-tertiary)" />}
              {task.status === "DONE" ? "Completed" : "Mark Complete"}
            </button>
          </TooltipSimple>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <TooltipSimple label="Focus timer" side="bottom">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-primary)", padding: "4px 12px", borderRadius: "var(--radius-full)", border: "1px solid var(--border)", minWidth: "120px", justifyContent: "center" }}>
                <span className="font-mono" style={{ fontSize: "13px", fontWeight: 700, color: isTimerRunning ? "var(--accent)" : "var(--text-tertiary)", fontFamily: "monospace" }}>
                  {isTimerRunning ? formatTimerDisplay(timerSeconds) : formatDuration(task.totalTimeLogged)}
                </span>
                <button onClick={toggleTimer} disabled={isTimerLoading} style={{ background: isTimerRunning ? "var(--danger-muted)" : "var(--success-muted)", color: isTimerRunning ? "var(--danger)" : "var(--success)", border: "none", width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: isTimerLoading ? "default" : "pointer", transition: "var(--transition-fast)" }}>
                  {isTimerLoading ? <Loader2 size={12} className="animate-spin" /> : (isTimerRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />)}
                </button>
              </div>
            </TooltipSimple>

            <TooltipSimple label={task.isFavorite ? "Remove from favorites" : "Add to favorites"} side="bottom">
              <button onClick={toggleFavorite} style={{ color: task.isFavorite ? "#ffab00" : "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", transition: "var(--transition-fast)" }}>
                <Star size={20} fill={task.isFavorite ? "currentColor" : "none"} />
              </button>
            </TooltipSimple>
            
            <TooltipSimple label="Copy link" side="bottom">
              <button style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}><LinkIcon size={18} /></button>
            </TooltipSimple>
            
            <TooltipSimple label="Close" side="bottom">
              <button onClick={onClose} style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </TooltipSimple>
          </div>
        </div>

        {/* Scrollable Area */}
        <div style={{ flex: 1, overflow: "auto", padding: "32px" }}>
          {!canEdit && (
            <div style={{ padding: "8px 12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", fontSize: "12px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <Lock size={12} /> You don't have permission to edit this task.
            </div>
          )}

          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => updateTask({ title })} disabled={!canEdit}
            style={{ width: "100%", fontSize: "32px", fontWeight: 700, border: "none", outline: "none", color: "var(--text-primary)", background: "transparent", marginBottom: "24px", cursor: canEdit ? "text" : "default" }} />

          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "16px", marginBottom: "32px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Assignee</span>
            <div ref={assigneeRef} style={{ position: "relative" }}>
              <button disabled={!canEdit} onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: canEdit ? "pointer" : "default", fontSize: "14px", color: "var(--text-primary)" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: (task.assignee?.avatar || (task.assignee as any)?.image) ? `url(${task.assignee?.avatar || (task.assignee as any)?.image}) center/cover` : (task.assignee ? "var(--accent)" : "var(--bg-tertiary)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff" }}>
                  {!(task.assignee?.avatar || (task.assignee as any)?.image) && (task.assignee ? getInitials(task.assignee.name) : <User size={12} color="var(--text-tertiary)" />)}
                </div>
                <span>{task.assignee?.name || "Unassigned"}</span>
              </button>
            </div>

            <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Due date</span>
            <div style={{ width: "200px" }}>
              <DatePicker 
                date={task.dueDate ? new Date(task.dueDate) : undefined} 
                onSelect={(d) => updateTask({ dueDate: d })}
                placeholder="No due date"
              />
            </div>

            <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Start date</span>
            <div style={{ width: "200px" }}>
              <DatePicker 
                date={task.startDate ? new Date(task.startDate) : undefined} 
                onSelect={(d) => updateTask({ startDate: d })}
                placeholder="No start date"
              />
            </div>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>Description</h3>
              {canEdit && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-tertiary)", borderRadius: "4px", padding: "2px" }}>
                  <TooltipSimple label="Bold">
                    <button onClick={() => applyFormat("**", "**")} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", borderRadius: "4px" }}><Bold size={14} /></button>
                  </TooltipSimple>
                  <TooltipSimple label="Italic">
                    <button onClick={() => applyFormat("_", "_")} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", borderRadius: "4px" }}><Italic size={14} /></button>
                  </TooltipSimple>
                  <TooltipSimple label="List">
                    <button onClick={() => applyFormat("- ")} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", borderRadius: "4px" }}><ListIcon size={14} /></button>
                  </TooltipSimple>
                  <TooltipSimple label="Heading">
                    <button onClick={() => applyFormat("# ")} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", borderRadius: "4px" }}><Type size={14} /></button>
                  </TooltipSimple>
                </div>
              )}
            </div>
            <textarea ref={descriptionRef} value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => updateTask({ description })} placeholder="What is this task about?" disabled={!canEdit}
              style={{ width: "100%", minHeight: "150px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", outline: "none", fontSize: "14px", lineHeight: 1.6, color: "var(--text-secondary)", background: "transparent", resize: "none", padding: "12px" }} />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>Subtasks</h3>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {task.subtasks?.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <button onClick={() => toggleSubtask(s.id, s.status)} data-tooltip={s.status === "DONE" ? "Mark incomplete" : "Mark complete"} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: s.status === "DONE" ? "var(--success)" : "var(--text-tertiary)" }}>
                    {s.status === "DONE" ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>
                  <span style={{ fontSize: "13px", color: s.status === "DONE" ? "var(--text-tertiary)" : "var(--text-secondary)", textDecoration: s.status === "DONE" ? "line-through" : "none" }}>{s.title}</span>
                </div>
              ))}
              <form onSubmit={addSubtask}>
                <input type="text" value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} placeholder="Type to add a subtask..." style={{ width: "100%", padding: "12px 0", border: "none", outline: "none", fontSize: "13px", background: "transparent", color: "var(--text-secondary)" }} />
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Comments Area */}
        <div style={{ padding: "16px 24px", background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <button onClick={() => setActiveTab("comments")} style={{ fontSize: "12px", fontWeight: 600, color: activeTab === "comments" ? "var(--text-primary)" : "var(--text-tertiary)", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: activeTab === "comments" ? "2px solid var(--text-primary)" : "2px solid transparent", background: "none", padding: "4px 0", cursor: "pointer", transition: "var(--transition-fast)" }}>Comments</button>
            <button onClick={() => setActiveTab("activity")} style={{ fontSize: "12px", fontWeight: 600, color: activeTab === "activity" ? "var(--text-primary)" : "var(--text-tertiary)", borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: activeTab === "activity" ? "2px solid var(--text-primary)" : "2px solid transparent", background: "none", padding: "4px 0", cursor: "pointer", transition: "var(--transition-fast)" }}>All activity</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px", maxHeight: "200px", overflowY: "auto" }}>
            {activeTab === "comments" ? (
              task.comments?.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: "12px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: (c.author.avatar || (c.author as any).image) ? `url(${c.author.avatar || (c.author as any).image}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff" }}>
                    {!(c.author.avatar || (c.author as any).image) && getInitials(c.author.name)}
                  </div>
                  <div style={{ flex: 1, fontSize: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.author.name} <span style={{ fontWeight: 400, color: "var(--text-tertiary)", fontSize: "11px", marginLeft: "4px" }}>{timeAgo(new Date(c.createdAt))}</span></div>
                      {(c.authorId === session?.user?.id || !c.authorId) && c.id !== "temp" && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <TooltipSimple label="Edit comment">
                            <button onClick={() => startEditComment(c)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}><Edit2 size={12} /></button>
                          </TooltipSimple>
                          <TooltipSimple label="Delete comment">
                            <button onClick={() => deleteComment(c.id)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}><Trash2 size={12} /></button>
                          </TooltipSimple>
                        </div>
                      )}
                    </div>
                    {editingCommentId === c.id ? (
                      <div style={{ marginTop: "4px" }}>
                        <input value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} 
                          style={{ width: "100%", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", padding: "4px 8px", fontSize: "13px", outline: "none" }} />
                        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                          <button onClick={() => saveEditComment(c.id)} style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditingCommentId(null)} style={{ fontSize: "11px", color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>{parseMentions(c.content)}</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              task.activities?.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: "12px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: (a.user.avatar || (a.user as any).image) ? `url(${a.user.avatar || (a.user as any).image}) center/cover` : "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--text-tertiary)" }}>
                    {(a.user.avatar || (a.user as any).image) ? "" : <History size={12} />}
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    <div style={{ color: "var(--text-secondary)" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.user.name}</span> {a.action.toLowerCase().replace("_", " ")}
                      <span style={{ color: "var(--text-tertiary)", fontSize: "11px", marginLeft: "4px" }}>{timeAgo(new Date(a.createdAt))}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {activeTab === "comments" && (
            <div style={{ display: "flex", gap: "12px", position: "relative" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: session?.user?.image || (session?.user as any)?.avatar ? `url(${session?.user?.image || (session?.user as any)?.avatar}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#fff" }}>
                {!(session?.user?.image || (session?.user as any)?.avatar) && getInitials(session?.user?.name || "JR")}
              </div>
              <div style={{ flex: 1, position: "relative" }}>
                <form onSubmit={addComment} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <div style={{ position: "absolute", left: "18px", top: "50%", transform: "translateY(-50%)", display: "flex", gap: "5px", pointerEvents: "none", zIndex: 1 }}>
                      {comment.split(/(@\[[\w\s]+?\])/g).map((part, i) => {
                        if (part.startsWith("@[") && part.endsWith("]")) {
                          const name = part.slice(2, -1);
                          const member = members.find(m => m.user.name.toLowerCase().trim() === name.toLowerCase().trim());
                          if (member) {
                            const isSelf = member.user.id === session?.user?.id;
                            const bg = isSelf ? "rgba(255, 86, 48, 0.15)" : "rgba(0, 102, 255, 0.12)";
                            const color = isSelf ? "rgb(255, 86, 48)" : "rgb(0, 102, 255)";
                            const avatarBg = isSelf ? "rgb(255, 86, 48)" : "rgb(0, 102, 255)";
                            return (
                              <span key={i} style={{ background: bg, color: color, padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, display: "flex", alignItems: "center", gap: "5px", pointerEvents: "auto" }}>
                                <div style={{ width: "15px", height: "15px", borderRadius: "50%", background: (member.user.avatar || (member.user as any).image) ? `url(${member.user.avatar || (member.user as any).image}) center/cover` : avatarBg, fontSize: "8px", color: "rgb(255, 255, 255)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500 }}>
                                  {!(member.user.avatar || (member.user as any).image) && getInitials(member.user.name).charAt(0)}
                                </div>
                                {member.user.name}
                              </span>
                            );
                          }
                        }
                        // Render normal text as spans to preserve spacing for the overlay
                        return <span key={i} style={{ opacity: 0, whiteSpace: "pre" }}>{part}</span>;
                      })}
                    </div>
                    <input 
                      ref={commentInputRef} 
                      value={comment} 
                      onChange={handleCommentChange} 
                      onKeyDown={(e) => {
                        if (showMentionList) {
                          if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(prev => Math.min(prev + 1, filteredMembers.length - 1)); }
                          else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex(prev => Math.max(prev - 1, 0)); }
                          else if (e.key === "Enter" && filteredMembers[mentionIndex]) { e.preventDefault(); insertMention(filteredMembers[mentionIndex].user.name); }
                          else if (e.key === "Escape") { setShowMentionList(false); }
                        }
                        // Atomic delete logic for structured mentions @[Name]
                        if (e.key === "Backspace") {
                          const cursorPosition = commentInputRef.current?.selectionStart || 0;
                          const textBefore = comment.slice(0, cursorPosition);
                          if (textBefore.endsWith("] ")) {
                            const lastOpenBracket = textBefore.lastIndexOf("@[");
                            if (lastOpenBracket !== -1) {
                              e.preventDefault();
                              setComment(comment.slice(0, lastOpenBracket) + comment.slice(cursorPosition));
                              return;
                            }
                          }
                        }
                      }}
                      placeholder={comment.includes("@") ? "" : "Write a comment..."}
                      style={{ 
                        width: "100%", 
                        height: "44px", 
                        border: "1px solid var(--border)", 
                        borderRadius: "22px", 
                        padding: "0 18px", 
                        fontSize: "14px", 
                        outline: "none", 
                        background: "var(--bg-primary)", 
                        color: comment.includes("@") ? "transparent" : "var(--text-primary)",
                        caretColor: "var(--text-primary)",
                        transition: "border-color 0.2s"
                      }} 
                    />
                  </div>
                  <TooltipSimple label="Send comment">
                    <button type="submit" disabled={!comment.trim()} style={{ width: "40px", height: "40px", borderRadius: "50%", background: comment.trim() ? "var(--accent)" : "var(--bg-tertiary)", color: "#fff", border: "none", cursor: comment.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "var(--transition-fast)", flexShrink: 0, boxShadow: comment.trim() ? "0 4px 12px rgba(255,86,48,0.3)" : "none" }}>
                      <Send size={18} />
                    </button>
                  </TooltipSimple>
                </form>
                
                {showMentionList && filteredMembers.length > 0 && (
                  <div style={{ position: "absolute", bottom: "calc(100% + 12px)", left: 0, width: "260px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "0 10px 30px rgba(0,0,0,0.3)", overflow: "hidden", zIndex: 1000, animation: "slideUp 0.2s ease-out" }}>
                    <div style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", letterSpacing: "0.5px" }}>SUGGESTED PEOPLE</div>
                    <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                      {filteredMembers.map((m, i) => (
                        <button key={m.id} onClick={() => insertMention(m.user.name)} onMouseEnter={() => setMentionIndex(i)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", border: "none", background: i === mentionIndex ? "var(--bg-tertiary)" : "transparent", cursor: "pointer", fontSize: "14px", textAlign: "left", color: "var(--text-primary)", transition: "background 0.1s" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: (m.user.avatar || (m.user as any).image) ? `url(${m.user.avatar || (m.user as any).image}) center/cover` : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#fff", fontWeight: 600 }}>
                            {!(m.user.avatar || (m.user as any).image) && getInitials(m.user.name)}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                            <span style={{ fontWeight: 600 }}>{m.user.name}</span>
                            <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{m.user.email}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
