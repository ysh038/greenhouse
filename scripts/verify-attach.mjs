// 이 브랜치에서 검토한 모아 보기와 검토 기록을 PR 본문에 붙입니다.
//   pnpm verify:attach            현재 브랜치의 PR에 붙임
//   pnpm verify:attach --clean    머지되거나 닫힌 PR의 그림을 지움
//
// 그림은 main에 합쳐지지 않는 브랜치(verify-evidence/<PR 번호>)에 올리고 PR 본문에서 그 커밋을 가리킵니다.
// PR이 끝난 뒤 그 브랜치를 지우면 그림도 저장소에서 사라집니다.
// 지금은 GitHub(gh)만 지원합니다.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { readSheetRecords, readStore, reviewedSheetsDir, rootDir } from './lib/review.mjs'

const EVIDENCE_BRANCH_PREFIX = 'verify-evidence/'
const START = '<!-- verify-evidence:start -->'
const END = '<!-- verify-evidence:end -->'

function run(command, args, options = {}) {
    const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8', ...options })
    if (result.status !== 0) {
        throw new Error(
            `${command} ${args.join(' ')} 실패:\n${(result.stderr || result.stdout || '').trim()}`,
        )
    }
    return result.stdout.trim()
}

function fail(message) {
    console.error(message)
    process.exit(1)
}

/** 원격 주소에서 호스트와 저장소 경로를 읽습니다. https와 ssh 모양을 모두 받습니다. */
function readRemote() {
    const url = run('git', ['remote', 'get-url', 'origin'])
    const match =
        /^https?:\/\/(?:[^@/]+@)?([^/]+)\/(.+?)(?:\.git)?$/.exec(url) ??
        /^(?:ssh:\/\/)?git@([^:/]+)[:/](.+?)(?:\.git)?$/.exec(url)
    if (!match) fail(`원격 주소를 읽지 못했습니다: ${url}`)
    const [, host, repoPath] = match
    if (host !== 'github.com') {
        fail(`지금은 GitHub만 지원합니다. 이 저장소의 원격은 ${host} 입니다.`)
    }
    return { host, repoPath }
}

/** 본문에서 예전에 붙인 구역을 새것으로 바꾸거나, 없으면 끝에 덧붙입니다. */
function replaceSection(body, section) {
    const start = body.indexOf(START)
    const end = body.indexOf(END)
    const block = `${START}\n${section}\n${END}`
    if (start === -1 || end === -1) return `${body.trimEnd()}\n\n${block}\n`.trimStart()
    return `${body.slice(0, start)}${block}${body.slice(end + END.length)}`
}

// `gh pr edit`는 오래된 gh에서 실패하는 일이 있어(프로젝트 카드 조회 오류) REST API로 고칩니다.
function setPrBody(repoPath, number, body) {
    const file = path.join(rootDir, 'node_modules/.tmp/verify-attach-body.md')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, body)
    run('gh', [
        'api',
        '--method',
        'PATCH',
        `repos/${repoPath}/pulls/${number}`,
        '-F',
        `body=@${file}`,
        '--silent',
    ])
}

/** 작업 폴더를 건드리지 않고, 그림만 든 커밋을 만들어 증거 브랜치에 올립니다. */
function pushEvidence(branch, files) {
    const entries = files.map((file) => {
        const blob = run('git', ['hash-object', '-w', path.join(reviewedSheetsDir, file.source)])
        return `100644 blob ${blob}\t${file.name}`
    })
    const tree = run('git', ['mktree'], { input: `${entries.join('\n')}\n` })
    const commit = run('git', ['commit-tree', tree, '-m', `화면 검증 증거 (${branch})`])
    run('git', ['push', '--force', 'origin', `${commit}:refs/heads/${branch}`])
    return commit
}

function attach() {
    const { host, repoPath } = readRemote()
    const branch = run('git', ['branch', '--show-current'])
    const view = spawnSync('gh', ['pr', 'view', '--json', 'number,url,body,state'], {
        cwd: rootDir,
        encoding: 'utf8',
    })
    if (view.status !== 0) {
        fail(`현재 브랜치(${branch})에 열린 PR이 없습니다. PR을 먼저 만든 뒤 다시 돌리세요.`)
    }
    const pr = JSON.parse(view.stdout)

    // 이 브랜치에서 검토했고, 지금도 어떤 스크린샷의 최신 검토인 모아 보기만 붙입니다.
    const current = new Set(
        Object.values(readStore()).flatMap((entry) => entry.sheetRecordIds ?? []),
    )
    const records = readSheetRecords().filter(
        (record) => record.branch === branch && current.has(record.recordId),
    )
    if (records.length === 0) {
        fail(
            [
                `이 브랜치(${branch})에서 검토한 스크린샷이 없습니다.`,
                '화면이 달라지지 않았다면 붙일 것이 없습니다.',
                '달라졌다면 pnpm verify로 모아 보기를 만들고 pnpm verify:review로 기록한 뒤 다시 돌리세요.',
            ].join('\n'),
        )
    }

    // 주소에 한글이 들어가지 않도록 파일 이름은 장 이름(영문)과 순번으로 만듭니다.
    const files = records.map((record, index) => ({
        source: record.file,
        name: `${String(index + 1).padStart(2, '0')}-${record.id}.png`,
        record,
    }))
    const evidenceBranch = `${EVIDENCE_BRANCH_PREFIX}${pr.number}`
    const commit = pushEvidence(evidenceBranch, files)

    const section = [
        '## 화면 검증',
        '',
        `달라진 스크린샷을 모아 보기 ${files.length}장으로 검토했습니다. 그림은 \`${evidenceBranch}\` 브랜치에 있고, PR이 끝나면 지웁니다.`,
        ...files.flatMap((file) => [
            '',
            `### ${file.record.id}`,
            '',
            `${file.record.at} 검토: ${file.record.note}`,
            '',
            // 커밋을 가리켜야 브랜치가 다시 올라가도 본문의 그림이 바뀌지 않습니다.
            `![${file.record.id}](https://${host}/${repoPath}/blob/${commit}/${file.name}?raw=true)`,
        ]),
    ].join('\n')
    setPrBody(repoPath, pr.number, replaceSection(pr.body ?? '', section))
    console.log(`모아 보기 ${files.length}장과 검토 기록을 붙였습니다: ${pr.url}`)
}

function clean() {
    const { repoPath } = readRemote()
    const heads = run('git', ['ls-remote', '--heads', 'origin', `${EVIDENCE_BRANCH_PREFIX}*`])
    const branches = heads
        .split('\n')
        .filter(Boolean)
        .map((line) => line.split('\t')[1].replace('refs/heads/', ''))
    if (branches.length === 0) {
        console.log('지울 증거 브랜치가 없습니다.')
        return
    }
    for (const branch of branches) {
        const number = branch.slice(EVIDENCE_BRANCH_PREFIX.length)
        const pr = JSON.parse(run('gh', ['pr', 'view', number, '--json', 'state,body,url']))
        if (pr.state === 'OPEN') {
            console.log(`남김  ${branch} (PR이 아직 열려 있음)`)
            continue
        }
        // 그림이 사라지므로 본문에서 그림 줄을 빼고 검토 기록만 남깁니다.
        const start = pr.body.indexOf(START)
        const end = pr.body.indexOf(END)
        if (start !== -1 && end !== -1) {
            const kept = pr.body
                .slice(start + START.length, end)
                .split('\n')
                .filter((line) => !line.startsWith('!['))
                .join('\n')
                .replace(/그림은 `[^`]+` 브랜치에 있고, PR이 끝나면 지웁니다\./, '그림은 PR이 끝나 지웠습니다.')
                .replaceAll(/\n{3,}/g, '\n\n')
                .trim()
            setPrBody(repoPath, number, replaceSection(pr.body, kept))
        }
        run('git', ['push', 'origin', '--delete', branch])
        console.log(`지움  ${branch} (${pr.url})`)
    }
}

if (process.argv[2] === '--clean') {
    clean()
} else {
    attach()
}
