import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from './schemas/application.schema';

const APPLICATION_CATALOGUE = [
  { key: 'relay', name: 'Relay', description: 'Secure connections and automation across external services.', launchUrl: 'http://localhost:3000', ownership: 'first_party', status: 'active', displayOrder: 1 },
  { key: 'business', name: 'Business', description: 'Business operations, invoicing and administration.', launchUrl: 'http://localhost:3003', ownership: 'first_party', status: 'active', displayOrder: 2 },
  { key: 'jtrade', name: 'JTrade', description: 'Trading, investment and market operations.', launchUrl: 'http://localhost:5173', ownership: 'first_party', status: 'active', displayOrder: 3 },
] as const;

@Injectable()
export class ApplicationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ApplicationsService.name);
  constructor(@InjectModel(Application.name) private readonly applications: Model<ApplicationDocument>) {}

  async onApplicationBootstrap() {
    await Promise.all(APPLICATION_CATALOGUE.map((app) => this.applications.findOneAndUpdate(
      { key: app.key },
      { $set: app },
      { upsert: true, returnDocument: 'after' },
    )));
    this.logger.log(`Application catalogue ready (${APPLICATION_CATALOGUE.length} applications).`);
  }

  listAll() {
    return this.applications.find().sort({ displayOrder: 1, name: 1 }).lean();
  }

  findByKey(key: string) {
    return this.applications.findOne({ key: key.toLowerCase(), status: 'active' }).lean();
  }
}
