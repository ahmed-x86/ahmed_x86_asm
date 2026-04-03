import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

// دالة مساعدة للحصول على مسار مكتبة Irvine وحفظه
async function getIrvinePath(context: vscode.ExtensionContext): Promise<string | undefined> {
    let irvinePath = context.globalState.get<string>('irvineLibPath');

    if (!irvinePath) {
        const uri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Irvine Library Folder',
            title: 'Please select the folder containing Irvine32.lib'
        });

        if (uri && uri[0]) {
            irvinePath = uri[0].fsPath;
            await context.globalState.update('irvineLibPath', irvinePath);
            vscode.window.showInformationMessage(`Irvine library path saved successfully: ${irvinePath}`);
        } else {
            vscode.window.showErrorMessage('Irvine library path is required to use this build option! 😅');
            return undefined;
        }
    }
    return irvinePath;
}

export function activate(context: vscode.ExtensionContext) {
    
    // أمر إعادة تعيين المسار
    let resetPathDisposable = vscode.commands.registerCommand('ahmed-x86-asm.resetIrvinePath', async () => {
        await context.globalState.update('irvineLibPath', undefined);
        vscode.window.showInformationMessage('Irvine library path has been reset. You will be prompted to select it again next time.');
    });

    // أمر التشغيل الرئيسي
    let runDisposable = vscode.commands.registerCommand('ahmed-x86-asm.run', async () => {
        
        const platform = os.platform();
        
        if (platform !== 'linux' && platform !== 'win32') {
            vscode.window.showErrorMessage('This system is not supported yet! 😅');
            return;
        }

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

        // استدعاء المسار لعرضه
        const currentIrvinePath = context.globalState.get<string>('irvineLibPath') || "Not Set";

        if (platform === 'linux') {
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
                placeHolder: `Choose build mode (Linux) | Irvine Path: ${currentIrvinePath}`
            });

            if (!selection) return;

            const selectedIndex = options.indexOf(selection) + 1;
            let irvinePath = "";

            if (selectedIndex === 5 || selectedIndex === 8) {
                const pathResult = await getIrvinePath(context);
                if (!pathResult) return; 
                irvinePath = pathResult;
            }

            switch (selectedIndex) {
                case 1: cmd = `nasm -f elf64 "${fileName}" -o "${baseName}.o" && ld "${baseName}.o" -o "${baseName}" && ./"${baseName}"`; break;
                case 2: cmd = `nasm -f elf64 "${fileName}" -o "${baseName}.o" && ld -e main "${baseName}.o" -o "${baseName}" && ./"${baseName}"`; break;
                case 3: cmd = `nasm -f elf32 "${fileName}" -o "${baseName}.o" && ld -m elf_i386 "${baseName}.o" -o "${baseName}" && ./"${baseName}"`; break;
                case 4: cmd = `nasm -f elf32 "${fileName}" -o "${baseName}.o" && ld -m elf_i386 -e main "${baseName}.o" -o "${baseName}" && ./"${baseName}"`; break;
                case 5: cmd = `uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o" && i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 && WINEDEBUG=-all wine "${baseName}.exe"`; break;
                case 6: cmd = `nasm -f win32 "${fileName}" -o "${baseName}.obj" && i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 && WINEDEBUG=-all wine "${baseName}.exe"`; break;
                case 7: cmd = `nasm -f win64 "${fileName}" -o "${baseName}.obj" && x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 && WINEDEBUG=-all wine "${baseName}.exe"`; break;
                case 8: cmd = `uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o" && i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -Wl,-e_main && WINEDEBUG=-all wine "${baseName}.exe"`; break;
                case 9: cmd = `nasm -f win32 "${fileName}" -o "${baseName}.obj" && i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-e_main && WINEDEBUG=-all wine "${baseName}.exe"`; break;
                case 10: cmd = `nasm -f win64 "${fileName}" -o "${baseName}.obj" && x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-emain && WINEDEBUG=-all wine "${baseName}.exe"`; break;
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
                placeHolder: `Choose build mode (Windows) | Irvine Path: ${currentIrvinePath}`
            });

            if (!selection) return;

            const selectedIndex = options.indexOf(selection) + 1;
            let irvinePath = "";

            if (selectedIndex === 1 || selectedIndex === 4) {
                const pathResult = await getIrvinePath(context);
                if (!pathResult) return;
                irvinePath = pathResult;
            }
            
            switch (selectedIndex) {
                case 1: cmd = `C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}" ; C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,--subsystem,console' ; & ".\\${baseName}.exe"`; break;
                case 2: cmd = `C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj" ; C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 ; & ".\\${baseName}.exe"`; break;
                case 3: cmd = `C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj" ; C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 ; & ".\\${baseName}.exe"`; break;
                case 4: cmd = `C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}" ; C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,-e_main' '-Wl,--subsystem,console' '-Wl,--enable-stdcall-fixup' 2>$null ; & ".\\${baseName}.exe"`; break;
                case 5: cmd = `C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj" ; C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-e_main' ; & ".\\${baseName}.exe"`; break;
                case 6: cmd = `C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj" ; C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-emain' ; & ".\\${baseName}.exe"`; break;
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

    // تسجيل الأمرين معاً
    context.subscriptions.push(resetPathDisposable);
    context.subscriptions.push(runDisposable);
}

export function deactivate() {}
