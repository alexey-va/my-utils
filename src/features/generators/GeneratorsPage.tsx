import PageLayout from "../../shared/components/PageLayout";
import GeneratorsGrid from "./GeneratorsGrid";
import UUIDBox from "./widgets/UUIDBox";
import PasswordBox from "./widgets/PasswordBox";
import NumberBox from "./widgets/NumberBox";

export default function Generators() {
  return (
    <PageLayout title="Generators" subtitle="Quick random data for daily dev work">
      <GeneratorsGrid uuid={<UUIDBox />} password={<PasswordBox />} number={<NumberBox />} />
    </PageLayout>
  );
}
