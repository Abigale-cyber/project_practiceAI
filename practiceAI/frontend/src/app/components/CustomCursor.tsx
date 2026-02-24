import { useEffect } from 'react';

export default function CustomCursor() {
    useEffect(() => {
        const cursorDot = document.getElementById('cursor-dot');
        const cursorCircle = document.getElementById('cursor-circle');

        if (!cursorDot || !cursorCircle) return;

        // Only activate custom cursor on fine pointer devices
        if (window.matchMedia("(pointer: fine)").matches) {
            const handleMouseMove = (e: MouseEvent) => {
                const posX = e.clientX;
                const posY = e.clientY;

                cursorDot.style.left = `${posX}px`;
                cursorDot.style.top = `${posY}px`;

                cursorCircle.style.left = `${posX}px`;
                cursorCircle.style.top = `${posY}px`;
            };

            document.addEventListener('mousemove', handleMouseMove);
            return () => document.removeEventListener('mousemove', handleMouseMove);
        }
    }, []);

    return (
        <>
            <div id="cursor-dot" className="cursor-dot hidden md:block"></div>
            <div id="cursor-circle" className="cursor-circle hidden md:block"></div>
        </>
    );
}
