import type { HomeWorldBounds } from '../HomeTypes';

export interface SpatialGridItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function aabbIntersects(a: HomeWorldBounds, b: HomeWorldBounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function circleIntersectsAabb(
  circle: { x: number; y: number; radius: number },
  box: HomeWorldBounds,
): boolean {
  const closestX = Math.max(box.x, Math.min(circle.x, box.x + box.width));
  const closestY = Math.max(box.y, Math.min(circle.y, box.y + box.height));
  return Math.hypot(circle.x - closestX, circle.y - closestY) <= circle.radius;
}

export class SpatialGrid<T extends SpatialGridItem> {
  private readonly cells = new Map<string, T[]>();

  constructor(readonly cellSize = 220) {}

  rebuild(items: readonly T[]): void {
    this.cells.clear();
    items.forEach((item) => this.insert(item));
  }

  insert(item: T): void {
    const minX = Math.floor((item.x - item.width / 2) / this.cellSize);
    const maxX = Math.floor((item.x + item.width / 2) / this.cellSize);
    const minY = Math.floor((item.y - item.height / 2) / this.cellSize);
    const maxY = Math.floor((item.y + item.height / 2) / this.cellSize);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const key = `${x}:${y}`;
        const entries = this.cells.get(key) ?? [];
        entries.push(item);
        this.cells.set(key, entries);
      }
    }
  }

  queryCircle(x: number, y: number, radius: number): T[] {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    const result = new Map<string, T>();
    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      for (let cellY = minY; cellY <= maxY; cellY += 1) {
        (this.cells.get(`${cellX}:${cellY}`) ?? []).forEach((item) => result.set(item.id, item));
      }
    }
    return [...result.values()].filter((item) => circleIntersectsAabb(
      { x, y, radius },
      { x: item.x - item.width / 2, y: item.y - item.height / 2, width: item.width, height: item.height },
    ));
  }

  occupiedCells(): readonly string[] {
    return [...this.cells.keys()];
  }
}
