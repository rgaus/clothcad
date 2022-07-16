type ColorFamily = {
  light: string; // "3" variant
  dark: string; // "5" variant
  textColor: 'light' | 'dark';
};

export const Red1 = '#fff1f0';
export const Red2 = '#ffccc7';
export const Red3 = '#ffa39e';
export const Red4 = '#ff7875';
export const Red5 = '#ff4d4f';
export const Red6 = '#f5222d';
export const Red7 = '#cf1322';
export const Red8 = '#a8071a';
export const Red9 = '#820014';
export const Red10 = '#5c0011';

export const Cyan1 = '#e6fffb';
export const Cyan2 = '#b5f5ec';
export const Cyan3 = '#87e8de';
export const Cyan4 = '#5cdbd3';
export const Cyan5 = '#36cfc9';
export const Cyan6 = '#13c2c2';
export const Cyan7 = '#08979c';
export const Cyan8 = '#006d75';
export const Cyan9 = '#00474f';
export const Cyan10 = '#002329';

export const Gray1 = '#fafafa';
export const Gray2 = '#f5f5f5';
export const Gray3 = '#f0f0f0';
export const Gray4 = '#d9d9d9';
export const Gray5 = '#bfbfbf';
export const Gray6 = '#8c8c8c';
export const Gray7 = '#595959';
export const Gray8 = '#434343';
export const Gray9 = '#262626';
export const Gray10 = '#1f1f1f';
export const Gray11 = '#141414';

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
