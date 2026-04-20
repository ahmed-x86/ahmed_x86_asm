import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import { runCmd, cleanUpTempFiles, getIrvinePath } from '../utils';
import { assembleAndDiagnose } from '../diagnostics';


export async function checkWindowsDeps() {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ahmed-x86 ASM:",
        cancellable: false
    }, async (progress) => {
        
        let messageItems: string[] = [];
        let hasMissing = false;
        progress.report({ message: "Checking dependencies..." });

        const deps = [
            { name: 'uasm', abs: 'C:\\msys64\\mingw64\\bin\\uasm.exe -h', global: 'uasm -h' },
            { name: 'nasm', abs: 'C:\\msys64\\mingw64\\bin\\nasm.exe -v', global: 'nasm -v' },
            { name: 'i686-gcc', abs: 'C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe --version', global: 'i686-w64-mingw32-gcc --version' },
            { name: 'x86_64-gcc', abs: 'C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe --version', global: 'x86_64-w64-mingw32-gcc --version' }
        ];

        const total = deps.length;
        for (let i = 0; i < total; i++) {
            const dep = deps[i];
            progress.report({ message: `Checking ${dep.name}...`, increment: (100 / total) });
            
            const absRes = await runCmd(dep.abs);
            const globalRes = await runCmd(dep.global);

            const isInstalled = absRes.success || globalRes.success;
            
            if (isInstalled) {
                messageItems.push(`${dep.name} : Installed ✅`);
            } else {
                messageItems.push(`${dep.name} : Not Installed ❌`);
                hasMissing = true;
            }
        }

        if (hasMissing) {
            messageItems.push("for install package");
        }

        if (messageItems.length > 0) {
            vscode.window.showInformationMessage("🔍 ahmed-x86 Dependencies (Windows):");
            for (const msg of messageItems) {
                await new Promise(resolve => setTimeout(resolve, 300));
                vscode.window.showInformationMessage(msg);
                
                if (msg === "for install package") {
                    vscode.env.openExternal(vscode.Uri.parse('https://ahmed-x86.github.io/ahmed_x86_asm.html'));
                }
            }
        }
    });
}

// 2. دالة الاختبار الصامت لاختيار أفضل طريقة ربط (Linker) في الويندوز
export async function detectBestWin32Linker(context: vscode.ExtensionContext): Promise<string> {
    let method = context.globalState.get<string>('win32LinkerMethod');
    if (method) return method;

    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ahmed-x86 ASM: Optimizing Windows linker...",
        cancellable: false
    }, async (progress) => {
        const tmpdir = os.tmpdir();
        const dummyAsm = path.join(tmpdir, 'ahmed_dummy.asm');
        const dummyObj = path.join(tmpdir, 'ahmed_dummy.obj');
        const dummyExe = path.join(tmpdir, 'ahmed_dummy.exe');

        fs.writeFileSync(dummyAsm, 'global _main\nsection .text\n_main:\nret\n');
        await runCmd(`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${dummyAsm}" -o "${dummyObj}"`);

        let bestMethod = 'gcc'; 
        const ldCmd = `C:\\msys64\\mingw32\\bin\\ld.exe "${dummyObj}" -o "${dummyExe}" -lkernel32 -luser32 -e _main -L C:\\msys64\\mingw32\\lib`;
        const ldRes = await runCmd(ldCmd);

        if (ldRes.success) {
            bestMethod = 'ld'; 
        } else {
            const gccCmd = `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${dummyObj}" -o "${dummyExe}" -nostartfiles -lkernel32 -luser32 -Wl,-e_main`;
            const gccRes = await runCmd(gccCmd);
            if (gccRes.success) {
                bestMethod = 'gcc';
            }
        }

        try {
            if (fs.existsSync(dummyAsm)) fs.unlinkSync(dummyAsm);
            if (fs.existsSync(dummyObj)) fs.unlinkSync(dummyObj);
            if (fs.existsSync(dummyExe)) fs.unlinkSync(dummyExe);
        } catch (e) {}

        await context.globalState.update('win32LinkerMethod', bestMethod);
        vscode.window.showInformationMessage(`Linker method adopted: ${bestMethod.toUpperCase()} ✅`);
        return bestMethod;
    });
}

// 3. دالة التعرف التلقائي الخاصة بالويندوز
export function detectWindowsOption(fileText: string): { index: number, name: string } {
    const textLower = fileText.toLowerCase();
    
    const hasIrvine = textLower.includes('irvine32.inc');
    const hasMain = textLower.includes('main proc') || textLower.includes('main:');
    const is64Bit = textLower.includes('bits 64') || textLower.includes('elf64') || textLower.includes('win64') || textLower.includes('rax');

    if (hasIrvine) return hasMain ? { index: 4, name: "Win32 Irvine (Custom main)" } : { index: 1, name: "Win32 Irvine (Standard)" };
    if (is64Bit) return hasMain ? { index: 6, name: "Win64 Standalone (Custom main)" } : { index: 3, name: "Win64 Standalone (Standard)" };
    return hasMain ? { index: 5, name: "Win32 Standalone (Custom main)" } : { index: 2, name: "Win32 Standalone (Standard)" };
}

// 4. الدالة الرئيسية لتشغيل الكود على ويندوز
export async function handleWindowsBuild(context: vscode.ExtensionContext, editor: vscode.TextEditor) {
    const filePath = editor.document.fileName;
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const baseName = path.parse(fileName).name; 
    const fileText = editor.document.getText();

    const autoDetected = detectWindowsOption(fileText);
    const currentIrvinePath = context.globalState.get<string>('irvineLibPath') || "Not Set";

    const options = [
        `✨ Auto Detect: ${autoDetected.name}`,
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

    let selectedIndex = selection.startsWith('✨ Auto Detect') ? autoDetected.index : parseInt(selection.split(')')[0]);
    let irvinePath = "";

    if (selectedIndex === 1 || selectedIndex === 4) {
        const pathResult = await getIrvinePath(context);
        if (!pathResult) return;
        irvinePath = pathResult;
    }

    const linkerMethod = await detectBestWin32Linker(context);
    let commands: string[] = [];

    if (linkerMethod === 'ld') {
        switch (selectedIndex) {
            case 1: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -lkernel32 -luser32 --subsystem console --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
            case 2: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
            case 3: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 -L C:\\msys64\\mingw64\\lib`, `.\\${baseName}.exe`]; break;
            case 4: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -lkernel32 -luser32 -e _main --subsystem console --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
            case 5: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 -e _main --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
            case 6: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 -e main -L C:\\msys64\\mingw64\\lib`, `.\\${baseName}.exe`]; break;
        }
    } else {
        switch (selectedIndex) {
            case 1: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,--subsystem,console'`, `.\\${baseName}.exe`]; break;
            case 2: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `.\\${baseName}.exe`]; break;
            case 3: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `.\\${baseName}.exe`]; break;
            case 4: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,-e_main' '-Wl,--subsystem,console' '-Wl,--enable-stdcall-fixup' 2>$null`, `.\\${baseName}.exe`]; break;
            case 5: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-e_main'`, `.\\${baseName}.exe`]; break;
            case 6: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-emain'`, `.\\${baseName}.exe`]; break;
        }
    }

    if (commands.length > 0) {
        const assembleCmd = commands[0];
        const linkCmd = commands.length > 1 ? commands[1] : null;
        const runCommands = commands.length > 2 ? commands.slice(2) : [];

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Building Assembly (Windows)...",
        }, async () => {
            
            let terminal = vscode.window.activeTerminal;
            if (!terminal || terminal.name !== "ahmed_x86_asm") {
                terminal = vscode.window.createTerminal("ahmed_x86_asm");
            }
            terminal.show(true);
            terminal.sendText(`cd "${fileDir}"`);
            terminal.sendText('cls'); // ويندوز يحتاج cls

            const isAssembleSuccess = await assembleAndDiagnose(assembleCmd, fileDir, editor.document);
            terminal.sendText(assembleCmd);

            if (!isAssembleSuccess) return;

            if (linkCmd) {
                const isLinkSuccess = await new Promise<boolean>((resolve) => {
                    cp.exec(linkCmd, { cwd: fileDir }, (error, stdout, stderr) => {
                        if (error) {
                            let errorMsg = (stderr || stdout || error.message).trim();
                            if (errorMsg.length > 300) errorMsg = errorMsg.substring(0, 300) + '...';
                            vscode.window.showErrorMessage(`ahmed-x86 Linker Error: ${errorMsg} ❌`);
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    });
                });
                terminal.sendText(linkCmd);

                if (!isLinkSuccess) return; 
            }

            for (const cmd of runCommands) {
                terminal.sendText(cmd);
            }

            setTimeout(async () => {
                await cleanUpTempFiles(fileDir, baseName);
            }, 1000); 
        });
    }
}
