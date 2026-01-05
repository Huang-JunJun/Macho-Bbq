import { SetMetadata } from '@nestjs/common';

export const MENU_KEY = 'menu_key';
export const MenuPermission = (key: string) => SetMetadata(MENU_KEY, key);
