import { LegacyPage } from "@/components/legacy-page";
import parse from "html-react-parser";
import {
  getLegacyMenuGroups,
  renderLegacyPage,
} from "@/lib/legacy-content";

export default function NotFoundPage() {
  return (
    <LegacyPage
      path="/missing"
      menuGroups={getLegacyMenuGroups()}
    >
      {parse(renderLegacyPage("/missing"))}
    </LegacyPage>
  );
}
