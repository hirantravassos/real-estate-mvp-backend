import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { PropertyMedia } from "../entities/property-media.entity";

@Injectable()
export class PropertyMediaRepository extends Repository<PropertyMedia> {
  constructor(private readonly dataSource: DataSource) {
    super(PropertyMedia, dataSource.createEntityManager());
  }
}
