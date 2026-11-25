// expect: no-restricted-imports
import { useNavigate } from 'react-router'

export function useGoHome(): () => void {
    const navigate = useNavigate()
    return () => {
        void navigate('/')
    }
}
