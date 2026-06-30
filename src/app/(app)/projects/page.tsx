"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Search, Plus, Folder } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ProjectCard } from "@/components/project/project-card";
import { FullSpinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/common/empty-state";
import { refreshSidebar } from "@/components/layout/app-sidebar";
import type { ProjectSummary } from "@/types";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const createRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleFavorite(id: string, next: boolean) {
    setProjects((prev) =>
      prev ? prev.map((p) => (p.id === id ? { ...p, isFavorite: next } : p)) : prev
    );
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
    load();
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    setCreating(false);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const p = await res.json();
      refreshSidebar();
      router.push(`/projects/${p.id}`);
    }
  }

  if (!projects) {
    return (
      <>
        <PageHeader title="Projects" icon={<FolderKanban size={16} />} />
        <FullSpinner />
      </>
    );
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );
  const favorites = filtered.filter((p) => p.isFavorite);
  const others = filtered.filter((p) => !p.isFavorite);

  return (
    <>
      <PageHeader title="Projects" icon={<FolderKanban size={16} />} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 sm:px-6">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] font-semibold">
              {projects.length} {projects.length === 1 ? "Project" : "Projects"}
            </p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="h-8 w-44 rounded-md border border-border bg-elevated pl-8 pr-3 text-[13px] outline-none transition-colors focus:border-accent sm:w-56"
                />
              </div>
              {creating ? (
                <form onSubmit={createProject}>
                  <input
                    ref={createRef}
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => !newName.trim() && setCreating(false)}
                    onKeyDown={(e) => e.key === "Escape" && setCreating(false)}
                    placeholder="Project name…"
                    className="h-8 w-44 rounded-md border border-accent bg-elevated px-2.5 text-[13px] outline-none ring-2 ring-accent-soft"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  <Plus size={15} /> New project
                </button>
              )}
            </div>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban size={20} />}
              title="No projects yet"
              description="Create your first project to get started."
            />
          ) : (
            <div className="flex flex-col gap-6">
              {favorites.length > 0 && (
                <ProjectGroup label="Favourites" projects={favorites} onToggleFavorite={toggleFavorite} />
              )}
              <ProjectGroup label="All Projects" projects={others} onToggleFavorite={toggleFavorite} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ProjectGroup({
  label,
  projects,
  onToggleFavorite,
}: {
  label: string;
  projects: ProjectSummary[];
  onToggleFavorite: (id: string, next: boolean) => void;
}) {
  if (projects.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-muted">
        <Folder size={15} className="text-accent" /> {label}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onToggleFavorite={onToggleFavorite} />
        ))}
      </div>
    </section>
  );
}
