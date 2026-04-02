import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('ahmed-x86-asm.run', async () => {
        
        const platform = os.platform();

        
        if (platform !== 'linux' && platform !== 'win32') {
            vscode.window.showErrorMessage('This system is not supported yet! 😅');
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
        const baseName = path.parse(fileName).name; 

        let options: string[] = [];
        let cmd = '';

        
        if (platform === 'linux') {
            const irvinePath = path.join(os.homedir(), 'Irvine', 'irvine');
            options = [
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
                placeHolder: `Choose build mode (Linux) | Irvine Path: ${irvinePath}`
            });

            if (!selection) return;

            const selectedIndex = options.indexOf(selection) + 1;

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
                    cmd = `uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o" && i686-w64-mingw32-gcc "${baseName}.o" "${irvinePath}/Irvine32.lib" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 && WINEDEBUG=-all wine "${baseName}.exe"`;
                    break;
                case 6:
                    cmd = `nasm -f win32 "${fileName}" -o "${baseName}.obj" && i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 && WINEDEBUG=-all wine "${baseName}.exe"`;
                    break;
                case 7:
                    cmd = `nasm -f win64 "${fileName}" -o "${baseName}.obj" && x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 && WINEDEBUG=-all wine "${baseName}.exe"`;
                    break;
                case 8:
                    cmd = `uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o" && i686-w64-mingw32-gcc "${baseName}.o" "${irvinePath}/Irvine32.lib" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -Wl,-e_main && WINEDEBUG=-all wine "${baseName}.exe"`;
                    break;
                case 9:
                    cmd = `nasm -f win32 "${fileName}" -o "${baseName}.obj" && i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-e_main && WINEDEBUG=-all wine "${baseName}.exe"`;
                    break;
                case 10:
                    cmd = `nasm -f win64 "${fileName}" -o "${baseName}.obj" && x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-emain && WINEDEBUG=-all wine "${baseName}.exe"`;
                    break;
            }
        } else if (platform === 'win32') {
            options = [
                "1) Win32 Irvine (Standard)",
                "2) Win32 Standalone (Standard)",
                "3) Win64 Standalone (Standard)",
                "4) Win32 Irvine (Custom main)",
                "5) Win32 Standalone (Custom main)",
                "6) Win64 Standalone (Custom main)"
            ];

            const selection = await vscode.window.showQuickPick(options, {
                placeHolder: 'Choose build mode (Windows):'
            });

            if (!selection) return;

            const selectedIndex = options.indexOf(selection) + 1;

            
            switch (selectedIndex) {
                case 1:
                    cmd = `C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"C:\\irvine" -Fo"${baseName}.obj" "${fileName}" ; C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "C:\\irvine\\Irvine32.lib" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,--subsystem,console' ; & ".\\${baseName}.exe"`;
                    break;
                case 2:
                    cmd = `C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj" ; C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 ; & ".\\${baseName}.exe"`;
                    break;
                case 3:
                    cmd = `C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj" ; C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 ; & ".\\${baseName}.exe"`;
                    break;
                case 4:
                    cmd = `C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"C:\\irvine" -Fo"${baseName}.obj" "${fileName}" ; C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "C:\\irvine\\Irvine32.lib" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,-e_main' '-Wl,--subsystem,console' '-Wl,--enable-stdcall-fixup' 2>$null ; & ".\\${baseName}.exe"`;
                    break;
                case 5:
                    cmd = `C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj" ; C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-e_main' ; & ".\\${baseName}.exe"`;
                    break;
                case 6:
                    cmd = `C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj" ; C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-emain' ; & ".\\${baseName}.exe"`;
                    break;
            }
        }

        
        let terminal = vscode.window.activeTerminal;
        if (!terminal || terminal.name !== "ahmed_x86_asm") {
            terminal = vscode.window.createTerminal("ahmed_x86_asm");
        }
        
        terminal.show();
        
        terminal.sendText(`cd "${fileDir}"`);
        
        terminal.sendText(cmd);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}