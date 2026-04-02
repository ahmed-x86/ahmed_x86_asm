INCLUDE Irvine32.inc

.data
x BYTE "Ahmed",0
.code
main PROC
    mov edx,OFFSET x
call WriteString
 call Crlf
 main ENDP
 END main