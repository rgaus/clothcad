type ColorFamily = {
  light: string; // "3" variant
  dark: string; // "5" variant
  textColor: 'light' | 'dark';
};

export const Cyan4 = "#5cdbd3";

export const COLORS: { [colorFamilyName: string]: ColorFamily} = {
  red: { light: '#ffa39e', dark: '#ff4d4f', textColor: 'light' },
  green: { light: '#b7eb8f', dark: '#73d13d', textColor: 'light' },
  blue: { light: '#91d5ff', dark: '#40a9ff', textColor: 'light' },
  orange: { light: '#ffbb96', dark: '#ff7a45', textColor: 'light' },
  purple: { light: '#d3adf7', dark: '#9254de', textColor: 'light' },
  yellow: { light: '#fffb8f', dark: '#ffec3d', textColor: 'light' },
  magenta: { light: '#ffadd2', dark: '#f759ab', textColor: 'light' },
};

export function toRawHex(colorHex: string): number {
  return parseInt(colorHex.replace('#', '0x'), 16);
}

export function colorGeneratorFactory() {
  const colorFamilies = Object.keys(COLORS);
  let index = -1;
  return () => {
    index += 1;
    if (index > colorFamilies.length-1) {
      index = 0;
    }
    return colorFamilies[index];
  };
}
