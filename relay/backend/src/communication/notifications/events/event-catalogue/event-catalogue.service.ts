import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  EventCatalogue,
  EventCatalogueDocument,
} from './schemas/event-catalogue.schema';
import { CreateEventCatalogueDto } from './dto/create-event-catalogue.dto';
import { UpdateEventCatalogueDto } from './dto/update-event-catalogue.dto';
import { BulkCreateEventCatalogueDto } from './dto/bulk-create-event-catalogue.dto';
import { EventCatalogueMapper } from './mappers/event-catalogue.mapper';
import { EventCatalogueResponseDto } from './dto/event-catalogue-response.dto';
import type { PaginatedResponse } from '../../../common/pagination/pagination.util';

import {
  DomainCatalogue,
  DomainCatalogueDocument,
} from '../domain-catalogue/schemas/domain-catalogue.schema';

type PopulateOpts = {
  populateDomainCatalogue?: boolean;
  populateChannelsRuntime?: boolean;
};

@Injectable()
export class EventCatalogueService {
  private readonly logger = new Logger(EventCatalogueService.name);

  constructor(
    @InjectModel(EventCatalogue.name)
    private readonly model: Model<EventCatalogueDocument>,
    @InjectModel(DomainCatalogue.name)
    private readonly domainModel: Model<DomainCatalogueDocument>,
  ) {}

  // ==========================
  // Helpers
  // ==========================

  async findByCompanyAndCanonicalKey(
    companyId: string,
    canonicalEventKey: string,
    populateChannelsRuntime = false,
  ): Promise<EventCatalogueResponseDto> {
    const normalized = this.normalizeKey(canonicalEventKey);
    const dotIdx = normalized.indexOf('.');

    if (dotIdx === -1 || dotIdx === 0 || dotIdx === normalized.length - 1) {
      throw new HttpException(
        'canonicalEventKey must be in the format "domainKey.eventKey"',
        HttpStatus.BAD_REQUEST,
      );
    }

    const domainKey = normalized.slice(0, dotIdx);
    const eventKey = normalized.slice(dotIdx + 1);
    const companyObjId = this.toObjectIdOrThrow(companyId, 'companyId');

    // ── DIAG: domain query ────────────────────────────────────────────────────
    this.logger.log(
      `[DIAG:findByCompanyAndCanonicalKey] ── Step 1: domain lookup ──\n` +
        `  collection: domain_catalogues\n` +
        `  filter:     { companyId: "${companyId}", domainKey: "${domainKey}" }\n` +
        `  select:     _id domainKey isActive`,
    );

    const domain = await this.domainModel
      .findOne({ companyId: companyObjId, domainKey })
      .select('_id domainKey isActive')
      .lean();

    this.logger.log(
      `[DIAG:findByCompanyAndCanonicalKey] domain result: ${
        domain
          ? `FOUND — domainId=${String((domain as any)._id)} isActive=${(domain as any).isActive}`
          : 'NOT FOUND'
      }`,
    );

    if (!domain) {
      throw new HttpException(
        `Domain "${domainKey}" not found for this company`,
        HttpStatus.NOT_FOUND,
      );
    }
    if ((domain as any).isActive === false) {
      this.logger.warn(
        `[findByCompanyAndCanonicalKey] domain "${domainKey}" is inactive — proceeding with event lookup (EventCatalogue is the delivery source of truth)`,
      );
    }

    // ── DIAG: event query ─────────────────────────────────────────────────────
    this.logger.log(
      `[DIAG:findByCompanyAndCanonicalKey] ── Step 2: event lookup + populate ──\n` +
        `  collection: event_catalogues\n` +
        `  filter:     { domainCatalogueId: "${String((domain as any)._id)}", eventKey: "${eventKey}", isActive: true }\n` +
        `  populate:   domainCatalogueId → { companyId domainKey displayName domainCategory isActive channelsToUse }`,
    );

    let q = this.model.findOne({
      domainCatalogueId: (domain as any)._id,
      eventKey,
      isActive: true,
    });

    q = this.applyPopulate(q, {
      populateDomainCatalogue: true,
      populateChannelsRuntime,
    });

    const doc: any = await q.lean();

    // ── DIAG: raw domain.channelsToUse from DB ────────────────────────────────
    const populatedDomain = doc?.domainCatalogueId;
    this.logger.log(
      `[DIAG:findByCompanyAndCanonicalKey] event result: ${doc ? `FOUND — eventId=${String(doc._id)}` : 'NOT FOUND'}\n` +
        `  populated domain.domainKey:     ${populatedDomain?.domainKey ?? '(not populated)'}\n` +
        `  populated domain.isActive:      ${populatedDomain?.isActive ?? '(not populated)'}\n` +
        `  populated domain.channelsToUse: ${
          Array.isArray(populatedDomain?.channelsToUse)
            ? populatedDomain.channelsToUse.length === 0
              ? '[] ← EMPTY — no channel assigned to this domain'
              : JSON.stringify(populatedDomain.channelsToUse)
            : '(missing)'
        }\n` +
        (Array.isArray(populatedDomain?.channelsToUse) &&
        populatedDomain.channelsToUse.length === 0
          ? `  ─── DIAGNOSIS ────────────────────────────────────────────────────\n` +
            `  DomainCatalogue "${domainKey}" exists but has channelsToUse=[].\n` +
            `  Expected: [{ channel: "email", providerCredentialsId: <ObjectId> }]\n` +
            `  Fix: Communications UI → Domains → ${domainKey} → assign a provider credential.`
          : ''),
    );

    if (!doc) {
      throw new HttpException(
        `Event "${eventKey}" not found in domain "${domainKey}"`,
        HttpStatus.NOT_FOUND,
      );
    }

    return EventCatalogueMapper.toResponse(doc);
  }

  async findByCompanyAndEventKey(params: {
    companyId: string;
    eventKey: string;
    populateChannelsRuntime?: boolean;
  }): Promise<EventCatalogueResponseDto> {
    const companyId = this.toObjectIdOrThrow(params.companyId, 'companyId');
    const eventKey = this.normalizeKey(params.eventKey);

    if (!eventKey)
      throw new HttpException('eventKey is required', HttpStatus.BAD_REQUEST);

    // Scope the query to domains owned by this company so that events with the
    // same eventKey across different tenants never interfere with each other.
    const companyDomains = await this.domainModel
      .find({ companyId })
      .select('_id')
      .lean();
    const domainIds = companyDomains.map((d: any) => d._id);

    let q = this.model.findOne({
      eventKey,
      isActive: true,
      domainCatalogueId: { $in: domainIds },
    });

    q = this.applyPopulate(q, {
      populateDomainCatalogue: true,
      populateChannelsRuntime: params.populateChannelsRuntime ?? true,
    });

    const doc: any = await q.lean();
    if (!doc) throw new HttpException('Event not found', HttpStatus.NOT_FOUND);

    this.assertEventBelongsToCompanyOrThrow(doc, companyId);

    return EventCatalogueMapper.toResponse(doc);
  }

  async create(
    dto: CreateEventCatalogueDto,
  ): Promise<EventCatalogueResponseDto> {
    const domainCatalogueId = this.toObjectIdOrThrow(
      dto.domainCatalogueId,
      'domainCatalogueId',
    );
    await this.getDomainOrThrow(domainCatalogueId);

    const eventKey = this.normalizeKey(dto.eventKey);
    const displayName = String(dto.displayName ?? '').trim();

    if (!eventKey)
      throw new HttpException('eventKey is required', HttpStatus.BAD_REQUEST);
    if (!displayName)
      throw new HttpException(
        'displayName is required',
        HttpStatus.BAD_REQUEST,
      );

    const channelContent = dto.channelContent ?? {};

    try {
      const created = await this.model.create({
        domainCatalogueId,
        eventKey,
        displayName,
        app: this.normalizeKey(dto.app ?? ''),
        description: String(dto.description ?? ''),
        eventType: dto.eventType,
        channelContent,
        isActive: dto.isActive ?? true,
        scope: (dto as any).scope ?? 'company',
        senderScope: (dto as any).senderScope ?? 'company',
      });

      return EventCatalogueMapper.toResponse(created.toObject());
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'Event already exists in this domainCatalogue (domainCatalogueId + eventKey)',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to create event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async bulkUpsert(
    dto: BulkCreateEventCatalogueDto,
  ): Promise<EventCatalogueResponseDto[]> {
    const domainCatalogueId = this.toObjectIdOrThrow(
      dto.domainCatalogueId,
      'domainCatalogueId',
    );
    await this.getDomainOrThrow(domainCatalogueId);

    const items = dto.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpException(
        'items must be a non-empty array',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalized = items.map((it: any, idx: number) => {
      const eventKey = this.normalizeKey(it.eventKey);
      const displayName = String(it.displayName ?? '').trim();

      if (!eventKey)
        throw new HttpException(
          `items[${idx}].eventKey is required`,
          HttpStatus.BAD_REQUEST,
        );
      if (!displayName)
        throw new HttpException(
          `items[${idx}].displayName is required`,
          HttpStatus.BAD_REQUEST,
        );

      const channelContent = it.channelContent ?? {};

      return {
        domainCatalogueId,
        eventKey,
        displayName,
        app: this.normalizeKey(it.app ?? ''),
        description: String(it.description ?? ''),
        eventType: it.eventType,
        channelContent,
        isActive: it.isActive ?? true,
      };
    });

    const seen = new Set<string>();
    for (const it of normalized) {
      const k = `${String(it.domainCatalogueId)}::${it.eventKey}`;
      if (seen.has(k))
        throw new HttpException(
          `Duplicate eventKey inside request: "${it.eventKey}"`,
          HttpStatus.BAD_REQUEST,
        );
      seen.add(k);
    }

    await this.model.bulkWrite(
      normalized.map((it) => ({
        updateOne: {
          filter: {
            domainCatalogueId: it.domainCatalogueId,
            eventKey: it.eventKey,
          },
          update: { $set: it },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    const list = await this.model
      .find({
        domainCatalogueId,
        eventKey: { $in: normalized.map((x) => x.eventKey) },
      })
      .sort({ eventKey: 1 })
      .lean();

    return EventCatalogueMapper.toResponseList(list as any[]);
  }

  async findAll(params: {
    domainCatalogueId: string;
    active?: boolean;
    populateDomainCatalogue?: boolean;
    populateChannelsRuntime?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<EventCatalogueResponseDto>> {
    const domainCatalogueId = this.toObjectIdOrThrow(
      params.domainCatalogueId,
      'domainCatalogueId',
    );

    const filter: any = { domainCatalogueId };
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    let q = this.model.find(filter).sort({ eventKey: 1 });

    q = this.applyPopulate(q, {
      populateDomainCatalogue: params.populateDomainCatalogue ?? true,
      populateChannelsRuntime: params.populateChannelsRuntime ?? false,
    });

    const [list, total] = await Promise.all([
      q.skip(offset).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data: EventCatalogueMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async getById(params: {
    id: string;
    populateDomainCatalogue?: boolean;
    populateChannelsRuntime?: boolean;
  }): Promise<EventCatalogueResponseDto> {
    const _id = this.toObjectIdOrThrow(params.id, 'id');

    let q = this.model.findById(_id);

    q = this.applyPopulate(q, {
      populateDomainCatalogue: params.populateDomainCatalogue ?? true,
      populateChannelsRuntime: params.populateChannelsRuntime ?? false,
    });

    const doc: any = await q.lean();
    if (!doc) throw new HttpException('Event not found', HttpStatus.NOT_FOUND);

    return EventCatalogueMapper.toResponse(doc);
  }

  async update(
    id: string,
    dto: UpdateEventCatalogueDto,
  ): Promise<EventCatalogueResponseDto> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const existing: any = await this.model.findById(_id).lean();
    if (!existing)
      throw new HttpException('Event not found', HttpStatus.NOT_FOUND);

    const domainCatalogueId = existing.domainCatalogueId as Types.ObjectId;
    await this.getDomainOrThrow(domainCatalogueId);

    const $set: any = {};

    if (dto.eventKey !== undefined) {
      const eventKey = this.normalizeKey(dto.eventKey);
      if (!eventKey)
        throw new HttpException('eventKey is required', HttpStatus.BAD_REQUEST);
      $set.eventKey = eventKey;
    }

    if (dto.displayName !== undefined) {
      const displayName = String(dto.displayName ?? '').trim();
      if (!displayName)
        throw new HttpException(
          'displayName is required',
          HttpStatus.BAD_REQUEST,
        );
      $set.displayName = displayName;
    }

    if (dto.app !== undefined) $set.app = this.normalizeKey(dto.app ?? '');

    if (dto.description !== undefined)
      $set.description = String(dto.description ?? '');
    if (dto.eventType !== undefined) $set.eventType = dto.eventType;

    if (dto.channelContent !== undefined) {
      $set.channelContent = dto.channelContent ?? {};
    }

    if (dto.isActive !== undefined) $set.isActive = dto.isActive;
    if ((dto as any).scope !== undefined) $set.scope = (dto as any).scope;
    if ((dto as any).senderScope !== undefined)
      $set.senderScope = (dto as any).senderScope;

    try {
      const updated = await this.model.findByIdAndUpdate(
        _id,
        { $set },
        { new: true, runValidators: true },
      );
      if (!updated)
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);

      return EventCatalogueMapper.toResponse(updated.toObject());
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'Event already exists in this domainCatalogue (domainCatalogueId + eventKey)',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to update event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==========================
  // Runtime Query (Orquestador)
  // ==========================

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const res = await this.model.findByIdAndDelete(_id);
    if (!res) throw new HttpException('Event not found', HttpStatus.NOT_FOUND);

    return { deleted: true };
  }

  // ==========================
  // CRUD
  // ==========================

  private toObjectIdOrThrow(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, HttpStatus.BAD_REQUEST);
    }
    return new Types.ObjectId(id);
  }

  private normalizeKey(v: string) {
    return String(v ?? '')
      .toLowerCase()
      .trim();
  }

  private applyPopulate(q: any, opts?: PopulateOpts) {
    if (!opts?.populateDomainCatalogue) return q;

    const nestedPopulate: any[] = [];

    if (opts.populateChannelsRuntime) {
      nestedPopulate.push({
        path: 'channelsToUse.providerCredentialsId',
        select: 'tag isActive companyChannelProviderId', // ✅ sin encrypted
        populate: {
          path: 'companyChannelProviderId',
          select: 'companyId providerId channelId isActive',
          populate: [
            {
              path: 'providerId',
              select:
                'providerKey displayName connectionType isActive channelId',
            },
            { path: 'channelId', select: 'channelKey displayName isActive' },
          ],
        },
      });
    }

    return q.populate({
      path: 'domainCatalogueId',
      select:
        'companyId domainKey displayName domainCategory isActive channelsToUse',
      populate: nestedPopulate.length ? nestedPopulate : undefined,
    });
  }

  private async getDomainOrThrow(domainCatalogueId: Types.ObjectId) {
    const domain = await this.domainModel
      .findById(domainCatalogueId)
      .select(
        'isActive channelsToUse companyId domainKey displayName domainCategory',
      )
      .lean();

    if (!domain)
      throw new HttpException(
        'DomainCatalogue not found',
        HttpStatus.BAD_REQUEST,
      );
    if ((domain as any).isActive === false)
      throw new HttpException(
        'DomainCatalogue inactive',
        HttpStatus.BAD_REQUEST,
      );

    return domain as any;
  }

  /** Throws 404 if the domain does not exist or does not belong to companyId. */
  async assertDomainBelongsToCompany(
    domainCatalogueId: string,
    companyId: string,
  ): Promise<void> {
    const domainId = this.toObjectIdOrThrow(
      domainCatalogueId,
      'domainCatalogueId',
    );
    const companyObjId = this.toObjectIdOrThrow(companyId, 'companyId');

    const domain = await this.domainModel
      .findOne({ _id: domainId, companyId: companyObjId })
      .select('_id')
      .lean();

    if (!domain) {
      throw new HttpException(
        'DomainCatalogue not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Verifies that an event-catalogue entry belongs to companyId by joining
   * through its parent DomainCatalogue. Throws 404 on mismatch.
   */
  async assertBelongsToCompany(id: string, companyId: string): Promise<void> {
    const _id = this.toObjectIdOrThrow(id, 'id');

    const doc: any = await this.model
      .findById(_id)
      .select('domainCatalogueId')
      .lean();

    if (!doc) {
      throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
    }

    await this.assertDomainBelongsToCompany(
      String(doc.domainCatalogueId),
      companyId,
    );
  }

  async findByDomainAndEventKeyOrNull(
    domainCatalogueId: string,
    eventKey: string,
  ): Promise<EventCatalogueResponseDto | null> {
    if (!Types.ObjectId.isValid(domainCatalogueId)) return null;
    const domainId = new Types.ObjectId(domainCatalogueId);
    const key = this.normalizeKey(eventKey);
    const doc = await this.model
      .findOne({ domainCatalogueId: domainId, eventKey: key })
      .lean();
    if (!doc) return null;
    return EventCatalogueMapper.toResponse(doc as any);
  }

  private assertEventBelongsToCompanyOrThrow(
    doc: any,
    companyId: Types.ObjectId,
  ) {
    const domain = doc?.domainCatalogueId;

    if (!domain || typeof domain !== 'object') {
      throw new HttpException(
        'DomainCatalogue not populated (populateDomainCatalogue=true required)',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (String(domain.companyId) !== String(companyId)) {
      throw new HttpException(
        'Event does not belong to this company',
        HttpStatus.NOT_FOUND,
      );
    }

    if (domain.isActive === false) {
      this.logger.warn(
        `[assertEventBelongsToCompanyOrThrow] domain "${domain.domainKey}" is inactive — delivery decision deferred to EventCatalogue channelContent`,
      );
    }
  }
}
