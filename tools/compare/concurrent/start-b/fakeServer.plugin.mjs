// 이 앱에는 백엔드가 없어서, 개발 서버가 /api 요청을 받아 가짜 서버로 넘깁니다.
// 앱은 실제 HTTP 요청을 보내므로 진짜 백엔드가 있는 프로젝트와 같은 길로 동작합니다.
// 백엔드가 있는 프로젝트에는 이 파일이 필요 없습니다.

// 이 헤더의 값마다 가짜 서버를 따로 만듭니다. 동시에 도는 자동 검사가 서로의 데이터를 건드리지 않게 합니다.
const RUN_HEADER = 'x-verify-run'

async function readBody(request) {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const text = Buffer.concat(chunks).toString('utf8')
    return text === '' ? undefined : text
}

/**
 * @param {{ entry: string, delayMs?: number }} options
 *   entry: `createFakeServer`를 내보내는 파일. 앱 폴더 기준 경로입니다.
 *   delayMs: 응답을 늦추는 시간. 실제 서버처럼 "불러오는 중"이 보이게 합니다.
 */
export function fakeServerPlugin({ entry, delayMs = 400 }) {
    return {
        name: 'fake-server',
        configureServer(server) {
            // 가짜 서버 파일을 고치면 모듈이 새로 불려 오고, 그때 데이터도 처음 상태로 돌아갑니다.
            const serversByModule = new WeakMap()

            async function fakeServerFor(run) {
                const loaded = await server.ssrLoadModule(entry)
                if (typeof loaded.createFakeServer !== 'function') {
                    throw new Error(`${entry}가 createFakeServer를 내보내야 합니다.`)
                }
                let servers = serversByModule.get(loaded)
                if (!servers) {
                    servers = new Map()
                    serversByModule.set(loaded, servers)
                }
                let fakeServer = servers.get(run)
                if (!fakeServer) {
                    fakeServer = loaded.createFakeServer({ delayMs })
                    servers.set(run, fakeServer)
                }
                return fakeServer
            }

            server.middlewares.use(async (request, response, next) => {
                if (!request.url?.startsWith('/api/')) {
                    next()
                    return
                }
                try {
                    const run = request.headers[RUN_HEADER]
                    const fakeServer = await fakeServerFor(typeof run === 'string' ? run : 'dev')
                    const reply = await fakeServer.fetch(request.url, {
                        method: request.method,
                        body: await readBody(request),
                    })
                    response.statusCode = reply.status
                    reply.headers.forEach((value, name) => {
                        response.setHeader(name, value)
                    })
                    response.end(await reply.text())
                } catch (error) {
                    // 화면이 요청을 취소하면 본문을 읽다가 끊깁니다. 보낼 곳이 없으므로 오류로 넘기지 않습니다.
                    if (request.destroyed) return
                    next(error)
                }
            })
        },
    }
}
