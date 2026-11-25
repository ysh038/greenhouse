// 이 저장소는 프레임워크와 샘플 앱을 같이 두므로, 앱 위치와 검사 단계를 따로 정합니다.
export default {
    appDir: 'apps/sample',
    check: [
        ['피어 의존성', 'peers'],
        ['타입 검사', 'typecheck'],
        ['린트', 'lint'],
        ['위반 예제', 'lint:fixtures'],
        ['테스트', 'test'],
        ['샘플 앱 빌드', 'build'],
        ['화면 검증', 'verify'],
    ],
}
