; bywindows64.asm - Windows API 64-bit
; Assemble: nasm -f win64 bywindows64.asm -o bywindows64.obj
; Link: x86_64-w64-mingw32-gcc bywindows64.obj -o bywindows64.exe -nostartfiles -lkernel32

section .data
    msg db 'hi i use arch btw by win64 from windows10pro', 10, 0
    msg_len equ $-msg

section .bss
    written resq 1          ; حجز 8 بايت (quadword) للـ 64-بت

section .text
    global _start
    extern GetStdHandle
    extern WriteConsoleA
    extern ExitProcess

_start:
    ; تهيئة المكدس: يجب محاذاته وطرح مساحة الظل
    sub rsp, 40             ; 32 بايت مساحة ظل + 8 بايت للمحاذاة (لأن call تدفع 8 بايت)

    ; RCX = GetStdHandle(-11)
    mov rcx, -11            ; الوسيط الأول في RCX
    call GetStdHandle

    ; WriteConsoleA(handle, buffer, len, &written, NULL)
    ; الترتيب: RCX, RDX, R8, R9, ثم المكدس
    mov rcx, rax            ; الوسيط 1: handle (الذي عاد في RAX)
    mov rdx, msg            ; الوسيط 2: buffer
    mov r8, msg_len         ; الوسيط 3: length
    mov r9, written         ; الوسيط 4: pointer to written
    mov qword [rsp + 32], 0 ; الوسيط 5: NULL (يوضع فوق مساحة الظل مباشرة)
    call WriteConsoleA

    ; ExitProcess(0)
    mov rcx, 0              ; الوسيط 1: 0
    call ExitProcess