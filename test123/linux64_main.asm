section .data
    msg db "Hello from Arch Linux (64-bit Native) using main!", 10  ; رقم 10 يعادل النزول لسطر جديد (New Line)
    len equ $ - msg                                                 ; حساب طول الرسالة تلقائياً

section .text
    global main      ; جعل main مرئية للرابط (Linker)

main:
    ; استدعاء النظام للطباعة (sys_write)
    mov rax, 1       ; رقم أمر الطباعة في نظام لينكس 64-بت
    mov rdi, 1       ; الطباعة على الشاشة (stdout)
    mov rsi, msg     ; عنوان الرسالة
    mov rdx, len     ; طول الرسالة
    syscall          ; تنفيذ الأمر

    ; استدعاء النظام للإغلاق (sys_exit)
    mov rax, 60      ; رقم أمر الإغلاق في لينكس
    xor rdi, rdi     ; وضع 0 في rdi (يعني Exit Code 0 - بدون أخطاء)
    syscall          ; تنفيذ الأمر
