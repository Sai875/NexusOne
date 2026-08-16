import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  /** Includes the password hash (default select excludes it). */
  findWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Pick<User, 'name' | 'avatarUrl' | 'isActive'>>): Promise<User> {
    await this.repo.update(id, data);
    const updated = await this.repo.findOneBy({ id });
    if (!updated) throw new Error(`User ${id} not found after update`);
    return updated;
  }
}
