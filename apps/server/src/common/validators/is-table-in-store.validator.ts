import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsTableInStoreConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(tableId: string, args: ValidationArguments) {
    const obj = args.object as { storeId?: string };
    const storeId = obj?.storeId;
    if (!storeId || !tableId) return false;
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, storeId, isActive: true },
      select: { id: true }
    });
    return !!table;
  }

  defaultMessage() {
    return '桌台与门店不匹配或不可用';
  }
}

export function IsTableInStore(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTableInStore',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsTableInStoreConstraint
    });
  };
}
