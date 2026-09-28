declare module "lucide-react" {
  import { FC, SVGProps, Ref } from "react";

  export interface LucideIconProps extends SVGProps<SVGSVGElement> {
    size?: number;
    strokeWidth?: number;
    color?: string;
    absoluteStrokeWidth?: boolean;
    children?: React.ReactNode;
  }

  export type LucideIcon = FC<LucideIconProps> & {
    displayName: string;
  };

  // Core icons used in the codebase
  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const BarChart: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const CircuitBoard: LucideIcon;
  export const Circle: LucideIcon;
  export const Code: LucideIcon;
  export const Command: LucideIcon;
  export const Copy: LucideIcon;
  export const Cpu: LucideIcon;
  export const Database: LucideIcon;
  export const Download: LucideIcon;
  export const Eye: LucideIcon;
  export const FileCode2: LucideIcon;
  export const FileText: LucideIcon;
  export const Gauge: LucideIcon;
  export const Globe: LucideIcon;
  export const Hash: LucideIcon;
  export const Heart: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Home: LucideIcon;
  export const Image: LucideIcon;
  export const Info: LucideIcon;
  export const KeyRound: LucideIcon;
  export const Layers: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const Loader: LucideIcon;
  export const Loader2: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Maximize2: LucideIcon;
  export const Menu: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Minus: LucideIcon;
  export const MinusCircle: LucideIcon;
  export const Monitor: LucideIcon;
  export const Moon: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const MousePointer: LucideIcon;
  export const Move: LucideIcon;
  export const Navigation2: LucideIcon;
  export const Package: LucideIcon;
  export const Palette: LucideIcon;
  export const PenTool: LucideIcon;
  export const Phone: LucideIcon;
  export const Plus: LucideIcon;
  export const RefreshCcw: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Rocket: LucideIcon;
  export const Route: LucideIcon;
  export const Save: LucideIcon;
  export const Scale: LucideIcon;
  export const Search: LucideIcon;
  export const Settings: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const ShoppingCart: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Sun: LucideIcon;
  export const Target: LucideIcon;
  export const Terminal: LucideIcon;
  export const Trash2: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Trophy: LucideIcon;
  export const Type: LucideIcon;
  export const Upload: LucideIcon;
  export const User: LucideIcon;
  export const Users: LucideIcon;
  export const Wand2: LucideIcon;
  export const Wifi: LucideIcon;
  export const Workflow: LucideIcon;
  export const X: LucideIcon;
  export const XCircle: LucideIcon;
  export const Zap: LucideIcon;

  // LucideProvider for context
  export interface LucideProviderProps {
    children: React.ReactNode;
    size?: number;
    color?: string;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
    nonScalingStroke?: boolean;
    className?: string;
  }
  export const LucideProvider: FC<LucideProviderProps>;
}