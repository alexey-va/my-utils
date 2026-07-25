import { useState } from "react";
import { Alert, Button, Form, Input, Tag, Typography, message } from "antd";
import { Navigate } from "react-router-dom";
import { apiClient, ApiError } from "../../api";
import { apiEndpoints } from "../../api/endpoints";
import type { LoginResponse } from "../../api/types";
import { readStoredUser, storeSession } from "../../auth/session";
import { PATH_HOME } from "../../config/paths";
import AppPanel from "../../shared/components/AppPanel";
import PageLayout from "../../shared/components/PageLayout";

type AccountValues = {
  username: string;
  email: string;
  currentPassword: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function AccountPage() {
  const user = readStoredUser();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  if (!user) {
    return <Navigate to={PATH_HOME} replace />;
  }

  return (
    <PageLayout
      title="Account"
      subtitle="Change your username, email or password. Existing sessions are revoked after saving."
    >
      <AppPanel className="auth-panel auth-panel--account">
        <div className="auth-panel__identity">
          <div>
            <Typography.Title level={4}>{user.username}</Typography.Title>
            <Typography.Text type="secondary">{user.email}</Typography.Text>
          </div>
          <Tag color={user.role === "ADMIN" ? "purple" : "default"}>{user.role}</Tag>
        </div>
        {user.mustChangePassword ? (
          <Alert
            type="warning"
            showIcon
            message="Change the default administrator password before opening admin tools."
            className="auth-panel__alert"
          />
        ) : null}
        <Form<AccountValues>
          layout="vertical"
          requiredMark={false}
          initialValues={{ username: user.username, email: user.email }}
          onFinish={async (values) => {
            setPending(true);
            setError(undefined);
            try {
              const response = await apiClient.post<LoginResponse>(
                apiEndpoints.auth.credentials,
                {
                  currentPassword: values.currentPassword,
                  username: values.username,
                  email: values.email,
                  newPassword: values.newPassword || undefined,
                },
              );
              storeSession(response.user, response.token);
              message.success("Account updated");
              window.location.assign(PATH_HOME);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Failed to update account");
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
            <Input autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input autoComplete="email" size="large" />
          </Form.Item>
          <Form.Item
            name="currentPassword"
            label="Current password"
            rules={[{ required: true }]}
          >
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New password"
            extra={user.mustChangePassword ? "Required for the bootstrap administrator account" : "Leave blank to keep the current password"}
            rules={[
              {
                validator(_, value) {
                  if (!value && !user.mustChangePassword) {
                    return Promise.resolve();
                  }
                  if (typeof value === "string" && value.length >= 8 && value.length <= 128) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Use at least 8 characters"));
                },
              },
            ]}
          >
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Repeat new password"
            dependencies={["newPassword"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !getFieldValue("newPassword") || getFieldValue("newPassword") === value
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
            Save account
          </Button>
        </Form>
      </AppPanel>
    </PageLayout>
  );
}
