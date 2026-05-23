import { Input, Modal, Typography } from "antd";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  value: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
};

export default function PropertyTextareaModal({
  open,
  title,
  description,
  value,
  saving,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  return (
    <Modal
      className="properties-editor__modal"
      title={title}
      open={open}
      onCancel={onClose}
      onOk={() => onSave(draft)}
      okText="Apply"
      cancelText="Cancel"
      confirmLoading={saving}
      width="min(960px, 96vw)"
      destroyOnClose
    >
      {description ? (
        <Typography.Paragraph type="secondary" className="properties-editor__modal-desc">
          {description}
        </Typography.Paragraph>
      ) : null}
      <Input.TextArea
        className="properties-editor__modal-textarea"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        autoSize={{ minRows: 22, maxRows: 40 }}
      />
      <Typography.Text type="secondary" className="properties-editor__modal-meta">
        {draft.length.toLocaleString()} символов · переносы строк сохраняются
      </Typography.Text>
    </Modal>
  );
}
