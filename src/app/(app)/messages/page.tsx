import { MessageSquare } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";

export default function MessagesPage() {
  return (
    <ComingSoon
      title="Messages"
      icon={<MessageSquare size={16} />}
      note="Chat with your friends — arriving in a later phase."
    />
  );
}
