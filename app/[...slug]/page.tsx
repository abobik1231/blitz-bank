import type { Metadata } from "next";
import parse from "html-react-parser";
import { notFound } from "next/navigation";
import { LegacyPage } from "@/components/legacy-page";
import {
  getLegacyPageMetadata,
  getLegacyMenuGroups,
  legacyPagePaths,
  renderLegacyPage,
} from "@/lib/legacy-content";

type RouteProps = {
  params: Promise<{ slug: string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [...legacyPagePaths, "/404"].map((path) => ({
    slug: path.slice(1).split("/"),
  }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  return getLegacyPageMetadata(`/${slug.join("/")}`);
}

export default async function SitePage({ params }: RouteProps) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  if (!legacyPagePaths.includes(path) && path !== "/404") notFound();

  return (
    <LegacyPage
      path={path}
      menuGroups={getLegacyMenuGroups()}
    >
      {parse(renderLegacyPage(path))}
    </LegacyPage>
  );
}
