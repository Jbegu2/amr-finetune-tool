"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors, spacing, JBBLogo } from "../lib/theme";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.xl,
        padding: `${spacing.lg}px ${spacing["2xl"]}px`,
        background: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Link href="/" aria-label="JB Tools Home">
        <JBBLogo width={80} height={28} />
      </Link>

      <nav
        style={{
          display: "flex",
          gap: spacing.xl,
          marginLeft: spacing.lg,
        }}
        aria-label="Main navigation"
      >
        {navLinks.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? colors.primary : colors.textSecondary,
                textDecoration: "none",
                padding: `${spacing.sm}px ${spacing.md}px`,
                borderRadius: 6,
                transition: "color 0.15s, background-color 0.15s",
                background: isActive ? "rgba(255, 0, 0, 0.05)" : "transparent",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <span
        style={{
          fontSize: 12,
          color: colors.textMuted,
        }}
      >
        JBB Tool Portal
      </span>
    </header>
  );
}
