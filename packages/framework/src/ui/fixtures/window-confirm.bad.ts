// expect: no-restricted-properties
export function askBeforeDelete(remove: () => void): void {
    if (window.confirm('이 글을 삭제할까요?')) remove()
}
