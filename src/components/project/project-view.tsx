"use client";

import { useState } from "react";
import { ProjectHeader } from "./project-header";
import { KanbanBoard } from "../board/kanban-board";

interface ProjectViewProps {
  projectId: string;
}

export function ProjectView({ projectId }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState("board");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <ProjectHeader 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {activeTab === "board" && <KanbanBoard projectId={projectId} />}
        
        {activeTab !== "board" && (
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
                borderRadius: "8px",
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
        )}
      </div>
    </div>
  );
}
