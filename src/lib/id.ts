import { v4 as uuidv4 } from 'uuid';

export function generateId(prefix?: string): string {
  const uuid = uuidv4().replace(/-/g, '');
  if (prefix) {
    return `${prefix}_${uuid}`;
  } else {
    return uuid;
  }
}
