import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Z" />
      <path d="M12 15a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3Z" />
      <path d="m15.5 10.9.9-2.2" />
      <path d="m8.5 10.9-.9-2.2" />
      <path d="M12 6.5V5" />
    </svg>
  );
}
