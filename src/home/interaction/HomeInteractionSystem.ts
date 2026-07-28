import type { HomeInteractionCandidate, HomeVector } from '../HomeTypes';
import { SpatialGrid } from '../world/SpatialGrid';

interface IndexedInteraction extends HomeInteractionCandidate {
  width: number;
  height: number;
}

export interface ScoredInteraction {
  candidate: HomeInteractionCandidate;
  distance: number;
  facing: number;
  score: number;
}

export class HomeInteractionSystem {
  private readonly grid = new SpatialGrid<IndexedInteraction>(240);

  constructor(candidates: readonly HomeInteractionCandidate[]) {
    this.grid.rebuild(candidates.map((candidate) => ({
      ...candidate,
      width: candidate.radius * 2,
      height: candidate.radius * 2,
    })));
  }

  select(position: HomeVector, facing: HomeVector): ScoredInteraction | undefined {
    const candidates = this.grid.queryCircle(position.x, position.y, 180);
    return candidates
      .map((candidate) => {
        const dx = candidate.x - position.x;
        const dy = candidate.y - position.y;
        const distance = Math.hypot(dx, dy);
        const direction = distance > 0 ? { x: dx / distance, y: dy / distance } : facing;
        const facingScore = direction.x * facing.x + direction.y * facing.y;
        const score = candidate.priority * 100 + Math.max(-1, facingScore) * 36 - distance * .72;
        return { candidate, distance, facing: facingScore, score };
      })
      .filter((entry) => entry.distance <= entry.candidate.radius)
      .sort((a, b) => b.score - a.score)[0];
  }
}
