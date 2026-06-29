import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";
import { EmptyState } from "./empty-state";

export function ComingSoon({
  title,
  icon,
  note,
}: {
  title: string;
  icon?: React.ReactNode;
  note?: string;
}) {
  return (
    <>
      <PageHeader title={title} icon={icon} />
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={<Construction size={20} />}
          title={`${title} is coming soon`}
          description={note ?? "We're building this out in an upcoming phase."}
        />
      </div>
    </>
  );
}
