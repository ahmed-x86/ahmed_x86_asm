extern GetStdHandle
extern WriteFile
extern ExitProcess

global main

section .data
    msg db "3. Task 8 Success: Win64 Standalone is running beautifully on Arch!", 10
    msg_len equ $ - msg

section .bss
    written resq 1

section .text
main:
    ; توفير مساحة وهمية (Shadow Space) يطلبها نظام ويندوز 64-بت
    sub rsp, 40       

    ; الحصول على مقبض الشاشة (Terminal Handle)
    mov rcx, -11
    call GetStdHandle

    ; طباعة الرسالة على الشاشة
    mov rcx, rax      ; المقبض
    lea rdx, [rel msg] ; عنوان الرسالة
    mov r8, msg_len   ; طول الرسالة
    lea r9, [rel written]
    mov qword [rsp+32], 0 ; المتغير الخامس (NULL) يوضع في الـ Stack
    call WriteFile

    ; إغلاق البرنامج بسلام
    xor rcx, rcx      ; وضع 0 في rcx
    call ExitProcess