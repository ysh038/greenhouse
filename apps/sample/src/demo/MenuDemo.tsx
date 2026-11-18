import {
    useClickOutside,
    useKeydown,
    useTimeout,
} from '@agent-greenhouse/framework/effect'
import { Button, Card, Stack, Text } from '@agent-greenhouse/framework/ui'
import { useRef, useState } from 'react'

const CLOSE_ANIMATION_MS = 200

export function MenuDemo() {
    const menuRef = useRef<HTMLDivElement>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [isLeaving, setIsLeaving] = useState(false)
    const isShown = isOpen || isLeaving

    const requestClose = () => {
        if (!isOpen) return
        setIsOpen(false)
        setIsLeaving(true)
    }

    useClickOutside(menuRef, requestClose, { isEnabled: isOpen })
    useKeydown('Escape', requestClose, { isEnabled: isOpen })
    useTimeout(
        () => {
            setIsLeaving(false)
        },
        isLeaving ? CLOSE_ANIMATION_MS : null,
    )

    return (
        <Card>
            <h2>메뉴</h2>
            <div ref={menuRef}>
                <Stack align="start" gap="sm">
                    <Button
                        aria-expanded={isOpen}
                        onClick={() => {
                            if (isOpen) {
                                requestClose()
                            } else {
                                setIsOpen(true)
                            }
                        }}
                    >
                        메뉴 {isOpen ? '닫기' : '열기'}
                    </Button>
                    {isShown && (
                        <ul data-state={isLeaving ? 'leaving' : 'open'}>
                            <li>프로필</li>
                            <li>설정</li>
                            <li>로그아웃</li>
                        </ul>
                    )}
                </Stack>
            </div>
            <Text tone="muted">바깥을 누르거나 Escape를 누르면 닫힙니다.</Text>
        </Card>
    )
}
