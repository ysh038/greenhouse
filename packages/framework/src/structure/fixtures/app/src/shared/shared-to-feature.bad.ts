// expect: structure/no-cross-feature-import
import { orderPrice } from '../orders/orderPrice.good'

export function doublePrice(unitPrice: number): number {
    return orderPrice(unitPrice, 2)
}
