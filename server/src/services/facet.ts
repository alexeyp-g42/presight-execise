import type { FacetRepository } from '../repositories/facet.js';
import type { FacetsResponse } from '@shared/types.js';

export interface FacetRequest {
  q: string;
  hobbies: string[];
  nationalities: string[];
}

export class FacetService {
  constructor(private readonly repo: FacetRepository) {}

  top(req: FacetRequest): FacetsResponse {
    return {
      hobbies: this.repo.topHobbies(req, 20),
      nationalities: this.repo.topNationalities(req, 20),
    };
  }
}
