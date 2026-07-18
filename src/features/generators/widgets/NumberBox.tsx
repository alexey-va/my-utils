import { useEffect, useState } from "react";
import { InputNumber } from "antd";
import GeneratorCard from "../components/GeneratorCard";
import GeneratorOutput from "../components/GeneratorOutput";
import GeneratorActions from "../components/GeneratorActions";
import { randInt } from "../../../shared/utils/random";

export default function NumberBox() {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [value, setValue] = useState(() => String(randInt(min, max)));

  const generate = () => setValue(String(randInt(min, max)));

  useEffect(() => {
    setValue(String(randInt(min, max)));
  }, [min, max]);

  return (
    <GeneratorCard
      title="Random Number"
      footer={<GeneratorActions value={value} onGenerate={generate} />}
    >
      <GeneratorOutput value={value} />
      <div className="generator-card__options generator-card__options--row">
        <label className="generator-field">
          <span className="generator-field__label">Min</span>
          <InputNumber
            value={min}
            onChange={(next) => {
              if (next !== null) setMin(next);
            }}
          />
        </label>
        <label className="generator-field">
          <span className="generator-field__label">Max</span>
          <InputNumber
            value={max}
            onChange={(next) => {
              if (next !== null) setMax(next);
            }}
          />
        </label>
      </div>
    </GeneratorCard>
  );
}
