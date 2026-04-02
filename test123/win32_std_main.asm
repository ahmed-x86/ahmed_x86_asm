extern _GetStdHandle@4
extern _WriteFile@20
extern _ExitProcess@4

global _main

section .data
    msg db "2. Task 7 Success: Win32 Standalone works directly via Windows API!", 10
    msg_len equ $ - msg

section .bss
    written resd 1

section .text
_main:
    ; الحصول على مقبض الشاشة (Terminal Handle)
    push -11
    call _GetStdHandle@4

    ; طباعة الرسالة على الشاشة
    push 0
    push written
    push msg_len
    push msg
    push eax            ; المقبض الذي حصلنا عليه في الخطوة السابقة
    call _WriteFile@20

    ; إغلاق البرنامج بسلام
    push 0
    call _ExitProcess@4