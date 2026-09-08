import { BgColorsOutlined, CheckOutlined } from "@ant-design/icons";
import { Button, Modal } from "antd";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { themePalettes } from "../design/linearTokens";
import { APP_THEMES, useAppTheme, type ThemeMode } from "./appTheme";
import "./ThemePicker.css";

type PreviewStyle = CSSProperties & {
  "--theme-picker-canvas": string;
  "--theme-picker-surface": string;
  "--theme-picker-surface-raised": string;
  "--theme-picker-border": string;
  "--theme-picker-primary": string;
  "--theme-picker-ink": string;
  "--theme-picker-muted": string;
};

function previewStyle(mode: ThemeMode): PreviewStyle {
  const palette = themePalettes[mode];
  return {
    "--theme-picker-canvas": palette.canvas,
    "--theme-picker-surface": palette.surface1,
    "--theme-picker-surface-raised": palette.surface2,
    "--theme-picker-border": palette.hairline,
    "--theme-picker-primary": palette.primary,
    "--theme-picker-ink": palette.ink,
    "--theme-picker-muted": palette.inkMuted,
  };
}

function ThemePreview({ mode }: { mode: ThemeMode }) {
  return (
    <span className="theme-picker__preview" style={previewStyle(mode)} aria-hidden="true">
      <span className="theme-picker__preview-nav">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="theme-picker__preview-main">
        <span className="theme-picker__preview-header">
          <i />
          <b />
        </span>
        <span className="theme-picker__preview-title" />
        <span className="theme-picker__preview-content">
          <span className="theme-picker__preview-card theme-picker__preview-card--primary" />
          <span className="theme-picker__preview-card" />
        </span>
        <span className="theme-picker__preview-list">
          <i />
          <i />
        </span>
      </span>
    </span>
  );
}

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { mode, setTheme } = useAppTheme();
  const selectedTheme = APP_THEMES.find((theme) => theme.id === mode)!;

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape, true);
    return () => document.removeEventListener("keydown", closeOnEscape, true);
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button
        ref={triggerRef}
        className="theme-picker__trigger"
        type="text"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Оформление: ${selectedTheme.label}`}
        icon={<BgColorsOutlined />}
        onClick={() => setOpen(true)}
      >
        <span className="theme-picker__trigger-label">{selectedTheme.label}</span>
      </Button>
      <Modal
        className="theme-picker"
        title="Оформление"
        open={open}
        width={480}
        keyboard={false}
        footer={<Button onClick={close}>Закрыть</Button>}
        onCancel={close}
        afterClose={() => triggerRef.current?.focus()}
      >
        <div className="theme-picker__grid" aria-label="Варианты оформления">
          {APP_THEMES.map(({ id, label }) => {
            const selected = id === mode;
            return (
              <button
                key={id}
                className={`theme-picker__option${selected ? " theme-picker__option--selected" : ""}`}
                type="button"
                aria-pressed={selected}
                aria-label={`Выбрать тему ${label}`}
                onClick={() => setTheme(id)}
              >
                <ThemePreview mode={id} />
                <span className="theme-picker__option-name">{label}</span>
                <span className="theme-picker__option-check" aria-hidden="true">
                  <CheckOutlined />
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
