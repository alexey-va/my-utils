/* eslint-disable @typescript-eslint/no-explicit-any */
import { useGetIdentity, useLogin } from "@refinedev/core";
import { Form, Input, Button, Typography } from "antd";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";
import { LOGIN_REDIRECT_QUERY, PATH_ADMIN, PATH_HOME } from "../../config/paths";

export default function Login() {
  const [searchParams] = useSearchParams();
  const rawTo = searchParams.get(LOGIN_REDIRECT_QUERY);
  const redirectTo = rawTo ? decodeURIComponent(rawTo) : PATH_ADMIN;
  const { data: identity } = useGetIdentity();
  const { mutate: login, isPending, error, isError } = useLogin();

  if (identity) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <PageLayout title="Sign in" subtitle="Optional — utilities work without an account">
      <AppPanel>
        <Form layout="vertical" onFinish={(values) => login({ ...values, redirectTo })}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={isPending}>
            Sign in
          </Button>
          {isError && (
            <Typography.Text type="danger" style={{ display: "block", marginTop: 8 }}>
              {(error as any)?.message ?? "Login error"}
            </Typography.Text>
          )}
        </Form>
        <Typography.Text type="secondary" style={{ display: "block", marginTop: 16 }}>
          <Link to={PATH_HOME}>Continue without signing in</Link>
        </Typography.Text>
      </AppPanel>
    </PageLayout>
  );
}
