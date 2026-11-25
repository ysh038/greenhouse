import { formatPrice } from '../shared/formatPrice.good'

export function cartTotalLabel(prices: readonly number[]): string {
    return formatPrice(prices.reduce((sum, price) => sum + price, 0))
}
