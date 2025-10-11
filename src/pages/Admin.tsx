import { useLogout, useGetIdentity } from "@refinedev/core";
import { Typography, Space, Button, Card } from "antd";

export default function Admin() {
  const { data: me } = useGetIdentity();
  const { mutate: logout } = useLogout();

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <Space style={{ justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Admin panel
        </Typography.Title>
        <Space>
          <Typography.Text>{me?.email}</Typography.Text>
          <Button onClick={() => logout()}>Logout</Button>
        </Space>
      </Space>

      <Card>
        <Typography.Paragraph>Welcome. Add your tools here.</Typography.Paragraph>
      </Card>
    </div>
  );
}
