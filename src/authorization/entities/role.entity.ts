import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable, Index } from 'typeorm';
import { UserRole } from './user-role.entity';
import { Permission } from './permission.entity';

export enum RoleType {
  SYSTEM = 'system',
  CUSTOM = 'custom',
  TEAM = 'team'
}

export enum RoleScope {
  GLOBAL = 'global',
  TEAM = 'team',
  ORGANIZATION = 'organization'
}

@Entity('roles')
@Index(['name', 'scope'])
@Index(['teamId'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.CUSTOM
  })
  type: RoleType;

  @Column({
    type: 'enum',
    enum: RoleScope,
    default: RoleScope.TEAM
  })
  scope: RoleScope;

  @Column({ type: 'uuid', nullable: true })
  teamId: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number; // Higher priority roles override lower ones

  @ManyToMany(() => Permission, { cascade: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' }
  })
  permissions: Permission[];

  @OneToMany(() => UserRole, userRole => userRole.role)
  userRoles: UserRole[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  hasPermission(permissionName: string): boolean {
    return this.permissions?.some(permission => permission.name === permissionName) ?? false;
  }

  hasAnyPermission(permissionNames: string[]): boolean {
    return permissionNames.some(name => this.hasPermission(name));
  }

  hasAllPermissions(permissionNames: string[]): boolean {
    return permissionNames.every(name => this.hasPermission(name));
  }
}