import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('ahmed-x86-asm.run', async () => {
        
        // 1. فحص نظام التشغيل أولاً
        if (os.platform() !== 'linux') {
            vscode.window.showErrorMessage('This system is not supported yet');
            return;
        }

        // 2. الحصول على الملف الحالي
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Oops, looks like no file is open! 😅');
            return;
        }

        const filePath = editor.document.fileName;
        const fileDir = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const baseName = path.parse(fileName).name; // اسم الملف بدون الامتداد

        // 3. عرض الخيارات الـ 10
        const options = [
            "1) Linux64 Native (_start)",
            "2) Linux64 Native (main)",
            "3) Linux32 Native (_start)",
            "4) Linux32 Native (main)",
            "5) Win32 Irvine",
            "6) Win32 Standalone",
            "7) Win64 Standalone",
            "8) Win32 Irvine (main)",
            "9) Win32 Standalone (main)",
            "10) Win64 Standalone (main)"
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: 'Choose build mode:'
        });

        if (!selection) {
            return; // لو المستخدم قفل القائمة بدون اختيار
        }

        // 4. تحديد الأمر بناءً على الاختيار
        const selectedIndex = options.indexOf(selection) + 1;
        let cmd = '';

        switch (selectedIndex) {
            case 1:
                cmd = `nasm -f elf64 "${fileName}" -o "${baseName}.o" && ld "${baseName}.o" -o "${baseName}" && ./"${baseName}"`;
                break;
            case 2:
                cmd = `nasm -f elf64 "${fileName}" -o "${baseName}.o" && ld -e main "${baseName}.o" -o "${baseName}" && ./"${baseName}"`;
                break;
            case 3:
                cmd = `nasm -f elf32 "${fileName}" -o "${baseName}.o" && ld -m elf_i386 "${baseName}.o" -o "${baseName}" && ./"${baseName}"`;
                break;
            case 4:
                cmd = `nasm -f elf32 "${fileName}" -o "${baseName}.o" && ld -m elf_i386 -e main "${baseName}.o" -o "${baseName}" && ./"${baseName}"`;
                break;
            case 5:
                cmd = `uasm -q -coff -I./irvine "${fileName}" -Fo"${baseName}.o" && i686-w64-mingw32-gcc "${baseName}.o" ./irvine/Irvine32.lib -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 && WINEDEBUG=-all wine "${baseName}.exe"`;
                break;
            case 6:
                cmd = `nasm -f win32 "${fileName}" -o "${baseName}.obj" && i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 && WINEDEBUG=-all wine "${baseName}.exe"`;
                break;
            case 7:
                cmd = `nasm -f win64 "${fileName}" -o "${baseName}.obj" && x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 && WINEDEBUG=-all wine "${baseName}.exe"`;
                break;
            case 8:
                cmd = `uasm -q -coff -I./irvine "${fileName}" -Fo"${baseName}.o" && i686-w64-mingw32-gcc "${baseName}.o" ./irvine/Irvine32.lib -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -Wl,-e_main && WINEDEBUG=-all wine "${baseName}.exe"`;
                break;
            case 9:
                cmd = `nasm -f win32 "${fileName}" -o "${baseName}.obj" && i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-e_main && WINEDEBUG=-all wine "${baseName}.exe"`;
                break;
            case 10:
                cmd = `nasm -f win64 "${fileName}" -o "${baseName}.obj" && x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-emain && WINEDEBUG=-all wine "${baseName}.exe"`;
                break;
        }

        // 5. فتح التيرمينال وتنفيذ الكود
        let terminal = vscode.window.activeTerminal;
        if (!terminal || terminal.name !== "ahmed_x86_asm") {
            terminal = vscode.window.createTerminal("ahmed_x86_asm");
        }
        
        terminal.show();
        // الذهاب لمسار الملف الأول علشان الأوامر تتنفذ في المكان الصح
        terminal.sendText(`cd "${fileDir}"`);
        // تنفيذ أمر التجميع والتشغيل
        terminal.sendText(cmd);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}