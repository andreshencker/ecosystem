"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoRepositoryBase = void 0;
const base_repository_abstract_1 = require("./base-repository.abstract");
class MongoRepositoryBase extends base_repository_abstract_1.BaseRepository {
    model;
    constructor(model) {
        super();
        this.model = model;
    }
    async findById(id, tenantId) {
        const doc = await this.model
            .findOne({ _id: id, tenantId, deletedAt: null })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findAll(tenantId) {
        const docs = await this.model.find({ tenantId, deletedAt: null }).exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async delete(id, tenantId, deletedBy) {
        await this.model
            .updateOne({ _id: id, tenantId, deletedAt: null }, {
            $set: {
                deletedAt: new Date(),
                ...(deletedBy !== undefined ? { deletedBy } : {}),
            },
        })
            .exec();
    }
    async exists(id, tenantId) {
        const count = await this.model
            .countDocuments({ _id: id, tenantId, deletedAt: null })
            .exec();
        return count > 0;
    }
}
exports.MongoRepositoryBase = MongoRepositoryBase;
//# sourceMappingURL=mongo-repository.base.js.map