import { fireEvent, render, screen, within } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
    Button,
    Card,
    Checkbox,
    ErrorNotice,
    Page,
    Stack,
    Text,
    TextField,
} from './index'

describe('Button', () => {
    it('type을 주지 않으면 폼을 제출하지 않는다', () => {
        const onSubmit = vi.fn<(event: { preventDefault: () => void }) => void>(
            (event) => {
                event.preventDefault()
            },
        )
        render(
            <form onSubmit={onSubmit}>
                <Button>취소</Button>
                <Button type="submit">저장</Button>
            </form>,
        )

        fireEvent.click(screen.getByRole('button', { name: '취소' }))
        expect(onSubmit).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole('button', { name: '저장' }))
        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('모양 선택과 상태 속성을 요소에 전달한다', () => {
        const onClick = vi.fn<() => void>()
        render(
            <Button variant="primary" size="sm" aria-pressed onClick={onClick}>
                선택
            </Button>,
        )
        const button = screen.getByRole('button', { name: '선택', pressed: true })

        fireEvent.click(button)

        expect(button.dataset).toMatchObject({ variant: 'primary', size: 'sm' })
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('disabled면 눌러도 반응하지 않는다', () => {
        const onClick = vi.fn<() => void>()
        render(
            <Button disabled onClick={onClick}>
                저장
            </Button>,
        )

        fireEvent.click(screen.getByRole('button', { name: '저장' }))

        expect(onClick).not.toHaveBeenCalled()
    })
})

describe('TextField', () => {
    it('label이 입력란의 이름이 되고, onChange는 바뀐 문자열을 받는다', () => {
        const onChange = vi.fn<(value: string) => void>()
        render(<TextField label="이름" value="김" onChange={onChange} />)
        const input = screen.getByRole('textbox', { name: '이름' })

        fireEvent.change(input, { target: { value: '김하늘' } })

        expect(input).toHaveProperty('value', '김')
        expect(onChange).toHaveBeenCalledWith('김하늘')
    })

    it('라벨을 숨겨도 이름은 남는다', () => {
        render(
            <TextField
                type="search"
                label="사용자 검색"
                isLabelHidden
                value=""
                onChange={() => undefined}
            />,
        )

        expect(screen.getByRole('searchbox', { name: '사용자 검색' })).toBeDefined()
    })

    it('errorMessage가 있으면 오류 상태로 표시하고 문장을 입력란에 연결한다', () => {
        const { rerender } = render(
            <TextField label="이름" value="" onChange={() => undefined} />,
        )
        const input = screen.getByRole('textbox', { name: '이름' })
        expect(input.getAttribute('aria-invalid')).toBe('false')
        expect(screen.queryByRole('alert')).toBeNull()

        rerender(
            <TextField
                label="이름"
                value=""
                onChange={() => undefined}
                errorMessage="이름을 입력하세요"
            />,
        )
        const alert = screen.getByRole('alert')

        expect(input.getAttribute('aria-invalid')).toBe('true')
        expect(alert.textContent).toBe('이름을 입력하세요')
        expect(input.getAttribute('aria-describedby')).toBe(alert.id)
    })

    it('두 입력란의 라벨이 서로 섞이지 않는다', () => {
        render(
            <>
                <TextField label="이름" value="a" onChange={() => undefined} />
                <TextField label="이메일" value="b" onChange={() => undefined} />
            </>,
        )

        expect(screen.getByRole('textbox', { name: '이름' })).toHaveProperty(
            'value',
            'a',
        )
        expect(screen.getByRole('textbox', { name: '이메일' })).toHaveProperty(
            'value',
            'b',
        )
    })
})

describe('Checkbox', () => {
    it('label이 이름이 되고, onChange는 바뀐 상태를 받는다', () => {
        const onChange = vi.fn<(checked: boolean) => void>()
        render(<Checkbox label="관리자 권한" checked={false} onChange={onChange} />)
        const checkbox = screen.getByRole('checkbox', { name: '관리자 권한' })

        fireEvent.click(checkbox)

        expect(onChange).toHaveBeenCalledWith(true)
        expect(checkbox).toHaveProperty('checked', false)
    })

    it('라벨 글자를 눌러도 바뀐다', () => {
        const onChange = vi.fn<(checked: boolean) => void>()
        render(<Checkbox label="관리자 권한" checked onChange={onChange} />)

        fireEvent.click(screen.getByText('관리자 권한'))

        expect(onChange).toHaveBeenCalledWith(false)
    })

    it('disabled를 입력란에 전달한다', () => {
        // jsdom은 비활성 체크박스도 fireEvent.click으로 바뀌므로 속성 전달만 확인합니다.
        render(
            <Checkbox
                label="관리자 권한"
                checked={false}
                disabled
                onChange={() => undefined}
            />,
        )

        expect(screen.getByRole('checkbox', { name: '관리자 권한' })).toHaveProperty(
            'disabled',
            true,
        )
    })
})

describe('Stack', () => {
    it('기본은 세로로 놓고, row면 가운데 정렬한다', () => {
        render(
            <>
                <Stack data-testid="column">a</Stack>
                <Stack data-testid="row" direction="row" gap="xl" wrap>
                    b
                </Stack>
            </>,
        )

        expect(screen.getByTestId('column').dataset).toMatchObject({
            direction: 'column',
            gap: 'md',
            align: 'stretch',
            justify: 'start',
        })
        expect(screen.getByTestId('row').dataset).toMatchObject({
            direction: 'row',
            gap: 'xl',
            align: 'center',
            wrap: 'true',
        })
    })
    it('as="ul"이면 목록으로 그린다', () => {
        render(
            <Stack as="ul" aria-label="할 일">
                <li>하나</li>
            </Stack>,
        )

        expect(
            within(screen.getByRole('list', { name: '할 일' })).getAllByRole('listitem'),
        ).toHaveLength(1)
    })
})

describe('Text', () => {
    it('문단으로 그리고, as="span"이면 span으로 그린다', () => {
        render(
            <>
                <Text>문단</Text>
                <Text as="span" tone="muted" size="sm" weight="bold">
                    조각
                </Text>
            </>,
        )

        expect(screen.getByText('문단').tagName).toBe('P')
        expect(screen.getByText('조각').tagName).toBe('SPAN')
        expect(screen.getByText('조각').dataset).toMatchObject({
            tone: 'muted',
            size: 'sm',
            weight: 'bold',
        })
    })

    it('role을 그대로 전달한다', () => {
        render(
            <Text role="status" tone="success">
                저장했습니다
            </Text>,
        )

        expect(screen.getByRole('status').textContent).toBe('저장했습니다')
    })
})

describe('Card', () => {
    it('as와 ref, aria 속성을 요소에 전달한다', () => {
        const ref = createRef<HTMLElement>()
        render(
            <Card as="aside" ref={ref} aria-label="상세" padding="xl">
                내용
            </Card>,
        )
        const panel = screen.getByRole('complementary', { name: '상세' })

        expect(ref.current).toBe(panel)
        expect(panel.dataset).toMatchObject({ padding: 'xl', gap: 'md' })
    })
})

describe('ErrorNotice', () => {
    it('문장을 알리고, onRetry가 있을 때만 다시 시도 버튼을 보여 준다', () => {
        const onRetry = vi.fn<() => void>()
        const { rerender } = render(<ErrorNotice message="불러오지 못했습니다" />)
        const alert = screen.getByRole('alert')

        expect(alert.textContent).toBe('불러오지 못했습니다')
        expect(within(alert).queryByRole('button')).toBeNull()

        rerender(<ErrorNotice message="불러오지 못했습니다" onRetry={onRetry} />)
        fireEvent.click(within(alert).getByRole('button', { name: '다시 시도' }))

        expect(onRetry).toHaveBeenCalledTimes(1)
    })
})

describe('Page', () => {
    it('제목을 h1으로 넣는다', () => {
        render(<Page title="샘플">내용</Page>)

        expect(within(screen.getByRole('main')).getByRole('heading', { level: 1 }).textContent).toBe('샘플')
    })
})
