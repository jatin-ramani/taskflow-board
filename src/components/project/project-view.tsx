"use client";

import { useState } from "react";
import { ProjectHeader } from "./project-header";
import { KanbanBoard } from "../board/kanban-board";
import { ProjectListView } from "./project-list-view";
import { ProjectCalendarView } from "./project-calendar-view";
import { ProjectDashboardView } from "./project-dashboard-view";
import { TaskDetailPanel } from "../task/task-detail-panel";

interface ProjectViewProps {
  projectId: string;
}

export function ProjectView({ projectId }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState("board");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  const renderContent = () => {
    switch (activeTab) {
      case "list":
        return <ProjectListView projectId={projectId} onTaskClick={setSelectedTaskId} refreshKey={refreshKey} />;
      case "board":
        return <KanbanBoard projectId={projectId} onTaskClick={setSelectedTaskId} externalTaskId={selectedTaskId} refreshKey={refreshKey} />;
      case "calendar":
        return <ProjectCalendarView projectId={projectId} onTaskClick={setSelectedTaskId} />;
      case "dashboard":
        return <ProjectDashboardView projectId={projectId} />;
      case "completed":
        return <ProjectListView projectId={projectId} onTaskClick={setSelectedTaskId} filterStatus="DONE" refreshKey={refreshKey} />;
      case "favorites":
        return <ProjectListView projectId={projectId} onTaskClick={setSelectedTaskId} filterFavorite={true} refreshKey={refreshKey} />;
      default:
        return (
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "100%", 
            color: "var(--text-tertiary)",
            gap: "12px",
            background: "var(--bg-primary)"
          }}>
            <div style={{ fontSize: "16px", fontWeight: 500 }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} view coming soon</div>
            <div style={{ fontSize: "14px", opacity: 0.7 }}>We're working hard to bring this feature to TaskFlow.</div>
            <button 
              onClick={() => setActiveTab("board")}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500
              }}
            >
              Go back to Board
            </button>
          </div>
        );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <ProjectHeader 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        projectId={projectId}
      />
      
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {renderContent()}
      </div>

      {selectedTaskId && (
        <TaskDetailPanel 
          taskId={selectedTaskId} 
          onClose={() => setSelectedTaskId(null)} 
          onUpdate={triggerRefresh}
        />
      )}
    </div>
  );
}
