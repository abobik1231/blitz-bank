"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type MenuGroup = {
  title: string;
  copy: string;
  links: string[][];
  feature: string[];
};

type LegacyPageProps = {
  children: ReactNode;
  path: string;
  menuGroups: Record<string, MenuGroup>;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(value))} ₽`;
}

function annuity(principal: number, rate: number, months: number): number {
  const monthlyRate = rate / 12;
  if (!principal || !months) return 0;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function formatFieldValue(id: string, value: string): string {
  if (/years/.test(id)) return `${value} ${Number(value) === 1 ? "год" : "лет"}`;
  if (/months/.test(id)) return `${value} мес.`;
  if (/rate/.test(id)) {
    return `${Number(value).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }
  return formatMoney(Number(value));
}

function updateCalculator(box: HTMLElement): void {
  const kind = box.dataset.calc;
  const get = (name: string) =>
    Number(box.querySelector<HTMLInputElement>(`[data-calc-field="${name}"]`)?.value ?? 0);

  box.querySelectorAll<HTMLInputElement>("[data-calc-field]").forEach((input) => {
    const label = box.querySelector<HTMLElement>(`[data-value-for="${input.id}"]`);
    if (label) label.textContent = formatFieldValue(input.id, input.value);
  });

  const set = (key: string, value: string) => {
    const output = box.querySelector<HTMLElement>(`[data-result="${key}"]`);
    if (output) output.textContent = value;
  };

  if (kind === "mortgage") {
    const price = get("price");
    const down = Math.min(get("down"), price * 0.8);
    const years = get("years");
    const principal = Math.max(0, price - down);
    const payment = annuity(principal, get("rate") / 100, years * 12);
    const total = payment * years * 12;
    set("payment", formatMoney(payment));
    set("principal", formatMoney(principal));
    set("total", formatMoney(total));
    set("overpayment", formatMoney(total - principal));

    const downInput = box.querySelector<HTMLInputElement>('[data-calc-field="down"]');
    if (downInput) {
      downInput.max = String(Math.min(15_000_000, Math.floor((price * 0.8) / 100_000) * 100_000));
      if (Number(downInput.value) > Number(downInput.max)) downInput.value = downInput.max;
    }
  } else if (kind === "loan") {
    const principal = get("amount");
    const years = get("years");
    const payment = annuity(principal, get("rate") / 100, years * 12);
    const total = payment * years * 12;
    set("payment", formatMoney(payment));
    set("principal", formatMoney(principal));
    set("total", formatMoney(total));
    set("overpayment", formatMoney(total - principal));
  } else if (kind === "deposit") {
    const amount = get("amount");
    const monthly = get("monthly");
    const months = get("months");
    const rate = (get("rate") || 14.5) / 100 / 12;
    let balance = amount;
    for (let month = 0; month < months; month += 1) {
      balance = balance * (1 + rate) + monthly;
    }
    const invested = amount + monthly * months;
    set("total", formatMoney(balance));
    set("invested", formatMoney(invested));
    set("interest", formatMoney(balance - invested));
  }
}

function renderMenu(menu: MenuGroup): string {
  const landing = menu.links[0]?.[1] ?? "/cards/debit";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const arrow = '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  return `<div><p class="eyebrow">Блиц Банк</p><h3>${escapeHtml(menu.title)}</h3><p>${escapeHtml(menu.copy)}</p><a class="text-link" href="${basePath}${landing}" data-route>Все продукты ${arrow}</a></div><div class="mega-links">${menu.links.map(([label, path]) => `<a href="${basePath}${path}" data-route>${escapeHtml(label)} ${arrow}</a>`).join("")}</div><div class="mega-feature"><div><span class="pill">Подборка</span><h3 style="margin-top:15px">${escapeHtml(menu.feature[0])}</h3><p>${escapeHtml(menu.feature[1])}</p></div><a class="text-link" href="${basePath}${menu.feature[2]}" data-route>Посмотреть ${arrow}</a></div>`;
}

export function LegacyPage({
  children,
  path,
  menuGroups,
}: LegacyPageProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const routerRef = useRef(router);
  const pathRef = useRef(path);
  const menusRef = useRef(menuGroups);

  routerRef.current = router;
  pathRef.current = path;
  menusRef.current = menuGroups;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let activeSearchTrigger: HTMLButtonElement | null = null;

    const setDrawerOpen = (open: boolean) => {
      const drawer = root.querySelector<HTMLElement>("#mobile-drawer");
      const toggle = root.querySelector<HTMLButtonElement>("[data-mobile-toggle]");
      if (!drawer) return;
      const wasOpen = drawer.classList.contains("open");
      drawer.classList.toggle("open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      toggle?.setAttribute("aria-expanded", String(open));
      if (open) drawer.querySelector<HTMLButtonElement>("[data-mobile-close]")?.focus();
      else if (wasOpen) toggle?.focus();
    };

    const showMega = (key: string, button: HTMLButtonElement) => {
      const panel = root.querySelector<HTMLElement>("#mega-menu");
      const menu = menusRef.current[key];
      if (!panel || !menu) return;
      if (panel.classList.contains("open") && panel.dataset.current === key) {
        closeMega();
        return;
      }
      closeMega();
      panel.dataset.current = key;
      panel.innerHTML = renderMenu(menu);
      panel.classList.add("open");
      button.setAttribute("aria-expanded", "true");
    };

    const closeMega = () => {
      root.querySelector<HTMLElement>("#mega-menu")?.classList.remove("open");
      root.querySelectorAll<HTMLButtonElement>(".site-header [data-mega]").forEach((item) => {
        item.setAttribute("aria-expanded", "false");
      });
    };

    const closeSearch = () => {
      const panel = root.querySelector<HTMLElement>("#site-search-panel");
      if (!panel) return;
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
      root.querySelectorAll<HTMLButtonElement>("[data-search-toggle]").forEach((button) => {
        button.setAttribute("aria-expanded", "false");
      });
      const input = panel.querySelector<HTMLInputElement>("#site-search-input");
      if (input) input.value = "";
      panel.querySelectorAll<HTMLAnchorElement>("[data-search-entry]").forEach((entry) => {
        entry.hidden = true;
      });
      const status = panel.querySelector<HTMLElement>("#search-status");
      if (status) status.textContent = "Введите название продукта или услуги";
      activeSearchTrigger = null;
    };

    const openSearch = (trigger: HTMLButtonElement) => {
      const panel = root.querySelector<HTMLElement>("#site-search-panel");
      if (!panel) return;
      if (panel.classList.contains("open")) {
        closeSearch();
        return;
      }
      closeMega();
      setDrawerOpen(false);
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      root.querySelectorAll<HTMLButtonElement>("[data-search-toggle]").forEach((button) => {
        button.setAttribute("aria-expanded", "true");
      });
      activeSearchTrigger = trigger;
      panel.querySelector<HTMLInputElement>("#site-search-input")?.focus();
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const searchPanel = root.querySelector<HTMLElement>("#site-search-panel");
      if (searchPanel?.classList.contains("open") && !target.closest("#site-search-panel") && !target.closest("[data-search-toggle]")) {
        closeSearch();
      }

      if (!target.closest(".mega-menu") && !target.closest("[data-mega]")) {
        closeMega();
      }

      const routeLink = target.closest<HTMLAnchorElement>("a[data-route]");
      if (routeLink) {
        const href = routeLink.getAttribute("href");
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const destination = basePath && href?.startsWith(`${basePath}/`) ? href.slice(basePath.length) : href;
        if (!destination?.startsWith("/")) return;
        event.preventDefault();
        closeMega();
        closeSearch();
        setDrawerOpen(false);
        if (destination === pathRef.current) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          routerRef.current.push(destination);
        }
        return;
      }

      const searchToggle = target.closest<HTMLButtonElement>("[data-search-toggle]");
      if (searchToggle) {
        openSearch(searchToggle);
        return;
      }
      if (target.closest("[data-search-close]")) {
        closeSearch();
        return;
      }

      const mega = target.closest<HTMLButtonElement>("[data-mega]");
      if (mega) {
        showMega(mega.dataset.mega ?? "", mega);
        return;
      }
      if (target.closest("[data-mobile-toggle]")) {
        setDrawerOpen(true);
        return;
      }
      if (target.closest("[data-mobile-close]")) {
        setDrawerOpen(false);
        return;
      }

      const drawerExpand = target.closest<HTMLButtonElement>("[data-drawer-expand]");
      if (drawerExpand) {
        drawerExpand.parentElement?.classList.toggle("open");
        return;
      }

      const faq = target.closest<HTMLButtonElement>(".faq-q");
      if (faq) {
        const item = faq.closest<HTMLElement>(".faq-item");
        const list = faq.closest<HTMLElement>(".faq-list");
        const wasOpen = item?.classList.contains("open") ?? false;
        list?.querySelectorAll<HTMLElement>(".faq-item.open").forEach((openItem) => {
          if (openItem === item) return;
          openItem.classList.remove("open");
          openItem.querySelector<HTMLButtonElement>(".faq-q")?.setAttribute("aria-expanded", "false");
          openItem.querySelector<HTMLElement>(".faq-a")?.setAttribute("aria-hidden", "true");
        });
        item?.classList.toggle("open", !wasOpen);
        faq.setAttribute("aria-expanded", String(!wasOpen));
        item?.querySelector<HTMLElement>(".faq-a")?.setAttribute("aria-hidden", String(wasOpen));
        return;
      }

      const action = target.closest<HTMLElement>("[data-action]");
      if (action) return;

      if (target.classList.contains("mega-wrap")) {
        root.querySelector("#mega-menu")?.classList.remove("open");
      }
    };

    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      const calcField = target.closest<HTMLElement>("[data-calc-field]");
      if (calcField) {
        const calculator = calcField.closest<HTMLElement>("[data-calc]");
        if (calculator) updateCalculator(calculator);
      }

      if (target.id === "acq-volume") {
        const value = Number(target.value);
        const formatted = new Intl.NumberFormat("ru-RU").format(value);
        const monthlyFee = new Intl.NumberFormat("ru-RU").format(Math.round(value * 0.013));
        const volumeOutput = root.querySelector<HTMLElement>("#acq-value");
        const feeOutput = root.querySelector<HTMLElement>("#acq-fee");
        if (volumeOutput) volumeOutput.textContent = `${formatted} ₽`;
        if (feeOutput) feeOutput.textContent = `${monthlyFee} ₽`;
      }

      if (target.id === "site-search-input") {
        const panel = root.querySelector<HTMLElement>("#site-search-panel");
        const status = root.querySelector<HTMLElement>("#search-status");
        const entries = Array.from(root.querySelectorAll<HTMLAnchorElement>("[data-search-entry]"));
        const query = target.value.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
        const tokens = query.split(/\s+/).filter(Boolean);
        const matches = query.length >= 2
          ? entries.filter((entry) => {
              const searchable = entry.dataset.searchText ?? "";
              return tokens.every((token) => searchable.includes(token));
            })
          : [];
        const titleScore = (entry: HTMLAnchorElement) => {
          const title = (entry.querySelector("strong")?.textContent ?? "").toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
          if (title === query) return 0;
          if (title.startsWith(query)) return 1;
          if (tokens.every((token) => title.includes(token))) return 2;
          return 3;
        };
        matches.sort((a, b) => titleScore(a) - titleScore(b) || Number(a.dataset.searchOrder) - Number(b.dataset.searchOrder));
        entries.forEach((entry) => { entry.hidden = true; });
        const results = root.querySelector<HTMLElement>("#search-results");
        matches.slice(0, 7).forEach((entry) => {
          entry.hidden = false;
          results?.append(entry);
        });

        if (panel) panel.dataset.hasResults = String(matches.length > 0);
        if (status) {
          status.textContent = query.length < 2
            ? query.length > 0 ? "Введите не менее двух символов" : "Введите название продукта или услуги"
            : matches.length > 0
              ? `Найдено: ${Math.min(matches.length, 7)}`
              : "Ничего не найдено. Попробуйте изменить запрос.";
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.id === "site-search-input") {
        const firstResult = root.querySelector<HTMLAnchorElement>("[data-search-entry]:not([hidden])");
        if (firstResult) {
          event.preventDefault();
          firstResult.click();
        }
        return;
      }
      if (event.key === "Escape") {
        closeMega();
        setDrawerOpen(false);
        if (root.querySelector<HTMLElement>("#site-search-panel")?.classList.contains("open")) {
          const trigger = activeSearchTrigger;
          closeSearch();
          trigger?.focus();
        }
      }
    };

    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("keydown", onKeyDown);

    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("input", onInput);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-calc]").forEach(updateCalculator);

    const acquisition = root.querySelector<HTMLInputElement>("#acq-volume");
    if (acquisition) {
      const value = Number(acquisition.value);
      const volumeOutput = root.querySelector<HTMLElement>("#acq-value");
      const feeOutput = root.querySelector<HTMLElement>("#acq-fee");
      if (volumeOutput) volumeOutput.textContent = `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
      if (feeOutput) feeOutput.textContent = `${new Intl.NumberFormat("ru-RU").format(Math.round(value * 0.013))} ₽`;
    }
  }, [children]);

  return (
    <div ref={rootRef} className="min-h-screen font-sans">
      <div id="site-content">{children}</div>
    </div>
  );
}
