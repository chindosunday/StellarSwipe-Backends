import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, Index } from 'typeorm';
import { Role } from './role.entity';

export enum PermissionCategory {
  USER_MANAGEMENT = 'user_management',
  TEAM_MANAGEMENT = 'team_management',
  CONTENT_MANAGEMENT = 'content_management',
  FINANCIAL = 'financial',
  SYSTEM = 'system',
  TRADING = 'trading',
  ANALYTICS = 'analytics',
  COMPLIANCE = 'compliance'
}

export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin'
}

@Entity('permissions')
@Index(['name'], { unique: true })
@Index(['category', 'level'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PermissionCategory,
    default: PermissionCategory.SYSTEM
  })
  category: PermissionCategory;

  @Column({
    type: 'enum',
    enum: PermissionLevel,
    default: PermissionLevel.READ
  })
  level: PermissionLevel;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resource: string; // e.g., 'users', 'teams', 'transactions'

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>; // Additional conditions for fine-grained control

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  matchesResource(resource: string): boolean {
    if (!this.resource) return true;
    return this.resource === resource || this.resource === '*';
  }

  matchesLevel(requiredLevel: PermissionLevel): boolean {
    const levels = [PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.DELETE, PermissionLevel.ADMIN];
    const currentIndex = levels.indexOf(this.level);
    const requiredIndex = levels.indexOf(requiredLevel);
    return currentIndex >= requiredIndex;
  }

  checkConditions(context: Record<string, any>): boolean {
    if (!this.conditions) return true;

    // Simple condition checking - can be extended for complex rules
    for (const [key, value] of Object.entries(this.conditions)) {
      if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }
}