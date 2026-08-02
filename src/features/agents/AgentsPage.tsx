import { Tabs } from "antd";
import PageLayout from "../../shared/components/PageLayout";
import AgentMemoryPage from "./AgentMemoryPage";
import AgentTestConsolePage from "./AgentTestConsolePage";

export default function AgentsPage() {
  return (
    <div className="agents-page">
      <PageLayout title="Agents" subtitle="Workout AI console and memory">
        <Tabs
          className="agents-page__tabs"
          defaultActiveKey="test-console"
          items={[
            {
              key: "test-console",
              label: "Test console",
              children: <AgentTestConsolePage />,
            },
            {
              key: "memory",
              label: "Memory",
              children: <AgentMemoryPage />,
            },
          ]}
        />
      </PageLayout>
    </div>
  );
}
