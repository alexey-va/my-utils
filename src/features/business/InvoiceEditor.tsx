import { useEffect, useState } from "react";
import { Alert, Button, Drawer, Form, Input, Select } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ApiError } from "../../api/errors";
import { createBusinessInvoice } from "./api";
import { formatAmountInput, formatMoney, lineAmountMinor, localToday, parseMoneyMinor } from "./format";
import type { BusinessCounterpartyView, BusinessInvoiceView, BusinessWorkspace } from "./types";

type DraftItem = { description: string; quantity: string; unit: string; price: string };
type Draft = { counterpartyId: string; templateId: string; period: string; issueDate: string; dueDate: string; number: string; basis: string; provider: "local" | "tochka"; items: DraftItem[] };
const emptyItem = (): DraftItem => ({ description: "", quantity: "1", unit: "мес.", price: "" });

function templateDraft(payer: BusinessCounterpartyView | undefined, templateId?: string): Pick<Draft, "templateId" | "basis" | "items"> {
  const template = payer?.templates.find(item => item.id === templateId) ?? payer?.templates[0];
  return { templateId: template?.id ?? "", basis: template?.basis ?? "", items: template?.items.map(item => ({ description: item.description, quantity: item.quantity, unit: item.unit, price: formatAmountInput(item.priceMinor) })) ?? [emptyItem()] };
}

export default function InvoiceEditor({ open, workspace, counterpartyId, onClose, onCreated }: { open: boolean; workspace: BusinessWorkspace; counterpartyId?: string; onClose: () => void; onCreated: (invoice: BusinessInvoiceView) => void }) {
  const [form] = Form.useForm<Draft>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const payerId = Form.useWatch("counterpartyId", form);
  const provider = Form.useWatch("provider", form);
  const items = Form.useWatch("items", form) as DraftItem[] | undefined;
  const payer = workspace.counterparties.find(item => item.id === payerId);
  const canUseBank = workspace.bank.connected && payer?.entityType !== "person";
  const amounts = (items ?? []).map(item => {
    const price = parseMoneyMinor(item?.price ?? "");
    return price === null ? null : lineAmountMinor(price, item?.quantity ?? "");
  });
  const total = amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    const selected = workspace.counterparties.find(item => item.id === counterpartyId) ?? workspace.counterparties[0];
    const today = localToday();
    form.resetFields();
    form.setFieldsValue({ counterpartyId: selected?.id, ...templateDraft(selected), period: today.slice(0, 7), issueDate: today, dueDate: "", number: "", provider: "local" });
    setError("");
    setUncertain(false);
    // Reset once per opening; a background refresh must not overwrite the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save(values: Draft) {
    const prepared = values.items.map(item => {
      const price = parseMoneyMinor(item.price);
      const amount = price === null ? null : lineAmountMinor(price, item.quantity);
      return price === null || amount === null ? null : { description: item.description.trim(), quantity: item.quantity.trim().replace(",", "."), unit: item.unit.trim(), priceMinor: price, amountMinor: amount };
    });
    if (prepared.some(item => !item) || !Number.isSafeInteger(total) || total <= 0) {
      setError("Проверьте количество и цену. Итоговая сумма должна быть больше нуля.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const invoice = await createBusinessInvoice({ counterpartyId: values.counterpartyId, templateId: values.templateId ?? "", period: values.period, issueDate: values.issueDate, dueDate: values.dueDate || undefined, number: values.number?.trim() || undefined, basis: values.basis?.trim(), items: prepared.filter(item => item !== null), provider: values.provider });
      onCreated(invoice);
    } catch (cause) {
      const unknownBankResult = values.provider === "tochka" && (!(cause instanceof ApiError) || cause.status === 502);
      setUncertain(unknownBankResult);
      setError(unknownBankResult ? "Результат создания в банке не подтверждён. Проверьте список счетов и состояние документа перед новым запросом. Черновик сохранён в этой форме." : cause instanceof ApiError ? cause.message : "Не удалось создать счёт. Черновик сохранён — попробуйте ещё раз.");
    } finally { setSaving(false); }
  }

  return <Drawer title="Новый счёт" open={open} onClose={saving ? undefined : onClose} closable={!saving} maskClosable={!saving} keyboard={!saving} width={740} rootClassName="business-drawer" destroyOnHidden footer={<div className="business-drawer-footer"><div><span>Итого, без НДС</span><strong>{Number.isSafeInteger(total) ? formatMoney(total) : "Проверьте сумму"}</strong></div><Button type="primary" loading={saving} disabled={uncertain || !workspace.counterparties.length} onClick={() => form.submit()}>Создать счёт</Button></div>}>
    <p className="business-intro">Создайте документ для плательщика. Отправить готовый счёт можно после скачивания.</p>
    {error && <Alert type={uncertain ? "warning" : "error"} showIcon message={error} className="business-form-alert" />}
    <Form form={form} layout="vertical" onFinish={save} disabled={saving} requiredMark={false}>
      <Form.Item label="Плательщик" name="counterpartyId" rules={[{ required: true, message: "Выберите плательщика" }]}><Select showSearch optionFilterProp="label" placeholder="Выберите плательщика" options={workspace.counterparties.map(item => ({ value: item.id, label: item.name }))} onChange={value => { const next = workspace.counterparties.find(item => item.id === value); form.setFieldsValue({ ...templateDraft(next), provider: "local" }); }} /></Form.Item>
      {!!payer?.templates.length && <Form.Item label="Договор / помещение" name="templateId" rules={[{ required: true, message: "Выберите договор" }]}><Select options={payer.templates.map(item => ({ value: item.id, label: item.label }))} onChange={value => form.setFieldsValue(templateDraft(payer, value))} /></Form.Item>}
      <div className="business-form-grid">
        <Form.Item label="Период услуг" name="period" rules={[{ required: true, message: "Укажите месяц" }]}><Input type="month" /></Form.Item>
        <Form.Item label="Номер счёта" name="number" extra={`Автоматически: следующий № ${workspace.nextInvoiceNumber}`}><Input placeholder="Присвоить автоматически" maxLength={60} /></Form.Item>
        <Form.Item label="Дата счёта" name="issueDate" rules={[{ required: true, message: "Укажите дату" }]}><Input type="date" /></Form.Item>
        <Form.Item label="Оплатить до" name="dueDate"><Input type="date" /></Form.Item>
      </div>
      <Form.Item label="Основание" name="basis"><Input.TextArea rows={2} maxLength={2000} placeholder="Договор, помещение или основание платежа" /></Form.Item>
      <h3 className="business-form-heading">Услуги</h3>
      <Form.List name="items">{(fields, { add, remove }) => <>
        {fields.map((field, index) => <div key={field.key} className="business-line-item">
          <div className="business-line-item__description"><Form.Item label={`Наименование ${index + 1}`} name={[field.name, "description"]} rules={[{ required: true, whitespace: true, message: "Укажите услугу" }]}><Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} maxLength={2000} placeholder="Аренда помещения" /></Form.Item><Button type="text" danger icon={<DeleteOutlined />} aria-label={`Удалить услугу ${index + 1}`} disabled={fields.length === 1} onClick={() => remove(field.name)} /></div>
          <div className="business-line-item__numbers">
            <Form.Item label="Количество" name={[field.name, "quantity"]} rules={[{ required: true, message: "Укажите количество" }, { validator: (_, value: string) => lineAmountMinor(100, value ?? "") !== null ? Promise.resolve() : Promise.reject(new Error("Положительное число, до 6 знаков после запятой")) }]}><Input inputMode="decimal" /></Form.Item>
            <Form.Item label="Ед." name={[field.name, "unit"]} rules={[{ required: true, whitespace: true, message: "Единица" }]}><Input maxLength={30} /></Form.Item>
            <Form.Item label="Цена, ₽" name={[field.name, "price"]} rules={[{ required: true, message: "Укажите цену" }, { validator: (_, value: string) => parseMoneyMinor(value ?? "") !== null ? Promise.resolve() : Promise.reject(new Error("Цена с точностью до копейки")) }]}><Input inputMode="decimal" /></Form.Item>
            <div className="business-line-item__total"><span>Сумма</span><strong>{amounts[index] === null || amounts[index] === undefined ? "—" : formatMoney(amounts[index]!)}</strong></div>
          </div>
        </div>)}
        <Button icon={<PlusOutlined />} onClick={() => add(emptyItem())}>Добавить услугу</Button>
      </>}</Form.List>
      <div className="business-creation-method"><Form.Item name="provider" label="Способ создания"><Select options={[{ value: "local", label: "PDF в Бизнесе" }, { value: "tochka", label: "Через Точку", disabled: !canUseBank }]} /></Form.Item><p>{provider === "tochka" ? "Счёт будет создан в Точке. Отправка плательщику не выполняется." : "Готовый PDF сохранится в документах. Банковское подключение не требуется."}</p>{!canUseBank && <p>{payer?.entityType === "person" ? "Для физического лица доступен PDF в Бизнесе." : "Создание через Точку доступно после подключения банка."}</p>}</div>
    </Form>
  </Drawer>;
}
