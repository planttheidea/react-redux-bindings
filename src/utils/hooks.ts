import { useEffect, useLayoutEffect } from 'react';

const IS_CLIENT =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

const hasOwnProperty = Object.prototype.hasOwnProperty;

export const isSameValueZeroEqual: typeof Object.is =
  Object.is ||
  function is(a: any, b: any) {
    return a === b ? a !== 0 || 1 / a === 1 / b : a !== a && b !== b;
  };

export function isShallowEqual(a: any, b: any) {
  if (isSameValueZeroEqual(a, b)) {
    return true;
  }

  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  const aKeys = Object.keys(a);
  const length = aKeys.length;

  if (length !== Object.keys(b).length) {
    return false;
  }

  for (let index = 0; index < length; ++index) {
    const key = aKeys[index];

    if (!hasOwnProperty.call(b, key) || !isSameValueZeroEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

export const useIsomorphicLayoutEffect = IS_CLIENT
  ? useLayoutEffect
  : useEffect;
