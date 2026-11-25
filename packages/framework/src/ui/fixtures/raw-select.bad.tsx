// expect: no-restricted-syntax
export function SortPicker() {
    return (
        <select defaultValue="name">
            <option value="name">이름순</option>
            <option value="stock">재고순</option>
        </select>
    )
}
