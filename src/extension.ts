import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs'; // <--- إضافة جديدة لكتابة ملف الاختبار الوهمي

// --- الإضافة الجديدة: أداة الاحتفاظ بالأخطاء وعرضها في المحرر ---
let diagnosticCollection: vscode.DiagnosticCollection;

// --- الإضافة الجديدة: تصميم الدائرة الحمراء بجانب رقم السطر ---
const errorGutterDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.parse(`data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Ccircle%20cx%3D%228%22%20cy%3D%228%22%20r%3D%224%22%20fill%3D%22%23e51400%22%2F%3E%3C%2Fsvg%3E`),
    gutterIconSize: '60%' // حجم الدائرة ليكون صغيراً ومناسباً
});

// دالة لتنفيذ أوامر الطرفية وجلب السطر الأول
async function runCmd(cmd: string): Promise<{ success: boolean, output: string }> {
    return new Promise((resolve) => {
        cp.exec(cmd, (error, stdout, stderr) => {
            const output = (stdout || stderr || '').trim();
            if (error && !stdout) {
                resolve({ success: false, output: '' });
            } else {
                // تنظيف المخرجات من أي أحرف غريبة قد تسبب مشاكل في العرض
                const firstLine = output.split('\n')[0].trim().replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                resolve({ success: true, output: firstLine });
            }
        });
    });
}

// --- الإضافة الجديدة: دالة مساعدة لاستخراج الكلمة الخاطئة من الرسالة وتحديد مكانها ---
function getAccurateErrorRange(lineText: string, message: string, lineIndex: number): vscode.Range {
    let targetWord = "";
    
    // محاولة استخراج الكلمة بين علامات التنصيص (غالبًا مع NASM)
    const quoteMatch = message.match(/['`"]([^'`"]+)['`"]/);
    if (quoteMatch) {
        targetWord = quoteMatch[1];
    } 
    // محاولة استخراج الكلمة بعد النقطتين (غالبًا مع UASM مثل Error A2102: Symbol not defined : msg)
    else if (message.includes(':')) {
        const parts = message.split(':');
        targetWord = parts[parts.length - 1].trim();
    } 
    
    // تنظيف الكلمة المستخرجة
    targetWord = targetWord.replace(/[\[\]]/g, '');

    // إذا وجدنا الكلمة وكانت موجودة فعلاً في السطر، نضع الخط تحتها فقط
    if (targetWord && lineText.includes(targetWord)) {
        const startChar = lineText.indexOf(targetWord);
        return new vscode.Range(lineIndex, startChar, lineIndex, startChar + targetWord.length);
    }

    // كخيار بديل إذا فشل الاستخراج، نضع الخط تحت أول كلمة في السطر بدلاً من السطر كاملاً
    const trimmed = lineText.trimStart();
    const startChar = lineText.length - trimmed.length;
    const firstWordMatch = trimmed.match(/^\S+/);
    const endChar = firstWordMatch ? startChar + firstWordMatch[0].length : lineText.length;
    
    return new vscode.Range(lineIndex, startChar, lineIndex, endChar);
}

// --- الإضافة الجديدة: دالة لتشغيل أمر التجميع في الخلفية وتحليل الأخطاء (Diagnostics) ---
async function assembleAndDiagnose(assembleCmd: string, fileDir: string, document: vscode.TextDocument): Promise<boolean> {
    return new Promise((resolve) => {
        cp.exec(assembleCmd, { cwd: fileDir }, (error, stdout, stderr) => {
            const output = (stdout || '') + '\n' + (stderr || '');
            const diagnostics: vscode.Diagnostic[] = [];
            const errorRanges: vscode.Range[] = []; // مصفوفة لحفظ أماكن الدوائر الحمراء

            // Regex لاصطياد أخطاء NASM
            const nasmRegex = /^(?:[^:]+):(\d+):\s+(error|warning|fatal):\s+(.*)$/gm;
            
            // Regex لاصطياد أخطاء UASM
            const uasmRegex = /^(?:[^(]+)\((\d+)\)\s+:\s+(Error|Fatal|Warning)\s+(.*)$/gm;

            let match;

            // فحص أخطاء NASM
            while ((match = nasmRegex.exec(output)) !== null) {
                const line = parseInt(match[1], 10) - 1; 
                const severityStr = match[2].toLowerCase();
                const message = match[3];

                const severity = severityStr.includes('warning') 
                    ? vscode.DiagnosticSeverity.Warning 
                    : vscode.DiagnosticSeverity.Error;

                const safeLine = Math.max(0, Math.min(line, document.lineCount - 1));
                const lineText = document.lineAt(safeLine).text;
                const range = getAccurateErrorRange(lineText, message, safeLine);
                
                diagnostics.push(new vscode.Diagnostic(range, `NASM: ${message}`, severity));
                errorRanges.push(range);
            }

            // فحص أخطاء UASM
            while ((match = uasmRegex.exec(output)) !== null) {
                const line = parseInt(match[1], 10) - 1;
                const severityStr = match[2].toLowerCase();
                const message = match[3];

                const severity = severityStr.includes('warning') 
                    ? vscode.DiagnosticSeverity.Warning 
                    : vscode.DiagnosticSeverity.Error;

                const safeLine = Math.max(0, Math.min(line, document.lineCount - 1));
                const lineText = document.lineAt(safeLine).text;
                const range = getAccurateErrorRange(lineText, message, safeLine);
                
                diagnostics.push(new vscode.Diagnostic(range, `UASM: ${message}`, severity));
                errorRanges.push(range);
            }

            const editor = vscode.window.activeTextEditor;

            if (diagnostics.length > 0) {
                // عرض الأخطاء في المحرر (الخطوط الحمراء تحت الكلمة فقط)
                diagnosticCollection.set(document.uri, diagnostics);
                
                // رسم الدوائر الحمراء في الهامش
                if (editor && editor.document.uri.toString() === document.uri.toString()) {
                    editor.setDecorations(errorGutterDecoration, errorRanges);
                }

                vscode.window.showErrorMessage(`ahmed-x86 ASM: Found ${diagnostics.length} issue(s). Check the red squiggles in your code! ❌`);
                resolve(false); // توقف هنا، هناك خطأ في الكود
            } else {
                // مسح الأخطاء والدوائر القديمة إذا نجح التجميع
                diagnosticCollection.clear();
                if (editor) {
                    editor.setDecorations(errorGutterDecoration, []);
                }
                resolve(true); // الكود سليم، أكمل العملية
            }
        });
    });
}
// -----------------------------------------------------------------------------------

// دالة فحص الحزم باستخدام واجهة الإشعارات التقدمية (Progress Notification)
async function checkDependencies(platform: string) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ahmed-x86 ASM:",
        cancellable: false
    }, async (progress) => {
        
        let messageItems: string[] = [];
        let hasMissing = false; // لمعرفة إذا كان هناك أي حزمة ناقصة
        progress.report({ message: "Checking dependencies..." });

        if (platform === 'linux') {
            const deps = [
                { name: 'nasm', cmd: 'nasm -v' },
                { name: 'binutils', cmd: 'ld -v' },
                { name: 'wine', cmd: 'wine --version' },
                { name: 'uasm', cmd: 'uasm -h' }
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
        } else if (platform === 'win32') {
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
        }

        // --- إضافة رسالة التثبيت إلى المصفوفة لتظهر بنفس النمط ---
        if (hasMissing) {
            messageItems.push("for install package");
        }

        // خدعة التأخير الزمني لكي تظهر جميع الإشعارات متراصة دون أن يخفيها VS Code
        if (messageItems.length > 0) {
            vscode.window.showInformationMessage("🔍 ahmed-x86 Dependencies:");
            for (const msg of messageItems) {
                // تأخير 300 ملي ثانية بين كل إشعار والثاني
                await new Promise(resolve => setTimeout(resolve, 300));
                vscode.window.showInformationMessage(msg);
                
                // فتح الموقع تلقائياً إذا كانت الرسالة المعروضة هي رابط التثبيت
                if (msg === "for install package") {
                    vscode.env.openExternal(vscode.Uri.parse('https://ahmed-x86.github.io/ahmed_x86_asm.html'));
                }
            }
        }
    });
}

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

// --- الإضافة الجديدة: دالة الاختبار الصامت لاختيار أفضل طريقة ربط (Linker) في الويندوز ---
async function detectBestWin32Linker(context: vscode.ExtensionContext): Promise<string> {
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
// --------------------------------------------------------------------------

// دالة ذكية لتحليل الكود وتوقع خيار التشغيل المناسب
function detectBestOption(fileText: string, platform: string): { index: number, name: string } {
    const textLower = fileText.toLowerCase();
    
    // البحث عن الكلمات المفتاحية
    const hasIrvine = textLower.includes('irvine32.inc');
    const hasMain = textLower.includes('main proc') || textLower.includes('main:');
    const is64Bit = textLower.includes('bits 64') || textLower.includes('elf64') || textLower.includes('win64') || textLower.includes('rax');

    if (platform === 'linux') {
        if (hasIrvine) return hasMain ? { index: 8, name: "Win32 Irvine (main)" } : { index: 5, name: "Win32 Irvine" };
        if (is64Bit) return hasMain ? { index: 2, name: "Linux64 Native (main)" } : { index: 1, name: "Linux64 Native (_start)" };
        return hasMain ? { index: 4, name: "Linux32 Native (main)" } : { index: 3, name: "Linux32 Native (_start)" };
    } else {
        // Windows (win32)
        if (hasIrvine) return hasMain ? { index: 4, name: "Win32 Irvine (Custom main)" } : { index: 1, name: "Win32 Irvine (Standard)" };
        if (is64Bit) return hasMain ? { index: 6, name: "Win64 Standalone (Custom main)" } : { index: 3, name: "Win64 Standalone (Standard)" };
        return hasMain ? { index: 5, name: "Win32 Standalone (Custom main)" } : { index: 2, name: "Win32 Standalone (Standard)" };
    }
}

export function activate(context: vscode.ExtensionContext) {
    const currentPlatform = os.platform();

    // --- الإضافة الجديدة: تهيئة مجموعة تشخيص الأخطاء ---
    diagnosticCollection = vscode.languages.createDiagnosticCollection('ahmed_x86_asm');
    context.subscriptions.push(diagnosticCollection);

    // فحص الحزم عند أول تشغيل للإضافة فقط
    const hasCheckedDeps = context.globalState.get<boolean>('hasCheckedDeps_v108');
    if (!hasCheckedDeps) {
        if (currentPlatform === 'linux' || currentPlatform === 'win32') {
            // تشغيل الفحص في الخلفية دون تعطيل عمل المستخدم
            checkDependencies(currentPlatform);
            context.globalState.update('hasCheckedDeps_v108', true); // حفظ الحالة
        }
    }

    // أمر فحص الحزم اليدوي
    let checkDepsDisposable = vscode.commands.registerCommand('ahmed-x86-asm.checkDeps', () => {
        checkDependencies(currentPlatform);
    });

    // أمر إعادة تعيين المسار
    let resetPathDisposable = vscode.commands.registerCommand('ahmed-x86-asm.resetIrvinePath', async () => {
        await context.globalState.update('irvineLibPath', undefined);
        vscode.window.showInformationMessage('Irvine library path has been reset. You will be prompted to select it again next time.');
    });

    // --- الإضافة الجديدة: أمر إعادة تعيين الـ Linker ---
    let resetLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.resetLinkerMethod', async () => {
        await context.globalState.update('win32LinkerMethod', undefined);
        vscode.window.showInformationMessage('Win32 Linker method has been reset. The extension will test again next run.');
    });
    // ----------------------------------------------------

    // --- ميزة v1.1.4 الجديدة: تغيير الـ Linker يدوياً ---
    let setLinkerDisposable = vscode.commands.registerCommand('ahmed-x86-asm.setLinkerMethod', async () => {
        const currentMethod = context.globalState.get<string>('win32LinkerMethod') || 'Auto (Not set)';
        
        const options = [
            { label: 'ld', description: 'Use GNU Linker (ld.exe)' },
            { label: 'gcc', description: 'Use GCC as Linker (gcc.exe)' }
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: `Select Win32 Linker Method | Current: ${currentMethod}`
        });

        if (selection) {
            await context.globalState.update('win32LinkerMethod', selection.label);
            vscode.window.showInformationMessage(`Win32 Linker method successfully set to: ${selection.label.toUpperCase()} ✅`);
        }
    });
    // ----------------------------------------------------

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

        // قراءة محتوى الملف لتحليله
        const fileText = editor.document.getText();
        const autoDetected = detectBestOption(fileText, platform);

        let options: string[] = [];
        let commands: string[] = []; // تم التعديل لتكون مصفوفة
        let selectedIndex = 0;

        // استدعاء المسار لعرضه
        const currentIrvinePath = context.globalState.get<string>('irvineLibPath') || "Not Set";

        if (platform === 'linux') {
            options = [
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
                "10) Win64 Standalone (main)"
            ];

            const selection = await vscode.window.showQuickPick(options, {
                placeHolder: `Choose build mode (Linux) | Irvine Path: ${currentIrvinePath}`
            });

            if (!selection) return;

            // تحديد الـ Index بناءً على اختيار المستخدم
            if (selection.startsWith('✨ Auto Detect')) {
                selectedIndex = autoDetected.index;
            } else {
                selectedIndex = parseInt(selection.split(')')[0]);
            }

            let irvinePath = "";

            if (selectedIndex === 5 || selectedIndex === 8) {
                const pathResult = await getIrvinePath(context);
                if (!pathResult) return; 
                irvinePath = pathResult;
            }

            // أوامر لينكس المقسمة
            switch (selectedIndex) {
                case 1: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
                case 2: commands = [`nasm -f elf64 "${fileName}" -o "${baseName}.o"`, `ld -e main "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
                case 3: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld -m elf_i386 "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
                case 4: commands = [`nasm -f elf32 "${fileName}" -o "${baseName}.o"`, `ld -m elf_i386 -e main "${baseName}.o" -o "${baseName}"`, `./"${baseName}"`]; break;
                case 5: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                case 6: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                case 7: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                case 8: commands = [`uasm -q -coff -I"${irvinePath}" "${fileName}" -Fo"${baseName}.o"`, `i686-w64-mingw32-gcc "${baseName}.o" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                case 9: commands = [`nasm -f win32 "${fileName}" -o "${baseName}.obj"`, `i686-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-e_main`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
                case 10: commands = [`nasm -f win64 "${fileName}" -o "${baseName}.obj"`, `x86_64-w64-mingw32-gcc "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 -Wl,-emain`, `WINEDEBUG=-all wine "${baseName}.exe"`]; break;
            }
        } else if (platform === 'win32') {
            options = [
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

            // تحديد الـ Index بناءً على اختيار المستخدم
            if (selection.startsWith('✨ Auto Detect')) {
                selectedIndex = autoDetected.index;
            } else {
                selectedIndex = parseInt(selection.split(')')[0]);
            }

            let irvinePath = "";

            if (selectedIndex === 1 || selectedIndex === 4) {
                const pathResult = await getIrvinePath(context);
                if (!pathResult) return;
                irvinePath = pathResult;
            }

            // --- الإضافة الجديدة: فحص واعتماد الطريقة الأنسب ---
            const linkerMethod = await detectBestWin32Linker(context);

            if (linkerMethod === 'ld') {
                // أوامر الويندوز المقسمة (ld) مباشر بدون cmd /c مع إضافة --enable-stdcall-fixup
                switch (selectedIndex) {
                    case 1: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -lkernel32 -luser32 --subsystem console --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
                    case 2: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
                    case 3: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw64\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 -L C:\\msys64\\mingw64\\lib`, `.\\${baseName}.exe`]; break;
                    case 4: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -lkernel32 -luser32 -e _main --subsystem console --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
                    case 5: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 -e _main --enable-stdcall-fixup -L C:\\msys64\\mingw32\\lib`, `.\\${baseName}.exe`]; break;
                    case 6: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw64\\bin\\ld.exe "${baseName}.obj" -o "${baseName}.exe" -lkernel32 -luser32 -e main -L C:\\msys64\\mingw64\\lib`, `.\\${baseName}.exe`]; break;
                }
            } else {
                // أوامر الويندوز المقسمة (gcc)
                switch (selectedIndex) {
                    case 1: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,--subsystem,console'`, `.\\${baseName}.exe`]; break;
                    case 2: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `.\\${baseName}.exe`]; break;
                    case 3: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32`, `.\\${baseName}.exe`]; break;
                    case 4: commands = [`C:\\msys64\\mingw64\\bin\\uasm.exe -q -coff -I"${irvinePath}" -Fo"${baseName}.obj" "${fileName}"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" "${path.join(irvinePath, 'Irvine32.lib')}" -o "${baseName}.exe" -nostdlib -lkernel32 -luser32 -w '-Wl,-e_main' '-Wl,--subsystem,console' '-Wl,--enable-stdcall-fixup' 2>$null`, `.\\${baseName}.exe`]; break;
                    case 5: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win32 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw32\\bin\\i686-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-e_main'`, `.\\${baseName}.exe`]; break;
                    case 6: commands = [`C:\\msys64\\mingw64\\bin\\nasm.exe -f win64 "${fileName}" -o "${baseName}.obj"`, `C:\\msys64\\mingw64\\bin\\x86_64-w64-mingw32-gcc.exe "${baseName}.obj" -o "${baseName}.exe" -nostartfiles -lkernel32 -luser32 '-Wl,-emain'`, `.\\${baseName}.exe`]; break;
                }
            }
            // ----------------------------------------------------
        }

        // --- الإضافة الجديدة: نظام بناء ذكي مع عرض كافة السجلات في الطرفية ---
        if (commands.length > 0) {
            const assembleCmd = commands[0];                          // الأمر الأول: المجمع (nasm/uasm)
            const linkCmd = commands.length > 1 ? commands[1] : null; // الأمر الثاني: الرابط (ld/gcc)
            const runCommands = commands.length > 2 ? commands.slice(2) : []; // الأوامر المتبقية: التشغيل

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                title: "Building Assembly...",
            }, async () => {
                
                // تجهيز الطرفية أولاً لكي تظهر فيها الأوامر
                let terminal = vscode.window.activeTerminal;
                if (!terminal || terminal.name !== "ahmed_x86_asm") {
                    terminal = vscode.window.createTerminal("ahmed_x86_asm");
                }
                terminal.show(true); // true لعدم سحب التركيز من الكود
                terminal.sendText(`cd "${fileDir}"`);
                
                // تنظيف الطرفية
                terminal.sendText(platform === 'win32' ? 'cls' : 'clear');

                // 1. فحص الكود والتجميع في الخلفية (Linter)
                const isAssembleSuccess = await assembleAndDiagnose(assembleCmd, fileDir, editor.document);
                
                // إرسال أمر التجميع للطرفية ليراه المستخدم (Log)
                terminal.sendText(assembleCmd);

                if (!isAssembleSuccess) {
                    return; // توقف التنفيذ لوجود خطأ، والمستخدم سيرى اللوج في الطرفية
                }

                // 2. الربط (Linking) في الخلفية لاختبار نجاحه
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

                    // إرسال أمر الربط للطرفية ليراه المستخدم
                    terminal.sendText(linkCmd);

                    if (!isLinkSuccess) {
                        return; // توقف التنفيذ لمنع الأخطاء المتسلسلة
                    }
                }

                // 3. كل شيء سليم، تنفيذ أوامر التشغيل
                for (const cmd of runCommands) {
                    terminal.sendText(cmd);
                }
            });
        }
    });

    // تسجيل الأوامر معاً
    context.subscriptions.push(checkDepsDisposable);
    context.subscriptions.push(resetPathDisposable);
    context.subscriptions.push(resetLinkerDisposable); 
    context.subscriptions.push(setLinkerDisposable);   
    context.subscriptions.push(runDisposable);
}

export function deactivate() {}
