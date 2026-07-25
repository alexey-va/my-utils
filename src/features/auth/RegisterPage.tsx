import { useState } from "react";
import { Alert, Button, Divider, Form, Input, Typography } from "antd";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiClient, ApiError } from "../../api";
import { apiEndpoints } from "../../api/endpoints";
import type { LoginResponse } from "../../api/types";
import { isLoggedIn, storeSession } from "../../auth/session";
import { PATH_HOME, PATH_LOGIN } from "../../config/paths";
import AppPanel from "../../shared/components/AppPanel";
import PageLayout from "../../shared/components/PageLayout";

type RegisterValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  if (isLoggedIn()) {
    return <Navigate to={PATH_HOME} replace />;
  }

  return (
    <PageLayout
      title="Create account"
      subtitle="Registration creates a regular account. Workout remains available without signing in."
    >
      <AppPanel className="auth-panel">
        <Form<RegisterValues>
          layout="vertical"
          requiredMark={false}
          onFinish={async (values) => {
            setPending(true);
            setError(undefined);
            try {
              const response = await apiClient.post<LoginResponse>(
                apiEndpoints.auth.register,
                {
                  username: values.username,
                  email: values.email,
                  password: values.password,
                },
                { skipAuth: true },
              );
              storeSession(response.user, response.token);
              navigate(PATH_HOME, { replace: true });
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Registration failed");
            } finally {
              setPending(false);
            }
          }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true },
              { min: 3, max: 32 },
              {
                pattern: /^[A-Za-z0-9_.-]+$/,
                message: "Use letters, numbers, dot, dash or underscore",
              },
            ]}
          >
            <Input autoComplete="username" size="large" autoFocus />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input autoComplete="email" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true }, { min: 8, max: 128 }]}
          >
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Repeat password"
            dependencies={["password"]}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue("password") === value
                    ? Promise.resolve()
                    : Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          {error ? <Alert type="error" showIcon message={error} className="auth-panel__alert" /> : null}
          <Button type="primary" htmlType="submit" loading={pending} size="large" block>
            Create account
          </Button>
        </Form>
        <Divider />
        <Typography.Text type="secondary" className="auth-panel__guest">
          Already registered? <Link to={PATH_LOGIN}>Sign in</Link>
        </Typography.Text>
      </AppPanel>
    </PageLayout>
  );
}
