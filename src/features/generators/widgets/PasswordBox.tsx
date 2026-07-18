import { useEffect, useState } from "react";
import { InputNumber, Checkbox } from "antd";
import GeneratorCard from "../components/GeneratorCard";
import GeneratorOutput from "../components/GeneratorOutput";
import GeneratorActions from "../components/GeneratorActions";
import { randPassword } from "../../../shared/utils/random";

type PasswordOpts = { digits: boolean; symbols: boolean; similar: boolean };

function makePassword(len: number, opts: PasswordOpts) {
  return randPassword(len, opts);
}

export default function PasswordBox() {
  const [len, setLen] = useState(16);
  const [opts, setOpts] = useState<PasswordOpts>({
    digits: true,
    symbols: true,
    similar: false,
  });
  const [value, setValue] = useState(() => makePassword(len, opts));

  useEffect(() => {
    setValue(makePassword(len, opts));
  }, [len, opts]);

  return (
    <GeneratorCard
      title="Password"
      footer={
        <GeneratorActions value={value} onGenerate={() => setValue(makePassword(len, opts))} />
      }
    >
      <GeneratorOutput value={value} />
      <div className="generator-card__options">
        <label className="generator-field">
          <span className="generator-field__label">Length</span>
          <InputNumber
            min={6}
            max={64}
            value={len}
            onChange={(next) => {
              if (next !== null) setLen(next);
            }}
          />
        </label>
        <div className="generator-checkboxes">
          <Checkbox
            checked={opts.digits}
            onChange={(e) => setOpts((o) => ({ ...o, digits: e.target.checked }))}
          >
            Digits
          </Checkbox>
          <Checkbox
            checked={opts.symbols}
            onChange={(e) => setOpts((o) => ({ ...o, symbols: e.target.checked }))}
          >
            Symbols
          </Checkbox>
          <Checkbox
            checked={opts.similar}
            onChange={(e) => setOpts((o) => ({ ...o, similar: e.target.checked }))}
          >
            Similar chars
          </Checkbox>
        </div>
      </div>
    </GeneratorCard>
  );
}
