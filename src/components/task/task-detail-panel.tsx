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
  const [activeEditorIsEdit, setActiveEditorIsEdit] = useState(false);

  const assigneeRef = useRef<HTMLDivElement>(null);
  const commentEditorRef = useRef<HTMLDivElement>(null);
  const editEditorRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

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

  // --- CONTENTEDITABLE MENTION SYSTEM ---

  const serializeEditor = (editor: HTMLDivElement): string => {
    let result = '';
    editor.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const mentionId = el.dataset.mentionId;
        const mentionName = el.dataset.mentionName;
        if (mentionId && mentionName) {
          result += `@[${mentionId}:${mentionName}]`;
        } else if (el.tagName === 'BR') {
          result += '\n';
        } else {
          result += el.innerText || '';
        }
      }
    });
    return result.trim();
  };

  const createMentionBadge = (id: string, name: string): HTMLSpanElement => {
    const member = members.find(m => m.user.id === id);
    const avatar = member?.user.avatar || (member?.user as any)?.image || null;
    const isSelf = id === session?.user?.id;
    const bg = isSelf ? 'rgba(255, 86, 48, 0.15)' : 'rgba(0, 102, 255, 0.12)';
    const color = isSelf ? 'rgb(255, 86, 48)' : 'rgb(0, 102, 255)';
    const avatarBg = isSelf ? 'rgb(255, 86, 48)' : 'rgb(0, 102, 255)';

    const span = document.createElement('span');
    span.contentEditable = 'false';
    span.dataset.mentionId = id;
    span.dataset.mentionName = name;
    span.style.cssText = `display:inline-flex;align-items:center;gap:4px;background:${bg};color:${color};padding:2px 8px 2px 4px;border-radius:4px;font-size:13px;font-weight:500;white-space:nowrap;cursor:default;user-select:none;margin:0 2px;vertical-align:middle;line-height:1.4;`;

    const avatarEl = document.createElement('span');
    avatarEl.style.cssText = `width:16px;height:16px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:700;overflow:hidden;flex-shrink:0;background:${avatarBg};`;
    if (avatar) {
      const img = document.createElement('img');
      img.src = avatar;
      img.alt = name;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = getInitials(name).charAt(0);
    }
    span.appendChild(avatarEl);

    const nameEl = document.createElement('span');
    nameEl.textContent = name;
    span.appendChild(nameEl);

    return span;
  };

  const populateEditor = (editor: HTMLDivElement, content: string) => {
    editor.innerHTML = '';
    const regex = /@\[([^:]+):([^\]]+)\]/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        editor.appendChild(document.createTextNode(content.slice(lastIndex, match.index)));
      }
      const badge = createMentionBadge(match[1], match[2]);
      editor.appendChild(badge);
      // Add a trailing non-breaking space after badge
      editor.appendChild(document.createTextNode('\u00a0'));
      lastIndex = match.index + match[0].length;
      // Skip a trailing space that was part of the original text
      if (content[lastIndex] === ' ') lastIndex++;
    }
    if (lastIndex < content.length) {
      editor.appendChild(document.createTextNode(content.slice(lastIndex)));
    }
  };

  const handleEditorInput = (editor: HTMLDivElement, isEdit: boolean) => {
    const text = editor.innerText;
    if (!isEdit) setComment(text);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setShowMentionList(false); return; }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) { setShowMentionList(false); return; }

    const textBefore = (node.textContent || '').slice(0, range.startOffset);
    const lastAt = textBefore.lastIndexOf('@');
    if (lastAt !== -1) {
      const charBefore = textBefore[lastAt - 1];
      if (lastAt === 0 || charBefore === ' ' || charBefore === '\u00a0') {
        const query = textBefore.slice(lastAt + 1);
        if (!query.includes(' ') && !query.includes('\u00a0')) {
          setMentionSearch(query);
          setShowMentionList(true);
          setMentionIndex(0);
          setActiveEditorIsEdit(isEdit);
          return;
        }
      }
    }
    setShowMentionList(false);
  };

  const insertMentionBadge = (memberId: string, memberName: string) => {
    const editor = activeEditorIsEdit ? editEditorRef.current : commentEditorRef.current;
    if (!editor) return;

    editor.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent || '';
    const offset = range.startOffset;
    const lastAt = text.lastIndexOf('@', offset - 1);
    if (lastAt === -1) return;

    // Remove @query text
    (node as Text).deleteData(lastAt, offset - lastAt);

    // Create the badge and insert it
    const badge = createMentionBadge(memberId, memberName);
    const parentNode = node.parentNode!;
    const nextSibling = node.nextSibling;

    // Split text node at insertion point
    const beforeText = (node.textContent || '').slice(0, lastAt);
    const afterText = (node.textContent || '').slice(lastAt);
    (node as Text).data = beforeText;

    // Insert badge after the text node
    const afterNode = document.createTextNode('\u00a0' + afterText);
    if (nextSibling) {
      parentNode.insertBefore(badge, nextSibling);
      parentNode.insertBefore(afterNode, badge.nextSibling);
    } else {
      parentNode.appendChild(badge);
      parentNode.appendChild(afterNode);
    }

    // Move cursor to right after the non-breaking space
    const newRange = document.createRange();
    newRange.setStart(afterNode, 1); // after the \u00a0
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setComment(editor.innerText);
    setShowMentionList(false);
  };



  const addComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const editor = commentEditorRef.current;
    if (!editor) return;
    const finalComment = serializeEditor(editor);
    if (!finalComment.trim()) return;

    // Clear editor
    editor.innerHTML = '';
    setComment('');
    
    const tempComment = {
      id: "temp-" + Date.now(),
      content: finalComment,
      createdAt: new Date().toISOString(),
      author: { 
        id: session?.user?.id || "temp",
        name: session?.user?.name || "Me", 
        avatar: session?.user?.image || (session?.user as any)?.avatar || null 
      },
      authorId: session?.user?.id
    };
    setTask(prev => prev ? { ...prev, comments: [tempComment, ...(prev.comments || [])] } : null);

    try {
      await fetch(`/api/tasks/${taskId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: finalComment }) });
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
    // Populate editor after it renders
    setTimeout(() => {
      if (editEditorRef.current) {
        populateEditor(editEditorRef.current, c.content);
        // Move cursor to end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editEditorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 50);
  };

  const saveEditComment = async (commentId: string) => {
    const editor = editEditorRef.current;
    if (!editor) return;
    const finalContent = serializeEditor(editor);
    try {
      await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ content: finalContent }) 
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
    
    // Stricter regex for @[id:name] or legacy @[name]
    const parts = content.split(/(@\[[a-f0-9]*:?[^\]]+?\])/g);
    
    return parts.map((part, i) => {
      let userId = "";
      let userName = "";

      if (part.startsWith("@[")) {
        const inner = part.slice(2, -1);
        if (inner.includes(":")) {
          [userId, userName] = inner.split(":");
        } else {
          userName = inner; // Legacy support
        }
      }

      if (userId || userName) {
        const member = userId 
          ? members.find(m => m.user.id === userId)
          : members.find(m => m.user.name.toLowerCase().trim() === userName.toLowerCase().trim());
        if (member) {
          const isSelf = member.user.id === session?.user?.id;
          const memberAvatar = member.user.avatar || (member.user as any).image;
          
          // Exact design from USER
          const bg = isSelf ? "rgba(255, 86, 48, 0.15)" : "rgba(0, 102, 255, 0.12)";
          const color = isSelf ? "rgb(255, 86, 48)" : "rgb(0, 102, 255)";
          const avatarBg = isSelf ? "rgb(255, 86, 48)" : "rgb(0, 102, 255)";

          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: bg, color: color, padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: 500, verticalAlign: "middle", margin: "0px 2px" }}>
              <div style={{ width: "15px", height: "15px", borderRadius: "50%", background: avatarBg, fontSize: "8px", color: "rgb(255, 255, 255)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 500, overflow: "hidden" }}>
                {memberAvatar ? (
                  <img src={memberAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  getInitials(member.user.name).charAt(0)
                )}
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
                      <div style={{ marginTop: "6px" }}>
                        {/* Contenteditable edit input */}
                        <div
                          ref={editEditorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => handleEditorInput(e.currentTarget, true)}
                          onKeyDown={(e) => {
                            if (showMentionList) {
                              if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(prev => Math.min(prev + 1, filteredMembers.length - 1)); }
                              else if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex(prev => Math.max(prev - 1, 0)); }
                              else if (e.key === "Enter" && filteredMembers[mentionIndex]) { e.preventDefault(); insertMentionBadge(filteredMembers[mentionIndex].user.id, filteredMembers[mentionIndex].user.name); }
                              else if (e.key === "Escape") setShowMentionList(false);
                            }
                            if (e.key === "Escape" && !showMentionList) setEditingCommentId(null);
                          }}
                          style={{
                            minHeight: "34px",
                            maxHeight: "120px",
                            overflowY: "auto",
                            background: "var(--bg-primary)",
                            border: "1px solid var(--accent)",
                            borderRadius: "6px",
                            padding: "6px 10px",
                            fontSize: "13px",
                            lineHeight: "1.5",
                            color: "var(--text-primary)",
                            outline: "none",
                            wordBreak: "break-word",
                          }}
                        />
                        <div style={{ display: "flex", gap: "8px", marginTop: "6px", alignItems: "center" }}>
                          <button onClick={() => saveEditComment(c.id)} style={{ fontSize: "12px", fontWeight: 600, color: "#fff", background: "var(--accent)", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditingCommentId(null)} style={{ fontSize: "12px", color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                          <span style={{ fontSize: "11px", color: "var(--text-tertiary)", marginLeft: "auto" }}>Type @ to mention</span>
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
              {/* Author avatar */}
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#fff", flexShrink: 0 }}>
                {(session?.user?.image || (session?.user as any)?.avatar)
                  ? <img src={session?.user?.image || (session?.user as any)?.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : getInitials(session?.user?.name || "?")}
              </div>
              <div style={{ flex: 1, position: "relative" }}>
                {/* Contenteditable comment input */}
                <div style={{ position: "relative", border: "1px solid var(--border)", borderRadius: "22px", background: "var(--bg-primary)", transition: "border-color 0.2s", overflow: "hidden" }}
                  onFocusCapture={(e) => { if (e.currentTarget.style) e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlurCapture={(e) => { if (e.currentTarget.style) e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div
                    ref={commentEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Write a comment... (@ to mention)"
                    onInput={(e) => handleEditorInput(e.currentTarget, false)}
                    onKeyDown={(e) => {
                      if (showMentionList) {
                        if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex(prev => Math.min(prev + 1, filteredMembers.length - 1)); return; }
                        if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex(prev => Math.max(prev - 1, 0)); return; }
                        if (e.key === "Enter" && filteredMembers[mentionIndex]) { e.preventDefault(); insertMentionBadge(filteredMembers[mentionIndex].user.id, filteredMembers[mentionIndex].user.name); return; }
                        if (e.key === "Escape") { setShowMentionList(false); return; }
                      }
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); }
                    }}
                    style={{
                      minHeight: "44px",
                      maxHeight: "120px",
                      overflowY: "auto",
                      padding: "10px 50px 10px 18px",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      color: "var(--text-primary)",
                      outline: "none",
                      wordBreak: "break-word",
                      display: "flex",
                      alignItems: "center",
                    }}
                  />
                  <style>{`
                    [data-placeholder]:empty:before {
                      content: attr(data-placeholder);
                      color: var(--text-tertiary);
                      pointer-events: none;
                    }
                  `}</style>
                  {/* Send button */}
                  <button
                    onClick={addComment}
                    disabled={!comment.trim()}
                    style={{
                      position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)",
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: comment.trim() ? "var(--accent)" : "var(--bg-tertiary)",
                      color: "#fff", border: "none",
                      cursor: comment.trim() ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "var(--transition-fast)",
                      boxShadow: comment.trim() ? "0 2px 8px rgba(255,86,48,0.4)" : "none",
                    }}
                  >
                    <Send size={15} />
                  </button>
                </div>

                {/* Mention dropdown */}
                {showMentionList && filteredMembers.length > 0 && (
                  <div ref={mentionDropdownRef} style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, width: "280px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", boxShadow: "0 12px 40px rgba(0,0,0,0.35)", overflow: "hidden", zIndex: 1000 }}>
                    <div style={{ padding: "8px 14px", fontSize: "10px", fontWeight: 700, color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)", letterSpacing: "0.8px", textTransform: "uppercase" }}>Mention someone</div>
                    {filteredMembers.map((m, i) => {
                      const av = m.user.avatar || (m.user as any).image;
                      return (
                        <button key={m.user.id}
                          onMouseDown={(e) => { e.preventDefault(); insertMentionBadge(m.user.id, m.user.name); }}
                          onMouseEnter={() => setMentionIndex(i)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", border: "none", background: i === mentionIndex ? "var(--bg-tertiary)" : "transparent", cursor: "pointer", textAlign: "left", color: "var(--text-primary)", transition: "background 0.1s" }}
                        >
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", background: av ? undefined : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#fff", fontWeight: 600, flexShrink: 0 }}>
                            {av ? <img src={av} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(m.user.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "13px" }}>{m.user.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{m.user.email}</div>
                          </div>
                        </button>
                      );
                    })}
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
