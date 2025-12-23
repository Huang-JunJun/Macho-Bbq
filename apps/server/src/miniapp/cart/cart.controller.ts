import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MiniCartService } from './cart.service';
import { CartQueryDto } from './dto/cart-query.dto';
import { CartSetQtyDto } from './dto/cart-set-qty.dto';
import { CartClearDto } from './dto/cart-clear.dto';

@Controller('cart')
export class MiniCartController {
  constructor(private cart: MiniCartService) {}

  @Get()
  get(@Query() q: CartQueryDto) {
    return this.cart.getCart(q);
  }

  @Post('item/setQty')
  setQty(@Body() dto: CartSetQtyDto) {
    return this.cart.setQty(dto);
  }

  @Post('clear')
  clear(@Body() dto: CartClearDto) {
    return this.cart.clear(dto);
  }
}
