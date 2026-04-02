section .data
    msg db "Hello from Linux 32-bit (x86) using standard _start!", 10
    len equ $ - msg

section .text
    global _start

_start:
    ; sys_write (eax = 4)
    mov eax, 4
    mov ebx, 1
    mov ecx, msg
    mov edx, len
    int 0x80

    ; sys_exit (eax = 1)
    mov eax, 1
    xor ebx, ebx
    int 0x80