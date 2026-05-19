import { useLogout, useGetIdentity } from "@refinedev/core";
import { Button, Typography } from "antd";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";

export default function Admin() {
  const { data: me } = useGetIdentity();
  const { mutate: logout } = useLogout();

  return (
    <PageLayout
      title="Admin panel"
      subtitle="Account and workspace settings"
      actions={
        <>
          {me?.email ? <span className="app-page__user">{me.email}</span> : null}
          <Button onClick={() => logout()}>Logout</Button>
        </>
      }
    >
      <AppPanel>
        <Typography.Paragraph className="app-panel__text">
          Welcome. Add your tools here.
        </Typography.Paragraph>
      </AppPanel>
    </PageLayout>
  );
}
