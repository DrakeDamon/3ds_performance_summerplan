"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

export interface NavItem {
  label: string;
  href?: string;
  onSelect?: () => void;
}

/* Sliding-cursor pill nav (21st.dev), re-themed to 3DS: a translucent
   carbon glass pill with a bone "spotlight" cursor. mix-blend-difference
   keeps each label readable as the cursor passes over it, with no need to
   track an active tab. */
export function NavHeader({ items }: { items: NavItem[] }) {
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 });

  return (
    <ul
      className="relative flex w-fit rounded-full border border-border bg-card/70 p-1 backdrop-blur-md"
      onMouseLeave={() => setPosition((pv) => ({ ...pv, opacity: 0 }))}
    >
      {items.map((item) => (
        <Tab key={item.label} item={item} setPosition={setPosition} />
      ))}
      <Cursor position={position} />
    </ul>
  );
}

const Tab = ({
  item,
  setPosition,
}: {
  item: NavItem;
  setPosition: (p: { left: number; width: number; opacity: number }) => void;
}) => {
  const ref = useRef<HTMLLIElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (item.onSelect) {
      e.preventDefault();
      item.onSelect();
    }
  };

  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref.current) return;
        const { width } = ref.current.getBoundingClientRect();
        setPosition({ width, opacity: 1, left: ref.current.offsetLeft });
      }}
      className="relative z-10 block"
    >
      <a
        href={item.href ?? "#"}
        onClick={handleClick}
        className="block cursor-pointer px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground mix-blend-difference md:px-5 md:py-2.5 md:text-sm"
      >
        {item.label}
      </a>
    </li>
  );
};

const Cursor = ({
  position,
}: {
  position: { left: number; width: number; opacity: number };
}) => {
  return (
    <motion.li
      animate={position}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="absolute z-0 h-7 rounded-full bg-foreground md:h-10"
    />
  );
};

export default NavHeader;
