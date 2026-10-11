import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Property } from "../../properties/entities/property.entity";
import { factsFromProperty } from "../helpers/match-facts.helper";
import { MatchScore, scoreMatch } from "../helpers/match-score.helper";
import { HuntCriteria } from "../types/hunt-criteria.type";

/** Catalog properties scored for the hunt, read from the newest ones. */
const CATALOG_LIMIT = 1000;
const MINIMUM_CATALOG_SCORE = 55;
const MAXIMUM_CATALOG_MATCHES = 20;

/** Looks for the hunt in the broker's own catalog first, free of charge. */
@Injectable()
export class CatalogMatcherService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async findMatches(
    userId: string,
    criteria: HuntCriteria,
  ): Promise<{ property: Property; match: MatchScore }[]> {
    const properties = await this.propertyRepository.find({
      where: { userId, active: true },
      order: { updatedAt: "DESC" },
      take: CATALOG_LIMIT,
    });

    return properties
      .map((property) => ({
        property,
        match: scoreMatch(factsFromProperty(property), criteria),
      }))
      .filter(({ match }) => match.score >= MINIMUM_CATALOG_SCORE)
      .sort((first, second) => second.match.score - first.match.score)
      .slice(0, MAXIMUM_CATALOG_MATCHES);
  }
}
