import type { Vec3 } from 'vec3'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function distance3D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function distance2D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function normalizeAngle(angle: number): number {
  let result = angle % (Math.PI * 2)
  if (result > Math.PI) result -= Math.PI * 2
  if (result < -Math.PI) result += Math.PI * 2
  return result
}

export function shortestAngleDelta(from: number, to: number): number {
  return normalizeAngle(to - from)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
