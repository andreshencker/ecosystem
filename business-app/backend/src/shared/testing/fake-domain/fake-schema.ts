import { BaseDocument } from '../../infrastructure/schemas/base-document.schema';

/**
 * Compile-time test: verifies that a schema can extend BaseDocument and
 * inherit tenantId, createdBy, updatedBy, deletedAt, deletedBy, version.
 *
 * To use with a real Mongoose connection, add @Schema() and @Prop() decorators
 * and call SchemaFactory.createForClass(FakeSchema).
 * Not imported in spec files to avoid decorator bootstrap complexity in unit tests.
 */
export class FakeSchema extends BaseDocument {
  name!: string;
}
