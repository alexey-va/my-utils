import { Tabs } from "antd";
import PageLayout from "../../shared/components/PageLayout";
import AgentMemoryPage from "./AgentMemoryPage";
import AgentTestConsolePage from "./AgentTestConsolePage";

export default function AgentsPage() {
  return (
    <div className="agents-page">
      <PageLayout title="Agents" subtitle="Изолированные проверки и память Workout-агента">
        <Tabs
          className="agents-page__tabs"
          defaultActiveKey="test-console"
          items={[
            {
              key: "test-console",
              label: "Тестовые чаты",
              children: <AgentTestConsolePage />,
            },
            {
              key: "memory",
              label: "Память",
              children: <AgentMemoryPage />,
            },
          ]}
        />
      </PageLayout>
    </div>
  );
}
