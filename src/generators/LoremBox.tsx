import { useEffect, useState } from "react";
import { Input, InputNumber, Space, Button, Checkbox } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import GeneratorCard from "../components/GeneratorCard";
import TitleDrag from "../components/TitleDrag";
import CopyButton from "../components/CopyButton";
import { loremText } from "../utils/random";

export default function LoremBox() {
  const [words, setWords] = useState<number>(10);
  const [paras, setParas] = useState<number>(1);
  const [langRu, setLangRu] = useState(false);
  const [capital, setCapital] = useState(false);
  const [punctuation, setPunctuation] = useState(false);

  const make = () =>
    loremText(words, {
      lang: langRu ? "ru" : "en",
      paragraphs: paras,
      capital,
      punctuation,
    });

  const fmt = (v?: string | number) =>
    v === undefined || v === null ? "" : String(v).replace(/^(-?)0+(?=\d)/, "$1");

  const parse = (v?: string) => {
    if (!v) return 0;
    const s = v.replace(/[^\d-]/g, "").replace(/^(-?)0+(?=\d)/, "$1");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const [v, setV] = useState(make());

  useEffect(() => {
    setV(make());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, paras, langRu, capital, punctuation]);

  return (
    <GeneratorCard title={<TitleDrag text="Lorem Ipsum" />}>
      {/* fills free vertical space and shows long text comfortably */}
      <Input.TextArea
        value={v}
        readOnly
        style={{ resize: "none", flex: 1, minHeight: 0, whiteSpace: "pre-wrap" }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "nowrap",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>Words</span>
          <InputNumber
            min={5}
            max={10000}
            value={words}
            onChange={(n) => setWords(Number(n ?? 0))}
            formatter={fmt}
            parser={parse}
          />
          <span>Paragraphs</span>
          <InputNumber
            min={1}
            max={500}
            value={paras}
            onChange={(n) => setParas(Number(n ?? 0))}
            formatter={fmt}
            parser={parse}
          />
          <Checkbox checked={langRu} onChange={(e) => setLangRu(e.target.checked)}>
            Russian
          </Checkbox>
          <Checkbox checked={capital} onChange={(e) => setCapital(e.target.checked)}>
            Capital
          </Checkbox>
          <Checkbox checked={punctuation} onChange={(e) => setPunctuation(e.target.checked)}>
            Punct.
          </Checkbox>
        </div>

        <Space>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => setV(make())}>
            Generate
          </Button>
          <CopyButton value={v} />
        </Space>
      </div>
    </GeneratorCard>
  );
}
