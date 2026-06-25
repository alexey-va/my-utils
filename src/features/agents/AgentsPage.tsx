import PageLayout from "../../shared/components/PageLayout";
import AgentMemoryPage from "./AgentMemoryPage";

export default function AgentsPage() {
  return (
    <div className="agents-page">
      <PageLayout title="Agents" subtitle="Telegram agent memory">
        <AgentMemoryPage />
      </PageLayout>
    </div>
  );
}
