section .data
    msg db "Success: Linux 32-bit (x86) is running perfectly on Arch!", 10
    len equ $ - msg

section .text
    global main          ; تعريف main لتعمل مع الخيار الرابع

main:
    ; استدعاء النظام للطباعة (sys_write = 4 في 32-بت)
    mov eax, 4           ; رقم أمر الطباعة
    mov ebx, 1           ; الطباعة على الشاشة (stdout)
    mov ecx, msg         ; عنوان الرسالة
    mov edx, len         ; طول الرسالة
    int 0x80             ; استدعاء النواة (Kernel Interrupt)

    ; استدعاء النظام للإغلاق (sys_exit = 1 في 32-بت)
    mov eax, 1           ; رقم أمر الإغلاق
    xor ebx, ebx         ; كود الخروج 0 (بدون أخطاء)
    int 0x80             ; استدعاء النواة