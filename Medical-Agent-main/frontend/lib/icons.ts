import type { ForwardRefExoticComponent, RefAttributes } from "react"

import type { LucideProps } from "lucide-react"
import { Database, Fingerprint, Network } from "lucide-react"

export type IconComponent = ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>

export const iconLibrary = {
  database: Database,
  fingerprint: Fingerprint,
  network: Network,
} satisfies Record<string, IconComponent>

export type IconKey = keyof typeof iconLibrary
