import { ProjectView } from "@/components/project/project-view";

export default async function ProjectBoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return <ProjectView projectId={projectId} />;
}
