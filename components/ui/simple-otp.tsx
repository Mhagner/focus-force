'use client';

import React, { useRef, useEffect } from 'react';

type SimpleOTPProps = {
    value: string;
    length?: number;
    onChange: (v: string) => void;
    className?: string;
    inputClassName?: string;
    autoFocus?: boolean;
};

export default function SimpleOTP({ value, length = 6, onChange, className = '', inputClassName = '', autoFocus = false }: SimpleOTPProps) {
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        if (autoFocus) {
            inputsRef.current[0]?.focus();
        }
    }, [autoFocus]);

    const getChars = () => {
        const s = (value ?? '').toString();
        return Array.from({ length }, (_, i) => s[i] ?? '');
    };

    const chars = getChars();

    const setAt = (index: number, char: string) => {
        const sanitized = char.replace(/\D/g, '').slice(0, 1);
        const arr = getChars();
        if (sanitized) {
            arr[index] = sanitized;
            // move focus to next
            const next = Math.min(index + 1, length - 1);
            inputsRef.current[next]?.focus();
        } else {
            arr[index] = '';
        }
        onChange(arr.join(''));
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
        if (!pasted) return;
        const arr = Array.from({ length }, (_, i) => pasted[i] ?? '');
        onChange(arr.join(''));
        // focus next after paste
        const nextIndex = Math.min(pasted.length, length - 1);
        inputsRef.current[nextIndex]?.focus();
    };

    return (
        <div className={`flex items-center justify-center gap-2 ${className}`}>
            {chars.map((ch, i) => (
                <input
                    key={i}
                    ref={el => { inputsRef.current[i] = el; }}
                    value={ch}
                    onChange={e => setAt(i, e.target.value)}
                    onKeyDown={e => {
                        const key = e.key;
                        if (key === 'Backspace' && !chars[i]) {
                            const prev = Math.max(0, i - 1);
                            inputsRef.current[prev]?.focus();
                        } else if (key === 'ArrowLeft') {
                            const prev = Math.max(0, i - 1);
                            inputsRef.current[prev]?.focus();
                            e.preventDefault();
                        } else if (key === 'ArrowRight') {
                            const next = Math.min(length - 1, i + 1);
                            inputsRef.current[next]?.focus();
                            e.preventDefault();
                        }
                    }}
                    onPaste={handlePaste}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className={`h-12 w-12 text-center rounded-md border border-input bg-transparent text-lg font-medium focus:outline-none focus:ring-2 focus:ring-ring ${inputClassName}`}
                />
            ))}
        </div>
    );
}
