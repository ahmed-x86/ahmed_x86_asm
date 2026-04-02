section .data
msg db 'i use Archlinux BTW from linux64',0Ah
len equ $ - msg

section .text
global _start

_start:
    mov rax, 1          ; syscall: write
    mov rdi, 1          ; stdout
    mov rsi, msg        ; address of string
    mov rdx, len        ; length
    syscall

    mov rax, 60         ; syscall: exit
    xor rdi, rdi        ; status 0
    syscall
    