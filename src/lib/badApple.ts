/* eslint-disable @typescript-eslint/no-explicit-any */
// Easter-egg trigger glue. Backing a certain bounty launches the Bad Apple
// takeover. Two layered keys (per the design): a seeded "render bad apple in
// shadows" bounty carrying easter_egg === 'bad-apple', and the magic backing
// amount $3.39 (the song's 3:39 runtime) on ANY bounty — a self-documenting
// cipher for lore hunters.
//
// SAFETY: this runs ONLY after a backing has already succeeded (downstream of
// the money). It is wrapped in try/catch, deferred to requestAnimationFrame,
// and lazy-imports the heavy overlay — so it can never touch, block, or break
// the backing/payment path, even if the overlay code throws or fails to load.

export function isBadAppleBacking(bounty: any, amount: number): boolean {
  return bounty?.easter_egg === 'bad-apple' || Math.round(amount * 100) === 339;
}

export function maybeFireBadApple(bounty: any, amount: number, res?: any): void {
  try {
    if (!isBadAppleBacking(bounty, amount)) return;
    const id = res?.id ?? res?.backing?.id ?? res?.payment_intent_id;
    const key = id != null ? 'ba_' + id : undefined;
    requestAnimationFrame(() => {
      import('@/components/BadAppleTakeover')
        .then((m) => m.openBadAppleTakeover(key))
        .catch(() => { /* easter egg must never surface in the backing path */ });
    });
  } catch { /* swallow — the egg is never worth a backing-flow error */ }
}
