// expect: structure/no-cross-feature-import
import { orderPrice } from '../orders/orderPrice.good'

export function cartLinePrice(unitPrice: number, quantity: number): number {
    return orderPrice(unitPrice, quantity)
}
