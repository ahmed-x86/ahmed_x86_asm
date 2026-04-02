INCLUDE Irvine32.inc

.code
main PROC
    mov eax, 7      ;اول رقم 7
    add eax, 5      ;تاني رقم 5
    
    call WriteInt   ;اطبع الناتج
    call Crlf       ; انزل سطر
    
    exit
main ENDP
END main