import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

/** Shared page shell — same alignment on every tab. */
export default function PageLayout({ title, subtitle, actions, children }: Props) {
  return (
    <div className="app-page">
      <header className="app-page__header">
        <div className="app-page__header-text">
          <h1 className="app-page__title">{title}</h1>
          {subtitle ? <p className="app-page__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="app-page__actions">{actions}</div> : null}
      </header>
      <main className="app-page__body">{children}</main>
    </div>
  );
}
