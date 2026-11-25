// expect: product/no-comments
export function orderTotal(unitPrice: number, quantity: number): number {
    // 단가에 수량을 곱합니다
    return unitPrice * quantity
}
