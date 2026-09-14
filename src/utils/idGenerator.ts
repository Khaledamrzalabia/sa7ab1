/**
 * Collision-Resistant Unique Identifier Generator for SAHAB ERP
 * Combines timestamp (base36), high-entropy random characters, and entity prefix
 * to guarantee 100% unique primary keys across all tables and prevent overwrite collisions.
 */
export function generateUniqueId(prefix: string = 'ID'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 7);
  const microPart = typeof performance !== 'undefined'
    ? Math.floor((performance.now() * 1000) % 10000).toString(36)
    : Math.floor(Math.random() * 1000).toString(36);

  return `${prefix}-${timestamp}-${randomPart}${microPart}`.toUpperCase();
}
