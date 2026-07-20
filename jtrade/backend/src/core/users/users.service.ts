import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMapper } from './mappers/user.mapper';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /** Lista todos (ADMIN) */
  async findAll(): Promise<UserResponseDto[]> {
    const list = await this.userModel
      .find({}, { passwordHash: 0 })
      .sort({ createdAt: -1 })
      .lean();

    return UserMapper.toResponseList(list as any[]);
  }

  /** Busca uno por id (ADMIN) */
  async findOne(id: string): Promise<UserResponseDto> {
    const _id = new Types.ObjectId(id);
    const doc = await this.userModel.findById(_id, { passwordHash: 0 }).lean();

    if (!doc) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return UserMapper.toResponse(doc as any);
  }

  /** Actualiza mi perfil (solo datos públicos, NO rol ni isActive) */
  async updateProfile(
    userId: string | Types.ObjectId,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const id = new Types.ObjectId(userId);
    const update: any = {};

    // Solo permitimos cambios de perfil, no de rol ni estado
    for (const key of [
      'firstName',
      'middleName',
      'lastName',
      'secondLastName',
      'email',
      'phone',
      'avatarUrl',
    ] as const) {
      if (dto[key] !== undefined) {
        update[key] =
          typeof dto[key] === 'string' ? (dto[key] as string).trim() : dto[key];
      }
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, update, {
        new: true,
        projection: { passwordHash: 0 },
        runValidators: true,
      })
      .lean();

    if (!updated) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return UserMapper.toResponse(updated as any);
  }

  /** Elimina definitivamente (podrías cambiar a soft delete más adelante) */
  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = new Types.ObjectId(id);
    const { deletedCount } = await this.userModel.deleteOne({ _id });

    if (!deletedCount) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return { deleted: true };
  }
}
