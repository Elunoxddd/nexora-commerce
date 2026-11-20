const buckets = new Map();
let lastCleanup = 0;

export function isRateLimited(request, { namespace, limit, windowMs }) {
  const now = Date.now();
  if (now - lastCleanup > 60_000) {
    for (const [key, bucket] of buckets) if (now >= bucket.resetAt) buckets.delete(key);
    lastCleanup = now;
  }

  const realIp = request.headers.get("x-real-ip");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = (realIp || forwardedFor?.split(",").at(-1) || "unknown").trim().slice(0, 64);
  const key = `${namespace}:${ip}`;
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= 10_000 && !bucket) return true;
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > limit;
}
