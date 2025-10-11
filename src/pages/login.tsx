import { useLogin } from "@refinedev/core";
import { Form, Input, Button, Card, Typography } from "antd";

export default function Login() {
  const { mutate: login, isLoading, error } = useLogin();

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Card style={{ width: 360 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Sign in
        </Typography.Title>
        <Form layout="vertical" onFinish={(v) => login(v)}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading} block>
            Sign in
          </Button>
          {error ? (
            <Typography.Text type="danger" style={{ display: "block", marginTop: 8 }}>
              {(error as any)?.message ?? "Login error"}
            </Typography.Text>
          ) : null}
        </Form>
      </Card>
    </div>
  );
}
