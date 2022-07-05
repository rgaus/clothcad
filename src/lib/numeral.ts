export type Numeral = LiteralNumeral | FractionNumeral;
export const Numeral = {
  parseFromString(rawString: string): Numeral | null {
    return (
      FractionNumeral.parseFromString(rawString) ||
      LiteralNumeral.parseFromString(rawString) ||
      null
    );
  },
  serializeToString(numeral: Numeral): string | null {
    switch (numeral.type) {
      case 'literal':
        return `${numeral.value}`;
      case 'fraction':
        if (numeral.whole !== 0) {
          return `${numeral.whole} ${numeral.numerator}/${numeral.denominator}`;
        } else {
          return `${numeral.numerator}/${numeral.denominator}`;
        }
      default:
        return null;
    }
  },
  toNumber(numeral: Numeral): number {
    switch (numeral.type) {
      case 'literal':
        return numeral.value;
      case 'fraction':
        return numeral.whole + (numeral.numerator / numeral.denominator);
      default:
        return NaN;
    }
  },
};

export type LiteralNumeral = {
  type: 'literal';
  value: number;
};
export const LiteralNumeral = {
  create(value: number): LiteralNumeral {
    return { type: 'literal', value };
  },
  parseFromString(rawString: string): LiteralNumeral | null {
    const literal = parseFloat(rawString);
    if (isNaN(literal)) {
      return null;
    }
    return LiteralNumeral.create(literal);
  },
  toFraction(literal: LiteralNumeral) {
    return FractionNumeral.create(literal.value, 1);
  },
};

export type FractionNumeral = {
  type: 'fraction';
  numerator: number;
  denominator: number;
  whole: number;
};
export const FractionNumeral = {
  create(numerator: number, denominator: number, whole: number = 0): FractionNumeral {
    return { type: 'fraction', numerator, denominator, whole };
  },
  parseFromString(rawString: string): FractionNumeral | null {
    // TODO: add in parsing a whole number before the fraction!
    const parts = rawString.split('/');
    if (parts.length !== 2) {
      return null;
    }
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    if (isNaN(numerator) || isNaN(denominator)) {
      return null;
    }
    return FractionNumeral.create(numerator, denominator);
  },
  toLiteral(fraction: FractionNumeral) {
    return LiteralNumeral.create(fraction.whole + (fraction.numerator / fraction.denominator));
  },
  simplify(fraction: FractionNumeral) {
    // Find the GCD using euclid's algorithm
    let a = fraction.numerator;
    let b = fraction.denominator;
    while (b > 0) {
      [a, b] = [b, a % b];
      if (a === b) {
        return fraction;
      }
    }

    return FractionNumeral.create(
      fraction.numerator / a,
      fraction.denominator / a,
      fraction.whole,
    );
  },
};
