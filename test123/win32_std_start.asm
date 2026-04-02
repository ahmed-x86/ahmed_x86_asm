; bywindows.asm - pure Windows API 32-bit

section .data
    msg db 'hi i use arch btw from win32 windows 10 pro', 10, 0  ; أضفنا سطرًا جديدًا (10) لمخرجات أنظف
    msg_len equ $-msg

section .bss
    written resd 1                     ; حجز 1 DWORD (4 بايت) لمؤشر عدد البايتات المكتوبة

section .text
    global _start
    
    ; تتطلب تصريحات 32-bit stdcall تنسيق _Name@Bytes
    extern _GetStdHandle@4
    extern _WriteConsoleA@20
    extern _ExitProcess@4

_start:
    ; HANDLE stdout = GetStdHandle(-11)
    push -11
    call _GetStdHandle@4

    ; WriteConsoleA(stdout, msg, length, &written, NULL)
    push 0             ; [5] lpReserved = NULL
    push written       ; [4] lpNumberOfCharsWritten (يجب أن يكون مؤشرًا صالحًا)
    push msg_len       ; [3] nNumberOfCharsToWrite
    push msg           ; [2] lpBuffer
    push eax           ; [1] hConsoleOutput (المقبض العائد في EAX)
    call _WriteConsoleA@20

    ; ExitProcess(0)
    push 0
    call _ExitProcess@4