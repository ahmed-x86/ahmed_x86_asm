INCLUDE Irvine32.inc

.data
    ; التعريف
    var1 DWORD 10
    var2 DWORD 20

.code
main PROC
    ; نقل المتغيرات
    mov eax, var1
    mov ebx, var2

    ; الاضافة
    add eax, 5
    add eax, 1

    ; الطرح
    sub ebx, 5
    sub ebx, 1

  
    ; التبديل
    mov edx, eax    ; نضع قيمة EAX في EDX لحفظها مؤقتاً
    mov eax, ebx    ; ننقل قيمة EBX إلى EAX
    mov ebx, edx    ; نسترجع القيمة المحفوظة في EDX ونضعها في EBX

   
    ; طباعة المتغيرات
    call WriteInt
    call Crlf       ; انزل سطر
    
    ; 
    mov eax, ebx
    call WriteInt
    call Crlf       ; انزل سطر
    
    exit
main ENDP
END main