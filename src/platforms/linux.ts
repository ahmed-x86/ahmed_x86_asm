import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { runCmd, cleanUpTempFiles, getIrvinePath } from '../utils';
import { assembleAndDiagnose } from '../diagnostics';

// 1. دالة فحص الاعتماديات الخاصة بلينكس
export async function checkLinuxDeps() {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ahmed-x86 ASM:",
        cancellable: false
    }, async (progress) => {
        
        let messageItems: string[] = [];
        let hasMissing = false;
        progress.report({ message: "Checking dependencies..." });

        const deps = [
            { name: 'nasm', cmd: 'nasm -v' },
            { name: 'binutils', cmd: 'ld -v' },
            { name: 'wine', cmd: 'wine --version' },
            { name: 'uasm', cmd: 'uasm -h' },
            { name: 'darling', cmd: 'darling --version' },
            { name: 'lld', cmd: 'ld.lld -v' },
            { name: 'qemu-user-static', cmd: 'qemu-x86_64-static --version' },
            { name: 'aarch64-as', cmd: 'aarch64-linux-gnu-as --version' },
            { name: 'aarch64-ld', cmd: 'aarch64-linux-gnu-ld -v' },
            { name: 'qemu-aarch64-static', cmd: 'qemu-aarch64-static --version' },
            { name: 'arm-none-eabi-as', cmd: 'arm-none-eabi-as --version' },
            { name: 'qemu-arm-static', cmd: 'qemu-arm-static --version' },
            { name: 'riscv64-as', cmd: 'riscv64-linux-gnu-as --version' },
            { name: 'riscv64-gcc', cmd: 'riscv64-linux-gnu-gcc --version' },
            { name: 'riscv64-ld', cmd: 'riscv64-linux-gnu-ld -v' },
            { name: 'qemu-riscv64-static', cmd: 'qemu-riscv64-static --version' },
            { name: 'qemu-riscv32-static', cmd: 'qemu-riscv32-static --version' }
        ];

        const total = deps.length;
        for (let i = 0; i < total; i++) {
            const dep = deps[i];
            progress.report({ message: `Checking ${dep.name}...`, increment: (100 / total) });
            
            const res = await runCmd(dep.cmd);
            if (res.success && res.output) {
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
            vscode.window.showInformationMessage("🔍 ahmed-x86 Dependencies (Linux):");
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

// 2. دالة التعرف التلقائي الخاصة بلينكس
export function detectLinuxOption(fileText: string): { index: number, name: string } {
    const textLower = fileText.toLowerCase();
    
    const hasIrvine = textLower.includes('irvine32.inc');
    const hasMain = textLower.includes('main proc') || textLower.includes('main:');
    const is64Bit = textLower.includes('bits 64') || textLower.includes('elf64') || textLower.includes('win64') || textLower.includes('rax');
    const isMac = textLower.includes('macho64');
    const isFreeBSD = textLower.includes('freebsd') || textLower.includes('fbsd');
    const isFreeBSD32 = textLower.includes('freebsd32') || textLower.includes('fbsd32');
    const isArm64 = textLower.includes('aarch64') || textLower.includes('x8'); 
    const isArm32 = textLower.includes('r7') || textLower.includes('svc #0');
    const isWinArm64 = textLower.includes('win-arm64') || textLower.includes('windows arm64');
    const isWinArm32 = textLower.includes('win-arm32') || textLower.includes('windows arm32');
    const isMacArm64 = textLower.includes('mac-arm64') || textLower.includes('apple silicon');
    
    const isRiscv32e = textLower.includes('rv32e');
    const isRiscv32 = (textLower.includes('rv32i') || textLower.includes('riscv32')) && !isRiscv32e;
    const isRiscv64 = (textLower.includes('riscv64') || textLower.includes('ecall')) && !isRiscv32 && !isRiscv32e;
    const isRiscv128 = textLower.includes('rv128') || textLower.includes('riscv128');

    if (isRiscv128) return hasMain ? { index: 32, name: "Linux RISC-V 128-bit (main) (QEMU)" } : { index: 31, name: "Linux RISC-V 128-bit (_start) (QEMU)" }; 
    if (isRiscv32e) return hasMain ? { index: 30, name: "Linux RV32E (main) (QEMU)" } : { index: 29, name: "Linux RV32E (_start) (QEMU)" }; 
    if (isRiscv32) return hasMain ? { index: 28, name: "Linux RV32I (main) (QEMU)" } : { index: 27, name: "Linux RV32I (_start) (QEMU)" }; 
    if (isRiscv64) return hasMain ? { index: 26, name: "Linux RISC-V 64-bit (main) (QEMU)" } : { index: 25, name: "Linux RISC-V 64-bit (_start) (QEMU)" };
    if (isWinArm64) return hasMain ? { index: 19, name: "win_arm64_main(compile but not run)" } : { index: 18, name: "win_arm64_start(compile but not run)" };
    if (isWinArm32) return hasMain ? { index: 21, name: "win_arm32_main(compile but not run)" } : { index: 20, name: "win_arm32_start(compile but not run)" };
    if (isMacArm64) return { index: 22, name: "mac_arm64_main(compile but not run)" };
    if (isFreeBSD32) return hasMain ? { index: 24, name: "FreeBSD 32-bit (main) (compile but not run)" } : { index: 23, name: "FreeBSD 32-bit (_start) (compile but not run)" };
    if (isArm64) return hasMain ? { index: 16, name: "Linux ARM64 (main)" } : { index: 14, name: "Linux ARM64 (_start)" }; 
    if (isArm32) return hasMain ? { index: 17, name: "Linux ARM32 (main)" } : { index: 15, name: "Linux ARM32 (_start)" }; 
    if (isFreeBSD) return hasMain ? { index: 13, name: "FreeBSD 64-bit (main)" } : { index: 12, name: "FreeBSD 64-bit (_start)" }; 
    if (isMac) return { index: 11, name: "Mac64 Native (Darling)" };
    if (hasIrvine) return hasMain ? { index: 8, name: "Win32 Irvine (main)" } : { index: 5, name: "Win32 Irvine" };
    if (is64Bit) return hasMain ? { index: 2, name: "Linux64 Native (main)" } : { index: 1, name: "Linux64 Native (_start)" };
    return hasMain ? { index: 4, name: "Linux32 Native (main)" } : { index: 3, name: "Linux32 Native (_start)" };
}

// 3. الدالة الرئيسية لتشغيل الكود على لينكس
export async function handleLinuxBuild(context: vscode.ExtensionContext, editor: vscode.TextEditor) {
    const filePath = editor.document.fileName;
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const baseName = path.parse(fileName).name; 
    const fileText = editor.document.getText();
    
    const autoDetected = detectLinuxOption(fileText);
    const currentIrvinePath = context.globalState.get<string>('irvineLibPath') || "Not Set";
    const wineLogEnabled = context.globalState.get<boolean>('wineLogEnabled') === true;
    const wineSuffix = wineLogEnabled ? "" : " 2>/dev/null";

    const options = [
        `✨ Auto Detect: ${autoDetected.name}`,
        "1) Linux64 Native (_start)",
        "2) Linux64 Native (main)",
        "3) Linux32 Native (_start)",
        "4) Linux32 Native (main)",
        "5) Win32 Irvine",
        "6) Win32 Standalone",
        "7) Win64 Standalone",
        "8) Win32 Irvine (main)",
        "9) Win32 Standalone (main)",
        "10) Win64 Standalone (main)",
        "11) Mac64 Native (Darling)",
        "12) FreeBSD 64-bit (_start) (QEMU)",
        "13) FreeBSD 64-bit (main) (QEMU)",
        "14) Linux ARM64 (_start) (QEMU)", 
        "15) Linux ARM32 (_start) (QEMU)",
        "16) Linux ARM64 (main) (QEMU)",
        "17) Linux ARM32 (main) (QEMU)",
        "18) win_arm64_start(compile but not run)",
        "19) win_arm64_main(compile but not run)",
        "20) win_arm32_start(compile but not run)",
        "21) win_arm32_main(compile but not run)",
        "22) mac_arm64_main(compile but not run)",
        "23) FreeBSD 32-bit (_start) (compile but not run)",
        "24) FreeBSD 32-bit (main) (compile but not run)", 
        "25) Linux RISC-V 64-bit (_start) (QEMU)",
        "26) Linux RISC-V 64-bit (main) (QEMU)",
        "27) Linux RV32I (_start) (QEMU)",
        "28) Linux RV32I (main) (QEMU)",
        "29) Linux RV32E (_start) (QEMU)",
        "30) Linux RV32E (main) (QEMU)",
        "31) Linux RISC-V 128-bit (_start) (QEMU)",
        "32) Linux RISC-V 128-bit (main) (QEMU)"
    ];

    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: `Choose build mode (Linux) | Irvine Path: ${currentIrvinePath}`
    });

    if (!selection) return;

    let selectedIndex = selection.startsWith('✨ Auto Detect') ? autoDetected.index : parseInt(selection.split(')')[0]);
    let irvinePath = "";

    if (selectedIndex === 5 || selectedIndex === 8) {
        const pathResult = await getIrvinePath(context);
        if (!pathResult) return; 
        irvinePath = pathResult;
    }

    const linuxLinkerMethod = context.globalState.get<string>('linuxLinkerMethod') || 'ld';
    let commands: string[] = [];

    if (linuxLinkerMethod === 'gcc') {
        switch (selectedIndex) {
            case 1: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `gcc "${baseName}.o" -o "${baseName}" -nostdlib`, `./"${baseName}"`]; break;
            case 2: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `gcc "${baseName}.o" -o "${baseName}" -no-pie`, `./"${baseName}"`]; break;
            case 3: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `gcc -m32 "${baseName}.o" -o "${baseName}" -nostdlib`, `./"${baseName}"`]; break;
            case 4: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `gcc -m32 "${baseName}.o" -o "${baseName}" -no-pie`, `./"${baseName}"`]; break;
            case 5: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 6: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 7: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 8: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 9: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 10: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-emain`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            
            case 11: commands = [`nasm -f macho64 "${fileName}" -o "${baseName}.o"`, `x86_64-apple-darwin20.4-ld "${baseName}.o" -o "${baseName}" -macosx_version_min 10.11 -lSystem -syslibroot /usr/local/SDK/MacOSX11.3.sdk`, `darling shell ./"${baseName}"`]; break;
            case 12: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld.lld -m elf_x86_64_fbsd "${baseName}.o" -o "${baseName}"`, `qemu-x86_64-static ./"${baseName}"`]; break;
            case 13: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld.lld -m elf_x86_64_fbsd -e main "${baseName}.o" -o "${baseName}"`, `qemu-x86_64-static ./"${baseName}"`]; break;
            
            case 14: commands = [`aarch64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, `aarch64-linux-gnu-ld "${baseName}.o" -o "${baseName}"`, `qemu-aarch64-static ./"${baseName}"`]; break;
            case 15: commands = [`arm-none-eabi-as "${fileName}" -o "${baseName}.o"`, `arm-none-eabi-ld "${baseName}.o" -o "${baseName}"`, `qemu-arm-static ./"${baseName}"`]; break;
            case 16: commands = [`aarch64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, `aarch64-linux-gnu-ld "${baseName}.o" -o "${baseName}" -e main`, `qemu-aarch64-static ./"${baseName}"`]; break;
            case 17: commands = [`arm-none-eabi-as "${fileName}" -o "${baseName}.o"`, `arm-none-eabi-ld "${baseName}.o" -o "${baseName}" -e main`, `qemu-arm-static ./"${baseName}"`]; break;
            
            case 18: commands = [`/opt/llvm-mingw/llvm-mingw-ucrt/bin/aarch64-w64-mingw32-clang "${fileName}" -o "${baseName}.exe" -nostartfiles -lkernel32 -Wl,-e_start`, `echo "\\nPhysically impossible for the code to run, try it on a Windows ARM64 device 😅"`]; break;
            case 19: commands = [`/opt/llvm-mingw/llvm-mingw-ucrt/bin/aarch64-w64-mingw32-clang "${fileName}" -o "${baseName}.exe" -lkernel32`, `echo "\\nPhysically impossible for the code to run, try it on a Windows ARM64 device 😅"`]; break;
            case 20: commands = [`/opt/llvm-mingw/llvm-mingw-ucrt/bin/armv7-w64-mingw32-clang "${fileName}" -o "${baseName}.exe" -nostartfiles -lkernel32 -Wl,-e_start`, `echo "\\nNote: We have breached the realms of architectures.. The code is sound 32-bit, but the atoms of your x86_64 processor still refuse to dance to the rhythms of ARM32 Windows."`]; break;
            case 21: commands = [`/opt/llvm-mingw/llvm-mingw-ucrt/bin/armv7-w64-mingw32-clang "${fileName}" -o "${baseName}.exe" -lkernel32`, `echo "\\nPhysically impossible for the code to run, try it on a Windows ARM32 device 😅"`]; break;
            
            case 22: commands = [`aarch64-apple-darwin20.4-clang "${fileName}" -o "${baseName}"`, `echo "\\nIt is physically impossible to execute this binary. Your x86_64 processor is looking for an Apple Silicon heart to beat with this code. Try it on an M1/M2/M3 device!"`]; break;
            
            case 23: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld.lld -m elf_i386_fbsd "${baseName}.o" -o "${baseName}"`, `echo "\\nNote: Compilation successful. Running on Linux via QEMU user-mode will fail silently due to Syscall calling convention mismatch 😅"`]; break;
            case 24: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld.lld -m elf_i386_fbsd -e main "${baseName}.o" -o "${baseName}"`, `echo "\\nNote: Compilation successful. Running on Linux via QEMU user-mode will fail silently due to Syscall calling convention mismatch 😅"`]; break;
            
            case 25: commands = [`riscv64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld "${baseName}.o" -o "${baseName}"`, `qemu-riscv64-static ./"${baseName}"`]; break;
            case 26: commands = [`riscv64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-gcc -static "${baseName}.o" -o "${baseName}"`, `qemu-riscv64-static ./"${baseName}"`]; break;
            case 27: commands = [`riscv64-linux-gnu-as -march=rv32i -mabi=ilp32 "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld -m elf32lriscv "${baseName}.o" -o "${baseName}"`, `qemu-riscv32-static ./"${baseName}"`]; break; 
            case 28: commands = [`riscv64-linux-gnu-as -march=rv32i -mabi=ilp32 "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld -m elf32lriscv -e main "${baseName}.o" -o "${baseName}"`, `qemu-riscv32-static ./"${baseName}"`]; break; 
            case 29: commands = [`riscv64-linux-gnu-as -march=rv32e -mabi=ilp32e "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld -m elf32lriscv "${baseName}.o" -o "${baseName}"`, `qemu-riscv32-static ./"${baseName}"`]; break;
            case 30: commands = [`riscv64-linux-gnu-as -march=rv32e -mabi=ilp32e "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld -m elf32lriscv -e main "${baseName}.o" -o "${baseName}"`, `qemu-riscv32-static ./"${baseName}"`]; break;
            
            // التعديل: استبدال الأوامر غير المنطقية برسالة توضيحية لـ RV128
            case 31: commands = [`echo "Compilation skipped."`, `echo "\\nNote: RISC-V 128-bit (RV128) is highly experimental and not fully supported by standard GCC/QEMU toolchains yet! 😅"`]; break;
            case 32: commands = [`echo "Compilation skipped."`, `echo "\\nNote: RISC-V 128-bit (RV128) is highly experimental and not fully supported by standard GCC/QEMU toolchains yet! 😅"`]; break;
        }
    } else {
        switch (selectedIndex) {
            case 1: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
            case 2: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld -e main "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
            case 3: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld -m elf_i386 "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
            case 4: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld -m elf_i386 -e main "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
            case 5: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 6: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 7: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 8: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 9: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            case 10: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-emain`, `WINEDEBUG=-all wine "${baseName}.exe"${wineSuffix}`]; break;
            
            case 11: commands = [`nasm -f macho64 "${fileName}" -o "${baseName}.o"`, `x86_64-apple-darwin20.4-ld "${baseName}.o" -o "${baseName}" -macosx_version_min 10.11 -lSystem -syslibroot /usr/local/SDK/MacOSX11.3.sdk`, `darling shell ./"${baseName}"`]; break;
            case 12: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld.lld -m elf_x86_64_fbsd "${baseName}.o" -o "${baseName}"`, `qemu-x86_64-static ./"${baseName}"`]; break;
            case 13: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld.lld -m elf_x86_64_fbsd -e main "${baseName}.o" -o "${baseName}"`, `qemu-x86_64-static ./"${baseName}"`]; break;
            
            case 14: commands = [`aarch64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, `aarch64-linux-gnu-ld "${baseName}.o" -o "${baseName}"`, `qemu-aarch64-static ./"${baseName}"`]; break;
            case 15: commands = [`arm-none-eabi-as "${fileName}" -o "${baseName}.o"`, `arm-none-eabi-ld "${baseName}.o" -o "${baseName}"`, `qemu-arm-static ./"${baseName}"`]; break;
            case 16: commands = [`aarch64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, `aarch64-linux-gnu-ld "${baseName}.o" -o "${baseName}" -e main`, `qemu-aarch64-static ./"${baseName}"`]; break;
            case 17: commands = [`arm-none-eabi-as "${fileName}" -o "${baseName}.o"`, `arm-none-eabi-ld "${baseName}.o" -o "${baseName}" -e main`, `qemu-arm-static ./"${baseName}"`]; break;
            
            case 18: commands = [`/opt/llvm-mingw/llvm-mingw-ucrt/bin/aarch64-w64-mingw32-clang "${fileName}" -o "${baseName}.exe" -nostartfiles -lkernel32 -Wl,-e_start`, `echo "\\nPhysically impossible for the code to run, try it on a Windows ARM64 device 😅"`]; break;
            case 19: commands = [`/opt/llvm-mingw/llvm-mingw-ucrt/bin/aarch64-w64-mingw32-clang "${fileName}" -o "${baseName}.exe" -lkernel32`, `echo "\\nPhysically impossible for the code to run, try it on a Windows ARM64 device 😅"`]; break;
            case 20: commands = [`/opt/llvm-mingw/llvm-mingw-ucrt/bin/armv7-w64-mingw32-clang "${fileName}" -o "${baseName}.exe" -nostartfiles -lkernel32 -Wl,-e_start`, `echo "\\nNote: We have breached the realms of architectures.. The code is sound 32-bit, but the atoms of your x86_64 processor still refuse to dance to the rhythms of ARM32 Windows."`]; break;
            case 21: commands = [`/opt/llvm-mingw/llvm-mingw-ucrt/bin/armv7-w64-mingw32-clang "${fileName}" -o "${baseName}.exe" -lkernel32`, `echo "\\nPhysically impossible for the code to run, try it on a Windows ARM32 device 😅"`]; break;
            
            case 22: commands = [`aarch64-apple-darwin20.4-clang "${fileName}" -o "${baseName}"`, `echo "\\nIt is physically impossible to execute this binary. Your x86_64 processor is looking for an Apple Silicon heart to beat with this code. Try it on an M1/M2/M3 device!"`]; break;
            
            case 23: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld.lld -m elf_i386_fbsd "${baseName}.o" -o "${baseName}"`, `echo "\\nNote: Compilation successful. Running on Linux via QEMU user-mode will fail silently due to Syscall calling convention mismatch 😅"`]; break;
            case 24: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld.lld -m elf_i386_fbsd -e main "${baseName}.o" -o "${baseName}"`, `echo "\\nNote: Compilation successful. Running on Linux via QEMU user-mode will fail silently due to Syscall calling convention mismatch 😅"`]; break;
            
            case 25: commands = [`riscv64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld "${baseName}.o" -o "${baseName}"`, `qemu-riscv64-static ./"${baseName}"`]; break;
            case 26: commands = [`riscv64-linux-gnu-as "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-gcc -static "${baseName}.o" -o "${baseName}"`, `qemu-riscv64-static ./"${baseName}"`]; break;
            case 27: commands = [`riscv64-linux-gnu-as -march=rv32i -mabi=ilp32 "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld -m elf32lriscv "${baseName}.o" -o "${baseName}"`, `qemu-riscv32-static ./"${baseName}"`]; break; 
            case 28: commands = [`riscv64-linux-gnu-as -march=rv32i -mabi=ilp32 "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld -m elf32lriscv -e main "${baseName}.o" -o "${baseName}"`, `qemu-riscv32-static ./"${baseName}"`]; break; 
            case 29: commands = [`riscv64-linux-gnu-as -march=rv32e -mabi=ilp32e "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld -m elf32lriscv "${baseName}.o" -o "${baseName}"`, `qemu-riscv32-static ./"${baseName}"`]; break;
            case 30: commands = [`riscv64-linux-gnu-as -march=rv32e -mabi=ilp32e "${fileName}" -o "${baseName}.o"`, `riscv64-linux-gnu-ld -m elf32lriscv -e main "${baseName}.o" -o "${baseName}"`, `qemu-riscv32-static ./"${baseName}"`]; break;
            
            // التعديل: استبدال الأوامر غير المنطقية برسالة توضيحية لـ RV128
            case 31: commands = [`echo "Compilation skipped."`, `echo "\\nNote: RISC-V 128-bit (RV128) is highly experimental and not fully supported by standard GCC/QEMU toolchains yet! 😅"`]; break;
            case 32: commands = [`echo "Compilation skipped."`, `echo "\\nNote: RISC-V 128-bit (RV128) is highly experimental and not fully supported by standard GCC/QEMU toolchains yet! 😅"`]; break;
        }
    }

    if (commands.length > 0) {
        const assembleCmd = commands[0];
        const linkCmd = commands.length > 1 ? commands[1] : null;
        const runCommands = commands.length > 2 ? commands.slice(2) : [];

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Building Assembly (Linux)...",
        }, async () => {
            
            let terminal = vscode.window.activeTerminal;
            if (!terminal || terminal.name !== "ahmed_x86_asm") {
                terminal = vscode.window.createTerminal("ahmed_x86_asm");
            }
            terminal.show(true);
            terminal.sendText(`cd "${fileDir}"`);
            terminal.sendText('clear'); // لينكس دائماً clear

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
