import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Collapse,
  Empty,
  Input,
  InputNumber,
  Select,
  Switch,
  Table,
  Typography,
  message,
  Space,
  Tag,
} from "antd";
import { EditOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
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
import PropertyTextareaModal from "./PropertyTextareaModal";
import {
  parseValueForSave,
  typeColor,
  valueAsString,
  valuesEqual,
} from "./propertyValueUtils";

type RowState = {
  draft: unknown;
  dirty: boolean;
  saving: boolean;
};

const ALL_TYPES: PropertyType[] = ["BOOLEAN", "INT", "LONG", "DOUBLE", "STRING", "OBJECT"];

const TAG_LABELS: Record<string, string> = {
  temporal: "Temporal",
  agent: "Agent / OpenRouter",
  telegram: "Telegram",
  other: "Other",
};

function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag;
}

function ValueEditor({
  property,
  draft,
  onChange,
  onOpenTextarea,
}: {
  property: RuntimeProperty;
  draft: unknown;
  onChange: (value: unknown) => void;
  onOpenTextarea: () => void;
}) {
  if (property.editor === "TEXTAREA") {
    const text = valueAsString(draft);
    const lineCount = text ? text.split("\n").length : 0;
    return (
      <div className="properties-editor__textarea-cell">
        <Typography.Paragraph
          className="properties-editor__textarea-preview"
          ellipsis={{ rows: 4, expandable: false }}
        >
          {text || "—"}
        </Typography.Paragraph>
        <Typography.Text type="secondary" className="properties-editor__textarea-meta">
          {lineCount} строк · {text.length.toLocaleString()} символов
        </Typography.Text>
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onOpenTextarea();
          }}
          className="properties-editor__edit-link"
        >
          Открыть редактор
        </Button>
      </div>
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

function matchesSearch(property: RuntimeProperty, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    property.key.toLowerCase().includes(q) ||
    property.description.toLowerCase().includes(q) ||
    property.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

function primaryTag(property: RuntimeProperty): string {
  return property.tags[0] ?? "other";
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<RuntimeProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PropertyType[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [textareaKey, setTextareaKey] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

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

  const allTags = useMemo(
    () => [...new Set(properties.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b)),
    [properties],
  );

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      if (!matchesSearch(property, search)) return false;
      if (typeFilter.length > 0 && !typeFilter.includes(property.type)) return false;
      if (tagFilter.length > 0 && !property.tags.some((tag) => tagFilter.includes(tag))) return false;
      return true;
    });
  }, [properties, search, typeFilter, tagFilter]);

  const groupedProperties = useMemo(() => {
    const groups = new Map<string, RuntimeProperty[]>();
    for (const property of filteredProperties) {
      const tag = primaryTag(property);
      const list = groups.get(tag) ?? [];
      list.push(property);
      groups.set(tag, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, items]) => ({
        tag,
        items: [...items].sort((a, b) => a.key.localeCompare(b.key)),
      }));
  }, [filteredProperties]);

  const dirtyCount = useMemo(
    () => Object.values(rows).filter((row) => row.dirty && !row.saving).length,
    [rows],
  );

  const setDraft = (key: string, draft: unknown) => {
    const property = propertiesRef.current.find((p) => p.key === key);
    const dirty = property ? !valuesEqual(property, draft, property.value) : true;
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], draft, dirty, saving: prev[key]?.saving ?? false },
    }));
  };

  const saveProperty = useCallback(async (key: string, draftOverride?: unknown) => {
    const property = propertiesRef.current.find((p) => p.key === key);
    if (!property) return false;

    const row = rowsRef.current[key];
    const draft = draftOverride ?? row?.draft;
    if (draft === undefined) return false;

    if (draftOverride == null && row && !row.dirty) {
      return true;
    }

    let parsed: unknown;
    try {
      parsed = parseValueForSave(property, draft);
    } catch {
      message.error(`Невалидный JSON для ${property.key}`);
      return false;
    }

    if (valuesEqual(property, parsed, property.value)) {
      setRows((prev) => ({
        ...prev,
        [key]: { draft: property.value, dirty: false, saving: false },
      }));
      return true;
    }

    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], draft, saving: true },
    }));

    try {
      const updated = await updateProperty(key, parsed);
      setProperties((list) => list.map((p) => (p.key === updated.key ? updated : p)));
      setRows((prev) => ({
        ...prev,
        [key]: { draft: updated.value, dirty: false, saving: false },
      }));
      message.success(`Сохранено: ${property.key}`);
      return true;
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Ошибка сохранения");
      setRows((prev) => ({
        ...prev,
        [key]: { ...prev[key], saving: false },
      }));
      return false;
    }
  }, []);

  const saveAllDirty = async () => {
    const keys = propertiesRef.current
      .map((p) => p.key)
      .filter((key) => rowsRef.current[key]?.dirty && !rowsRef.current[key]?.saving);
    if (keys.length === 0) return;
    setSavingAll(true);
    try {
      for (const key of keys) {
        await saveProperty(key);
      }
    } finally {
      setSavingAll(false);
    }
  };

  const columns: ColumnsType<RuntimeProperty> = [
    {
      title: "Ключ",
      dataIndex: "key",
      width: 300,
      render: (key: string, row) => (
        <Space direction="vertical" size={4} className="properties-editor__key-cell">
          <Typography.Text code>{key}</Typography.Text>
          {row.tags.length > 0 ? (
            <Space size={[4, 4]} wrap>
              {row.tags.map((tag) => (
                <Tag key={tag} className="properties-editor__tag">
                  {tagLabel(tag)}
                </Tag>
              ))}
            </Space>
          ) : null}
          {row.description ? (
            <Typography.Text type="secondary" className="properties-editor__description">
              {row.description}
            </Typography.Text>
          ) : null}
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
      title: "Значение",
      key: "value",
      width: 480,
      render: (_, property) => {
        const row = rows[property.key];
        if (!row) return null;
        return (
          <ValueEditor
            property={property}
            draft={row.draft}
            onChange={(v) => setDraft(property.key, v)}
            onOpenTextarea={() => setTextareaKey(property.key)}
          />
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
            htmlType="button"
            icon={<SaveOutlined />}
            disabled={!row.dirty || row.saving || savingAll}
            loading={row.saving}
            onClick={(e) => {
              e.stopPropagation();
              void saveProperty(property.key);
            }}
          >
            Save
          </Button>
        );
      },
    },
  ];

  const textareaProperty = textareaKey
    ? properties.find((p) => p.key === textareaKey)
    : undefined;
  const textareaRow = textareaKey ? rows[textareaKey] : undefined;

  return (
    <PageLayout
      title="Properties"
      subtitle="Runtime-настройки API (пока без авторизации)"
      actions={
        <Space>
          {dirtyCount > 0 ? (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={savingAll}
              onClick={() => void saveAllDirty()}
            >
              Save all ({dirtyCount})
            </Button>
          ) : null}
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Reload
          </Button>
        </Space>
      }
    >
      <AppPanel className="properties-editor">
        <div className="properties-editor__toolbar">
          <Input.Search
            allowClear
            placeholder="Поиск по ключу, описанию, тегу…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="properties-editor__search"
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Тип"
            value={typeFilter}
            onChange={setTypeFilter}
            options={ALL_TYPES.map((type) => ({ label: type, value: type }))}
            className="properties-editor__type-filter"
            maxTagCount="responsive"
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Тег"
            value={tagFilter}
            onChange={setTagFilter}
            options={allTags.map((tag) => ({ label: tagLabel(tag), value: tag }))}
            className="properties-editor__tag-filter"
            maxTagCount="responsive"
          />
          {(search || typeFilter.length > 0 || tagFilter.length > 0) && (
            <Typography.Text type="secondary">
              {filteredProperties.length} из {properties.length}
            </Typography.Text>
          )}
        </div>

        {groupedProperties.length === 0 ? (
          <Empty description="Нет свойств по фильтрам" />
        ) : (
          <Collapse
            className="properties-editor__groups"
            defaultActiveKey={groupedProperties.map((g) => g.tag)}
            items={groupedProperties.map(({ tag, items }) => ({
              key: tag,
              label: (
                <Space>
                  <span>{tagLabel(tag)}</span>
                  <Tag>{items.length}</Tag>
                </Space>
              ),
              children: (
                <Table
                  className="properties-editor__table"
                  rowKey="key"
                  columns={columns}
                  dataSource={items}
                  loading={loading}
                  pagination={false}
                  size="middle"
                  tableLayout="fixed"
                  scroll={{ x: 1020 }}
                />
              ),
            }))}
          />
        )}
      </AppPanel>

      {textareaProperty && textareaRow ? (
        <PropertyTextareaModal
          open={textareaKey != null}
          title={textareaProperty.key}
          description={textareaProperty.description}
          value={valueAsString(textareaRow.draft)}
          saving={textareaRow.saving || savingAll}
          onClose={() => setTextareaKey(null)}
          onSave={(next) => {
            setTextareaKey(null);
            setDraft(textareaProperty.key, next);
            void saveProperty(textareaProperty.key, next);
          }}
        />
      ) : null}
    </PageLayout>
  );
}
