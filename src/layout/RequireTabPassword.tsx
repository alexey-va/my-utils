import { useState, type ReactNode } from "react";
import { Button, Form, Input, Typography } from "antd";
import { Link } from "react-router-dom";
import PageLayout from "../shared/components/PageLayout";
import AppPanel from "../shared/components/AppPanel";
import { PATH_HOME } from "../config/paths";

const TAB_PASSWORD = "3636";
const STORAGE_KEY = "myutils_tab_password_ok";

function isTabUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

type Props = {
  children: ReactNode;
};

/** Gates non-workout tabs behind a shared password (remembered in localStorage). */
export default function RequireTabPassword({ children }: Props) {
  const [unlocked, setUnlocked] = useState(isTabUnlocked);
  const [error, setError] = useState(false);

  if (unlocked) {
    return children;
  }

  return (
    <PageLayout title="Protected" subtitle="Enter the tab password to continue">
      <AppPanel>
        <Form
          layout="vertical"
          onFinish={(values: { password: string }) => {
            if (values.password === TAB_PASSWORD) {
              try {
                localStorage.setItem(STORAGE_KEY, "1");
              } catch {
                /* ignore quota / private mode */
              }
              setError(false);
              setUnlocked(true);
              return;
            }
            setError(true);
          }}
        >
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password autoComplete="off" autoFocus />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Unlock
          </Button>
          {error ? (
            <Typography.Text type="danger" style={{ display: "block", marginTop: 8 }}>
              Wrong password
            </Typography.Text>
          ) : null}
        </Form>
        <Typography.Text type="secondary" style={{ display: "block", marginTop: 16 }}>
          <Link to={PATH_HOME}>Back to Workout</Link>
        </Typography.Text>
      </AppPanel>
    </PageLayout>
  );
}
