import { config } from "@fortawesome/fontawesome-svg-core";
import * as FaSolid from "@fortawesome/free-solid-svg-icons";
import * as FaRegular from "@fortawesome/free-regular-svg-icons";
import * as FaBrands from "@fortawesome/free-brands-svg-icons";
import {
  FontAwesomeIcon,
  type FontAwesomeIconProps,
} from "@fortawesome/react-fontawesome";

config.autoAddCss = false;

const iconMap = {
  add: FaSolid.faPlus,
  "align-left": FaSolid.faAlignLeft,
  "align-right": FaSolid.faAlignRight,
  "arrow-down": FaSolid.faArrowDown,
  "arrow-left": FaSolid.faArrowLeft,
  "arrow-right": FaSolid.faArrowRight,
  "arrow-rotate-left": FaSolid.faArrowRotateLeft,
  "arrows-rotate": FaSolid.faArrowsRotate,
  "arrow-up": FaSolid.faArrowUp,
  "backward-step": FaSolid.faBackwardStep,
  bars: FaSolid.faBars,
  bold: FaSolid.faBold,
  "book-open": FaSolid.faBookOpen,
  "caret-down": FaSolid.faCaretDown,
  "caret-up": FaSolid.faCaretUp,
  check: FaSolid.faCheck,
  "check-circle": FaSolid.faCheckCircle,
  "clipboard-check": FaSolid.faClipboardCheck,
  "chevron-down": FaSolid.faChevronDown,
  "chevron-up": FaSolid.faChevronUp,
  "chart-line": FaSolid.faChartLine,
  circle: FaSolid.faCircle,
  "circle-hollow": FaRegular.faCircle,
  "circle-play": FaSolid.faCirclePlay,
  close: FaSolid.faXmark,
  database: FaSolid.faDatabase,
  download: FaSolid.faDownload,
  ellipsis: FaSolid.faEllipsis,
  envelope: FaSolid.faEnvelope,
  "exclamation-circle": FaSolid.faCircleExclamation,
  "exclamation-triangle": FaSolid.faTriangleExclamation,
  "external-link": FaSolid.faUpRightFromSquare,
  hourglass: FaSolid.faHourglass,
  maximize: FaSolid.faMaximize,
  feather: FaSolid.faFeather,
  "file-arrow-down": FaSolid.faFileArrowDown,
  "file-import": FaSolid.faFileImport,
  "forward-step": FaSolid.faForwardStep,
  gear: FaSolid.faGear,
  github: FaBrands.faGithub,
  google: FaBrands.faGoogle,
  indent: FaSolid.faIndent,
  italic: FaSolid.faItalic,
  language: FaSolid.faLanguage,
  link: FaSolid.faLink,
  "list-ol": FaSolid.faListOl,
  "list-ul": FaSolid.faListUl,
  outdent: FaSolid.faOutdent,
  pause: FaSolid.faPause,
  play: FaSolid.faPlay,
  plus: FaSolid.faPlus,
  "question-circle": FaSolid.faCircleQuestion,
  "right-from-bracket": FaSolid.faRightFromBracket,
  robot: FaSolid.faRobot,
  save: FaSolid.faFloppyDisk,
  "share-from-square": FaSolid.faShareFromSquare,
  sliders: FaSolid.faSliders,
  "sticky-note": FaSolid.faNoteSticky,
  strikethrough: FaSolid.faStrikethrough,
  trash: FaSolid.faTrash,
  "triangle-exclamation": FaSolid.faTriangleExclamation,
  unlink: FaSolid.faLinkSlash,
  user: FaSolid.faUser,
  xmark: FaSolid.faXmark,
} as const;
const fallbackIcon = FaSolid.faCircleQuestion;

type IconType = keyof typeof iconMap;

type IconProps = Omit<FontAwesomeIconProps, "icon"> & { icon: IconType };

export function Icon({ icon, ...props }: IconProps) {
  return <FontAwesomeIcon {...props} icon={iconMap[icon] ?? fallbackIcon} />;
}
