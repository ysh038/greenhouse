import { useRef, useState } from 'react'

import { useClickOutside } from '@agent-greenhouse/framework/effect'
import {
    Button,
    Card,
    Checkbox,
    Stack,
    Text,
    TextField,
} from '@agent-greenhouse/framework/ui'

import styles from './InvitePanel.module.css'

const SEAT_LIMIT = 5

type Member = { id: number; email: string; isAdmin: boolean }

const INITIAL_MEMBERS: Member[] = [
    { id: 1, email: 'haneul.kim@example.com', isAdmin: true },
    { id: 2, email: 'doyun.lee@example.com', isAdmin: false },
    { id: 3, email: 'seoyeon.park@example.com', isAdmin: false },
]

export function InvitePanel() {
    const [members, setMembers] = useState(INITIAL_MEMBERS)
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [nextId, setNextId] = useState(INITIAL_MEMBERS.length + 1)
    const [email, setEmail] = useState('')
    const [isAdmin, setIsAdmin] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isHelpOpen, setIsHelpOpen] = useState(false)
    const helpRef = useRef<HTMLDivElement>(null)

    useClickOutside(
        helpRef,
        () => {
            setIsHelpOpen(false)
        },
        { isEnabled: isHelpOpen },
    )

    const used = members.length
    const isFull = used >= SEAT_LIMIT
    const selected = members.find((member) => member.id === selectedId)

    const clear = () => {
        setEmail('')
        setIsAdmin(false)
        setError(null)
    }

    return (
        <Card>
            <Stack direction="row" justify="between">
                <h2>구성원 초대</h2>
                <div ref={helpRef} className={styles.helpAnchor}>
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={isHelpOpen}
                        onClick={() => {
                            setIsHelpOpen(!isHelpOpen)
                        }}
                    >
                        자리란?
                    </Button>
                    {isHelpOpen && (
                        <div className={styles.helpPopover}>
                            <Text role="note" tone="muted" size="sm">
                                자리는 구성원 한 명이 쓰는 이용권입니다.
                            </Text>
                        </div>
                    )}
                </div>
            </Stack>

            <Text tone={isFull ? 'danger' : 'muted'} size="sm">
                자리 {used} / {SEAT_LIMIT}
            </Text>
            <div
                role="meter"
                aria-label="사용한 자리"
                aria-valuemin={0}
                aria-valuemax={SEAT_LIMIT}
                aria-valuenow={used}
                data-full={isFull}
                className={styles.meter}
                style={{
                    width: `${Math.round((used / SEAT_LIMIT) * 100)}%`,
                }}
            />

            <Stack as="ul" gap="xs" aria-label="구성원">
                {members.map((member) => (
                    <li key={member.id}>
                        <Button
                            variant="ghost"
                            aria-pressed={member.id === selectedId}
                            onClick={() => {
                                setSelectedId(member.id)
                            }}
                        >
                            {member.email}
                            {member.isAdmin && ' (관리자)'}
                        </Button>
                    </li>
                ))}
            </Stack>
            {selected && (
                <Stack direction="row" gap="sm">
                    <Text>선택: {selected.email}</Text>
                    <Button
                        onClick={() => {
                            setMembers(
                                members.filter((member) => member.id !== selected.id),
                            )
                            setSelectedId(null)
                        }}
                    >
                        내보내기
                    </Button>
                </Stack>
            )}

            <form
                onSubmit={(event) => {
                    event.preventDefault()
                    const trimmed = email.trim()
                    if (trimmed === '') {
                        setError('이메일을 입력하세요')
                        return
                    }
                    if (members.some((member) => member.email === trimmed)) {
                        setError('이미 구성원입니다')
                        return
                    }
                    setMembers([...members, { id: nextId, email: trimmed, isAdmin }])
                    setNextId(nextId + 1)
                    clear()
                }}
            >
                <Stack>
                    <TextField
                        label="이메일"
                        value={email}
                        onChange={setEmail}
                        errorMessage={error ?? undefined}
                    />
                    <Checkbox
                        label="관리자 권한"
                        checked={isAdmin}
                        onChange={setIsAdmin}
                    />
                    <Stack direction="row" gap="sm">
                        <Button type="submit" variant="primary" disabled={isFull}>
                            초대
                        </Button>
                        <Button variant="ghost" onClick={clear}>
                            지우기
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </Card>
    )
}
