export const JOBS = [
  { id: 1, name: "剣士", hp: 95, power: 90, magic: 50, dex: 80, end: 70, spi: 65 },
  { id: 2, name: "弓使い", hp: 85, power: 95, magic: 50, dex: 95, end: 60, spi: 65 },
  { id: 3, name: "魔法使い", hp: 85, power: 50, magic: 95, dex: 90, end: 55, spi: 75 },
  { id: 4, name: "魔闘士", hp: 95, power: 50, magic: 90, dex: 80, end: 65, spi: 70 },
];

export const STATS = [
  { key: "hp", label: "生命力", cap: "hp" },
  { key: "power", label: "パワー", cap: "power" },
  { key: "magic", label: "魔力", cap: "magic" },
  { key: "dex", label: "器用さ", cap: "dex" },
  { key: "endurance", label: "耐久力", cap: "end" },
  { key: "spirit", label: "精神力", cap: "spi" },
];

export const DATA_COLS = [
  { key: "satei_delta", label: "査定", color: "#b8860b", bg: "#fdf8e8" },
  { key: "exp_kinryoku", label: "筋力", color: "#c0392b", bg: "#fdecea" },
  { key: "exp_binsoku", label: "敏捷", color: "#2471a3", bg: "#eaf2f8" },
  { key: "exp_gijutsu", label: "技術", color: "#d4880f", bg: "#fef5e7" },
  { key: "exp_chiryoku", label: "知力", color: "#7d3c98", bg: "#f4ecf7" },
  { key: "exp_seishin", label: "精神", color: "#1e8449", bg: "#e8f8f0" },
];

export const SKILL_COLS = [
  { key: "satei", label: "査定", color: "#b8860b", bg: "#fdf8e8" },
  { key: "exp_kinryoku", label: "筋力", color: "#c0392b", bg: "#fdecea" },
  { key: "exp_binsoku", label: "敏捷", color: "#2471a3", bg: "#eaf2f8" },
  { key: "exp_gijutsu", label: "技術", color: "#d4880f", bg: "#fef5e7" },
  { key: "exp_chiryoku", label: "知力", color: "#7d3c98", bg: "#f4ecf7" },
  { key: "exp_seishin", label: "精神", color: "#1e8449", bg: "#e8f8f0" },
];

export const EL = { "火": "#c0392b", "風": "#1e8449", "水": "#2471a3" };
export const JC = { "剣士": "#c0392b", "弓使い": "#d4880f", "魔法使い": "#7d3c98", "魔闘士": "#1e8449" };
