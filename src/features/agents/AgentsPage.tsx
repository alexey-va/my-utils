import { Tabs } from "antd";
import { useState } from "react";
import PageLayout from "../../shared/components/PageLayout";
import AgentMemoryPage from "./AgentMemoryPage";
import AgentTracesPage from "./AgentTracesPage";

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState("memory");

  return (
    <PageLayout
      title="Agents"
      subtitle="Telegram agent memory and OpenTelemetry traces"
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="agents-page__tabs"
        items={[
          { key: "memory", label: "Memory", children: <AgentMemoryPage /> },
          { key: "traces", label: "Traces", children: <AgentTracesPage embedded /> },
        ]}
      />
    </PageLayout>
  );
}
