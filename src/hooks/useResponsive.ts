import { useState, useEffect } from 'react';

export function useResponsive() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkDevice = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        checkDevice();

        // Listen for resize events
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return {
        isMobile,
        isDesktop: !isMobile,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    };
}
