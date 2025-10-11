import { useRef } from "react";
import { Typography, Button } from "antd";
import { RedoOutlined } from "@ant-design/icons";
import GridBoard from "../components/GridBoard";
import UUIDBox from "../generators/UUIDBox";
import PasswordBox from "../generators/PasswordBox";
import NumberBox from "../generators/NumberBox";
import LoremBox from "../generators/LoremBox";
import { DEFAULT_LAYOUTS, LS_KEY } from "../hooks/useGridLayouts";

export default function Generators() {
  const resetRef = useRef<() => void>(() => {});

  return (
    <>
      <Header onReset={() => resetRef.current()} />
      <GridBoard
        lsKey={`${LS_KEY}.v7`}
        defaultLayouts={DEFAULT_LAYOUTS}
        rowHeight={3}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        items={{
          uuid: <UUIDBox />,
          password: <PasswordBox />,
          number: <NumberBox />,
          lorem: <LoremBox />,
        }}
        externalReset={(fn) => (resetRef.current = fn)}
      />
    </>
  );
}

function Header({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 24px 12px" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>Generators</Typography.Title>
      <Button icon={<RedoOutlined />} onClick={onReset}>Reset layout</Button>
    </div>
  );
}
