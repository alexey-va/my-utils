import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Input,
  InputNumber,
  Switch,
  Table,
  Typography,
  message,
  Space,
  Tag,
} from "antd";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import PageLayout from "../../shared/components/PageLayout";
import AppPanel from "../../shared/components/AppPanel";
import {
  fetchProperties,
  updateProperty,
  type PropertyType,
  type RuntimeProperty,
} from "../../api/properties";
import { ApiError } from "../../api/errors";

type RowState = {
  draft: unknown;
  dirty: boolean;
  saving: boolean;
};

function typeColor(type: PropertyType): string {
  switch (type) {
    case "BOOLEAN":
      return "blue";
    case "INT":
    case "LONG":
    case "DOUBLE":
      return "green";
    case "STRING":
      return "gold";
    case "OBJECT":
      return "purple";
    default:
      return "default";
  }
}

function ValueEditor({
  property,
  draft,
  onChange,
}: {
  property: RuntimeProperty;
  draft: unknown;
  onChange: (value: unknown) => void;
}) {
  if (property.editor === "TEXTAREA") {
    return (
      <Input.TextArea
        rows={14}
        value={typeof draft === "string" ? draft : String(draft ?? "")}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="properties-editor__textarea"
      />
    );
  }

  switch (property.type) {
    case "BOOLEAN":
      return (
        <Switch
          checked={Boolean(draft)}
          onChange={(checked) => onChange(checked)}
        />
      );
    case "INT":
    case "LONG":
      return (
        <InputNumber
          className="properties-editor__number"
          value={typeof draft === "number" ? draft : Number(draft)}
          onChange={(n) => onChange(n ?? 0)}
          style={{ width: "100%" }}
        />
      );
    case "DOUBLE":
      return (
        <InputNumber
          className="properties-editor__number"
          value={typeof draft === "number" ? draft : Number(draft)}
          onChange={(n) => onChange(n ?? 0)}
          step={0.1}
          style={{ width: "100%" }}
        />
      );
    case "OBJECT":
      return (
        <Input.TextArea
          rows={4}
          value={
            typeof draft === "string"
              ? draft
              : JSON.stringify(draft, null, 2)
          }
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="properties-editor__json"
        />
      );
    default:
      return (
        <Input
          value={typeof draft === "string" ? draft : String(draft ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function parseValueForSave(property: RuntimeProperty, draft: unknown): unknown {
  if (property.type === "OBJECT") {
    const raw = typeof draft === "string" ? draft : JSON.stringify(draft);
    return JSON.parse(raw) as unknown;
  }
  if (property.type === "STRING" && typeof draft === "string") {
    return draft;
  }
  return draft;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<RuntimeProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchProperties();
      setProperties(list);
      const next: Record<string, RowState> = {};
      for (const p of list) {
        next[p.key] = { draft: p.value, dirty: false, saving: false };
      }
      setRows(next);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Не удалось загрузить свойства");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setDraft = (key: string, draft: unknown) => {
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], draft, dirty: true },
    }));
  };

  const save = async (property: RuntimeProperty) => {
    const row = rows[property.key];
    if (!row) return;

    let parsed: unknown;
    try {
      parsed = parseValueForSave(property, row.draft);
    } catch {
      message.error(`Невалидный JSON для ${property.key}`);
      return;
    }

    setRows((prev) => ({
      ...prev,
      [property.key]: { ...prev[property.key], saving: true },
    }));

    try {
      const updated = await updateProperty(property.key, parsed);
      setProperties((list) =>
        list.map((p) => (p.key === updated.key ? updated : p)),
      );
      setRows((prev) => ({
        ...prev,
        [property.key]: { draft: updated.value, dirty: false, saving: false },
      }));
      message.success(`Сохранено: ${property.key}`);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Ошибка сохранения");
      setRows((prev) => ({
        ...prev,
        [property.key]: { ...prev[property.key], saving: false },
      }));
    }
  };

  const columns: ColumnsType<RuntimeProperty> = [
    {
      title: "Ключ",
      dataIndex: "key",
      width: 280,
      render: (key: string, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text code>{key}</Typography.Text>
          {row.objectType ? (
            <Typography.Text type="secondary" className="properties-editor__object-type">
              {row.objectType}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Тип",
      dataIndex: "type",
      width: 100,
      render: (type: PropertyType) => <Tag color={typeColor(type)}>{type}</Tag>,
    },
    {
      title: "Описание",
      dataIndex: "description",
      ellipsis: true,
    },
    {
      title: "Значение",
      key: "value",
      width: 480,
      render: (_, property) => {
        const row = rows[property.key];
        if (!row) return null;
        return (
          <div className={property.editor === "TEXTAREA" ? "properties-editor__value-wide" : undefined}>
            <ValueEditor
              property={property}
              draft={row.draft}
              onChange={(v) => setDraft(property.key, v)}
            />
          </div>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, property) => {
        const row = rows[property.key];
        if (!row) return null;
        return (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!row.dirty || row.saving}
            loading={row.saving}
            onClick={() => void save(property)}
          >
            Save
          </Button>
        );
      },
    },
  ];

  return (
    <PageLayout
      title="Properties"
      subtitle="Runtime-настройки API (пока без авторизации)"
      actions={
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
          Reload
        </Button>
      }
    >
      <AppPanel>
        <Table
          className="properties-editor__table"
          rowKey="key"
          columns={columns}
          dataSource={properties}
          loading={loading}
          pagination={false}
          size="middle"
        />
      </AppPanel>
    </PageLayout>
  );
}
