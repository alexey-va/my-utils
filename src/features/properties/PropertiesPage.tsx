import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Select,
  Spin,
  Switch,
  Typography,
  message,
  Space,
  Tag,
} from "antd";
import { EditOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import PageLayout from "../../shared/components/PageLayout";
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

function PropertyRow({
  property,
  row,
  savingAll,
  onChange,
  onSave,
  onOpenTextarea,
}: {
  property: RuntimeProperty;
  row: RowState;
  savingAll: boolean;
  onChange: (value: unknown) => void;
  onSave: () => void;
  onOpenTextarea: () => void;
}) {
  return (
    <article
      className={
        row.dirty
          ? "properties-editor__row properties-editor__row--dirty"
          : "properties-editor__row"
      }
    >
      <div className="properties-editor__identity">
        <div className="properties-editor__key-line">
          <code className="properties-editor__key">{property.key}</code>
          <Tag className="properties-editor__type" color={typeColor(property.type)}>
            {property.type}
          </Tag>
        </div>
        {property.description ? (
          <p className="properties-editor__description">{property.description}</p>
        ) : null}
        {property.objectType ? (
          <span className="properties-editor__object-type">{property.objectType}</span>
        ) : null}
      </div>

      <div className="properties-editor__value">
        <ValueEditor
          property={property}
          draft={row.draft}
          onChange={onChange}
          onOpenTextarea={onOpenTextarea}
        />
      </div>

      <div className="properties-editor__row-action">
        {row.dirty || row.saving ? (
          <Button
            type="primary"
            htmlType="button"
            icon={<SaveOutlined />}
            disabled={row.saving || savingAll}
            loading={row.saving}
            aria-label={`Сохранить ${property.key}`}
            onClick={onSave}
          >
            Сохранить
          </Button>
        ) : null}
      </div>
    </article>
  );
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

  const textareaProperty = textareaKey
    ? properties.find((p) => p.key === textareaKey)
    : undefined;
  const textareaRow = textareaKey ? rows[textareaKey] : undefined;

  return (
    <PageLayout
      title="Properties"
      subtitle="Runtime-настройки приложения"
      actions={
        <Space>
          {dirtyCount > 0 ? (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={savingAll}
              onClick={() => void saveAllDirty()}
            >
              Сохранить всё ({dirtyCount})
            </Button>
          ) : null}
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Обновить
          </Button>
        </Space>
      }
    >
      <section className="properties-editor" aria-label="Runtime-настройки">
        <header className="properties-editor__toolbar">
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
          <span className="properties-editor__result-count" aria-live="polite">
            {filteredProperties.length} из {properties.length}
          </span>
        </header>

        <div className="properties-editor__content" aria-busy={loading}>
          {loading && properties.length === 0 ? (
            <div className="properties-editor__loading"><Spin /></div>
          ) : groupedProperties.length === 0 ? (
            <Empty description="Нет свойств по фильтрам" />
          ) : (
            groupedProperties.map(({ tag, items }) => (
              <section className="properties-editor__group" key={tag}>
                <header className="properties-editor__group-head">
                  <h2>{tagLabel(tag)}</h2>
                  <span>{items.length}</span>
                </header>
                <div className="properties-editor__rows">
                  {items.map((property) => {
                    const row = rows[property.key];
                    if (!row) return null;
                    return (
                      <PropertyRow
                        key={property.key}
                        property={property}
                        row={row}
                        savingAll={savingAll}
                        onChange={(value) => setDraft(property.key, value)}
                        onSave={() => void saveProperty(property.key)}
                        onOpenTextarea={() => setTextareaKey(property.key)}
                      />
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </section>

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
