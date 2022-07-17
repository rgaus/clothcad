import { Matrix3 } from 'three';

import type { Drawing } from '$lib/core';
import { radiansToDegrees } from '$lib/core';

// Given a svg, find the first element that matches the given css selector
export function findInSVG(selector: string, drawing?: Drawing | null): Element | null {
  if (!drawing) {
    return null;
  }
  if (selector.length === 0) {
    return null;
  }

  try {
    const result = drawing.media.document.querySelector(selector);
    return result || null;
  } catch (err) {
    return null;
  }
}

// Given a svg, find all elements that match the given css selector
export function findInSVGAll(selector: string, drawing?: Drawing | null): Array<Element> {
  if (!drawing) {
    return [];
  }

  if (selector.length === 0) {
    return [];
  }

  try {
    const result = drawing.media.document.querySelectorAll(selector);
    return Array.from(result);
  } catch (err) {
    return [];
  }
}

// Given a svg transform string, extract a matrix from it for positioning drawing geometries
export function parseSvgTransform(transformString: string): Matrix3 {
  const functionRegex = /^([a-zA-Z]+)\((.*?)\)/;

  let transformation = new Matrix3().identity();

  while (true) {
    const match = functionRegex.exec(transformString);
    if (!match) {
      break;
    }
    
    transformString = transformString.slice(match[0].length).trim();

    const functionName = match[1].toLowerCase(), functionArgs = match[2].split(/,\s/);

    const stringToNumber = (s: string | undefined, defaultNumber: number): number => {
      if (!s) {
        return defaultNumber;
      }
      const result = parseFloat(s);
      if (isNaN(result)) {
        return defaultNumber;
      }
      return result;
    };

    switch (functionName) {
      case 'transform':
        // translate(x)
        // translate(x, y)
        transformation.multiply(
          new Matrix3().translate(
            stringToNumber(functionArgs[0], 0),
            stringToNumber(functionArgs[1], 0),
          )
        );
        break;

      case 'scale':
        // scale(x)
        // scale(x, y)
        const scaleX = stringToNumber(functionArgs[0], 0);
        transformation.multiply(
          new Matrix3().scale(
            scaleX,
            stringToNumber(functionArgs[1], scaleX),
          )
        );
        break;

      case 'rotate':
        if (functionArgs.length === 1) {
          // rotate(a)
          transformation.multiply(
            new Matrix3().rotate(
              radiansToDegrees(stringToNumber(functionArgs[0], 0))
            )
          );
        } else {
          // rotate(a, cx, cy)
          // TODO: implement
        }
        break;

      case 'skewX':
      case 'skewY':
        // skewX(a)
        // skewY(a)
        // TODO: implement
        break;

      case 'matrix':
        // matrix(a, b, c, d, e, f)
        const a = stringToNumber(functionArgs[0], 1);
        const b = stringToNumber(functionArgs[1], 0);
        const c = stringToNumber(functionArgs[2], 0);
        const d = stringToNumber(functionArgs[3], 0);
        const e = stringToNumber(functionArgs[4], 1);
        const f = stringToNumber(functionArgs[5], 0);
        transformation.multiply(
          new Matrix3().fromArray([a, d, 0, b, e, 0, c, f, 1])
        );
        break;
    }
  }
  return transformation;
}
