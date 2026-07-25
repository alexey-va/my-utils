import { useGetIdentity, useLogin } from "@refinedev/core";
import { Alert, Button, Divider, Form, Input, Typography } from "antd";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";
import type { AuthUser } from "../../api/types";
import {
  LOGIN_REDIRECT_QUERY,
  PATH_ACCOUNT,
  PATH_ADMIN,
  PATH_HOME,
  PATH_REGISTER,
} from "../../config/paths";

export default function Login() {
  const [searchParams] = useSearchParams();
  const rawTo = searchParams.get(LOGIN_REDIRECT_QUERY);
  const redirectTo = rawTo || PATH_ADMIN;
  const { data: identity } = useGetIdentity<AuthUser>();
  const { mutate: login, isPending, error, isError } = useLogin();

  if (identity) {
    return <Navigate to={identity.mustChangePassword ? PATH_ACCOUNT : redirectTo} replace />;
  }

  return (
    <PageLayout title="Sign in" subtitle="Workout stays open to guests. Admin tools require an administrator account.">
      <AppPanel className="auth-panel">
        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={(values: { login: string; password: string }) =>
            login({ ...values, redirectTo })
          }
        >
          <Form.Item name="login" label="Username or email" rules={[{ required: true }]}>
            <Input autoComplete="username" size="large" autoFocus />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>
          {isError ? (
            <Alert
              type="error"
              showIcon
              message={error instanceof Error ? error.message : "Login failed"}
              className="auth-panel__alert"
            />
          ) : null}
          <Button type="primary" htmlType="submit" loading={isPending} size="large" block>
            Sign in
          </Button>
        </Form>
        <Divider plain>or</Divider>
        <Button block size="large">
          <Link to={PATH_REGISTER}>Create an account</Link>
        </Button>
        <Typography.Text type="secondary" className="auth-panel__guest">
          <Link to={PATH_HOME}>Continue without signing in</Link>
        </Typography.Text>
      </AppPanel>
    </PageLayout>
  );
}
