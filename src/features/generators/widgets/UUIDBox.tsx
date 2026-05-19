import { useState } from "react";
import GeneratorCard from "../components/GeneratorCard";
import GeneratorOutput from "../components/GeneratorOutput";
import GeneratorActions from "../components/GeneratorActions";

export default function UUIDBox() {
  const [value, setValue] = useState(() => crypto.randomUUID());

  return (
    <GeneratorCard
      title="UUID v4"
      footer={
        <GeneratorActions value={value} onGenerate={() => setValue(crypto.randomUUID())} />
      }
    >
      <GeneratorOutput value={value} />
    </GeneratorCard>
  );
}
