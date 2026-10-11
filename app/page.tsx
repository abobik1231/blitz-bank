import { LegacyPage } from "@/components/legacy-page";
import parse from "html-react-parser";
import {
  getLegacyPageMetadata,
  getLegacyMenuGroups,
  renderLegacyPage,
} from "@/lib/legacy-content";

const metadata = getLegacyPageMetadata("/");

export const generateMetadata = () => metadata;

export default function HomePage() {
  return (
    <LegacyPage
      path="/"
      menuGroups={getLegacyMenuGroups()}
    >
      {parse(renderLegacyPage("/"))}
    </LegacyPage>
  );
}
